## Overview

Tạo module `SDEvaluatorModule` mới theo BullMQ pattern nhất quán với behavioral và live-coding. `POST /evaluate` enqueue job → worker chạy Component Coverage (instant) trước, sau đó 4 AI dimensions **song song** (Promise.allSettled), mỗi dimension xong gọi `job.updateProgress()` ngay → FE poll `/evaluate/status` mỗi 2s để hiển thị progress. Kết quả lưu vào `SDSession.evaluationResult` (jsonb column mới).

**Tại sao parallel:** 4 AI dimensions độc lập nhau hoàn toàn (không có data dependency). Parallel giảm từ ~15s xuống ~4-5s.

Split thành 2 story: Story 1 (BE) test được qua API trước; Story 2 (FE) sau khi contract rõ.

---

## Architectural Decisions

### Decision: BullMQ + job.updateProgress() vs SSE streaming

**Chọn: BullMQ** — consistent với behavioral scoring và live-coding debrief đang dùng cùng pattern. Navigation flow sau evaluation đồng nhất: poll → COMPLETED → ScoringPage. Resilient khi client disconnect giữa chừng — job vẫn chạy, kết quả vẫn được lưu. SSE phù hợp hơn cho SD nhưng cost về inconsistency cao hơn benefit.

Per-dimension progress vẫn đạt được qua `job.updateProgress()` + poll endpoint.

### Decision: Parallel vs sequential AI dimensions

**Chọn: Parallel (Promise.allSettled)** — 4 AI dimensions không có data dependency. Song song giảm latency ~3–4x. Progress vẫn update từng dimension khi resolve nhờ `.then(() => job.updateProgress())` trên từng call.

---

## Story 1 — Backend (9 files)

### 1. `server/src/jobs/jobs.constants.ts` — MODIFY

Thêm:
```typescript
export const SD_EVALUATION_QUEUE =
  process.env.SD_EVALUATION_QUEUE || 'sd-evaluation';

export const SdEvaluationJobName = {
  EVALUATE_SESSION: 'evaluate-session',
} as const;
```

### 2. `server/src/sd-evaluator/prompts/evaluation-prompts.ts` — NEW

4 prompt templates đầy đủ:

```typescript
export function buildScalabilityPrompt(params: {
  problemTitle: string;
  scalingConstraints: ScalingConstraints | null;
  nodeTypes: string[];
  edges: unknown[];
}): string {
  return `You are evaluating a system design interview answer.

Problem: ${params.problemTitle}
Scaling constraints: ${JSON.stringify(params.scalingConstraints)}
Candidate's architecture — components: [${params.nodeTypes.join(', ')}]
Connections: ${JSON.stringify(params.edges)}

Evaluate the architecture's scalability fit. Consider:
- Are the right components present for the stated scale (QPS, DAU, storage)?
- Is the design over-engineered (unnecessary complexity for this scale)?
- Is the design under-engineered (missing critical components for this scale)?

Return ONLY valid JSON, no explanation outside the JSON:
{ "score": <number 0–20>, "reasoning": "<1–2 sentences>" }`;
}

export function buildTradeoffPrompt(params: {
  problemTitle: string;
  transcriptHistory: unknown[];
}): string {
  return `You are evaluating a system design interview transcript.

Problem: ${params.problemTitle}
Transcript (chronological, with phase labels):
${JSON.stringify(params.transcriptHistory)}

Identify instances where the candidate explicitly articulated a trade-off — comparing two or more technical choices with clear reasoning (e.g. "I chose X over Y because Z").
Each trade-off you count MUST be grounded in a direct quote from the transcript above.

Scoring: 0 trade-offs = 0 pts | 1 = 8 pts | 2 = 14 pts | 3+ = 20 pts

Return ONLY valid JSON, no explanation outside the JSON:
{
  "score": <number 0–20>,
  "tradeoffs": [
    { "quote": "<exact text>", "phase": "<phase label>", "description": "<what trade-off>" }
  ]
}

IMPORTANT: If no trade-off has a grounded quote, score MUST be 0 and tradeoffs MUST be [].`;
}

export function buildCommunicationPrompt(params: {
  problemTitle: string;
  transcriptHistory: unknown[];
}): string {
  return `You are evaluating the communication quality of a system design interview.

Problem: ${params.problemTitle}
Transcript:
${JSON.stringify(params.transcriptHistory)}

Evaluate the candidate on:
- Fluency: clear structured sentences, minimal filler
- Technical terminology: correct use of domain terms (e.g. "eventual consistency", "horizontal scaling")
- Explanation structure: logical step-by-step vs jumping between ideas

