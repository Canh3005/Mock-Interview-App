# Dev Guide

## 0.1. Ngôn ngữ artifact

Mọi artifact Dev tạo hoặc cập nhật trong `docs/features/`, đặc biệt `WALKTHROUGH.md` và done report, mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

## 0. Vai trò của Dev

Dev chịu trách nhiệm biến `BA.md` và `HOW.md` nếu có thành code chạy được, đúng convention, đúng behavior, và có verification rõ ràng.

Dev **không yêu cầu SA chỉ file/function cụ thể**. Nếu HOW.md là architecture brief, Dev tự đọc codebase để xác định nơi sửa phù hợp với pattern hiện có.

**Dev được làm:**
- Chọn file, function, DTO/entity/component/saga cụ thể để implement.
- Tách helper/component/private method khi code vượt giới hạn convention.
- Bổ sung validation, error handling, i18n, loading/error state, test hoặc verification phù hợp.
- Điều chỉnh implementation chi tiết nếu vẫn giữ đúng BA outcome và HOW guardrails.

**Dev không được làm:**
- Không đổi scope nghiệp vụ trong `BA.md`.
- Không phá architecture decision, system boundary, contract, quality guardrail trong `HOW.md`.
- Không tự thêm feature phụ chỉ vì tiện implement.
- Không commit khi chưa review approved.

---

## 1. Dev Readiness Check — CHẠY TRƯỚC KHI CODE

Trước khi sửa file, Dev phải tự kiểm tra:

- [ ] `BA.md` đã đủ WHAT/WHY/SCOPE/Business Flow/Acceptance Criteria chưa?
- [ ] Nếu có `HOW.md`, đã hiểu architecture decisions, boundaries, contracts, data/state, quality guardrails chưa?
- [ ] Đã đọc `docs/agent-audits/INDEX.md` nếu tồn tại và mở các audit record liên quan tới Dev/BE/FE/domain hiện tại chưa?
- [ ] Có điểm nào mâu thuẫn giữa BA và HOW không?
- [ ] Có API contract hoặc BE behavior cần FE chờ không?
- [ ] Có dữ liệu/schema/auth/i18n/async/error state nào dễ bị bỏ sót không?
- [ ] Nếu HOW có AI/background pipeline nhiều bước, đã mapping từng step và quality guardrail sang code/test hoặc xác định rõ step nào chưa thể làm chưa?
- [ ] Nếu thêm component điều khiển UI như input, select, checkbox, combobox, bộ lọc hoặc sắp xếp, đã tìm component tương đương trong cùng khu vực tính năng hoặc thư viện UI dùng chung chưa?
- [ ] Nếu có UI nhập/sửa dữ liệu production, BA/HOW đã đủ rõ cách user thao tác chưa? Nếu chưa, không tự thay bằng JSON/raw payload editor.

Nếu thiếu thông tin nghiệp vụ quan trọng hoặc BA/HOW mâu thuẫn — **DỪNG**, hỏi người dùng. Không tự bịa business rule.

Nếu chỉ thiếu implementation detail — Dev tự đọc codebase và quyết định.

Nếu HOW yêu cầu một pipeline/guardrail cụ thể nhưng Dev chỉ implement được bản rút gọn, đó không phải implementation detail. Dev phải dừng để hỏi/split scope hoặc ghi rõ deferred item đã được user approve trước khi báo done. Không được silently đổi `tool_use` thành prompt JSON, embedding retrieval thành keyword matching, verifier routing thành không có verifier, hoặc bỏ model routing khi HOW đã coi các lớp đó là bắt buộc.

Riêng với production UI: JSON/raw payload editor, textarea DTO, hoặc form bắt người dùng hiểu schema nội bộ không được xem là implementation detail. Nếu BA/HOW không cho phép rõ, Dev phải xây UI có cấu trúc hoặc dừng hỏi/split scope.

---

## 2. Implementation Approach

Dev làm theo thứ tự:

