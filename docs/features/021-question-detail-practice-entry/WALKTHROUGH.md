# WALKTHROUGH - Question Detail Practice Entry

## Điểm Vào

- UI danh sách câu hỏi: `/question-bank`.
- UI detail và luyện tập một câu: `/question-bank/:probeId`.
- API detail cho candidate: `GET /question-bank/probes/:probeId`.
- API submit lượt luyện tập: `POST /question-bank/probes/:probeId/practice-attempts`.
- API taxonomy dùng lại: `GET /question-bank/taxonomy`.

## Mục Đích Sử Dụng

Candidate mở một câu hỏi từ Question Bank để đọc nội dung public-facing đã resolve theo ngôn ngữ, hiểu mục tiêu câu hỏi, nhập câu trả lời và gửi một lượt luyện tập cho hệ thống chấm sau. Feature này chỉ tạo `QuestionPracticeAttempt` ở trạng thái `pending_feedback`; phần scoring, feedback chi tiết và scorecard thuộc feature 024.

Detail page phải giúp candidate hành động nhanh: thấy câu hỏi, metadata chính, chọn ngôn ngữ hiển thị, chọn ngôn ngữ feedback, viết câu trả lời và submit. Trang không hiển thị rubric nội bộ như `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `sourceReferences` hoặc metadata admin/audit.

## Luồng UI/API

1. Candidate đăng nhập và mở `/question-bank`.
2. FE tải danh sách probe active bằng `GET /question-bank/probes` và render `QuestionProbeCard`.
3. Candidate bấm action chi tiết trên card; FE chuyển sang `/question-bank/:probeId`.
4. `QuestionProbeDetailPage` gọi `GET /question-bank/probes/:probeId` với `locale` hiện tại và `relatedLimit`.
5. BE chỉ trả probe `active`; nếu probe không tồn tại hoặc không còn active thì trả lỗi, không expose admin API.
6. BE resolve content theo locale/fallback policy, map DTO detail public, tính `relatedQuestions` nhẹ bằng taxonomy overlap và trả card projection public.
7. FE render workspace luyện tập gồm question content, intent, guidance, common mistakes, metadata, language picker, practice panel và related questions nếu có.
8. Candidate đổi question display language thì FE refetch detail theo locale mới nhưng giữ `answerText`, `feedbackLocale` và `clientSubmissionId` của draft hiện tại.
9. Candidate nhập text answer, chọn feedback language và submit.
10. FE gọi `POST /question-bank/probes/:probeId/practice-attempts` với `clientSubmissionId`, `answerInputType`, `answerText`, `displayLocale`, `feedbackLocale`.
11. BE re-check probe vẫn `active`, validate answer không rỗng, resolve locale lại, lưu immutable snapshot server-side và tạo attempt `pending_feedback`.
12. Nếu retry cùng `(candidateId, clientSubmissionId)`, BE trả lại attempt cũ, không tạo bản ghi mới và không thay answer đã khóa.
13. FE hiển thị trạng thái đã gửi/chờ feedback. Muốn trả lời lại thì candidate bắt đầu attempt mới với `clientSubmissionId` mới.

## Đường Đi Code

Backend:

- [question-bank.controller.ts](../../../server/src/question-bank/question-bank.controller.ts): route `GET /question-bank/probes/:probeId` và `POST /question-bank/probes/:probeId/practice-attempts`, đều dùng `JwtAuthGuard`.
- [question-bank.service.ts](../../../server/src/question-bank/question-bank.service.ts): giữ taxonomy và validate probe foundation dùng chung.
- [question-bank-public-browse.service.ts](../../../server/src/question-bank/question-bank-public-browse.service.ts): normalize query, validate filter taxonomy, list public probes và map card DTO.
- [question-bank-detail.service.ts](../../../server/src/question-bank/question-bank-detail.service.ts): orchestration detail public, locale, guidance/common mistakes và related questions.
- [question-bank-public-projection.service.ts](../../../server/src/question-bank/question-bank-public-projection.service.ts): resolve locale/fallback và map public card projection an toàn.
- [question-bank-related.service.ts](../../../server/src/question-bank/question-bank-related.service.ts): tính `relatedQuestions` bằng taxonomy overlap deterministic, có cap candidate set.
- [question-practice-attempt.service.ts](../../../server/src/question-bank/question-practice-attempt.service.ts): validate submit, re-check probe active, tạo/idempotent retry practice attempt và lưu snapshot.
- [question-practice-attempt.entity.ts](../../../server/src/question-bank/entities/question-practice-attempt.entity.ts): entity `QuestionPracticeAttempt`, unique index `(candidateId, clientSubmissionId)`, snapshot probe và trạng thái feedback ban đầu.
- [question-probe.entity.ts](../../../server/src/question-bank/entities/question-probe.entity.ts): source of truth cho probe, localized content, taxonomy và rubric nội bộ.
- [question-bank.module.ts](../../../server/src/question-bank/question-bank.module.ts): đăng ký repository `QuestionPracticeAttempt`.
- [question-bank-public-browse.service.spec.ts](../../../server/tests/unit/question-bank/question-bank-public-browse.service.spec.ts): unit test cho list public, filter taxonomy và projection an toàn.
- [question-bank-detail.service.spec.ts](../../../server/tests/unit/question-bank/question-bank-detail.service.spec.ts): unit test cho detail public và related projection.
- [question-practice-attempt.service.spec.ts](../../../server/tests/unit/question-bank/question-practice-attempt.service.spec.ts): unit test cho submit/idempotent retry practice attempt.
- [question-bank-e2e-app.ts](../../../server/tests/integration/helpers/question-bank-e2e-app.ts): thêm entity attempt vào test module TypeORM.

Frontend:

- [routes.js](../../../client/apps/web/src/router/routes.js) và [App.jsx](../../../client/apps/web/src/App.jsx): đăng ký route `/question-bank/:probeId`.
- [questionBank.api.js](../../../client/apps/web/src/api/questionBank.api.js): API layer cho detail và submit practice attempt.
- [questionBankSlice.js](../../../client/apps/web/src/store/slices/questionBankSlice.js): state detail, loading/error, submit loading/error và `currentAttempt`.
- [questionBankSaga.js](../../../client/apps/web/src/store/sagas/questionBankSaga.js): gọi API detail/submit, dispatch success/failure và toast kết quả.
- [QuestionProbeCard.jsx](../../../client/apps/web/src/components/question-bank/QuestionProbeCard.jsx): card trong list mở sang detail route.
- [QuestionProbeDetailPage.jsx](../../../client/apps/web/src/components/question-bank/QuestionProbeDetailPage.jsx): workspace detail/practice, giữ draft khi đổi locale, submit answer và render related questions.

## Rào Chắn Và Lỗi

- Detail và submit đều yêu cầu Candidate JWT; FE route guard không thay thế guard ở backend.
- BE detail chỉ trả probe `active`. Submit luôn re-check trạng thái hiện tại để chặn probe đã retire sau khi candidate mở detail.
- Public DTO không trả rubric/admin/audit fields. Rubric chỉ nằm trong snapshot server-side của attempt để feature 024 xử lý sau.
- `relatedQuestions` chỉ dùng taxonomy overlap deterministic, có `relatedLimit` default nhỏ và cap candidate set; không dùng semantic search, vector index, RAG hoặc AI recommendation.
- `answerText` sau trim không được rỗng; voice hiện chưa gửi raw audio vào endpoint này.
- `clientSubmissionId` bắt buộc để chống double-submit/retry tạo duplicate attempt.
- Retry cùng `clientSubmissionId` trả attempt cũ, không sửa answer cũ.
- FE giữ draft khi đổi question display language hoặc khi submit lỗi.
- FE không hiển thị score/feedback giả trong feature 21; chỉ hiển thị trạng thái đã gửi/chờ xử lý.
- Related questions là phụ trợ; nếu API trả mảng rỗng thì UI vẫn hoạt động bình thường.

## Verification Đã Chạy

- `server/`: `npm run test -- question-bank-public-browse.service.spec.ts question-bank-detail.service.spec.ts question-practice-attempt.service.spec.ts --runInBand` - pass.
- `server/`: `npm run build` - pass.
- `client/apps/web/`: `npm run build` - pass, có warning chunk size lớn của Vite.

## Ghi Chú Dev

- Dev server đã được thử với frontend `http://127.0.0.1:5173` và backend `http://127.0.0.1:3001`.
- Backend hiện dùng TypeORM `synchronize: true` trong môi trường dev, nên entity mới được auto-load qua `QuestionBankModule`. Khi chuyển production migration, cần tạo migration riêng cho bảng `question_practice_attempts` và unique index `(candidateId, clientSubmissionId)`.
