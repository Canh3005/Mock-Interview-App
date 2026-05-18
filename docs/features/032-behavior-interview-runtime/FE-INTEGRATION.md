# F032 — FE Integration: Thay đổi cần thiết

Tài liệu này map kiến trúc FE hiện tại sang BE mới của F032. Đọc cùng với `IMPLEMENTATION_PLAN.md`.

---

## Tổng quan delta

| Chiều | Hiện tại | F032 |
|---|---|---|
| API path | `/behavioral/sessions/...` | `/api/behavior-sessions/...` |
| Session init | `startSession(interviewSessionId)` → first question | `POST /api/behavior-sessions` với `planId` → `openingTurn` |
| Điều phối stage | User bấm "Giai đoạn tiếp theo" | Server tự động — turns loại `probe_transition`, `stage_transition` |
| Submit answer | `POST .../message` (SSE) | `POST .../answer` (SSE) |
| SSE format | `{ token, done, meta: { starStatus } }` | `{ type: 'evaluating'\|'turn_start'\|'chunk'\|'turn_complete', ... }` |
| Progress tracking | `currentStage: 1–6` (int) | `stageProgress: StageProgress[]` (server-driven) |
| STAR sidebar | `starStatus` từ AI | Không còn — thay bằng probe progress |
| "Kết thúc" | User trigger thủ công | Tự động khi `state === 'COMPLETED'` |

---

## 1. API Layer — file mới `behavior-session.api.js`

Tạo file mới, **không sửa** `behavioral.api.js` (legacy flow vẫn dùng).

```ts
// client/apps/web/src/api/behavior-session.api.js

export const behaviorSessionApi = {
  // Tạo session + kick off pre-render probe questions
  create: (planId: string) =>
    POST /api/behavior-sessions
    body: { planId }
    response: { sessionId, openingTurn: InterviewTurn, state: 'OPENING' }

  // Submit câu trả lời — trả về SSE stream
  submitAnswer: (sessionId: string, content: string) =>
    POST /api/behavior-sessions/:id/answer  (SSE)
    body: { content }
    // SSE events: evaluating → turn_start → chunk... → turn_complete

  // Get session state (resume sau reload)
  getSession: (sessionId: string) =>
    GET /api/behavior-sessions/:id
    response: { state, currentStage, turnHistory, stageProgress[] }

  // Trigger Stage 5 synthesis
  complete: (sessionId: string) =>
    POST /api/behavior-sessions/:id/complete
    response: { sessionId, state: 'COMPLETED' }
}
```

`submitAnswer` dùng `fetchWithAuth` (không phải axiosClient) — giống pattern hiện tại của `createMessageStream`.

---

## 2. SSE Channel — cập nhật format event

SSE channel hiện tại trong `behavioralSaga.js` parse `{ token, done, meta }`. F032 dùng typed events.

```ts
// SSE event types mới
type SSEEvent =
  | { type: 'evaluating' }
  | { type: 'turn_start'; turnType: InterviewTurnType }
  | { type: 'chunk'; token: string }
  | { type: 'turn_complete'; nextTurn: InterviewTurn; state: InterviewState; stageProgress: StageProgress[] }
  | { type: 'error'; message: string }
```

Cần viết `createBehaviorSessionSSEChannel` riêng trong saga mới — **không** sửa channel hiện tại (legacy dùng).

---

## 3. Redux Slice — `behaviorSessionSlice.ts` (mới)

Tạo slice mới thay vì sửa `behavioralSlice.js`. Legacy slice giữ nguyên cho flow cũ.

### State shape

```ts
interface BehaviorSessionState {
  sessionId: string | null
  interviewState: InterviewState | null     // granular state từ server
  currentStageIndex: number
  currentProbeIndex: number
  stageProgress: StageProgress[]            // server-driven, cập nhật sau mỗi turn_complete

  turns: InterviewTurn[]                    // full turn history
  streamingText: string                     // accumulate chunks
  isEvaluating: boolean                     // khi nhận event 'evaluating'
  isStreaming: boolean

  status: 'idle' | 'starting' | 'active' | 'completing' | 'completed' | 'error'
  error: string | null
}
```

### Các action cần có

```ts
// Session lifecycle
createSessionRequest(planId)
createSessionSuccess({ sessionId, openingTurn, state })
createSessionFailure(error)

// Answer submission + SSE
submitAnswerRequest(content)
evaluatingStarted()                         // event 'evaluating' nhận được
turnStreamStart(turnType)                   // event 'turn_start'
streamChunk(token)                          // event 'chunk'
turnComplete({ nextTurn, state, stageProgress })  // event 'turn_complete'
streamError(message)

// Session complete
sessionCompleted()                          // khi interviewState === 'COMPLETED'
```

**Điểm khác biệt quan trọng:** không có `nextStageRequest` — stage transition xảy ra tự động qua `turnComplete` khi server trả về `nextTurn.type === 'stage_transition'`.

---

## 4. Redux Saga — `behaviorSessionSaga.ts` (mới)

