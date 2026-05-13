## WHAT

Feature này mở rộng luồng **so sánh CV và JD hiện có** thành bước chuẩn bị dữ liệu chuyên sâu cho behavior interview session. Người dùng vẫn vào màn Skill Passport/Context Injection hiện tại, upload CV và JD như đang làm để hệ thống trích xuất thông tin cơ bản, chấm mức độ phù hợp CV-JD và hiển thị gap analysis.

Điểm mới là trong cùng quá trình xử lý tài liệu đó, hệ thống bổ sung một lớp phân tích hành vi sâu hơn: rút ra `CandidateClaim`, chuẩn hóa role/level/competency, xác định claim nào cần kiểm chứng trong phỏng vấn, tạo `RiskHypothesis[]` và tạo `CalibrationProfile` để phiên behavior session sau này chọn probe đúng mục tiêu. Outcome là người dùng không phải đi qua một màn intake mới tách rời; dữ liệu phục vụ behavior session được sinh ra từ chính luồng CV/JD assessment mà họ đã dùng.

## WHY

Codebase hiện tại đã có luồng upload CV/JD, parse thông tin cơ bản và đánh giá fit score giữa CV với JD. Luồng này đã đủ tốt để trả lời câu hỏi "CV này phù hợp JD bao nhiêu phần trăm và thiếu kỹ năng gì?", nhưng chưa đủ sâu cho behavior interview vì behavior session cần biết claim nào trong CV/JD phải kiểm chứng bằng evidence, competency nào quan trọng theo level, rủi ro tuyển dụng nào đang mở, và mức nghiêm evidence nên dùng khi hỏi follow-up.

Nếu behavior session chỉ dùng JSON cơ bản từ CV/JD hoặc fit score tổng, AI vẫn dễ hỏi chung chung hoặc hỏi theo skill gap thay vì đào vào ownership, impact, conflict, stakeholder, incident, mentoring, leadership maturity hay generic-answer risk. Feature này biến kết quả CV/JD assessment thành nguồn calibration có cấu trúc để Stage 1 Session Planning chọn probe có chủ đích.

## Epic Context

Feature thuộc epic Behavior Session Intelligence, là **Stage 0 - Intake and calibration** trong design `docs/behavior-session-intelligence-design.md`, nhưng được gắn vào luồng sản phẩm hiện tại thay vì tạo một intake wizard độc lập.

Trong codebase hiện có, người dùng bắt đầu từ Skill Passport/Context Injection: upload CV, upload JD, hệ thống xử lý tài liệu, lưu context, tạo fit score/gap analysis và hiển thị assessment history. Feature này mở rộng kết quả xử lý đó để tạo thêm artifact phục vụ behavior session. Nếu chưa có feature này, behavior session vẫn có thể dùng CV/JD context cơ bản, nhưng chưa có claim map, level expectation, priority competency và risk hypotheses để phỏng vấn sâu theo hồ sơ thật.

## SCOPE

In:
- Người dùng tiếp tục dùng màn so sánh CV/JD hiện tại để upload CV và JD; không tạo một luồng intake behavior session tách rời ở feature này.
- Khi CV được upload và xử lý, hệ thống vẫn trích xuất các trường cơ bản hiện có như skill, experience, education và đồng bộ thông tin phù hợp về profile.
- Song song với trích xuất cơ bản từ CV, hệ thống tạo phân tích behavior-oriented sâu hơn từ career history, project/responsibility text, achievement, leadership, incident, stakeholder, conflict, mentoring, failure hoặc domain experience nếu có.
- Khi JD được upload và xử lý, hệ thống vẫn trích xuất các yêu cầu cơ bản hiện có như role, required skills, nice-to-have skills, minimum experience và key responsibilities.
- Khi đã có cả CV và JD, hệ thống vẫn tạo fit score/gap analysis hiện có, đồng thời tạo hoặc cập nhật calibration chuyên sâu cho behavior session dựa trên cả CV, JD và kết quả fit/gap.
- Hệ thống extract `CandidateClaim` từ CV/JD/profile, gồm nguồn claim, loại claim, competency liên quan, mức ưu tiên kiểm chứng và rủi ro nếu claim chưa được kiểm chứng.
- Hệ thống phân biệt claim kỹ thuật/skill fit với claim hành vi. Ví dụ thiếu React là skill gap, còn "led team", "improved metric", "handled incident" hoặc "worked cross-functionally" là behavior claim cần probe bằng evidence.
- Hệ thống map target role và level từ JD/CV/profile vào expectation phù hợp để biết độ sâu cần hỏi trong behavior session.
- Nếu hệ thống suy luận level từ CV/JD khác với seniority người dùng đang lưu trong profile, hệ thống đánh dấu mismatch để user xác nhận trước khi behavior session dùng level đó.
- Hệ thống chọn priority competencies và competency weights dựa trên JD, CV claims, role/level, gap analysis hiện có và weakness history nếu có.
- Hệ thống tạo `RiskHypothesis[]` ở trạng thái mở để Stage 1 ưu tiên chọn probe kiểm chứng, ví dụ overstated ownership, missing business impact, weak conflict handling, weak technical depth, generic answering, claim without evidence hoặc level mismatch.
- Hệ thống tạo hoặc cập nhật `CalibrationProfile` cho behavior session gồm role family, target level, duration/goal mặc định nếu chưa có lựa chọn cụ thể, language, priority competencies, previous weak competencies, evidence strictness và calibration notes.
- Candidate có thể xem một bản tóm tắt user-facing trong khu vực assessment/profile: các trọng tâm luyện behavior interview được đề xuất, dữ liệu nào đã dùng, và phần nào còn thiếu để cá nhân hóa sâu hơn.
- Behavior session sau này có thể dùng calibration đã tạo từ CV/JD assessment làm input mặc định, thay vì yêu cầu người dùng nhập lại CV/JD hoặc role/level từ đầu.

