# Ví dụ flow — Stage 4: Wrap-Up / Curveball

**Bài toán:** URL Shortener | tiếp theo Stage 3 Deep Dive  
**`curveballs`:** `[curve_db_failure, curve_scale_spike]` | `baseGraphSnapshotId: 'snap_wrapup_start'`

---

## Scenario close condition

Scenario close khi tất cả điều kiện sau đúng:
- `mitigationProposed=true`
- `blastRadiusRecognized=true`
- `consistencyWithOriginalDesign=true`
- `graphAdaptationMade=true` — hoặc follow-up budget exhausted (max 2 follow-ups per scenario)

`scenarioBudgetRemaining` giảm khi scenario **close**, không phải khi start.

---

## Curveball 1 — `curve_db_failure`

```ts
SDCurveball = {
  id: 'curve_db_failure',
  type: 'failure',
  targetNodeType: 'database',
  scenarioTemplate: 'PostgreSQL becomes unavailable during peak traffic — 100K redirects/sec hitting your system. How does your design handle this?',
  expectedMitigations: ['replica', 'failover', 'standby'],
  redFlags: ['no_fallback', 'complete_outage_accepted']
}
```

---

## Turn 1 — `SCENARIO_PRESENT` (curveball 1: DB failure)

**Intent:**
```ts
{
  type: 'SCENARIO_PRESENT',
  source: 'curveball',
  scenarioId: 'curve_db_failure',
  // promptTemplate là rendered wrapper từ curveball.scenarioTemplate
  promptTemplate: 'PostgreSQL becomes unavailable during peak traffic — 100K redirects/sec hitting your system. How does your design handle this?',
  // forbiddenHints derive từ expectedMitigations[] — không pre-reveal mitigation
  forbiddenHints: ['replica', 'failover', 'standby'],
  maxSentences: 3
}
```

**Candidate nhận:** *"Scenario: your PostgreSQL instance becomes unavailable during peak traffic — 100K redirects per second hitting your system. How does your design handle this?"*

**Candidate:** *"We'd have a read replica with automatic failover — primary goes down, replica promotes in 30–60 seconds. During that window, requests to uncached URLs return 503. Cached URLs still redirect normally via Redis."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    blastRadiusRecognized: true,          // biết 30–60s outage window + 503 impact
    mitigationProposed: true,             // replica + failover
    tradeoffMentioned: true,              // 503 trong failover window
    costOrLatencyImpactMentioned: false,
    consistencyWithOriginalDesign: true,  // tận dụng Redis đã có trong design
    graphAdaptationMade: false            // chưa update canvas
  },
  // illustrative
  scoreDelta: {
    failureReasoning: 0.8,
    adaptationQuality: 0.6,
    curveballHandling: 0.75,
    riskPrioritization: 0.7,
    consistencyWithOriginalDesign: 1.0
  },
  redFlags: []
}
```

**Active scenario state sau turn 1:**
```ts
activeScenario = { source: 'curveball', scenarioId: 'curve_db_failure', turnCount: 1, followUpCount: 0 }
```

**Policy:** close condition chưa đủ (`graphAdaptationMade=false`) → `SCENARIO_FOLLOW_UP`

---

## Turn 2 — `SCENARIO_FOLLOW_UP` (graph adaptation)

**Intent:**
```ts
{
  type: 'SCENARIO_FOLLOW_UP',
  source: 'curveball',
  scenarioId: 'curve_db_failure',
  // dùng "recovery path" thay vì "replica" để tránh fail forbiddenHints validator
  promptTemplate: 'Ask candidate to update the diagram to reflect this database recovery path.',
  forbiddenHints: ['replica', 'failover', 'standby'],
  maxSentences: 2
}
```

**Candidate nhận:** *"Good thinking. Would you update your diagram to show how your system recovers from the database failure?"*

**Candidate** cập nhật canvas: thêm node `PostgreSQL Replica` + edge `App Server → PostgreSQL Replica`.
> Canvas update được FE gửi lên BE như một event riêng. Assessor nhận updated graph state + `graphAdaptationMade=true` từ diff graph.

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    blastRadiusRecognized: true,
    mitigationProposed: true,
    tradeoffMentioned: true,
    costOrLatencyImpactMentioned: false,
    consistencyWithOriginalDesign: true,
    graphAdaptationMade: true             // graph updated ✓
  },
  scoreDelta: {
    failureReasoning: 0.8,
    adaptationQuality: 1.0,
    curveballHandling: 0.8,
    riskPrioritization: 0.7,
    consistencyWithOriginalDesign: 1.0
  },
  redFlags: []
}
```

