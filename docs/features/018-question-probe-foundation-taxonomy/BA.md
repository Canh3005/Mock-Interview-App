## WHAT

Feature này định nghĩa nền tảng nghiệp vụ cho QuestionProbe: một đơn vị câu hỏi có metadata, intent, expected signals, red flags, follow-up logic, scoring hints và localized display content. Đây là lớp xương sống để cùng một probe phục vụ cả public question bank và AI Interview Engine.

Người dùng cuối chưa nhất thiết thấy feature này như một màn hình riêng. Outcome chính là hệ thống có một ngôn ngữ chung, ổn định để curate câu hỏi, tìm kiếm, chọn câu, hỏi follow-up, chấm điểm và đo chất lượng.

## WHY

Nếu chỉ lưu câu hỏi dạng text, hệ thống khó đảm bảo coverage theo role, level, stage và competency. AI cũng khó hỏi đúng mục tiêu, follow-up đúng vấn đề và chấm điểm dựa trên evidence.

Feature này unlock toàn bộ epic Behavioral Question Bank: admin workflow, public bank, interview sets, AI selector, scoring và analytics đều cần cùng một định nghĩa probe/taxonomy.

## Epic Context

Feature thuộc epic Behavioral Question Bank, là milestone nền tảng đầu tiên. Nó giải quyết bước chuẩn hóa domain trước khi curate nội dung hoặc hiển thị cho candidate.

Nếu feature này chưa hoàn thành, các feature phía sau sẽ phải tự định nghĩa metadata riêng, dễ trùng lặp và làm AI selection/scoring không nhất quán.

## SCOPE

In:
- Xác định QuestionProbe là đơn vị nội dung lõi của ngân hàng câu hỏi.
- Chuẩn hóa taxonomy cho stage, role family, level, question type, competency, tech tag, difficulty và language.
- Phân biệt canonical metadata dùng cho hệ thống với localized display metadata dùng cho candidate.
- Mỗi probe có intent, primary question, display question, expected signals, red flags, scoring hints và follow-up guidance.
- Mỗi probe có trạng thái curation như draft, in review, active, retired hoặc needs revision.
- Nội dung public-facing hỗ trợ tối thiểu tiếng Việt, tiếng Anh và tiếng Nhật ở mức câu hỏi, title, guidance, common mistakes và display labels.
- Nguồn tham khảo câu hỏi được ghi nhận ở mức nội bộ và nội dung publish phải được viết lại theo cấu trúc riêng.

Out:
- Không xây màn hình admin quản lý probe trong feature này.
- Không seed toàn bộ bộ câu hỏi production.
- Không xây trải nghiệm public browse/search.
- Không thiết kế thuật toán chọn câu hỏi hoặc chấm điểm chi tiết.

Depends on: none

Blocks: `019-question-probe-curation-workflow`, `020-public-question-bank-browse-search`, `023-probe-aware-ai-selection-orchestration`, `024-probe-aware-scoring-feedback`, `025-question-bank-analytics-quality-loop`

## Business Flow

### Happy Path

1. Product/Content owner xác định một nhóm câu hỏi cần đưa vào Behavioral Question Bank.
2. Mỗi câu hỏi được chuyển thành QuestionProbe thay vì chỉ là một text câu hỏi.
3. Probe được gắn taxonomy: stage, role family, level, type, competency, tech tags và difficulty.
4. Probe được bổ sung intent, expected signals, red flags, scoring hints và follow-up guidance để AI và reviewer hiểu mục tiêu đánh giá.
5. Probe được bổ sung localized display content cho các ngôn ngữ publish.
6. Probe ở trạng thái draft cho đến khi đi qua workflow review/publish ở feature sau.

### Edge Cases & Business Rules

- Một probe có thể dùng cho nhiều role family hoặc competency, nhưng phải có intent chính rõ ràng.
- Không tạo probe riêng chỉ vì khác ngôn ngữ hiển thị; các bản dịch phải thuộc cùng một probe để giữ analytics và dedup ổn định.
- Canonical metadata không được phụ thuộc vào ngôn ngữ UI.
- Probe không có intent, expected signals, red flags, scoring hints hoặc localized display content tối thiểu thì không đủ điều kiện publish.
- Nguồn tham khảo chỉ là cảm hứng/taxonomy; câu hỏi publish phải được curate và viết lại theo wording riêng.

## Acceptance Criteria

- Given một câu hỏi behavioral được đưa vào bank, When nó được chuẩn hóa thành QuestionProbe, Then nó có actor/mục tiêu đánh giá rõ qua intent, expected signals, red flags và guidance để phục vụ luyện tập.
- Given cùng một probe có nội dung tiếng Việt, tiếng Anh và tiếng Nhật, When candidate đổi ngôn ngữ hiển thị, Then hệ thống vẫn coi đây là cùng một probe cho analytics, scoring và dedup.
- Given một probe thiếu expected signals hoặc localized display content tối thiểu, When admin muốn đưa nó vào luồng publish ở feature sau, Then probe bị xem là chưa đủ điều kiện nghiệp vụ.
- Given một probe technical depth cho Backend Mid-level, When hệ thống đọc metadata của probe, Then stage, role, level, type, competency, tech tags và difficulty đủ rõ để dùng cho filter và selector về sau.

## Risk

- Nếu taxonomy nền không ổn định, mọi feature phía sau sẽ chọn câu, hiển thị, chấm điểm và đo analytics theo các khái niệm khác nhau.
  Mitigation: Chốt taxonomy tối thiểu trước, mọi mở rộng phải giữ backward compatibility về ý nghĩa nghiệp vụ.
