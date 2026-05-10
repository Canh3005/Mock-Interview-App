# Bootstrap Cho Codex Agent

Trước khi chạy bất kỳ workflow nào trong repository này, phải đọc
`CLAUDE.md` trước.

`CLAUDE.md` là entrypoint chuẩn cho các luồng agent như `ba`, `sa`, `be`,
`fe`, `review`, `test`, `pa`, và `fix`. Sau khi đọc file này, tiếp tục theo
guide và artifact feature tương ứng được nhắc trong đó.

Không bắt đầu workflow trực tiếp từ `docs/agent-guide/*` nếu `CLAUDE.md`
chưa được đọc trong turn hiện tại.

Trước khi báo done cho bất kỳ artifact nào được tạo hoặc cập nhật trong
`docs/features/` hoặc `docs/agent-guide/`, phải chạy cổng kiểm tra ngôn ngữ
artifact trong `CLAUDE.md`: phần giải thích, ghi chú, test case, mapping và
verdict phải dùng tiếng Việt rõ ràng. Chỉ giữ tiếng Anh cho command, route,
API contract, code identifier, status kỹ thuật, exception gốc, hoặc thuật ngữ
cần khớp chính xác.
