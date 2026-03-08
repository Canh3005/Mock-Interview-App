# Phase 6: Vận hành AI, Quản trị Admin & FinOps (Operations & FinOps)

## Mục tiêu
Trang bị công cụ cho đội ngũ vận hành nội bộ (SME, System Admin, DevOps) để kiểm soát "hơi thở" của hệ thống Sandbox và Model AI. Đảm bảo chất lượng bài Test chuyên sâu chuẩn Big Tech đồng thời tối ưu hóa chi phí API (FinOps).

## Lộ trình & Phạm vi công việc

### Epic 1: Quản trị Ngân hàng Nội dung & Prompts (Knowledge & Prompt Engineering)
Nơi "rót hồn" cho AI phản xạ tốt hơn.
- **Quản lý Đề & Test Cases (Code)**: Nâng cấp luồng duyệt bài tập Live Coding, cấu hình bộ Test Case (Public/Hidden) trước khi đẩy vào Docker Judge0.
- **Curated Library (Thư viện Tinh tuyển)**: Nền tảng cho SME (Subject Matter Experts) nhập liệu sách/bài báo IT. AI chỉ được phép trích xuất tài liệu từ nguồn này gợi ý cho ứng viên nhằm loại bỏ ảo giác (Hallucination) từ các bài SEO rác.
- **Cơ chế Versioning Prompts**: Khi Admin thay đổi Persona tàn khốc của AI (ví dụ: gắt gỏng hơn), Prompt sẽ lưu nháp thành `v1.2` để chạy A/B Testing với nhóm nhỏ trước khi Rollout cho toàn hệ thống. Tích hợp nút **Khẩn cấp Rollback** nếu phát hiện lỗi logic.

### Epic 2: FinOps & System Observability (Giám sát Chi phí & Hiệu năng tự động)
Giao diện Monitor Dashboard realtime bảo vệ túi tiền và sự ổn định hệ thống.
- **Tài chính AI (FinOps Metrics)**: Theo dõi lượng Token Input/Output của LLM theo từng phút. Thống kê chi phí cụ thể của các Request Text-to-Speech (TTS) và Speech-to-Text (STT) đắt đỏ.
- **Cảnh báo Thông minh (Alerting)**: Bắn log thẳng về kênh Slack/Telegram của DevOps nếu chi phí Token hoặc tải CPU Sandbox Container vượt ngưỡng bình thường (Báo hiệu BOT cào hoặc User ác ý).
- **Rate-Limiting & Auto-kill tiến trình**: 
  - Kịch bản: Kẻ xấu gửi vòng lặp vô hạn `while(true)` hoặc mã ăn RAM trên Judge0.
  - Ngay lập tức Admin Auto-kill container đó, lưu Audit dán nhãn Red Flag IP và tự động khoá tài khoản B2C ngay lập tức.

### Epic 3: User & Billing Management (Quản trị Người dùng & Doanh thu B2C)
Quản trị vòng đời tài khoản B2C và Token Credit của ứng viên cá nhân.
- **Quản lý Gói Credit (Ví ảo)**: Cấp phát/Thu hồi thủ công khi hệ thống lỗi gây thiệt hại cho user. Xem lại lịch sử Mock Interview phục vụ khiếu nại (chỉ Mở khóa ghi âm/log khi User mở cờ báo cáo sai phạm hệ thống).
- **Audit Log bắt buộc**: Mọi thao tác thao túng dữ liệu User của Admin đều phải lưu vết ID nhân sự vĩnh viễn, chống việc nhân viên nội bộ tự ý buff Token Credit để bán chui.

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro Cập nhật Prompt làm hỏng luồng Phỏng vấn đang chạy**:
  - *Giải pháp*: Versioning Prompts phải được Fetch tại thời điểm `session_start` và Cached Lock ngay lập tức. Nếu ứng viên đang phỏng vấn với Prompt v1.1, thì dù Admin có Apply v1.2 thì luồng cũ vẫn dùng v1.1 cho đến khi kết thúc.
- **Rủi ro sập cụm Sandbox AWS/GCP do rò rỉ bộ nhớ**:
  - *Giải pháp*: Cài đặt Timeout bắt buộc ở tầng Docker (ví dụ 10s là SIGKILL toàn bộ tiến trình người dùng) và cô lập tài nguyên `memory-swap` hạn chế chặt chẽ.
