# FE Review Checklist

Đọc `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `git diff` trước khi review. Đọc thêm `docs/agent-audits/INDEX.md` nếu tồn tại và chỉ mở audit record liên quan tới FE/review/domain hiện tại. Nếu SA đã skip và không có `HOW.md`, review trực tiếp theo BA business flow, acceptance criteria, convention FE, và diff. Mục tiêu: đối chiếu code với spec, không chỉ đọc code đơn thuần.

## 1. Đúng spec chưa?

- [ ] UI có thực sự làm WHAT trong `BA.md` không?
- [ ] Nếu có `HOW.md`: UI/API integration có tuân thủ architecture decisions, contracts, boundaries, và quality guardrails không?
- [ ] Nếu có Dev done report: acceptance mapping và verification có khớp diff thực tế không?

## 2. Redux Pattern

- [ ] Slice có đủ `{action}Request / {action}Success / {action}Failure` không?
- [ ] `loading = true` khi Request, `loading = false` khi Success và Failure?
- [ ] Saga dùng `yield call(api, ...)` — không `async/await` trong saga?
- [ ] Saga mới đã được đăng ký trong `rootSaga.js`?

## 3. API Layer

- [ ] API calls đi qua `axiosClient` — không dùng raw `axios` hay `fetch`?
- [ ] API function nằm trong `src/api/{feature}.api.js`?

## 4. i18n — Critical

- [ ] Không có hardcoded string trong JSX?
- [ ] Cả 3 file i18n đã được cập nhật: `en.json`, `vi.json`, `ja.json`?
- [ ] Key i18n nhất quán với naming convention hiện có trong file?

## 5. Code Quality

- [ ] Không có `console.log` debug còn sót?
- [ ] Không có import không dùng?
- [ ] Không có `TODO` hay `FIXME` còn sót (trừ i18n placeholder đã biết)?

## 6. UX cơ bản

- [ ] Loading state được hiển thị khi đang fetch?
- [ ] Error state được hiển thị khi request thất bại?
- [ ] Production create/edit workflow có form có cấu trúc phù hợp với user thật, không dùng JSON/raw payload editor làm luồng chính?
- [ ] Nếu có JSON editor/import/export, nó có được BA/HOW cho phép rõ và chỉ là luồng phụ không?

## Severity Guide

- **critical** — sai logic, i18n miss, production workflow bắt user nhập JSON/raw payload, không đúng spec → PHẢI sửa
- **minor** — code smell, naming, style → nên sửa nhưng không block

## Output Format

```
## Verdict
APPROVE / REQUEST CHANGES

## Issues
- [file:line] mô tả — critical/minor

## Notes
(nếu có)
```
