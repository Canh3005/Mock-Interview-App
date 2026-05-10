## WHAT

Feature này xây trang chi tiết câu hỏi và entry luyện nhanh cho một câu ngay trên màn detail. Candidate có thể xem nội dung câu hỏi, mục tiêu luyện tập, gợi ý chuẩn bị, lỗi thường gặp, tags liên quan, rồi nhập hoặc ghi âm câu trả lời và gửi cho AI đánh giá.

Outcome là candidate có một cách luyện câu đơn lẻ thật ngắn: đọc câu hỏi, trả lời, gửi. Feature này không biến detail page thành một phiên phỏng vấn nhiều lượt.

## WHY

Card trong danh sách chỉ đủ để candidate quyết định sơ bộ. Trang detail giúp candidate hiểu bối cảnh câu hỏi và có chỗ trả lời ngay khi ý tưởng còn mới, thay vì phải chuyển sang một flow phỏng vấn riêng quá nặng.

Luồng này đóng vai trò khởi tạo cho scoring/feedback: nó thu đúng câu hỏi, đúng câu trả lời, đúng ngôn ngữ và trạng thái gửi. Phần xử lý kết quả, nhận xét, scorecard và feedback chi tiết thuộc feature `024-probe-aware-scoring-feedback`.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm sau public browse/search và trước probe-aware scoring/feedback. Nó dùng probe active đã curated làm ngữ cảnh cho candidate gửi một câu trả lời đơn lẻ.

Nếu feature này chưa có, candidate có thể xem danh sách câu hỏi nhưng chưa có cách nộp câu trả lời cho một probe cụ thể để AI đánh giá.

## SCOPE

In:
- Candidate xem trang detail của một probe active.
- Trang detail hiển thị display question, short title, user-facing intent, answer guidance, common mistakes, role/level/type/competency/tags và related questions nếu có.
- Candidate có thể chọn ngôn ngữ hiển thị câu hỏi.
- Candidate có thể nhập câu trả lời bằng text hoặc ghi âm nếu practice surface hỗ trợ voice.
- Candidate có thể chọn hoặc xác nhận ngôn ngữ mong muốn cho feedback AI nếu flow hỗ trợ.
- Candidate gửi câu trả lời cho AI từ ngay màn detail.
- Hệ thống giữ probe đang xem làm ngữ cảnh bắt buộc của câu trả lời đã gửi.
- Hệ thống ghi nhận trạng thái khởi tạo lượt luyện: chưa trả lời, đang soạn/ghi âm, đang gửi, gửi thành công hoặc gửi lỗi.

Out:
- Không xây phiên phỏng vấn nhiều lượt hoặc follow-up qua lại trong feature này.
- Không xử lý score, feedback, evidence, red flags hoặc debrief chi tiết; toàn bộ phần đó thuộc `024-probe-aware-scoring-feedback`.
- Không cho candidate đổi sang câu khác sau khi đã gửi cùng một lượt trả lời; muốn luyện câu khác thì mở detail câu khác.
- Không hiển thị rubric nội bộ nếu product chưa quyết định public expected signals/red flags.
- Không cho candidate chỉnh sửa nội dung probe.

Depends on: `020-public-question-bank-browse-search`, `026-question-bank-localized-content-completeness`

Blocks: `024-probe-aware-scoring-feedback`, single-question practice result display, question-level analytics completeness.

## Business Flow

### Happy Path

1. Candidate chọn một câu hỏi từ Question Bank.
2. Trang detail hiển thị câu hỏi, mục tiêu luyện tập, guidance, lỗi thường gặp và metadata theo ngôn ngữ đang chọn.
3. Candidate đọc phần detail để hiểu câu trả lời nên bám vào kỹ năng, tình huống hoặc tín hiệu nào ở mức public-facing.
4. Candidate chọn cách trả lời: nhập text hoặc ghi âm nếu voice được hỗ trợ.
5. Candidate soạn câu trả lời hoặc ghi âm câu trả lời ngay trong màn detail.
6. Candidate chọn hoặc xác nhận ngôn ngữ mong muốn cho feedback AI nếu có lựa chọn này.
7. Candidate gửi câu trả lời.
8. Hệ thống khóa ngữ cảnh của lượt gửi vào probe đang xem, ngôn ngữ hiển thị, ngôn ngữ feedback và câu trả lời candidate đã cung cấp.
9. Trạng thái lượt luyện chuyển sang đã gửi/đang chờ xử lý kết quả.
10. Phần scoring/feedback của feature 24 tiếp quản để xử lý kết quả và hiển thị phản hồi.

### Edge Cases & Business Rules

- Chỉ probe active mới được cho gửi câu trả lời mới. Nếu probe đã retired sau khi candidate mở detail, hệ thống không cho gửi và hướng candidate chọn câu khác.
- Candidate không được gửi câu trả lời rỗng; nếu ghi âm thì phải có nội dung ghi âm hợp lệ theo kỳ vọng sản phẩm.
- Nếu candidate đang ghi âm hoặc đang soạn nhưng đổi ngôn ngữ hiển thị câu hỏi, hệ thống không được làm mất nội dung trả lời hiện tại nếu candidate chưa chủ động xóa.
- Question display language và feedback language là hai lựa chọn khác nhau nếu feedback flow hỗ trợ.
- Detail có thể fallback khi thiếu nội dung phụ như guidance hoặc common mistakes, nhưng câu hỏi chính và intent không được sai lệch.
- Khi gửi lỗi, candidate phải thấy trạng thái lỗi rõ ràng và có thể thử gửi lại cùng câu trả lời.
- Nếu candidate rời màn detail trước khi gửi, lượt luyện không được xem là đã bắt đầu hoàn chỉnh; hệ thống có thể chỉ ghi nhận draft/abandoned nếu analytics cần.
- Feature này chỉ khởi tạo lượt đánh giá; mọi diễn giải về điểm mạnh, điểm yếu, missed signals hoặc score không nằm trong scope này.

## Acceptance Criteria

- Given candidate mở detail của một probe active, When detail được hiển thị, Then candidate thấy câu hỏi, mục tiêu luyện tập, guidance, lỗi thường gặp và metadata đủ để quyết định có trả lời câu đó hay không.
- Given candidate đang ở detail của một probe active, When candidate nhập text hoặc ghi âm câu trả lời hợp lệ, Then candidate có thể gửi câu trả lời đó cho AI từ cùng màn detail.
- Given candidate gửi câu trả lời từ detail, When lượt gửi được khởi tạo, Then hệ thống giữ đúng probe đang xem, câu trả lời của candidate và lựa chọn ngôn ngữ feedback làm ngữ cảnh cho bước xử lý tiếp theo.
- Given candidate chưa nhập hoặc ghi âm nội dung hợp lệ, When candidate cố gửi, Then hệ thống không khởi tạo lượt đánh giá và yêu cầu candidate cung cấp câu trả lời trước.
- Given probe đã retired sau khi candidate mở link detail, When candidate cố gửi câu trả lời mới, Then hệ thống không nhận lượt gửi mới từ probe đó và hướng candidate chọn câu khác.
- Given quá trình gửi câu trả lời gặp lỗi, When candidate nhìn lại màn detail, Then candidate thấy trạng thái lỗi và có thể thử gửi lại mà không phải nhập lại từ đầu nếu nội dung vẫn còn hợp lệ.
