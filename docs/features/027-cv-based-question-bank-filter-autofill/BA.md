## WHAT

Feature này thêm hành động "Tìm theo CV" trong bộ lọc Question Bank để candidate có thể dùng CV của mình làm đầu vào tìm câu hỏi luyện tập. Khi candidate bấm hành động này, hệ thống đọc các tín hiệu có thể map được từ CV sang taxonomy/filter hiện có của Question Bank, tự động thêm chúng vào filter chips, rồi cập nhật danh sách probe phù hợp.

Outcome là candidate không phải tự nhớ và chọn từng role, type, tech tag hoặc metadata liên quan từ CV. Candidate vẫn giữ quyền điều chỉnh filter sau khi hệ thống tự điền, vì mục tiêu của feature là hỗ trợ tìm kiếm nhanh chứ không quyết định thay candidate nên luyện phần nào.

## WHY

Question Bank đã cho candidate tìm và lọc probe theo taxonomy, nhưng candidate thường không biết nên bắt đầu từ tag nào hoặc CV của mình đang gợi ý những chủ đề luyện tập nào. Việc chọn thủ công nhiều tag như React, TypeScript, Docker, AWS, Backend, System Design dễ mất thời gian và dễ bỏ sót phần cần luyện.

Feature này biến CV thành ngữ cảnh tìm kiếm trực tiếp trong Question Bank. Nó giúp candidate nhanh chóng thấy các probe liên quan tới những gì đã ghi trong CV, bao gồm cả phần mạnh lẫn phần yếu, từ đó luyện trước các câu có khả năng bị hỏi trong phỏng vấn thật.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm sau public browse/search và sau khi hệ thống đã có nguồn CV/profile có thể đọc được. Nó mở rộng trải nghiệm filter của `020-public-question-bank-browse-search` bằng cách thêm một nguồn chọn filter mới: CV của candidate.

Nếu feature này chưa có, candidate vẫn có thể lọc thủ công trong Question Bank, nhưng chưa có cách dùng CV để nhanh chóng tạo tập filter phù hợp với hồ sơ của mình. Feature này cũng tạo nền cho các trải nghiệm luyện tập cá nhân hóa theo CV về sau, nhưng bản thân story này chỉ dừng ở mức tự điền filter.

## SCOPE

In:
- Candidate thấy hành động "Tìm theo CV" trong khu vực filter của Question Bank khi có thể dùng CV/profile làm nguồn tìm kiếm.
- Candidate bấm "Tìm theo CV" để hệ thống đọc các tín hiệu trong CV có thể map sang filter hiện có.
- Hệ thống tự động thêm các filter chips tương ứng, ví dụ role family, level, question type, competency hoặc tech tags nếu taxonomy hiện có hỗ trợ.
- Các tech tag được tìm thấy trong CV đều có thể được đưa vào filter, kể cả tag chỉ xuất hiện ít như Docker hoặc AWS, miễn là map được với taxonomy của Question Bank.
- Candidate có thể xóa hoặc chỉnh các chip đã được tự điền trước hoặc sau khi xem kết quả.
- Danh sách Question Bank reload theo logic filter hiện có sau khi chip từ CV được thêm.
- Nếu có nhiều giá trị trong cùng một nhóm filter như tech tags, các giá trị trong nhóm đó được hiểu là lựa chọn thay thế cho nhau để candidate không bị khóa vào một tổ hợp quá hẹp.
- Nếu CV không có tín hiệu nào map được, filter hiện tại không bị thay đổi và candidate nhận thông báo ngắn, dễ hiểu.

Out:
- Không chấm điểm mức độ mạnh/yếu của từng tín hiệu trong CV.
- Không loại bỏ tag chỉ vì tín hiệu yếu hoặc xuất hiện ít.
- Không ranking probe theo mức độ phù hợp với CV trong story này.
- Không giải thích lý do từng probe được chọn.
- Không tạo hoặc sửa nội dung CV/profile trong story này.
- Không xây luồng upload/parse CV mới nếu hệ thống chưa có nguồn CV sẵn sàng.
- Không thay đổi taxonomy QuestionProbe trong story này, trừ khi feature phụ thuộc đã cung cấp taxonomy cần dùng.
- Không thay thế bộ lọc thủ công hiện tại; đây là hành động hỗ trợ tự điền filter.

Depends on: `018-question-probe-foundation-taxonomy`, `020-public-question-bank-browse-search`, nguồn CV/profile đã được parse đủ để đọc tín hiệu nghiệp vụ

Blocks: CV-aware practice discovery, CV-based weak-area practice suggestions

## Business Flow

### Happy Path