**Close condition đạt:** `mitigationProposed=true`, `blastRadiusRecognized=true`, `consistencyWithOriginalDesign=true`, `graphAdaptationMade=true`

```ts
activeScenario = { ..., turnCount: 2, followUpCount: 1, closeReason: 'signals_covered' }
// → close scenario
progress = {
  completedItemIds: ['curve_db_failure'],
  activeScenario: null,
  scenarioBudgetRemaining: 1   // 2 - 1 = 1, giảm khi close
}
```

---

## Curveball 2 — `curve_scale_spike`

```ts
SDCurveball = {
  id: 'curve_scale_spike',
  type: 'scale_spike',
  // targetNodeType omitted — system-wide scenario
  scenarioTemplate: 'Traffic suddenly spikes 10x — from 100K to 1M redirects/sec. How does your design handle this?',
  // chuẩn hóa thành natural phrase để substring validator hoạt động đúng
  expectedMitigations: ['horizontal scaling', 'cache layer', 'rate limiting', 'queue buffering'],
  redFlags: ['manual scaling only', 'no mention of cold start']
}
```

---

## Turn 3 — `SCENARIO_PRESENT` (curveball 2: scale spike)

**Intent:**
```ts
{
  type: 'SCENARIO_PRESENT',
  source: 'curveball',
  scenarioId: 'curve_scale_spike',
  promptTemplate: 'Traffic suddenly spikes 10x — from 100K to 1M redirects/sec. How does your design handle this?',
  // forbiddenHints = toàn bộ expectedMitigations (chưa có gì được mention)
  forbiddenHints: ['horizontal scaling', 'cache layer', 'rate limiting', 'queue buffering'],
  maxSentences: 3
}
```

**Candidate nhận:** *"New scenario: traffic suddenly spikes 10x — your system needs to handle 1 million redirects per second instead of 100K. What happens?"*

**Candidate:** *"We'd auto-scale the App Server horizontally — add more instances behind the load balancer."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    blastRadiusRecognized: false,         // không đề cập cache layer, DB layer, cold start
    mitigationProposed: true,             // horizontal scaling mentioned
    tradeoffMentioned: false,
    costOrLatencyImpactMentioned: false,
    consistencyWithOriginalDesign: true,
    graphAdaptationMade: false
  },
  scoreDelta: {
    failureReasoning: 0.4,
    adaptationQuality: 0.3,
    curveballHandling: 0.4,
    riskPrioritization: 0.3,
    consistencyWithOriginalDesign: 1.0
  },
  redFlags: ['no mention of cold start']
}
```

**Active scenario state sau turn 3:**
```ts
activeScenario = { source: 'curveball', scenarioId: 'curve_scale_spike', turnCount: 1, followUpCount: 0 }
```

**Policy:** `blastRadiusRecognized=false` → `SCENARIO_FOLLOW_UP` (hỏi về cold-start window)

---

## Turn 4 — `SCENARIO_FOLLOW_UP` (blast radius: cold-start window)

**Intent:**
```ts
{
  type: 'SCENARIO_FOLLOW_UP',
  source: 'curveball',
  scenarioId: 'curve_scale_spike',
  promptTemplate: 'Ask how long it takes to spin up new instances and what happens to traffic during that scale-up window.',
  // horizontal scaling đã mention → loại khỏi forbiddenHints; còn lại 3 mitigations
  forbiddenHints: ['cache layer', 'rate limiting', 'queue buffering'],
  maxSentences: 2
}
```

**Candidate nhận:** *"Auto-scaling sounds reasonable — but how long does it take to spin up new instances? What happens to traffic during that scale-up window?"*

**Candidate:** *"During scale-up, maybe 30–60 seconds, we'd rely entirely on the Redis cache. Since we have 95% hit rate, most requests are fine. For the 5% cache misses, they'd hit the existing App Server instances which might be slow."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    blastRadiusRecognized: true,           // biết 30–60s window + cache dependency
    mitigationProposed: true,
    tradeoffMentioned: true,               // cache miss → slow under spike
    costOrLatencyImpactMentioned: true,    // "might be slow"
    // candidate nói "rely entirely on Redis cache" nhưng Stage 3 đã xác lập cache chỉ cho read path
    // URL creation (write path) vẫn đi thẳng App Server → PostgreSQL — cache không bảo vệ được
    consistencyWithOriginalDesign: false,
    graphAdaptationMade: false
  },
  scoreDelta: {
    failureReasoning: 0.6,
    adaptationQuality: 0.5,
    curveballHandling: 0.5,
    riskPrioritization: 0.5,
    consistencyWithOriginalDesign: 0
  },
  redFlags: []
}
```

