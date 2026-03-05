# Phase 4: Administration, FinOps & B2B Expansion

## Mục tiêu
Dự án được mở rộng ra ngoài phạm vi "Người dùng trực tiếp" (B2C) và tiến tới cấp độ "Thương mại & Quản trị doanh nghiệp" (B2B, B2B2C). Phase này trang bị "hệ thần kinh vận hành" cho quản trị viên, chuyên gia hệ thống theo dõi chi phí AI (FinOps) và thiết kế hệ thống multi-tenant cho cổng Khách hàng doanh nghiệp tuyển dụng.

## Phạm vi công việc

### 1. Module 4.1: Ngân hàng Nội dung & AI Prompts (Knowledge & Engine CMS)
- **CMS Quản trị Curated Library**: Giao diện giúp IT Experts/SMEs chủ động upload bài Leetcode mới, Hidden/Public Test Cases, thêm sách/link tài liệu chất lượng cao vào DB nội bộ.
- **Prompt Engineering Versioning**:
  - Xây dựng UI cấu hình ngầm System Prompt của từng Interview Mode.
  - Cơ chế **Version Control**: Quản lý phiên bản vòng đời Prompt (v1.0, v1.1).
  - Tích hợp tính năng **A/B Testing** (phủ prompt mới lên 5% sample user) và nút **Emergency Rollback** (Lùi version thần tốc nếu AI ảo giác chửi thề).

### 2. Module 4.2: Hệ thống Quan sát & FinOps (Observability)
- **FinOps Dashboard**: Màn hình giám sát và đo đếm token In/Out của LLM, API cost tổng hợp của dịch vụ STT/TTS theo từng giờ/phút.
- **Sandbox Health Check**: Theo dõi trạng thái, resource allocation của cụm Docker chạy trình biên dịch code.
- **Security & Auto-blocking**: Luồng "Auto-kill" - bắt cảnh báo (Alert) tới Slack/Telegram khi tốc độ bào Token hoặc RAM vượt ngưỡng cực lớn, kèm tự động block IP và de-activate tài khoản rác.

### 3. Module 4.3: Quản lý Doanh thu & Người dùng B2C
- Hệ thống Billing, tích hợp cổng thanh toán (Stripe / VNPay / Bank Transfer).
- **Credit-based System**: Áp dụng cước phí theo đơn vị Credits. Cấu hình bảng giá từng vòng linh hoạt theo chi phí server tiêu biểu (VD: Code 10 cr, Kiến trúc 30 cr do tốn token hơn).
- Ghi log minh bạch các giao dịch trừ/tick credit vào Audit Logs. Xử lý chức năng đền bù (Refund Credits) thủ công hỗ trợ CSKH.

### 4. Module 4.4: B2B Enterprise Portal (Cổng Khách hàng Doanh Nghiệp)
- Xây dựng cấu trúc đa người thuê (Multi-tenancy). Tenant A không thấy Tenant B.
- Phát triển UI cho vai trò HR Doanh nghiệp (Client Admin):
  - Tự động nạp gói Assessment Volume lớn (VD: Gói mua sẵn 1000 lượt Candidate test).
  - Khởi tạo Campaign: Generate magic link gửi cho ứng viên để làm bài thi. Link được bọc **White-label UI** (VD: Đính logo công ty client, background custom).
  - Kho tổng hợp Scorecard: HR nhận thẳng bảng điểm tiêu chuẩn về dashboard nội bộ, tóm gọn quyết định Pass/Fail thay vì phải setup phỏng vấn kỹ thuật giai đoạn 1 tốn sức lực của Dev.

## Quản trị Rủi ro & Giải pháp của Phase 4
- **Rủi ro**: SMEs sửa sai System Prompt ở chế độ Production gây hỏng kịch bản của toàn bộ user thực đang thi.
  - *Giải pháp*: Mọi sửa đổi trên CMS về Prompt phải qua Shadow Testing (Tool test tự động với mô hình Ảo) và có Approval/Review step bởi Admin cấp cao.
- **Rủi ro**: Lỗ hổng tài chính do API bị Abuse (DDoS layer 7, spam chat voice sinh token liên tục vào ví chùa).
  - *Giải pháp*: Giới hạn Token Budget (Hard Limit) tính theo từng Session. Hết hạn mức cứng, AI tự ngắt. Ngăn chặn triệt để account đăng ký tự do không có SMS/KYC để bào tiền free-trial.
- **Rủi ro đa luồng B2B**: Lộ kết quả ứng viên doanh nghiệp A cho doanh nghiệp B.
  - *Giải pháp*: Cách ly Row-level Security hoàn toàn trên Database cho các Tenant ID.

## Tiêu chuẩn nghiệm thu (DoD)
- Product Owner có thể nhìn vào Dashboard và tự tin báo cáo số tiền chi trả cho AI/Server của ngày hôm trước so với doanh thu nạp Credits.
- Admin có thể tạo các rule Auto-ban User/IP trên giao diện trong 2 cú click.
- Một cty IT thuê bao gói Enterprise có thể gửi hàng loạt bài Test qua Mail/Link và nhận về Scorecard Pass/Fail cho từng bạn mà không cần nhờ Technical Lead trong công ty thi hộ.
