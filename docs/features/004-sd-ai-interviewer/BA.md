## WHAT

Epic 3 xây dựng AI Interviewer Engine — thành phần làm cho System Design mock interview trở thành "phỏng vấn thật" thay vì "điền form". AI đóng vai interviewer chủ động: mở đề bài, đặt câu hỏi follow-up theo 4 phase tuần tự (Clarification → High-level Architecture → Deep Dive → Edge Cases), nhận ArchitectureJSON từ canvas ứng viên để theo dõi `componentCoverage` realtime, và inject curveball scenario đúng lúc khi ứng viên đang làm tốt. Ứng viên giao tiếp qua text chat; AI không bao giờ cho câu trả lời thẳng dù ứng viên yêu cầu.

---

## WHY

Phần lớn platform luyện System Design hiện tại là dạng form/text — ứng viên tự vẽ sơ đồ, tự giải thích, không có ai hỏi ngược. Thiếu 3 yếu tố cốt lõi của phỏng vấn thật:

1. **Interviewer hỏi lại** — "Tại sao chọn Kafka? Tại sao không Redis?"
2. **Phase gate** — Nếu không hỏi đủ yêu cầu, không được vẽ sơ đồ
3. **Pressure test** — Curveball thay đổi constraint giữa chừng

Epic này cung cấp toàn bộ 3 yếu tố đó — là lý do chính khiến platform khác với các tool self-study thông thường.

Epic 3 cũng là prerequisite của Epic 4 (Evaluation Engine): `transcriptHistory`, `componentCoverage`, `curveballAdaptation` từ epic này là input bắt buộc cho toàn bộ scoring dimensions.

---

## Epic Context

**Nằm trong:** Phase 3 — System Design Mock Interview Round

**Vị trí trong epic:**
- **Phụ thuộc vào:** Epic 0 (`curveBallScenarios`, `expectedComponents`, `scalingConstraints` từ problem bank) + Epic 1 (`SDSession` entity có `phase`, `transcriptHistory`, `hintsUsed`, `architectureJSON`) + Epic 2 (ArchitectureJSON format contract `{ nodes, edges }` + canvas phase unlock mechanism)
- **Cung cấp cho:** Epic 4 (Evaluation Engine cần `transcriptHistory`, `componentCoverage`, `curveballAdaptation`) + Epic 5 (Debrief cần annotated transcript)
- **Phụ thuộc runtime:** ArchitectureJSON diff từ Epic 2 canvas — Epic 3 consume realtime trong session

**Luồng lớn hơn:**
- Ứng viên vào SDSession → AI mở đầu với đề bài → phase `CLARIFICATION` (chat, canvas locked) → AI xác nhận đủ clarification → unlock canvas (trigger Epic 2 via PATCH phase) → phase `HIGH_LEVEL_ARCHITECTURE` (AI theo dõi diagram) → phase `DEEP_DIVE` (AI probe component đã vẽ) → phase `EDGE_CASES` (curveball nếu đủ điều kiện) → AI kết thúc session → trigger Epic 4 evaluation

**Vì sao tách epic:** AI Interviewer là conversational engine riêng biệt — state machine phase, curveball logic, hint tracking. Tách để có thể test phase transitions và curveball rules độc lập với canvas rendering (Epic 2).

---

## SCOPE

**In:**
- **AI mở đầu phiên:** Đọc `SDProblem.description` từ session, gửi message mở đầu (đề bài nguyên văn) — không thêm chi tiết, không gợi ý scope (ứng viên phải tự hỏi)
- **Phase-aware conversation — 4 phase tuần tự:**
  - `CLARIFICATION` (8–12 phút): AI theo dõi câu hỏi của ứng viên về scope, scale (QPS/DAU), non-functional requirements (latency, consistency, availability); hỏi Socratic nếu ứng viên bỏ qua dimension quan trọng; detect "clarification đủ quality" → trigger phase transition
  - `HIGH_LEVEL_ARCHITECTURE` (12–15 phút): AI gửi yêu cầu vẽ kiến trúc tổng thể, nhận ArchitectureJSON diff mỗi update (throttle 30s), tính `componentCoverage` realtime; hỏi Socratic nếu ứng viên im lặng > 60s
  - `DEEP_DIVE` (15–20 phút): AI chọn 1–2 component từ diagram để probe sâu; câu hỏi chỉ về component ứng viên đã vẽ — không hỏi về component không có trong diagram
  - `EDGE_CASES` (còn lại): AI hỏi failure scenarios, scaling limits; inject curveball nếu đủ điều kiện
