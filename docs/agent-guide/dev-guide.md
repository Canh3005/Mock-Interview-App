# Dev Guide

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
- [ ] Có điểm nào mâu thuẫn giữa BA và HOW không?
- [ ] Có API contract hoặc BE behavior cần FE chờ không?
- [ ] Có dữ liệu/schema/auth/i18n/async/error state nào dễ bị bỏ sót không?

Nếu thiếu thông tin nghiệp vụ quan trọng hoặc BA/HOW mâu thuẫn — **DỪNG**, hỏi người dùng. Không tự bịa business rule.

Nếu chỉ thiếu implementation detail — Dev tự đọc codebase và quyết định.

---

## 2. Implementation Approach

Dev làm theo thứ tự:

1. Đọc artifacts: `BA.md`, `HOW.md` nếu có, convention tương ứng.
2. Scan code gần nhất để reuse pattern hiện có.
3. Xác định change set tối thiểu đủ đạt acceptance criteria.
4. Implement theo convention.
5. Tự review diff trước khi báo done.
6. Chạy verification phù hợp.

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

---

## 5. Done Report

Khi báo done, Dev phải nêu ngắn:

```
## Summary
- [behavior/code area đã làm]

## Acceptance Mapping
- [AC hoặc business outcome] → [đã cover bằng thay đổi nào]

## Verification
- [command đã chạy] → pass/fail

## Notes
- [risk còn lại, command không chạy được, hoặc N/A]
```

Done report không thay thế review. Review vẫn là bước riêng.