1. Đọc artifacts: `BA.md`, `HOW.md` nếu có, convention tương ứng.
2. Rà code gần nhất để dùng lại mẫu hiện có; với component điều khiển UI, ưu tiên component sẵn có trong cùng khu vực tính năng hoặc thư viện UI dùng chung trước khi tự tạo component cục bộ.
3. Xác định change set tối thiểu đủ đạt acceptance criteria.
4. Implement theo convention.
5. Tự review diff trước khi báo done.
6. Viết hoặc cập nhật `WALKTHROUGH.md` trong folder feature.
7. Chạy verification phù hợp.

Không cần tạo implementation plan dài trong docs. Nếu feature phức tạp, Dev có thể nêu ngắn trong update trước khi sửa file.

---

## 3. BE Dev Rules

Đọc thêm: `docs/agent-guide/convention-be.md`.

**Verification mặc định trong repo này:**
- Chạy từ `server/`.
- Tối thiểu: `npm run lint`.
- Nếu sửa business logic/service/controller: chạy test liên quan nếu có, hoặc `npm run test` khi phạm vi rộng.
- Nếu sửa module/shared contract lớn: chạy thêm `npm run build`.

Nếu không chạy được command nào, báo rõ command và lý do.

---

## 4. FE Dev Rules

Đọc thêm: `docs/agent-guide/convention-fe.md`.

**Verification mặc định trong repo này:**
- Chạy từ `client/apps/web/`.
- Tối thiểu: `npm run build`.
- Repo hiện chưa có `lint` script FE; không báo "lint pass" cho FE nếu script không tồn tại.
- Nếu sửa UI flow quan trọng: chạy app/browser check khi khả thi.

Nếu không chạy được command nào, báo rõ command và lý do.

Production UI rule:

- Với luồng người dùng tạo/sửa dữ liệu nghiệp vụ, Dev phải build controls có cấu trúc theo domain: input/select/toggle/section/tab/repeatable list/localized editor/validation summary.
- Không dùng JSON editor làm primary create/edit UX trong production, kể cả admin UI.
- JSON editor chỉ được dùng cho import/export/debug/seed/bulk technical tooling khi BA/HOW cho phép rõ và không thay thế workflow chính.

---

## 5. WALKTHROUGH.md

Sau khi implement code cho một feature, Dev phải tạo hoặc cập nhật:

`docs/features/<feature-folder>/WALKTHROUGH.md`

File này ngắn gọn, không thay thế `BA.md` hoặc `HOW.md`. Mục tiêu là giúp reviewer và dev tiếp theo hiểu user/API flow thật đi qua code nào.

Nội dung tối thiểu:

- Entry points: route UI, API endpoint, command, job hoặc module được người dùng/hệ thống gọi.
- Use-case purpose: mỗi endpoint hoặc nhóm field quan trọng phải nói rõ ai dùng, dùng để làm hành động/quyết định gì; không chỉ liệt kê field kỹ thuật.
- User/API flow: các bước thực hiện theo thứ tự.
- Code path: component, slice/saga/api, controller/service/repository/entity chính.
- Guardrails/failure: validation, permission, loading/error state, business rule quan trọng.
- Conformance notes: với feature có HOW phức tạp, ghi rõ các guardrail/pipeline step đã implement và bất kỳ step nào được defer theo approval. Nếu không có deviation thì ghi ngắn “Không có deviation so với HOW”.

Nếu feature chỉ có BE, walkthrough mô tả API/service flow. Nếu feature chỉ có FE, walkthrough mô tả UI/component/state/API integration flow.

---

## 6. Done Report

Khi báo done, Dev phải nêu ngắn:

```
## Summary
- [behavior/code area đã làm]

## Acceptance Mapping
- [AC hoặc business outcome] → [đã cover bằng thay đổi nào]

## Verification
- [command đã chạy] → pass/fail

## Notes
- [WALKTHROUGH.md đã cập nhật, risk còn lại, command không chạy được, hoặc N/A]
```

Done report không thay thế review. Review vẫn là bước riêng.

Với AI/background pipeline nhiều bước, `Acceptance Mapping` phải nêu các HOW guardrail chính đã được cover. Nếu có phần chưa cover, `Notes` phải ghi là deferred theo approval nào; nếu chưa có approval thì chưa được báo done.