- **Phase transition tự động:** AI detect điều kiện chuyển phase (elapsed time + keyword trigger + AI confidence) → PATCH `/sd-sessions/:id { phase }` → kích hoạt canvas unlock phía Epic 2 (khi chuyển sang `HIGH_LEVEL_ARCHITECTURE`)
- **Curveball injection:**
  - Điều kiện bật: `componentCoverage >= 80%` AND `phase IN [HIGH_LEVEL_ARCHITECTURE, DEEP_DIVE, EDGE_CASES]` AND `session.enableCurveball = true`
  - Inject 1 scenario từ `problem.curveBallScenarios[]` — không generate on-the-fly
  - Hard block bất khả vi phạm: `componentCoverage < 60%` hoặc không có node mới trong 5 phút → không inject dù config bật
  - Mỗi session inject tối đa 1 curveball; `curveballInjectedAt` được log vào session
  - JSON diff của diagram trước/sau curveball ghi vào `curveballAdaptation`
- **Hint mechanism:**
  - Ứng viên click "Hint" → AI đặt câu hỏi Socratic gợi ý hướng suy nghĩ (không cho câu trả lời thẳng)
  - Mỗi hint log vào `SDSession.hintsUsed` → Epic 4 dùng để tính penalty
  - AI không cho câu trả lời trực tiếp dù ứng viên yêu cầu ("Nói thẳng cho tôi")
- **Transcript management:**
  - Mọi AI-candidate exchange append vào `SDSession.transcriptHistory` với `{ role, content, timestamp, phase }`
  - Summarize transcript sau mỗi phase transition (giữ summary, drop full detail cũ) để kiểm soát context window
- **AI payload optimization:**
  - Chỉ gửi JSON diff (node/edge được thêm/xóa) cho AI khi diagram update — không gửi full ArchitectureJSON mỗi lần
  - Throttle diagram evaluation tối đa 1 lần/30s để kiểm soát chi phí token

**Out:**
- TTS (Text-to-Speech) cho AI response — chỉ có trong Combat Mode (phase sau)
- STT / voice input — trách nhiệm của Epic 2 canvas (`useVoiceInput` hook)
- Evaluation scoring và debrief — Epic 4 và Epic 5
- Session initialization và problem selection — Epic 1
- Canvas rendering và unlock UI — Epic 2 (Epic 3 chỉ trigger phase change qua PATCH API)

**Depends on:**
- `001-sd-problem-bank` — `SDProblem.curveBallScenarios`, `SDProblem.expectedComponents`, `SDProblem.description`, `SDProblem.scalingConstraints` phải có sẵn
- `002-sd-personalization-setup` — `SDSession` entity phải có `phase`, `transcriptHistory`, `hintsUsed`, `architectureJSON`, `enableCurveball`, `sessionDuration`
- `003-sd-whiteboard` — ArchitectureJSON format `{ nodes, edges }` phải đồng nhất; backend nhận PATCH `phase` từ Epic 3 để trigger canvas unlock

**Blocks:**
- Epic 4 — Evaluation Engine cần `transcriptHistory`, `componentCoverage` cuối session, `curveballAdaptation` từ Epic 3
- Epic 5 — Debrief cần annotated transcript từ Epic 3 output

---

## Business Flow

### Happy Path

**Phase CLARIFICATION — Ứng viên hỏi yêu cầu**