Out:
- Không thay thế luồng upload CV/JD, fit score hoặc assessment history hiện tại.
- Không xây màn intake mới riêng cho behavior session trong story này.
- Không chọn danh sách probe hoặc tạo `SessionPlan`; đó là Stage 1.
- Không hỏi câu interview, không chạy probe loop, không tạo follow-up.
- Không chấm câu trả lời behavior, không tạo scorecard, không kết luận candidate đạt hay trượt behavior interview.
- Không rewrite CV/JD, không sửa nội dung profile thay người dùng ngoài các dữ liệu đã thuộc luồng đồng bộ hiện có.
- Không tạo taxonomy role/level/competency mới nếu taxonomy hiện có đã có owner; mọi mapping phải dùng taxonomy hiện có hoặc ghi rõ phần không map được.
- Không hiển thị raw `RiskHypothesis`, raw scoring hints, prompt, internal weights, rubric hoặc risk formula cho candidate.
- Không dùng fit score CV-JD như readiness score của behavior interview; fit score chỉ là một tín hiệu phụ trong calibration.

Depends on: luồng upload/parse CV-JD hiện có trong Skill Passport/Context Injection, `018-question-probe-foundation-taxonomy`, nguồn CV/JD đã xử lý đủ đọc được, lịch sử weakness nếu sản phẩm đã có dữ liệu trước đó.

Blocks: Stage 1 Session Planning, CV/JD risk-aware probe selection, level-aware behavior session, evidence-based scoring/debrief và progress loop theo competency.

## Business Flow

### Happy Path

1. Candidate vào màn Skill Passport/Context Injection hiện tại để chuẩn bị hồ sơ cho AI interview.
2. Candidate upload CV như luồng hiện tại.
3. Hệ thống kiểm tra tài liệu, xử lý CV và trích xuất các trường cơ bản đang có như skill, experience, education, role và tech stack.
4. Song song với trích xuất cơ bản, hệ thống phân tích CV theo hướng behavior interview: tìm các claim về ownership, leadership, impact, incident, collaboration, conflict, mentoring, failure, ambiguity hoặc stakeholder work.
5. Hệ thống lưu các claim này ở trạng thái cần kiểm chứng, không coi claim trong CV là bằng chứng đã verified.
6. Candidate upload JD như luồng hiện tại.
7. Hệ thống xử lý JD, trích xuất role, required skills, key responsibilities, minimum experience và các yêu cầu có thể map sang competency hoặc level expectation.
8. Khi đã có cả CV và JD, hệ thống tạo fit score/gap analysis hiện có để candidate hiểu mức độ phù hợp tổng quan.
9. Cùng lúc đó, hệ thống dùng CV, JD, profile và fit/gap để tạo calibration chuyên sâu: `CandidateClaim[]`, priority competencies, level expectation, evidence strictness, calibration notes và `RiskHypothesis[]`.
10. Candidate xem kết quả assessment hiện tại như fit score và missing skills, đồng thời thấy thêm phần tóm tắt behavior interview preparation ở mức user-facing, ví dụ "nên chuẩn bị evidence về ownership, conflict handling và measurable impact".
11. Khi candidate bắt đầu behavior session sau này, hệ thống dùng calibration đã tạo làm mặc định cho role/level/competency priority và risk verification mục tiêu.
12. Stage 0 hoàn tất khi hệ thống có đủ output để Stage 1 chọn probe mà không cần đọc raw CV/JD như nguồn quyết định duy nhất.

