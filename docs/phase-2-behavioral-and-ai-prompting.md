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

### Epic 2: Vòng Kỹ năng AI Prompting & Pair Programming
Đánh giá khả năng sử dụng các công cụ AI (như Copilot/ChatGPT) của ứng viên để tăng năng suất công việc thực tế, chống lạm dụng "copy-paste" không não.
- **Giao diện Pair-Programming**: Cấp một đoạn mã chứa bug ẩn hoặc "code smell" kết hợp với một Widget Chat AI tích hợp ngay bên cạnh IDE của Phase 1.
- **Phân tích Hành vi (Log Tracking)**: 
  - Hệ thống ghi log (Nhật ký) toàn bộ các câu Prompt ứng viên nhập.
  - Đánh giá khả năng chia nhỏ vấn đề (*Chain of Thought*) khi prompt.
- **Bẫy Ảo giác (Hallucination Traps)**: Trong một số bài test, AI cố tình sinh ra đoạn code có lỗi logic bề sâu. Ứng viên chỉ được điểm tối đa nếu phát hiện ra ảo giác này và sửa lại, thay vì nhắm mắt copy-paste đoạn code lỗi vào phần Submit.

## Quản trị Rủi ro Kỹ thuật & Product
- **Rủi ro AI trừ điểm cứng nhắc**: Ứng viên có thể trả lời tốt nhưng thiếu một chi tiết nhỏ khiến AI đánh trượt.
  - *Giải pháp*: AI được Prompt theo Persona "Facilitator", chủ động gợi ý thêm (Ví dụ: "Bạn đã nói về Action, vậy Result là gì?").
- **Cost Token của chat dài**: Vòng Behavioral đòi hỏi hội thoại dài qua lại.
  - *Giải pháp*: Giới hạn số lượt Ping-Pong (vd tối đa 3-4 lượt trao đổi cho 1 câu hỏi), nén (summarize) lịch sử chat trước khi gửi luồng context mới cho LLM.
