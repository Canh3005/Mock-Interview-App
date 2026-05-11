## Overview

Feature 24 dùng `QuestionPracticeAttempt` của feature 21 làm nguồn truth cho câu trả lời một-câu, xử lý scoring bất đồng bộ qua BullMQ và lưu scorecard có evidence theo probe snapshot tại lúc submit. Core scoring chọn hướng `LLM structured extraction + deterministic validation/aggregation`, trong đó embedding chỉ là lớp chọn context cho answer/transcript dài, không thay thế LLM đánh giá signal coverage.

## Business Alignment

Kiến trúc này bảo vệ các yêu cầu chính trong `BA.md`:

- Feedback bám đúng probe đã luyện vì scoring đọc `probeSnapshot` đã khóa trên attempt, không đọc rubric mới nhất có thể đã đổi.
- Candidate thấy trạng thái rõ ràng: `pending_feedback`, `processing`, `feedback_ready`, `feedback_failed`.
- Signal chỉ được đánh `covered` khi có evidence quote tồn tại thật trong câu trả lời/transcript.
- Raw `expectedSignals`, `redFlags`, `scoringHints` và prompt nội bộ không đi ra FE; FE chỉ nhận scorecard đã diễn giải.
- Lỗi hệ thống khác với thiếu evidence: answer quá ngắn vẫn trả `feedback_ready` với band `insufficient_evidence`; chỉ timeout/schema fail/queue fail sau retry mới là `feedback_failed`.

## Architecture Decisions

### Decision: Processing model cho scoring

**Option A - Chấm đồng bộ trong request submit:** `POST practice-attempts` gọi AI và trả scorecard ngay.
- Pro: FE nhận feedback nhanh trong một request nếu AI ổn định.
- Con: dễ timeout, khó retry, trộn scope feature 21 và 24, không phù hợp attempt state contract đã chốt ở feature 21.

**Option B - Async job qua BullMQ:** submit tạo attempt `pending_feedback`, enqueue job theo `attemptId`, worker chuyển `processing` rồi lưu result.
- Pro: khớp pattern BullMQ hiện có, retry/timeout rõ, không làm request submit phụ thuộc AI latency.
- Con: cần status/result endpoint và FE polling để candidate thấy kết quả khi job hoàn tất.

**Chọn: Option B** - feature hiện có đã dùng BullMQ cho scoring/debrief, và BA yêu cầu candidate thấy trạng thái xử lý/thất bại/retry.

### Decision: Result delivery về FE

**Option A - FE polling qua status/result endpoint:** question detail gọi `GET practice-attempts/:attemptId` theo interval ngắn khi attempt còn `pending_feedback` hoặc `processing`, dừng khi `feedback_ready` hoặc `feedback_failed`.
- Pro: đơn giản, khớp async job hiện tại, đủ cho single-question practice vì feedback không cần stream token-by-token.
- Con: có thêm request lặp trong thời gian chờ.

**Option B - SSE/WebSocket push:** backend đẩy state transition và result về client.
- Pro: realtime hơn, ít request polling khi có nhiều session đang mở.
- Con: tăng transport/lifecycle complexity, chưa cần cho trang detail một-câu, phải xử lý reconnect/auth/channel cleanup.

**Option C - Refresh thủ công:** sau submit chỉ hiện pending, candidate tự bấm refresh/check result.
- Pro: ít code FE nhất.
- Con: UX kém và không đáp ứng tốt yêu cầu candidate xem feedback ngay trong trang detail.

**Chọn: Option A** - dùng `GET` status/result endpoint + FE polling trong question detail. Polling dừng khi có trạng thái cuối; retry feedback dùng endpoint riêng.

### Decision: Core evaluator

**Option A - Pure LLM scoring:** gửi answer + rubric, để model trả scorecard cuối.
- Pro: ít code nghiệp vụ, nhanh prototype.
- Con: dễ overconfident, khó đảm bảo evidence thật, score khó test.

**Option B - Rule/keyword scoring:** backend tự match keyword/rule.
- Pro: deterministic, dễ unit test.
- Con: không đủ hiểu nhiều cách diễn đạt behavioral answer; không phân biệt nói chung chung với evidence cụ thể.

