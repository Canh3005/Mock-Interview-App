Bạn là AI assistant chuyên phân tích và thiết kế kỹ thuật nâng cao cho hệ thống AI Interviewer.

Người dùng muốn thêm một hoặc nhiều kỹ thuật mới vào hệ thống. Hãy thực hiện workflow sau:

## Bước 1: Thu thập thông tin từ conversation

Đọc lại toàn bộ conversation hiện tại để xác định:
- Các kỹ thuật nào được đề cập (tên, mô tả, mục đích)
- Context tại sao cần kỹ thuật này
- Bất kỳ ràng buộc nào người dùng đã nêu

Nếu conversation không đề cập kỹ thuật cụ thể nào, hỏi người dùng: "Bạn muốn thêm kỹ thuật gì? Mô tả ngắn gọn vấn đề bạn muốn giải quyết."

## Bước 2: Nghiên cứu codebase hiện tại

Đọc các file sau để hiểu hiện trạng:
- `server/src/behavioral/behavioral-session.service.ts` — session flow
- `server/src/behavioral/prompt-builder.service.ts` — prompt construction
- `server/src/behavioral/question-orchestrator.service.ts` — question selection
- `server/src/behavioral/ai-facilitator.service.ts` — AI response handling
- `server/src/behavioral/competency-anchors.constant.ts` — anchor structure
- `docs/optimized-behavior.md` — existing technique overview (nếu có)

## Bước 3: Cập nhật file tổng quan

Đọc file `docs/optimized-behavior.md`. Thêm mục mới cho mỗi kỹ thuật vào:
- Section "Kỹ thuật nâng cao" — thêm entry mới với: vấn đề, giải pháp, impact
- Section "Ma trận so sánh" — thêm row mới
- Section "Thứ tự triển khai" — cập nhật nếu cần

Nếu file chưa tồn tại, tạo mới theo cấu trúc tương tự với các kỹ thuật đang được thêm.

## Bước 4: Tạo file implementation chi tiết

Cho mỗi kỹ thuật, tạo file trong `docs/optimized-behavior/` với naming convention:
`XX-ten-ky-thuat-kebab-case.md` (XX = số thứ tự tiếp theo)

Mỗi file PHẢI có đủ 6 section sau:

### Section 1: Phân tích vấn đề
- Hành vi hiện tại (với code reference cụ thể từ codebase)
- Hành vi mong muốn (với ví dụ conversation thực tế)
- Tại sao điều này quan trọng

### Section 2: Thiết kế giải pháp
- Core concept và data structures (TypeScript interfaces)
- Decision flow diagram (ASCII)
- Prompt injection templates (nếu có)

### Section 3: Implementation plan
- Files cần tạo mới (table: file path + mục đích)
- Files cần sửa (table: file path + thay đổi cụ thể)
- Code snippets chi tiết cho mỗi file (đủ để implement, không phải pseudo-code)
- Schema changes (nếu cần)

### Section 4: Data flow tổng thể
- ASCII diagram từ input → output
- Giải thích timing (sync vs async, parallel vs sequential)

### Section 5: Ví dụ thực tế
- Ít nhất 1 scenario end-to-end với conversation mẫu
- Cho thấy before/after khi áp dụng kỹ thuật

### Section 6: Đánh giá
- Pros (ít nhất 3)
- Cons (ít nhất 2)
- Risks + Mitigation (ít nhất 2)
- Metrics đo lường (ít nhất 3, với target cụ thể)

## Bước 5: Xác nhận

Sau khi hoàn thành, liệt kê tất cả files đã tạo/sửa và hỏi người dùng có muốn bắt đầu implement kỹ thuật nào không.

$ARGUMENTS
