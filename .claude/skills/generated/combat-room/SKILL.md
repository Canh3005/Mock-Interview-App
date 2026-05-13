---
name: combat-room
description: "Skill for the Combat-room area of Mock-Interview-App. 9 symbols across 2 files."
---

# Combat-room

9 symbols | 2 files | Cohesion: 81%

## When to Use

- Working with code in `client/`
- Understanding how stopSTT, stopSilenceWatch, handleSkip work
- Modifying combat-room-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | stopSTT, stopSilenceWatch, handleSkip, cleanup, handleComplete (+2) |
| `client/apps/web/src/components/combat-room/CombatHeader.jsx` | formatTime, CombatHeader |

## Entry Points

Start here when exploring this area:

- **`stopSTT`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:190`
- **`stopSilenceWatch`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:211`
- **`handleSkip`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:254`
- **`cleanup`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:291`
- **`handleComplete`** (Function) — `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx:265`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `stopSTT` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 190 |
| `stopSilenceWatch` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 211 |
| `handleSkip` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 254 |
| `cleanup` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 291 |
| `handleComplete` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 265 |
| `handleFinishClick` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 278 |
| `handleConfirmFinish` | Function | `client/apps/web/src/components/combat-room/CombatInterviewRoom.jsx` | 286 |
| `CombatHeader` | Function | `client/apps/web/src/components/combat-room/CombatHeader.jsx` | 23 |
| `formatTime` | Function | `client/apps/web/src/components/combat-room/CombatHeader.jsx` | 16 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CombatInterviewRoom → IngestMetrics` | cross_community | 5 |
| `HandleExit → IngestMetrics` | cross_community | 5 |
| `CombatInterviewRoom → StopSTT` | cross_community | 3 |
| `CombatInterviewRoom → StopSilenceWatch` | cross_community | 3 |
| `HandleExit → StopSTT` | cross_community | 3 |
| `HandleExit → StopSilenceWatch` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 1 calls |

## How to Explore

1. `gitnexus_context({name: "stopSTT"})` — see callers and callees
2. `gitnexus_query({query: "combat-room"})` — find related execution flows
3. Read key files listed above for implementation details
