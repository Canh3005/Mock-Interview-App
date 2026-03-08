# Phase 7: Cổng Doanh nghiệp B2B (B2B Enterprise Portal)

## Mục tiêu
Giai đoạn mở rộng chiến lược (Mỏ vàng thực sự của sản phẩm). Thay vì thu những khoản tiền lẻ từ tập User B2C mua Credit, hệ thống sẽ B2B Sandbox (Bán nhãn trắng hoặc gói Campaign lớn) cho các phòng Nhân sự (HR) của các công ty IT khác muốn dùng dịch vụ này làm bài Test vòng gửi xe.

## Lộ trình & Phạm vi công việc

### Epic 1: Hệ thống Sub-Admin & Quản trị Tổ chức (B2B IAM)
Phân quyền truy cập cho doanh nghiệp đối tác (Org Admin).
- **Luồng Workflows Client-HR**: Công ty A mua gói "500 Lượt Phỏng Vấn (Campaigns)". HR của Công ty A được cấp quyền vào một Dashboard quản lý riêng (Sub-admin).
- **Mua bán Gói Doanh nghiệp (Bulk Billing)**: Chuyển đổi từ mô hình Credit lẻ tẻ (B2C) sang mô hình Volume/Seat-based (B2B Contract).

### Epic 2: Giao diện Nhãn Trắng (White-label) & Tự tạo Campaign
Các công ty muốn giữ thể diện thương hiệu khi gửi link cho ứng viên.
- **Tuỳ chỉnh Branding**: Cho phép HR upload Logo công ty, chỉnh sửa màu sắc chủ đạo của UI phòng thi và lời mời email gửi ra tự động cho ứng viên.
- **Campaign Creator**: Nhân sự HR có thể tự ráp các bài test từ Ngân hàng đề thi chung (hoặc họ tự Upload test case riêng ngầm) - ví dụ thiết lập luồng "1 System Design + 1 Behavioral" giới hạn trong thời gian 45 phút cho chức danh *Mid-level Backend*.

### Epic 3: Hệ thống Báo cáo Nhân sự Toàn cảnh (B2B HR Dashboard)
Xóa bỏ sức lao động của kỹ sư nội bộ (Không cần mang Tech Lead đi phỏng vấn vòng 1 nữa).
- **Bảng Xếp Hạng Ứng viên (Leaderboard)**: Gom N ứng viên thi cùng 1 Campaign, AI chấm điểm tự động và Sorting từ cao xuống thấp kèm Bảng phân cực điểm yếu/điểm mạnh.
- **Trình chiếu Bằng chứng Cốt lõi**: HR có thể click vào ứng viên Top 1 để xem Summary nhận xét tổng quan và chỉ được nghe đoạn Audio (Playback) cắt những "Red Flag" khắt khe nhất của ứng viên do AI bóc tách (Nhờ cơ chế Mandatory Quoting) để đưa ra phán quyết cuối cùng Mời Phỏng Vấn Vòng Trong hay Không.

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro Rò rỉ Ngân hàng đề Test riêng của Công ty B2B**:
  - *Giải pháp*: Áp dụng Tenant Isolation nghiêm ngặt tại Database (Row-Level Security) đối với Table `Hidden TestCases` hoặc `Custom Prompts` của các Công ty. Đảm bảo Công ty A không thể query trộm bộ câu hỏi riêng của Công ty B. 
- **Khó khăn tích hợp định danh SSO**: 
  - *Giải pháp*: Xây dựng hạ tầng tích hợp OAuth2/SAML sớm để nhân viên HR dể dàng login bằng Microsoft/Google Workspace của Doanh nghiệp.
