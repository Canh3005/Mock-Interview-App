# Feature 032 — Interview Runtime (Stage 2–4)

Stage 2–4 là lớp thực thi `SessionPlan` từ F030: mở đầu phỏng vấn, điều phối vòng probe qua 6 stage, đánh giá từng câu trả lời, ra quyết định follow-up/challenge/transition theo policy, và đóng session khi đủ điều kiện.

**Prerequisite:** F029 (Calibration), F030 (Session Planning).

**Kế thừa chính:** `QuestionPracticeScoringService` và `ProbeScoringResult` từ question bank module — không build evaluation engine mới. F032 tập trung vào state machine, policy engine và stage orchestration.

---

## Hai LLM call thay vì ba

F032 cũ thiết kế 3 LLM call: render question, evaluate turn, generate follow-up. Sau khi đọc codebase:

- **Evaluation đã có:** `QuestionPracticeScoringService._scoreAttempt()` xử lý toàn bộ signal extraction, red flag detection, overall band. Chỉ cần expose method thành `public` và gọi synchronously.
- **Follow-up đã có:** `QuestionProbe.followUps[]` chứa sẵn câu hỏi per trigger (`missing_metric`, `missing_context`, `missing_tradeoff`, `vague_answer`, `red_flag`). Policy chọn trigger đúng → lấy câu hỏi từ probe, không cần LLM generate.

**Còn lại 2 LLM call:**

| Call | Mục đích |
|---|---|
| **Question Rendering** | Render `probe.primaryQuestion` tự nhiên theo persona. Nhận question text, trả về phrased question |
| **Turn Scoring** | Gọi `QuestionPracticeScoringService` synchronously → `ProbeScoringResult` |

---

## Input contract từ Stage 1

```ts
interface RuntimeInitInput {
  sessionPlan: SessionPlan   // từ F030, đã persist
  userId: string
  sessionId: string
}
```

Runtime init context:

```ts
interface InterviewRuntimeContext {
  sessionId: string
  plan: SessionPlan
  state: InterviewState
  currentStageIndex: number              // index vào plan.stageAllocations
  currentProbeIndex: number              // index vào stageAllocations[currentStageIndex].selectedProbes
  activeProbeSession: ActiveProbeSession | null
  stageProgress: StageProgress[]        // một entry per stage đã chạy hoặc đang chạy
  turnHistory: InterviewTurn[]
  timeStartedAt: string
  timeUsedSeconds: number
}
```

---

## Schema

### `InterviewState`

```ts
type InterviewState =
  | 'PLANNED'
  | 'OPENING'               // Stage 2: opening contract
  | 'ASKING_PROBE'          // câu hỏi probe vừa được gửi, chờ user
  | 'EVALUATING_TURN'       // đang chạy scoring service
  | 'DECIDING_NEXT_ACTION'  // policy engine đang chạy
  | 'ASKING_FOLLOW_UP'      // follow-up question vừa gửi, chờ user
  | 'CHALLENGING'           // challenge vừa gửi, chờ user
  | 'TRANSITIONING_PROBE'   // chuyển sang probe tiếp theo trong cùng stage
  | 'TRANSITIONING_STAGE'   // chuyển sang stage tiếp theo
  | 'COMPLETED'             // tất cả stages xong, chờ Stage 5 synthesis
```

---

### `InterviewTurn`

```ts
type InterviewTurnType =
  | 'opening_contract'
  | 'stage_intro'         // câu intro ngắn khi bắt đầu mỗi stage
  | 'probe_question'
  | 'follow_up'
  | 'challenge'
  | 'probe_transition'    // "Let's move on..." giữa probe trong cùng stage
  | 'stage_transition'    // "Now let's shift to..." khi chuyển stage
  | 'candidate_answer'

interface InterviewTurn {
  id: string
  sessionId: string
  stageKey: QuestionProbeStage | null   // null cho opening_contract
  probeId: string | null                // null cho stage-level turns
  turnIndex: number                     // tăng dần xuyên suốt session
  probeTurnIndex: number                // reset về 0 khi chuyển probe
  role: 'interviewer' | 'candidate'
  type: InterviewTurnType
  content: string
  followUpTrigger?: QuestionProbeFollowUpTrigger  // set khi type = 'follow_up'
  challengeReason?: string                         // set khi type = 'challenge'
  timestamp: string
}
```

