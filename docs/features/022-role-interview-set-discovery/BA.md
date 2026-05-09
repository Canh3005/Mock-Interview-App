## WHAT

Feature này cho phép candidate khám phá và bắt đầu các bộ phỏng vấn theo vị trí như Backend Developer Mid-level, Frontend Junior hoặc Fullstack Senior. Mỗi Interview Set gom nhiều probe thành một lộ trình luyện tập có role, level, duration, stage coverage, competency coverage và độ khó rõ ràng.

Outcome là candidate có thể bắt đầu mock interview theo mục tiêu ứng tuyển mà không cần tự chọn từng câu hỏi rời rạc.

## WHY

Nhiều candidate không biết nên luyện câu nào trước hoặc cần coverage gì cho một buổi phỏng vấn thật. Interview Set biến question bank thành một trải nghiệm có cấu trúc, giúp session tự nhiên hơn và có đủ coverage tối thiểu.

Feature này unlock practice theo role/level và cung cấp blueprint cho AI selector trong các mock interview dài hơn.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm ở public experience và curated content. Nó phụ thuộc vào admin đã curate probe active và quản lý set theo role/level.

Nếu feature này chưa có, candidate vẫn có thể luyện từng câu, nhưng chưa có lộ trình mock interview theo vị trí với coverage rõ ràng.

## SCOPE

In:
- Candidate xem danh sách Interview Set theo role, level, duration, difficulty, stage coverage và competency coverage.
- Candidate hiểu mỗi set có bao nhiêu câu, thời lượng dự kiến, kỹ năng được đánh giá và phù hợp với level nào.
- Candidate có thể bắt đầu mock interview từ một set.
- Interview Set dùng probe active đã curated và có coverage tối thiểu theo stage/type/competency.
- Featured sets có thể được dùng để gợi ý lộ trình phổ biến cho candidate.

Out:
- Không để candidate tự chỉnh cấu trúc set trong feature này.
- Không tạo set bằng AI không qua review.
- Không chấm điểm session trong feature này.
- Không thay thế browse/search câu hỏi rời rạc.

Depends on: `018-question-probe-foundation-taxonomy`, `019-question-probe-curation-workflow`, `023-probe-aware-ai-selection-orchestration`

Blocks: Role-based mock interview practice and set-level analytics.

## Business Flow

### Happy Path

1. Candidate mở khu vực Interview Sets trong Question Bank.
2. Candidate chọn role và level mục tiêu hoặc xem featured sets.
3. Mỗi set hiển thị số câu, thời lượng, độ khó, stage coverage và competency coverage.
4. Candidate chọn một set phù hợp với mục tiêu ứng tuyển.
5. Candidate bắt đầu mock interview theo set.
6. AI session dùng set như blueprint để hỏi các probe phù hợp theo thứ tự và coverage đã curated.

### Edge Cases & Business Rules

- Interview Set chỉ được publish nếu các probe trong set active và đủ coverage tối thiểu.
- Nếu một probe trong set bị retired, set cần được review hoặc thay probe trước khi dùng cho session mới.
- Set phải nói rõ role/level phù hợp; không dùng một set chung chung cho mọi candidate nếu coverage không rõ.
- Duration và số câu là kỳ vọng luyện tập, không được làm candidate hiểu đó là cam kết tuyệt đối nếu session có follow-up dài.
- Set không được hỏi lặp cùng một probe trong cùng session.

## Acceptance Criteria

- Given candidate chọn Backend Developer Mid-level, When xem Interview Sets, Then candidate thấy các set phù hợp với role/level kèm số câu, thời lượng, độ khó và competency coverage.
- Given một Interview Set có probe retired, When candidate chuẩn bị bắt đầu session mới, Then set không được dùng như bình thường cho đến khi được review hoặc thay probe.
- Given candidate bắt đầu một set, When session hỏi câu đầu tiên, Then câu hỏi thuộc set hoặc phù hợp với blueprint coverage của set.
- Given một set được publish, When admin/reviewer kiểm tra ở mức nghiệp vụ, Then set có coverage tối thiểu và không chỉ là danh sách câu hỏi ngẫu nhiên.
