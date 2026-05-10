# Luồng kiểm tra - Public Question Bank Browse & Search

## Điểm vào

- UI cho ứng viên: `GET /question-bank` trong app web sau `ProtectedRoute`.
- API cho ứng viên: `GET /question-bank/probes`.
- API taxonomy dùng lại: `GET /question-bank/taxonomy`.

## Mục đích sử dụng

Ứng viên mở trang Ngân hàng câu hỏi để xem các câu hỏi đang hoạt động, tìm theo từ khóa, lọc theo taxonomy chuẩn và đổi ngôn ngữ nội dung theo `locale` của app. Thẻ câu hỏi chỉ hiển thị dữ liệu cần cho quyết định luyện tập, không trả hướng dẫn chấm điểm hay metadata quản trị.

## Luồng UI/API

1. Ứng viên đăng nhập và mở route `/question-bank`.
2. FE tải taxonomy từ `GET /question-bank/taxonomy` để dựng bộ lọc.
3. FE gọi `GET /question-bank/probes` với `page`, `limit`, `locale`, `language`, `roleFamily`, `level`, `type`, `competency`, `techTag`, `difficulty`, `search`, `sort`.
4. BE luôn giới hạn kết quả ở `status = active`, kiểm tra key taxonomy và trả `400` khi filter không hợp lệ.
5. BE resolve nội dung theo `locale`, nếu thiếu thì dùng ngôn ngữ dự phòng có nội dung và trả `resolvedLocale` cùng `localeFallbackUsed`.
6. FE render danh sách thẻ, trạng thái tải, lỗi, rỗng và phân trang. Action chi tiết đang disabled vì màn hình detail/practice entry thuộc feature 021.

## Đường đi code

Backend:

- [question-bank.controller.ts](../../../server/src/question-bank/question-bank.controller.ts): route `GET /question-bank/probes` có `JwtAuthGuard`.
- [question-bank.service.ts](../../../server/src/question-bank/question-bank.service.ts): chuẩn hóa query, validate taxonomy, lọc/sắp xếp/phân trang, map dữ liệu rút gọn an toàn.
- [question-bank.service.spec.ts](../../../server/src/question-bank/question-bank.service.spec.ts): test query active, dữ liệu rút gọn không lộ field nội bộ, dự phòng ngôn ngữ và bộ lọc không hợp lệ.

Frontend:

- [routes.js](../../../client/apps/web/src/router/routes.js) và [App.jsx](../../../client/apps/web/src/App.jsx): đăng ký route `/question-bank`.
- [questionBank.api.js](../../../client/apps/web/src/api/questionBank.api.js): API layer dùng `axiosClient`.
- [questionBankSlice.js](../../../client/apps/web/src/store/slices/questionBankSlice.js) và [questionBankSaga.js](../../../client/apps/web/src/store/sagas/questionBankSaga.js): state, side effect và query params.
- [PublicQuestionBankPage.jsx](../../../client/apps/web/src/components/question-bank/PublicQuestionBankPage.jsx): page shell, vòng đời tải dữ liệu và nối bộ lọc.
- [QuestionBankFilters.jsx](../../../client/apps/web/src/components/question-bank/QuestionBankFilters.jsx), [QuestionProbeCard.jsx](../../../client/apps/web/src/components/question-bank/QuestionProbeCard.jsx), [QuestionBankPagination.jsx](../../../client/apps/web/src/components/question-bank/QuestionBankPagination.jsx): control lọc, thẻ câu hỏi và phân trang.
- `en.json`, `vi.json`, `ja.json`: i18n cho chrome UI, filter, trạng thái và nhãn taxonomy.

## Rào chắn và lỗi

- Endpoint cho ứng viên dùng dữ liệu rút gọn riêng, không trả `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `sourceReferences`, actor fields hoặc audit metadata.
- `language` là filter nội dung có sẵn; `locale` chỉ là preference hiển thị.
- `popular` hiện chưa tạo số lượt luyện tập giả; khi chưa có nguồn phân tích sử dụng, response giữ `popularity = null` và sắp xếp ổn định theo `publishedAt DESC, id ASC`.
- Kết quả rỗng là trạng thái hợp lệ trên UI, không phải lỗi.
- `vi.json` dùng tiếng Việt có dấu cho các key mới.
