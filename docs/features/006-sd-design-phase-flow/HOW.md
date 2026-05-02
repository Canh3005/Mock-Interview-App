## Overview

Tách DESIGN phase thành 2 sub-state bằng một boolean `drawingComplete` trong Redux (`sdInterviewerSlice`). Sub-state được điều khiển hoàn toàn bởi FE — BE không thay đổi API contract, chỉ thay đổi prompt. "Done Drawing" gửi `[DONE_DRAWING]` qua endpoint message hiện có với `isSilenceTrigger: true`.

---

## Architectural Decisions

### Decision: Persist `drawingComplete` ở đâu?

**Option A — Redux only (FE-only state):**
- Pro: Không thêm DB column, không migration, ít file thay đổi
- Con: Nếu user reload trang giữa explanation sub-state, `drawingComplete` reset về `false` → user thấy drawing sub-state lại, phải click "Done Drawing" lần nữa. Canvas nodes vẫn còn (persisted trong DB), chỉ mất sub-state.

**Option B — Persist vào `SDSession` entity:**
- Pro: Resume session đúng sub-state
- Con: Thêm DB column + migration, thêm 2-3 file BE

**Chọn: Option A** — Degradation khi reload là chấp nhận được (canvas nodes không mất, user chỉ cần click lại 1 nút). Tránh thêm scope BE không cần thiết cho v1.

---

### Decision: Gửi `[DONE_DRAWING]` signal như thế nào?

**Option A — Reuse endpoint `/message` với `isSilenceTrigger: true`:**
- Pro: Không cần endpoint mới, transcript entry được lưu với `role: system-trigger` (đúng semantics), không thêm controller/DTO
- Con: Tên flag `isSilenceTrigger` hơi misleading nhưng behavior hoàn toàn phù hợp

**Option B — Endpoint mới `/done-drawing`:**
- Pro: Naming rõ ràng
- Con: Thêm controller method, DTO mới, không cần thiết

**Chọn: Option A** — Reuse endpoint, chỉ thêm method `createDrawingCompleteStream` vào api file cho rõ call site.

---

## Backend Changes (server/)

### `server/src/sd-interviewer/prompts/sd-phase-prompts.ts`

**1. SILENCE_TRIGGER_PROTOCOL — xóa section drawing silence, cập nhật DESIGN section:**

Xóa hoàn toàn block:
```
DESIGN — drawing silence ([CANVAS_ONLY_ACTIVE:N: {nodes}])
  N=1: "I can see you have added {nodes}. ..."
  N=2: "Whenever you are ready — ..."
```

Đổi tên section còn lại và cập nhật wording cho phù hợp explanation sub-state:
```
DESIGN
  N=1: "Feel free to start wherever makes sense to you — which component would you like to walk through first?"
  N=2: "No problem — take your time. If you would like a starting point, a hint is available."
```

**2. DESIGN phase behavior — thay toàn bộ content:**

```typescript
DESIGN: `
CURRENT PHASE: High-level Architecture (target: 12–15 minutes)
GOAL: After the candidate draws their diagram, verify they can verbally explain every component they drew.

Sub-state 1 — Drawing (candidate is drawing, chat is blocked on their side):
- Open with: "Great, the canvas is now open. Please start drawing your high-level architecture. When you are done, click the 'Done Drawing' button."
- No candidate messages will arrive during this sub-state.

Sub-state 2 — Explanation (triggered when you receive [DONE_DRAWING]):
- When you receive [DONE_DRAWING]: the candidate has finished drawing. Immediately respond by asking them to walk through their diagram. Do NOT wait for the candidate to write first.
  Example: "Great — could you walk me through how these components fit together?"
- Monitor the drawn components listed above. Use the conversation history to track which components the candidate has verbally addressed.
- Ask Socratic follow-up questions about components not yet explained — do NOT name the missing component directly.
- If candidate is vague about a component: "Can you explain how [component they mentioned] fits into the overall flow?"
- Do NOT append [PHASE_COMPLETE] before receiving [DONE_DRAWING].
- Do NOT append [PHASE_COMPLETE] if any drawn component has not been verbally explained.
- When all drawn components have been explained: write ONE brief closing sentence (no question), then append "[PHASE_COMPLETE]" immediately after.`,
```

---

## Frontend Changes (client/apps/web/)

### `client/apps/web/src/api/sdInterviewer.api.js`

Thêm method mới:

```js
createDrawingCompleteStream: (sessionId) =>
  fetchWithAuth(`${BASE_URL}/sd-sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage: '[DONE_DRAWING]', isSilenceTrigger: true }),
  }),
