# KẾ HOẠCH TỔNG THỂ DỰ ÁN: MOCK INTERVIEW AI

Dựa trên bản thiết kế chi tiết Hệ thống Mock Interview AI, dự án được chia thành 7 Phase (Giai đoạn) phát triển từ nền tảng lõi (Core) đến mở rộng thương mại B2B.

Việc chia nhỏ các Phase giúp quản trị rủi ro tốt hơn (đặc biệt là rủi ro về chi phí Token và chống hack Sandbox), tránh ôm đồm tính năng ở một thời điểm và đảm bảo liên tục có thể mang sản phẩm ra thị trường (Time-to-Market) để nhận phản hồi (Feedback) sớm nhất.

## Lộ trình các Phase
- [Phase 1: MVP Core & Live Coding](./phase-1-mvp-core-execution.md) - *Tạo ra giá trị cốt lõi, tập trung vào khả năng tương tác AI và an toàn hệ thống Sandbox.*
- [Phase 2: Mở rộng Vòng thi Hành vi & Kỹ năng AI](./phase-2-behavioral-and-ai-prompting.md) - *Xây dựng tính năng phỏng vấn HR (Behavioral) và Pair Programming.*
- [Phase 3: Mở rộng Vòng thi Thiết kế Hệ thống](./phase-3-system-design-whiteboard.md) - *Tập trung vào System Design với Virtual Whiteboard và Diagram Architecture.*
- [Phase 4: Trải nghiệm Tiền phỏng vấn & Hồ sơ ứng viên](./phase-4-candidate-profile-and-prep.md) - *Xây dựng "Skill Passport", Context Engine ghép nối CV - JD và các chế độ thi.*
- [Phase 5: Trải nghiệm Hậu phỏng vấn & Cá nhân hóa](./phase-5-post-interview-and-growth.md) - *Scorecard chi tiết, Actionable Learning Path (Lộ trình học tập) và Gamification.*
- [Phase 6: Vận hành AI, Admin & FinOps](./phase-6-internal-ops-finops.md) - *Quản trị Prompts, kiến thức (Knowledge Base) và giám sát chi phí tự động.*
- [Phase 7: Mở rộng Doanh nghiệp B2B](./phase-7-b2b-enterprise-portal.md) - *Cổng thông tin cho Doanh nghiệp, White-label và bán gói Campaign phỏng vấn số lượng lớn.*

## Nguyên tắc Thiết kế Cốt lõi cho Đội ngũ Phát triển
1. **Zero-Trust với User Code**: Bất cứ đoạn mã nào ứng viên viết trong luồng System Design/Live Coding đều phải chạy trong môi trường cách ly (Sandbox) có giới hạn tài nguyên và tự hủy.
2. **Mandatory Quoting (Trích dẫn Bắt buộc)**: AI không bao giờ được nhận xét suông. Mọi điểm trừ (Red Flag) về thái độ, tư duy giao tiếp đều phải trích dẫn lại lời nói của ứng viên ở một Timestamp (nhãn thời gian) cụ thể.
3. **FinOps by Design**: Bất kì API Call nào tới LLM, STT, TTS đều được quy ra chi phí. Luôn ưu tiên dùng lượng Token tối thiểu (ví dụ: gửi JSON payload thay vì ảnh screenshot trong System Design) và tích hợp Alert cảnh báo chi phí ngay từ Phase đầu.
4. **Latency is King (Độ trễ là Vua)**: Giảm độ trễ phản hồi <= 2s cho luồng giao tiếp Voice. AI cần tính năng Streaming và "Facilitator" (Chủ động ngắt lời/mớm lời nếu nhận diện user im lặng) để tạo ảo giác như người thật.

*(Chi tiết công việc và quản trị rủi ro cho từng Phase được xem ở các file đính kèm).*
