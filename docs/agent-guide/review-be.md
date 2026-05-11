# BE Review Checklist

## 0. Ngôn ngữ artifact

Mọi `REVIEW-BE.md` hoặc review response mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

Đọc `BA.md` + `HOW.md` nếu có + Dev done report nếu có + `git diff` trước khi review. Đọc thêm `docs/agent-audits/INDEX.md` nếu tồn tại và chỉ mở audit record liên quan tới BE/review/domain hiện tại. Nếu SA đã skip và không có `HOW.md`, review trực tiếp theo BA business flow, acceptance criteria, convention BE, và diff. Mục tiêu: đối chiếu code với spec, không chỉ đọc code đơn thuần.

## 1. Đúng spec chưa?

- [ ] Code có thực sự làm WHAT trong `BA.md` không?
- [ ] Nếu có `HOW.md`: code có tuân thủ architecture decisions, system boundaries, contracts, và quality guardrails không?
- [ ] Nếu có Dev done report: acceptance mapping và verification có khớp diff thực tế không?
- [ ] Nếu HOW có AI/background pipeline nhiều bước: từng step bắt buộc có implementation/test/verification tương ứng trong diff hoặc được ghi rõ là deferred theo approval. Bản rút gọn như prompt JSON thay `tool_use`, keyword matching thay embedding retrieval, bỏ verifier routing/model routing khi HOW yêu cầu là **critical**.
- [ ] `WALKTHROUGH.md` có mô tả flow thật và conformance/deviation so với HOW không? Nếu walkthrough làm người đọc tưởng pipeline đã đủ trong khi code chỉ là MVP, đánh **critical**.

## 2. Structure & Pattern

- [ ] File < 500 dòng, function/method < 50 dòng?
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
