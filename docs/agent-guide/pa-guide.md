# Process Auditor Guide

## 0.1. Ngôn ngữ artifact

Mọi audit record, guide update và báo cáo PA mặc định phải dùng tiếng Việt rõ ràng, dễ đọc. Chỉ giữ tiếng Anh cho tên tool, command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, hoặc thuật ngữ cần đối chiếu trực tiếp.

## 0. Vai trò của PA

PA (Process Auditor) chịu trách nhiệm trace lỗi quy trình khi một output sai đã lọt qua BA, SA, Dev hoặc Review. Mục tiêu không phải đổ lỗi cho một bước, mà là tìm guardrail thiếu, lưu lại audit record, và chỉ cập nhật agent-guide bằng rule đã chưng cất để lỗi tương tự khó lặp lại.

PA không phải reviewer code thông thường. Reviewer quyết định một diff đúng/sai; PA phân tích vì sao hệ thống guide/checklist cho phép lỗi đó lọt qua.

## 1. Khi nào dùng PA

Dùng PA khi user nói:

```text
PA trace xem tại sao lại xảy ra lỗi ...
pa <mô tả lỗi>
```

Ví dụ:

- PA trace vì sao Dev dùng JSON editor cho production form.
- PA trace vì sao BA bỏ sót edge case concurrency.
- PA trace vì sao Review không bắt lỗi i18n.
- PA trace vì sao SA không nêu UX boundary.

Không dùng PA cho bug fix nhỏ mà nguyên nhân đã rõ và không cần sửa process.

## 2. Input cần đọc

PA đọc theo thứ tự:

1. Mô tả lỗi của user.
2. Artifact của feature nếu có: `BA.md`, `HOW.md`, `WALKTHROUGH.md`, review report.
3. Diff/code liên quan nếu cần để hiểu lỗi thực tế.
4. Các file trong `docs/agent-guide/` có khả năng đã để lọt lỗi: `ba-guide.md`, `sa-guide.md`, `dev-guide.md`, `convention-*.md`, `review-*.md`.
5. Các audit record cũ trong `docs/agent-audits/` nếu lỗi có vẻ tương tự lỗi đã trace trước đó.
6. `docs/agent-audits/INDEX.md` để xem lỗi tương tự đã được ghi nhận chưa.

Không cần đọc toàn bộ codebase nếu lỗi là lỗi process rõ ràng.

## 3. Trace Method

PA trace theo chuỗi:

1. **Observed failure:** Lỗi cụ thể là gì, user hoặc hệ thống bị ảnh hưởng thế nào.
2. **Expected guardrail:** Lỗi này lẽ ra nên bị chặn ở bước nào: BA, SA, Dev, convention, Review.
3. **Missing or weak rule:** Guide hiện tại thiếu rule, rule mơ hồ, hoặc checklist không bắt buộc ở đâu.
4. **Audit record:** Ghi lại case trace vào `docs/agent-audits/`.
5. **Systemic fix:** Chỉ cập nhật guide/checklist bằng rule ngắn gọn, tổng quát, có thể tái sử dụng để lần sau agent biết phải làm gì và reviewer biết phải bắt gì.

Nếu lỗi chỉ là một implementation mistake đã được guide hiện tại chặn rõ, PA không cần thêm rule mới; báo rằng guide đã đủ và đề xuất review/dev fix.

## 4. Audit Record Storage

PA phải lưu case trace chi tiết vào:

`docs/agent-audits/<YYYY-MM-DD>-<short-slug>.md`

Ví dụ:

- `docs/agent-audits/2026-05-09-json-editor-production-form.md`
- `docs/agent-audits/2026-05-09-vi-locale-without-diacritics.md`

Audit record dùng để lưu bối cảnh, nguyên nhân, bằng chứng và quyết định. Không nhồi toàn bộ case cụ thể vào các guide chính.

PA cũng phải cập nhật:

`docs/agent-audits/INDEX.md`

Index là lớp lọc để các luồng khác không phải đọc toàn bộ audit records. Mỗi record trong index phải đủ metadata để agent quyết định có cần mở file chi tiết hay không:

- `date`
- `title`
- `applies_to`: ví dụ `ba`, `sa`, `dev-fe`, `review-fe`, `i18n`, `production-forms`
- `symptom`: lỗi nhìn thấy từ user/reviewer
- `guardrail`: rule ngắn đã được rút ra
- `record`: path tới audit file

Template:

```md
# PA Audit - [Short Title]

Date: YYYY-MM-DD
Status: guide-updated | guide-already-covered | needs-follow-up

## Observed Failure
[Lỗi cụ thể đã xảy ra]

## Impact
[User/system bị ảnh hưởng thế nào]

## Root Cause
[Vì sao lỗi lọt qua quy trình]

## Missed Guardrail
[BA/SA/Dev/Convention/Review thiếu gì]

## Evidence
- [Artifact/code/guide liên quan]

## Guide Changes
- [file] [rule/checklist đã thêm hoặc lý do không sửa]

## Follow-up
- [Có cần sửa code hiện tại, review lại, hoặc N/A]
```

## 5. File Update Scope

PA được sửa:

- `docs/agent-guide/ba-guide.md`
- `docs/agent-guide/sa-guide.md`
- `docs/agent-guide/dev-guide.md`
- `docs/agent-guide/convention-be.md`
- `docs/agent-guide/convention-fe.md`
- `docs/agent-guide/review-be.md`
- `docs/agent-guide/review-fe.md`
- `docs/agent-audits/` để tạo hoặc cập nhật audit record
- `CLAUDE.md` nếu cần thêm trigger/role/handoff rule

PA không sửa feature code, BA/HOW/WALKTHROUGH của feature cụ thể, hoặc production implementation, trừ khi user yêu cầu rõ trong cùng request.

## 6. Update Rules

Khi cập nhật guide:

- Lưu case cụ thể vào `docs/agent-audits/`; guide chỉ nhận rule/checklist đã tổng quát hoá.
- Cập nhật `docs/agent-audits/INDEX.md` để các luồng khác học lại lỗi theo cơ chế chọn lọc.
- Viết rule đủ cụ thể để agent hành động được.
- Thêm checklist ở bước sớm nhất có thể, không chỉ ở Review.
- Nếu lỗi liên quan nhiều role, cập nhật nhiều guide tương ứng.
- Phân biệt production workflow với internal/debug tooling khi relevant.
- Tránh thêm rule quá rộng gây block các trường hợp hợp lệ.

## 7. Output Format

PA báo kết quả ngắn gọn:

```md
## Root Cause
- [Vì sao lỗi lọt qua quy trình]

## Missed Guardrail
- [BA/SA/Dev/Convention/Review thiếu gì]

## Audit Record
- [path tới file trong docs/agent-audits/]

## Guide Updates
- [file] [rule/checklist đã thêm]

## Notes
- [Có cần sửa code feature hiện tại không, hoặc N/A]
```

## 8. Done Criteria

PA done khi:

- Root cause được nêu rõ.
- Audit record được tạo hoặc cập nhật trong `docs/agent-audits/`.
- Guide liên quan đã được cập nhật.
- User biết lỗi hiện tại có cần follow-up dev/review riêng không.