---

### `ActiveProbeSession`

State probe đang chạy.

```ts
type ProbeCloseReason =
  | 'sufficient_evidence'      // overallBand = 'strong'
  | 'max_follow_ups_reached'
  | 'turn_limit_reached'       // totalTurnCount >= maxTurnsPerProbe (safety ceiling)
  | 'time_exhausted'
  | 'no_follow_up_available'   // probe không có follow-up cho trigger phù hợp
  | 'no_new_evidence'          // overallBand không cải thiện sau follow-up
  | 'no_relevant_story'        // vẫn no_signal sau khi đã redirect
  | 'fallback_triggered'

interface ActiveProbeSession {
  plannedProbe: PlannedProbe
  questionProbe: QuestionProbe          // fetched từ bank khi probe bắt đầu
  stage: QuestionProbeStage
  startedAt: string
  candidateTurnCount: number
  followUpCount: number
  challengeCount: number
  redirectCount: number                 // số lần nhắc candidate trả lời đúng câu hỏi
  totalTurnCount: number                // tổng follow_up + challenge + redirect đã emit; dùng cho safety ceiling
  lastScoringResult: ProbeScoringResult | null
  previousBand: OverallBand | null      // để detect no_new_evidence
  status: 'active' | 'closed'
  closeReason?: ProbeCloseReason
}
```

---

### `StageProgress`

Rollup per stage — thay thế `EvidenceGraph` phức tạp. Stage 5 đọc array này để build scorecard.

```ts
type StageStatus = 'pending' | 'active' | 'completed' | 'skipped'

interface ProbeRunSummary {
  questionProbeId: string
  questionProbeRevision: number
  candidateTurnCount: number
  followUpCount: number
  challengeCount: number
  finalBand: OverallBand
  finalScoringResult: ProbeScoringResult
  closeReason: ProbeCloseReason
  isFallback: boolean
}

interface StageProgress {
  stage: QuestionProbeStage
  status: StageStatus
  startedAt: string | null
  completedAt: string | null
  allocatedMinutes: number
  usedMinutes: number
  probeRuns: ProbeRunSummary[]
}
```

---

### `SessionClaimOutcome` và `SessionRiskOutcome`

Persist sau session để F031 (practice mode) dùng làm history. Build từ `StageProgress` trong Stage 5.

```ts
type SessionClaimOutcomeStatus =
  | 'supported'
  | 'probed'
  | 'insufficient_evidence'
  | 'contradicted'

interface SessionClaimOutcome {
  id: string
  sessionId: string
  claimId: string
  probeIds: string[]
  status: SessionClaimOutcomeStatus
  createdAt: string
}

interface SessionRiskOutcome {
  id: string
  sessionId: string
  riskId: string
  probeIds: string[]
  status: 'confirmed' | 'rejected' | 'inconclusive'
  createdAt: string
}
```

---

## Runtime Flow

### Stage 2 — Opening contract

Một lần duy nhất khi session bắt đầu. Scripted theo `personaPolicy`, không cần LLM evaluation.

**Nội dung bắt buộc:**
- Xác nhận role/level candidate đang luyện
- Format: sẽ hỏi nhiều câu hỏi qua các phần, có follow-up sâu, không nhận xét giữa chừng
- Không gợi ý STAR, không coaching

```
InterviewTurn { type: 'opening_contract', role: 'interviewer' }
→ state: OPENING → ASKING_PROBE
```

---

### Stage 3 — Probe loop (lõi của runtime)

**Outer loop — stages:**
```
for each StageProbeAllocation in plan.stageAllocations (ordered):
  if allocation.selectedProbes.length === 0 → skip stage
  emit stage_intro turn
  run inner probe loop
  emit stage_transition turn (trừ stage cuối)
```

