# HOW — 035 DSA AI Socratic Interviewer

## Overview

Mở rộng `live-coding` module với 4 trigger mới ở phía BE (approach submitted, first run AC, first run WA, problem submitted), thêm endpoint nhận user reply và trả AI Socratic response đồng bộ, fix persist bug hiện tại, và thêm targeted short-lived polling ở FE để nhận AI message mới trong vòng ~5 giây sau mỗi trigger. AI Chat panel được bổ sung reply input per message.

## Business Alignment

| BA requirement | Architecture bảo vệ |
|---|---|
| AI hỏi chủ động tại 4 thời điểm | BE-side triggers trong `submitApproach`, `runCode`, `submitProblem` |
| User có thể reply | Endpoint `POST /chat`, conversation appended vào `aiConversation[]` |
| Không block coding flow | Tất cả AI trigger là fire-and-forget; user reply là optional |
| AI message persist ngay | Save session sau mỗi AI call (fix race condition hiện tại) |
| FE nhận message trong ~5s | Targeted short-lived polling sau trigger event |
| Solo mode không có proactive AI | Guard check `session.mode !== 'solo'` ở mỗi trigger |

## Architecture Decisions

### Decision 1: AI message delivery sau trigger

**Option A — Targeted short-lived polling:**
Sau mỗi trigger event, FE bắt đầu poll `GET /live-coding/sessions/:id/ai-messages?after=<timestamp>&problemId=<id>` mỗi 2s, tối đa 8 lần (16s), dừng khi nhận được message mới.
- Pro: Không cần infrastructure mới; aligned với polling pattern hiện có (debrief đã dùng poll); FE có thể dừng poll sau khi nhận message
- Con: Cần endpoint mới nhẹ (không muốn re-fetch toàn bộ session); có window ~2s trước khi message hiện

**Option B — SSE (Server-Sent Events):**
Backend mở SSE channel per session, push AI message ngay khi generate xong.
- Pro: Latency thấp nhất (~0ms sau khi AI response ready)
- Con: Cần SSE infrastructure mới trong NestJS; connection management phức tạp; overkill cho frequency thấp (4 triggers per problem)

**Chọn: Option A — Targeted short-lived polling** vì không cần infrastructure mới, polling pattern đã có precedent rõ trong codebase (debrief poll), và window 2s chấp nhận được với UX badge notification (ứng viên không nhìn tab AI liên tục).

SSE là deferred hardening cho version sau nếu latency cần cải thiện.

---

### Decision 2: User reply — response đồng bộ hay async

**Option A — Đồng bộ trong response body:**
`POST /live-coding/sessions/:id/chat` gọi AI, chờ response (max 8s timeout), trả AI message ngay trong 200 response.
- Pro: FE không cần poll sau reply; UX đơn giản hơn; consistent với "reply → thấy ngay"
- Con: Request timeout nếu Groq chậm; endpoint block tối đa 8s

**Option B — Async + poll:**
POST chat return 202, FE poll giống trigger flow.
- Pro: Không block HTTP request
- Con: Tăng complexity FE; user reply cần UX rõ hơn (loading indicator)

**Chọn: Option A — Đồng bộ** với timeout 8s. User reply là action chủ động; acceptable để chờ response ngắn. Nếu timeout → trả 504 với message "AI không phản hồi, thử lại sau" — không retry tự động.

---

### Decision 3: BE-side vs FE-side trigger

**Option A — BE-side triggers:** BE tự trigger AI trong business methods (`submitApproach`, `runCode`, `submitProblem`) sau khi phase transition xảy ra.
- Pro: Trigger guaranteed — không phụ thuộc FE gọi thêm; logic tập trung ở BE; không cần FE biết về trigger mechanism

**Option B — FE-side triggers:** FE gọi endpoint `/trigger-ai?event=APPROACH_SUBMITTED` sau mỗi action.
- Pro: FE kiểm soát timing; dễ debug từ client
- Con: Có thể bị miss nếu FE không gọi (network error, race); duplicate với business action

**Chọn: Option A — BE-side triggers** vì trigger phải xảy ra guaranteed khi business event xảy ra, không phụ thuộc FE reliability.

---

### Decision 4: Persist pattern sau AI call