Return ONLY valid JSON, no explanation outside the JSON:
{ "score": <number 0–15>, "reasoning": "<1–2 sentences>" }`;
}

export function buildCurveballPrompt(params: {
  problemTitle: string;
  curveballScenarioPrompt: string;
  expectedAdaptation: string;
  beforeNodeTypes: string[];
  afterNodeTypes: string[];
  curveballAdaptation: unknown;
}): string {
  return `You are evaluating how a candidate adapted their architecture after a curveball scenario.

Problem: ${params.problemTitle}
Curveball given: "${params.curveballScenarioPrompt}"
Expected adaptation direction: "${params.expectedAdaptation}"

Architecture before curveball (component types): [${params.beforeNodeTypes.join(', ')}]
Architecture after curveball (component types): [${params.afterNodeTypes.join(', ')}]
Diagram changes (JSON diff): ${JSON.stringify(params.curveballAdaptation)}

Evaluate whether the diagram changes reflect the expected adaptation direction.

Return ONLY valid JSON, no explanation outside the JSON:
{
  "score": <number 0–20>,
  "reasoning": "<1–2 sentences>",
  "adaptationFound": <true|false>
}

IMPORTANT: If diagram changes are empty, score MUST be 0.`;
}
```

### 3. `server/src/sd-evaluator/sd-evaluator.service.ts` — NEW

Hai methods chính:

**`enqueueEvaluation(sessionId)`:**
- Guard: session.phase !== 'COMPLETED' → throw BadRequestException
- Guard: session.evaluationResult != null → throw BadRequestException('Already evaluated')
- `await this.sdEvaluationQueue.add(SdEvaluationJobName.EVALUATE_SESSION, { sessionId }, { jobId: sessionId, attempts: 1 })`
- Return `{ queued: true }`

**`getStatus(sessionId)`:**
1. Load session (không cần relations)
2. Nếu `session.evaluationResult != null` → return `{ status: 'completed', result: session.evaluationResult, progress: null }`
3. Ngược lại: `const job = await this.sdEvaluationQueue.getJob(sessionId)`
4. Nếu job null → return `{ status: 'idle', progress: null }`
5. Return `{ status: job.isCompleted() ? 'completed' : job.isFailed() ? 'failed' : 'processing', progress: job.progress ?? null }`

**`processEvaluation(sessionId, job)`** — gọi từ worker:

```typescript
async processEvaluation(sessionId: string, job: Job): Promise<void> {
  const session = await this.sdSessionRepo.findOne({
    where: { id: sessionId },
    relations: ['problem'],
  });

  const completedDimensions: DimensionResult[] = [];

  // ── Dimension 1: Component Coverage (rule-based, instant) ──
  const coverage = this._computeComponentCoverage(session);
  completedDimensions.push({ dimension: 'componentCoverage', ...coverage });
  await job.updateProgress({ completedDimensions: [...completedDimensions] });

  // ── Dimensions 2–5: AI calls in parallel ──
  const hasCurveball = session.curveballArchitectureSnapshot != null;

  await Promise.allSettled([
    this._evaluateScalability(session)
      .then(r => { completedDimensions.push(r); return job.updateProgress({ completedDimensions: [...completedDimensions] }); })
      .catch(() => { completedDimensions.push({ dimension: 'scalabilityFit', score: 0, maxScore: 20, data: { error: 'Evaluation failed' } }); }),

    this._evaluateTradeoff(session)
      .then(r => { completedDimensions.push(r); return job.updateProgress({ completedDimensions: [...completedDimensions] }); })
      .catch(() => { completedDimensions.push({ dimension: 'tradeoffArticulation', score: 0, maxScore: 20, data: { error: 'Evaluation failed' } }); }),

    this._evaluateCommunication(session)
      .then(r => { completedDimensions.push(r); return job.updateProgress({ completedDimensions: [...completedDimensions] }); })
      .catch(() => { completedDimensions.push({ dimension: 'communicationClarity', score: 0, maxScore: 15, data: { error: 'Evaluation failed' } }); }),

    hasCurveball
      ? this._evaluateCurveball(session)
          .then(r => { completedDimensions.push(r); return job.updateProgress({ completedDimensions: [...completedDimensions] }); })
          .catch(() => { completedDimensions.push({ dimension: 'curveballAdaptation', score: 0, maxScore: 20, data: { error: 'Evaluation failed' } }); })
      : Promise.resolve(),
  ]);

  // ── Final score ──
  const evaluationResult = this._computeFinalScore(completedDimensions, session.hintsUsed, hasCurveball);
  await this.sdSessionRepo.update(sessionId, { evaluationResult });
}
```

