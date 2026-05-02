## Overview

Pure-frontend timer-based silence detection implemented as a custom React hook (`useSilenceDetection`) that manages two independent timers — one for total silence (all phases) and one for drawing silence (DESIGN only). When a timer fires, it dispatches `silenceTriggerRequest` through the `sdInterviewer` saga to the existing `POST /sd-sessions/:id/message` endpoint, passing a sentinel marker (`[CANDIDATE_SILENT]` hoặc `[CANVAS_ONLY_ACTIVE: ...]`) cùng `isSilenceTrigger: true`. Backend nhận marker, lưu vào transcript với `role: 'system-trigger'` (không đếm vào user exchange count), và sinh ra AI nudge đúng phase. Không cần endpoint mới, không cần DB schema change.

---

## Architectural Decisions

### Decision 1: Silence state storage — Frontend vs Backend

**Option A — Frontend Redux (`sdInterviewerSlice`):**
- Pro: Không cần DB migration
- Pro: Scoped tự nhiên theo tab session — reload = fresh start (acceptable, streaming state đã mất khi reload rồi)
- Con: Mất khi reload — acceptable

**Option B — Backend DB (`silenceCount` column trên `SDSession`):**
- Pro: Survive reload, có thể audit
- Con: Cần migration, column không có giá trị evaluation

**Chọn: Option A** — `silenceCount` là UI state của session, không phải evaluation data. Evaluation engine không cần biết số lần candidate bị silent-prompted.

---

### Decision 2: Timer management — Custom hook vs Saga channel

**Option A — Custom hook `useSilenceDetection`:**
- Pro: Timer fit tự nhiên với React component lifecycle (useRef + useEffect cleanup)
- Pro: Pause/resume với `isListening` trivial qua dependency array
- Con: Logic timer nằm ngoài saga pattern

**Option B — Saga `eventChannel` với timer:**
- Pro: Nhất quán với saga pattern hiện tại
- Con: Pause/resume cần complex channel management; debounce/cancel trong saga verbose

**Chọn: Option A** — timer management là component lifecycle concern, không phải side effect cần saga.

---

### Decision 3: Trigger delivery — Same endpoint vs New endpoint

**Option A — Reuse `POST /sd-sessions/:id/message` với sentinel marker:**
- Pro: Không cần route mới
- Pro: `role: 'system-trigger'` đã có trong `TranscriptEntry` — backend đã sẵn sàng cho pattern này
- Pro: AI streaming response reuse toàn bộ saga stream-handling code hiện tại
- Con: Field `userMessage` bị overload với system content

**Option B — Endpoint mới `POST /sd-sessions/:id/silence-trigger`:**
- Pro: Clean separation
- Con: Route mới + controller method mới + DTO mới — thừa complexity

**Chọn: Option A** — sentinel marker pattern đã có precedent (`[PHASE_COMPLETE]` trong AI response); `system-trigger` role trong `TranscriptEntry` xác nhận design đã có ý định này.

---

## Backend Changes (`server/`)

### `server/src/sd-interviewer/dto/create-sd-message.dto.ts`

Thêm hai optional field vào DTO hiện tại:

```typescript
@ApiProperty({ required: false })
@IsOptional()
@IsBoolean()
isSilenceTrigger?: boolean;

@ApiProperty({ required: false })
@IsOptional()
@IsInt()
@Min(1)
@Max(2)
silenceCount?: number;
```

---

### `server/src/sd-interviewer/sd-interviewer.service.ts`

**Thay đổi 1 — Transcript storage trong `sendMessage()` (hoặc method xử lý message):**

Khi `dto.isSilenceTrigger === true`:
- Lưu transcript entry với `role: 'system-trigger'` thay vì `role: 'user'`
- Không increment user exchange count (field đang dùng để guard `PHASE_MIN_EXCHANGES`)

```typescript
const transcriptRole = dto.isSilenceTrigger ? 'system-trigger' : 'user';
session.transcriptHistory.push({
  role: transcriptRole,
  content: dto.userMessage,
  timestamp: new Date().toISOString(),
  phase: session.phase,
});
```

**Thay đổi 2 — Silence-handling block trong `_buildSystemPrompt()`:**

