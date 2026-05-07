# HOW — Combat Mode for DSA

## Key insight

`CombatSessionAggregate` hiện đang keyed by `behavioralSessionId`. Để tích lũy metrics xuyên round, cần đổi thành `interviewSessionId`. Đây là thay đổi schema duy nhất — toàn bộ combat infrastructure còn lại được reuse nguyên vẹn.

## Files cần tạo / sửa

### Backend

| File | Thay đổi |
|------|----------|
| `server/src/combat/entities/combat-session-aggregate.entity.ts` | Đổi field `behavioralSessionId` → `interviewSessionId` |
| `server/src/migrations/<ts>-aggregate-use-interview-session.ts` | Rename column `behavioral_session_id` → `interview_session_id` |
| `server/src/combat/combat-metrics.service.ts` | Update lookup/create dùng `interviewSessionId` |
| `server/src/combat/combat.controller.ts` | Update param label (không đổi URL) |

### Frontend — Setup

Không thay đổi. `proceedFromRoundSelect` đã route sang `combat_permission` cho mọi combat mode.  
`InterviewSetupFlow` navigation DSA cần bổ sung: không reset CombatOrchestrator (DSA không dùng nó).

| File | Thay đổi |
|------|----------|
| `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx` | Bỏ `resetCombatOrchestrator` dispatch khi DSA round |

### Frontend — Behavioral Room (fix đồng thời)

Behavioral room hiện truyền `behavioralSessionId` vào MultimodalEngine và Proctoring. Sau khi đổi schema, phải truyền `interviewSessionId`.

| File | Thay đổi |
|------|----------|
| `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | Truyền `interviewSessionId` (từ Redux `interviewSetup.session.sessionId`) vào MultimodalEngine.start() và CombatProctoringMonitor |

### Frontend — DSA Room

| File | Thay đổi |
|------|----------|
| `client/apps/web/src/hooks/useDSACombat.js` | **NEW** — Hook quản lý camera stream, MultimodalEngine, CombatProctoringMonitor, TtsPlayer trong DSA room |
| `client/apps/web/src/components/dsa/DSACameraPreview.jsx` | **NEW** — Camera preview overlay (góc dưới trái, giống CombatSidebar) |
| `client/apps/web/src/components/dsa/DSASessionPage.jsx` | Call `useDSACombat`, render `DSACameraPreview`, trigger TTS khi AI message mới |

### Frontend — i18n (nếu có string mới)

Không có string mới — DSACameraPreview không cần label text.

## useDSACombat — thiết kế

```js
useDSACombat({ mode, interviewSessionId, videoRef, aiConversation })
// mode === 'combat': bật toàn bộ. 'practice': return sớm, không làm gì.

// Khởi động:
// 1. getUserMedia({ video: true, audio: true }) → mediaStream
// 2. MultimodalEngine.start(stream, interviewSessionId, videoRef.current)
// 3. new CombatProctoringMonitor({ interviewSessionId, isAiSpeaking, getFaceCount, ... }).start()

// TTS khi AI message mới:
// useEffect([aiConversation.length]) → SentenceTtsBuffer feed message cuối + flush

// Cleanup:
// MultimodalEngine.stop(), monitor.stop(), stream.getTracks().forEach(t => t.stop())
```

**CombatProctoringMonitor params cho DSA:**
- `getOrchestratorState`: () => `'CANDIDATE_THINKING'` — candidate không nói → second voice monitor không fire
- `getVadResult`: () => `{ rmsLevel: 0 }` — không có STT VAD
- `getLastTranscriptTs`: () => `0`
- `isAiSpeaking`: () => `ttsPlayer.isPlaying`
- `getFaceCount`: () => ref từ MultimodalEngine face count (hoặc 1 nếu không expose)

## TTS flow trong DSA

AI messages trong DSA là **complete messages** (không streaming như behavioral). TTS:
```
useEffect → aiConversation.length thay đổi → lấy message cuối cùng có role 'assistant'
→ SentenceTtsBuffer.appendToken(text) → SentenceTtsBuffer.flush()
→ TtsPlayer phát sentence-by-sentence
```

SentenceTtsBuffer và TtsPlayer là singleton — được khởi tạo bên trong `useDSACombat`.

## Scoring

Không thay đổi. `ScoringPage` đã detect `session.mode === 'combat'`. `getIntegrity(interviewSessionId)` đã dùng `interviewSessionId` → works sau khi schema fix.

## Constraints

- Second voice detection bị vô hiệu hóa trong DSA (candidate không nói — không có STT)
- MediaPipe frame rate throttle: 10fps cho DSA (vs 15fps cho behavioral) vì Monaco Editor nặng hơn
- Grace period proctoring: 5 giây từ khi DSASessionPage mount (không phải từ khi permission gate done)
