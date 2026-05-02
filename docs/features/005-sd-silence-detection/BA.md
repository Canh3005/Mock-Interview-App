## WHAT

Khi ứng viên im lặng trong phòng phỏng vấn System Design — không gửi message trong chat — hệ thống tự động phát hiện và kích hoạt AI Interviewer hỏi một câu gợi ý phù hợp với phase hiện tại. Có hai dạng im lặng cần xử lý khác nhau: **(1) im lặng hoàn toàn** (không chat, không vẽ) và **(2) im lặng mô tả** (chỉ vẽ diagram trên canvas mà không giải thích bằng lời). Mỗi phase có ngưỡng thời gian và hành vi AI riêng biệt.

---

## WHY

AI Interviewer hiện tại là **reactive** — chỉ phản hồi khi ứng viên gửi message. Nếu ứng viên im lặng, không có gì xảy ra. Trong thực tế phỏng vấn, im lặng kéo dài có hai nguyên nhân hoàn toàn khác nhau:

- **Ứng viên đang suy nghĩ** → không cần can thiệp sớm
- **Ứng viên bị stuck, không biết làm gì** → cần được gợi ý để tiếp tục

Trường hợp thứ hai — đặc biệt ở DESIGN phase khi ứng viên chỉ vẽ mà không mô tả — hiện tại AI **hoàn toàn không biết** là candidate đang làm gì. Canvas thay đổi nhưng không có message nào gửi lên, AI không có trigger để hỏi. Kết quả là ứng viên vẽ xong một diagram nhưng không giải thích gì, mất điểm articulation mà không được nhắc nhở.

Feature này **unlock điều kiện để Epic 4 (Evaluation Engine) có transcript đủ chất lượng** — nếu ứng viên chỉ vẽ mà không nói, transcript sẽ trống rỗng và evaluation không có gì để đánh giá ngoài diagram structure.

---

## Epic Context

**Nằm trong:** Phase 3 — System Design Mock Interview Round (extension của Epic 4)

**Vị trí trong epic:**
- **Phụ thuộc vào:** `004-sd-ai-interviewer` phải done — cần `transcriptHistory`, phase state machine, và AI chat endpoint đang hoạt động. `003-sd-whiteboard` phải done — cần canvas emit sự kiện khi node thay đổi.
- **Cung cấp cho:** Epic 6 (Evaluation Engine) — silence detection đảm bảo transcript có đủ exchange để evaluate Trade-off Articulation và Communication dimensions. Không có feature này, ứng viên vẽ-không-nói sẽ có transcript rỗng ở DESIGN phase.
- **Không block epic nào ngay lập tức** nhưng ảnh hưởng chất lượng data của toàn bộ evaluation pipeline.

**Luồng lớn hơn:** Feature này là một *sub-behavior* bên trong từng phase của Epic 4 — nó không thêm phase mới, không thay đổi state machine. Nó chỉ thêm một trigger mới (time-based + canvas-watch) song song với trigger hiện tại (user message).

---

## SCOPE

**In:**
- **Silence timer per phase:** Frontend đếm thời gian im lặng (không có message nào được gửi). Ngưỡng khác nhau theo phase. Khi đạt ngưỡng → frontend gửi system trigger message lên AI để AI hỏi một câu phù hợp.
- **Canvas-only trigger (chỉ DESIGN phase):** Khi ứng viên thêm node mới vào canvas nhưng không gửi message mô tả trong vòng 90 giây → frontend gửi trigger kèm danh sách node vừa thêm để AI hỏi ứng viên giải thích.
- **Phân biệt hai loại im lặng:**
  - *Total silence* — không chat, không vẽ (ứng viên bị stuck hoàn toàn)
  - *Drawing silence* — vẽ canvas nhưng không chat (chỉ xảy ra ở DESIGN phase)
