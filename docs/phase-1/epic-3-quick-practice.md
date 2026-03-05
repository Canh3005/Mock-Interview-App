# Epic 3: Trải nghiệm thi Nhanh (Quick Practice)

Epic này giúp tối ưu hóa phễu người dùng, cho phép user chưa cần đăng ký quá rườm rà có thể nhảy ngay vào giải thuật toán để trải nghiệm nền tảng.

## Task 3.1: Flow Guest/Anonymous User
**Mô tả:** Cấu trúc luồng trải nghiệm cho người dùng không cần tài khoản.
**Chi tiết công việc:**
1. Tạo một cơ chế cấp phát Temporary Session ID (JWT hoặc bộ nhớ tạm) cho User ẩn danh.
2. Thiết kế cơ chế lưu trữ lịch sử nộp bài thuật toán ở Local Storage (hoặc Database giới hạn / dọn theo chu kỳ) cho đến khi người dùng quyết định đăng ký để lưu vĩnh viễn mức điểm.

## Task 3.2: Configuration & Problem Selection
**Mô tả:** Giao diện cho phép người chơi chọn bài.
**Chi tiết công việc:**
1. Xây dựng trang danh sách Ngân hàng bài tập (Problem List): Có chức năng Lọc (Filter) theo độ khó, ngôn ngữ, Tag/Topic thuật toán.
2. Thêm nút "Random Exercise" - ngẫu nhiên bốc 1 câu dễ/trung bình để nén sâu user vào luồng giải bài lập tức.

## Task 3.3: Link tới Live Coding Environment
**Mô tả:** Chuyển người dùng vào phòng giải thuật toán.
**Chi tiết công việc:**
1. Gắn ghép đầu ra của hành động chọn bài với Route tới /interview-room/:problem_id.
2. Truyền tham số cấu hình ngôn ngữ vào UI (VD: Bật sẵn cửa sổ Java).
