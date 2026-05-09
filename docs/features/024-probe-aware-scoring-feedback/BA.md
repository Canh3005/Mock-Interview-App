## WHAT

Feature này làm cho scoring và feedback dựa trên probe cụ thể thay vì nhận xét chung theo stage. Hệ thống đánh giá câu trả lời theo expected signals, red flags, scoring hints và transcript evidence, sau đó trả feedback nêu rõ candidate đã cover gì, thiếu gì và claim nào còn mơ hồ.

Outcome là candidate nhận feedback có căn cứ, dễ cải thiện, và scorecard phản ánh đúng mục tiêu của câu hỏi đã luyện.

## WHY

Chấm điểm bằng cảm giác chung dễ tạo feedback mơ hồ kiểu "cần cụ thể hơn" mà không chỉ ra bằng chứng. Khi scoring gắn với probe, hệ thống có thể đo năng lực theo intent của câu hỏi, giúp candidate hiểu mình cần bổ sung context, metric, trade-off, ownership hay failure handling.

Feature này unlock debrief chất lượng cao, analytics về expected signal coverage và cải thiện độ tin cậy của AI interviewer.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone Probe-Aware Scoring & Feedback. Nó phụ thuộc vào probe-aware AI orchestration để biết probe nào đã hỏi và transcript nào là bằng chứng.

Nếu feature này chưa có, AI vẫn có thể hỏi probe nhưng feedback cuối buổi sẽ thiếu liên kết với rubric và evidence.

## SCOPE

In:
- Scoring kiểm tra expected signals đã xuất hiện hay chưa.
- Scoring ghi nhận red flags nếu transcript có dấu hiệu tương ứng.
- Feedback nêu missed signals và gợi ý cải thiện theo câu hỏi đã luyện.
- Scorecard có evidence quotes hoặc bằng chứng từ câu trả lời thay vì nhận xét chung.
- CV claim verification đánh dấu claim đã verified, chưa verified hoặc có dấu hiệu inflated khi probe thuộc loại CV deep-dive.
- Practice feedback language có thể khác question display language.
- Scoring output có thể tổng hợp theo probe coverage, role-specific feedback và competency.

Out:
- Không thay đổi cách chọn probe.
- Không xây analytics dashboard; scoring data chỉ là input cho analytics feature.
- Không public toàn bộ rubric nội bộ trước khi candidate trả lời.
- Không dùng scoring để tự động quyết định tuyển dụng thật.

Depends on: `018-question-probe-foundation-taxonomy`, `023-probe-aware-ai-selection-orchestration`

Blocks: `025-question-bank-analytics-quality-loop`, high-quality AI debrief.

## Business Flow

### Happy Path

1. Candidate trả lời một probe trong session luyện tập.
2. Hệ thống xác định probe đã hỏi, intent, expected signals, red flags và scoring hints tương ứng.
3. Hệ thống đọc transcript để tìm bằng chứng candidate đã cover hoặc bỏ lỡ từng signal.
4. Hệ thống ghi nhận red flags nếu câu trả lời có dấu hiệu như quá chung chung, thiếu metric, đổ lỗi hoặc không hiểu failure mode.
5. Hệ thống tạo feedback bằng ngôn ngữ phản hồi candidate đã chọn.
6. Candidate nhận score/feedback chỉ rõ điểm mạnh, điểm thiếu, evidence và bước cải thiện.

### Edge Cases & Business Rules

- Không được chấm signal là "đã cover" nếu transcript không có evidence rõ.
- Nếu evidence mơ hồ, feedback phải nói là chưa đủ rõ thay vì xác nhận candidate đã đạt.
- Feedback phải phân biệt thiếu context, thiếu personal contribution, thiếu metric và thiếu trade-off khi probe yêu cầu.
- Với CV claim verification, claim chỉ được verified khi candidate cung cấp đủ vai trò cá nhân, baseline/metric hoặc bằng chứng phù hợp.
- Feedback language độc lập với question display language.
- Scoring không được phạt candidate vì không nói đúng wording mẫu nếu vẫn đáp ứng signal nghiệp vụ.

## Acceptance Criteria

- Given candidate trả lời một probe có expected signals về context, personal contribution và outcome, When scoring chạy, Then feedback chỉ rõ signal nào đã có evidence và signal nào còn thiếu.
- Given transcript không có metric nhưng probe yêu cầu impact measurement, When feedback được tạo, Then candidate được nhắc rằng impact chưa đủ đo được và cần bổ sung baseline/kết quả.
- Given candidate luyện câu hỏi tiếng Việt nhưng chọn feedback tiếng Anh, When scorecard hiển thị, Then feedback được trả bằng tiếng Anh trong khi vẫn bám đúng probe đã luyện.
- Given một CV claim được hỏi follow-up nhưng candidate trả lời chung chung, When scoring đánh giá claim, Then claim được đánh dấu chưa verified thay vì verified.

## Risk

- Scoring bằng AI có thể nhận xét quá tự tin dù transcript thiếu bằng chứng, làm candidate tin sai về năng lực của mình.
  Mitigation: Feedback phải dựa trên evidence, signal không có bằng chứng rõ thì đánh dấu missed hoặc unclear.
