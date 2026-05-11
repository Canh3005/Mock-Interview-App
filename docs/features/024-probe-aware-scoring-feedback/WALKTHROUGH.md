## Entry Points

- `POST /question-bank/probes/:probeId/practice-attempts`: candidate nộp câu trả lời một-câu. Sau khi lưu attempt, backend enqueue job `score-question-practice-attempt`.
- Queue `question-practice-scoring`: worker xử lý scoring bất đồng bộ theo `attemptId`.
- `GET /question-bank/practice-attempts/:attemptId`: FE polling trạng thái và result của attempt thuộc candidate hiện tại.
- `POST /question-bank/practice-attempts/:attemptId/retry-feedback`: candidate retry scoring trên cùng câu trả lời khi feedback lỗi hoặc processing stale.
- UI route question detail: `QuestionProbeDetailPage` hiển thị trạng thái feedback/result ngay trong trang detail.

## Use-Case Purpose

Feature này biến attempt `pending_feedback` từ feature 21 thành feedback có căn cứ theo probe snapshot đã lưu. Candidate không cần gửi lại câu trả lời để xem kết quả; FE polling status/result cho đến khi backend trả `feedback_ready` hoặc `feedback_failed`.

## User/API Flow

1. Candidate gửi answer từ question detail.
2. `QuestionPracticeAttemptService` lưu attempt và gọi `QuestionPracticeFeedbackService.enqueueScoring`.
3. `QuestionPracticeScoringWorker` nhận job, reload attempt từ DB và gọi `QuestionPracticeScoringService.processAttempt`.
4. Scoring service chuyển attempt sang `processing`, pre-check câu trả lời quá ngắn, hoặc gọi LLM structured extraction khi đủ dữ liệu.
5. Backend validate evidence quote trên `answerText` gốc, downgrade signal thiếu evidence, aggregate `overallBand`, sinh narrative user-facing và lưu `feedbackResult`.
6. FE polling `GET /question-bank/practice-attempts/:attemptId` bằng Redux-Saga, dừng khi terminal state.
7. Question detail render scorecard gồm summary, band, confidence, signal coverage, evidence quote, red flags và suggestions. Raw rubric/scoring hints không render ra candidate.
8. Nếu status là `feedback_failed`, candidate bấm retry để enqueue lại scoring trên cùng attempt.

## Code Path

- Backend entity/state:
  - `server/src/question-bank/entities/question-practice-attempt.entity.ts`
  - `server/src/question-bank/question-practice-scoring.types.ts`
- Backend submit/status/retry:
  - `server/src/question-bank/question-practice-attempt.service.ts`
  - `server/src/question-bank/question-practice-feedback.service.ts`
  - `server/src/question-bank/question-bank.controller.ts`
- Backend scoring:
  - `server/src/jobs/workers/question-practice-scoring.worker.ts`
  - `server/src/question-bank/question-practice-scoring.service.ts`
  - `server/src/question-bank/question-practice-scoring-result.service.ts`
  - `server/src/ai/groq.service.ts`
- Frontend:
  - `client/apps/web/src/api/questionBank.api.js`
  - `client/apps/web/src/store/slices/questionBankSlice.js`
  - `client/apps/web/src/store/sagas/questionBankSaga.js`
  - `client/apps/web/src/components/question-bank/QuestionProbeDetailPage.jsx`
  - `client/apps/web/src/components/question-bank/QuestionPracticeFeedbackPanel.jsx`
  - `client/apps/web/src/i18n/locales/en.json`
  - `client/apps/web/src/i18n/locales/vi.json`
  - `client/apps/web/src/i18n/locales/ja.json`

## Guardrails & Failure

- Queue payload chỉ chứa `attemptId`; worker reload answer/rubric từ DB.
- `jobId = attemptId` để tránh enqueue trùng.
- Candidate chỉ đọc/retry attempt của chính mình.
- Answer quá ngắn hoặc thiếu dữ liệu tạo `feedback_ready` với `overallBand = insufficient_evidence`, không dùng `feedback_failed`.
- LLM output phải parse đúng schema; quote không match `answerText` gốc bị loại và signal bị downgrade.
- Narrative fallback không làm fail scoring nếu structured result đã hợp lệ.
- `feedback_failed` dùng cho queue/AI/schema/system failure và UI cho retry trên cùng answer.
- FE polling tự dừng khi attempt đổi khác hoặc nhận `feedback_ready`/`feedback_failed`.
