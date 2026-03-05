# Phase 2: Full Interview Modes & Feedback System

## Mục tiêu
Dựa trên nền tảng của Phase 1, Phase 2 nhằm hoàn thiện 3 module phỏng vấn còn lại, biến một "trình chấm code" thành một hệ thống AI Mock Interviewer toàn diện hỗ trợ đủ thể loại đánh giá từ văn hóa công ty, kiến trúc hệ thống, cho đến kỹ năng sử dụng AI. Đồng thời, xây dựng hệ thống Báo cáo (Scorecard) chuyên nghiệp.

## Phạm vi công việc

### 1. Mở rộng Hệ thống Phỏng vấn (Module 2)
- **Vòng 2.1: Behavioral & STAR Simulator**
  - Prompting kịch bản khai thác Culture Fit và Behavior (Situation, Task, Action, Result).
  - Tích hợp tính năng "Facilitator": AI liên tục đóng vai trò mớm lời, dẫn dắt câu chuyện nếu candidate đi lạc đề hoặc quên định lượng đầu ra thay vì đánh trượt ngay.
- **Vòng 2.3: AI Prompting & Pair Programming**
  - Tạo giao diện "cửa sổ đôi": một IDE code có bug/khuyết điểm và một cửa sổ Chat giả lập công cụ AI nội bộ.
  - Xây dựng giám khảo ẩn chuyên follow-up để đánh giá kỹ năng phân chia bài toán "Chain of Thought" và phát hiện ảo giác AI (Hallucination checking) của người dùng.
- **Vòng 2.4: System Design & Architecture (Virtual Whiteboard)**
  - Tích hợp công cụ vẽ sơ đồ mã nguồn mở (như Excalidraw, TLDraw).
  - **JSON Metadata Extraction:** Bỏ qua các mô hình AI Vision (đắt đỏ và dễ lỗi) bằng cách đọc trực tiếp JSON Metadata từ các block chuẩn (LB, Redis, Database) người dùng kéo thả để đẩy vào LLM.
  - Tính năng "Curveball Injector": Logic tự động thả thử thách mới (đổi requirement) khi AI nhận diện user đã vẽ xong 80% luồng cơ bản một cách quá dễ dàng.

### 2. Xây dựng Báo cáo & Phân tích Động (Module 3)
- **3.1 Bảng điểm Tiêu chuẩn động (Dynamic Scorecard):**
  - Xây dựng format báo cáo động tương thích với vòng mà thí sinh vừa thi (VD: thi kiến trúc chỉ vẽ biểu đồ lỗi chịu tải, không vẽ test cases).
  - **Mandatory Quoting:** Lập trình Parser bắt buộc LLM phải trả về object có chứa block \`evidence_timestamp\`. Hệ thống sẽ link timestamp này đến File Replay (Bản ghi phỏng vấn) để làm chứng cứ cho một điểm số thấp.
- **3.2 Lộ trình Hành động Tinh tuyển (Actionable Learning Path):**
  - Hệ thống gợi ý chương sách, khoá học chính xác dựa theo Curated DB chuyên môn thay vì lấy từ khoá Search Google rỗng tuếch.

### 3. Đa dạng hóa Tính cách Phỏng vấn viên (Module 1.3 - Persona)
- Hệ thống Persona Configurator cho phép chuyển đổi system prompts (Khó tính, Hỏi xoáy đáp xoay, Quan tâm, Đa nghi từ các biên...). Tập trung vào "độ sắc bén" của câu hỏi thay vì thay đổi giọng điệu vật lý (voice).

## Quản trị Rủi ro & Giải pháp của Phase 2
- **Rủi ro**: Các bản vẽ System Design rất phức tạp, truyền liên tục trạng thái ảnh (Vision AI image to text) vào mô hình sẽ mất nhiều thời gian, nghẽn mạng và tốn tiền.
  - *Giải pháp*: Dùng kỹ thuật Differential Prompting. Mỗi 5s chỉ truyền cho LLM những block vừa bị đổi (VD: User Add Kafka node -> Backend Kafka). Bỏ qua hoàn toàn render hình ảnh mà dùng Graph JSON.
- **Rủi ro**: Lấy điểm yếu Behavior để đánh giá tiêu cực sẽ làm phật lòng tệp user đặc thù IT.
  - *Giải pháp*: AI cần có logic khen trước, chê sau, đóng khung chê trách bằng con số thực tế và trích dẫn trực tiếp lời ứng viên để tránh nhạy cảm.

## Tiêu chuẩn nghiệm thu (DoD)
- 4 Mode phỏng vấn được tích hợp trong Menu, có thể chuyển đổi mượt mà.
- User có thể kéo Data Model, vẽ luồng request và bị AI nhắc nhở bắt lỗi "Single Point of Failure" qua voice lập tức.
- Feedback Email kèm link Scorecard được tự động gửi trong vòng 20 giây kể từ khi user bấm kết thúc. Báo cáo có trích dẫn timestamp.