```ts
function* createSessionSaga(action) {
  // action.payload = planId
  const data = yield call(behaviorSessionApi.create, planId)
  yield put(createSessionSuccess(data))
  // openingTurn tự động thêm vào turns
}

function* submitAnswerSaga(action) {
  const { sessionId } = yield select(s => s.behaviorSession)
  const { content } = action.payload

  yield put(addUserTurn(content))           // optimistic

  const channel = yield call(createBehaviorSessionSSEChannel, sessionId, content)

  while (true) {
    const event = yield take(channel)
    switch (event.type) {
      case 'evaluating':
        yield put(evaluatingStarted())
        break
      case 'turn_start':
        yield put(turnStreamStart(event.turnType))
        break
      case 'chunk':
        yield put(streamChunk(event.token))
        break
      case 'turn_complete':
        yield put(turnComplete(event))
        // Nếu state === 'COMPLETED' → trigger complete flow
        if (event.state === 'COMPLETED') {
          yield put(sessionCompleted())
        }
        channel.close()
        return
      case 'error':
        yield put(streamError(event.message))
        channel.close()
        return
    }
  }
}
```

---

## 5. Components

### 5.1. `BehavioralRoomPage.jsx` — thay đổi đáng kể

**Bỏ:**
- Nút "Giai đoạn tiếp theo" — transitions tự động qua server turns
- Nút "Kết thúc" thủ công — detect `interviewState === 'COMPLETED'`
- `starStatus` logic

**Thêm:**
- `EvaluatingIndicator` — hiển thị khi `isEvaluating === true` (interviewer đang suy nghĩ)
- Render turn types mới: `probe_transition`, `stage_transition`, `stage_intro`, `redirect` hiển thị khác với `probe_question` và `follow_up`

**Giữ nguyên:**
- Layout 3 cột (stage panel, chat, sidebar)
- Timer logic
- Navigate to scoring khi `status === 'completed'`

### 5.2. `StageProgressPanel.jsx` — rewrite UI, giữ layout

Hiện tại: hardcode 6 stage labels, track bằng `currentStage: number`.

Sau F032: render từ `stageProgress: StageProgress[]` — server trả về với `status: 'pending' | 'active' | 'completed' | 'skipped'` và probe-level breakdown.

```ts
// New props
interface StageProgressPanelProps {
  stageProgress: StageProgress[]
  currentStageIndex: number
}
```

Có thể thêm probe progress bar trong mỗi stage (probesCompleted / totalProbes).

### 5.3. `StarGuidePanel.jsx` — ẩn hoàn toàn

Không render `StarGuidePanel` trong F032 room. Sidebar phải chỉ còn `StageProgressPanel`. Layout 3 cột thu về 2 cột (stage panel + chat).

### 5.4. `ChatInterface.jsx` — thay đổi nhỏ

- Giữ nguyên text input, voice input, character counter, paste warning
- Thêm: disable input khi `isEvaluating === true` hoặc `isStreaming === true`
- Turn types mới (`redirect`, `probe_transition`, `stage_transition`, `stage_intro`) render như câu nói thường của interviewer trong chat — cùng bubble style với `probe_question` và `follow_up`. Không dùng modal hay overlay cho transitions.

---

## 6. Interview Setup — thay đổi nhỏ

### Vấn đề: F032 nhận `planId`, không phải `interviewSessionId`

`initSession` BE trả thêm `planId` (F030 plan được tạo khi init). FE lưu vào `interviewSetup.session`.

```ts
// interviewSetupSlice.js — thêm vào session object
session: {
  sessionId,
  candidateLevel,
  estimatedDuration,
  planId,           // ← mới, từ F030
}
```

`BehavioralRoomPage` đọc `planId` từ `interviewSetup.session` để gọi `createSessionRequest(planId)` thay vì `startSessionRequest(interviewSessionId)`.

---

## 7. Những gì KHÔNG thay đổi

| Phần | Lý do giữ nguyên |
|---|---|
| `behavioral.api.js` | Legacy flow (non-probe-based) vẫn chạy |
| `behavioralSlice.js` | Legacy slice — không đụng |
| `behavioralSaga.js` | Legacy saga — không đụng |
| `fetchWithAuth.js` | SSE pattern giữ nguyên |
| `useVoiceInput` hook | Không liên quan đến BE changes |
| `InterviewSetupFlow.jsx` | Chỉ thêm `planId` vào session object |
| `BehavioralConfigPanel.jsx` | depth + duration vẫn dùng cho F030 planning |
| `InterviewRoomRoute.jsx` | Guard logic không đổi |
| `RoundTransitionScreen.jsx` | Round transition logic không đổi |
| `/scoring` page | F033 xử lý |
| Combat mode | Dùng flow riêng — không liên quan F032 |

---

## 8. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| FE-1 | `StarGuidePanel` giữ hay thay? | **Ẩn hoàn toàn** — layout thu về 2 cột |
| FE-2 | BE `initSession` có trả `planId` không? | **Có** — `initSession` trả thêm `planId` |
| FE-3 | `probe_transition`, `stage_transition` hiển thị thế nào? | **Chat bubble thường** — như câu nói interviewer, không modal |
