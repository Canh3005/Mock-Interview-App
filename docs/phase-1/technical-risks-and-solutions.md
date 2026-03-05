# Quản trị Rủi ro Kỹ thuật & Giải pháp Phase 1 (Core Execution)

Tiền đề của Phase 1 là xây dựng một nền tảng thực thi lệnh của người dùng đáng tin cậy.

## Risk: Lỗ hổng bảo mật Remote Code Execution (RCE)
**Mô tả Rủi ro:** Mã nguồn của User được Submit lên máy chủ có thể chứa kịch bản phá hoại hệ thống (đọc cắp file hệ thống `.env`, tạo backdoor đảo quyền máy chủ chạy Node/DB, đào coin).

**Các Task giải quyết:**
1. **Sử dụng Code Engine tiêu chuẩn Sandbox**: Thay vì tự build từ đầu, hãy cân nhắc sử dụng phiên bản Tự host (Self-hosted) của **Judge0** hoặc **Piston**. Chúng đã làm rất tốt việc sandbox hóa quá trình biên dịch code.
2. **Network Isolation (Cách ly mạng):** Sandbox chạy mã độc phân bổ trong một Private Network kín không được phép đâm ra internet public. Chặn mọi port HTTP(80/443), SSH, v.v.
3. **Resource Capping (Giới hạn tài nguyên):** Set giới hạn CPU < 0.5 Core và RAM < 256MB cho mỗi lệnh run.
4. **Timeout Rule (Ngắt vô hạn):** Nếu thuật toán có While (true) infinite loop, container phải bị kill tự động sau 3 - 5s (Time Limit Exceeded - TLE).
5. **Đặc quyền (Privilege):** Process chạy code ứng viên phải được thiết lập là user "nobody" phi đặc quyền. Khóa tuyệt đối quyền truy cập vào Filesystem bên ngoài của Server cha.