**Active scenario state sau turn 4:**
```ts
activeScenario = { source: 'curveball', scenarioId: 'curve_scale_spike', turnCount: 2, followUpCount: 1 }
```

**Policy:** `consistencyWithOriginalDesign=false` → `SCENARIO_CHALLENGE`

---

## Turn 5 — `SCENARIO_CHALLENGE` (write path inconsistency)

> **Giả định thêm cho challenge:** assume URL creation traffic cũng spike trong cùng event — nếu không có giả định này thì challenge về write path không liên quan đến scenario "1M redirects/sec".

**Intent:**
```ts
{
  type: 'SCENARIO_CHALLENGE',
  source: 'curveball',
  scenarioId: 'curve_scale_spike',
  promptTemplate: 'Challenge: candidate assumed cache covers all traffic during spike, but original design only uses cache for read/redirect path. Assume URL creation also spikes. Ask candidate to reconcile what happens to the write path.',
  // derive từ expectedMitigations còn lại chưa covered
  forbiddenHints: ['cache layer', 'rate limiting', 'queue buffering'],
  maxSentences: 2
}
```

**Candidate nhận:** *"You mentioned relying on the Redis cache during the scale-up window — but your cache is in the read path. Assuming URL creation requests also spike, what happens to that write traffic during the same window?"*

**Candidate:** *"You're right. URL creation would still hit the App Server and PostgreSQL directly. During the scale-up window, writes might back up. We might need a queue in front of PostgreSQL to buffer writes — but that's an additional design change to the original architecture."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    blastRadiusRecognized: true,
    mitigationProposed: true,             // queue buffering for write path
    tradeoffMentioned: true,
    costOrLatencyImpactMentioned: true,
    consistencyWithOriginalDesign: true,  // candidate acknowledged scope correctly
    graphAdaptationMade: false            // candidate nói "additional design change" nhưng chưa update canvas
  },
  scoreDelta: {
    failureReasoning: 0.7,
    adaptationQuality: 0.7,
    curveballHandling: 0.7,
    riskPrioritization: 0.7,
    consistencyWithOriginalDesign: 1.0
  },
  redFlags: []
}
```

**Close condition đạt:** `mitigationProposed=true`, `blastRadiusRecognized=true`, `consistencyWithOriginalDesign=true`
> `graphAdaptationMade=false` — candidate acknowledged nhưng không update canvas; follow-up budget còn nhưng signals đủ → close.

```ts
activeScenario = { ..., turnCount: 3, followUpCount: 1, challengeCount: 1, closeReason: 'signals_covered' }
progress = {
  completedItemIds: ['curve_db_failure', 'curve_scale_spike'],
  activeScenario: null,
  scenarioBudgetRemaining: 0   // 1 - 1 = 0
}
→ COMPLETE_SESSION
```

---

## `SDWrapUpLeftoverJson`

```ts
{
  completedItemIds: ['curve_db_failure', 'curve_scale_spike'],
  graphDeltaAfterCurveball: { nodesAdded: 1, edgesAdded: 1, changedLabels: 0 }
  // delta tính từ baseGraphSnapshotId ('snap_wrapup_start') → snapshot hiện tại
  // nodesAdded=1: PostgreSQL Replica (turn 2); edgesAdded=1: App Server → PostgreSQL Replica
  // candidate đề xuất queue buffering (turn 5) nhưng không update canvas → không tính vào delta
}
```