- **Giới hạn số lần trigger mỗi phase:** Tối đa 2 lần silence trigger mỗi phase để tránh AI làm phiền liên tục. Lần 2 kèm gợi ý ứng viên có thể dùng nút Hint nếu cần.
- **Reset timer khi ứng viên active:** Bất kỳ message nào gửi lên, hoặc node mới được vẽ (với DESIGN phase), đều reset bộ đếm.
- **Voice input được coi là active:** Khi ứng viên đang ghi âm (isListening = true), không tính là im lặng.

**Out:**
- Tự động chuyển phase do im lặng — silence không trigger phase transition (đây là responsibility của Epic 4 time guard)
- Kết thúc session sớm do im lặng — hệ thống không tự end session
- Silence detection cho phase COMPLETED — không cần thiết

**Depends on:**
- `003-sd-whiteboard` — canvas phải emit event khi node thêm/xóa (hiện đã có qua Redux store `sdSession.architectureJSON`)
- `004-sd-ai-interviewer` — AI chat endpoint và transcript history phải hoạt động

**Blocks:**
- Không block feature nào ngay lập tức
- Ảnh hưởng chất lượng data của Epic 6 (Evaluation) nếu chưa có

---

## Business Flow

### Happy Path

**Scenario A — Im lặng hoàn toàn ở CLARIFICATION (ứng viên không biết hỏi gì)**

1. AI gửi đề bài mở đầu: *"In today's session, I'd like you to design a search autocomplete system. Where would you like to start?"*
2. Ứng viên đọc đề nhưng không biết hỏi gì, không gửi message
3. Sau **90 giây** không có message → frontend gửi trigger `[CANDIDATE_SILENT]` vào AI chat
4. AI nhận trigger → gửi một câu meta question nhẹ: *"Take your time — is there anything about the problem you'd like to clarify before we begin?"* (không reveal dimension cụ thể)
5. Ứng viên bắt đầu hỏi → timer reset, flow bình thường tiếp tục

**Scenario B — Im lặng mô tả ở DESIGN (ứng viên chỉ vẽ, không giải thích)**

1. Canvas unlock, AI mở DESIGN phase: *"Great, the canvas is now open. Please start drawing your high-level architecture."*
2. Ứng viên drag Load Balancer → API Server → Database vào canvas, không gửi message nào
3. Sau **90 giây** kể từ lần cuối thêm node mà không có message → frontend gửi trigger `[CANVAS_ONLY_ACTIVE: LoadBalancer, APIServer, Database]`
4. AI nhận trigger kèm danh sách node → hỏi: *"I can see you've added some components. Can you walk me through how they connect in your design?"*
5. Ứng viên bắt đầu giải thích qua chat → timer reset, flow bình thường

**Scenario C — Im lặng lần 2 cùng phase (ứng viên vẫn stuck)**

1. Ứng viên đã nhận được lần nhắc thứ nhất, trả lời qua loa, sau đó im lặng lại
2. Timer reset và bắt đầu đếm lại
3. Sau **90 giây** tiếp theo không có message → frontend gửi trigger lần 2
4. AI nhận trigger lần 2 → nhắc nhẹ hơn và gợi ý dùng Hint: *"No rush — if you're unsure where to go next, you can always request a hint."*
5. Sau lần 2: **không trigger thêm** trong phase đó — AI đã nhắc đủ, không làm phiền tiếp

### Edge Cases & Business Rules