**Vấn đề hiện tại:** `onTLE()` và `onIdle()` append vào `session.aiConversation` nhưng không save session → message mất nếu session reload trước lần save tiếp theo.

**Fix:** Mỗi AI method trong `LiveCodingAiService` sau khi append message phải nhận `sessionRepository` (inject vào service) và gọi `sessionRepository.save(session)` trước khi return. Đây là thay đổi bắt buộc áp dụng cho tất cả AI methods (onTLE, onIdle, và 4 methods mới).

---

## System Boundaries

| Owner | Responsibility |
|---|---|
| `LiveCodingService` | Phát hiện điều kiện trigger (first run detection, phase check, mode check); gọi AI method (non-blocking); không xử lý AI logic |
| `LiveCodingAiService` | Build prompt theo trigger type; gọi Groq; append message; save session; return `AiMessage` |
| `GroqService` | HTTP call đến Groq API; không thay đổi |
| `LiveCodingController` | Thêm `POST /chat` route; delegate sang service; không chứa logic |
| FE `dsaSessionSaga` | Trigger short-lived poll sau phase transition actions; gửi user reply; append messages vào Redux state |
| FE `dsaSessionSlice` | Thêm reducer `aiMessageReceived` (đã có) và `userReplySent`; không đổi state shape chính |
| FE `AIChat` component | Render reply input per AI message; hiển thị user messages; không chứa business logic |

**Không thay đổi:** `LiveCodingScoringService`, `DsaDebriefWorker`, debrief prompt, `JudgeService`, `ProblemTemplate` logic, `CombatModule`.

---

## Contracts

### 1. GET /live-coding/sessions/:id/ai-messages

Lightweight endpoint trả AI messages mới sau timestamp — tránh re-fetch toàn bộ session.

```
GET /live-coding/sessions/:sessionId/ai-messages
  ?after=<ISO timestamp>
  &problemId=<uuid>
Auth: JWT Bearer
Response 200:
{
  messages: AiMessage[]   // chỉ messages có sentAt > after và problemId match
}
Response 404: session not found hoặc không thuộc user
```

### 2. POST /live-coding/sessions/:id/chat

User gửi reply; BE gọi AI đồng bộ và trả về AI response.

```
POST /live-coding/sessions/:sessionId/chat
Auth: JWT Bearer
Body:
{
  problemId: string,
  message: string        // user reply text, max 500 chars
}
Response 200:
{
  userMessage: AiMessage,   // { role: 'user', content, trigger: 'USER_REPLY', problemId, sentAt }
  aiMessage: AiMessage      // { role: 'ai', content, trigger: 'USER_REPLY', problemId, sentAt }
}
Response 400: message rỗng hoặc problem phase = DONE
Response 504: AI timeout (>8s)
```

### 3. AiMessage — thêm trigger values

Trigger enum mở rộng (không breaking — thêm values mới):
```
trigger: 'TLE' | 'IDLE' | 'APPROACH_SUBMITTED' | 'FIRST_RUN_AC' | 'FIRST_RUN_WA' | 'PROBLEM_SUBMITTED' | 'USER_REPLY'
```

### 4. State transitions (BE business logic)

Trigger guards — phải check trước khi gọi AI:

| Trigger | Điều kiện cho phép |
|---|---|
| `APPROACH_SUBMITTED` | `session.mode !== 'solo'` và problem phase vừa chuyển sang CODE |
| `FIRST_RUN_AC` | `session.mode !== 'solo'` và đây là lần run đầu tiên (runHistory.length === 1) và tất cả results AC |
| `FIRST_RUN_WA` | `session.mode !== 'solo'` và đây là lần run đầu tiên (runHistory.length === 1) và có ít nhất 1 WA |
| `PROBLEM_SUBMITTED` | `session.mode !== 'solo'` và phase vừa chuyển sang DONE |
| `USER_REPLY` | Problem phase !== DONE; message không rỗng |

Nếu `FIRST_RUN_AC` và `FIRST_RUN_WA` không khả dụng (runHistory.length > 1), skip silently.

### 5. Prompt requirements (per trigger — không phải implementation detail)

Mỗi trigger type có prompt riêng với requirements sau. Dev viết prompt text; SA chốt constraints bắt buộc:

**Constraints chung cho tất cả prompts:**
- Role: AI Interviewer trong DSA session
- Output: 1 câu hỏi Socratic duy nhất, max 3 sentences, không có preamble
- Cấm: không được tiết lộ algorithm/approach cụ thể; không được đề cập Big-O của optimal solution; không được hỏi "bạn có muốn hint không?"
- Language: tiếng Việt (consistent với session language)

**Input context per trigger:**

| Trigger | Context bắt buộc truyền vào prompt |
|---|---|
| `APPROACH_SUBMITTED` | Problem title, difficulty, tags; approach text của ứng viên |
| `FIRST_RUN_AC` | Problem title, tags; run result summary (X/Y pass); approach text |
| `FIRST_RUN_WA` | Problem title, tags; WA test count; approach text |
| `PROBLEM_SUBMITTED` | Problem title, difficulty, tags; approach text; final code complexity (nếu có) |
| `USER_REPLY` | Problem title, phase; conversation history của problem (max 10 turns); user message vừa gửi |

**Fallback output khi Groq fail hoặc timeout:**
- AI methods phải catch error; không append message nếu AI fail; log error với `sessionId`, `trigger`, `problemId`
- Không throw lên caller; caller (LiveCodingService) vẫn tiếp tục business flow

---

## Data & State

**Source of truth:** `LiveCodingSession.aiConversation` (JSONB, TypeORM) là authoritative store cho tất cả AI messages và user replies.

**Persist contract (bắt buộc):**
- Mỗi AI method trong `LiveCodingAiService` phải save session sau khi append message trước khi return
- `LiveCodingAiService` phải nhận `@InjectRepository(LiveCodingSession)` để tự save (thay vì phụ thuộc caller save)
- Fix này áp dụng retroactively cho `onTLE()` và `onIdle()` cùng slice

**User reply persistence:**
- `POST /chat` handler append userMessage + aiMessage vào `session.aiConversation` và save session trước khi return response
- Response body chứa cả hai messages để FE không cần poll

**FE state:**
- `dsaSessionSlice.aiConversation[]` là local mirror của server state
- User reply được append optimistically (trước khi AI response về)
- Khi poll nhận messages mới: merge bằng `sentAt` timestamp (dedup bằng sentAt+role+problemId)

**Không có migration:** `aiConversation` đã là JSONB array — thêm trigger values mới và `role: 'user'` là backward-compatible (cũ không có user messages, mới có thêm).

---

## Quality & Stability Notes

**Latency:**
- AI trigger (fire-and-forget): không ảnh hưởng response time của `submitApproach`/`runCode`/`submitProblem`
- User reply timeout: 8s hard timeout tại BE; nếu quá → 504, FE hiển thị "AI không phản hồi"
- FE targeted poll: interval 2s × 8 attempts = max 16s window; sau đó dừng (không poll vĩnh viễn)

**Fallback:**
- Groq fail bất kỳ trigger nào → log + skip, không block session
- User reply 504 → FE hiển thị error inline trong AIChat, không retry tự động
- Poll timeout (16s không có message) → FE dừng poll silently, tab AI không có badge

**Idempotency:**
- `FIRST_RUN_AC` / `FIRST_RUN_WA` check `runHistory.length === 1` — đảm bảo chỉ fire 1 lần per problem
- `APPROACH_SUBMITTED` / `PROBLEM_SUBMITTED` gắn với phase transition đã có idempotency (phase chỉ chuyển 1 lần)

**Observability (bắt buộc):**
```
Logger.log(`[AI-Trigger] trigger=${trigger} sessionId=${id} problemId=${pid} ms=${elapsed}`)
Logger.error(`[AI-Trigger] FAILED trigger=${trigger} sessionId=${id} error=${err.message}`)
```
Log phải có trigger type, sessionId, problemId, elapsed ms. Không log content của approach text hoặc user message (privacy).

**Privacy:**
- Approach text và user reply là nội dung nhạy cảm; không log nội dung; chỉ log metadata
- Groq nhận approach text và code trong prompt — đây là existing behavior (onTLE/onIdle đã gửi approach text)