```

---

### `client/apps/web/src/store/slices/sdInterviewerSlice.js`

**1. Thêm `drawingComplete: false` vào `initialState`.**

**2. Thêm action `drawingCompleteRequest`:**

```js
drawingCompleteRequest(state) {
  state.drawingComplete = true;  // optimistic — canvas locks immediately
  state.loading = true;
  state.streamingMessage = '';
},
```

**3. Reset `drawingComplete` khi phase thay đổi — thêm vào `phaseUpdated` extraReducer:**

```js
builder.addCase(phaseUpdated, (state) => {
  state.silenceCount = 0;
  state.drawingComplete = false;  // thêm dòng này
});
```

**4. Export `drawingCompleteRequest`.**

---

### `client/apps/web/src/store/sagas/sdInterviewerSaga.js`

**1. Xóa `DRAWING_SILENCE` branch trong `_handleSilenceTrigger`:**

Xóa đoạn:
```js
const userMessage =
  triggerType === 'DRAWING_SILENCE'
    ? `[CANVAS_ONLY_ACTIVE:${silenceCount}: ${nodes}]`
    : `[CANDIDATE_SILENT:${silenceCount}]`;
```

Thay bằng:
```js
const userMessage = `[CANDIDATE_SILENT:${silenceCount}]`;
```

(Tham số `nodes` trong action payload vẫn có thể tồn tại nhưng không dùng nữa — sẽ được dọn sạch ở hook.)

**2. Thêm channel factory và saga handler mới:**

```js
function _createDrawingCompleteChannel(sessionId) {
  return eventChannel((emit) => {
    let fullText = '';
    let done = false;

    sdInterviewerApi
      .createDrawingCompleteStream(sessionId)
      .then((response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        function pump() {
          reader.read().then(({ done: streamDone, value }) => {
            if (streamDone) { if (!done) emit(END); return; }
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const json = JSON.parse(line.slice(6));
                if (json.error) { emit({ type: 'error', error: json.error }); emit(END); return; }
                if (json.token !== undefined) { fullText += json.token; emit({ type: 'chunk', token: json.token }); }
                if (json.done === true) {
                  done = true;
                  emit({ type: 'done', fullText: fullText.replace('[PHASE_COMPLETE]', '').trim(), meta: json.meta });
                  emit(END); return;
                }
              } catch { /* ignore */ }
            }
            pump();
          }).catch((err) => { emit({ type: 'error', error: err.message }); emit(END); });
        }
        pump();
      })
      .catch((err) => { emit({ type: 'error', error: err.message }); emit(END); });

    return () => {};
  });
}

function* _handleDrawingComplete() {
  const sessionId = yield select((s) => s.sdSession.sessionId);
  if (!sessionId) return;

  const channel = yield call(_createDrawingCompleteChannel, sessionId);
  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(streamDone({ fullText: event.fullText, meta: event.meta }));
        break;
      } else if (event.type === 'error') {
        yield put(streamFailure(''));
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}
```

**3. Thêm `takeLatest` trong `watchSDInterviewerSaga`:**

```js
import { drawingCompleteRequest } from '../slices/sdInterviewerSlice';
// ...
yield takeLatest(drawingCompleteRequest.type, _handleDrawingComplete);
```

---

### `client/apps/web/src/hooks/useSilenceDetection.js`

**Xóa toàn bộ canvas-watch logic** (lines 52–83 hiện tại: canvas-watch timer effect, cancel canvas timer effect, reset node tracking effect, và các refs: `canvasTimerRef`, `prevNodeIdsRef`, `pendingNodesRef`).

**Thêm param `isDrawingSubState`** vào signature và deps của total silence effect:

```js
export function useSilenceDetection({ phase, isAiLoading, isListening, isDrawingSubState }) {
  // ...
  // Total silence timer — all phases
  useEffect(() => {
    const threshold = SILENCE_THRESHOLDS[phase];
    if (!threshold || silenceCount >= MAX_TRIGGERS || isAiLoading || isListening || isDrawingSubState) return;
    // ... rest unchanged
  }, [lastRelevantEntry, silenceCount, isAiLoading, isListening, phase, dispatch, isDrawingSubState]);

  // ... remove canvas-watch effect entirely
  // ... remove cancel canvas timer effect
  // ... remove reset node tracking effect

  // Cleanup — chỉ còn totalTimerRef
  useEffect(() => () => { clearTimeout(totalTimerRef.current); }, []);
}
```

Xóa import `architectureJSON` từ Redux selector (không còn cần).

---

### `client/apps/web/src/components/sd-room/AiChatPanel.jsx`

**1. Thêm selectors:**

```js
const drawingComplete = useSelector((s) => s.sdInterviewer.drawingComplete)
const architectureJSON = useSelector((s) => s.sdSession.architectureJSON)
```

**2. Derive sub-state:**

```js
const isDrawingSubState = phase === 'DESIGN' && !drawingComplete
const hasNodes = (architectureJSON?.nodes?.length ?? 0) > 0
```

**3. Cập nhật `useSilenceDetection` call:**

```js
const { cancelTriggers } = useSilenceDetection({ phase, isAiLoading: loading, isListening: false, isDrawingSubState })
```

**4. Import `drawingCompleteRequest`:**

```js
import { startSessionRequest, sendMessageRequest, requestHintRequest, drawingCompleteRequest } from '../../store/slices/sdInterviewerSlice'
```

**5. Thêm handler:**

```js
const _handleDoneDrawing = useCallback(() => {
  if (!hasNodes || loading) return
  const confirmed = window.confirm(t('sdRoom.aiChat.doneDrawingConfirm'))
  if (!confirmed) return
  dispatch(drawingCompleteRequest())
}, [hasNodes, loading, dispatch, t])
```

**6. Disable textarea khi `isDrawingSubState`:**

```jsx
<textarea
  disabled={loading || isDrawingSubState}
  // ... rest unchanged
