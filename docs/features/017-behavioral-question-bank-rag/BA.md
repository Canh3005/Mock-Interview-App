## WHAT

Feature này bổ sung lớp semantic retrieval và interview memory cho Behavioral Question Bank. Khi bank đủ lớn, hệ thống có thể tìm probe phù hợp hơn bằng nội dung, intent, expected signals và ngữ cảnh những gì ứng viên đã nói trước đó, nhưng vẫn giữ metadata constraints làm điều kiện bắt buộc.

Ứng viên không nhìn thấy thuật toán retrieval trực tiếp. Outcome họ nhận được là buổi luyện phỏng vấn ít lặp, câu hỏi liên quan hơn với CV/JD và follow-up bám sát câu trả lời đã xuất hiện trong session.

## WHY

Metadata filtering là nền tảng bắt buộc, nhưng khi số lượng probe tăng lên, chỉ filter theo role, level và tag có thể bỏ sót probe tốt hoặc chọn câu hỏi quá giống nhau. Semantic retrieval giúp hệ thống hiểu nội dung probe và transcript tốt hơn để chọn câu hỏi/follow-up sát ngữ cảnh.

Feature này unlock giai đoạn tối ưu AI Interview Engine sau khi foundation, curation, selector, scoring và analytics đã đủ ổn định.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone cuối: Semantic Retrieval & Interview Memory.

Feature này phụ thuộc vào nền QuestionProbe đã có metadata sạch, selector đã có hard constraints, session đã lưu asked history/transcript, và analytics đã đủ để phát hiện retrieval có làm chất lượng tốt hơn hay không. Nếu feature này chưa có, AI practice vẫn hoạt động bằng curated metadata selector nhưng khả năng cá nhân hóa sâu theo nội dung sẽ bị giới hạn.

## SCOPE

In:
- Hệ thống dùng semantic retrieval như lớp tìm kiếm bổ sung sau khi đã thỏa hard constraints về stage, role, level và trạng thái probe.
- Hệ thống có thể dùng intent, primary question, expected signals, tech tags và localized content để tìm probe liên quan hơn với CV/JD hoặc câu trả lời trước đó.
- Hệ thống có thể dùng interview memory để chọn follow-up hoặc probe tiếp theo dựa trên những điểm ứng viên đã nói trong session.
- Kết quả retrieval phải được cân bằng với coverage, usage diversity và session context thay vì chỉ chọn câu tương đồng nhất.
- Khi retrieval không đủ tin cậy, hệ thống fallback về selector metadata đã curated.

Out:
- Không thay thế metadata constraints bằng semantic retrieval.
- Không dùng transcript memory để hỏi câu ngoài scope phỏng vấn hoặc ngoài consent của session.
- Không xây marketplace câu hỏi công khai.
- Không thay đổi rubric chấm điểm trong feature này.

Depends on: `018-question-probe-foundation-taxonomy`, `023-probe-aware-ai-selection-orchestration`, `025-question-bank-analytics-quality-loop`

Blocks: Advanced personalized mock interview quality optimization.

## Business Flow

### Happy Path

1. Ứng viên bắt đầu hoặc tiếp tục một session luyện phỏng vấn có CV/JD, role, level và stage rõ ràng.
2. Hệ thống xác định hard constraints trước: stage hiện tại, role family, level, trạng thái active và probe chưa được hỏi.
3. Hệ thống dùng semantic retrieval để tìm probe hoặc memory chunk có nội dung liên quan với CV/JD và transcript hiện tại.
4. Hệ thống rerank kết quả dựa trên relevance, coverage còn thiếu, usage diversity và độ phù hợp với performance hiện tại của ứng viên.
5. AI hỏi câu tiếp theo hoặc follow-up tự nhiên, vẫn giữ đúng intent và competency cần đánh giá.
6. Session lưu lại probe/memory đã dùng để tránh lặp và phục vụ đánh giá chất lượng sau này.

### Edge Cases & Business Rules

- Nếu semantic retrieval không tìm được probe phù hợp, hệ thống phải fallback về curated metadata selector.
- Nếu kết quả semantic tương đồng nhưng sai stage, sai level, sai role hoặc probe không active, hệ thống không được chọn.
- Nếu transcript memory chứa thông tin mơ hồ hoặc chưa được ứng viên nói rõ, AI không được coi đó là claim đã verified.
- Nếu kết quả retrieval liên tục chọn cùng một competency hoặc tech tag, usage diversity phải giảm ưu tiên nhóm đó.
- Memory chỉ được dùng trong phạm vi session/interview context phù hợp, không biến thành profile ngầm ngoài mục đích luyện phỏng vấn.

## Acceptance Criteria

- Given một session Backend Mid-level đang ở stage technical depth và có nhiều probe active phù hợp, When hệ thống chọn câu tiếp theo bằng semantic retrieval, Then probe được chọn vẫn đúng stage, đúng level, đúng role và chưa từng được hỏi trong session.
- Given semantic retrieval trả về probe có nội dung tương đồng cao nhưng sai role hoặc sai trạng thái, When hệ thống quyết định câu hỏi, Then probe đó bị loại và hệ thống chọn fallback phù hợp hơn.
- Given ứng viên đã nhắc đến một claim kỹ thuật trong câu trả lời trước, When hệ thống cần follow-up, Then câu follow-up bám vào claim đó nhưng vẫn yêu cầu ứng viên làm rõ bằng context, action hoặc evidence.
- Given không có kết quả semantic đủ tốt, When session cần câu hỏi tiếp theo, Then ứng viên vẫn nhận được một curated probe hợp lệ thay vì trải nghiệm bị ngắt.

## Risk

- Semantic retrieval có thể chọn câu hỏi nhìn có vẻ liên quan nhưng lệch stage, role hoặc mục tiêu đánh giá, làm buổi phỏng vấn mất nhất quán.
  Mitigation: Metadata hard constraints luôn chạy trước, retrieval chỉ được dùng để bổ sung ranking và phải có fallback curated.
