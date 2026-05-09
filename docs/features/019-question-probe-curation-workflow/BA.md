## WHAT

Feature này cho phép admin/curator tạo, chỉnh sửa, review, publish, retire và đưa probe về trạng thái needs revision. Workflow đảm bảo chỉ probe đã đủ intent, localized content, expected signals, red flags, scoring hints và follow-up guidance mới được dùng cho candidate hoặc AI session.

Outcome chính là ngân hàng câu hỏi được curate có kiểm soát, có trách nhiệm review rõ ràng và không publish nội dung thiếu chất lượng.

## WHY

Behavioral Question Bank chỉ có giá trị nếu câu hỏi được kiểm duyệt thay vì để AI tự sinh production content không qua review. Admin workflow giúp giữ chất lượng, audit được thay đổi và giảm rủi ro câu hỏi sai level, sai role, dịch kém hoặc scoring không có evidence.

Feature này unlock public question bank, interview sets và AI selector vì các trải nghiệm đó chỉ nên dùng probe active.

## Epic Context

Feature thuộc epic Behavioral Question Bank, nằm sau foundation/taxonomy và trước public/AI usage. Nó biến QuestionProbe từ khái niệm nội dung thành một inventory có vòng đời quản lý rõ ràng.

Nếu feature này chưa có, hệ thống có thể có probe draft nhưng chưa có cách nghiệp vụ để xác nhận probe nào được phép hiển thị hoặc dùng trong session thật.

## SCOPE

In:
- Admin có thể tạo probe mới theo taxonomy đã chuẩn hóa.
- Admin có thể chỉnh sửa nội dung, localized display content, intent, expected signals, red flags, scoring hints và follow-up guidance.
- Admin có thể đưa probe qua các trạng thái draft, in review, active, retired và needs revision.
- Admin có thể publish probe chỉ khi probe đạt đủ điều kiện chất lượng.
- Admin có thể retire probe khi nội dung không còn phù hợp hoặc gây chất lượng kém.
- Admin có thể quản lý Interview Set theo role, level, duration, stage coverage và competency coverage ở mức curation.
- Hỗ trợ review nội dung hàng loạt ở mức nghiệp vụ để curator kiểm tra taxonomy, dịch và chất lượng câu hỏi.

Out:
- Không xây public browse/search cho candidate trong feature này.
- Không tự động sinh production probe không qua review.
- Không làm analytics dashboard chi tiết; analytics chỉ là input cho quality loop ở feature sau.
- Không quyết định thuật toán AI chọn probe trong session.

Depends on: `018-question-probe-foundation-taxonomy`

Blocks: `020-public-question-bank-browse-search`, `022-role-interview-set-discovery`, `023-probe-aware-ai-selection-orchestration`

## Business Flow

### Happy Path

1. Admin tạo hoặc chỉnh sửa một probe ở trạng thái draft.
2. Admin bổ sung taxonomy, localized content, intent, expected signals, red flags, scoring hints và follow-up guidance.
3. Admin chuyển probe sang in review khi nội dung đã sẵn sàng.
4. Reviewer/admin kiểm tra probe theo chất lượng nghiệp vụ: đúng role/level, wording rõ, guidance hữu ích, không thiếu signals hoặc red flags.
5. Nếu đạt, probe chuyển sang active và được phép xuất hiện trong public bank, interview sets hoặc AI selector.
6. Nếu không đạt, probe chuyển về needs revision hoặc draft với lý do cần sửa.
7. Khi probe không còn phù hợp, admin retire để ngừng dùng trong trải nghiệm mới.

### Edge Cases & Business Rules

- Chỉ admin có quyền publish hoặc retire probe.
- Probe không đủ localized display content tối thiểu thì không được active.
- Probe thiếu intent, expected signals, red flags hoặc scoring hints thì không được active.
- Probe retired không được xuất hiện trong session mới nhưng lịch sử luyện tập cũ vẫn cần hiểu được probe đã dùng.
- Nếu probe bị report hoặc analytics cho thấy chất lượng thấp, probe có thể chuyển về needs revision để review lại.
- Khi nhiều admin chỉnh cùng nội dung, hệ thống phải giữ rõ trạng thái cuối và không làm mất trách nhiệm review.

## Acceptance Criteria

- Given admin đang có một probe draft đủ nội dung bắt buộc, When admin publish probe, Then probe chuyển sang active và đủ điều kiện xuất hiện trong trải nghiệm candidate/AI.
- Given một probe thiếu red flags hoặc scoring hints, When admin cố publish, Then probe không được active và admin thấy rõ lý do nghiệp vụ cần bổ sung.
- Given một probe active bị phát hiện dịch kém hoặc gây scoring lệch, When admin đánh dấu needs revision, Then probe ngừng được ưu tiên cho session mới cho đến khi được review lại.
- Given một probe đã retired, When candidate bắt đầu session mới, Then probe không được dùng cho session mới nhưng lịch sử cũ vẫn còn hiểu được câu hỏi đã luyện.

## Risk

- Workflow publish/retire có state machine và quyền admin, nếu xử lý sai có thể publish nội dung chưa review hoặc làm mất probe đang dùng.
  Mitigation: Chỉ cho active khi đủ quality gate, mọi chuyển trạng thái quan trọng phải có lý do và audit nghiệp vụ.