1. Candidate đã có CV/profile trong hệ thống và mở Question Bank.
2. Candidate nhìn thấy bộ lọc hiện tại cùng hành động "Tìm theo CV".
3. Candidate bấm "Tìm theo CV" vì muốn nhanh chóng tìm các probe liên quan tới hồ sơ của mình.
4. Hệ thống đọc các tín hiệu trong CV có thể map sang filter hiện có, ví dụ role family, level, question type, competency hoặc tech tags.
5. Hệ thống thêm các tín hiệu map được vào filter chips của Question Bank mà không tự loại bỏ tag vì xuất hiện ít trong CV.
6. Question Bank cập nhật danh sách probe theo filter mới.
7. Candidate xem danh sách probe phù hợp với các chip vừa được tự điền.
8. Candidate có thể xóa bớt chip nếu muốn tập trung vào một phần cụ thể, hoặc giữ cả các tag như Docker/AWS để luyện phần còn yếu.
9. Candidate chọn một probe phù hợp để đi tiếp sang detail hoặc bắt đầu luyện tập theo flow hiện có.

### Edge Cases & Business Rules

- "Tìm theo CV" chỉ được hiển thị hoặc cho phép chạy khi candidate có CV/profile đủ trạng thái sẵn sàng để đọc. Nếu chưa có CV hoặc CV đang xử lý, candidate phải thấy trạng thái rõ ràng thay vì kết quả rỗng khó hiểu.
- Hệ thống chỉ tự điền các giá trị có thể map với filter/taxonomy hiện có của Question Bank. Từ khóa ngoài taxonomy không được biến thành filter tự do nếu sản phẩm chưa hỗ trợ.
- Trong cùng một nhóm filter nhiều lựa chọn như tech tags, các chip từ CV được hiểu là OR. Ví dụ React hoặc Docker hoặc AWS đều có thể đưa probe vào kết quả.
- Giữa các nhóm filter khác nhau, hệ thống giữ logic lọc hiện có của Question Bank. Ví dụ type và tech tags cùng được chọn thì kết quả phải vừa đúng type vừa có ít nhất một tech tag phù hợp.
- Nếu candidate đã có filter thủ công trước đó, chip từ CV được thêm vào trạng thái filter hiện tại thay vì xóa toàn bộ lựa chọn của candidate, trừ khi candidate chủ động clear filter.
- Nếu filter sau khi tự điền không có kết quả, candidate thấy empty state có hướng điều chỉnh filter, không phải thông báo lỗi hệ thống.
- Nếu CV chứa nhiều tag, hệ thống có thể giới hạn theo khả năng hiển thị/hiệu năng của sản phẩm, nhưng không được dùng giả định "tag yếu" để loại bỏ một tag đã map được mà không có quy tắc sản phẩm rõ ràng.
- Candidate luôn có quyền xóa từng chip đã được tự điền; chip từ CV không phải filter bắt buộc.
- Hành động này không được làm candidate hiểu rằng hệ thống đã đánh giá năng lực hoặc xếp hạng điểm mạnh/yếu của họ. Đây chỉ là tìm kiếm theo nội dung CV.

## Acceptance Criteria

- Given candidate đã có CV/profile sẵn sàng và đang ở Question Bank, When candidate bấm "Tìm theo CV", Then hệ thống tự động thêm các filter chips map được từ CV vào bộ lọc hiện tại và danh sách probe được cập nhật theo các filter đó.
- Given CV của candidate có React, Docker và AWS đều map được với tech tags của Question Bank, When candidate dùng "Tìm theo CV", Then cả React, Docker và AWS đều có thể được thêm vào filter chips thay vì chỉ giữ tag xuất hiện mạnh nhất.
- Given nhiều tech tag được tự điền từ CV, When Question Bank hiển thị kết quả, Then probe có ít nhất một tech tag đã chọn vẫn được xem là phù hợp trong nhóm tech tags.
- Given candidate đã chọn một số filter thủ công trước khi bấm "Tìm theo CV", When hệ thống tự điền chip từ CV, Then các lựa chọn thủ công của candidate vẫn được giữ và candidate có thể xóa từng chip nếu muốn.
- Given CV không có tín hiệu nào map được với taxonomy/filter hiện có, When candidate bấm "Tìm theo CV", Then filter hiện tại không bị thay đổi và candidate thấy thông báo rằng không tìm thấy tag phù hợp từ CV.
- Given filter sau khi tự điền từ CV không trả ra probe nào, When candidate xem Question Bank, Then candidate thấy trạng thái rỗng có hướng điều chỉnh filter thay vì hiểu là CV hoặc hệ thống bị lỗi.
