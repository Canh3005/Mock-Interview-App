# BE Review Checklist

Đọc `BA.md` + `HOW.md` + `git diff` trước khi review. Mục tiêu: đối chiếu code với spec, không chỉ đọc code đơn thuần.

## 1. Đúng spec chưa?

- [ ] Code có thực sự làm WHAT trong `BA.md` không?
- [ ] Tất cả các điểm trong `HOW.md > Backend Changes` đã được implement không? Có bước nào bị bỏ qua không?

## 2. Structure & Pattern

- [ ] File < 300 dòng, function/method < 50 dòng?
- [ ] Module mới có đủ `controller / service / dto / entity` không?
- [ ] Controller chỉ nhận request + gọi service — không có business logic trong controller?
- [ ] Không tạo repository class riêng — dùng `@InjectRepository` trực tiếp trong service?

## 3. Auth & Security

- [ ] Route cần auth có `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()`?
- [ ] Có chỗ nào dùng data từ request mà không validate qua DTO không?

## 4. Error Handling

- [ ] Dùng đúng exception: `NotFoundException` / `BadRequestException` / `UnauthorizedException` / `ConflictException`?
- [ ] Mọi error message bằng tiếng Anh?

## 5. Code Quality

- [ ] Không có `any` type?
- [ ] Không có import không dùng?
- [ ] Không có `console.log` debug còn sót?

## 6. Redis (nếu có)

- [ ] Cache key có đủ unique (tránh collision giữa users)?
- [ ] TTL được set — không cache vô thời hạn?

## Severity Guide

- **critical** — sai logic, security hole, không đúng spec → PHẢI sửa
- **minor** — convention, code smell, naming → nên sửa nhưng không block

## Output Format

```
## Verdict
APPROVE / REQUEST CHANGES

## Issues
- [file:line] mô tả — critical/minor

## Notes
(nếu có)
```
