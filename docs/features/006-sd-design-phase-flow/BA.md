## WHAT

Redesign luồng DESIGN phase của AI Interviewer: thay vì canvas và chat cùng mở đồng thời, phase DESIGN được tách thành hai sub-state tuần tự — **(1) Drawing:** ứng viên vẽ diagram trong khi chat bị block hoàn toàn, kết thúc bằng cách ấn nút "Done Drawing"; **(2) Explanation:** canvas lock lại, chat mở ra, AI hỏi ứng viên giải thích từng thành phần đã vẽ cho đến khi AI xác nhận ứng viên đã cover hết — lúc đó phase mới chuyển sang DEEP_DIVE.

---

## WHY

Luồng hiện tại cho phép ứng viên vừa vẽ vừa chat cùng lúc trong DESIGN phase, dẫn đến hai vấn đề thực tế:

1. **Ứng viên vẽ xong, không giải thích gì** — AI không có trigger rõ ràng để hỏi, phải chờ silence detection kích hoạt sau 90 giây. Transcript thiếu explanation dù diagram đã đầy đủ.
2. **Điều kiện chuyển phase mơ hồ** — AI tự judge "diagram is substantial" mà không có signal cụ thể từ ứng viên, dẫn đến transition sớm hoặc muộn.

Luồng mới phản ánh đúng thực tế phỏng vấn: vẽ trước — giải thích sau. Việc ứng viên chủ động ấn "Done Drawing" tạo ra một signal rõ ràng, loại bỏ ambiguity trong cả UX lẫn logic chuyển phase.

---

## Epic Context

**Nằm trong:** Phase 3 — System Design Mock Interview Round (extension của Epic 4: `004-sd-ai-interviewer`)

**Vị trí trong epic:**
- **Phụ thuộc vào:** `004-sd-ai-interviewer` (DESIGN phase hiện tại đang hoạt động) + `005-sd-silence-detection` (cần biết đầy đủ để xác định impact và điều chỉnh behavior)
- **Ảnh hưởng đến:** `005-sd-silence-detection` — xem mục Impact Analysis bên dưới
- **Cung cấp cho:** Epic 6 (Evaluation Engine) — transcript explanation richer hơn do ứng viên bắt buộc phải giải thích diagram

---

## SCOPE

**In:**
- **Xóa drawing silence trigger:** `[CANVAS_ONLY_ACTIVE]` trigger và toàn bộ canvas-watch logic bị xóa khỏi frontend hook, backend prompt, và SILENCE_TRIGGER_PROTOCOL — trở thành dead code sau redesign này.
- **Chat block trong drawing sub-state:** Khi DESIGN phase bắt đầu, chat input bị disable hoàn toàn. Ứng viên chỉ có thể tương tác với canvas.
- **Nút "Done Drawing":** Hiển thị trong suốt drawing sub-state. Ứng viên ấn khi hoàn thành diagram.
- **Canvas lock sau "Done Drawing":** Sau khi ấn, canvas chuyển sang read-only — không cho thêm/xóa/sửa node hoặc edge.
- **Chat unblock sau "Done Drawing":** Chat input được enable, ứng viên có thể gõ và gửi message.
- **AI hỏi ngay sau "Done Drawing":** AI nhận signal → lập tức hỏi ứng viên walk through diagram (không chờ ứng viên gõ trước).
- **AI hỏi về từng component đã vẽ (Option A — AI judges):** AI có danh sách drawn components trong context, hỏi Socratic cho đến khi tự xác định ứng viên đã giải thích hết. Không có metric số bên ngoài AI.
- **`[PHASE_COMPLETE]` chỉ khi explain đủ:** AI append `[PHASE_COMPLETE]` khi và chỉ khi tất cả drawn components đã được ứng viên giải thích đầy đủ — không dựa trên "diagram is substantial" như hiện tại.

**Out:**
- Thay đổi `componentCoverage` (drawn vs expected) — giữ nguyên cho curveball eligibility
- Cho phép ứng viên edit canvas sau khi đã ấn "Done Drawing" — canvas lock là irreversible trong session
- Tự động detect "done drawing" dựa trên idle time — chỉ ứng viên chủ động ấn nút mới trigger

**Depends on:**
- `004-sd-ai-interviewer` — DESIGN phase, phase transition logic, `[PHASE_COMPLETE]` signal
- `005-sd-silence-detection` — cần đọc để handle impact đúng

**Blocks:**
- `006` hoàn thành trước mới có transcript explanation quality đủ tốt cho Epic 6 Evaluation

---

## Impact Analysis — Features Hiện Tại

### 005-sd-silence-detection