Append đoạn sau vào system prompt (English only):

```
--- SILENCE TRIGGER PROTOCOL ---
When the conversation history contains a system-trigger entry with [CANDIDATE_SILENT] or [CANVAS_ONLY_ACTIVE: ...], the candidate has been silent past the threshold. This is an automated check-in. Respond naturally as an interviewer — do NOT say "I noticed you were silent" or "You haven't responded."

Select your response by matching the current phase and silenceCount passed in the system trigger:

CLARIFICATION
  count=1: "Take your time. Is there anything about the problem statement you'd like to clarify before we dive in?"
  count=2: "No rush — if you're unsure where to start, a hint is available from the panel."

DESIGN — total silence ([CANDIDATE_SILENT])
  count=1: "Feel free to start wherever makes sense to you — which part of the system would you like to tackle first?"
  count=2: "No problem — take your time. If you'd like a starting point, a hint is available."

DESIGN — drawing silence ([CANVAS_ONLY_ACTIVE: {nodes}])
  count=1: "I can see you've added {nodes}. Could you walk me through how these components fit together?"
  count=2: "Whenever you're ready — feel free to explain your diagram, or request a hint if you'd like guidance."

DEEP_DIVE
  count=1: "Take your time. Feel free to start with whichever aspect comes to mind first."
  count=2: "No pressure — if this is a tricky one, a hint is available if you'd like."

WRAP_UP
  count=1: "We're wrapping up — is there anything about your design you'd like to revisit or clarify before we close?"
  count=2: "Feel free to share any final thoughts. If nothing comes to mind, that's perfectly fine too — we can close here."

Keep your response to 1–2 sentences. Do not ask a follow-up question. Do not introduce new topics. Do not evaluate the candidate's progress in this response.
--- END SILENCE TRIGGER PROTOCOL ---
```

---

## Frontend Changes (`client/apps/web/`)

### `src/store/slices/sdInterviewerSlice.js`

- `initialState`: thêm `silenceCount: 0`
- Thêm reducer `silenceTriggerRequest(state)`: tăng `state.silenceCount` lên 1
- `extraReducers`: listen cho `phaseUpdated` từ `sdSessionSlice` → reset `silenceCount` về 0

```javascript
// trong reducers:
silenceTriggerRequest: (state) => {
  state.silenceCount += 1;
},

// trong extraReducers:
builder.addCase(phaseUpdated, (state) => {
  state.silenceCount = 0;
});
```

---

### `src/hooks/useSilenceDetection.js` — FILE MỚI

Quản lý hai timer độc lập. Trả về `{ cancelTriggers }` để `AiChatPanel` gọi khi user bắt đầu gõ.

