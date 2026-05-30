# 036 — SD Session Polish

> Mục tiêu: đưa system-design session lên mức hoàn thiện tương đương behavior-session.
> Hiện tại SD có đủ skeleton nhưng còn 1 gap kiến trúc nền tảng và 5 gap kỹ thuật làm cho session phụ thuộc LLM quá mức, scoring sai và AI coaching yếu.

---

## Gap 0 — Session orchestration đang phụ thuộc LLM quá nhiều (P0)

**Vấn đề:** SD session hiện để LLM nắm quá nhiều quyền điều phối: LLM tự quyết câu hỏi tiếp theo, tự signal `[PHASE_COMPLETE]`, tự quyết khi nào đủ để chuyển stage, và backend chỉ kiểm tra một số guard rất mỏng như elapsed time / exchange count. Cách này làm session thiếu ổn định: phase có thể chuyển quá sớm hoặc quá muộn, câu hỏi có thể lệch rubric, response có thể vô tình gợi ý đáp án, và behavior khó kiểm thử tự động.

**Nguyên tắc fix:** LLM chỉ được dùng để diễn đạt câu hỏi/feedback tự nhiên. Backend phải là nơi sở hữu state machine, transition rule, checklist coverage, question budget, constraint, và fallback.

**Fix cấp kiến trúc:**

- Thay cơ chế LLM append `[PHASE_COMPLETE]` bằng deterministic phase engine trong backend.
- Tách phase thành state/sub-state rõ ràng, ví dụ `CLARIFICATION`, `DESIGN_DRAWING`, `DESIGN_WALKTHROUGH`, `DEEP_DIVE`, `WRAP_UP`, `COMPLETED`.
- Mỗi transition phải dựa trên rule đo được: min/max time, user action rõ ràng (`Done Drawing`, `Ready to move on`), số turn tối thiểu, checklist coverage, canvas node/edge coverage, số probe đã hỏi/trả lời.
- Backend tạo `QuestionIntent` có cấu trúc trước khi gọi LLM: phase, mục tiêu câu hỏi, target component/constraint, forbidden hints, max length, language, và expected response shape.
- LLM chỉ render `QuestionIntent` thành câu hỏi tự nhiên; output phải qua validator trước khi stream cho client. Nếu vi phạm rule, dùng template fallback.
- Silence trigger, hint, curveball, opening question và phase transition message phải đi qua cùng một planner/validator, không để mỗi endpoint prompt tự quyết hành vi riêng.

**Acceptance criteria:**

- Backend không còn dùng `[PHASE_COMPLETE]` từ LLM làm nguồn quyết định chuyển phase.
- Có một module/service chịu trách nhiệm duy nhất cho SD phase state machine và transition guard.
- Có contract rõ cho `QuestionIntent` và response validator để kiểm soát câu hỏi/response của LLM.
- FE chỉ render phase/sub-state từ backend và gửi explicit user actions; không tự suy đoán phase.
- Có test unit cho các transition chính: chưa đủ guard thì không chuyển, đủ guard thì chuyển mượt, timeout thì chuyển theo policy, session timeout thì `COMPLETED`.

**File dự kiến:** `server/src/sd-interviewer/sd-interviewer.service.ts` — loại bỏ `_processTransition` phụ thuộc AI signal  
**File dự kiến:** `server/src/sd-interviewer/*phase-orchestrator*.ts` — state machine + transition guard + question planner  
**File dự kiến:** `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` — chỉ còn nhiệm vụ render intent, không sở hữu phase policy  
**File dự kiến:** `client/apps/web/src/components/sd-room/*` — gửi explicit action và render sub-state nếu backend expose thêm metadata

---

## Gap 1 — AI không thấy connections (P0)

**Vấn đề:** `_buildSystemPrompt` chỉ pass `architectureNodeTypes: string[]` vào AI. Edges hoàn toàn bị bỏ qua. AI không thể hỏi về topology (Cache đặt ở đâu trong flow, Queue nối với gì).

**Fix:** Serialize edges thành human-readable string trước khi nhúng vào system prompt.

```
"APIGateway → LoadBalancer → ServiceA → Database"
"ServiceA → Cache (read-aside)"
"ServiceA → MessageQueue → WorkerB"
```

Thêm field `architectureEdgesSummary: string | null` vào `PromptParams` và `buildSystemPrompt`.

**File:** `server/src/sd-interviewer/sd-interviewer.service.ts` — hàm `_buildSystemPrompt`  
**File:** `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` — interface `PromptParams` + `baseContext`

---

## Gap 2 — Component coverage matching dựa string equality (P0)

**Vấn đề:** Coverage tính bằng `drawn.has(expectedType)` — nếu reference có `"messagequeue"` nhưng canvas gọi là `"kafka"`, coverage = 0. Dẫn đến curveball không trigger và scoring sai.