**Option C - LLM structured extraction + deterministic aggregation:** LLM chỉ phân loại từng signal và trích evidence; backend validate quote, downgrade status, tính band/score và chỉ cho narrative dùng structured result.
- Pro: giữ semantic judgment của LLM nhưng kiểm soát evidence, confidence, scoring rule và testability ở backend.
- Con: nhiều contract/schema hơn pure LLM.

**Chọn: Option C** - đây là core scoring chính. Embedding, verifier và model tier routing là lớp bổ sung, không thay đổi ownership: LLM hiểu ngữ nghĩa; backend kiểm soát tính đúng và state transition.

### Decision: Context selection cho answer dài

**Option A - Luôn gửi full answer/transcript:** đơn giản, ít risk retrieval miss.
- Pro: LLM thấy toàn bộ context.
- Con: với transcript dài sẽ tốn token, chậm và dễ bị nhiễu.

**Option B - Embedding pre-selection chỉ khi vượt ngưỡng:** chunk theo đoạn ngữ nghĩa, lấy top-K chunks per signal, kèm neighbor chunks khi cần; fallback full answer nếu answer không dài hoặc similarity thấp.
- Pro: giảm context, tăng tập trung cho transcript dài, vẫn tránh miss với fallback.
- Con: cần chunking/retrieval guardrail và cache embedding probe nếu bật.

**Chọn: Option B** - chỉ bật cho answer/transcript dài. Với answer ngắn/vừa, full answer chính xác hơn vì không có nguy cơ retrieval bỏ sót evidence.

### Decision: Result storage

**Option A - Lưu result trực tiếp trên `QuestionPracticeAttempt`:** attempt có một feedback result hiện hành, status/timestamp/error/scoring version đi cùng attempt.
- Pro: đúng mô hình một answer có một scorecard hiện hành, đọc detail đơn giản, ít join.
- Con: nếu sau này cần audit nhiều lần chấm, phải thêm log table.

**Option B - Tạo entity feedback result riêng:** attempt giữ status, mỗi scoring run là một record.
- Pro: audit multi-run tốt hơn.
- Con: tăng scope data model cho MVP; BA chưa yêu cầu lịch sử nhiều lần chấm cùng một answer.

**Chọn: Option A** - dùng additive fields trên attempt cho result hiện hành. Nếu analytics/audit sau này cần nhiều run, thêm bảng scoring run theo feature riêng, không làm phức tạp feature 24.

## System Boundaries

- `question-bank` owns `QuestionPracticeAttempt`, probe snapshot, attempt state, candidate result/retry API và feedback result cho single-question practice.
- Jobs boundary owns BullMQ queue/worker cho `score-question-practice-attempt`, nhận `attemptId` làm job data, không truyền answer/rubric trong queue payload.
- AI boundary owns model calls, structured extraction schema, optional verifier và narrative generation. AI không được tự quyết score cuối hoặc tự lưu DB.
- Backend scoring service owns pre-check, evidence validation, deterministic aggregation, downgrade reason và final result shape.
- FE `questionBank` state owns polling/result display trong question detail. FE không dựng lại score từ raw rubric và không render rubric nội bộ.
- Existing behavioral session scoring không bị thay thế trong feature này. Có thể tái dùng service/pattern chung nếu phù hợp, nhưng contract một-câu của question bank phải độc lập.

## Contracts

### Queue contract

Job mới trong BullMQ:

```ts
queue: 'question-practice-scoring'
jobName: 'score-question-practice-attempt'
data: { attemptId: string }
jobId: attemptId
```

Guardrail:
- `jobId = attemptId` để enqueue retry mạng không tạo nhiều job song song cho cùng attempt.
- Worker luôn reload attempt từ DB, kiểm tra candidate ownership không nằm trong job payload.
- Job chỉ xử lý attempt ở `pending_feedback`, `processing` stale hoặc `feedback_failed` khi retry hợp lệ; không chấm lại attempt `feedback_ready` trừ khi có endpoint reprocess nội bộ sau này.

### Candidate API

Feature 21 đã có:

| Method | Path | Auth | Ý nghĩa |
| --- | --- | --- | --- |
| `POST` | `/question-bank/probes/:probeId/practice-attempts` | Candidate JWT | Tạo hoặc trả lại attempt một-câu |

Feature 24 bổ sung:

| Method | Path | Auth | Ý nghĩa |
| --- | --- | --- | --- |
| `GET` | `/question-bank/practice-attempts/:attemptId` | Candidate JWT | Đọc trạng thái và feedback result của attempt thuộc candidate hiện tại |
| `POST` | `/question-bank/practice-attempts/:attemptId/retry-feedback` | Candidate JWT | Enqueue lại scoring cho attempt `feedback_failed` hoặc `processing` đã timeout/stale |

Response đọc attempt:

```ts
interface QuestionPracticeAttemptFeedbackResponse {
  attemptId: string;
  probeId: string;
  status: 'pending_feedback' | 'processing' | 'feedback_ready' | 'feedback_failed';
  answerInputType: 'text' | 'voice';
  displayLocale: 'vi' | 'en' | 'ja';
  resolvedQuestionLocale: 'vi' | 'en' | 'ja';
  feedbackLocale: 'vi' | 'en' | 'ja';
  submittedAt: string;
  processingStartedAt?: string | null;
  feedbackReadyAt?: string | null;
  failureCode?: 'ai_timeout' | 'invalid_ai_output' | 'queue_failed' | 'system_error' | null;
  retryable: boolean;
  result?: ProbeScoringResult | null;
}
```

`result` chỉ có khi `status = feedback_ready`. Với `feedback_failed`, response có `failureCode`, `retryable` và user-facing message key; không trả raw exception.

### Scoring result contract

```ts
type SignalStatus = 'covered' | 'unclear' | 'missing';
type ClaimVerification = 'verified' | 'not_verified' | 'inflated_risk';
type OverallBand =
  | 'strong'
  | 'solid'
  | 'needs_work'
  | 'insufficient_evidence';

interface ProbeScoringResult {
  scoringVersion: string;
  overallBand: OverallBand;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  signalResults: Array<{
    key: string;
    label: string;
    status: SignalStatus;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  redFlags: Array<{
    key: string;
    label: string;
    present: boolean;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  cvClaimResults?: Array<{
    claim: string;
    verification: ClaimVerification;
    evidenceQuotes: string[];
    feedback: string;
  }>;
  improvementSuggestions: string[];
}
```

Contract này là public boundary cho FE. Không thêm `expectedSignals`, `scoringHints`, raw prompt, raw model response hoặc similarity score vào response candidate.

### AI extraction contract

Structured extraction phải có schema bắt buộc ở API layer nếu provider hỗ trợ `tool_use`/structured output. Nếu wrapper hiện tại chưa hỗ trợ, Dev cần mở rộng AI adapter trước khi dùng cho feature này; fallback parse JSON text chỉ được dùng kèm retry và schema validation chặt.

Extraction input được phép gửi:
- `answerText` hoặc transcript đã chuyển thành text.
- `probeSnapshot.canonical` cần cho ngữ cảnh.
- `probeSnapshot.rubric.expectedSignals`, `redFlags`, `scoringHints`.
- `feedbackLocale` cho output narrative, nhưng extraction status không phụ thuộc locale.

Extraction output nội bộ phải gồm:
- signal key/status/evidence/rationale/confidence.
- red flag present/evidence.
- CV claim verification nếu `probeSnapshot.canonical.type = cv_deep_dive` hoặc type tương đương trong taxonomy.
- confidence tổng: `high`, `medium`, `low`.

LLM không được trả score cuối. Score/band cuối do backend aggregator tính từ structured extraction đã validate.

### Scoring pipeline contract

Dev phải implement core scoring theo Option 3 đã khuyến nghị trong `docs/probe-aware-scoring-technical-options.md`. Luồng chuẩn cho một `attemptId`:

1. Worker nhận job `score-question-practice-attempt`, reload attempt từ DB và chuyển state sang `processing` nếu state hợp lệ.
2. Pre-check deterministic trước AI:
   - answer rỗng, quá ngắn hoặc không đủ dữ liệu đánh giá đầy đủ tạo `feedback_ready` với `overallBand = insufficient_evidence`.
   - lỗi thiếu evidence nghiệp vụ không được chuyển thành `feedback_failed`.