**Rollback:**
- Feature flag không cần — nếu cần disable, xóa 4 AI call trong service methods và revert controller route
- Không có schema migration → rollback không phá data cũ

**Concurrent triggers:**
- Nếu `submitApproach` và `runCode` gọi AI gần nhau (ví dụ approach submit + immediate run): cả hai đều fire-and-forget độc lập. Race condition ở DB write (2 saves gần nhau) có thể gây lost update. Mitigation: dùng TypeORM optimistic locking hoặc serialize AI saves với một lock per sessionId. SA khuyến nghị trong slice này: accept eventual consistency (2 messages đều được lưu do timing thực tế cách nhau ít nhất vài giây). Hardening với locking là deferred.

---

## UX Boundary

**Primary workflow (ứng viên):**
- AIChat panel (tab "AI" bên trái) là nơi duy nhất ứng viên thấy AI messages và reply
- Không có interrupt: AI message không popup, không flash, không âm thanh — chỉ badge trên tab
- Reply input xuất hiện inline dưới mỗi AI message, 1 reply per message, ẩn sau khi gửi
- Ứng viên có thể hoàn toàn bỏ qua AIChat và tiếp tục code — không có gating

**Không được dùng raw JSON/payload editor ở bất kỳ đâu trong luồng này.**

**Trạng thái FE cần handle:**
| Trạng thái | Hiển thị |
|---|---|
| Chờ AI message sau trigger | Tab "AI" bình thường (không loading indicator trong slice này) |
| Message mới xuất hiện | Badge "●" trên tab AI |
| User đang gõ reply | Input enabled, nút "Gửi" enabled |
| Đang chờ AI reply response | Nút "Gửi" disabled, input disabled, inline spinner nhỏ |
| AI reply timeout (504) | Inline error text dưới input: "AI không phản hồi, thử lại sau" |
| Problem đã DONE | Reply input ẩn cho tất cả messages của problem đó |

---

## Delivery Slices

Feature này có BE và FE scope đủ lớn để review độc lập. Split thành 2 slices:

### Slice 1 — BE: Triggers + Persist Fix + API Endpoints

**Outcome:** 4 trigger mới hoạt động ở BE, messages persist đúng, 2 endpoint mới sẵn sàng cho FE consume.

**Bao gồm:**
- Fix persist bug trong tất cả AI methods (onTLE, onIdle và mới)
- 4 AI methods mới trong `LiveCodingAiService` với phase-aware prompts
- Guard checks trong `LiveCodingService` (mode check, first-run check, phase check)
- `GET /ai-messages` endpoint
- `POST /chat` endpoint với 8s timeout

**Outcome độc lập:** FE hiện tại vẫn hoạt động; messages mới sẽ xuất hiện khi FE refresh session.

### Slice 2 — FE: AIChat Reply UI + Targeted Polling

**Depends on:** Slice 1 done và endpoints available.

**Bao gồm:**
- Targeted short-lived polling saga sau approach submit, run completed, problem submit
- Reply input UI trong `AIChat` component
- `sendChatReply` saga → `POST /chat` → append cả user message và AI response
- Notification badge trên AI tab
- Error state handling cho 504

**Outcome độc lập:** FE hoàn chỉnh, ứng viên thấy AI questions và có thể reply.

---

## Not Changing

- Debrief engine, scoring formula, BullMQ debrief queue — không đụng tới
- TLE trigger, Idle trigger behavior — chỉ fix persist bug, không thay đổi logic
- Session lifecycle (create, submit, poll score) — không thay đổi
- Combat proctoring, multimodal scoring — không đụng tới
- `dsaSessionSlice` state shape chính (`problems`, `sessionProblems`, `scoring*`) — không đổi
- Practice mode DSA (separate slice/flow) — không đụng tới

---

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase. HOW.md ràng buộc:
- **BE:** Persist contract (save session sau mỗi AI call), guard checks order, timeout value (8s), log format, trigger enum values, endpoint path và response shape
- **FE:** Poll interval (2s), max attempts (8), merge strategy (sentAt dedup), reply cap (1 per message), error message text
- **Không được tự quyết:** transport layer (đã chọn polling), sync/async cho user reply (đã chọn sync), BE vs FE trigger (đã chọn BE-side)