1. Ứng viên vào SDSession → AI gửi message đề bài nguyên văn: *"Hãy thiết kế một hệ thống URL Shortener như TinyURL. Câu hỏi đầu tiên của bạn là gì?"* — canvas vẫn locked
2. Ứng viên hỏi scope: *"DAU khoảng bao nhiêu? Read-heavy hay write-heavy?"* → AI trả lời thực tế từ `scalingConstraints` nhưng không tự bổ sung thêm requirement
3. Ứng viên bỏ qua non-functional requirements → AI hỏi Socratic: *"Bạn có muốn hỏi về latency requirements không?"* (không đưa câu trả lời)
4. Ứng viên hỏi đủ 3 dimension (scope + scale + non-functional) → AI confirm: *"Bạn đã clarify đủ. Hãy bắt đầu vẽ kiến trúc."* → PATCH `phase = HIGH_LEVEL_ARCHITECTURE`
5. Canvas unlock (Epic 2 nhận phase change) — phiên chuyển sang phase tiếp theo

**Phase HIGH_LEVEL_ARCHITECTURE — Ứng viên vẽ diagram**

1. AI gửi yêu cầu: *"Canvas đã mở. Hãy vẽ kiến trúc tổng thể của hệ thống."*
2. Ứng viên drag Client → Load Balancer → API Server → Database → Cache vào canvas
3. Mỗi 30s AI nhận JSON diff → tính `componentCoverage = 5/7 expected = 71%` → curveball chưa eligible (< 80%)
4. Ứng viên im lặng 60s → AI hỏi Socratic: *"Bạn đang nghĩ đến component nào tiếp theo?"*
5. Ứng viên vẽ thêm Message Queue, Worker → `componentCoverage = 7/7 = 100%`
6. Elapsed time đủ → PATCH `phase = DEEP_DIVE`

**Phase DEEP_DIVE — AI probe component**

1. AI chọn Cache và Message Queue từ diagram để probe
2. AI hỏi: *"Tại sao bạn dùng Redis ở đây? Cache invalidation strategy của bạn là gì?"*
3. Ứng viên giải thích write-through strategy → AI follow-up: *"Nếu cache miss rate 80%, database chịu áp lực thế nào?"*
4. Ứng viên không biết → click "Hint" → AI hỏi gợi ý Socratic: *"Database sẽ nhận bao nhiêu request trong trường hợp đó?"* → `hintsUsed = 1`
5. Elapsed time đủ → PATCH `phase = EDGE_CASES`

**Phase EDGE_CASES — Curveball**

1. AI hỏi failure scenario: *"Database primary fail đột ngột, hệ thống xử lý thế nào?"*
2. `componentCoverage = 100%` → curveball eligible → AI inject từ `problem.curveBallScenarios[0]`: *"Nếu traffic Black Friday tăng 50×, kiến trúc hiện tại nghẽn ở đâu?"*
3. Ứng viên update diagram (thêm horizontal scaling, CDN) → JSON diff ghi vào `curveballAdaptation`
4. Elapsed time = `sessionDuration` → AI kết thúc: *"Phiên phỏng vấn kết thúc. Cảm ơn bạn đã tham gia."* → PATCH `phase = COMPLETED`

### Edge Cases & Business Rules

