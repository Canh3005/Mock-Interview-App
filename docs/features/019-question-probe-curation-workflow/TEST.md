# TEST - Quy trình quản trị ngân hàng câu hỏi

## Phạm vi

- Feature: `019-question-probe-curation-workflow`
- Trọng tâm test lần này: luồng quản trị **Bộ phỏng vấn**.
- Ngày chạy: `2026-05-10`
- Tài liệu dùng làm nguồn: `BA.md`, `HOW.md`, `WALKTHROUGH.md`
- Audit liên quan:
  - `2026-05-09-json-editor-production-form.md`
  - `2026-05-09-vi-locale-without-diacritics.md`

## Tóm tắt kết quả

Phần tự động đã kiểm tra được create, update, publish và retire cho Bộ phỏng vấn ở hai lớp:

- Backend service bằng Jest.
- UI admin bằng Playwright, có mock API để kiểm tra form, validation, payload và action trên bảng.

Kết quả tự động hiện tại: **pass**. Đã bổ sung API e2e với database thật/guard thật và Playwright real-flow với browser thật, frontend thật, backend thật và database thật.

## Ma trận test case

| ID | Nguồn | Kịch bản cần kiểm tra | Loại | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| IS-001 | BA Scope, WALKTHROUGH Flow 4-6, audit production form | Admin tạo Bộ phỏng vấn bằng form có cấu trúc, không dùng JSON thô. | Tự động | Pass | Playwright kiểm tra modal có các vùng nhập liệu domain như metadata, localized copy và slot rule. |
| IS-002 | WALKTHROUGH Flow 6 | Form tạo mới chặn lưu khi thiếu tiêu đề bộ hoặc tiêu đề bản địa hóa. | Tự động | Pass | Playwright kiểm tra validation summary trước khi submit. |
| IS-003 | HOW InterviewSet Contract, WALKTHROUGH Flow 5-7 | Payload tạo mới có title, targeting, duration, question count, localized title và slot rule. | Tự động | Pass | Playwright intercept `POST /admin/question-bank/interview-sets` và assert payload. |
| IS-004 | WALKTHROUGH Flow 4, 7 | Admin sửa Bộ phỏng vấn draft bằng form có cấu trúc. | Tự động | Pass | Playwright intercept `PATCH /admin/question-bank/interview-sets/:id` và assert title đã đổi. |
| IS-005 | HOW InterviewSet Contract | Backend tạo Bộ phỏng vấn ở trạng thái `draft`, không tự active. | Tự động | Pass | Jest kiểm tra default status và actor metadata. |
| IS-006 | HOW Data Quality | Backend không cho tạo trùng `code` Bộ phỏng vấn. | Tự động | Pass | Jest kiểm tra `ConflictException`. |
| IS-007 | HOW Published Content Mutability | Backend không cho sửa Bộ phỏng vấn đã `active` hoặc `retired`. | Tự động | Pass | Jest kiểm tra `BadRequestException`. |
| IS-008 | HOW publish rule, WALKTHROUGH Flow 8-9 | Admin publish Bộ phỏng vấn draft từ action trên bảng. | Tự động | Pass | Playwright kiểm tra transition publish; Jest kiểm tra state backend đổi sang `active`. |
| IS-009 | HOW publish rule | Publish fail nếu set không có `probeIds` và cũng không có `slotRules`. | Tự động | Pass | Jest kiểm tra `BadRequestException`. |
| IS-010 | HOW publish rule | Publish fail nếu `probeIds` trỏ tới probe chưa active. | Tự động | Pass | Jest kiểm tra lookup active probes và reject khi thiếu probe active. |
| IS-011 | WALKTHROUGH Flow 8, HOW transition reason | Admin retire Bộ phỏng vấn active và phải nhập lý do. | Tự động | Pass | Playwright kiểm tra prompt reason; Jest kiểm tra backend bắt buộc reason. |
| IS-012 | WALKTHROUGH Flow 2, HOW list endpoint | Tab Bộ phỏng vấn load danh sách theo shape `{ data, total, page, limit }`. | Tự động | Pass | Playwright mock kiểm tra empty/list state; API e2e kiểm tra list thật với DB. |
| IS-013 | WALKTHROUGH Flow 2 | Lọc Bộ phỏng vấn theo status, role, level, search và pagination. | Tự động | Pass | API e2e gọi endpoint thật với `status`, `roleFamily`, `level`, `search` và kiểm tra kết quả persisted. |
| IS-014 | HOW Auth Boundary | User không phải admin không được vào UI/API quản trị Bộ phỏng vấn. | Tự động | Pass | API e2e kiểm tra unauthenticated `401` và non-admin `403`. Browser real-flow dùng JWT admin hợp lệ để đi qua UI admin. |
| IS-015 | Audit i18n | Label tiếng Việt trong admin Question Bank có dấu và đọc tự nhiên. | Tự động + thủ công | Pass một phần | Playwright đã đi qua nhiều label tiếng Việt. Vẫn cần người đọc rà toàn bộ copy chưa được test chạm tới. |
| IS-016 | HOW historical behavior | Set/probe retired không được dùng cho session mới, lịch sử cũ vẫn resolve được nội dung đã dùng. | Thủ công | Chưa chạy | Hành vi candidate/session thuộc feature sau, chưa nằm trong runtime của feature 019. |

