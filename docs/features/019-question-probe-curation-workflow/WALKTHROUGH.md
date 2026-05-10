# WALKTHROUGH - Question Probe Curation Workflow

## Entry Points

- Admin UI route: `/admin/question-bank`.
- Admin menu: `AdminLayout` hiển thị mục Question Bank.
- FE state/API: `questionBankAdminSlice`, `questionBankAdminSaga`, `questionBankAdmin.api.js`.
- BE admin API: `/admin/question-bank/*`, guard bằng `JwtAuthGuard`, `RolesGuard` và `Role.ADMIN`.

## Probe Curation Flow

1. Admin đăng nhập và mở `/admin/question-bank`.
2. `AdminQuestionBankPage` load taxonomy, probe list và interview set list.
3. Tab Probes dùng `ProbeFilterBar` để lọc theo status, role, level và search.
4. Bảng `ProbeTable` hiển thị probe, status, revision và action theo trạng thái hiện tại.
5. Admin tạo hoặc sửa probe bằng `ProbeFormModal`: chọn stage, role family, level, type, competency từ taxonomy; nhập câu hỏi chính, tín hiệu kỳ vọng, red flag, scoring hint, follow-up và nội dung bản địa hóa theo `vi/en/ja`.
6. Form validate các field bắt buộc trước khi dispatch `saveProbeRequest`; admin không nhập JSON thô.
7. Saga gọi `POST /admin/question-bank/probes` hoặc `PATCH /admin/question-bank/probes/:id`, sau đó refresh list.
8. Admin dùng action icon để submit review, publish, reopen draft, mark needs revision hoặc retire.
9. Saga gọi `POST /admin/question-bank/probes/:id/:transition`; các transition cần reason sẽ prompt trước khi gửi.
10. Backend `QuestionProbeCurationService` kiểm tra state machine, quality gate và ghi audit log qua `QuestionProbeAuditService`.

## Interview Set Flow

1. Admin chuyển sang tab Interview Sets trong cùng page.
2. `ProbeFilterBar` lọc set theo status, role, level và search.
3. `InterviewSetTable` hiển thị title, targeting, coverage, status và revision.
4. Admin tạo hoặc sửa set bằng `InterviewSetFormModal`: nhập title, role family, level, duration, difficulty, question count, localized copy và cấu trúc câu hỏi.
5. Với cấu trúc câu hỏi, admin chọn một trong hai cách: nhập danh sách probe ID cụ thể hoặc cấu hình slot rule theo stage/type/competency/count.
6. Form validate title, targeting, localized title và composition trước khi dispatch `saveInterviewSetRequest`; admin không nhập JSON thô.
7. Saga gọi `POST /admin/question-bank/interview-sets` hoặc `PATCH /admin/question-bank/interview-sets/:id`.
8. Admin publish hoặc retire set từ bảng; saga gọi `POST /admin/question-bank/interview-sets/:id/publish` hoặc `/retire`.
9. Backend `InterviewSetCurationService` chỉ cho publish khi set có question count và có probeIds hoặc slotRules hợp lệ; nếu dùng probeIds thì các probe đó phải active.

## Code Path

- FE route wiring: `App.jsx`, `router/routes.js`, `AdminLayout.jsx`.
- FE page/components: `AdminQuestionBankPage.jsx`, `ProbeFilterBar.jsx`, `ProbeTable.jsx`, `ProbeFormModal.jsx`, `InterviewSetTable.jsx`, `InterviewSetFormModal.jsx`.
- FE state: `questionBankAdminSlice.js` lưu filters, paging, loading, saving và error.
- FE side effects: `questionBankAdminSaga.js` gọi API, toast success/error và refresh list.
- BE controller: `question-bank-admin.controller.ts`.
- BE services: `question-probe-curation.service.ts`, `interview-set-curation.service.ts`, `question-probe-validation.service.ts`.

## Guardrails

- Admin APIs không dựa vào FE route guard; BE vẫn yêu cầu JWT và role admin.
- Update content không được tự đổi status; transition status dùng endpoint riêng.
- Probe active hoặc retired không được sửa trực tiếp.
- Publish probe phải pass full quality gate: metadata, localized content, intent, expected signals, red flags, scoring hints và follow-ups.
- Needs revision và retire bắt buộc có reason.
- FE hiển thị loading overlay, page error và toast khi API fail; mọi UI text mới dùng i18n trong `en`, `vi`, `ja`.
