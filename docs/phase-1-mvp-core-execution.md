# Phase 1: MVP Core, Multi-Problem & On-Demand AI Interview

## Mục tiêu
Xây dựng một hệ thống phỏng vấn thuật toán chuyên nghiệp, hỗ trợ cấu hình phiên thi N bài tập, chạy mã an toàn trên trình duyệt, có UI/UX cho quản trị viên lẫn thí sinh, và sử dụng **On-Demand AI** (Batch) thay vì Realtime để tính điểm tối ưu chi phí LLM.

## Lộ trình & Phạm vi công việc

### Epic 0: Admin Portal & Problem Management (Xây Móng Dữ Liệu)
- Phân quyền RBAC (Role-Based Access Control) tách bạch `ADMIN` và `USER`.
- Xây dựng cụm API CRUD quản lý Ngân hàng đề thi (`Problems`) và các bộ Kiểm thử (`TestCases` - gồm Public và Hidden).
- Dựng giao diện Quản trị viên tại Routing `/admin/problems` với Form nhập liệu phong phú (Markdown Editor cho đề, Grid cho TestCase).

### Epic 1: Foundation Architecture & Session Setup (Cấu hình Phòng Thi)
- Thiết kế hệ thống Database dạng `Master-Detail`: `interview_sessions` lưu tổng thời gian/bảng điểm và `session_problems` lưu trạng thái của N câu hỏi lẻ trong một phiên.
- API Khởi tạo phiên thi: Nhận cấu hình độ khó, số lượng bài, tự động Random Pick đề và tạo luồng Master-Detail.

### Epic 2: Live Coding UI (Multi-Problem Pagination)
- **Problem Navigation (Giao diện thí sinh)**: Thanh Header hiển thị N bước (Bài 1 | Bài 2...) với đồng hồ Master Countdown.
- **Redux State Dictionary**: Map O(1) giữ nguyên State của từng bài độc lập khi user chuyển Tab qua lại (Đoạn Code dở, Nội dung chat Idea khóa Mở/Khoá IDE).
- **Phân tách Run/Submit**: 
  - `Run Code` (chạy thử no-limit tỷ lệ 5s/lần). 
  - `Submit Code` (chạy ẩn, tính vào giới hạn 5 lần, fail => khóa luôn Bài đó).
- Tích hợp Sandbox (Judge0/Piston) trên Docker để giới hạn CPU/Memory và chặn RCE.

### Epic 3: On-Demand Hint & Batch Evaluation (Điểm tựa AI)
- **Nút Hỏi AI (On-Demand Hint)**: Trigger gửi `Idea + Code hiện tại + Lỗi` -> Lấy gợi ý định hướng dạng Text. Chấm một điểm trừ (Hint Count ++).
- **Batch Processing**: Khi Submit Tất Cả hoặc Hết Giờ. Backend gom cục JSON siêu to (Toàn bộ chat, Code, Số Hint, % Test Case của Tất Cả Câu) => Gửi LLM chấm Scorecard radar 1 lần duy nhất để review Năng lực logic của thí sinh.

## Chi tiết tài liệu (Epics)
- `docs/phase-1/epic-0-admin-problem-management.md`
- `docs/phase-1/epic-1-foundation-architecture.md`
- `docs/phase-1/epic-2-live-coding-simulator.md`
- `docs/phase-1/epic-3-quick-practice.md`
- `docs/phase-1/technical-risks-and-solutions.md`
