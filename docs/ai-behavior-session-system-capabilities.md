# Năng lực hệ thống AI cần có để chạy behavior session

Tài liệu này mô tả các năng lực mà một hệ thống giả lập phỏng vấn toàn diện bằng AI cần có để chạy **behavior session** đúng nghĩa.

Behavior session không chỉ là hỏi các câu dạng "Tell me about a time...". Một session tốt phải kiểm tra được pattern hành vi, độ thật của kinh nghiệm, khả năng cộng tác, khả năng chịu probe và mức độ trưởng thành theo level.

## 1. Behavior competency modeling

Hệ thống phải biết behavior session đang đo năng lực gì, ví dụ:

- Ownership.
- Collaboration.
- Conflict handling.
- Communication clarity.
- Handling ambiguity.
- Prioritization.
- Learning from failure.
- Stakeholder management.
- Leadership maturity.
- Integrity/accountability.
- Impact orientation.
- Adaptability.

Lý do: nếu không có competency model, AI chỉ hỏi câu behavioral chung chung và không biết đang kiểm tra tín hiệu nào.

## 2. Role-level calibration

Hệ thống phải điều chỉnh chuẩn đánh giá theo role và level:

- Junior: reliability, learning, task ownership.
- Middle: independent execution, collaboration, problem solving.
- Senior: ambiguity, trade-off, cross-team impact, mentoring.
- Lead/Manager: delegation, conflict mediation, stakeholder alignment, team health.

Lý do: cùng một câu trả lời có thể đạt với Junior nhưng yếu với Senior. Behavior session phải chấm theo expectation thật của level, không chấm theo cảm giác chung.

## 3. Question selection

Hệ thống phải chọn behavioral question phù hợp với:

- Role.
- Level.
- JD.
- CV/profile.
- Previous weak areas.
- Session goal.
- Interview duration.

Lý do: behavior session không nên hỏi ngẫu nhiên. Mỗi câu hỏi phải phục vụ một competency hoặc một hiring risk cần kiểm chứng.

## 4. Probe generation

Hệ thống phải sinh follow-up/probe theo câu trả lời thật của user:

- Hỏi rõ context.
- Hỏi vai trò cá nhân.
- Hỏi decision.
- Hỏi conflict/trade-off.
- Hỏi metric/result.
- Hỏi stakeholder impact.
- Hỏi failure/reflection.
- Hỏi "nếu làm lại thì sao".

Lý do: behavioral interview thật nằm ở follow-up, không nằm ở câu hỏi mở đầu. Nếu thiếu probe, session chỉ kiểm tra khả năng kể chuyện đã chuẩn bị sẵn.

## 5. Evidence extraction

Hệ thống phải trích xuất evidence từ câu trả lời:

- User làm gì.
- Team làm gì.
- Vấn đề là gì.
- Ai liên quan.
- Quyết định nào được đưa ra.
- Kết quả ra sao.
- Có số liệu không.
- Có bài học không.
- Có dấu hiệu overclaim không.

Lý do: chấm behavior phải dựa trên evidence, không chấm theo cảm giác câu trả lời nghe hay.

## 6. Generic answer detection

Hệ thống phải phát hiện câu trả lời quá mẫu:

- Nhiều từ đẹp nhưng thiếu chi tiết.
- Không có timeline.
- Không có metric.
- Không rõ vai trò cá nhân.
- Không có constraint.
- Không có mâu thuẫn thật.
- Không có consequence.
- Không sống sót qua follow-up.

Lý do: behavioral answers rất dễ bị học thuộc. Hệ thống cần phân biệt "well-spoken" với "credible".

## 7. STAR and structure assessment

Hệ thống phải đánh giá cấu trúc trả lời:

- Situation có rõ không.
- Task/goal có cụ thể không.
- Action có phải hành động cá nhân không.
- Result có đo được không.
- Reflection có thật không.

Lý do: cấu trúc giúp câu trả lời dễ hiểu, nhưng hệ thống cũng phải tránh chấm cao câu trả lời chỉ vì nó đúng format mà thiếu substance.

## 8. Session memory

Hệ thống phải nhớ pattern trong toàn buổi:

- User luôn thiếu metric.
- User hay nói "we" thay vì "I".
- User né phần conflict.
- User trả lời tốt câu đầu nhưng yếu khi bị probe.
- User có mâu thuẫn giữa các câu chuyện.
- User có cải thiện sau feedback không.

Lý do: behavior session cần đánh giá pattern hành vi, không chỉ từng câu riêng lẻ.

## 9. Adaptive interview control

Hệ thống phải biết điều khiển flow:

- Khi nào hỏi sâu.
- Khi nào chuyển câu.
- Khi nào tăng độ khó.
- Khi nào challenge.
- Khi nào yêu cầu câu trả lời ngắn hơn.
- Khi nào dừng probe vì đủ evidence.
- Khi nào hỏi câu khác để kiểm chứng lại competency.

Lý do: nếu không có orchestration, AI sẽ hoặc hỏi lan man, hoặc probe quá nhiều vào một điểm không cần thiết.

