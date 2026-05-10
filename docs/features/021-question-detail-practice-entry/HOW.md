# HOW - Question Detail Practice Entry

## Overview

Feature này mở rộng bounded context `question-bank` từ browse list sang detail và submission một-câu. Kiến trúc cần giữ `QuestionProbe` là nguồn truth cho nội dung câu hỏi, tạo một `practice attempt` bền vững khi candidate gửi câu trả lời, và để feature `024-probe-aware-scoring-feedback` tiếp quản phần scoring/feedback sau đó.

## Business Alignment

BA yêu cầu candidate có một luồng ngắn: mở detail, đọc đúng nội dung public-facing theo ngôn ngữ, nhập hoặc ghi âm câu trả lời, chọn ngôn ngữ feedback và gửi cho AI. Kiến trúc phải bảo vệ các điểm sau:

- Detail chỉ dùng probe `active` và public projection; không lộ `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `sourceReferences` hoặc audit/admin metadata.
- Khi submit, backend tạo một `practice attempt` bất biến cho lần nộp đó: lưu probe đang xem, `resolvedLocale` đã hiển thị, feedback locale và câu trả lời candidate đã gửi để làm lịch sử luyện tập và ngữ cảnh chấm điểm. Candidate vẫn có thể luyện lại bằng attempt mới.
- Probe bị `retired` sau khi candidate mở detail thì không được nhận submit mới.
- Feature này chỉ tạo attempt và trạng thái chờ xử lý; scoring, evidence, scorecard và feedback chi tiết thuộc feature 24.
- Candidate đổi ngôn ngữ hiển thị khi đang soạn không được làm mất draft phía FE.

## Architecture Decisions

### Decision: Nguồn truth cho lượt luyện một-câu

**Option A - Tái sử dụng `BehavioralSession`:** biến câu detail thành một session behavioral ngắn có một lượt trả lời.
- Ưu điểm: có sẵn scoring queue và một số trạng thái behavioral.
- Nhược điểm: kéo theo state machine nhiều lượt, stage log, SSE/facilitator và khái niệm interview session không phù hợp BA; dễ làm feature này thành phiên phỏng vấn rút gọn.

**Option B - Tạo `QuestionPracticeAttempt` trong question-bank practice boundary:** attempt là bản ghi một-câu, gắn `candidateId`, `probeId`, answer, locale và trạng thái feedback.
- Ưu điểm: đúng scope một-câu, contract rõ cho feature 24, dễ retry/idempotency và không trộn với behavioral session nhiều lượt.
- Nhược điểm: cần entity/contract mới và feature 24 phải đọc nguồn attempt này.

**Chọn: Option B** - `BehavioralSession` vẫn dành cho flow phỏng vấn nhiều lượt. Single-question practice cần aggregate riêng để không lệch BA và không kéo state machine ngoài scope.

### Decision: Khóa context bằng snapshot hay chỉ lưu `probeId`

**Option A - Chỉ lưu `probeId`:** scoring feature 24 đọc probe hiện tại khi xử lý.
- Ưu điểm: ít dữ liệu lặp.
- Nhược điểm: nếu probe bị sửa, publish revision mới hoặc retire sau submit, feedback có thể chấm theo rubric khác với câu candidate đã xem.

**Option B - Lưu snapshot server-side tại lúc submit:** attempt lưu `probeId`, `probeCode`, `probeRevision`, nội dung public đã hiển thị, canonical/rubric fields cần cho scoring sau này và locale metadata.
- Ưu điểm: scoring ổn định, audit/debug dễ, không bị drift khi probe thay đổi sau submit.
- Nhược điểm: tăng kích thước bản ghi; cần guardrail không trả rubric snapshot ra FE.

**Chọn: Option B** - BA yêu cầu hệ thống giữ đúng probe đang xem làm ngữ cảnh bắt buộc. Snapshot là cách an toàn nhất để feature 24 chấm đúng context đã submit.

### Decision: Xử lý scoring đồng bộ hay bất đồng bộ

**Option A - Submit gọi AI/scoring đồng bộ và trả feedback ngay:** một request làm cả submit và scoring.
- Ưu điểm: ít bước ở FE.
- Nhược điểm: dễ timeout, khó retry, trộn scope với feature 24, và không phù hợp BA nói feature này chỉ khởi tạo lượt đánh giá.

**Option B - Submit tạo attempt `pending_feedback/submitted`, trả `attemptId`, feature 24 xử lý sau:** scoring chạy async qua queue/worker hoặc endpoint processor do feature 24 sở hữu.
- Ưu điểm: submit nhanh, retry rõ, tách boundary 021/024, có thể hiển thị trạng thái đang chờ xử lý.
- Nhược điểm: cần polling/status/result contract ở feature 24.

**Chọn: Option B** - 021 chỉ đảm bảo attempt bền vững và sẵn sàng cho scoring. 024 quyết định queue job, retry scoring và result display.

### Decision: Idempotency khi candidate retry submit

**Option A - Mỗi `POST` tạo một attempt mới:** đơn giản nhưng retry mạng có thể tạo trùng nhiều lượt giống nhau.

**Option B - FE gửi `clientSubmissionId`, backend enforce unique theo `(candidateId, clientSubmissionId)`:** retry cùng draft trả lại attempt đã tạo.

**Chọn: Option B** - phù hợp edge case “gửi lỗi có thể thử lại cùng câu trả lời” và tránh duplicate attempt do network retry.

## System Boundaries

Backend `question-bank` chịu trách nhiệm:

- Detail read API cho candidate, chỉ trả probe `active` với public projection đã resolve locale.
- Submit API tạo `QuestionPracticeAttempt`, re-check probe vẫn `active`, validate answer không rỗng, resolve locale một lần nữa và lưu snapshot.
- Idempotency bằng `clientSubmissionId`.
- Trạng thái attempt ban đầu và metadata đủ để feature 24 xử lý tiếp.
- Không gọi AI scoring đồng bộ trong feature 21.

Feature `024-probe-aware-scoring-feedback` chịu trách nhiệm:

- Đọc attempt đã submit/pending.
- Gọi AI/scoring theo expected signals, red flags, scoring hints và evidence.
- Cập nhật trạng thái `processing`, `feedback_ready`, `feedback_failed` hoặc contract tương đương.
- Trả scorecard/result display cho candidate.

Frontend candidate experience chịu trách nhiệm:

- Route detail từ card Question Bank hiện có.
- Giữ draft answer local trong detail page; đổi question display language không xóa draft.
- Render text answer entry trước; voice entry chỉ bật nếu app đã có capture/transcript surface hợp lệ.
- Dispatch submit qua saga/API layer, hiển thị trạng thái idle/drafting/submitting/submitted/error và cho retry cùng draft.
- Dùng `t()` và đủ `en`, `vi`, `ja`; tái sử dụng control/component có sẵn trong khu Question Bank khi phù hợp.

Auth boundary:

- Detail và submit nằm sau Candidate JWT giống `/question-bank/probes`.
- Admin API không được reuse làm candidate detail response.
- Candidate chỉ được đọc attempt của chính mình nếu feature 24 thêm status/result endpoint.

## Contracts

### Candidate Probe Detail API

| Method | Path | Auth | Hành vi |
| --- | --- | --- | --- |
| `GET` | `/question-bank/probes/:probeId` | Candidate JWT | Trả detail public của một probe `active` theo `locale` |

Query params:

| Param | Ý nghĩa |
| --- | --- |
| `locale` | Locale candidate muốn xem: `vi`, `en`, `ja`; backend resolve theo policy của feature 026 |
| `relatedLimit` | Optional, giới hạn số related questions; nếu không có thì dùng default nhỏ |

Response detail DTO tối thiểu:

```json
{
  "id": "uuid",
  "code": "backend-ownership-001",
  "title": "string",
  "displayQuestion": "string",
  "displayIntent": "string",
  "guidance": ["string"],
  "commonMistakes": ["string"],
  "difficulty": 3,
  "roleFamilies": ["backend"],
  "levels": ["mid"],
  "type": "behavioral",
  "competencies": ["ownership"],
  "techTags": ["incident-response"],
  "supportedLanguages": ["vi", "en"],
  "locale": "ja",
  "resolvedLocale": "en",
  "localeFallbackUsed": true,
  "publishedAt": "2026-05-10T00:00:00.000Z",
  "relatedQuestions": []
}
```

Không được trả các field nội bộ: `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `sourceReferences`, actor/admin/audit fields, `lastTransitionReason`.