**`_computeComponentCoverage(session)`** — rule-based:
- `drawnTypes = new Set(session.architectureJSON?.nodes?.map(n => n.type?.toLowerCase()) ?? [])`
- `matched = problem.expectedComponents.filter(c => drawnTypes.has(c.toLowerCase()))`
- `score = Math.round(matched.length / problem.expectedComponents.length * 25)` (nếu expectedComponents rỗng → score = 0)
- Return `{ dimension: 'componentCoverage', score, maxScore: 25, data: { missingComponents } }`

**`_computeFinalScore(completedDimensions, hintsUsed, hasCurveball)`:**
- Nếu `!hasCurveball`: redistribute maxScore (25→31, 20→25, 20→25, 15→19); scale score tương ứng: `scaledScore = Math.round(score / maxScore * newMax)`
- `rawScore = sum(all scaled scores)`
- `penalty = Math.min(hintsUsed * 5, 15)`
- `finalScore = Math.max(rawScore - penalty, 0)`
- Grade band: `>= 90 → Exceptional | >= 75 → Strong | >= 60 → Good | >= 45 → Developing | else → Needs Work`
- Return full `EvaluationResult` object

**AI helper methods** — mỗi method: gọi `groqService.generateContent` với `FAST_MODEL`, parse JSON, trả về `DimensionResult`. Timeout 30s mỗi call (wrap Promise.race với setTimeout reject). JSON parse fail → score = 0.

### 4. `server/src/jobs/workers/sd-evaluation.worker.ts` — NEW

```typescript
@Processor(SD_EVALUATION_QUEUE)
export class SdEvaluationWorker extends WorkerHost {
  constructor(private readonly sdEvaluatorService: SDEvaluatorService) { super(); }

  async process(job: Job<{ sessionId: string }>): Promise<void> {
    switch (job.name) {
      case SdEvaluationJobName.EVALUATE_SESSION:
        return this.sdEvaluatorService.processEvaluation(job.data.sessionId, job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
```

### 5. `server/src/sd-evaluator/sd-evaluator.controller.ts` — NEW

```typescript
@Post(':id/evaluate')
@UseGuards(JwtAuthGuard)
async enqueue(@Param('id') id: string) {
  return this.sdEvaluatorService.enqueueEvaluation(id);
}

@Get(':id/evaluate/status')
@UseGuards(JwtAuthGuard)
async status(@Param('id') id: string) {
  return this.sdEvaluatorService.getStatus(id);
}
```

### 6. `server/src/sd-evaluator/sd-evaluator.module.ts` — NEW

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([SDSession]),
    BullModule.registerQueueAsync({ name: SD_EVALUATION_QUEUE }),
  ],
  controllers: [SDEvaluatorController],
  providers: [SDEvaluatorService],
  exports: [SDEvaluatorService],
})
export class SDEvaluatorModule {}
```

### 7. `server/src/jobs/jobs.module.ts` — MODIFY

Thêm `SD_EVALUATION_QUEUE` vào `BullModule.registerQueueAsync`, thêm `SdEvaluationWorker` vào providers, thêm `SDEvaluatorModule` vào imports.

### 8. `server/src/sd-session/entities/sd-session.entity.ts` — MODIFY

Thêm:
```typescript
@Column({ type: 'jsonb', nullable: true })
evaluationResult!: Record<string, unknown> | null;
```

### 9. `server/src/app.module.ts` — MODIFY

Thêm `SDEvaluatorModule` vào imports array (sau `SDInterviewerModule`).

---

## Story 2 — Frontend (5 files)

### 10. `client/apps/web/src/store/slices/sdEvaluatorSlice.js` — NEW

State:
```javascript
{
  status: 'idle' | 'processing' | 'completed' | 'failed',
  completedDimensions: [],  // array tăng dần khi poll về progress mới
  finalScore: null,
  hintPenalty: 0,
  gradeBand: null,
  error: null,
}
```

Actions: `evaluationQueued`, `progressPolled({ completedDimensions })`, `evaluationCompleted({ finalScore, hintPenalty, gradeBand, completedDimensions })`, `evaluationFailed(error)`, `evaluationReset`.

### 11. `client/apps/web/src/store/sagas/sdEvaluatorSaga.js` — NEW

**`_handleTriggerEvaluation({ payload: sessionId })`:**
1. Gọi `POST /sd-sessions/:id/evaluate`
2. `yield put(evaluationQueued())`
3. Poll loop (max 30 lần × 2s = 60s):
   - `yield delay(2000)`
   - Gọi `GET /sd-sessions/:id/evaluate/status`
   - Nếu `status === 'processing'` và có progress → `yield put(progressPolled(response.progress))`
   - Nếu `status === 'completed'` → `yield put(evaluationCompleted(response.result))` → break
   - Nếu `status === 'failed'` → `yield put(evaluationFailed(...))` → break
4. Nếu hết 30 lần mà chưa done → `yield put(evaluationFailed('Timeout'))`

Watch: `takeLatest(triggerEvaluation.type, _handleTriggerEvaluation)`

### 12. `client/apps/web/src/store/sagas/sdInterviewerSaga.js` — MODIFY

Tại lines 215–219, thêm else branch:
```javascript
if (event.meta.phase !== 'COMPLETED') {
  yield put(startSessionRequest());
} else {
  yield put(triggerEvaluation(sessionId));
}
```

### 13. `client/apps/web/src/components/sd-room/EvaluationLoadingOverlay.jsx` — NEW

Hiển thị khi `sdEvaluator.status === 'processing' || 'completed'`. Render danh sách 5 dimensions (hoặc 4 nếu không có curveball):

- **Chưa có trong `completedDimensions`:** icon chờ + label mờ
- **Có trong `completedDimensions`:** checkmark + label + score (vd: "19 / 25")
- **Status `completed`:** hiển thị final score + grade band + nút "Xem kết quả chi tiết" (navigation sang ScoringPage xử lý ở Epic 5)

Label map:
```
componentCoverage → "Component Coverage"
scalabilityFit → "Scalability Fit"
tradeoffArticulation → "Trade-off Articulation"
communicationClarity → "Communication Clarity"
curveballAdaptation → "Curveball Adaptation"
```

### 14. `client/apps/web/src/components/sd-room/SDRoomPage.jsx` — MODIFY

Render `<EvaluationLoadingOverlay />` khi `sdEvaluator.status !== 'idle'` — overlay full-screen trên canvas/chat.

---

## API Contract

```
POST /sd-sessions/:id/evaluate
Authorization: Bearer <jwt>
Body: (none)
Response 202: { "queued": true }
Response 400: session chưa COMPLETED, hoặc đã evaluate rồi
Response 404: session not found

