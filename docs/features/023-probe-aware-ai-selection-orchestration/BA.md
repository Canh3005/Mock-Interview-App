## WHAT

Feature này làm cho AI Interview Engine chọn và hỏi probe dựa trên bank đã curated thay vì tự sinh câu hỏi rời rạc. Hệ thống chọn probe theo hard constraints, metadata score, coverage, usage diversity, asked history và context của session; AI dùng primary question, intent, expected signals, red flags và follow-up options để hỏi tự nhiên.

Outcome là candidate có buổi luyện phỏng vấn nhất quán, ít lặp, đúng role/level/stage và có follow-up phục vụ mục tiêu đánh giá rõ ràng.

## WHY

Nếu AI tự chọn câu hỏi từ prompt chung, session dễ bị chung chung, chuyển chủ đề quá sớm hoặc thiếu coverage. Probe-aware orchestration giúp bank trở thành xương sống của interview flow trong khi AI vẫn giữ cách hỏi tự nhiên.

Feature này unlock AI practice từ question detail, Interview Set practice và scoring dựa trên probe.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone AI Practice & Interview Orchestration. Nó phụ thuộc vào probe active đã curated, public entry points và asked history của session.

Nếu feature này chưa có, bank chỉ là nội dung hiển thị, chưa điều khiển được chất lượng buổi phỏng vấn AI.

## SCOPE

In:
- Hệ thống chọn probe theo hard constraints: stage, level, role, trạng thái active và chưa hỏi trong session.
- Hệ thống chấm điểm mềm theo role/CV/JD fit, tech tag overlap, competency chưa cover, difficulty và context.
- Hệ thống rerank để tránh lặp competency, cân bằng difficulty và giữ usage diversity.
- Hệ thống fallback về generic curated probe nếu không có probe phù hợp tối ưu.
- AI dùng intent, primary question, expected signals, red flags và follow-up options để hỏi tự nhiên.
- Hệ thống lưu probe đã hỏi, locale đã chọn, follow-up trigger và transcript để tránh lặp và phục vụ scoring.

Out:
- Không xây semantic retrieval nâng cao trong feature này; retrieval là lớp mở rộng sau.
- Không tự động publish probe mới.
- Không chấm điểm cuối cùng; scoring thuộc feature riêng.
- Không thay thế Interview Set curation bằng AI.

Depends on: `018-question-probe-foundation-taxonomy`, `019-question-probe-curation-workflow`

Blocks: `024-probe-aware-scoring-feedback`, `017-behavioral-question-bank-rag`

## Business Flow

### Happy Path

1. Candidate bắt đầu luyện từng câu hoặc bắt đầu một Interview Set/mock interview.
2. Hệ thống xác định context nghiệp vụ: role, level, stage, language, CV/JD nếu có và asked history.
3. Hệ thống lọc các probe active phù hợp với hard constraints.
4. Hệ thống chấm điểm mềm và rerank để chọn probe có coverage tốt nhất cho session hiện tại.
5. AI hỏi candidate bằng ngôn ngữ phù hợp, giữ intent của probe nhưng diễn đạt tự nhiên theo context.
6. Candidate trả lời; AI chọn follow-up theo trigger có mục tiêu như thiếu metric, thiếu trade-off, thiếu personal contribution hoặc câu trả lời quá mơ hồ.
7. Session lưu lại probe/follow-up đã dùng để scoring và tránh lặp.

### Edge Cases & Business Rules

- Không được chọn probe sai stage, sai level, sai role hoặc không active chỉ vì câu đó phổ biến.
- Nếu không có probe phù hợp hoàn hảo, fallback phải vẫn cùng stage/level hoặc cùng competency anchor đã curated.
- AI không được đọc máy móc display question nếu primary question/intent yêu cầu cá nhân hóa.
- Follow-up phải phục vụ một mục tiêu rõ ràng; không follow-up chỉ để kéo dài hội thoại.
- Asked history phải ngăn hỏi lại cùng probe trong session.
- Nếu trigger follow-up không hợp lệ hoặc không rõ, AI phải dùng fallback follow-up an toàn thay vì bịa trigger.

## Acceptance Criteria

- Given candidate đang luyện Backend Mid-level và chưa cover System Thinking, When hệ thống chọn probe tiếp theo, Then probe được chọn đúng role/level/stage và ưu tiên competency chưa cover nếu phù hợp.
- Given một probe đã được hỏi trong session, When hệ thống chọn câu tiếp theo, Then probe đó không được chọn lại trong cùng session.
- Given candidate trả lời mơ hồ và thiếu personal contribution, When AI follow-up, Then câu follow-up yêu cầu làm rõ vai trò cá nhân thay vì chuyển sang chủ đề khác.
- Given không có probe khớp hoàn hảo với CV/JD, When session cần câu tiếp theo, Then hệ thống dùng curated fallback cùng mục tiêu phỏng vấn thay vì để session dừng hoặc tự sinh câu hỏi ngoài bank.

## Risk

- AI selection và follow-up là luồng không deterministic ảnh hưởng trực tiếp trải nghiệm candidate; nếu chọn sai hoặc follow-up sai, session sẽ mất tính phỏng vấn có cấu trúc.
  Mitigation: Hard constraints, trigger enum, asked history và curated fallback là guardrail bắt buộc trước mọi cá nhân hóa.