Đây là feature bị ảnh hưởng trực tiếp nhất.

**Drawing silence bị xóa hoàn toàn:**

Drawing silence (`[CANVAS_ONLY_ACTIVE]` trigger) được thiết kế cho luồng cũ — ứng viên vừa vẽ vừa có thể chat. Với luồng mới, trigger này không bao giờ có thể fire được ở bất kỳ sub-state nào:
- Drawing sub-state: vẽ là hành động được kỳ vọng → không cần interrupt
- Explanation sub-state: canvas locked → không có node mới → trigger không bao giờ fire

→ **Xóa drawing silence trigger khỏi codebase:**
- `client/apps/web/src/hooks/useSilenceDetection.js` — xóa canvas-watch logic và `DRAWING_SILENCE` trigger type
- `client/apps/web/src/store/sagas/sdInterviewerSaga.js` — xóa `DRAWING_SILENCE` branch trong `_handleSilenceTrigger`
- `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` — xóa section `DESIGN — drawing silence ([CANVAS_ONLY_ACTIVE:N: {nodes}])` khỏi `SILENCE_TRIGGER_PROTOCOL`

**Total silence được điều chỉnh:**

| Sub-state | Total silence |
|---|---|
| **Drawing sub-state** (chat blocked) | PAUSED — ứng viên không thể chat dù muốn; vẽ là việc cần làm |
| **Explanation sub-state** (chat open) | ACTIVE bình thường — ứng viên chưa giải thích → AI nhắc sau 90s |

- Silence counter (`silenceCount`) reset về 0 khi chuyển từ drawing → explanation sub-state.

### 004-sd-ai-interviewer — Prompt thay đổi

DESIGN phase prompt hiện có rule: *"When diagram is substantial and time is appropriate: append [PHASE_COMPLETE]"* — rule này đã được cập nhật thành *"append [PHASE_COMPLETE] khi AI xác nhận ứng viên đã giải thích hết toàn bộ drawn components"*.

Ngoài ra cần bổ sung vào prompt: AI phải hỏi ngay lập tức khi nhận signal "Done Drawing" thay vì chờ ứng viên gõ trước.

---

## Business Flow

### Happy Path

**Drawing sub-state (canvas open, chat blocked)**

1. CLARIFICATION complete → phase chuyển sang DESIGN → canvas unlock
2. **Mới:** Chat input bị disable, nút "Done Drawing" xuất hiện
3. Ứng viên kéo thả các component vào canvas: Client → Load Balancer → API Server → Database → Cache
4. Ứng viên hài lòng với diagram → ấn "Done Drawing"
5. Canvas chuyển sang read-only, nút "Done Drawing" biến mất
6. Chat input được enable

**Explanation sub-state (canvas locked, chat open)**

7. AI nhận signal → lập tức hỏi: *"Could you walk me through how these components fit together?"*
8. Ứng viên giải thích: *"Client gọi qua Load Balancer để distribute traffic đến API Server..."*
9. AI follow-up về component chưa được giải thích: *"Bạn có thể nói thêm về Cache trong thiết kế này không?"*
10. Ứng viên giải thích Cache strategy
11. AI xác nhận tất cả drawn components đã được giải thích → append `[PHASE_COMPLETE]`
12. Phase chuyển sang DEEP_DIVE

### Edge Cases & Business Rules

| Trường hợp | Hành động | Kết quả từ góc nhìn ứng viên |
|---|---|---|
| Ứng viên ấn "Done Drawing" khi canvas trống (0 node) | Hệ thống chặn action — nút "Done Drawing" disabled khi canvas rỗng | Ứng viên không thể bỏ qua drawing bước mà không vẽ gì |
| Ứng viên muốn sửa diagram sau khi ấn "Done Drawing" | Canvas đã lock, không cho sửa | Ứng viên phải giải thích diagram hiện tại — không được chỉnh lại |
| Ứng viên giải thích nhưng bỏ qua 1-2 component nhỏ | AI tiếp tục hỏi về component chưa được đề cập (không nêu tên component) | Ứng viên được nudge nhẹ nhàng |
| Ứng viên im lặng ở explanation sub-state > 90s | Silence detection (total silence) fire như bình thường | AI nhắc ứng viên bắt đầu giải thích |
| DESIGN phase timeout (15 phút) trước khi explain xong | Phase force-transition sang DEEP_DIVE dù AI chưa append [PHASE_COMPLETE] | Phiên tiếp tục bình thường — ứng viên không bị stuck mãi |
| Ứng viên vừa ấn "Done Drawing" xong, AI đang streaming | "Done Drawing" signal được queue — AI xử lý xong lượt hiện tại rồi mới nhận signal | Không race condition giữa AI response và canvas lock |