| Trường hợp | Hành động | Kết quả từ góc nhìn ứng viên |
|-----------|-----------|------------------------------|
| `clarificationTimeLimit` hết nhưng chưa hỏi đủ | AI tự kết thúc Clarification: *"Hết thời gian. Canvas mở."* → PATCH phase | Ứng viên biết mình thiếu clarification; canvas mở, phiên tiếp tục bình thường |
| Ứng viên im lặng > 5 phút (không vẽ, không chat) | AI nhắc lần 1: *"Bạn có thể tiếp tục vẽ hoặc cần gợi ý không?"* — không tự động kết thúc | Ứng viên được nhắc mà không bị ép kết thúc sớm |
| `componentCoverage < 60%` khi đến curveball window | Curveball bị block — AI chuyển sang câu hỏi edge case thông thường | Ứng viên không biết curveball bị skip (trải nghiệm liền mạch) |
| Curveball đã inject 1 lần | Không inject lần 2 dù điều kiện vẫn thỏa | Ứng viên không bị bombard với nhiều curveball trong 1 session |
| Ứng viên yêu cầu câu trả lời thẳng | AI từ chối: *"Tôi không thể đưa đáp án — thử suy nghĩ về [gợi ý Socratic]"* | Ứng viên không nhận đáp án trực tiếp; vẫn được gợi ý hướng suy nghĩ |
| AI probe 3 follow-up nhưng ứng viên vẫn bế tắc với 1 component | AI chuyển sang probe component khác trong diagram | Ứng viên không bị stuck với 1 câu hỏi quá lâu |
| `sessionDuration` hết giờ giữa chừng bất kỳ phase | AI gửi kết thúc ngay → PATCH `phase = COMPLETED` | Phiên kết thúc đúng giờ, không bị kéo dài |
| JSON diff gửi lên nhưng ArchitectureJSON invalid | AI bỏ qua diff đó, dùng last valid state để tính `componentCoverage` | componentCoverage không bị corrupt; curveball logic an toàn |

**Business Rules:**
- **Phase chỉ tăng, không giảm:** `CLARIFICATION → HIGH_LEVEL_ARCHITECTURE → DEEP_DIVE → EDGE_CASES → COMPLETED` — không revert
- **Curveball tối đa 1 lần/session:** Dù đủ điều kiện nhiều lần, chỉ inject 1 scenario
- **Hint là Socratic:** AI không được đưa câu trả lời dù ứng viên nhấn Hint hoặc yêu cầu trực tiếp
- **Câu hỏi Deep Dive chỉ về component đã vẽ:** AI không hỏi về component không có trong diagram
- **Curveball hard block bất khả vi phạm:** `componentCoverage < 60%` OR không có node mới trong 5 phút → block curveball dù `enableCurveball = true`
- **Throttle diagram evaluation:** AI không evaluate mỗi diagram change — chỉ 1 lần tối đa mỗi 30s

---

## Acceptance Criteria

