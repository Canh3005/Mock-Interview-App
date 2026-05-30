# Ví dụ flow — Stage 3: Deep Dive

**Bài toán:** URL Shortener | tiếp theo Stage 2 Walkthrough

---

## Probe Selection

```ts
// Input từ Walkthrough leftover + graphMetrics + level:
walkthroughLeftover.unexplainedAtEnd = { nodeIds: [], edgeIds: [] }  // rule 1 không áp dụng
graphMetrics = { componentCoverage: 0.6, topologyCoverage: 0.75, dataFlowCompleteness: 0.8 }
// componentCoverage thấp nhất → rule 2 gợi probe dimension liên quan đến component usage
level = 'senior'  // rule 3: requiredDimensions = ['scalability', 'consistency']

// Rule 2 + Rule 3 cùng trỏ về 2 required dimensions → bắt đầu với 'scalability' (index 0)
// Probe selected: probe_url_scalability
```

---

## Turn 1 — `PROBE_PRIMARY` (scalability)

**Probe:**
```ts
SDProbe = {
  id: 'probe_url_scalability',
  dimension: 'scalability',
  appliesToNodeTypes: ['database', 'service'],
  primaryQuestionTemplate: 'Ask about read throughput: App Server queries PostgreSQL on every redirect at 100K reads/sec — how does this hold up?',
  expectedSignals: ['cache_strategy', 'cache_hit_rate', 'db_load_reasoning'],
  redFlags: ['no_cache_mentioned', 'cache_never_expire'],
  followUps: [
    { trigger: 'vague_answer',    questionTemplate: 'Ask what caching approach and what hit rate they would target.' },
    { trigger: 'missing_metric',  questionTemplate: 'Ask what hit rate they would target and what that means for remaining DB load.' },
    { trigger: 'red_flag',        questionTemplate: 'Challenge: ask what happens when a URL is deleted — would the cached entry still redirect?' }
  ]
}
```

**Intent:**
```ts
{
  type: 'PROBE_PRIMARY',
  probeId: 'probe_url_scalability',
  probeDimension: 'scalability',
  promptTemplate: 'Ask about read throughput: App Server queries PostgreSQL on every redirect at 100K reads/sec — how does this hold up?',
  forbiddenHints: ['cache_strategy', 'cache_hit_rate', 'db_load_reasoning'],  // toàn bộ expectedSignals chưa covered
  maxSentences: 2
}
```

**Candidate nhận:** *"Your app server reads from PostgreSQL on every redirect — at 100K reads/sec, how does this hold up?"*

**Candidate:** *"We could add some caching in front of the database."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    // per-turn extracted signals — Tracker accumulate qua các turn
    expectedSignalsCovered: [],   // không mention strategy cụ thể, hit rate, DB load
    tradeoffMentioned: false,
    metricsMentioned: false,
    redFlagTriggered: false,
    constraintLinked: false
  },
  // illustrative — chưa có công thức rubric cụ thể
  scoreDelta: {
    technicalDepth: 0.1,
    tradeoffArticulation: 0,
    bottleneckReasoning: 0,
    componentOwnership: 0.2,
    operationalAwareness: 0
  },
  redFlags: []
}
```

**Active probe state sau turn 1:**
```ts
activeProbe = { probeId: 'probe_url_scalability', turnCount: 1, followUpCount: 0, challengeCount: 0 }
// Tracker cumulative expectedSignalsCovered: []
```

**Policy:** `expectedSignalsCovered` rỗng → `trigger='vague_answer'` → `ASK_FOLLOW_UP`

---

## Turn 2 — `PROBE_FOLLOW_UP` (vague_answer)

**Intent:**
```ts
{
  type: 'PROBE_FOLLOW_UP',
  probeId: 'probe_url_scalability',
  probeDimension: 'scalability',
  followUpTrigger: 'vague_answer',   // trigger từ Turn 1: không cover signal nào
  promptTemplate: 'Ask what caching approach and what hit rate they would target.',
  forbiddenHints: ['cache_strategy', 'cache_hit_rate', 'db_load_reasoning'],
  maxSentences: 2
}
```

**Candidate nhận:** *"What caching approach would you use, and what hit rate would you target to keep PostgreSQL load manageable?"*

**Candidate:** *"I'd use Redis. And I'd set the TTL to never expire — that way we always get cache hits and never touch the database."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    expectedSignalsCovered: ['cache_strategy'],  // Redis mention ✓ — per-turn
    tradeoffMentioned: false,
    metricsMentioned: false,
    redFlagTriggered: true,   // 'cache_never_expire' → stale data, không thể delete URLs
    constraintLinked: false
  },
  scoreDelta: {
    technicalDepth: 0.3,
    tradeoffArticulation: 0,
    bottleneckReasoning: 0,
    componentOwnership: 0.4,
    operationalAwareness: 0   // never-expire là red flag
  },
  redFlags: ['cache_never_expire']
}
```

**Active probe state sau turn 2:**
```ts
activeProbe = { probeId: 'probe_url_scalability', turnCount: 2, followUpCount: 1, challengeCount: 0 }
// Tracker cumulative expectedSignalsCovered: ['cache_strategy']
```

**Policy:** `redFlagTriggered=true` → `ASK_CHALLENGE`

---

## Turn 3 — `PROBE_CHALLENGE` (red_flag)