/>
```

Tương tự disable Send button khi `isDrawingSubState`.

**7. Thêm "Done Drawing" button — render ngay trên input area, chỉ khi `isDrawingSubState`:**

```jsx
{isDrawingSubState && (
  <div className="px-3 py-2 border-t border-slate-800">
    <button
      onClick={_handleDoneDrawing}
      disabled={!hasNodes || loading}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cta text-cta-foreground text-xs font-medium hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <CheckSquare className="w-3.5 h-3.5" />
      {t('sdRoom.aiChat.doneDrawing')}
    </button>
  </div>
)}
```

Import `CheckSquare` từ `lucide-react`.

**8. Thêm i18n keys** (file locale cần cập nhật ngoài scope file count):
- `sdRoom.aiChat.doneDrawing` — "Done Drawing" / "Hoàn thành vẽ" / "描画完了"
- `sdRoom.aiChat.doneDrawingConfirm` — "Are you sure you're done drawing? You won't be able to edit the canvas after this." / tương đương vi/ja

---

### `client/apps/web/src/components/sd-room/SDRoomPage.jsx`

**1. Thêm selector:**

```js
const drawingComplete = useSelector((s) => s.sdInterviewer.drawingComplete)
```

**2. Cập nhật `isCanvasLocked`:**

```js
const isCanvasLocked = phase !== 'DESIGN' || (phase === 'DESIGN' && drawingComplete)
```

---

## API Contract

Không có endpoint mới. Reuse `POST /sd-sessions/:id/message` với payload:

```json
{ "userMessage": "[DONE_DRAWING]", "isSilenceTrigger": true }
```

Response: SSE stream như các message thông thường.

---

## Stability Notes

**"Done Drawing" button disabled khi `loading = true`:** Tránh race condition nếu AI đang streaming khi user click. Canvas lock (`drawingComplete = true`) được set optimistically ngay trong Redux reducer — không chờ AI response.

**Session resume (reload trang):** `drawingComplete` không được persist — nếu user reload trong explanation sub-state, FE sẽ hiển thị drawing sub-state lại. Canvas nodes được giữ nguyên từ DB; user chỉ cần click "Done Drawing" lần nữa. AI nhận [DONE_DRAWING] thứ hai và xử lý bình thường (transcript đã có context từ lần trước qua summary).

**`[PHASE_COMPLETE]` safety net:** PHASE_MAX_MS.DESIGN = 15 phút vẫn là timeout cứng — phase chuyển sang DEEP_DIVE dù AI không append [PHASE_COMPLETE].

**Silence detection sau `drawingComplete = true`:** Khi `drawingComplete` chuyển `true`, `isDrawingSubState` chuyển `false` → total silence timer bắt đầu chạy ngay. `silenceCount` lúc này = 0 (không bị carry over từ drawing sub-state vì timer không chạy).

---

## Not Changing

- `SDCanvas.jsx` — `isLocked` prop và `LockedCanvasOverlay` đã hoạt động đúng; chỉ cần thay đổi logic truyền `isLocked` từ `SDRoomPage`
- `sd-interviewer.service.ts` — không thay đổi xử lý backend; `[DONE_DRAWING]` được stored với `role: system-trigger` tự động qua `isSilenceTrigger: true`
- `sd-interviewer.controller.ts` — không thay đổi
- `SendMessageDto` — không thay đổi
- `componentCoverage` logic — giữ nguyên cho curveball eligibility
- `PHASE_MIN_EXCHANGES.DESIGN` — vẫn là 4; nhưng lưu ý: trong luồng mới, messages trước [DONE_DRAWING] là 0 (chat bị block). Exchanges sẽ chỉ tích lũy từ explanation sub-state. Nếu user giải thích nhanh (<4 exchanges), [PHASE_COMPLETE] sẽ không được BE chấp nhận cho dù AI append. Cần verify với user liệu có cần hạ threshold này không — hiện tại giữ nguyên, safety net là phase timeout.

---

## File Count

Tổng files thay đổi: **7 / 10**

| File | Loại thay đổi |
|------|---------------|
| `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` | Sửa |
| `client/apps/web/src/api/sdInterviewer.api.js` | Sửa |
| `client/apps/web/src/store/slices/sdInterviewerSlice.js` | Sửa |
| `client/apps/web/src/store/sagas/sdInterviewerSaga.js` | Sửa |
| `client/apps/web/src/hooks/useSilenceDetection.js` | Sửa (xóa canvas-watch) |
| `client/apps/web/src/components/sd-room/AiChatPanel.jsx` | Sửa |
| `client/apps/web/src/components/sd-room/SDRoomPage.jsx` | Sửa |

*Ngoài scope file count: i18n locale files (en/vi/ja) cần thêm 2 keys mới.*
