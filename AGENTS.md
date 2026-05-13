# Bootstrap Cho Codex Agent

Khi nào tôi bảo chạy luồng `dev`, `ba`, `sa`, `be`, `fe`, `review`, `test`, `pa`, và `fix` , phải đọc`CLAUDE.md` trước. Nếu không thì thôi, cứ làm đúng yêu cầu

`CLAUDE.md` là entrypoint chuẩn cho các luồng agent như `ba`, `sa`, `be`,
`fe`, `review`, `test`, `pa`, và `fix`. Sau khi đọc file này, tiếp tục theo
guide và artifact feature tương ứng được nhắc trong đó.

Không bắt đầu workflow trực tiếp từ `docs/agent-guide/*` nếu `CLAUDE.md`
chưa được đọc trong turn hiện tại.

## GitNexus Code Intelligence

Nếu MCP/tool GitNexus có sẵn trong phiên làm việc, ưu tiên dùng GitNexus để
tìm kiếm và hiểu codebase trước khi đọc file thủ công:

- Đọc danh sách repo/index trước qua GitNexus resources/tools nếu có.
- Dùng GitNexus `query` để tìm module, flow, symbol hoặc behavior liên quan.
- Dùng GitNexus `context` để xem ngữ cảnh quanh symbol/file quan trọng trước
  khi chỉnh sửa.
- Dùng GitNexus `impact` hoặc `detect_changes` khi thay đổi có thể ảnh hưởng
  nhiều module, API, flow nghiệp vụ hoặc test.
- Nếu GitNexus chưa được cấu hình, index bị stale, hoặc tool không khả dụng,
  fallback về `rg`, đọc file trực tiếp, rồi tiếp tục làm đúng yêu cầu.
- Sau thay đổi lớn, nếu có quyền và phù hợp, nhắc người dùng chạy lại
  `gitnexus analyze --skip-agents-md` để cập nhật index mà không ghi đè
  hướng dẫn agent hiện tại.