```javascript
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { silenceTriggerRequest } from '../store/slices/sdInterviewerSlice';

const SILENCE_THRESHOLDS = {
  CLARIFICATION: 90_000,
  DESIGN: 90_000,
  DEEP_DIVE: 90_000,
  WRAP_UP: 120_000,
};
const MAX_TRIGGERS = 2;

export function useSilenceDetection({ phase, isAiLoading, isListening }) {
  const dispatch = useDispatch();
  const chatHistory = useSelector((s) => s.sdInterviewer.chatHistory);
  const silenceCount = useSelector((s) => s.sdInterviewer.silenceCount);
  const architectureJSON = useSelector((s) => s.sdSession.architectureJSON);

  const totalTimerRef = useRef(null);
  const canvasTimerRef = useRef(null);
  const prevNodeIdsRef = useRef(new Set());
  const pendingNodesRef = useRef([]);

  // DEEP_DIVE: timer reset sau AI message. Các phase khác: sau user message.
  const lastRelevantEntry = useMemo(() => {
    const role = phase === 'DEEP_DIVE' ? 'ai' : 'user';
    return [...chatHistory].reverse().find((m) => m.role === role);
  }, [chatHistory, phase]);

  const _fireTotalTrigger = useCallback(() => {
    if (isAiLoading || isListening || silenceCount >= MAX_TRIGGERS) return;
    dispatch(silenceTriggerRequest({ triggerType: 'TOTAL_SILENCE', nodes: '' }));
  }, [dispatch, isAiLoading, isListening, silenceCount]);

  const _fireCanvasTrigger = useCallback(() => {
    if (isAiLoading || isListening || silenceCount >= MAX_TRIGGERS) return;
    const nodeNames = pendingNodesRef.current
      .map((n) => n.data?.label ?? n.type)
      .join(', ');
    dispatch(silenceTriggerRequest({ triggerType: 'DRAWING_SILENCE', nodes: nodeNames }));
    pendingNodesRef.current = [];
  }, [dispatch, isAiLoading, isListening, silenceCount]);

  const cancelTriggers = useCallback(() => {
    clearTimeout(totalTimerRef.current);
    clearTimeout(canvasTimerRef.current);
    pendingNodesRef.current = [];
  }, []);

  // Total silence timer — tất cả phase
  useEffect(() => {
    if (silenceCount >= MAX_TRIGGERS || isListening || !SILENCE_THRESHOLDS[phase]) return;
    clearTimeout(totalTimerRef.current);
    totalTimerRef.current = setTimeout(_fireTotalTrigger, SILENCE_THRESHOLDS[phase]);
    return () => clearTimeout(totalTimerRef.current);
  }, [lastRelevantEntry, silenceCount, isListening, phase, _fireTotalTrigger]);

  // Canvas-watch timer — chỉ DESIGN phase
  useEffect(() => {
    if (phase !== 'DESIGN') return;
    const nodes = architectureJSON?.nodes ?? [];
    const newNodes = nodes.filter((n) => !prevNodeIdsRef.current.has(n.id));
    nodes.forEach((n) => prevNodeIdsRef.current.add(n.id));

    if (newNodes.length === 0) return;
    pendingNodesRef.current = [...pendingNodesRef.current, ...newNodes];

    if (silenceCount >= MAX_TRIGGERS || isListening) return;
    clearTimeout(canvasTimerRef.current);
    canvasTimerRef.current = setTimeout(_fireCanvasTrigger, 90_000);
    return () => clearTimeout(canvasTimerRef.current);
  }, [architectureJSON, phase, silenceCount, isListening, _fireCanvasTrigger]);

  // Cancel canvas timer khi user gửi message
  useEffect(() => {
    clearTimeout(canvasTimerRef.current);
    pendingNodesRef.current = [];
  }, [lastRelevantEntry]);

  // Reset node tracking khi đổi phase
  useEffect(() => {
    prevNodeIdsRef.current = new Set();
    pendingNodesRef.current = [];
  }, [phase]);

  // Cleanup khi unmount
  useEffect(
    () => () => {
      clearTimeout(totalTimerRef.current);
      clearTimeout(canvasTimerRef.current);
    },
    [],
  );

  return { cancelTriggers };
}
```

---

### `src/components/sd-room/AiChatPanel.jsx`

Thêm 3 điểm:

1. Import hook:
```javascript
import { useSilenceDetection } from '../../hooks/useSilenceDetection';
```

2. Lấy state cần thiết và gọi hook:
```javascript
const phase = useSelector((s) => s.sdSession.phase);
const isAiLoading = useSelector((s) => s.sdInterviewer.loading);
// isListening hardcode false cho đến khi voice input được tích hợp vào SD room
const { cancelTriggers } = useSilenceDetection({ phase, isAiLoading, isListening: false });
```

3. Trong input `onChange` handler: gọi `cancelTriggers()` trước khi update state input — đảm bảo timer cancel ngay khi user bắt đầu gõ, không chờ đến `onSend`:
```javascript
const _handleInputChange = (e) => {
  cancelTriggers();
  setInputValue(e.target.value);
};
```

---

### `src/store/sagas/sdInterviewerSaga.js`

Thêm watcher + handler riêng cho silence trigger. Handler này mirrors `_streamMessageResponse` nhưng **không** prepend user bubble vào `chatHistory`.

