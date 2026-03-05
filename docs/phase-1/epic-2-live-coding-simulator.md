# Epic 2: Live Coding UI & Code Execution Engine (Multi-Problem UI)

Epic này tập trung vào sự phức tạp trên UI khi không chỉ phải xử lý giao diện Editor + Chat Ideas, mà còn phải quản lý điều hướng cho N bài toán cùng lúc (Multi-Tab / Pagination).

## Task 2.0: Problem Navigation Header (Quản lý đa bài toán)
**Mô tả:** Bộ Dashboard trên cùng cho phép bao quát buổi thi phỏng vấn.
**Chi tiết công việc:**
1. Xây dựng Thanh Header Bar với thông số: 
   - Đồng hồ đếm ngược báo động (Global Timer Countdown).
   - Nút Nộp Bài Cuối cùng (Finish Interview - Submit All).
2. Xây dựng `Problem Pagination / Tab List`:
   - Hiển thị danh sách các câu đã rút thăm "Bài 1 | Bài 2 | Bài 3".
   - UI thể hiện trạng thái từng bài: Chưa xem (Xám), Đang làm dở (Vàng), Đã nộp Pass 100% (Xanh), Đã nộp tạch Test Case (Đỏ).
3. Đấu nối với Redux Action `changeActiveProblem(problemId)`.

## Task 2.1: Pre-coding Idea Chat (Scope cho từng phần tử)
**Mô tả:** Quy trình phỏng vấn hỏi hướng xử lý (Idea) cần áp dụng riêng cho mỗi bài.
**Chi tiết công việc:**
1. Mặc định Editor bị Overlay khóa mờ.
2. `MiniChatBox` hiển thị riêng biệt dựa trên `activeProblemId` (Lấy dữ liệu từ `problemsMap[id].sessionData.preCodingChat`).
3. Ứng viên gửi ý tưởng (Idea/Reasoning).
4. Hệ thống Server chốt mở khóa, cập nhật field `is_editor_unlocked` trên dòng `session_problems` của bảng trong DB và báo Web Socket / Redux mở sáng trình soạn thảo cho Bài đó.
5. *Trải nghiệm*: Khi ứng viên chuyển qua Tab Bài 2, Editor Bài 2 vẫn khóa bắt đầu hỏi Idea từ đầu, chuyển lại Tab Bài 1 đã Unlocked thì Editor Bài 1 vẫn mở để code.

## Task 2.2: Phân tách Nút Run và Submit theo Giới Hạn
**Mô tả:** Phân quyền gọi API vào Sandbox với cơ chế kiểm soát chặt chẽ từng bài lẻ.
**Chi tiết công việc:**
1. **Nút "Run Code":** Tốc độ nhanh. Không giới hạn số lần, chặn rate-limit spam 5s/click. Cập nhật `actual_output` vào local state cho user tự sửa.
2. **Nút "Submit":** 
   - Gửi Test trên toàn cục Hidden cases.
   - Thể hiện counter "Còn lại 3/5 lần".
   - Khi vượt ngưỡng 5 của `submitCount`, nút Submit bị Disabled (xám hoàn toàn) -> User phải chuyển qua làm bài khác, không sửa được code câu này nữa.

## Task 2.3: On-Demand Hint (Gợi ý định hướng)
**Mô tả:** Phao cứu sinh cho việc "kẹt" code, có lưu vết tính điểm trừ.
**Chi tiết công việc:**
1. Nút `Ask AI / Hint` bên cạnh lỗi Console.
2. Logic nén ngầm (Under the hood): Gửi lịch sử Chat Idea + Mã nguồn hiện hành của Bài toán Đang Chọn lên AI.
3. AI gợi ý một dòng Text. Trả về Frontend. Tăng biến `hintCount` của phần tử trong mảng Redux lên 1 cộng vào CSDL `session_problems`.

## Task 2.4: Batch System Evaluation Phase (End Game)
**Mô tả:** AI tiếp quản và chấm điểm toàn bộ nỗ lực của kỳ thi.
**Chi tiết công việc:**
1. UI: Khi click "Finish Mutilple Interview" -> Web hiện màn hình Loding "AI đang phân tích bảng điểm của tổng hòa các câu...".
2. Backend gom một JSON Multi-dimensional Array gồm Data toàn bộ các câu, Số Submit sai của từng bài, Lịch sử chat từng bài đẩy lên Prompt.
3. Kết quả LLM được parse trên UI dưới dạng Bảng Phân Tích Radar (Code Quality, Algorithm Core, Problem Solving skills, Hint-reliance).
