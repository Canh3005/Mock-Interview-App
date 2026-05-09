## WHAT

Feature này xây trang chi tiết câu hỏi và điểm bắt đầu luyện từng câu. Candidate có thể xem câu hỏi, mục tiêu luyện tập, guidance, common mistakes, tags liên quan và chọn luyện câu đó với AI.

Outcome là candidate hiểu rõ mình đang luyện kỹ năng gì trước khi bắt đầu, thay vì chỉ nhìn một câu hỏi rời rạc không có bối cảnh.

## WHY

Card trong danh sách chỉ đủ để candidate quyết định sơ bộ. Trang detail giúp candidate chuẩn bị tốt hơn, học cách trả lời có cấu trúc và tránh lỗi phổ biến trước khi vào practice session.

Feature này unlock single-question AI practice và tạo cầu nối giữa public bank với AI engine.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm sau public browse/search và trước AI practice orchestration. Nó dùng localized display content của probe và mở session luyện tập với câu hỏi được chọn.

Nếu feature này chưa có, candidate có thể thấy danh sách câu hỏi nhưng thiếu không gian để hiểu intent, guidance và bắt đầu luyện tập có kiểm soát.

## SCOPE

In:
- Candidate xem trang detail của một probe active.
- Trang detail hiển thị display question, short title, user-facing intent, answer guidance, common mistakes, role/level/type/competency/tags và related questions nếu có.
- Candidate có thể chọn ngôn ngữ hiển thị câu hỏi.
- Candidate có thể bắt đầu luyện riêng câu hỏi này với AI.
- Candidate có thể chọn ngôn ngữ phản hồi AI riêng với ngôn ngữ hiển thị câu hỏi nếu flow practice hỗ trợ.
- Hệ thống ghi nhận candidate bắt đầu luyện câu nào để phục vụ asked history và analytics.

Out:
- Không hiển thị rubric nội bộ nếu product chưa quyết định public expected signals/red flags.
- Không xây full mock interview theo role trong feature này.
- Không xử lý chấm điểm chi tiết; scoring thuộc feature probe-aware scoring.
- Không cho candidate chỉnh sửa nội dung probe.

Depends on: `020-public-question-bank-browse-search`, `023-probe-aware-ai-selection-orchestration`

Blocks: Single-question AI practice UX and question-level analytics completeness.

## Business Flow

### Happy Path

1. Candidate chọn một câu hỏi từ Question Bank.
2. Trang detail hiển thị câu hỏi, mục tiêu luyện tập, guidance, lỗi thường gặp và metadata phù hợp với ngôn ngữ đang chọn.
3. Candidate đọc guidance để hiểu câu trả lời tốt nên có cấu trúc và tín hiệu nào ở mức public-facing.
4. Candidate chọn "Luyện câu này".
5. Session luyện tập bắt đầu với probe đã chọn, ngôn ngữ hiển thị và ngôn ngữ phản hồi phù hợp.
6. Hệ thống ghi nhận lượt bắt đầu luyện để phục vụ analytics và tránh lặp trong cùng context khi cần.

### Edge Cases & Business Rules

- Nếu probe không active, candidate không được bắt đầu session mới từ detail.
- Nếu localized content thiếu một phần phụ như guidance, detail phải fallback hợp lý nhưng không làm sai câu hỏi chính.
- Question display language và practice feedback language là hai setting khác nhau.
- Guidance cho candidate phải giúp luyện tập, không tiết lộ toàn bộ rubric chấm điểm nếu điều đó làm mất giá trị đánh giá.
- Candidate bắt đầu luyện từ detail phải giữ đúng probe intent; AI không được chuyển sang câu khác ngay lập tức.

## Acceptance Criteria

- Given candidate mở detail của một probe active, When detail được hiển thị, Then candidate thấy câu hỏi, mục tiêu luyện tập, guidance, lỗi thường gặp và metadata đủ để quyết định luyện.
- Given candidate chọn tiếng Việt để xem câu hỏi và tiếng Anh cho phản hồi AI, When candidate bắt đầu luyện, Then session giữ hai lựa chọn ngôn ngữ đó như hai setting riêng.
- Given probe đã retired sau khi candidate mở link detail, When candidate cố bắt đầu luyện mới, Then hệ thống không cho bắt đầu session mới từ probe đó và hướng candidate chọn câu khác.
- Given candidate bắt đầu luyện từ detail, When AI hỏi câu đầu tiên, Then câu hỏi vẫn bám đúng probe đã chọn và intent public-facing của câu đó.

## Risk

- AI practice từ một probe cụ thể có thể hỏi lệch intent nếu prompt không giữ đúng mục tiêu câu hỏi.
  Mitigation: Session phải giữ probe selected làm anchor, AI chỉ cá nhân hóa cách hỏi chứ không đổi mục tiêu đánh giá.