3. Nếu answer/transcript vượt ngưỡng dài, chạy embedding pre-selection:
   - chunk theo đoạn ngữ nghĩa.
   - embed chunks và signal descriptions.
   - lấy top-K chunks per signal, kèm neighbor chunks khi cần.
   - fallback full answer khi answer không quá dài, similarity thấp hoặc retrieval không đủ coverage.
4. Gọi LLM structured extraction bằng model chính đủ mạnh cho semantic judgment:
   - classify từng expected signal: `covered`, `unclear`, `missing`.
   - `covered` và `unclear` phải có evidence quote.
   - detect red flags với evidence.
   - verify CV claims khi probe type là CV deep-dive.
   - trả confidence `high`, `medium`, hoặc `low`.
5. Backend validate extraction output:
   - schema hợp lệ.
   - evidence quote phải tồn tại trong `answerText` gốc.
   - quote không match answer gốc thì reject quote.
   - `covered` không còn valid quote thì downgrade.
   - evidence partial/ambiguous thì status là `unclear`.
6. Confidence-based verifier:
   - bỏ qua verifier khi confidence `high`, không có conflict và không phải CV deep-dive.
   - chạy verifier khi confidence `low`, có signal conflict/mâu thuẫn hoặc CV deep-dive.
   - verifier chỉ được giữ nguyên hoặc downgrade result; không được thêm fact mới không có trong answer.
7. Deterministic aggregator tính `overallBand`, confidence cuối, summary dimensions và penalty từ red flags trên structured result đã validate.
8. LLM narrative dùng model nhẹ để viết feedback user-facing theo `feedbackLocale`, chỉ dựa trên structured result; không thêm fact hoặc quote mới.
9. Save result:
   - thành công hoặc insufficient evidence: `feedback_ready`.
   - AI timeout, invalid structured output sau retry, queue/system failure: `feedback_failed` với `failureCode`.

Embedding không được dùng như evaluator độc lập. Pure LLM scorecard và keyword/rule scoring không được dùng làm core evaluator cho feature này.

## Data & State

`QuestionPracticeAttempt` giữ source of truth cho lifecycle. Feature 24 cần thêm dữ liệu theo hướng additive:

- `status`: dùng state hiện có.
- `feedbackResult`: JSONB nullable theo `ProbeScoringResult`.
- `failureCode`: nullable, chỉ dùng khi `feedback_failed`.
- `processingStartedAt`, `feedbackReadyAt`, `feedbackFailedAt`: nullable.
- `scoringVersion`: string để biết rule/model contract nào tạo result.
- `retryCount`: số lần enqueue/xử lý lại feedback.

State transition hợp lệ:

```text
pending_feedback -> processing -> feedback_ready
pending_feedback -> processing -> feedback_failed
feedback_failed -> pending_feedback khi candidate retry enqueue lại job
pending_feedback -> processing khi worker bắt đầu xử lý retry job
processing stale -> processing khi worker retry hợp lệ
feedback_ready -> không đổi trong candidate retry path
```

Consistency/idempotency:
- Submit idempotent của feature 21 vẫn giữ `(candidateId, clientSubmissionId)`.
- Scoring job idempotent theo `attemptId`; worker phải kiểm tra state trước khi gọi AI.
- Nếu worker crash sau khi gọi AI nhưng trước khi save, retry được phép chạy lại vì result cuối cùng ghi đè theo `attemptId` và `scoringVersion`.
- Evidence validation luôn chạy trên `answerText` gốc của attempt, không chỉ chạy trên chunk đã pre-select.

## Quality & Stability Notes