Behavior:

- Không tìm thấy hoặc không phải `active` trả `404` hoặc `410` nhất quán; submit vẫn phải re-check active riêng, không tin trạng thái detail đã load trước đó.
- Detail phải dùng cùng locale completeness/fallback policy của feature 026: không trộn từng field từ nhiều locale trên cùng detail.
- `relatedQuestions` nằm trong scope feature này, nhưng chỉ là recommendation nhẹ dựa trên taxonomy public; FE vẫn phải xử lý được trường hợp thiếu hoặc mảng rỗng.
- Projection của từng related item dùng lại public card DTO của feature 020: `id`, `code`, `title`, `displayQuestion`, `displayIntent`, `difficulty`, `roleFamilies`, `levels`, `type`, `competencies`, `techTags`, `supportedLanguages`, `locale`, `resolvedLocale`, `localeFallbackUsed`, `publishedAt`. Không trả rubric/admin metadata.

Related selection logic:

1. Backend normalize `relatedLimit`: default `3`, min `0`, max `6`. Nếu `relatedLimit=0` thì trả `[]`.
2. Lấy probe hiện tại trước; nếu probe không `active` thì detail trả lỗi như trên và không tính related.
3. Candidate pool chỉ gồm probe `active`, khác `probeId` hiện tại, và có thể resolve content theo cùng locale completeness/fallback policy của detail. Probe không render được public content thì bị loại.
4. Prefilter bằng taxonomy overlap: chỉ xét probe có ít nhất một overlap trong `roleFamilies`, `levels`, `type`, `competencies` hoặc `techTags`. Nếu không có candidate overlap thì trả `[]`.
5. Tính `relatedScore` deterministic từ metadata public:
   - `+5` nếu cùng `type`.
   - `+4` cho mỗi `competencies` overlap.
   - `+3` cho mỗi `roleFamilies` overlap.
   - `+2` cho mỗi `levels` overlap.
   - `+2` cho mỗi `techTags` overlap.
   - `+1` nếu `difficulty` bằng nhau, `+0.5` nếu lệch `1`.