### Edge Cases & Business Rules

- Nếu candidate chỉ upload CV mà chưa upload JD, hệ thống vẫn có thể tạo claim map từ CV, nhưng calibration phải ghi rõ thiếu JD nên chưa có JD-specific expectation hoặc fit/gap signal.
- Nếu candidate chỉ upload JD mà chưa có CV, hệ thống vẫn parse JD và lưu expectation cơ bản, nhưng không được tạo `CandidateClaim` giả từ CV.
- Nếu CV/JD parse thất bại, hệ thống không được tạo calibration từ dữ liệu chưa đáng tin; candidate thấy trạng thái lỗi và có thể retry theo luồng hiện tại.
- Nếu CV có claim mơ hồ như "worked on performance" nhưng thiếu metric hoặc vai trò cá nhân, claim vẫn được lưu để kiểm chứng trong session, nhưng không được xem là verified.
- Nếu JD yêu cầu kỹ năng kỹ thuật cụ thể, hệ thống dùng nó cho fit/gap và role context; chỉ chuyển thành behavior priority khi JD thể hiện hành vi cần đánh giá như ownership, stakeholder management, prioritization, communication, leadership hoặc incident handling.
- Nếu profile đã có seniority nhưng CV/JD gợi ý level khác, hệ thống không tự âm thầm đổi level dùng cho behavior session. Mismatch phải được ghi trong calibration notes và user cần xác nhận khi bắt đầu session hoặc ở bước chuẩn bị phù hợp.
- Nếu fit score thấp, behavior calibration không được kết luận candidate yếu behavior. Fit thấp có thể tạo trọng tâm luyện "giải thích gap", "learning agility" hoặc "transferable experience" nếu có căn cứ.
- Nếu fit score cao, hệ thống vẫn phải tạo risk hypotheses mở cho các claim lớn chưa có evidence. Fit cao không đồng nghĩa behavior evidence đã đủ.
- Nếu nhiều claim map vào cùng một competency, hệ thống ưu tiên claim có liên quan trực tiếp đến JD/target level và có rủi ro cao nếu không kiểm chứng.
- Nếu dữ liệu CV/JD chứa thông tin confidential, summary user-facing không ép candidate tiết lộ chi tiết nhạy cảm; session sau chỉ hỏi ở mức có thể mô tả an toàn.
- Behavior calibration là dữ liệu chuẩn bị cho luyện phỏng vấn, không phải đánh giá tuyển dụng thật và không được trình bày như verdict về con người candidate.
- Các dữ liệu chuyên sâu không được bắt candidate chỉnh bằng raw JSON trong production workflow. Nếu cần user xác nhận, UI phải dùng lựa chọn/section có cấu trúc và ngôn ngữ dễ hiểu.

## UI Boundary

- Màn chính vẫn là Skill Passport/Context Injection hiện tại, nơi candidate upload CV hoặc JD và xem trạng thái xử lý.
- Sau khi CV xử lý xong, candidate vẫn thấy thông báo CV đã được xử lý và profile được cập nhật; nếu có hiển thị thêm behavior preparation, nội dung phải là tóm tắt dễ hiểu như claim/competency trọng tâm, không phải payload nội bộ.
- Sau khi JD xử lý xong và có CV để so sánh, candidate vẫn thấy fit score, missing skills và suggestions như hiện tại. Feature này có thể thêm một section trong kết quả hoặc assessment history để nêu "Behavior interview focus" ở mức user-facing.
- Candidate không thấy raw `CandidateClaim`, raw `RiskHypothesis`, internal weights, rubric hoặc prompt. Candidate có thể thấy diễn giải như "nên chuẩn bị ví dụ có metric rõ", "cần làm rõ vai trò cá nhân trong dự án team", "nên chuẩn bị tình huống conflict/stakeholder".
- Nếu thiếu CV hoặc thiếu JD, UI phải nói rõ phần behavior calibration đang bị giới hạn vì thiếu nguồn nào.
- Nếu level/role mismatch được phát hiện, UI chỉ hiển thị như gợi ý xác nhận, không tự gán nhãn tiêu cực cho candidate.
- Khi bắt đầu behavior session sau này, candidate cần có cơ hội xác nhận role/level/goal sẽ dùng nếu calibration đề xuất khác profile hiện tại; feature này không cần xây toàn bộ start-session UI nhưng phải để lại ranh giới nghiệp vụ đó.
- Trạng thái chính cần có: CV đang xử lý, CV xử lý xong nhưng chưa có JD, JD đang xử lý, JD xử lý xong nhưng chưa có CV, fit assessment sẵn sàng, behavior calibration sẵn sàng, calibration thiếu dữ liệu, xử lý thất bại.

