# Ví dụ flow — Stage 1: Clarification

**Bài toán:** URL Shortener | **Level:** Senior | **Required dimensions:** `scope`, `scale`, `nfr`

---

## Turn 1 — `ANSWER_FACT` (happy path)

**Candidate:** *"How many users are we expecting?"*

**Assessor output:**
```ts
{
  candidateIntent: 'clarification_question',
  signals: {
    dimensionCovered: ['scale'],
    factDisclosed: true,
    matchedFactKey: 'dau',        // 'users' hit discloseWhen của fact 'dau'
    solutionLeapDetected: false
  },
  scoreDelta: { requirementCoverage: 0.15, questionSpecificity: 0.7, assumptionDiscipline: 0.8, prioritization: 0.6 }
}
```

**Policy Engine:** `matchedFactKey = 'dau'` → `ANSWER_FACT`

**Planner intent:**
```ts
{ type: 'ANSWER_FACT', factKey: 'dau', dimension: 'scale',
  promptTemplate: 'Answer using this fact: "{answer}". Be concise.',
  forbiddenHints: ['cache', 'sharding', 'database design', 'load balancer'],
  maxSentences: 2 }
```

**Candidate nhận:** *"We're expecting 100 million daily active users."*

**Tracker:** `coveredDimensions: ['scale']`, `disclosedFactKeys: ['dau']`

---

## Turn 2 — `REDIRECT` (edge case: solution_leap)

**Candidate:** *"I'm thinking we should use consistent hashing to distribute the URL database — that should handle the scale."*

**Assessor output:**
```ts
{
  candidateIntent: 'solution_leap',
  signals: {
    dimensionCovered: [],
    factDisclosed: false,
    matchedFactKey: null,
    solutionLeapDetected: true    // candidate đang design thay vì hỏi requirement
  },
  scoreDelta: { requirementCoverage: 0, questionSpecificity: 0, assumptionDiscipline: 0.2, prioritization: 0.1 }
}
```

**Policy Engine:** `solutionLeapDetected = true` → `REDIRECT`

**Planner intent:**
```ts
{ type: 'REDIRECT',
  promptTemplate: 'Candidate jumped to solution. Redirect them back to requirements gathering. Do not hint at what requirements are missing.',
  forbiddenHints: ['scale', 'nfr', 'latency', 'scope'],   // hardcode Clarification list
  maxSentences: 2 }
```

**Candidate nhận:** *"Let's hold off on the implementation for now — there are still a few things we should clarify first. What else would you like to understand about the system?"*

**Tracker:** không thay đổi (solution_leap không mark dimension nào)

---

## Turn 3 — `ANSWER_FACT` (scope dimension)

**Candidate:** *"Got it. What are the core use cases — just shortening URLs, or anything else like custom aliases?"*

**Assessor output:**
```ts
{
  candidateIntent: 'clarification_question',
  signals: {
    dimensionCovered: ['scope'],
    factDisclosed: true,
    matchedFactKey: 'custom_alias',  // 'custom aliases' hit discloseWhen
    solutionLeapDetected: false
  },
  scoreDelta: { requirementCoverage: 0.2, questionSpecificity: 0.85, assumptionDiscipline: 0.9, prioritization: 0.75 }
}
```

**Policy Engine:** `matchedFactKey = 'custom_alias'` → `ANSWER_FACT`

**Planner intent:**
```ts
{ type: 'ANSWER_FACT', factKey: 'custom_alias', dimension: 'scope',
  promptTemplate: 'Answer using this fact: "{answer}". Be concise.',
  forbiddenHints: ['cache', 'sharding', 'database design', 'load balancer'],   // same hardcode list mọi ANSWER_FACT trong Clarification
  maxSentences: 2 }
```

**Candidate nhận:** *"Yes, users can create custom short URLs in addition to auto-generated ones."*

**Tracker:** `coveredDimensions: ['scale', 'scope']`, `disclosedFactKeys: ['dau', 'custom_alias']`

---

## Turn 4 — `TRANSITION_STAGE` (edge case: off_topic trước khi transition)

**Candidate:** *"Is analytics — like click tracking — part of the scope?"*

**Assessor output:**
```ts
{
  candidateIntent: 'clarification_question',
  signals: {
    dimensionCovered: ['non_goal'],   // hỏi về analytics → dimension non_goal
    factDisclosed: true,
    matchedFactKey: 'analytics',      // 'analytics' hit discloseWhen
    solutionLeapDetected: false
  },
  scoreDelta: { requirementCoverage: 0.1, questionSpecificity: 0.8, assumptionDiscipline: 0.9, prioritization: 0.5 }
}
```

**Policy Engine:** `matchedFactKey = 'analytics'` → `ANSWER_FACT`. Sau khi trả lời, `nfr` vẫn thiếu (required cho Senior) → `chainedAction: ASK_NUDGE`.

**Decision:**
```ts
SDClarificationDecision = {
  action: 'ANSWER_FACT',
  reason: 'matchedFactKey=analytics; nfr still missing after this turn',
  nextIntent: {
    type: 'ANSWER_FACT', factKey: 'analytics', dimension: 'non_goal',
    promptTemplate: 'Answer using this fact: "{answer}". Be concise.',
    forbiddenHints: ['cache', 'sharding', 'database design', 'load balancer'],
    maxSentences: 2
  },
  chainedAction: {
    action: 'ASK_NUDGE',
    intent: {
      type: 'NUDGE', dimension: 'nfr',
      promptTemplate: 'Candidate has not asked about nfr dimension. Nudge them without revealing what is missing.',
      forbiddenHints: ['latency', '100ms', 'availability', 'SLA'],
      maxSentences: 2
    }
  }
}
```

**Candidate nhận (ANSWER_FACT):** *"Analytics and click tracking are out of scope for this system."*

**Candidate nhận ngay sau (chainedAction ASK_NUDGE):** *"One more thing before you start — do you have a sense of the latency requirements for redirects?"*

**Candidate:** *"I'd say under 100ms p99 for redirects."*

**Assessor (turn 5):** `dimensionCovered: ['nfr']`, `matchedFactKey: 'redirect_latency'`

**Policy Engine check:**
```ts
// SDClarificationTransitionCriteria (Senior):
// requiredDimensions: ['scope', 'scale', 'nfr']
// minCandidateTurns: 3 | minDurationSeconds: 120

coveredDimensions: ['scale', 'scope', 'non_goal', 'nfr']   // tất cả required covered ✓
turnCount: 5 >= minCandidateTurns: 3  ✓
elapsedSeconds >= minDurationSeconds  ✓
→ TRANSITION_STAGE
```

**Candidate nhận:** *"Good. Go ahead and draw your architecture — feel free to state your assumptions as you start."*
