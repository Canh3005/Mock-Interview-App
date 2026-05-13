---
name: services
description: "Skill for the Services area of Mock-Interview-App. 72 symbols across 17 files."
---

# Services

72 symbols | 17 files | Cohesion: 86%

## When to Use

- Working with code in `client/`
- Understanding how useDSACombat, DSASessionPage, CombatInterviewRoom work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/services/SentenceTtsBuffer.js` | onFinished, _isDone, _drainSlots, _playNext, _checkFinished (+7) |
| `client/apps/web/src/services/MultimodalEngine.js` | startTurn, feedTranscript, start, stop, _flush (+2) |
| `client/apps/web/src/services/EyeTrackingAnalyzer.js` | EyeTrackingAnalyzer, addResultsListener, init, _handleResults, _classifyGaze (+2) |
| `client/apps/web/src/services/CombatOrchestrator.js` | init, advanceStage, _getStageBudget, EventEmitter, CombatOrchestrator (+2) |
| `client/apps/web/src/services/VoiceActivityDetector.js` | getLastResult, VoiceActivityDetector, start, detect, isSpeaking |
| `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | CombatInterviewRoom, initCombatSession, startSTT, startSilenceWatch, handleSilence |
| `client/apps/web/src/services/FaceDetector.js` | init, start, _capture, _handleResults, _loadScript |
| `client/apps/web/src/services/FillerWordCounter.js` | FillerWordCounter, start, _flush, stop, reset |
| `client/apps/web/src/services/TtsPlayer.js` | _ensureContext, play, setVolume, stop |
| `client/apps/web/src/services/MicroExpressionDetector.js` | MicroExpressionDetector, start, _handleResults, _classifyExpression |

## Entry Points

Start here when exploring this area:

- **`useDSACombat`** (Function) — `client/apps/web/src/hooks/useDSACombat.js:5`
- **`DSASessionPage`** (Function) — `client/apps/web/src/components/dsa/DSASessionPage.jsx:89`
- **`CombatInterviewRoom`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:32`
- **`initCombatSession`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:123`
- **`startSTT`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:153`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `VoiceActivityDetector` | Class | `client/apps/web/src/services/VoiceActivityDetector.js` | 8 |
| `CombatProctoringMonitor` | Class | `client/apps/web/src/services/proctoring/combatProctoring.js` | 217 |
| `MicroExpressionDetector` | Class | `client/apps/web/src/services/MicroExpressionDetector.js` | 9 |
| `FillerWordCounter` | Class | `client/apps/web/src/services/FillerWordCounter.js` | 17 |
| `EyeTrackingAnalyzer` | Class | `client/apps/web/src/services/EyeTrackingAnalyzer.js` | 9 |
| `useDSACombat` | Function | `client/apps/web/src/hooks/useDSACombat.js` | 5 |
| `DSASessionPage` | Function | `client/apps/web/src/components/dsa/DSASessionPage.jsx` | 89 |
| `CombatInterviewRoom` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 32 |
| `initCombatSession` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 123 |
| `startSTT` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 153 |
| `startSilenceWatch` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 197 |
| `handleSilence` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 217 |
| `startDetection` | Function | `client/apps/web/src/components/interview-setup/steps/CombatPermissionGate.jsx` | 87 |
| `_init` | Function | `client/apps/web/src/hooks/useDSACombat.js` | 17 |
| `onFinished` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 30 |
| `_isDone` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 38 |
| `_drainSlots` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 120 |
| `_playNext` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 132 |
| `_checkFinished` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 150 |
| `appendToken` | Method | `client/apps/web/src/services/SentenceTtsBuffer.js` | 53 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DSASessionPage → IngestMetrics` | cross_community | 6 |
| `DSASessionPage → BuildHeaders` | cross_community | 6 |
| `DSASessionPage → _refreshToken` | cross_community | 6 |
| `DSASessionPage → Dispatch` | cross_community | 6 |
| `DSASessionPage → _processQueue` | cross_community | 6 |
| `DSASessionPage → _isDone` | cross_community | 6 |
| `CombatInterviewRoom → IngestMetrics` | cross_community | 5 |
| `HandleExit → IngestMetrics` | cross_community | 5 |
| `UseDSACombat → Dispatch` | cross_community | 5 |
| `CombatPermissionGate → _loadScript` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Combat-room | 4 calls |
| Proctoring | 3 calls |
| Api | 1 calls |

## How to Explore

1. `gitnexus_context({name: "useDSACombat"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
