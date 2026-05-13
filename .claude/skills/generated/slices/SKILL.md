---
name: slices
description: "Skill for the Slices area of Mock-Interview-App. 17 symbols across 14 files."
---

# Slices

17 symbols | 14 files | Cohesion: 80%

## When to Use

- Working with code in `client/`
- Understanding how SDRoomPage, handleStart, InterviewSetupFlow work
- Modifying slices-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/store/slices/sdSessionSlice.js` | loadRequest, resetSDSession |
| `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx` | InterviewSetupFlow, renderStep |
| `client/apps/web/src/components/dashboard/InProgressSessions.jsx` | handleResume, handleViewResult |
| `client/apps/web/src/store/slices/sdInterviewerSlice.js` | resetInterviewer |
| `client/apps/web/src/store/slices/dsaSessionSlice.js` | resetDSASession |
| `client/apps/web/src/components/sd-room/SDRoomPage.jsx` | SDRoomPage |
| `client/apps/web/src/components/interview-setup/RoundTransitionScreen.jsx` | handleStart |
| `client/apps/web/src/store/slices/combatOrchestratorSlice.js` | resetCombatOrchestrator |
| `client/apps/web/src/store/slices/behavioralSlice.js` | resetBehavioral |
| `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | handleExit |

## Entry Points

Start here when exploring this area:

- **`SDRoomPage`** (Function) — `client/apps/web/src/components/sd-room/SDRoomPage.jsx:71`
- **`handleStart`** (Function) — `client/apps/web/src/components/interview-setup/RoundTransitionScreen.jsx:17`
- **`InterviewSetupFlow`** (Function) — `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx:362`
- **`renderStep`** (Function) — `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx:431`
- **`handleResume`** (Function) — `client/apps/web/src/components/dashboard/InProgressSessions.jsx:278`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `SDRoomPage` | Function | `client/apps/web/src/components/sd-room/SDRoomPage.jsx` | 71 |
| `handleStart` | Function | `client/apps/web/src/components/interview-setup/RoundTransitionScreen.jsx` | 17 |
| `InterviewSetupFlow` | Function | `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx` | 362 |
| `renderStep` | Function | `client/apps/web/src/components/interview-setup/InterviewSetupFlow.jsx` | 431 |
| `handleResume` | Function | `client/apps/web/src/components/dashboard/InProgressSessions.jsx` | 278 |
| `handleViewResult` | Function | `client/apps/web/src/components/dashboard/InProgressSessions.jsx` | 284 |
| `handleExit` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 270 |
| `SDScoringTab` | Function | `client/apps/web/src/components/sd-debrief/SDScoringTab.jsx` | 75 |
| `handleFileUpload` | Function | `client/apps/web/src/components/admin/problem/ProblemList.jsx` | 39 |
| `loadRequest` | Method | `client/apps/web/src/store/slices/sdSessionSlice.js` | 23 |
| `resetSDSession` | Method | `client/apps/web/src/store/slices/sdSessionSlice.js` | 69 |
| `resetInterviewer` | Method | `client/apps/web/src/store/slices/sdInterviewerSlice.js` | 96 |
| `resetDSASession` | Method | `client/apps/web/src/store/slices/dsaSessionSlice.js` | 227 |
| `resetCombatOrchestrator` | Method | `client/apps/web/src/store/slices/combatOrchestratorSlice.js` | 65 |
| `resetBehavioral` | Method | `client/apps/web/src/store/slices/behavioralSlice.js` | 158 |
| `triggerEvaluation` | Method | `client/apps/web/src/store/slices/sdEvaluatorSlice.js` | 13 |
| `importProblemsStart` | Method | `client/apps/web/src/store/slices/adminProblemsSlice.js` | 114 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleExit → IngestMetrics` | cross_community | 5 |
| `HandleExit → StopSTT` | cross_community | 3 |
| `HandleExit → StopSilenceWatch` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Interview-setup | 2 calls |
| Combat-room | 1 calls |

## How to Explore

1. `gitnexus_context({name: "SDRoomPage"})` — see callers and callees
2. `gitnexus_query({query: "slices"})` — find related execution flows
3. Read key files listed above for implementation details
