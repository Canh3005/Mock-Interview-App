## WHAT

Trong DSA session, AI chủ động đặt câu hỏi Socratic tại các thời điểm quan trọng của phiên phỏng vấn — ngay sau khi ứng viên submit approach, sau lần run đầu tiên, và sau khi submit bài — thay vì chỉ phản ứng khi idle 5 phút hoặc TLE. Ứng viên có thể reply vào từng câu hỏi của AI để tiếp tục đối thoại. AI không spoil đáp án mà dẫn dắt ứng viên tự suy nghĩ sâu hơn.

## WHY

Hiện tại AI chỉ là hint provider thụ động: nói khi ứng viên im 5 phút hoặc bị TLE. Phần lớn session AI im lặng hoàn toàn. Đây là coding judge với scoring đẹp, không phải interview simulator. Khoảng cách này là lý do ứng viên vẫn cần Pramp sau khi dùng sản phẩm — vì ở Pramp có người hỏi follow-up theo thời gian thực. Feature này lấp khoảng cách đó bằng AI: AI nói đúng lúc, hỏi đúng chỗ, dẫn dắt đúng hướng. Kết quả phụ: conversation history phong phú hơn → debrief chất lượng cao hơn vì LLM có thêm dữ liệu về quá trình tư duy.

## Epic Context

Thuộc epic Live Coding DSA (010-combat-mode-dsa đã done). Feature này là bước nâng cấp từ reactive AI (chỉ phản ứng sự kiện cố định) sang proactive AI interviewer (hỏi chủ động tại phase transition). Không thay đổi scoring, không thay đổi debrief engine — chỉ bổ sung chiều sâu conversation history mà debrief vốn đã consume.

Depends on: `010-combat-mode-dsa` (đã done — session lifecycle, trigger infrastructure, aiConversation model đã có)
Blocks: Nếu chưa có feature này, debrief engine thiếu user reply context → phân tích "followUpPerformance" kém độ sâu.

## SCOPE

**In:**
- AI proactive question tại 4 trigger mới: approach submitted, first run AC, first run WA, problem submitted
- User có thể gõ và gửi reply vào từng AI message trong AIChat panel
- AI respond Socratically với user reply (không spoil solution, max 3 câu)
- Phase-aware prompts: AI biết đang ở phase nào và đặt câu hỏi phù hợp với phase đó
- AI messages được persist ngay lập tức sau khi generate (fix race condition hiện tại)
- FE nhận AI message mới trong vòng ~5 giây sau trigger (targeted short-lived polling)
- Toàn bộ user replies được lưu vào `aiConversation[]` để debrief phân tích
- Áp dụng cho practice mode và combat mode; **không** áp dụng cho solo mode

**Out:**
- Streaming token-by-token cho AI response (deferred)
- Real-time push qua WebSocket hoặc SSE (deferred)
- TLE trigger và Idle trigger hiện có — không thay đổi behavior, chỉ fix persist bug
- AI tự chủ follow-up không cần trigger sự kiện (deferred)
- Debrief scoring thêm chiều "reply quality" (deferred — debrief đã có `followUpPerformance` field, tự cải thiện nhờ richer history)
- Whiteboard, voice reply, TTS cho proactive questions (out of scope)

## Business Flow

### Happy Path

1. Ứng viên submit approach → hệ thống ghi nhận, chuyển phase sang CODE
2. Trong vòng 5 giây, AI gửi 1 câu hỏi vào AIChat panel: ví dụ "Approach của bạn xử lý trường hợp mảng rỗng như thế nào?" (trigger: `APPROACH_SUBMITTED`)
3. AIChat tab hiển thị notification badge; ứng viên có thể tiếp tục code hoặc mở tab để reply
4. Nếu ứng viên reply → AI gửi 1 câu follow-up Socratic thêm (không block coding)
5. Ứng viên run code lần đầu:
   - Nếu tất cả visible test AC → AI hỏi về optimization: "Solution hiện tại đạt O(n²) — bạn có thể tối ưu không?" (trigger: `FIRST_RUN_AC`)
   - Nếu có WA → AI hỏi về debug direction: "Test case nào fail? Bạn sẽ kiểm tra phần nào của code trước?" (trigger: `FIRST_RUN_WA`)
6. Ứng viên tiếp tục run/debug bình thường (AI không hỏi thêm trong giai đoạn này, trừ TLE/Idle trigger đã có)
7. Ứng viên submit problem → AI gửi 1 extension question: "Nếu dữ liệu tăng gấp 1000 lần, solution này có scale không?" (trigger: `PROBLEM_SUBMITTED`)
8. Ứng viên có thể reply hoặc bỏ qua, sau đó hệ thống chuyển sang bài tiếp theo (countdown 3s như hiện tại)
9. Toàn bộ conversation (câu hỏi AI + user replies) lưu vào session → debrief nhận đủ context

### Edge Cases & Business Rules

