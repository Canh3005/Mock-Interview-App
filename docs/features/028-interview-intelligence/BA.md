## WHAT

Feature này xây dựng lớp **Interview Intelligence** cho AI Interview Engine: hệ thống không chỉ hỏi câu hỏi theo danh sách, mà biết chọn câu hỏi đúng mục tiêu, sinh follow-up/probe theo câu trả lời thật, điều phối nhịp phỏng vấn, mô phỏng phong cách interviewer và tạo áp lực hợp lý trong session.

Interview Intelligence là lớp điều khiển buổi phỏng vấn. Nó quyết định hỏi gì, hỏi khi nào, hỏi sâu đến đâu, khi nào chuyển chủ đề, và cách interviewer phản ứng với câu trả lời của candidate. Feature này không chấm điểm cuối cùng và không coaching sau session; các phần đó thuộc Evaluation Intelligence và Coaching Intelligence.

Outcome là candidate có trải nghiệm luyện phỏng vấn giống thực tế hơn: session có mục tiêu rõ, câu hỏi không ngẫu nhiên, follow-up bám vào điểm thiếu, flow không lan man, và độ khó/persona/pressure được kiểm soát theo role, level và mục tiêu luyện tập.

## WHY

Nếu AI chỉ lấy câu hỏi từ bank rồi hỏi tuần tự, session vẫn dễ giống chatbot luyện câu hỏi. Phỏng vấn thật có intelligence ở cách interviewer điều khiển: nghe câu trả lời, phát hiện thiếu evidence, đào sâu claim, tăng hoặc giảm áp lực, rồi quyết định tiếp tục probe hay chuyển sang competency khác.

Feature này biến question bank, probe metadata, Interview Set và session context thành một buổi phỏng vấn có orchestration. Đây là nền để các feature scoring và feedback sau đó có transcript, probe trace và flow evidence đủ chất lượng.

## Epic Context

Feature thuộc nhóm AI Interview Engine, nằm sau nền tảng question bank/probe-aware selection và trước debrief nâng cao. Nó tổng hợp một phần năng lực đã được nhắc trong các tài liệu capability về AI interview simulation và behavior session.

Nếu feature này chưa có, hệ thống vẫn có thể hỏi từng probe hoặc chạy Interview Set cơ bản, nhưng chưa tạo được cảm giác interviewer thật vì thiếu adaptive flow, persona, pressure và follow-up policy.

## SCOPE

In:
- Hệ thống khởi tạo interview plan theo role, level, interview type, duration, language, session goal, Interview Set nếu có, CV/JD context nếu có và weak areas trước đó nếu có.
- Hệ thống chọn câu hỏi/probe tiếp theo theo stage goal, coverage còn thiếu, asked history, candidate context và độ khó mong muốn.
- AI sinh follow-up theo câu trả lời thật của candidate, ưu tiên các thiếu sót như thiếu context, thiếu personal contribution, thiếu metric, thiếu trade-off, thiếu failure/reflection hoặc trả lời quá generic.
- Hệ thống quyết định khi nào tiếp tục đào sâu, khi nào chuyển câu, khi nào tăng độ khó, khi nào yêu cầu trả lời ngắn hơn, và khi nào dừng probe vì đã đủ signal.
- Hệ thống hỗ trợ interviewer persona như friendly, silent, skeptical, detail-oriented, senior engineering manager, product-oriented hoặc cross-functional stakeholder.
- Hệ thống hỗ trợ pressure/constraint như giới hạn thời gian, response length cap, interruption khi lan man, challenge nhẹ khi thiếu evidence, hoặc yêu cầu bổ sung metric/vai trò cá nhân.
- Mọi câu hỏi chính, follow-up, persona setting, pressure event, selected reason và stop reason được lưu lại để phục vụ audit, scoring và analytics.

Out:
- Không xây scoring cuối session hoặc scorecard chi tiết; phần này thuộc probe-aware scoring/debrief.
- Không rewrite câu trả lời hoặc tạo training plan sau session; phần này thuộc coaching.
- Không tự động tạo/publish probe mới vào bank.
- Không thay đổi admin workflow curate probe.
- Không dùng pressure để tạo trải nghiệm gây khó chịu, công kích cá nhân hoặc đánh giá tuyển dụng thật.
- Không thay thế hard constraints của probe-aware selector bằng prompt tự do.

Depends on: `018-question-probe-foundation-taxonomy`, `019-question-probe-curation-workflow`, `022-role-interview-set-discovery`, `023-probe-aware-ai-selection-orchestration`

Blocks: high-fidelity mock interview session, session-level debrief, interviewer persona practice, adaptive interview analytics.

## Business Flow

### Interview Plan Initialization

Khi candidate bắt đầu session, hệ thống tạo interview plan gồm:

- Role và level mục tiêu.
- Interview type: behavioral, technical deep-dive, CV deep-dive, soft skills, domain, mixed hoặc custom set.
- Session duration và số round kỳ vọng.
- Stage coverage cần đạt.
- Competency coverage cần đạt.
- Difficulty ramp: ổn định, tăng dần hoặc stress test.
- Persona mặc định hoặc persona candidate chọn.
- Pressure mode: off, light, realistic hoặc intense.
- Context từ CV/JD, Interview Set, lịch sử luyện tập và weak areas nếu có.

Plan này là blueprint điều phối, không phải script cố định. AI vẫn được thích ứng theo câu trả lời thật nhưng phải giữ coverage và guardrail.

### Question Selection Policy

1. Xác định current stage, competency mục tiêu và coverage còn thiếu.
2. Lọc probe theo hard constraints từ feature probe-aware orchestration.
3. Rerank theo Interview Set blueprint, CV/JD relevance, weak area, difficulty, asked history và diversity.
4. Chọn câu hỏi chính kèm selected reason có thể audit.
5. Nếu thiếu probe phù hợp, dùng curated fallback cùng stage/competency và ghi fallback reason.
6. Không tự sinh câu hỏi ngoài bank cho evaluative round nếu câu hỏi đó sẽ được dùng cho scoring như probe chuẩn.

### Follow-up Policy

Sau mỗi câu trả lời, AI xác định follow-up target trước khi hỏi tiếp:

- Làm rõ context.
- Làm rõ vai trò cá nhân.
- Yêu cầu metric/baseline/result.
- Đào trade-off hoặc decision.
- Kiểm tra conflict/stakeholder impact.
- Kiểm tra failure, lesson learned hoặc reflection.
- Challenge claim có dấu hiệu overclaim.
- Yêu cầu rút gọn nếu câu trả lời dài nhưng ít thông tin.

Follow-up phải có mục tiêu cụ thể và không được hỏi chỉ để kéo dài hội thoại. Mỗi question round có follow-up budget theo duration, stage importance và pressure mode.

### Flow Control Policy

Hệ thống đóng hoặc chuyển round khi:

- Đã đủ evidence cho competency hiện tại.
- Candidate đã trả lời hết follow-up budget hợp lý.
- Câu trả lời không còn tạo thêm signal dù đã probe.
- Session cần chuyển stage để giữ coverage.
- Candidate bị kẹt quá lâu và cần fallback/transition.
- Áp lực thời gian yêu cầu chuyển câu.

Hệ thống tiếp tục đào sâu khi:

- Candidate đưa claim lớn nhưng thiếu bằng chứng.
- Candidate dùng "we" liên tục và chưa rõ phần "I".
- Candidate thiếu metric trong câu trả lời về impact.
- Candidate né conflict, failure hoặc trade-off.
- Candidate có mâu thuẫn với thông tin trước đó trong cùng session.

### Persona Policy

Persona ảnh hưởng đến tone, mức độ feedback tức thời, độ sâu follow-up và cách challenge, nhưng không được thay đổi rubric hoặc hard constraints.

Ví dụ:

| Persona | Hành vi phỏng vấn |
| --- | --- |
| Friendly | Khuyến khích, chuyển tiếp mềm, challenge nhẹ. |
| Silent | Ít phản hồi, để candidate tự cấu trúc câu trả lời, follow-up ngắn. |
| Skeptical | Hỏi bằng chứng, metric, vai trò cá nhân và consistency mạnh hơn. |
| Detail-oriented | Đào sâu timeline, constraint, decision, trade-off và result. |
| Senior engineering manager | Tập trung ownership, ambiguity, stakeholder, team impact và maturity. |
| Product-oriented | Tập trung user impact, business trade-off, prioritization và outcome. |
| Cross-functional stakeholder | Tập trung collaboration, communication, expectation management và conflict. |

### Pressure Policy

Pressure mode phải được kiểm soát và minh bạch trước khi session bắt đầu.

- Off: không dùng timer/challenge áp lực, chỉ hỏi follow-up bình thường.
- Light: thỉnh thoảng nhắc candidate cụ thể hơn hoặc ngắn gọn hơn.
- Realistic: có timebox, challenge khi thiếu evidence, interruption khi quá lan man.
- Intense: giới hạn thời gian chặt hơn, nhiều câu hỏi phản biện hơn, nhưng vẫn không công kích cá nhân.

Pressure event phải phục vụ mục tiêu luyện tập, ví dụ:

- "Bạn còn 45 giây, hãy chốt lại result và bài học chính."
- "Tôi chưa thấy phần bạn trực tiếp làm. Bạn làm gì khác với phần team làm?"
- "Metric này đo như thế nào và baseline trước đó là gì?"
- "Câu trả lời đang khá rộng. Hãy trả lời trong 3 ý chính."

### Happy Path

1. Candidate chọn role, level, interview type, duration, persona và pressure mode.
2. Hệ thống tạo interview plan với coverage mục tiêu.
3. Hệ thống chọn câu hỏi đầu tiên từ probe/Interview Set phù hợp.
4. AI hỏi candidate bằng tone của persona đã chọn.
5. Candidate trả lời.
6. AI phân tích câu trả lời để xác định follow-up target hoặc quyết định đủ signal.
7. AI hỏi follow-up có mục tiêu hoặc chuyển sang câu/stage tiếp theo.
8. Session tiếp tục cho đến khi hết duration hoặc đủ coverage tối thiểu.
9. Hệ thống lưu toàn bộ trace gồm question, follow-up, reason, pressure event, stop reason và transcript để scoring/debrief dùng sau.