## Acceptance Criteria

- Given candidate upload CV trong màn Skill Passport hiện tại, When CV được xử lý thành công, Then hệ thống vẫn cập nhật các trường profile cơ bản hiện có và đồng thời tạo được danh sách behavior claims cần kiểm chứng từ CV nếu tài liệu có đủ tín hiệu.
- Given candidate đã có CV và upload JD, When fit assessment hoàn tất, Then candidate vẫn thấy fit score/gap analysis hiện có và hệ thống đồng thời tạo hoặc cập nhật `CalibrationProfile` cho behavior session.
- Given CV ghi candidate từng "led a team" nhưng thiếu delegation hoặc conflict detail, When behavior analysis chạy, Then hệ thống tạo `CandidateClaim` liên quan leadership/collaboration và `RiskHypothesis` mở để session sau kiểm chứng thay vì coi claim là verified.
- Given JD yêu cầu stakeholder management và cross-functional collaboration, When calibration được tạo, Then priority competencies cho behavior session ưu tiên các năng lực liên quan để Stage 1 có cơ sở chọn probe phù hợp.
- Given candidate chỉ upload CV nhưng chưa upload JD, When CV processing hoàn tất, Then hệ thống có thể tạo claim map từ CV nhưng calibration summary nói rõ thiếu JD nên chưa cá nhân hóa theo yêu cầu công việc cụ thể.
- Given candidate chỉ upload JD nhưng chưa có CV, When JD processing hoàn tất, Then hệ thống không tạo claim giả từ CV và UI nói rõ cần CV để tạo behavior calibration theo hồ sơ.
- Given fit score CV-JD thấp vì thiếu required skills, When behavior calibration được tạo, Then hệ thống không biến fit score thấp thành kết luận behavior yếu mà chỉ tạo trọng tâm luyện phù hợp nếu có evidence từ CV/JD.
- Given profile seniority là Mid-level nhưng CV/JD gợi ý Senior, When calibration summary hoặc session start dùng dữ liệu này, Then mismatch được trình bày như điểm cần xác nhận và level dùng cho session phải là level candidate xác nhận.
- Given behavior calibration đã tạo risk hypotheses, When candidate xem kết quả trong UI, Then candidate chỉ thấy diễn giải user-facing về trọng tâm luyện phỏng vấn, không thấy raw risk labels hoặc kết luận tuyển dụng nội bộ.
- Given candidate bắt đầu behavior session sau khi CV/JD assessment đã hoàn tất, When Stage 1 cần dữ liệu chọn probe, Then hệ thống có thể dùng `CandidateClaim[]`, `CalibrationProfile` và `RiskHypothesis[]` từ luồng assessment thay vì yêu cầu upload hoặc nhập lại CV/JD.

## Risk

- AI có thể extract claim hoặc risk hypothesis quá tự tin từ CV/JD mơ hồ, khiến behavior session hỏi lệch hoặc tạo cảm giác hệ thống đã kết luận về candidate trước khi phỏng vấn.
  Mitigation: Claim/risk phải có nguồn và trạng thái mở; dữ liệu mơ hồ được đánh dấu cần kiểm chứng, không confirmed.

- Việc mở rộng pipeline CV/JD có thể làm người dùng nhầm fit score với readiness cho behavior interview.
  Mitigation: UI và wording phải tách rõ fit score/gap analysis là mức độ phù hợp CV-JD, còn behavior calibration là trọng tâm luyện tập cần kiểm chứng bằng phỏng vấn.

- Phân tích chuyên sâu có thể làm quá tải màn assessment hiện tại.
  Mitigation: Candidate chỉ thấy summary hành động được; dữ liệu chi tiết phục vụ planner/scoring nằm ở lớp internal hoặc màn chi tiết phù hợp sau này.