**Không block flow:**
- Nếu AI call fail hoặc timeout → session tiếp tục bình thường, không hiển thị lỗi cho ứng viên; trigger event vẫn được log
- Nếu ứng viên không reply → AI không push thêm; hệ thống chờ trigger tiếp theo

**Thứ tự trigger:**
- Mỗi trigger chỉ kích hoạt 1 lần per problem: `FIRST_RUN_AC` và `FIRST_RUN_WA` chỉ fire ở lần run **đầu tiên**, không phải mỗi lần run
- Nếu ứng viên đã submit problem (phase = DONE) → không nhận thêm proactive question cho problem đó
- `PROBLEM_SUBMITTED` trigger chỉ fire khi phase chuyển sang DONE, không fire lại nếu đã DONE

**Concurrent triggers:**
- Nếu nhiều trigger xảy ra gần nhau (ví dụ approach submit ngay sau session start) → chỉ xử lý trigger đang pending, bỏ qua trigger mới cho đến khi AI message trước được persist

**Solo mode:**
- Không kích hoạt bất kỳ proactive trigger nào trong solo mode (consistent với behavior hiện tại của idle/TLE trigger)

**Conversation cap:**
- Mỗi AI message chỉ nhận tối đa 1 lượt reply từ ứng viên; nếu muốn tiếp tục thì chờ trigger tiếp theo (tránh chatbot rabbit hole làm mất focus coding)

## UI Boundary

Ứng viên thao tác toàn bộ qua **AIChat panel** (tab bên trái trong DSASessionPage, đã có sẵn):

**Trạng thái bình thường:**
- AIChat hiển thị conversation thread theo từng message (AI và user) của problem đang active
- Khi có AI message mới: tab "AI" hiển thị badge số (ví dụ "AI ●")
- Dưới mỗi AI message có 1 input text nhỏ kèm nút "Reply" — chỉ hiện khi problem chưa DONE và chưa có reply cho message đó

**Khi ứng viên gửi reply:**
- Ứng viên thấy reply của mình xuất hiện ngay trong thread (optimistic UI)
- AI response xuất hiện trong vài giây (không có typing indicator trong slice này)
- Reply input ẩn đi sau khi đã gửi (1 reply per AI message)

**Không expose:**
- Trigger type (`APPROACH_SUBMITTED`, `FIRST_RUN_AC`, ...) không hiển thị cho ứng viên
- Không có nút "Skip" hoặc "Dismiss" — AI message đơn giản là một phần của conversation thread

**Action tiếp theo sau AI message:**
- Ứng viên có thể reply hoặc chuyển sang tab Problem/Workspace để tiếp tục code; không có ràng buộc

## Acceptance Criteria

- Given ứng viên đang ở practice mode hoặc combat mode, When ứng viên submit approach, Then trong vòng 5 giây AIChat nhận 1 câu hỏi Socratic liên quan đến approach vừa submit (ví dụ edge case, constraint xử lý)

- Given ứng viên run code lần đầu tiên và tất cả visible test pass (AC), When run hoàn tất, Then trong vòng 5 giây AI hỏi 1 câu về cải thiện complexity hoặc space

- Given ứng viên run code lần đầu tiên và có ít nhất 1 WA, When run hoàn tất, Then trong vòng 5 giây AI hỏi 1 câu dẫn dắt debug (không spoil)

- Given ứng viên submit problem (phase = DONE), When submit thành công, Then trong vòng 5 giây AI hỏi 1 câu extension về scalability hoặc variation

- Given AI đã gửi 1 câu hỏi, When ứng viên nhập reply và gửi, Then reply xuất hiện trong conversation thread và AI gửi 1 câu follow-up Socratic trong vòng 5 giây

- Given AI call bị lỗi hoặc timeout ở bất kỳ trigger nào, When hệ thống xử lý, Then session tiếp tục bình thường, ứng viên không thấy thông báo lỗi, trigger event được ghi log

- Given ứng viên đang ở solo mode, When bất kỳ phase transition nào xảy ra, Then không có proactive AI question nào được gửi

## Risk

**HIGH** — Feature có 3 nguồn rủi ro đồng thời:

- **AI output không deterministic:** AI có thể vô tình gợi ý thuật toán (spoil solution) hoặc đặt câu hỏi lạc đề, làm mất focus ứng viên
  Mitigation: Prompt engineering có explicit constraint "không tiết lộ algorithm, không đề cập Big-O của optimal solution"; review prompt với test cases edge trước khi release

- **Latency gián đoạn coding flow:** AI call mất 2–5 giây; nếu message xuất hiện đúng lúc ứng viên đang gõ code có thể gây mất tập trung
  Mitigation: Badge notification thay vì interrupt; ứng viên chủ động mở tab AI khi muốn

- **Race condition persist:** Hiện tại onTLE/onIdle không save session sau AI call → message có thể mất nếu session reload trước lần save tiếp theo
  Mitigation: Fix persist pattern bắt buộc trong slice này — save session ngay sau append AI message