| Trường hợp | Hành động | Kết quả từ góc nhìn ứng viên |
|-----------|-----------|------------------------------|
| Ứng viên đang ghi âm (voice input active) | Silence timer bị pause — ghi âm được coi là active | Ứng viên không bị interrupt giữa câu |
| Ứng viên gửi message ngay trước khi trigger fired | Timer reset, trigger bị cancel | Ứng viên không nhận prompt thừa |
| Canvas thay đổi do undo/redo (không thêm node mới) | Không tính là "canvas active" — chỉ watch node thêm mới | Ứng viên edit lại diagram không bị trigger nhầm |
| Phase transition xảy ra trong khi timer đang chạy | Timer reset hoàn toàn, counter về 0 cho phase mới | Phase mới bắt đầu clean, không carry over silence state |
| Ứng viên đã dùng hết 2 lần trigger trong phase | Không gửi thêm trigger dù tiếp tục im lặng | AI không spam — ứng viên được yên để suy nghĩ |
| Trigger gửi lên nhưng AI đang loading (response chưa về) | Trigger bị drop — không queue thêm | Không có race condition giữa trigger và normal message |
| DEEP_DIVE hoặc WRAP_UP: ứng viên im lặng sau khi AI hỏi | Timer bắt đầu sau AI message, không phải sau user message | AI hỏi xong → ứng viên có 90s để trả lời trước khi bị nhắc |

**Business Rules:**

| Rule | Detail |
|------|--------|
| Ngưỡng thời gian im lặng | CLARIFICATION: 90s — DESIGN: 90s (total silence) / 90s sau lần cuối thêm node (drawing silence) — DEEP_DIVE: 90s — WRAP_UP: 120s |
| Giới hạn trigger mỗi phase | Tối đa 2 lần — lần 2 kèm gợi ý dùng Hint |
| Voice input = không phải im lặng | `isListening === true` → pause timer |
| Trigger không được gửi khi AI đang loading | `loading === true` → skip trigger, không queue |
| Timer đo từ lúc nào | Từ lần cuối cùng user gửi message (với total silence) hoặc lần cuối thêm node (với drawing silence ở DESIGN) |
| Drawing silence chỉ áp dụng ở DESIGN | Các phase khác không watch canvas |

---

## Phase-Specific Silence Behavior

Mỗi phase có mục tiêu riêng biệt — câu AI trigger khi im lặng phải phản ánh đúng mục tiêu đó, không phải câu generic "are you still there?". Dưới đây là chi tiết cho từng phase: ứng viên đang làm gì, im lặng có nghĩa là gì, AI được/không được làm gì.

---

### CLARIFICATION

**Ứng viên đang làm gì:** Đặt câu hỏi làm rõ yêu cầu bài toán — functional scope, non-functional constraints, target users, scale.

**Im lặng có nghĩa là:** Ứng viên chưa biết bắt đầu hỏi từ đâu, hoặc đang đọc đề mà chưa hình thành câu hỏi.

**AI không được làm:** Gợi ý trực tiếp dimension cần hỏi (ví dụ "have you thought about scale?" hay "what about DAU?") — điều này che đi tín hiệu đánh giá về khả năng tự xác định scope của ứng viên. Evaluation dimension *Requirement Clarification* đánh giá chính xác khả năng này.

**AI nên làm:** Nhắc nhẹ rằng ứng viên được phép hỏi, mở không gian mà không reveal dimension cụ thể.

| Lần | Ngưỡng | Ví dụ câu AI |
|-----|--------|--------------|
| 1st | 90s không có message | *"Take your time. Is there anything about the problem statement you'd like to clarify before we dive in?"* |
| 2nd | 90s tiếp theo | *"No rush — if you're unsure where to start, a hint is available from the panel."* |

---

### DESIGN

**Ứng viên đang làm gì:** Vẽ high-level architecture diagram và giải thích lý do chọn component, cách chúng kết nối, trade-off sơ bộ.

**Có hai loại im lặng — hành vi AI khác nhau:**

**A — Total silence (không chat, không vẽ):**

Ứng viên có thể đang suy nghĩ tổng thể hoặc không biết bắt đầu từ đâu. Không có canvas event nào trong window này.

AI nên hỏi về hướng tiếp cận tổng thể — mở, không chỉ định component cụ thể.

