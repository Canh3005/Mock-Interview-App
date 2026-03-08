# Phase 3: Mở rộng Vòng thi Thiết kế Hệ thống (System Design & Architecture Mock)

## Mục tiêu
Xây dựng vòng phỏng vấn khó nhất và mang lại giá trị cao nhất cho các ứng viên Mid/Senior: System Design. Giai đoạn này đòi hỏi giao diện mô phỏng bảng trắng (Virtual Whiteboard) cùng khả năng dịch thuật kiến trúc hình ảnh sang dữ liệu JSON để AI có thể "hiểu" chính xác hệ thống ứng viên vẽ.

## Lộ trình & Phạm vi công việc

### Epic 1: Giao diện Virtual Whiteboard có Cấu trúc (Structured Canvas)
Cung cấp không gian để ứng viên vẽ kiến trúc thay vì chỉ nói chuyện suông.
- **Kéo - Thả (Drag & Drop) thông minh**: Cung cấp các Node/Block chuẩn xác (Load Balancer, API Gateway, Redis, Kafka, PostgreSQL, Client...). 
- **JSON Metadata Extraction**: Thay vì xuất ảnh chụp (Screenshot) giao diện vẽ (tốn kém Token Vision AI và dễ sinh ảo giác nhận diện hình ảnh), bảng vẽ sẽ tự động trích xuất kiến trúc thành mạng lưới dữ liệu (JSON Node-Edge Topology).
- **Kết hợp Giải thích Giọng nói (Voice Walkthrough)**: Ứng viên vừa vẽ vừa ấn phím tắt để ghi âm giải thích (STT) luồng đi của dữ liệu.

### Epic 2: Engine Đánh giá System Design
Hệ thống AI xử lý file JSON kiến trúc và File Text (lời giải thích).
- **Phân tích Trade-off (Đánh đổi)**: AI tự đối chiếu kiến trúc ứng viên vẽ với yêu cầu tải (TPS/Storage) của đề bài để đánh giá xem hệ thống có bị Over-engineering hoặc Under-engineering không.
- **Tính năng Curveball (Tiêm tình huống phát sinh đột ngột)**:
  - Khi hệ thống nhận diện ứng viên đã hoàn thành mượt mà >80% logic ban đầu, Engine sẽ kích hoạt một "Curveball" trên chat: *"Nếu traffic sự kiện Black Friday đột ngột tăng gấp 50 lần, kiến trúc hiện tại của bạn sẽ nghẽn ở đâu? Bạn muốn thay đổi thế nào?"*.
  - *Lưu ý cơ chế Trigger*: Chỉ ném Curveball nếu ứng viên đang làm tốt để đánh giá Seniority, tuyệt đối không ném nếu ứng viên đang bế tắc ở bước đầu để tránh đánh tan tâm lý của họ.

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro AI không hiểu bản vẽ chằng chịt**: Vision Model thường kém trong việc hiểu các đường mũi tên vẽ đè lên nhau.
  - *Giải pháp*: Áp dụng triệt để "JSON Metadata Extraction" - ép ứng viên dùng thư viện Node chuẩn (dựa trên React Flow hoặc excalidraw có mapping ID) để có output text.
- **Rủi ro Latency khi luân chuyển khối dữ liệu lớn**: Gửi đoạn JSON mô tả thiết kế lớn cho LLM mất nhiều thời gian.
  - *Giải pháp*: Stream kết quả dần dần về UI; sử dụng UI loading skeleton hấp dẫn ("AI đang biên dịch hệ thống của bạn...", "Đang test tải chịu lỗi...") để câu giờ trải nghiệm.