**Fix:** Tạo alias table trong problem entity hoặc service:

```typescript
const TYPE_ALIASES: Record<string, string[]> = {
  cache:        ['redis', 'memcached', 'elasticache'],
  messagequeue: ['kafka', 'rabbitmq', 'sqs', 'pubsub'],
  database:     ['mysql', 'postgresql', 'mongodb', 'dynamodb'],
  cdn:          ['cloudfront', 'cloudflare'],
  loadbalancer: ['nginx', 'haproxy', 'alb'],
};
```

Normalize cả drawn và expected qua alias table trước khi so sánh.

**File:** `server/src/sd-interviewer/sd-interviewer.service.ts` — hàm `_computeCoverage`  
**File:** `server/src/sd-evaluator/sd-evaluator.service.ts` — hàm `_computeComponentCoverage`  
(Dùng chung 1 util function, không duplicate logic)

---

## Gap 3 — `PHASE_MIN_MS` toàn bộ bằng 0 (P1)

**Vấn đề:** AI có thể signal `[PHASE_COMPLETE]` sau 30 giây nếu candidate đủ exchanges. Field `PHASE_MIN_MS` khai báo nhưng không có giá trị thực.

**Fix:**

```typescript
const PHASE_MIN_MS: Record<SDPhase, number> = {
  CLARIFICATION: 3 * 60 * 1000,   // 3 phút tối thiểu
  DESIGN:        4 * 60 * 1000,   // 4 phút tối thiểu
  DEEP_DIVE:     5 * 60 * 1000,   // 5 phút tối thiểu
  WRAP_UP:       2 * 60 * 1000,   // 2 phút tối thiểu
  COMPLETED:     0,
};
```

**File:** `server/src/sd-interviewer/sd-interviewer.service.ts` — constant `PHASE_MIN_MS`

---

## Gap 4 — Curveball evaluation bỏ qua verbal adaptation (P1)

**Vấn đề:** `_evaluateCurveball` chỉ diff node types (added/removed). Candidate thêm 1 node ngẫu nhiên → điểm cao. Candidate adapt bằng cách thay đổi connections hoặc giải thích miệng → điểm 0.

**Fix:** Thêm transcript post-curveball vào `buildCurveballPrompt`:

```typescript
// Lấy entries từ transcript sau thời điểm curveballInjectedAt
const postCurveballTranscript = session.transcriptHistory
  .filter(e => new Date(e.timestamp) >= session.curveballInjectedAt)
  .filter(e => e.role === 'user' || e.role === 'ai');
```

Cập nhật prompt để AI đánh giá cả verbal response lẫn diagram changes.

**File:** `server/src/sd-evaluator/sd-evaluator.service.ts` — hàm `_evaluateCurveball`  
**File:** `server/src/sd-evaluator/prompts/evaluation-prompts.ts` — hàm `buildCurveballPrompt`

---

## Gap 5 — Evaluation dùng 8B model (P1)

**Vấn đề:** `FAST_MODEL = 'llama-3.1-8b-instant'` dùng cho scoring Scalability, Trade-off, Communication, Curveball. Model 8B với 512 token output không đủ năng lực lý luận kỹ thuật phức tạp.

**Fix:**

```typescript
const EVAL_MODEL  = 'llama-3.3-70b-versatile';  // scoring dimensions
const FAST_MODEL  = 'llama-3.1-8b-instant';       // annotations + suggestions (low-stakes)
```

Dùng `EVAL_MODEL` cho 4 AI scoring dimensions, giữ `FAST_MODEL` cho `_annotateTranscript` và `_generateSuggestions`.

**File:** `server/src/sd-evaluator/sd-evaluator.service.ts` — constants + `_evaluateScalability`, `_evaluateTradeoff`, `_evaluateCommunication`, `_evaluateCurveball`

---

## Scope không làm trong task này

- Canvas component palette / drag-drop UI — cần FE spike riêng
- Real-time diagram annotation từ AI — cần WebSocket refactor
- Progress tracking cross-session — feature riêng (như 034 cho behavior)
- Voice support — combat mode scope

---

## Thứ tự implement

0. Gap 0 (deterministic orchestration) — foundation bắt buộc: backend sở hữu phase/state/question policy, LLM chỉ render
1. Gap 2 (alias table) — fix foundation, mọi thứ khác phụ thuộc coverage đúng
2. Gap 1 (edges vào prompt) — cải thiện AI coaching ngay lập tức
3. Gap 3 (PHASE_MIN_MS) — chỉ còn là guard phụ hoặc có thể thay bằng policy mới sau Gap 0
4. Gap 5 (upgrade eval model) — 2 dòng code, impact scoring lớn
5. Gap 4 (curveball verbal) — cần test kỹ nhất vì thay đổi prompt + data flow