**Inner loop — probes trong một stage:**
```
for each PlannedProbe in allocation.selectedProbes:
  fetch QuestionProbe từ bank
  LLM Call 1: render probe question với persona
  emit probe_question turn → state = ASKING_PROBE

  loop:
    user answers → emit candidate_answer turn
    state = EVALUATING_TURN
    
    Call QuestionPracticeScoringService (sync) → ProbeScoringResult
    cập nhật activeProbeSession.lastScoringResult
    
    state = DECIDING_NEXT_ACTION
    nextAction = PolicyEngine.decide(...)
    
    if nextAction = REDIRECT:
      emit redirect turn → state = ASKING_REDIRECT
      continue loop
    
    if nextAction = FOLLOW_UP:
      emit follow_up turn → state = ASKING_FOLLOW_UP
      continue loop
    
    if nextAction = CHALLENGE:
      emit challenge turn → state = CHALLENGING
      continue loop
    
    if nextAction = CLOSE_PROBE:
      ghi ProbeRunSummary vào StageProgress
      break
    
    if nextAction = USE_FALLBACK:
      switch to fallbackProbe → fetch → render
      break inner → restart probe loop với fallback

  emit probe_transition turn (nếu còn probe tiếp theo trong stage)
```

---

### LLM Call 1 — Question Rendering (Pre-rendered tại session init)

`SessionPlan.stageAllocations[].selectedProbes` đã cố định từ F030 → render toàn bộ probe questions bằng LLM ngay khi `POST /behavior-sessions` khởi tạo session, lưu vào map trong session context. Probe start không còn LLM call nào — zero latency khi chuyển probe.

```ts
// Chạy song song tại session init:
const renderedQuestions: Map<string, string> = new Map()
await Promise.all(
  allSelectedProbes.map(async (probe) => {
    const rendered = await renderProbeQuestion(probe, personaPolicy, language)
    renderedQuestions.set(probe.questionProbeId, rendered)
  })
)
// Persist vào BehavioralSession (jsonb) để resume sau reload
```

**Prompt render một probe:**

System:
```
You are {personaPolicy.name}. Tone: {tone}.
You are interviewing for {targetRole} at {targetLevel} level.
Do NOT give feedback. Ask exactly one question. Language: {language}.
```

User:
```
Rephrase this question naturally for your persona:
"{displayQuestion}"

Stage context: {stageName}
```

**Output:** string — câu hỏi đã phrase. LLM không được thêm hint, explanation hay coaching.

Fallback probe (nếu có trong `fallbackProbes`) cũng được pre-render cùng lúc.

---

### LLM Call 1b — Follow-up/Challenge Rendering (Lazy pre-render khi probe bắt đầu)

Follow-up và challenge lấy từ `probe.followUps[]` — text cố định, biết trước — nhưng cần persona rendering. Thay vì pre-render toàn bộ tại session init (lãng phí nếu không trigger), render background ngay khi `probe_question` được emit.

```
emit probe_question → candidate đọc + soạn câu trả lời (~30–120s)
                   ↕ song song, không block
                   background: renderFollowUps(probe, personaPolicy, language)
                   → lưu vào renderedFollowUps map (key: probeId + trigger)
→ candidate submit answer
→ scoreForRuntime() → PolicyEngine.decide() → FOLLOW_UP / CHALLENGE
→ rendered text đã sẵn sàng → stream ngay
```

```ts
// Chạy fire-and-forget sau khi emit probe_question:
renderFollowUpsInBackground(probe, personaPolicy, language).then((rendered) => {
  session.renderedFollowUps.set(probe.questionProbeId, rendered)
})
// rendered: Map<QuestionProbeFollowUpTrigger, string>
```

**Fallback nếu candidate trả lời trước khi render xong** (hiếm, <5s): on-demand render trong SSE pipeline — stream vẫn mở qua `evaluating` event nên candidate không thấy gián đoạn.

