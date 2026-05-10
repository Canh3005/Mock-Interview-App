## WHAT

Feature này làm cho scoring và feedback dựa trên probe cụ thể thay vì nhận xét chung theo stage. Hệ thống nhận câu trả lời candidate đã gửi từ single-question practice hoặc transcript trong session, đánh giá theo expected signals, red flags, scoring hints và evidence, sau đó trả kết quả nêu rõ candidate đã cover gì, thiếu gì và claim nào còn mơ hồ.

Outcome là candidate nhận kết quả và feedback có căn cứ, dễ cải thiện, và scorecard phản ánh đúng mục tiêu của câu hỏi đã luyện.

## WHY

Chấm điểm bằng cảm giác chung dễ tạo feedback mơ hồ kiểu "cần cụ thể hơn" mà không chỉ ra bằng chứng. Khi scoring gắn với probe, hệ thống có thể đo năng lực theo intent của câu hỏi, giúp candidate hiểu mình cần bổ sung context, metric, trade-off, ownership hay failure handling.

Feature này unlock kết quả sau khi candidate gửi câu trả lời từ question detail, debrief chất lượng cao, analytics về expected signal coverage và cải thiện độ tin cậy của AI interviewer.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone Probe-Aware Scoring & Feedback. Nó phụ thuộc vào probe-aware AI orchestration để biết probe nào đã hỏi trong session, và phụ thuộc vào single-question practice entry để nhận câu trả lời candidate gửi từ màn detail.

Nếu feature này chưa có, candidate vẫn có thể gửi câu trả lời hoặc AI vẫn có thể hỏi probe, nhưng phần kết quả sẽ thiếu liên kết với rubric, evidence và mục tiêu của câu hỏi đã luyện.

## SCOPE

In:
- Hệ thống nhận lượt đánh giá đã được khởi tạo từ một probe cụ thể, gồm câu trả lời text hoặc nội dung đã chuyển từ voice sang transcript nếu có.
- Scoring kiểm tra expected signals đã xuất hiện hay chưa.
- Scoring ghi nhận red flags nếu transcript có dấu hiệu tương ứng.
- Feedback nêu missed signals và gợi ý cải thiện theo câu hỏi đã luyện.
- Scorecard có evidence quotes hoặc bằng chứng từ câu trả lời thay vì nhận xét chung.
- CV claim verification đánh dấu claim đã verified, chưa verified hoặc có dấu hiệu inflated khi probe thuộc loại CV deep-dive.
- Practice feedback language có thể khác question display language.
- Scoring output có thể tổng hợp theo probe coverage, role-specific feedback và competency.
- Candidate thấy trạng thái kết quả: đang xử lý, đã có feedback hoặc xử lý thất bại.

Out:
- Không thay đổi cách chọn probe.
- Không xây UI nhập text/ghi âm câu trả lời trên detail; phần khởi tạo lượt gửi thuộc `021-question-detail-practice-entry`.
- Không xây analytics dashboard; scoring data chỉ là input cho analytics feature.
- Không public toàn bộ rubric nội bộ trước khi candidate trả lời.
- Không dùng scoring để tự động quyết định tuyển dụng thật.

Depends on: `018-question-probe-foundation-taxonomy`, `021-question-detail-practice-entry`, `023-probe-aware-ai-selection-orchestration`

Blocks: `025-question-bank-analytics-quality-loop`, high-quality AI debrief.

## Business Flow

### Happy Path

1. Candidate gửi câu trả lời cho một probe từ màn detail hoặc hoàn thành câu trả lời cho probe trong session luyện tập.
2. Hệ thống nhận lượt đánh giá ở trạng thái đang xử lý và xác định probe, intent, expected signals, red flags, scoring hints và ngôn ngữ feedback đã chọn.
3. Hệ thống đọc câu trả lời/transcript để tìm bằng chứng candidate đã cover hoặc bỏ lỡ từng signal.
4. Hệ thống ghi nhận red flags nếu câu trả lời có dấu hiệu như quá chung chung, thiếu metric, đổ lỗi hoặc không hiểu failure mode.
5. Hệ thống tạo kết quả bằng ngôn ngữ phản hồi candidate đã chọn.
6. Candidate nhận feedback/scorecard chỉ rõ điểm mạnh, điểm thiếu, evidence và bước cải thiện.
7. Lượt đánh giá chuyển sang trạng thái đã có feedback; dữ liệu kết quả có thể phục vụ analytics sau này.

### Edge Cases & Business Rules

- Không được chấm signal là "đã cover" nếu transcript không có evidence rõ.
- Nếu evidence mơ hồ, feedback phải nói là chưa đủ rõ thay vì xác nhận candidate đã đạt.
- Feedback phải phân biệt thiếu context, thiếu personal contribution, thiếu metric và thiếu trade-off khi probe yêu cầu.
- Với CV claim verification, claim chỉ được verified khi candidate cung cấp đủ vai trò cá nhân, baseline/metric hoặc bằng chứng phù hợp.
- Feedback language độc lập với question display language.
- Scoring không được phạt candidate vì không nói đúng wording mẫu nếu vẫn đáp ứng signal nghiệp vụ.
- Nếu câu trả lời quá ngắn hoặc không đủ bằng chứng, kết quả phải nói rõ không đủ dữ liệu để đánh giá đầy đủ thay vì bịa score tự tin.
- Nếu xử lý feedback thất bại, candidate phải thấy trạng thái thất bại và có thể yêu cầu xử lý lại trên cùng câu trả lời nếu lượt gửi còn hợp lệ.

## Acceptance Criteria

- Given candidate trả lời một probe có expected signals về context, personal contribution và outcome, When scoring chạy, Then feedback chỉ rõ signal nào đã có evidence và signal nào còn thiếu.
- Given candidate gửi câu trả lời từ detail của một probe active, When hệ thống xử lý xong, Then candidate nhận kết quả bám đúng probe đó thay vì feedback chung chung không liên quan câu hỏi.
- Given transcript không có metric nhưng probe yêu cầu impact measurement, When feedback được tạo, Then candidate được nhắc rằng impact chưa đủ đo được và cần bổ sung baseline/kết quả.
- Given candidate luyện câu hỏi tiếng Việt nhưng chọn feedback tiếng Anh, When scorecard hiển thị, Then feedback được trả bằng tiếng Anh trong khi vẫn bám đúng probe đã luyện.
- Given một CV claim được hỏi follow-up nhưng candidate trả lời chung chung, When scoring đánh giá claim, Then claim được đánh dấu chưa verified thay vì verified.
- Given xử lý feedback gặp lỗi tạm thời, When candidate xem kết quả lượt luyện, Then candidate thấy trạng thái lỗi và có thể yêu cầu xử lý lại mà không cần gửi một câu trả lời mới.

## Risk

- Scoring bằng AI có thể nhận xét quá tự tin dù transcript thiếu bằng chứng, làm candidate tin sai về năng lực của mình.
  Mitigation: Feedback phải dựa trên evidence, signal không có bằng chứng rõ thì đánh dấu missed hoặc unclear.
