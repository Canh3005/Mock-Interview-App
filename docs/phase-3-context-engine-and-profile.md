# Phase 3: Context Engine & Candidate Personalization

## Mục tiêu
Dịch chuyển định vị sản phẩm từ một "Khóa luyện thi ngắn hạn" trở thành một "Mentor đồng hành dài hạn". Phase này tập trung vào cụm "Trái tim dữ liệu", quản lý Context, lịch sử phỏng vấn để tăng độ "khôn" và cá nhân hóa trải nghiệm cho từng ứng viên, từ đó phục vụ Retention Rate (tỷ lệ giữ chân người dùng).

## Phạm vi công việc

### 1. Module 0: Hệ thống Quản trị Bối cảnh & Hồ sơ (Context Engine)
- **0.1 Personal Dashboard & Data Hub**:
  - Giao diện Dashboard hiển thị thông tin tĩnh (Static Profile) và thông tin động được phân tích định kỳ.
  - Tích hợp biểu đồ Radar đánh giá dựa trên quá khứ (System Design, DSA, Giao tiếp, Tư duy AI, Tiếng Anh). 
- **0.2 Smart Context Injection Pipeline**:
  - Tối ưu hóa Database cho phép fetch cục JSON định dạng toàn bộ lịch sử năng lực của User.
  - Tính năng "Target Specific Job": Màn hình User upload JD mới/CV mới để overwrite context tạm thời cho một lần phỏng vấn đặc thù (VD: mai em vào FaceBook).
- **0.3 Hệ thống Gamification**:
  - Phát triển hệ thống Badges Badge (Bậc thầy O(1), Kiến trúc sư 10k TPS), Tích điểm Level.
  - Cập nhật Data Visualization (Growth graph) qua nhiều vòng luyện tập.

### 2. Module 1: Phân tích CV-JD Nâng cao (Contextual Pre-Interview)
- **1.2 Trình khớp CV-JD (CV-JD Matching Simulator)**:
  - Agent AI phụ sẽ phân tích GAP giữa JD người dùng nhập vào và CV hiện tại để đưa ra gợi ý chiến lược ôn thi tức thì.
  - **Calibrate Warm-up feature**: Ép AI 5 phút đầu tiên hỏi câu đơn giản thăm dò xem liệu các Keyword trong CV kia là thật hay ứng viên nhồi (Keyword stuffing) để "chập" điểm số khởi điểm hợp lý.
- **1.1.b Mock Campaign Mode**:
  - User có thể xếp chuỗi 3 vòng liên tục với bối cảnh liền mạch (Dữ liệu luân chuyển: Yếu điểm vòng 1 sẽ bị hỏi dò lại ở vòng 2). 

### 3. Module 3.3: Nền tảng Bán chéo (Smart Cross-selling)
- Xây dựng Trigger recommendation ngay trên màn hình bảng điểm: Nếu thí sinh test tốt phần coding, hệ thống nảy popup khuyên dùng thử System Design có discount.

## Quản trị Rủi ro & Giải pháp của Phase 3
- **Rủi ro**: Truyền quá nhiều bối cảnh cũ, transcript các phiên phỏng vấn trước vào System Prompt gây lấp đầy LLM Window, làm loãng trí nhớ và chi tiêu cực nhiều Token một cách phung phí.
  - *Giải pháp*: Xây dựng Data Summarizer Agent chạy nền kiểu Async (bất đồng bộ) vào buổi đêm. Agent này cuộn tất cả nhật ký phỏng vấn cũ thành một đoạn tóm tắt Insight cực mạnh độ dài 150 words (VD: "Candidate này code Python rành nhưng hay sai mép mảng phần Đệ quy"). System chỉ đẩy Core Insight này vào trận phỏng vấn mới.
- **Rủi ro**: AI quá thiên vị profile xịn mà coi nhẹ màn trình diễn thật.
  - *Giải pháp*: Context Engine chỉ đóng vai trò "gợi ý định hướng câu hỏi", trọng số chấm điểm vẫn đặt hoàn toàn vào log của phiên thi hiện hành.

## Tiêu chuẩn nghiệm thu (DoD)
- Người dùng có trang Dashboard sinh động với biểu đồ năng lực Radar tự cập nhật sau mỗi buổi thi Mock.
- User có thể chọn chế độ "nhắc lại", AI sẽ chủ động chào: "Tuần trước bạn còn yếu luồng xác thực Oauth2, tuần này tốt hơn không, chúng ta thử lại nhé".
- Popup Cross-sell chạy đúng logic ngữ cảnh dựa trên điểm số (Pass vòng này -> Gợi ý bán vòng tiếp theo).
