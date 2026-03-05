# KẾ HOẠCH TỔNG THỂ DỰ ÁN: MOCK INTERVIEW AI

Dựa trên bản thiết kế chi tiết Hệ thống Mock Interview AI, dự án được chia thành 4 Phase phát triển từ nền tảng lõi đến mở rộng thương mại B2B.

Việc chia nhỏ các Phase giúp quản trị rủi ro tốt hơn (đặc biệt là rủi ro về chi phí Token và chống hack Sandbox) và đảm bảo liên tục có thể mang sản phẩm ra thị trường (Time-to-Market) để feedback sớm.

## Lộ trình các Phase
- [Phase 1: MVP Core & Live Coding](./phase-1-mvp-core-execution.md) - *Tạo ra giá trị cốt lõi, tập trung vào khả năng tương tác AI và an toàn hệ thống Sandbox.*
- [Phase 2: Full Interview Modes & Feedback System](./phase-2-full-interview-and-feedback.md) - *Mở rộng toàn bộ các vòng phỏng vấn chuyên sâu và hệ thống Scorecard báo cáo chân thực.*
- [Phase 3: Context Engine & Candidate Personalization](./phase-3-context-engine-and-profile.md) - *Xây dựng tính năng "Skill Passport" cá nhân hóa và Gamification để giữ chân người dùng dài hạn.*
- [Phase 4: Administration, FinOps & B2B Expansion](./phase-4-admin-ops-and-b2b.md) - *Trưởng thành thành sản phẩm thương mại B2B, quản trị chi phí LLM và công cụ cho chuyên gia vận hành.*

## Nguyên tắc Thiết kế Cốt lõi cho Đội ngũ Phát triển
1. **Zero-Trust với User Code**: Bất cứ đoạn mã nào ứng viên viết trong luồng System Design/Live Coding đều phải chạy trong môi trường cách ly (Sandbox) có giới hạn tài nguyên và tự hủy.
2. **Mandatory Quoting (Trích dẫn Bắt buộc)**: AI không bao giờ được nhận xét suông. Mọi điểm trừ (Red Flag) về thái độ, tư duy giao tiếp đều phải trích dẫn lại lời nói của ứng viên ở một Timestamp (nhãn thời gian) cụ thể.
3. **FinOps by Design**: Bất kì API Call nào tới LLM, STT, TTS đều được quy ra chi phí. Luôn ưu tiên dùng lượng Token tối thiểu (ví dụ: gửi JSON payload thay vì ảnh screenshot trong System Design) và tích hợp Alert cảnh báo chi phí ngay từ Phase đầu.
4. **Latency is King (Độ trễ là Vua)**: Giảm độ trễ phản hồi <= 2s cho luồng giao tiếp Voice. AI cần tính năng Streaming và "Facilitator" (Chủ động ngắt lời/mớm lời nếu nhận diện user im lặng) để tạo ảo giác như người thật.

*(Chi tiết công việc và quản trị rủi ro cho từng Phase được xem ở các file đính kèm).*