**Prompt render follow-up/challenge:**

System: giống LLM Call 1 (cùng persona, tone, language).

User:
```
You are continuing the interview. Rephrase this follow-up naturally for your persona.
Do NOT give feedback or hints. Ask exactly one question.

Follow-up: "{followUp.text}"
Context: candidate just answered a question about {stageName}.
```

---

### Evaluation — Reuse `QuestionPracticeScoringService`

Thay vì gọi qua BullMQ, gọi method `scoreForRuntime` expose trực tiếp:

```ts
// Thêm vào QuestionPracticeScoringService:
async scoreForRuntime(params: {
  questionProbe: QuestionProbe
  answerText: string           // TOÀN BỘ candidate text trong probe, không chỉ turn mới nhất
  language: QuestionProbeLanguage
  cvClaims?: string[]
}): Promise<ProbeScoringResult>
```

Method này chạy `_extractionPrompt` + `_withNarrative` với input trực tiếp thay vì từ `QuestionPracticeAttempt` entity. Không queue BullMQ, không persist attempt — chỉ trả `ProbeScoringResult`. Cần refactor `_extractionPrompt` để nhận `QuestionProbe` thay vì `probeSnapshot` (OQ-2).

**Follow-up answer đánh giá như thế nào:**

Mỗi lần candidate trả lời (dù là turn đầu hay sau follow-up), `scoreForRuntime` nhận **concatenated text của tất cả candidate turns trong probe đó**, không chỉ answer mới nhất. Signal coverage là cumulative — user có thể bổ sung metric ở follow-up mà không có ở câu đầu.

```
Turn 1: "Chúng tôi đã refactor service cũ..."
→ scoreForRuntime(turn1) → band: 'needs_work', missing: [metric, personal_contribution]
→ Policy: FOLLOW_UP (missing_metric)

Turn 2: "Tôi viết lại query layer, giảm p95 từ 800ms xuống 120ms."
→ scoreForRuntime(turn1 + "\n" + turn2) → band: 'solid', missing: []
→ Policy: CLOSE (sufficient_evidence)
```

`previousBand` trong `ActiveProbeSession` dùng để detect `no_new_evidence`: nếu band không cải thiện sau follow-up thì đóng probe.

**Cần thêm vào taxonomy (prerequisite nhỏ):**

```ts
// Bổ sung vào QUESTION_PROBE_FOLLOW_UP_TRIGGERS để cover behavioral probes:
'missing_personal_contribution'  // "we did X" không có "I specifically"
'missing_consequence'             // có action nhưng không có result/outcome
'missing_reflection'              // không có lesson learned
```

---

### Policy Engine — Deterministic, không LLM

Input: `ProbeScoringResult` + `ActiveProbeSession` + `PressureProfile`.

**Quy trình quyết định theo priority:**

```
0. overallBand === 'no_signal'  ← candidate trả lời lạc đề / quá ngắn / không liên quan
   VÀ redirectCount < MAX_REDIRECTS_PER_PROBE (= 1)
   → REDIRECT  (nhắc candidate trả lời đúng câu hỏi)

0b. overallBand === 'no_signal'
    VÀ redirectCount >= MAX_REDIRECTS_PER_PROBE
    → USE_FALLBACK nếu có fallbackProbe
    → CLOSE_PROBE (no_relevant_story) nếu không có fallback

1. overallBand === 'strong'
   → CLOSE_PROBE (sufficient_evidence)

1b. totalTurnCount >= maxTurnsPerProbe  ← safety ceiling tuyệt đối
    → CLOSE_PROBE (turn_limit_reached)

2. Có red flag present
   VÀ challengeCount < pressureProfile.maxChallengesPerProbe
   VÀ probe.followUps có trigger 'red_flag'
   → CHALLENGE

3. followUpCount >= maxFollowUpsForLevel
   → CLOSE_PROBE (max_follow_ups_reached)

4. lastScoringResult.overallBand === previousBand (không cải thiện)
   VÀ followUpCount >= 1
   → CLOSE_PROBE (no_new_evidence)

5. Tìm trigger phù hợp từ signal gaps:
   trigger = pickTrigger(signalResults, probeType)
   followUp = probe.followUps.find(f => f.trigger === trigger)
   Nếu có followUp → FOLLOW_UP
   Nếu không có followUp → CLOSE_PROBE (no_follow_up_available)

6. Fallback: CLOSE_PROBE (no_new_evidence)
```