GET /sd-sessions/:id/evaluate/status
Authorization: Bearer <jwt>
Response 200:
  // Đang xử lý:
  { "status": "processing", "progress": { "completedDimensions": [...] } }
  // Hoàn thành:
  { "status": "completed", "result": { "finalScore": 68, "hintPenalty": 5, "gradeBand": "Good", "dimensions": {...} } }
  // Chưa bắt đầu:
  { "status": "idle", "progress": null }
  // Lỗi:
  { "status": "failed", "progress": null }
```

---

## Stability Notes

**Timeout mỗi AI call:** 30s — wrap `groqService.generateContent()` trong `Promise.race([call, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 30_000))])`. Timeout → dimension score = 0, `data.error = 'Evaluation timeout'`.

**Re-evaluation guard:** `evaluationResult != null` → 400. `phase !== 'COMPLETED'` → 400.

**Job attempts:** `attempts: 1` — không retry toàn bộ job nếu fail. Từng dimension đã tự handle error gracefully (score = 0). Khác với behavioral (attempts: 3) vì behavioral là one-shot AI call; SD evaluation partial failure vẫn cho kết quả có giá trị.

**jobId = sessionId:** cho phép `queue.getJob(sessionId)` không cần lưu jobId riêng.

**BullMQ job TTL:** job data tồn tại trong Redis đến khi bị remove. Sau khi `evaluationResult` được lưu vào SDSession, status endpoint ưu tiên đọc từ DB (không cần job nữa) — job cũ trong Redis không gây vấn đề.

**FE poll timeout:** 30 lần × 2s = 60s. Nếu hết → `evaluationFailed('Timeout')` — FE hiển thị error state với nút retry.

**JSON parse fail từ AI:** `JSON.parse(text.trim())` trong try/catch → score = 0, `data.error = 'Invalid AI response'`.

**Model:** `FAST_MODEL` (llama-3.1-8b-instant) cho tất cả 4 AI dimensions — structured JSON output, không cần MAIN_MODEL.

---

## Not Changing

- `SDInterviewerService` / `SDInterviewerController` — không đụng
- `SDSessionController` / `SDSessionService` — không đụng
- `SDProblem` entity — không đụng
- `BehavioralScoringWorker`, `DsaDebriefWorker` — không đụng
- `transcriptHistory` format — evaluation chỉ đọc

---

## File Count

| Story | Files | Count |
|---|---|---|
| Story 1 (BE) | jobs.constants.ts, evaluation-prompts.ts, sd-evaluator.service.ts, sd-evaluation.worker.ts, sd-evaluator.controller.ts, sd-evaluator.module.ts, jobs.module.ts, sd-session.entity.ts, app.module.ts | 9 / 10 |
| Story 2 (FE) | sdEvaluatorSlice.js, sdEvaluatorSaga.js, sdInterviewerSaga.js, EvaluationLoadingOverlay.jsx, SDRoomPage.jsx | 5 / 10 |