```javascript
function* _streamSilenceResponse({ sessionId, userMessage, silenceCount }) {
  // Không dispatch addUserMessage — trigger không hiển thị trong chat UI
  const response = yield call(
    sdInterviewerApi.createSilenceTriggerStream,
    sessionId,
    { userMessage, silenceCount },
  );
  // Stream tokens giống hệt normal message
  yield call(_readSseStream, response); // reuse existing SSE reader
}

function* _handleSilenceTrigger(action) {
  const { triggerType, nodes } = action.payload;
  const sessionId = yield select((s) => s.sdSession.sessionId);
  const silenceCount = yield select((s) => s.sdInterviewer.silenceCount);

  const userMessage =
    triggerType === 'DRAWING_SILENCE'
      ? `[CANVAS_ONLY_ACTIVE: ${nodes}]`
      : '[CANDIDATE_SILENT]';

  yield call(_streamSilenceResponse, { sessionId, userMessage, silenceCount });
}

// Trong sdInterviewerSaga() root:
yield takeLatest(silenceTriggerRequest.type, _handleSilenceTrigger);
```

---

### `src/api/sdInterviewer.api.js`

Thêm function:

```javascript
createSilenceTriggerStream: (sessionId, { userMessage, silenceCount }) =>
  fetchWithAuth(`/sd-sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, isSilenceTrigger: true, silenceCount }),
  }),
```

---

## API Contract

Reuse `POST /sd-sessions/:id/message` — không thêm endpoint mới.

**Request body khi silence trigger:**
```json
{
  "userMessage": "[CANDIDATE_SILENT]",
  "isSilenceTrigger": true,
  "silenceCount": 1
}
```

Hoặc drawing silence:
```json
{
  "userMessage": "[CANVAS_ONLY_ACTIVE: LoadBalancer, APIServer, Database]",
  "isSilenceTrigger": true,
  "silenceCount": 1
}
```

**Response:** SSE stream format giống hệt normal message — `{ token }` chunks, final `{ done: true, meta: {...} }`.

**Behavioral diff so với normal message:**
- Trigger entry lưu với `role: 'system-trigger'` (không phải `'user'`)
- Không increment user exchange count
- Frontend không render user bubble trong chat UI
- AI follow silence-trigger protocol trong system prompt

---

## Stability Notes

| Concern | Mitigation |
|---------|------------|
| Race condition: timer fires khi AI đang loading | `_fireTotalTrigger` / `_fireCanvasTrigger` check `isAiLoading` bên trong callback. `isAiLoading` cũng là dep → khi loading kết thúc, effect re-run, timer restart |
| User gõ khi timer đang chạy | `onChange` gọi `cancelTriggers()` — timer cleared trước khi dispatch xảy ra |
| Phase transition mid-timer | `phase` trong deps array → effect cleanup + restart với phase mới. `phaseUpdated` reset `silenceCount` về 0 |
| isListening pause | `isListening` là dep → khi true, effect early-return, không set timer. Timer cũ đã bị clear bởi cleanup của effect run trước |
| Canvas undo/redo | `prevNodeIdsRef` track by ID — undo/redo cùng node ID không bị đếm là new node |
| Unmount cleanup | Cả hai timer ref được clear trong cleanup effect không dep |
| Silence trigger không làm unlock phase sớm | `isSilenceTrigger` skip increment exchange count → `PHASE_MIN_EXCHANGES` guard không bị ảnh hưởng |

---

## Not Changing

- `sdSessionSlice.js` — phase state machine không đổi
- `sdSessionSaga.js` — auto-save và poll-phase không đổi
- `SDCanvas.jsx` — canvas vẫn dispatch `canvasChanged` như cũ
- `SDRoomPage.jsx` — không đổi
- `sd-session.entity.ts` — không có column mới
- Không cần DB migration

---

## File Count

Tổng files thay đổi: **7 / 10**

| # | File | Loại |
|---|------|-------|
| 1 | `server/src/sd-interviewer/dto/create-sd-message.dto.ts` | BE modify |
| 2 | `server/src/sd-interviewer/sd-interviewer.service.ts` | BE modify |
| 3 | `client/apps/web/src/store/slices/sdInterviewerSlice.js` | FE modify |
| 4 | `client/apps/web/src/hooks/useSilenceDetection.js` | FE new |
| 5 | `client/apps/web/src/components/sd-room/AiChatPanel.jsx` | FE modify |
| 6 | `client/apps/web/src/store/sagas/sdInterviewerSaga.js` | FE modify |
| 7 | `client/apps/web/src/api/sdInterviewer.api.js` | FE modify |