**REDIRECT** là lượt interviewer nhắc candidate trả lời đúng câu hỏi, không thêm gợi ý hay hint. Ví dụ: *"Bạn có thể chia sẻ một tình huống cụ thể liên quan đến câu hỏi không?"* `MAX_REDIRECTS_PER_PROBE = 1` — chỉ nhắc 1 lần; nếu vẫn `no_signal` thì mới fallback hoặc close. REDIRECT được tính vào `totalTurnCount`.

`totalTurnCount` tính tổng số lần emit `redirect` + `follow_up` + `challenge` trong một probe (không tính lượt hỏi probe gốc). Được tăng +1 sau mỗi lần PolicyEngine trả về các action trên, trước khi emit turn. Guard này bảo vệ khỏi scoring LLM hallucinate liên tục `red_flag` hoặc `missing_*` trigger, khiến challenge/follow-up fire không dừng.

**`maxTurnsPerProbe` theo level:**

| Level | Max turns per probe (follow-up + challenge cộng lại) |
|---|---|
| Junior | 2 |
| Mid | 3 |
| Senior | 4 |

**`pickTrigger` theo priority:**

```ts
function pickTrigger(
  signalResults: ProbeSignalResult[],
  probeType: QuestionProbeType
): QuestionProbeFollowUpTrigger | null {
  const missing = signalResults.filter(s => s.status !== 'covered')

  // Technical probes: trade-off là critical nhất
  if (probeType === 'technical_depth' || probeType === 'trade_off') {
    if (missing.some(s => isTriggerRelevant(s, 'missing_tradeoff')))
      return 'missing_tradeoff'
  }

  // Tất cả probe types
  if (missing.some(s => isTriggerRelevant(s, 'missing_metric')))  return 'missing_metric'
  if (missing.some(s => isTriggerRelevant(s, 'missing_context'))) return 'missing_context'
  if (missing.length > 0) return 'vague_answer'
  return null
}
```

`isTriggerRelevant`: map signal label keywords → trigger type. Fragile nếu dùng string matching — xem OQ-1.

**`maxFollowUpsForLevel`:**

| Level | Max follow-ups per probe |
|---|---|
| Junior | 1 |
| Mid | 2 |
| Senior | 3 |

---

### Stage 4 — Adaptive Transition (Probe close và Stage close)

**Probe close** xảy ra khi policy trả về `CLOSE_PROBE`. Sau đó:

```
Ghi ProbeRunSummary vào StageProgress.probeRuns
Cập nhật thời gian đã dùng

if còn probe tiếp theo trong stage VÀ còn time budget:
  → TRANSITIONING_PROBE → chạy probe tiếp theo

else:
  → TRANSITIONING_STAGE
```

**Stage close** xảy ra khi hết probe trong stage hoặc hết `allocatedMinutes`:

```
Đánh dấu StageProgress.status = 'completed'

if còn stage tiếp theo trong stageAllocations:
  if stage tiếp theo là 'nice_to_include' VÀ timeUsed > 85% durationMinutes:
    skip stage → StageProgress.status = 'skipped'
  else:
    → TRANSITIONING_STAGE → bắt đầu stage mới

else:
  → COMPLETED
```

**Fallback probe:**

Trigger được xử lý trong PolicyEngine step 0b: sau khi đã REDIRECT 1 lần mà scoring vẫn trả `no_signal`, PolicyEngine quyết định `USE_FALLBACK` (lấy từ `StageProbeAllocation.fallbackProbes`) hoặc `CLOSE_PROBE (no_relevant_story)` nếu không có fallback. Không trigger thẳng khi `candidateTurnCount === 1` — candidate phải được nhắc trả lời đúng trước.