| Lần | Ngưỡng | Ví dụ câu AI |
|-----|--------|--------------|
| 1st | 90s không có message, không có node mới | *"Feel free to start wherever makes sense to you — which part of the system would you like to tackle first?"* |
| 2nd | 90s tiếp theo | *"No problem — take your time. If you'd like a starting point, a hint is available."* |

**B — Drawing silence (vẽ canvas nhưng không chat):**

Ứng viên đang thêm component vào diagram nhưng không giải thích — transcript sẽ rỗng dù design đang tiến triển. AI nhận được danh sách node vừa thêm qua trigger payload, cần dùng thông tin đó để hỏi cụ thể chứ không hỏi chung chung.

AI không được hỏi "what are you designing?" khi đã thấy node list — hỏi cụ thể về những component đó.

| Lần | Ngưỡng | Ví dụ câu AI |
|-----|--------|--------------|
| 1st | 90s sau lần cuối thêm node, không có message | *"I can see you've added [LoadBalancer, APIServer, Database]. Could you walk me through how these components fit together?"* |
| 2nd | 90s tiếp theo | *"Whenever you're ready — feel free to explain your diagram, or request a hint if you'd like some guidance."* |

---

### DEEP_DIVE

**Ứng viên đang làm gì:** Trả lời các câu hỏi probe của AI về từng design decision — lý do chọn DB nào, tại sao dùng cache ở điểm đó, trade-off giữa consistency và availability, v.v.

**Im lặng có nghĩa là:** AI vừa đặt câu probe, ứng viên chưa trả lời. Thường phản ánh độ khó của câu hỏi, không phải ứng viên bị stuck hoàn toàn như CLARIFICATION.

**Điểm khác biệt quan trọng:** Timer ở DEEP_DIVE bắt đầu ngay sau AI gửi câu hỏi (không phải sau user message cuối cùng). Nếu AI hỏi và user không trả lời 90s → trigger.

**AI không được làm:**
- Lặp lại nguyên câu hỏi cũ — gây cảm giác bị chấm điểm thêm lần nữa
- Hỏi câu probe mới khi câu cũ chưa được trả lời — vi phạm flow một câu một lúc của DEEP_DIVE
- Gợi ý câu trả lời đúng hoặc hint về trade-off cụ thể

**AI nên làm:** Nudge cực nhẹ — có thể nhắc lại một khía cạnh nhỏ của câu hỏi để giúp ứng viên có điểm bắt đầu, hoặc mời họ bắt đầu từ bất kỳ góc độ nào.

| Lần | Ngưỡng | Ví dụ câu AI |
|-----|--------|--------------|
| 1st | 90s sau AI gửi câu probe | *"Take your time. Feel free to start with whichever aspect comes to mind first."* |
| 2nd | 90s tiếp theo | *"No pressure — if this is a tricky one, a hint is available if you'd like."* |

> **Tone note:** DEEP_DIVE là phase đánh giá chất lượng tư duy, không phải phase hỗ trợ. AI phải giữ tone trung lập, không tạo thêm áp lực — câu trigger chỉ là "mở cửa", không phải "thúc ép".

---

### WRAP_UP

**Ứng viên đang làm gì:** Tổng kết những quyết định thiết kế đã đưa ra, nêu trade-off đã thảo luận, chia sẻ những điểm họ muốn cải thiện thêm nếu có thêm thời gian.

**Im lặng có nghĩa là:** Ứng viên không biết nên tổng kết gì, hoặc đã nói hết và đang chờ AI đóng session. Nhịp tự nhiên của WRAP_UP chậm hơn — đây là lý do ngưỡng 120s thay vì 90s.

**AI không được làm:**
- Đặt câu hỏi probe mới (DEEP_DIVE đã kết thúc — không mở lại)
- Introduce topic hoặc component mới chưa được thảo luận
- Đánh giá design thêm hoặc so sánh với giải pháp "đúng"

**AI nên làm:** Mời ứng viên reflection — nhìn lại toàn bộ session, nêu điều họ muốn revisit hoặc làm khác. Câu hỏi mở, không có câu trả lời đúng sai.