**Intent:**
```ts
{
  type: 'PROBE_CHALLENGE',
  probeId: 'probe_url_scalability',
  probeDimension: 'scalability',
  followUpTrigger: 'red_flag',
  promptTemplate: 'Challenge: candidate said cache TTL never expires. Ask what happens when a URL is deleted or updated — would the cached entry still redirect?',
  // forbiddenHints derive từ expectedSignals chưa covered tại thời điểm này
  forbiddenHints: ['cache_hit_rate', 'db_load_reasoning'],
  maxSentences: 2
}
```

**Candidate nhận:** *"If TTL never expires, what happens when a user deletes their short URL — would the old cached entry still redirect users?"*

**Candidate:** *"Ah, good point. We'd need to actively invalidate the cache entry when a URL is deleted. So maybe a short TTL — say a few minutes. That means we accept some brief staleness in exchange for simpler consistency, plus explicit invalidation on delete for immediate correctness."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    // per-turn: candidate re-confirm cache_strategy (Redis/TTL) — cache_invalidation_on_delete
    // không phải expectedSignal của probe này nên không đưa vào expectedSignalsCovered
    expectedSignalsCovered: ['cache_strategy'],
    tradeoffMentioned: true,    // "staleness vs simpler consistency" — explicit tradeoff
    metricsMentioned: false,    // chưa nêu con số hit rate
    redFlagTriggered: false,    // candidate đã correct red flag
    constraintLinked: false
  },
  scoreDelta: {
    technicalDepth: 0.5,
    tradeoffArticulation: 0.6,  // nhận ra freshness vs consistency tradeoff
    bottleneckReasoning: 0.3,
    componentOwnership: 0.5,
    operationalAwareness: 0.6   // biết delete gây stale cache
  },
  redFlags: []
}
```

**Active probe state sau turn 3:**
```ts
activeProbe = { probeId: 'probe_url_scalability', turnCount: 3, followUpCount: 1, challengeCount: 1 }
// Tracker cumulative expectedSignalsCovered: ['cache_strategy']  — cache_hit_rate, db_load_reasoning chưa covered
```

**Policy:** red flag resolved nhưng `metricsMentioned=false`, `cache_hit_rate` và `db_load_reasoning` chưa covered → `trigger='missing_metric'` → `ASK_FOLLOW_UP`

---

## Turn 4 — `PROBE_FOLLOW_UP` (missing_metric) → `CLOSE_PROBE` → `PROBE_PRIMARY` (consistency)

**Intent:**
```ts
{
  type: 'PROBE_FOLLOW_UP',
  probeId: 'probe_url_scalability',
  probeDimension: 'scalability',
  followUpTrigger: 'missing_metric',
  promptTemplate: 'Ask what hit rate they would target and what that means for remaining DB load.',
  forbiddenHints: ['cache_hit_rate', 'db_load_reasoning'],
  maxSentences: 2
}
```

**Candidate nhận:** *"What hit rate would you target, and what does that mean for the remaining load on PostgreSQL?"*

**Candidate:** *"I'd target 95% hit rate. At 5% miss on 100K reads/sec, that's 5K reads/sec to PostgreSQL — well within its capacity."*

**Assessor output:**
```ts
{
  candidateIntent: 'direct_answer',
  signals: {
    expectedSignalsCovered: ['cache_hit_rate', 'db_load_reasoning'],  // per-turn, mới cover turn này
    tradeoffMentioned: true,
    metricsMentioned: true,    // 95%, 5K reads/sec
    redFlagTriggered: false,
    // constraintLinked=true vì candidate nêu "100K reads/sec" — con số đã clarify ở Stage 1
    // Assessor nhận được clarificationLeftover.requirementContract làm input để match
    constraintLinked: true
  },
  scoreDelta: {
    technicalDepth: 0.8,
    tradeoffArticulation: 0.7,
    bottleneckReasoning: 0.9,  // math cụ thể: 95% hit rate → 5K reads/sec
    componentOwnership: 0.7,
    operationalAwareness: 0.6
  },
  redFlags: []
}
```

**Active probe state + Policy:**
```ts
// Tracker cumulative sau turn 4:
// expectedSignalsCovered: ['cache_strategy', 'cache_hit_rate', 'db_load_reasoning'] = tất cả expectedSignals
// → CLOSE_PROBE (closeReason: 'signals_covered')

activeProbe = {
  probeId: 'probe_url_scalability',
  turnCount: 4,
  followUpCount: 2,
  challengeCount: 1,
  closeReason: 'signals_covered'
}
```

**Tracker state sau CLOSE_PROBE:**
```ts
progress = {
  completedProbeIds: ['probe_url_scalability'],
  activeProbe: null,
  probeBudgetRemaining: 1   // 2 - 1 = 1, giảm khi probe close
}
```

**Planner chọn probe tiếp ngay** — không chờ candidate input mới:

```ts
// requiredDimensions=['scalability','consistency'], scalability đã done → consistency còn lại
// → probe_url_consistency được emit trong cùng response stream sau CLOSE_PROBE
```

**Candidate nhận (PROBE_PRIMARY consistency, cùng response stream):** *"You mentioned cache invalidation on delete. How do you ensure consistency between your cache and database when a URL is updated — not deleted, but the destination changes?"*

**Active probe state mới:**
```ts
progress = {
  completedProbeIds: ['probe_url_scalability'],
  activeProbe: { probeId: 'probe_url_consistency', turnCount: 1, followUpCount: 0, challengeCount: 0 },
  probeBudgetRemaining: 1
}
```

> Turn 5+ sẽ follow up theo signals của `probe_url_consistency`. Khi consistency probe close:
> ```ts
> completedProbeIds: ['probe_url_scalability', 'probe_url_consistency']
> activeProbe: null
> probeBudgetRemaining: 0   // → action: TRANSITION_STAGE
> ```