- Pre-check deterministic trước AI: answer rỗng/quá ngắn/language unsupported hoặc không đủ dữ liệu phải tạo `feedback_ready` với `overallBand = insufficient_evidence`, không chuyển `feedback_failed`.
- Main extraction dùng model đủ mạnh cho semantic judgment; model nhỏ chỉ dùng cho pre-check hoặc narrative đơn giản nếu không ảnh hưởng accuracy.
- Embedding pre-selection chỉ bật khi answer vượt ngưỡng độ dài; chunk theo đoạn ngữ nghĩa, không chunk từng câu đơn lẻ. Khi similarity thấp hoặc số chunk không đủ coverage, fallback full answer.
- Backend validate bắt buộc: quote phải match answer/transcript gốc; `covered` không có quote thì downgrade; quote mơ hồ thì `unclear`; không evidence thì `missing`.
- Verifier pass chỉ chạy khi confidence thấp, có conflict/mâu thuẫn, hoặc CV deep-dive. Không chạy verifier mặc định cho mọi request.
- Timeout budget phải tách theo bước: enqueue/DB ngắn; AI extraction và verifier có timeout riêng; quá timeout sau retry thì `feedback_failed`.
- Observability: log `attemptId`, `probeId`, `candidateId`, `scoringVersion`, model id, status transition, downgrade reason, failureCode và latency theo bước. Không log nguyên answer, raw prompt hoặc raw rubric trong production log.
- Privacy: chỉ gửi sang AI dữ liệu cần cho scoring attempt đó. Không gửi CV/JD/session context khác nếu không có trong attempt/probe snapshot hoặc không cần cho feature 24.
- Rollback: có thể disable enqueue/scoring bằng feature flag hoặc env config; attempt mới vẫn tạo được `pending_feedback`, FE hiển thị đang xử lý/thử lại thay vì mất answer.

## UX Boundary

Primary production workflow là candidate xem feedback trong trang question detail sau khi đã submit answer. FE cần mở rộng vùng kết quả trong main content, không nhét scorecard vào cột nhập câu trả lời nếu hẹp.

UI phải có:
- Loading/pending state cho `pending_feedback` và `processing`; FE polling `GET practice-attempts/:attemptId` theo interval ngắn và dừng khi `feedback_ready` hoặc `feedback_failed`.
- Ready state hiển thị summary, overall band, confidence user-facing, signal coverage đã diễn giải, evidence quote, red flags đã diễn giải và improvement suggestions.
- Failed state hiển thị lỗi xử lý và nút retry feedback trên cùng attempt; không bắt candidate gửi lại answer mới.
- New attempt vẫn là luồng trả lời lại riêng, tạo `clientSubmissionId` mới như feature 21.

UI không được:
- Hiển thị raw `expectedSignals`, `redFlags`, `scoringHints`, raw prompt, raw model response hoặc similarity/debug metadata.
- Dùng JSON/raw payload viewer làm scorecard candidate.
- Tự tính signal status hoặc score từ field nội bộ; FE chỉ render contract đã được backend diễn giải.

Tất cả text hiển thị phải đi qua i18n `en`, `vi`, `ja`; feedback nội dung do AI sinh theo `feedbackLocale`, còn chrome UI theo app locale hiện tại.

## Delivery Slices

Nên split thành 2 slice để review được và rollback rõ:

### Slice 1 - Backend scoring pipeline và contract

Outcome: attempt sau khi submit được enqueue, worker xử lý core scoring theo probe snapshot, lưu `feedbackResult`, expose read/retry API và state transition đúng.

Bao gồm boundary BE, queue, AI adapter/schema, scoring validator/aggregator, result storage và automated tests cho state transition, evidence downgrade, insufficient evidence và retry.

### Slice 2 - Question detail feedback experience

Outcome: candidate xem trạng thái/result/retry ngay trong trang detail của probe đã luyện, không thấy rubric nội bộ.

Bao gồm FE polling/API/saga/slice, scorecard UI, failed/retry state, i18n và mapping theo public response contract của Slice 1.

Không nên làm session/mock interview debrief tổng hợp trong feature này; chỉ giữ result theo probe/attempt làm input cho feature sau.

## Not Changing

- Không thay đổi cách chọn probe hoặc follow-up của feature 23.
- Không thay đổi curation/admin workflow của `QuestionProbe`.
- Không xây analytics dashboard hoặc quality loop.
- Không dùng scoring để quyết định tuyển dụng thật.
- Không lưu raw audio; feature này chỉ xử lý `answerText` hoặc transcript text đã có.
- Không thay thế behavioral session scoring hiện tại trong `behavioral` module.

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries, và quality guardrails.