### Edge Cases & Business Rules

- Không được hỏi lặp cùng một probe trong cùng session.
- Không được chuyển stage quá sớm nếu câu trả lời có claim quan trọng nhưng chưa được probe tối thiểu.
- Không được probe vô hạn một câu trả lời; follow-up budget phải có giới hạn.
- Nếu candidate im lặng hoặc trả lời quá ngắn, AI cần dùng clarification/fallback trước khi đánh dấu thiếu evidence.
- Nếu candidate yêu cầu đổi persona hoặc giảm áp lực giữa session, hệ thống được điều chỉnh từ round tiếp theo và ghi lại change event.
- Nếu pressure mode làm candidate không thoải mái, candidate phải có cách tắt hoặc hạ mức áp lực.
- Persona không được tạo bias chấm điểm; nó chỉ thay đổi cách hỏi và mức độ challenge.
- Nếu CV/JD context thiếu hoặc không đáng tin cậy, AI không được giả định claim chưa được cung cấp.
- Nếu câu trả lời có thông tin nhạy cảm, AI không được ép candidate tiết lộ dữ liệu confidential; chỉ yêu cầu mô tả ở mức an toàn.

## UI Boundary

- Candidate cần thấy các lựa chọn trước session: role, level, duration, interview type, persona và pressure mode.
- UI phải giải thích ngắn gọn pressure mode ở mức setting, không nhồi hướng dẫn dài trong màn interview.
- Trong session, candidate cần thấy current stage hoặc progress vừa đủ để không mất định hướng.
- Timer/response cap chỉ hiển thị khi pressure mode có dùng timebox.
- Khi AI interrupt hoặc challenge, UI phải thể hiện đó là hành vi của interviewer persona/session mode, không phải lỗi hệ thống.
- Sau session, trace chi tiết có thể được chuyển cho debrief, nhưng feature này chỉ yêu cầu lưu dữ liệu, chưa yêu cầu xây màn debrief đầy đủ.

## Acceptance Criteria

- Given candidate chọn Backend Senior, persona Skeptical và pressure Realistic, When session bắt đầu, Then AI hỏi theo tone phản biện hợp lý và ưu tiên probe về trade-off, ownership, metric hoặc system impact phù hợp level.
- Given candidate trả lời một claim lớn nhưng thiếu vai trò cá nhân, When AI follow-up, Then câu hỏi tiếp theo yêu cầu làm rõ phần candidate trực tiếp thực hiện.
- Given candidate trả lời quá dài nhưng thiếu result, When pressure mode bật, Then AI có thể yêu cầu candidate chốt lại result trong giới hạn ngắn.
- Given một probe đã hỏi trong session, When hệ thống chọn câu tiếp theo, Then probe đó không được hỏi lại.
- Given coverage còn thiếu competency conflict handling, When chọn câu tiếp theo, Then hệ thống ưu tiên probe phù hợp competency đó nếu vẫn đúng stage/role/level.
- Given candidate đã cung cấp đủ context, action, result và reflection cho một round, When flow controller đánh giá, Then AI chuyển sang câu/stage tiếp theo thay vì tiếp tục hỏi sâu không cần thiết.
- Given candidate yêu cầu giảm áp lực, When session sang round tiếp theo, Then pressure mode được hạ và change event được ghi lại.
- Given persona là Friendly, When candidate trả lời thiếu metric, Then AI vẫn hỏi metric nhưng bằng cách mềm hơn, không bỏ qua yêu cầu evidence.
- Given persona là Silent, When candidate trả lời xong, Then AI không đưa feedback dài tức thời mà dùng follow-up ngắn hoặc chuyển câu theo policy.
- Given AI chọn câu hỏi hoặc fallback, When audit trace được xem, Then trace có selected reason hoặc fallback reason rõ ràng.

## Risk

- AI có thể hỏi follow-up nghe tự nhiên nhưng không phục vụ signal đánh giá.
  Mitigation: Mỗi follow-up phải có target enum và được lưu vào trace.

- Persona hoặc pressure có thể làm trải nghiệm quá căng, gây cảm giác bị công kích.
  Mitigation: Pressure mode cần cấu hình trước session, có thể hạ/tắt, và challenge chỉ được nhắm vào evidence của câu trả lời.

- Flow controller có thể chuyển câu quá sớm hoặc probe quá lâu.
  Mitigation: Dùng coverage goal, minimum evidence rule và follow-up budget theo stage/duration.

- AI có thể tự sinh câu hỏi ngoài bank rồi làm mất trace scoring.
  Mitigation: Evaluative round phải dùng probe/curated fallback đã qua hard constraints; câu hỏi tự do chỉ dùng cho transition/clarification không scoring.