## Lệnh đã chạy

| Lệnh | Thư mục | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| `npm run test -- interview-set-curation.service.spec.ts --runInBand` | `server/` | Pass | 7 test pass. Có warning TS151002 sẵn từ `ts-jest`, không làm fail test. |
| `npm run test:e2e -- question-bank-interview-sets.e2e-spec.ts --runInBand` | `server/` | Pass | 3 API e2e test pass với controller, guard, service, TypeORM và database thật. Có warning `pg` deprecation sẵn có. |
| `npm run test:e2e -- e2e/admin-question-bank-interview-sets.spec.js` | `client/apps/web/` | Pass | 3 Playwright test pass. |
| `npm run test:e2e` | `client/apps/web/` | Pass | 4 Playwright test pass, gồm cả smoke test. |
| `npm run test:e2e:real` | `client/apps/web/` | Pass | 1 Playwright real-flow pass với browser thật, frontend thật, backend thật và database thật. Test stub `/auth/refresh` để cấp JWT admin hợp lệ; các API CRUD vẫn gọi backend thật. |
| `npm run build` | `client/apps/web/` | Pass | Vite build pass. Có warning chunk lớn sẵn có. |
| `npm run build` | `server/` | Pass | Nest build pass. |

## Cần test thủ công hoặc bổ sung sau

- [ ] Đăng nhập bằng form `/login` với admin thật. Luồng hiện tại đã test guard/JWT thật ở backend và browser real-flow bằng refresh stub, nhưng chưa test UI login.
- [ ] Kiểm tra reset filter trên UI Bộ phỏng vấn. API filter thật đã được cover, reset button UI chưa assert riêng.
- [ ] Rà responsive/visual cho form Bộ phỏng vấn ở các viewport admin thường dùng.
- [ ] Rà toàn bộ copy tiếng Việt/tiếng Nhật: label, toast, prompt và validation chưa được Playwright đi qua.
- [ ] Kiểm tra behavior ở các feature sau khi candidate/session dùng active hoặc retired set.

## Ghi nhận

- Không có lỗi tự động trong phạm vi đã cover cho Bộ phỏng vấn.
- Có hai lớp Playwright: mock API để test UI nhanh/ổn định, và real-flow để test browser + frontend + backend + database thật.
- API e2e đã cover auth boundary, persisted CRUD, filter thật, publish/retire thật và rule probe active.
- Setup dùng lại đã được tách vào `server/test/helpers` và `client/apps/web/e2e/helpers` để các test CRUD sau có thể import lại payload mẫu, app setup, cleanup, JWT/session stub và mock API.
- Browser real-flow chưa test màn hình login thật; test dùng stub `/auth/refresh` để cấp JWT admin hợp lệ cho frontend, còn API quản trị vẫn đi qua backend guard thật.

## Verdict

**PASS**

Trong phạm vi **Bộ phỏng vấn của feature 019**, create/update/list/filter/publish/retire, auth boundary backend, database persistence và browser real-flow đều đã pass. Các mục còn lại là kiểm tra bổ sung về login UI, reset filter UI, responsive/copy review và behavior tiêu thụ set ở feature sau.
