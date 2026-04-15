# Phase 2: Mở rộng Vòng thi Hành vi & Kỹ năng sử dụng AI (Behavioral & AI Prompting)

> **Chi tiết triển khai đã được tách thành các Epic file riêng trong [`docs/phase-2/`](./phase-2/README.md)**

## Mục tiêu
Tích hợp các vòng thi đánh giá kỹ năng mềm (Culture Fit, Giao tiếp) và kỹ năng thời đại mới (sử dụng AI trong Pair Programming). Các tính năng này sử dụng nền tảng tương tác AI On-demand đã xây dựng từ Phase 1 và nâng cấp khả năng tương tác tự nhiên, mớm lời (tương tác như Facilitator) và phân tích luồng suy nghĩ.

## Lộ trình & Phạm vi công việc

### Epic 1: Vòng Sàng lọc HR & Behavioral (STAR Simulator)
Bổ sung công cụ mô phỏng phỏng vấn hành vi, tập trung vào kỹ năng giao tiếp và xử lý tình huống thực tế của ứng viên.
- **Cấu trúc trả lời STAR**: Yêu cầu người dùng trả lời theo khung STAR (Situation, Task, Action, Result).
- **AI Facilitator (Người dẫn dắt)**: Khác với việc chấm điểm cứng nhắc, AI sẽ phân tích câu trả lời theo realtime (hoặc near-realtime chunks) để mớm lời nếu ứng viên thiếu ý (Ví dụ: *"Kết quả cuối cùng tác động đến hệ thống ra sao, bạn có nhớ con số định lượng không?"*).
- **Chấm điểm giao tiếp tinh vi**: Đánh giá dựa trên độ súc tích, logic cấu trúc câu thay vì chỉ scan từ khóa. Áp dụng triệt để *Mandatory Quoting* (Trích dẫn bằng chứng bắt buộc) khi chấm điểm trừ.

### Epic 2: Vòng Pair Programming
Đánh giá khả năng làm việc thực tế với code trong môi trường có hỗ trợ AI — mô phỏng trải nghiệm "lập trình viên + AI copilot" trong công việc hàng ngày.
- **Giao diện IDE tích hợp AI**: Cấp một đoạn mã chứa bug ẩn hoặc "code smell", ứng viên làm việc trong môi trường IDE (từ Phase 1) với một Widget Chat AI tích hợp ngay bên cạnh.
- **Nhiệm vụ kép**: Ứng viên vừa phải debug/cải thiện code, vừa phải biết khai thác AI đúng cách để hỗ trợ — không phải chỉ "chạy" mà còn phải hiểu code cuối cùng submit.
- **Bẫy Ảo giác (Hallucination Traps)**: Trong một số bài test, AI cố tình sinh ra đoạn code có lỗi logic bề sâu. Ứng viên chỉ được điểm tối đa nếu phát hiện ra ảo giác và tự sửa lại, thay vì nhắm mắt copy-paste đoạn code lỗi vào phần Submit.
- **Chấm điểm tổng hợp**: Kết hợp chất lượng code submit + log hành vi tương tác AI để đưa ra điểm cuối.

### Epic 3: Vòng AI Prompting
Đánh giá thuần túy khả năng ra lệnh (prompt) cho AI — đo lường tư duy chia nhỏ vấn đề, độ chính xác trong diễn đạt yêu cầu, và nhận thức về giới hạn của AI.
- **Bài tập Prompt Engineering**: Ứng viên được giao một yêu cầu nghiệp vụ (vd: viết hàm xử lý dữ liệu, tạo test case) và chỉ được phép tương tác qua Chat AI — không tự viết code trực tiếp.
- **Log Tracking & Chain of Thought**: Hệ thống ghi lại toàn bộ lịch sử prompt của ứng viên. Đánh giá dựa trên khả năng chia nhỏ vấn đề (*Chain of Thought*): ứng viên prompt một câu hỏi lớn hay biết dẫn dắt AI từng bước?
- **Chấm điểm Prompt Quality**: Đánh giá theo các tiêu chí — độ rõ ràng của prompt, số lần cần clarify lại, khả năng phát hiện kết quả AI sai và re-prompt đúng hướng.

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro AI trừ điểm cứng nhắc**: Ứng viên có thể trả lời tốt nhưng thiếu một chi tiết nhỏ khiến AI đánh trượt.
  - *Giải pháp*: AI được Prompt theo Persona "Facilitator", chủ động gợi ý thêm (Ví dụ: "Bạn đã nói về Action, vậy Result là gì?").
- **Cost Token của chat dài**: Vòng Behavioral đòi hỏi hội thoại dài qua lại.
  - *Giải pháp*: Giới hạn số lượt Ping-Pong (vd tối đa 3-4 lượt trao đổi cho 1 câu hỏi), nén (summarize) lịch sử chat trước khi gửi luồng context mới cho LLM.
