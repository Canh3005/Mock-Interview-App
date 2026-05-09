## WHAT

Feature này xây trải nghiệm public Question Bank để candidate duyệt, tìm, lọc và sắp xếp câu hỏi theo role, level, type, competency, tech tag, difficulty, language và popularity. Candidate nhìn thấy card câu hỏi đủ thông tin để quyết định câu nào phù hợp với mục tiêu luyện tập.

Outcome là candidate có thể tự khám phá ngân hàng câu hỏi thay vì phải bắt đầu ngay một mock interview hoặc tự nghĩ câu hỏi để luyện.

## WHY

Ứng viên cần một cách nhanh để tìm câu hỏi phù hợp với vị trí ứng tuyển, level và kỹ năng muốn cải thiện. Nếu question bank chỉ phục vụ AI engine, sản phẩm mất đi trải nghiệm luyện tập chủ động và khó tạo cảm giác nền tảng chuyên nghiệp.

Feature này unlock question detail, luyện từng câu và discovery cho interview set.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở milestone Public Question Bank Experience. Nó phụ thuộc vào probe active đã được curate và localized content đủ tốt.

Nếu feature này chưa có, candidate vẫn có thể luyện qua AI session được dẫn dắt, nhưng không có trải nghiệm browse/search độc lập để chọn câu hỏi theo nhu cầu.

## SCOPE

In:
- Candidate xem danh sách câu hỏi active trong bank.
- Candidate lọc theo role family, level, question type, competency, tech tag, difficulty và language.
- Candidate sắp xếp theo popular hoặc newest khi dữ liệu hỗ trợ.
- Mỗi card hiển thị câu hỏi, short title nếu có, độ khó, role/level, tags, lượt luyện tập hoặc tín hiệu phổ biến khi có.
- Candidate có thể chuyển ngôn ngữ hiển thị câu hỏi và metadata giữa tiếng Việt, tiếng Anh và tiếng Nhật nếu probe hỗ trợ.
- Candidate có thể đi từ card sang detail hoặc bắt đầu luyện câu đó.

Out:
- Không quản lý nội dung admin trong feature này.
- Không hiển thị expected signals/red flags nội bộ nếu chưa có quyết định product riêng.
- Không xây AI follow-up/scoring trong feature này.
- Không xây marketplace câu hỏi công khai.

Depends on: `018-question-probe-foundation-taxonomy`, `019-question-probe-curation-workflow`

Blocks: `021-question-detail-practice-entry`, public discovery for `022-role-interview-set-discovery`

## Business Flow

### Happy Path

1. Candidate mở Question Bank.
2. Candidate chọn role, level, type, competency, tech tag hoặc language phù hợp với mục tiêu luyện tập.
3. Danh sách chỉ hiển thị probe active phù hợp với filter.
4. Candidate đọc card câu hỏi để hiểu câu hỏi đo kỹ năng gì, độ khó ra sao và có phù hợp với mình không.
5. Candidate sắp xếp theo popular/newest nếu muốn khám phá nhanh hơn.
6. Candidate chọn một câu hỏi để xem detail hoặc bắt đầu luyện tập.

### Edge Cases & Business Rules

- Nếu filter không có kết quả, candidate thấy trạng thái rỗng có thể điều chỉnh filter thay vì tưởng hệ thống lỗi.
- Nếu probe thiếu localized content cho ngôn ngữ đang chọn, hệ thống phải có fallback hiển thị rõ và không làm sai metadata canonical.
- Chỉ probe active được hiển thị cho candidate.
- Popularity là tín hiệu tham khảo, không được làm candidate hiểu rằng câu phổ biến luôn phù hợp nhất.
- Filter theo role/level/type/competency/tag phải phản ánh taxonomy canonical, còn label hiển thị theo ngôn ngữ UI.

## Acceptance Criteria

- Given candidate chọn Backend, Mid-level và Technical Depth, When danh sách câu hỏi được hiển thị, Then candidate chỉ thấy các câu active phù hợp với role/level/type đã chọn.
- Given candidate đổi ngôn ngữ hiển thị sang tiếng Nhật, When câu hỏi có localized content tiếng Nhật, Then card hiển thị câu hỏi và label theo tiếng Nhật nhưng vẫn giữ cùng một probe.
- Given filter hiện tại không có câu hỏi phù hợp, When candidate xem danh sách, Then candidate nhận được trạng thái rỗng có hướng điều chỉnh filter.
- Given candidate thấy một card câu hỏi phù hợp, When candidate chọn card, Then candidate có thể đi tiếp đến detail hoặc bắt đầu luyện câu đó.