## 10. Rubric-based scoring

Hệ thống phải chấm theo rubric rõ:

- Specificity.
- Personal contribution.
- Impact.
- Structure.
- Ownership.
- Collaboration.
- Reflection.
- Maturity.
- Authenticity.
- Probe resilience.

Lý do: user cần biết mình yếu ở dimension nào, không chỉ nhận điểm tổng.

## 11. Level-aware feedback

Feedback phải nói rõ:

- Với level hiện tại, câu trả lời này đạt hay chưa.
- Thiếu evidence gì.
- Tín hiệu nào làm interviewer nghi ngờ.
- Cần bổ sung chi tiết nào.
- Cách trả lời tốt hơn.
- Câu trả lời đang giống Junior/Mid/Senior ở đâu.

Lý do: feedback behavioral nếu không theo level thì rất dễ chung chung và khó hành động.

## 12. Interviewer persona simulation

Hệ thống nên mô phỏng nhiều kiểu interviewer:

- Friendly.
- Silent/low-feedback.
- Skeptical.
- Detail-oriented.
- Senior engineering manager.
- Product-oriented.
- Cross-functional stakeholder.

Lý do: behavior session thật phụ thuộc nhiều vào style interviewer. User cần luyện với nhiều kiểu áp lực.

## 13. Pressure and constraint simulation

Hệ thống có thể tạo áp lực như:

- Giới hạn thời gian.
- Yêu cầu trả lời trong 90 giây.
- Bị ngắt vì lan man.
- Bị challenge: "Tôi chưa thấy vai trò của bạn rõ."
- Bị yêu cầu đưa metric.
- Bị hỏi lại khi câu trả lời né vấn đề.

Lý do: behavioral interview thật không chỉ kiểm tra câu chuyện, mà kiểm tra cách user giữ bình tĩnh khi bị soi sâu.

## 14. CV/JD-based behavioral mining

Hệ thống phải biết lấy chất liệu từ CV/JD:

- Từ project trong CV sinh câu hỏi ownership.
- Từ "led team" sinh câu hỏi leadership.
- Từ "improved performance" sinh câu hỏi impact.
- Từ JD yêu cầu stakeholder management sinh câu hỏi conflict/prioritization.

Lý do: behavior session tốt phải bám vào claim thật của candidate và expectation thật của role.

## 15. Risk signal detection

Hệ thống cần phát hiện hiring risk:

- Overclaiming.
- Blame shifting.
- Low ownership.
- Poor self-awareness.
- Weak collaboration.
- Defensive response.
- No measurable impact.
- Inability to reflect.
- Inconsistent story.
- Communication rambling.

Lý do: behavior interview trong tuyển dụng thực tế chủ yếu là phát hiện risk khi làm việc thật.

## 16. Coaching and rewrite capability

Sau khi chấm, hệ thống cần giúp user sửa:

- Gợi ý structure.
- Gợi ý câu trả lời mẫu dựa trên chính câu chuyện của user.
- Chỉ ra phần cần thêm metric.
- Chỉ ra đoạn nên bỏ.
- Viết lại theo level cao hơn.
- Đưa bài tập luyện tiếp theo.

Lý do: mock interview có giá trị nhất khi biến đánh giá thành cải thiện cụ thể.

## 17. Progress tracking across sessions

Hệ thống nên theo dõi:

- Competency nào yếu lặp lại.
- Probe nào user thường fail.
- Câu trả lời có cụ thể hơn không.
- User có giảm lan man không.
- Readiness score thay đổi thế nào.
- Behavior profile của user qua thời gian.

Lý do: luyện phỏng vấn là quá trình, không phải một session đơn lẻ.

## 18. Transcript, scorecard and audit trail

Sau session, hệ thống nên tạo:

- Transcript.
- Question list.
- Probe list.
- Evidence map.
- Competency scorecard.
- Red flags.
- Recommended practice plan.
- Before/after answer rewrite.

Lý do: user cần nhìn lại chính xác mình đã trả lời gì, bị hỏi sâu ở đâu, và vì sao bị chấm như vậy.

## Tóm tắt capability layers

Behavior session của một hệ thống giả lập phỏng vấn AI toàn diện cần cover 3 lớp năng lực.

**Interview intelligence**

- Chọn câu hỏi.
- Sinh probe.
- Điều phối flow.
- Mô phỏng interviewer persona.
- Tạo pressure và constraint.

**Evaluation intelligence**

- Trích evidence.
- Chấm rubric.
- Phát hiện generic answer.
- Phát hiện hiring risk.
- Đánh giá consistency trong toàn session.

**Coaching intelligence**

- Feedback theo level.
- Rewrite câu trả lời.
- Gợi ý bài luyện tiếp theo.
- Theo dõi tiến bộ qua nhiều session.
- Tạo transcript, scorecard và audit trail.

Nếu thiếu một trong ba lớp này, hệ thống dễ rơi về dạng chatbot hỏi behavioral questions, chứ chưa phải behavior interview simulator đúng nghĩa.
