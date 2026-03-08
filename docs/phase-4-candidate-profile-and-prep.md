# Phase 4: Trải nghiệm Tiền phỏng vấn & Hồ sơ ứng viên (Preparation & Profile)

## Mục tiêu
Dịch chuyển sản phẩm từ "công cụ dùng một lần" thành một nền tảng đồng hành dài hạn (Mentor) với "Skill Passport". Xây dựng bộ não Context Engine để AI tự cá nhân hóa luồng phỏng vấn dựa trên CV ứng viên và mô tả công việc (JD) họ mong muốn.

## Lộ trình & Phạm vi công việc

### Epic 1: Candidate Profile & Personal Dashboard
Tạo trung tâm quản trị hồ sơ cá nhân của người dùng.
- **Skill Passport (Hồ sơ năng lực)**: Trực quan hóa dữ liệu tĩnh (Kinh nghiệm, hệ sinh thái ngôn ngữ) và chỉ số động (Biểu đồ Radar đo System Design, DSA, Tiếng Anh chuyên ngành, Kỹ năng mềm).
- **Static Context Storage**: Toàn bộ CV/Kinh nghiệm được chuyển hóa thành JSON payload siêu nhẹ nạp tự động vào System Prompt của LLM ngay khi bắt đầu luyện tập để giữ độ trễ khởi tạo phòng thi < 200ms.

### Epic 2: Smart Context Engine & CV-JD Matching 
Động cơ nạp bối cảnh và cá nhân hóa chiến dịch phỏng vấn thực tế.
- **Smart Context Injection (Tiêm ngữ cảnh)**: Ứng viên tự chọn 1 trong 2 luồng:
  - *Luồng Cố định*: Lấy lịch sử từ Skill Passport. AI sẽ biết dồn hỏa lực vào điểm yếu lần trước (ví dụ: "Lần trước bạn yếu tính nhất quán của DB, nay ta thử lại").
  - *Luồng Mục tiêu (Target Job)*: Upload/Paste CV mới nhất cùng JD mới nhất để Override (ghi đè) phiên phỏng vấn đó mà không phá hỏng profile gốc. File JD cũng sẽ đi qua luồng Asynchronous Parsing tương tự CV.
- **Cơ chế Warm-up (Khởi động định chuẩn)**: AI nhận diện phân cực trình độ từ CV và JD; để tránh bị ảo giác bởi CV "nhồi từ khóa/Keyword stuffing", AI luôn bắt đầu bằng 1-2 câu hỏi cơ bản thăm dò nền tảng để "calibrate" (đo lường) trình độ thực trước khi xoáy sâu.

### Epic 3: Gói luyện tập (Modular Architecture Setup)
Xây dựng luồng đăng ký gói thi cho user.
- **Quick Practice (A La Carte)**: Phỏng vấn nhanh một vòng duy nhất không cần Resume, chỉ cần cấu hình UI 30s (Role, Thâm niên, Domain).
- **Mock Campaign**: Chuỗi 3-4 vòng kết hợp liên tiếp mô phỏng toàn cầu phỏng vấn Big Tech (Gồm Behavioral -> Live Coding -> System Design).
- **CV-JD Assessment (Phân tích & Đánh giá CV)**: Một chế độ độc lập (tương tự như vòng Behavioral, Live Coding hay System Design).
  - Ứng viên tải lên File JD (hoặc dán text), hệ thống sẽ xử lý JD sang định dạng JSON giống như quy trình xử lý CV.
  - Hệ thống tiến hành Mapping và đối chiếu chuyên sâu giữa CV JSON và JD JSON.
  - Đưa ra báo cáo phân tích độ phù hợp (Fit Score), nhận diện gap (khoảng cách kỹ năng), và gợi ý điểm cần cải thiện trên CV để tối ưu hóa cơ hội trúng tuyển.
- **Hệ thống tín chỉ (Credit-based) Tiering**: Thu phí tín chỉ linh động theo tiêu hao Token môi trường của từng chế độ. (Vd: CV-JD Assessment = 5 Credits, Behavioral = 10 Credits, Live Coding = 15 Credits, System Design = 30 Credits).

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro AI làm cấu hình khởi tạo quá lâu**: Trích xuất dữ liệu từ PDF CV qua LLM mất 10-15s dẫn đến sập web lúc loading hoặc User khó chịu.
  - *Giải pháp*: CV Parsing được xử lý Asynchronous ngay từ lúc User đăng kí hệ thống/cập nhật hồ sơ, lưu vào MongoDB dưới dạng JSON Schema. Lúc khởi tạo phỏng vấn chỉ truy vấn DB JSON thô.
