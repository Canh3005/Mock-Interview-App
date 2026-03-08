# Phase 5: Trải nghiệm Hậu phỏng vấn & Cá nhân hóa (Feedback & Growth Ecosystem)

## Mục tiêu
Tối đa hóa "giá trị đọng lại" của phiên phỏng vấn bằng hệ thống Scorecard khắt khe, minh bạch như thật và tích hợp lộ trình học tập để kích thích người dùng học hỏi, quay lại trải nghiệm hệ thống nhiều lần (Tỷ lệ Retention dài hạn).

## Lộ trình & Phạm vi công việc

### Epic 1: Bảng điểm Động & Mandatory Quoting
- **Báo cáo linh hoạt (Dynamic Scorecard)**: Tự nhận diện mode thi để hiển thị Scorecard phù hợp (Nếu thi System Design thì Report bảng System Design, không hiển thị Time/Space Complexity của DSA).
- **Cơ chế Bắt buộc Trích dẫn (Mandatory Quoting)**: Lập trình Engine AI phải nộp lại Timestamp + Trích dẫn (Quote Text) ứng viên đã nói khi đưa ra điểm đỏ (Red Flags) thay vì chê chung chung. 
  - *Ví dụ UX hiển thị*: "Biểu hiện thiếu kiên nhẫn. [Trích xuất Timestamp 15:20]: *'Cái này đã nói rồi nhưng mà...'*" thay vì "Thái độ chưa tốt".

### Epic 2: Lộ trình Tinh tuyển & Gợi ý (Actionable Learning Path)
Nhằm giữ chân người dùng ở lại hệ sinh thái bằng kiến thức chuyên sâu thực sự.
- **Curated Database vs Rác SEO**: Thay vì dùng AI cào bài viết (search web) tạo ra các link lý thuyết "how to code java" rối rắm, Engine Feedback móc nối thẳng đến CSDL tinh tuyển do bộ phận Chuyên gia (SME) duyệt sẵn (VD: Giới thiệu đúng chương 3 sách Designing Data-Intensive Applications).
- **Smart Cross-sell (Bán chéo thông minh)**: AI dỗ dành user chi thêm tiền mua Credit thi tiếp bằng lời nhận xét. VD: *"Bạn giải thuật toán `O(N)` hoàn hảo, chúc mừng! Nhưng còn kiến trúc System Design triệu user, bạn có tự tin với 15 phút luyện thêm chứ?"*.

### Epic 3: Động lực học & Gamification
Biến hóa các Report khô khan thành chiến tích chia sẻ mạng xã hội.
- **Hệ thống Badges chuyên sâu IT**:
  - Cấp phù hiệu như: *Bậc thầy O(1)*, *Cảnh sát Clean Code*, *Kiến trúc sư chịu tải 10k TPS*.
- **Đồ thị Tăng trưởng (Growth Graph)**: Cập nhật chỉ số lên Personal Dashboard để ứng viên nhận ra "Ồ, System Design của mình đã tăng qua 10 lần thi".

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro User IT phẫn nộ đòi khiếu nại kết quả**: Người IT rất duy lí và ghét AI "dạy đời" thiếu bằng chứng.
  - *Giải pháp*: Tuyệt đối tin tưởng cơ chế Mandatory Quoting. Nếu AI không trích xuất được Quote chính xác do STT Lỗi (Mic giật), UI không được hiển thị điểm trừ mà phải chuyển thành "Điểm cần quan sát thêm ở vòng sau".