---

## Entity Strategy — Extend, không replace

`BehavioralSession` và `BehavioralStageLog` đã tồn tại trong production. Không đập đi — **extend với nullable columns**, dùng `sessionMode` để phân biệt old flow và probe-based flow.

Relationship không đổi:
```
InterviewSession  (parent — giữ nguyên hoàn toàn)
  └── BehavioralSession  (interviewSessionId FK — giữ nguyên)
        └── BehavioralStageLog  (behavioralSessionId FK — giữ nguyên)
```

### `BehavioralSession` — columns cần thêm

```ts
// Columns mới — nullable, chỉ populate khi sessionMode = 'probe_based'
sessionMode: 'legacy' | 'probe_based'   // default: 'legacy' — không break sessions cũ
planId: string | null                    // FK → SessionPlan (F030)
calibrationProfileId: string | null      // FK → BehaviorCalibrationProfile (F029)
interviewState: InterviewState | null    // granular state cho probe-based flow
currentStageIndex: number               // default: 0
currentProbeIndex: number               // default: 0
stageProgress: StageProgress[] | null   // jsonb — cập nhật sau mỗi probe close

// Columns cũ — giữ nguyên, dùng khi sessionMode = 'legacy'
// interviewSessionId, candidateLevel, currentStage,
// coveredCompetencies, stageSummaries, finalScore, status
```

Resume logic: nếu user reload, đọc `interviewState` + `currentStageIndex` + `currentProbeIndex` + `stageProgress` → reconstruct `activeProbeSession` → tiếp tục từ `ASKING_PROBE`.

### `BehavioralStageLog` — columns cần thêm

`BehavioralStageLog` đã có `stageNumber`, `role`, `content` — gần như là `InterviewTurn`. Thêm nullable columns:

```ts
// Columns mới — nullable, chỉ populate khi probe-based
probeId: string | null                           // FK → QuestionProbe
turnType: InterviewTurnType | null               // 'probe_question' | 'follow_up' | ...
followUpTrigger: QuestionProbeFollowUpTrigger | null
probeScoringResult: ProbeScoringResult | null    // jsonb — set sau mỗi candidate_answer
probeTurnIndex: number                           // default: 0, reset khi chuyển probe

// Columns cũ — giữ nguyên
// stageNumber, stageName, role, content, inputType, relevanceScore, qualityFlags
```

`stageNumber` (int) trong log cũ được giữ nguyên — với probe-based flow, nó lưu `stageIndex` (0-based index vào `stageAllocations`). Legacy flow vẫn dùng số 1–6 như cũ.

---

## API Design

```
POST /api/behavior-sessions
  Body: { planId }
  Response: { sessionId, openingTurn: InterviewTurn, state: 'OPENING' }

POST /api/behavior-sessions/:id/answer
  Body: { content: string }
  Response: {
    scoringResult: ProbeScoringResult,  // chỉ expose ở dev mode / sau session
    nextTurn: InterviewTurn,
    state: InterviewState,
    stageProgress: { stage, probesCompleted, totalProbes, stageIndex, totalStages }
  }

GET /api/behavior-sessions/:id
  Response: { state, currentStage, turnHistory, stageProgress[] }

POST /api/behavior-sessions/:id/complete
  Trigger khi state = 'COMPLETED' → kick off Stage 5 synthesis
  Response: { sessionId, state: 'COMPLETED' }
```

**Dùng SSE (Server-Sent Events)** để stream turn response về client. Endpoint `POST /answer` mở SSE stream ngay khi nhận request — candidate thấy phản hồi ngay thay vì chờ toàn bộ pipeline xong.

**SSE event flow cho `POST /answer`:**