```
AC 1: Mở đầu phiên — AI gửi đề bài nguyên văn
Given SDSession với phase="CLARIFICATION"
When ứng viên load session lần đầu
Then AI gửi message đề bài từ SDProblem.description
     AI không thêm chi tiết, không gợi ý câu hỏi đầu tiên
     Canvas vẫn disabled

---

AC 2: Phase Transition CLARIFICATION → HIGH_LEVEL_ARCHITECTURE
Given ứng viên đã hỏi scope + scale + non-functional requirements trong phase CLARIFICATION
When AI detect clarification đủ quality (hybrid: keyword trigger + AI confidence >= 0.8) hoặc clarificationTimeLimit hết
Then AI gửi confirmation message: "Bạn đã clarify đủ. Hãy bắt đầu vẽ kiến trúc."
     Backend PATCH SDSession.phase = "HIGH_LEVEL_ARCHITECTURE"
     Canvas unlock (Epic 2 nhận phase change)

Given ứng viên chưa hỏi đủ nhưng bỏ qua 1 dimension quan trọng
When AI detect dimension bị skip (scale hoặc non-functional)
Then AI hỏi Socratic gợi ý (không tự khai báo thông tin, không reveal đáp án)

---

AC 3: ComponentCoverage Tracking
Given phase="HIGH_LEVEL_ARCHITECTURE", SDProblem.expectedComponents có 7 component
When ứng viên vẽ 5 component trong expectedComponents
Then SDSession.componentCoverage = 5/7 ≈ 71%

Given ứng viên im lặng (không chat, không vẽ) > 60s
When AI detect inactivity
Then AI gửi 1 Socratic prompt (không reveal component cụ thể thiếu)

---

AC 4: Deep Dive — Probe chỉ về component đã vẽ
Given phase="DEEP_DIVE", diagram có [Cache, MessageQueue, Database] nhưng không có APIGateway
When AI chọn component để probe
Then AI hỏi về ít nhất 1 component đã vẽ (Cache/MessageQueue/Database)
     AI không hỏi về APIGateway (không có trong diagram)

Given AI probe Cache, ứng viên không trả lời được sau 3 follow-up
When AI detect bế tắc tại component đó
Then AI chuyển sang probe component khác trong diagram

---

AC 5: Curveball Injection
Given phase="EDGE_CASES", componentCoverage=100%, enableCurveball=true
When AI kiểm tra eligibility
Then AI inject 1 scenario từ problem.curveBallScenarios[] (không generate on-the-fly)
     SDSession.curveballInjectedAt được log
     JSON diff diagram trước/sau ghi vào SDSession.curveballAdaptation

Given componentCoverage=55% (<60%)
When AI kiểm tra curveball eligibility
Then curveball KHÔNG được inject dù enableCurveball=true

Given curveball đã inject 1 lần trong session
When AI kiểm tra lại eligibility
Then curveball KHÔNG inject lần 2

---

AC 6: Hint Mechanism
Given ứng viên click "Hint" khi đang trong bất kỳ phase nào
When AI xử lý hint request
Then AI gửi Socratic question (gợi ý hướng suy nghĩ, không cho đáp án)
     SDSession.hintsUsed tăng thêm 1

Given ứng viên yêu cầu "nói thẳng cho tôi biết" (không dùng nút Hint)
When AI nhận request
Then AI từ chối đáp án, cung cấp Socratic gợi ý (hintsUsed không tăng khi không click Hint button)

---

AC 7: Session kết thúc đúng giờ
Given sessionDuration = 45 phút
When elapsed time = 45 phút (bất kể phase hiện tại)
Then AI gửi message kết thúc, PATCH SDSession.phase = "COMPLETED"
     FE nhận phase change → chuyển sang Debrief

---

AC 8: Transcript Management
Given bất kỳ AI-candidate exchange nào trong session
When message được gửi/nhận
Then message append vào SDSession.transcriptHistory với { role, content, timestamp, phase }

Given phase transition xảy ra (bất kỳ phase nào)
When chuyển sang phase mới
Then transcript của phase cũ được summarize
     SDSession.transcriptHistory tiếp tục với summary entry thay vì full detail
     (giảm context window cho các AI call tiếp theo)
```

---

## Risk

**HIGH** — Epic này có 3 rủi ro HIGH:

**1. AI không detect đúng phase transition (Clarification → High-level):**
- **Impact:** Canvas unlock sai lúc — quá sớm (ứng viên skip clarification, không hiểu yêu cầu) hoặc quá muộn (ứng viên hỏi đủ rồi nhưng phải chờ). Mất tính xác thực của phỏng vấn
- **Mitigation:** Hybrid detection: rule-based (elapsed time threshold + keyword trigger: QPS/DAU/latency/scale đã xuất hiện) + AI confidence score >= 0.8. Sau `clarificationTimeLimit`, tự động transition dù AI confidence chưa đủ

**2. Curveball inject sai lúc — phá tâm lý ứng viên đang bế tắc:**
- **Impact:** Ứng viên abandon session, negative experience lan rộng nếu nhiều người gặp. Mâu thuẫn với giá trị cốt lõi của platform
- **Mitigation:** Hard rule bất khả vi phạm (bypass mọi config): check `componentCoverage < 60%` OR không có node mới trong 5 phút → block curveball. Rule này executes trước mọi inject attempt, không thể override

**3. Token cost bùng nổ — real-time AI call mỗi diagram update:**
- **Impact:** Chi phí vận hành tăng không kiểm soát; nếu bị rate limit → AI không respond → phiên treo giữa chừng
- **Mitigation:** Chỉ gửi JSON diff (không full diagram); throttle diagram evaluation max 1 lần/30s; summarize transcript sau mỗi phase transition. Monitor token usage per session — alert nếu vượt threshold
