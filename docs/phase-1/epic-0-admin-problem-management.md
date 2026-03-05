# Epic 0: Admin Portal & Problem Management (Tối ưu cho Online Judge)

Dưới góc nhìn của một System Architect xây dựng hệ thống Code Challenge cường độ cao (như LeetCode, HackerRank), việc quản lý "Ngân hàng đề thi" không đơn giản chỉ là thao tác CRUD thông thường. Một bài toán lỗi (sai Test case, không có đáp án khả thi) lọt ra ngoài sẽ phá hỏng toàn bộ kỳ thi của ứng viên.

Epic này tái cấu trúc lại luồng Admin nhằm đảm bảo **Độ tinh cậy tuyệt đối của Dữ liệu Đề thi (Data Integrity)** trước khi nó tới tay người dùng.

## 1. Phân tích & Cải tiến Kiến trúc (Critique)
Bản phác thảo ban đầu dùng giao diện Form CRUD cơ bản là chưa đủ độ "trưởng thành" cho một nền tảng OJ:
1. **Rủi ro Test Case Sai (Broken Test Cases):** Nếu Admin gõ sai Expected Output, ứng viên sẽ kẹt vĩnh viễn. Giải pháp: Admin **bắt buộc** phải cung cấp một `Author Solution` (Code đáp án chuẩn). Hệ thống sẽ tự động chạy Code đáp án này qua Test Cases, nếu Pass 100% thì bài mới được đổi trạng thái thành `PUBLISHED`.
2. **Rủi ro Quá tải Browser vì Test Case lớn:** Bảng Master-Detail nhập tay từng ô chỉ hợp với mảng nhỏ `[1,2,3]`. Test case thực tế của Leetcode có thể là mảng 100,000 số nguyên (nặng vài MB). Load text vài MB lên bảng Frontend sẽ gây crash (Out of memory). Giải pháp: Cần cơ chế **Upload Test Cases bằng File (JSON/ZIP)** hoặc UI tách biệt (Paginated Test Cases UI). 
3. **Thiếu Quản trị Vòng đời (Lifecycle Management):** Đề bài cần có Trạng thái (Draft -> Verified -> Published -> Archived). Không được sửa Test Cases một khi đề đã Published (Vì sẽ làm sai lệch điểm của các submissions cũ).

## 2. Thiết kế Lại Luồng Dữ liệu (Backend API)

### Task 0.1: RBAC & Lifecycle State Machine
1. **RolesGuard Middleware**: Phân rã quyền truy cập `USER` và `ADMIN`.
2. Bổ sung trường `status` cho bảng `problems`: `DRAFT` (Đang soạn), `VERIFIED` (Đã được test bằng Author Solution thành công), `PUBLISHED` (Hiển thị cho người dùng), `ARCHIVED` (Gỡ xuống lịch sử).

### Task 0.2: Problem & Template API (Tích hợp Verification)
1. Cụm API CRUD cơ bản cho Title, Description (Markdown), Difficulty.
2. **`POST /api/admin/problems/:id/verify` (Cốt lõi Admin)**: 
   - Hệ thống OJ chuyên nghiệp gọi đây là luồng **"Set Solution"**.
   - Admin gửi mã nguồn của giải pháp hoàn hảo (Author Solution code).
   - Backend âm thầm đẩy vào Judge0 Sandbox test thử Solution này với mọi Test Cases đang có của đề bài.
   - Nếu chạy thành công -> Chuyển trạng thái sang `VERIFIED`.

### Task 0.3: Test Case Management (Chịu tải lớn)
1. **API Upload Bulk Testcases (`POST /api/admin/problems/:id/testcases/upload`)**: Tiếp nhận file nén ZIP cực lớn (chứa `1.in`, `1.out`, `2.in`, `2.out`). Backend giải nén, parse và dội vào CSDL (hoặc S3 Object Storage) thay vì bắt Admin form nhập tay.
2. Update/Delete API cho các Test Case nhỏ lẻ vẫn giữ lại cho mục đích debug.

## 3. Thiết kế Lại Trải Nghiệm Admin (Frontend UI)

Màn hình Quản trị Bài toán phải là một **Cỗ máy làm việc độc lập (A workspace)**.

### Task 0.4: Layout Trang Quản Trị (Dashboard)
1. Tạo folder page `app/admin/`. Chặn guard Role ở cấp Layout.
2. Sidebar: Trực quan hiển thị Thống kê Tổng số bài tập (Published / Draft).

### Task 0.5: Màn hình Studio Tạo Đề Thi (Problem Studio)
Thay vì Form 1 trang dài ngoằng, chúng ta xây một **Problem Builder Workspace** chia các bước tuần tự (Wizard Flow) hoặc Đa Tab siêu tinh gọn:

1. **Tab 1 - Core Content (Form)**: Title, Difficulty, Tags, và vùng WYSIWYG Editor cho Markdown/LaTex mô tả bài toán.
2. **Tab 2 - Test Cases (Data Grids & Upload Zone)**:
   - Khu vực Upload `.zip` test cases lớn.
   - Bảng Grid có Phân trang (Pagination) để list các test cases đã add. Bảng này **giới hạn hiển thị 200 ký tự đầu** của `Input/Output` để chống Crash Web browser nếu Data quá khủng.
3. **Tab 3 - Coding Environment (Khu vực của Admin)**:
   - Component Monaco Editor tương tự trang User.
   - Nơi admin cấu hình `Starter Code` và ẩn bên dưới là cấu hình `Driver Code` (Tuỳ chọn cấu hình Hàm Main parse stdin ra biến).
4. **Tab 4 - Verification & Publish (Khu vực Test lại Hệ Thống)**:
   - Admin gõ **Solution Code (Mã đáp án)**. Bấm nút `Verify System`.
   - Admin được xem Animation hệ thống chạy chéo Test Cases vs Đáp án như cách thí sinh làm.
   - Nếu Xanh toàn bộ (100% Pass) -> Nút `Publish to Users` sáng lên. (Tuyệt đỉnh UX chặn Bug từ trong trứng nước).
   - Nút `Freeze` khóa đề bài chống sửa lung tung.

Sự tách bạch này không chỉ giúp Admin làm việc năng suất mà còn là bảo chứng rủi ro (Risk Mitigation) tốt nhất cho Phase 1, đảm bảo không có bất kì đề bài gãy hỏng nào được đưa ra cho người thi thật.