```
Client submit answer
  → Server mở SSE stream ngay lập tức
  → emit { type: 'evaluating' }           ← client hiển thị "interviewer đang suy nghĩ"
  → scoreForRuntime() chạy (2 LLM calls)
  → PolicyEngine.decide()                 ← deterministic, instant
  → emit { type: 'turn_start', turnType } ← client biết loại turn sắp đến
  → stream response text theo chunks      ← từng token/chunk của interviewer turn
  → emit { type: 'turn_complete', nextTurn: InterviewTurn, state, stageProgress }
  → server đóng stream
```

Probe question (pre-rendered) và follow-up/challenge text được stream trực tiếp theo chunks, không cần chờ toàn bộ text.

**SSE event types:**
```ts
type SSEEventType =
  | 'evaluating'      // scoring đang chạy
  | 'turn_start'      // bắt đầu stream text của turn mới
  | 'chunk'           // một đoạn text
  | 'turn_complete'   // turn hoàn chỉnh, kèm state + stageProgress
  | 'error'           // lỗi không thể recover
```

`POST /behavior-sessions` (tạo session + pre-render) trả response thường (không SSE) — client chờ 1 lần duy nhất, đổi lại toàn bộ probe loop sau đó không có LLM cold start.

---

## Những gì F032 KHÔNG làm

- Không tính final score — Stage 5 (F033).
- Không show scorecard hay coaching — Stage 6 (F034).
- Không update `BehaviorProgressProfile` — Stage 7 (F035).
- Không generate follow-up bằng LLM — follow-up lấy từ `probe.followUps[]`.
- Không cho user tự chuyển stage hay skip probe.

---

## Output contract cho Stage 5

```ts
interface Stage5Input {
  sessionId: string
  sessionPlan: SessionPlan
  stageProgress: StageProgress[]        // đủ để build scorecard per stage
  turnHistory: InterviewTurn[]
  sessionClaimOutcomes: SessionClaimOutcome[]  // build từ stageProgress trong Stage 5
  sessionRiskOutcomes: SessionRiskOutcome[]
  totalTimeUsedSeconds: number
}
```

Stage 5 build `SessionClaimOutcome` và `SessionRiskOutcome` từ `stageProgress.probeRuns[].finalScoringResult` — không cần runtime tự tạo outcome sau mỗi turn.

---

## Open Questions

### OQ-1: `pickTrigger` — string matching hay structured signal? ✅ Đã quyết định

**Option A:** Thêm `triggerHint` vào từng signal trong `expectedSignals`.

```ts
// QuestionProbe.expectedSignals thay đổi từ string[] sang:
expectedSignals: Array<{ label: string; triggerHint: QuestionProbeFollowUpTrigger }>
```

Policy map: `signalResult.status !== 'covered'` → đọc `signal.triggerHint` → lookup `probe.followUps.find(f => f.trigger === triggerHint)`. Không cần string matching, không LLM.

Đây là schema migration — cần update probe bank seed data và `QuestionPracticeProbeSnapshot.rubric.expectedSignals`. Practice mode hiện tại dùng `expectedSignals` là `string[]`, cần migrate sang structured format (backward compat: nếu `triggerHint` null thì fallback về `vague_answer`).

### OQ-2: `scoreForRuntime` refactor scoring service ✅ Đã quyết định

Refactor `_extractionPrompt` để nhận `QuestionProbe` + `cvClaims?: string[]` trực tiếp thay vì `QuestionPracticeAttempt`. Practice mode build `probeSnapshot` rồi convert sang cùng interface — backward compatible. Method mới `scoreForRuntime` là public, không queue BullMQ.

### OQ-3: Stage intro và transition — scripted ✅ Đã quyết định

Template scripted theo `stage` + `personaPolicy.tone`. Không cần LLM call riêng — giảm latency giữa stage. Ví dụ:

```ts
const STAGE_INTROS: Record<QuestionProbeStage, Record<PersonaTone, string>> = {
  stage_2_tech_stack: {
    friendly: "Let's talk about your technical experience...",
    skeptical: "Now, let's get into the technical side. I'll be asking for specifics.",
    // ...
  }
}
```