6. Chỉ giữ candidate có `relatedScore > 0`, sort theo `relatedScore` giảm dần, rồi tie-break bằng `difficulty` gần hơn, `publishedAt` mới hơn, cuối cùng `code` hoặc `id` tăng dần để kết quả ổn định.
7. Cắt theo `relatedLimit` và map qua public card projection đã resolve locale.

Performance guardrails cho related:

- Không load toàn bộ `QuestionProbe` để tính related trong memory. Query phải bắt đầu từ `status = active`, `id != currentProbeId` và prefilter bằng taxonomy overlap ở DB/query builder.
- Query phase đầu chỉ lấy field cần cho scoring và projection public: id/code, taxonomy fields, difficulty, publishedAt và localized content metadata cần để resolve locale. Không hydrate rubric fields như `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `sourceReferences`.
- Với Postgres/TypeORM, ưu tiên dùng điều kiện overlap cho array fields (`roleFamilies`, `levels`, `competencies`, `techTags`) và equality cho `type`; thêm index phù hợp cho `status`, `type`, `publishedAt` và array taxonomy fields nếu dữ liệu tăng.
- Sau prefilter, cap candidate scoring set trước khi sort sâu, ví dụ tối đa `100` hoặc `200` bản ghi gần nhất/phù hợp nhất. `relatedLimit` chỉ là số item trả về, không phải số bản ghi được phép scan không giới hạn.
- Nếu chưa có index hoặc query overlap đủ tốt, backend được phép trả `relatedQuestions: []` tạm thời thay vì ship logic gây chậm detail page. Detail content và practice entry quan trọng hơn related.
- Related không cần realtime tuyệt đối. Sau này nếu bank lớn hoặc traffic cao, có thể cache ngắn theo `(probeId, locale, relatedLimit)` hoặc tạo materialized/public read model riêng, nhưng không thêm trong scope bắt buộc của feature 21.

Không tạo semantic search, vector index, RAG hoặc AI recommendation trong feature này. Nếu sau này cần relevance thông minh hơn thì mở feature riêng hoặc dùng scope của feature 017.

### Submit Practice Attempt API

| Method | Path | Auth | Hành vi |
| --- | --- | --- | --- |
| `POST` | `/question-bank/probes/:probeId/practice-attempts` | Candidate JWT | Tạo hoặc trả lại attempt một-câu cho probe đang active |

Request:

```json
{
  "clientSubmissionId": "uuid-from-client-draft",
  "answerInputType": "text",
  "answerText": "Candidate answer text or transcript",
  "displayLocale": "vi",
  "feedbackLocale": "en"
}
```

Quy tắc request:

- `clientSubmissionId` bắt buộc để idempotency.
- `answerInputType` dùng `text` trước. Nếu voice được bật, endpoint vẫn nhận transcript/text đã hợp lệ; không gửi raw audio blob vào endpoint này trừ khi đã có storage/upload contract riêng.
- `answerText` sau trim không được rỗng. Nếu voice transcript rỗng hoặc không hợp lệ, backend trả `400`.
- `displayLocale` là locale candidate đang dùng khi submit; backend resolve lại thành `resolvedQuestionLocale` theo probe hiện tại.
- `feedbackLocale` độc lập với `displayLocale`, chỉ nhận locale app hỗ trợ.

Response khi tạo hoặc retry idempotent thành công:

```json
{
  "attemptId": "uuid",
  "probeId": "uuid",
  "status": "pending_feedback",
  "answerInputType": "text",
  "displayLocale": "vi",
  "resolvedQuestionLocale": "vi",
  "feedbackLocale": "en",
  "submittedAt": "2026-05-10T00:00:00.000Z",
  "next": "feedback_processing"
}
```

Behavior:

- Nếu probe không còn `active`, trả `409` hoặc `410` với English error message rõ, không tạo attempt.
- Retry cùng `(candidateId, clientSubmissionId)` trả lại attempt cũ; không tạo bản ghi mới và không thay answer đã khóa.
- Retry sau lỗi validation vẫn cho phép gửi lại nếu chưa có attempt thành công cho `clientSubmissionId`.
- Submit thành công không trả score/feedback trong feature 21.

### Attempt State Contract

Feature 21 chỉ cần tạo trạng thái đầu:

| State | Owner | Ý nghĩa |
| --- | --- | --- |
| `pending_feedback` | Feature 21 | Answer đã được lưu bền vững, chờ feature 24 xử lý |
| `processing` | Feature 24 | Scoring/feedback đang chạy |
| `feedback_ready` | Feature 24 | Kết quả đã sẵn sàng |
| `feedback_failed` | Feature 24 | Xử lý thất bại, có thể retry scoring |

FE trong feature 21 có thể hiển thị “đã gửi/đang chờ xử lý” sau `pending_feedback`. Không tự diễn giải điểm mạnh/yếu hoặc score.

## Data & State

`QuestionProbe` vẫn là source of truth cho nội dung và trạng thái curation. `QuestionPracticeAttempt` là source of truth cho lượt submit một-câu.

Attempt nên lưu tối thiểu:

- `id`, `candidateId`, `probeId`, `clientSubmissionId`.
- `answerInputType`, `answerText` hoặc transcript text đã normalize.
- `displayLocale`, `resolvedQuestionLocale`, `feedbackLocale`.
- `status`, `submittedAt`, `createdAt`, `updatedAt`.
- Snapshot server-side: `probeCode`, `probeRevision`, public question content đã hiển thị, canonical intent/primary question và rubric fields cần cho feature 24.

Consistency:

- Backend resolve detail locale ở GET và resolve lại ở submit để chống stale state.
- Snapshot ở submit là immutable cho attempt đã tạo. Nếu candidate muốn làm lại hoặc sửa câu trả lời sau submit, tạo attempt mới với `clientSubmissionId` mới để giữ lịch sử các lần luyện; feature 21 không sửa đè attempt đã gửi.
- Không tạo DB attempt cho draft chưa gửi. Draft/recording in-progress là FE local state, trừ khi analytics sau này yêu cầu abandoned tracking riêng.

Migration/compatibility:

- Thêm entity/table mới không được phá `question_probes`.
- Existing `/question-bank/probes` list contract vẫn giữ backward compatible; card chỉ cần mở navigation sang route detail khi feature 21 có route.

## Quality & Stability Notes

- Latency: detail read và submit phải là request nhanh; submit không chờ AI scoring.
- Availability/fallback: nếu submit API lỗi sau validation, FE giữ draft và cho retry cùng `clientSubmissionId`.
- Idempotency: enforce unique `(candidateId, clientSubmissionId)` để chống double-submit do retry hoặc double-click.
- Privacy: không log full `answerText`, không trả rubric snapshot ra FE, không expose internal scoring fields trong detail.
- Observability: log attempt id, probe id, candidate id dạng metadata, trạng thái retired/validation/idempotent retry và lỗi enqueue nếu feature 24 thêm queue; tránh log nguyên câu trả lời.
- Security: Candidate chỉ tạo/read attempt của chính mình; admin curation route không tham gia candidate practice.
- Rollback: có thể ẩn detail route/action từ FE mà không ảnh hưởng browse list hoặc admin curation. Attempt table giữ dữ liệu đã submit để feature 24 hoặc cleanup xử lý sau.
- Error handling: `400` cho answer/locale invalid, `404` cho probe không tồn tại/không visible, `409` hoặc `410` cho retired sau khi mở detail, `500` chỉ cho lỗi hệ thống.

## UX Boundary

Primary production workflow là candidate practice một-câu trên detail page:

- Detail page phải là workspace luyện tập, không phải landing/marketing page. Mục tiêu first viewport: candidate thấy câu hỏi, metadata chính, chọn ngôn ngữ, và biết ngay nơi nhập câu trả lời.
- Desktop layout nên dùng 2 vùng rõ ràng: nội dung câu hỏi ở cột chính, practice panel ở cột phụ/sticky. Mobile layout xếp một cột: question content trước, answer entry ngay sau đó, CTA submit luôn dễ thấy nhưng không che nội dung.
- Header của detail gồm back navigation về Question Bank, tiêu đề/câu hỏi chính, difficulty, type, role/level/competency/tech tag chips, supported language/resolved fallback indicator, và trạng thái usable nếu probe vừa bị retire khi refetch.
- Question content chia thành các khối scan nhanh: `displayQuestion` nổi bật nhất, `displayIntent` ngay dưới hoặc trong khối "What interviewer is looking for", `guidance` và `commonMistakes` dạng list/collapsible nhỏ. Không hiển thị rubric nội bộ hoặc raw JSON.
- Practice panel là hành động chính: feedback language picker, answer input type, textarea/editor, optional voice entry nếu có capture/transcript hợp lệ, submit button, retry/error state, và trạng thái sau submit. Text answer là default đáng tin cậy.
- Language UX phải tách rõ `question display language` và `feedback language`. Đổi display language refetch content nhưng không reset draft, transcript, selected feedback locale hoặc `clientSubmissionId`.
- Voice UX nếu bật phải có permission state rõ: mic unavailable/denied, recording, paused/stopped, transcript pending, transcript empty/error. Không tự submit raw audio và không làm voice thành blocker cho text practice.
- Submit UX: disabled khi answer rỗng, loading khi đang gửi, success chuyển sang trạng thái `pending_feedback`/đã gửi. Feature 21 không hiển thị score giả, không promise feedback tức thì nếu feature 24 chưa có result path.
- Related questions đặt sau main practice flow hoặc trong cột phụ dưới practice panel; không được cạnh tranh với CTA trả lời. Card related dùng lại Question Bank card compact, click sang detail mới và giữ locale preference.
- Empty/error states cần cụ thể: probe not found/retired, locale fallback, submit validation error, network retry. Khi lỗi submit không mất draft và retry dùng cùng `clientSubmissionId`.
- Visual density nên giống tool luyện tập: ít decoration, nhiều whitespace có kiểm soát, chips/buttons/icon rõ nghĩa, text không tràn trên mobile. Tránh layout hero lớn hoặc card trang trí khiến người dùng phải cuộn mới trả lời được.

External UX references checked for this feature:

- X-Interview public Question Bank shows a candidate-oriented pattern with search/filter, language selector, sort, practice counts, difficulty labels, and direct "Luyện tập" CTA on each question. Detail page should preserve that directness instead of hiding practice behind secondary navigation.
- X-Interview also prompts for feedback language before practice; feature 21 should keep feedback language explicit but avoid modal friction when it can be rendered inline in the practice panel.
- AI interview products such as Yoodli, Rehearsy and Revarta converge on: practice out loud/text in a focused workspace, explicit microphone permission handling for voice, transcript/analysis after an attempt, structured feedback later, and clear repeat-practice loops. Feature 21 should implement only the entry/submission part and leave scoring feedback to feature 24.

- Detail page hiển thị question content, intent, guidance, common mistakes, metadata, language/fallback indicator và related questions nếu có.
- Practice entry dùng textarea/editor có cấu trúc cho text answer; voice control chỉ xuất hiện nếu có capture/transcription path rõ và trạng thái recording/submitting/error đầy đủ.
- Language controls phải phân biệt question display language và feedback language.
- Đổi question display language không reset `answerText`, recording transcript hoặc `clientSubmissionId` của draft hiện tại.
- Submit button disabled khi answer rỗng, đang submit hoặc probe không còn usable.
- Sau submit thành công, attempt hiện tại chuyển sang trạng thái chờ xử lý/đã gửi và được giữ trong lịch sử luyện tập. Muốn trả lời lại thì bắt đầu attempt mới rõ ràng, không âm thầm sửa attempt cũ.
- Không dùng JSON/raw payload editor cho bất kỳ phần candidate-facing nào.
- Với select/input/filter hoặc language picker, Dev phải tìm và tái sử dụng component có sẵn trong Question Bank/shared UI trước khi tự tạo control mới.

## Delivery Slices

Single delivery slice có thể review được nếu giữ scope đúng: backend detail + attempt contract, frontend detail/practice entry, và tests cho active/retired/empty-answer/retry/idempotency.

Nếu cần tách để giảm rủi ro, ưu tiên:

1. Backend contract slice: detail API, submit attempt API, snapshot/idempotency, tests chống data leakage và retired submit.
2. Frontend experience slice: route/card navigation, detail UI, draft/locale handling, submit/retry state và i18n.

Feature 24 bắt đầu sau khi attempt contract ổn định.

## Not Changing

- Không thay admin curation workflow hoặc state machine publish/retire.
- Không expose rubric nội bộ cho candidate.
- Không tạo session phỏng vấn nhiều lượt, follow-up qua lại hoặc SSE interviewer trong feature này.
- Không chạy AI scoring, scorecard, evidence quote hoặc result display chi tiết; toàn bộ phần đó thuộc feature 24.
- Không thêm semantic recommendation/RAG cho related questions.
- Không lưu raw audio nếu chưa có upload/storage/privacy contract riêng.
- Không thay Behavioral Interview prompt builder/scoring runtime hiện có trừ khi feature 24 quyết định integration sau.

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries và quality guardrails.