| Lần | Ngưỡng | Ví dụ câu AI |
|-----|--------|--------------|
| 1st | 120s không có message | *"We're wrapping up — is there anything about your design you'd like to revisit or clarify before we close?"* |
| 2nd | 120s tiếp theo | *"Feel free to share any final thoughts. If nothing comes to mind, that's perfectly fine too — we can close here."* |

---

## Acceptance Criteria

```
AC 1: Total silence ở CLARIFICATION
Given ứng viên đang ở phase CLARIFICATION, canvas locked
When không có message nào được gửi trong 90 giây liên tiếp
Then AI gửi một câu meta question không reveal dimension cụ thể
     Silence counter trong phase = 1

Given silence counter = 1, ứng viên tiếp tục im lặng thêm 90 giây
When trigger lần 2 fired
Then AI nhắc nhẹ và đề cập ứng viên có thể dùng Hint
     Silence counter trong phase = 2, không trigger thêm dù tiếp tục im lặng

---

AC 2: Drawing silence ở DESIGN (canvas thay đổi nhưng không chat)
Given ứng viên đang ở phase DESIGN, canvas unlock
When ứng viên thêm ít nhất 1 node mới vào canvas
     VÀ không gửi message nào trong 90 giây sau lần thêm node cuối
Then AI hỏi ứng viên giải thích diagram, kèm tên các node vừa thêm trong ngữ cảnh câu hỏi

Given ứng viên gửi message mô tả trong vòng 90 giây sau khi thêm node
When timer chưa hết
Then trigger bị cancel, timer reset — không có prompt thừa

---

AC 3: Timer reset khi active
Given silence timer đang chạy (bất kỳ phase nào)
When ứng viên gửi 1 message bất kỳ
Then timer reset về 0

Given silence timer đang chạy ở DESIGN phase
When ứng viên thêm 1 node mới vào canvas
Then canvas-watch timer reset về 0

Given ứng viên đang ghi âm (voice input active)
When isListening === true
Then silence timer bị pause cho đến khi ghi âm kết thúc

---

AC 4: Không trigger khi AI đang xử lý
Given AI đang trong trạng thái loading (response chưa về)
When silence timer đạt ngưỡng
Then trigger bị drop — AI không nhận trigger chồng lên message đang xử lý

---

AC 5: Phase transition reset hoàn toàn
Given silence counter = 1 ở phase CLARIFICATION
When phase chuyển sang DESIGN
Then silence counter reset về 0
     Timer reset, bắt đầu đếm mới cho DESIGN

---

AC 6: DEEP_DIVE — timer bắt đầu sau AI hỏi
Given AI vừa gửi một câu hỏi probe ở DEEP_DIVE
When ứng viên không trả lời trong 90 giây
Then AI gửi một nudge nhẹ (không lặp lại câu hỏi cũ)
```

---

## Risk

**HIGH** — 2 rủi ro chính:

**1. False positive: trigger fired khi ứng viên đang suy nghĩ (không thực sự stuck):**
- **Impact:** AI interrupt tư duy của ứng viên, gây mất tập trung — trải nghiệm tiêu cực, cảm giác bị giám sát
- **Mitigation:** Ngưỡng 90 giây (không phải 30-60s) đủ dài để phân biệt "đang nghĩ" với "bị stuck". Giới hạn 2 lần/phase tránh spam. Câu prompt của AI là mềm mại, không phán xét.

**2. Race condition giữa silence trigger và user message:**
- **Impact:** AI nhận cả trigger và message gần như cùng lúc → gửi 2 response liên tiếp, UI lộn xộn, transcript bị noise
- **Mitigation:** Frontend check `loading === true` trước khi fire trigger — nếu AI đang xử lý thì drop trigger. Frontend cũng cancel pending trigger ngay khi user bắt đầu gõ (onChange, không phải onSend).
