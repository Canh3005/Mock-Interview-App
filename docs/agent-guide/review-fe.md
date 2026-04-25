# FE Review Checklist

Đọc `BA.md` + `HOW.md` + `git diff` trước khi review. Mục tiêu: đối chiếu code với spec, không chỉ đọc code đơn thuần.

## 1. Đúng spec chưa?

- [ ] UI có thực sự làm WHAT trong `BA.md` không?
- [ ] Tất cả các điểm trong `HOW.md > Frontend Changes` đã được implement không?

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

## Severity Guide

- **critical** — sai logic, i18n miss, không đúng spec → PHẢI sửa
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