**Business Rules:**
- Nút "Done Drawing" disabled khi canvas rỗng (0 node)
- Canvas lock sau "Done Drawing" là irreversible trong session — không có "undo"
- Silence detection hoàn toàn paused trong drawing sub-state; chỉ total silence được bật lại ở explanation sub-state
- AI phải hỏi về drawn components ngay sau khi nhận "Done Drawing" signal, không chờ ứng viên gõ trước
- `[PHASE_COMPLETE]` chỉ được append khi AI xác nhận ứng viên đã giải thích đủ toàn bộ drawn components — AI tự judge dựa trên danh sách components trong context

---

## Acceptance Criteria

```
AC 1: Chat block trong drawing sub-state
Given phase vừa chuyển sang DESIGN (từ CLARIFICATION complete)
When canvas unlock
Then chat input bị disable (ứng viên không thể gõ hay submit)
     Nút "Done Drawing" xuất hiện

Given canvas rỗng (0 node)
When ứng viên muốn ấn "Done Drawing"
Then nút "Done Drawing" trong trạng thái disabled — không thể ấn

---

AC 2: Done Drawing → canvas lock, chat unblock
Given ứng viên đang ở drawing sub-state với ít nhất 1 node trên canvas
When ứng viên ấn "Done Drawing"
Then canvas chuyển sang read-only ngay lập tức (không thêm/xóa/sửa được)
     Chat input được enable
     Nút "Done Drawing" biến mất

---

AC 3: AI hỏi ngay sau Done Drawing
Given canvas vừa lock (explanation sub-state bắt đầu)
When ứng viên chưa gõ bất kỳ message nào
Then AI chủ động gửi message hỏi ứng viên walk through diagram
     AI không chờ ứng viên gõ trước

---

AC 4: AI hỏi đủ toàn bộ drawn components
Given explanation sub-state đang diễn ra, ứng viên vừa giải thích một số components
When AI xác nhận một số components chưa được đề cập
Then AI hỏi follow-up về component chưa được giải thích (không nêu tên component trực tiếp)
     AI không append [PHASE_COMPLETE] khi còn component chưa được explain

Given ứng viên đã giải thích toàn bộ drawn components
When AI xác nhận đủ
Then AI append [PHASE_COMPLETE] → phase chuyển sang DEEP_DIVE

---

AC 5: Silence detection behavior thay đổi
Given ứng viên đang ở drawing sub-state (chat blocked)
When bất kỳ khoảng thời gian im lặng nào (kể cả > 90s)
Then silence timer KHÔNG chạy — không có trigger nào được gửi

Given ứng viên vừa chuyển sang explanation sub-state (chat unblocked)
When ứng viên không gửi message trong 90 giây
Then total silence trigger fire bình thường
     [CANVAS_ONLY_ACTIVE] trigger KHÔNG tồn tại — đã bị xóa

Given ứng viên vừa chuyển từ drawing → explanation sub-state
When silence counter từ drawing sub-state
Then silenceCount reset về 0 cho explanation sub-state

---

AC 6: Phase timeout vẫn hoạt động
Given DESIGN phase đã kéo dài 15 phút (PHASE_MAX_MS)
When timeout triggered dù ứng viên chưa explain xong
Then phase force-transition sang DEEP_DIVE
```

---

## Risk

**HIGH** — 2 rủi ro chính:

**1. AI judge "đã explain đủ" không chính xác:**
- **Impact:** [PHASE_COMPLETE] không bao giờ được append (AI quá strict) → ứng viên stuck trong explanation loop cho đến phase timeout. Hoặc [PHASE_COMPLETE] được append quá sớm (AI quá lenient) → DEEP_DIVE bắt đầu dù ứng viên chưa giải thích hết.
- **Mitigation:** PHASE_MAX_MS (15 phút) là safety net cứng — phase luôn chuyển sau 15 phút dù AI không signal. Phase prompt phải instruct AI rõ ràng: danh sách drawn components được cung cấp sẵn trong context, AI track từng component nào đã được mention trong conversation.

**2. Canvas lock irreversible gây frustration:**
- **Impact:** Ứng viên ấn "Done Drawing" nhầm hoặc muốn chỉnh sửa sau khi đã lock → không thể sửa, phải giải thích diagram chưa hoàn chỉnh.
- **Mitigation:** Thêm confirmation dialog trước khi lock: *"Are you sure you're done drawing? You won't be able to edit the canvas after this."* Nút "Done Drawing" chỉ disabled khi canvas rỗng — không disable theo bất kỳ điều kiện nào khác để tránh ứng viên bị kẹt.
