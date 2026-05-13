---
name: proctoring
description: "Skill for the Proctoring area of Mock-Interview-App. 18 symbols across 1 files."
---

# Proctoring

18 symbols | 1 files | Cohesion: 83%

## When to Use

- Working with code in `client/`
- Understanding how start, _enqueue, _withinGrace work
- Modifying proctoring-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/services/proctoring/combatProctoring.js` | randomId, getViewportRatio, start, _enqueue, _withinGrace (+13) |

## Entry Points

Start here when exploring this area:

- **`start`** (Method) — `client/apps/web/src/services/proctoring/combatProctoring.js:261`
- **`_enqueue`** (Method) — `client/apps/web/src/services/proctoring/combatProctoring.js:340`
- **`_withinGrace`** (Method) — `client/apps/web/src/services/proctoring/combatProctoring.js:372`
- **`_severityForContext`** (Method) — `client/apps/web/src/services/proctoring/combatProctoring.js:376`
- **`_startFaceMonitor`** (Method) — `client/apps/web/src/services/proctoring/combatProctoring.js:381`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `start` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 261 |
| `_enqueue` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 340 |
| `_withinGrace` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 372 |
| `_severityForContext` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 376 |
| `_startFaceMonitor` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 381 |
| `_startSecondVoiceMonitor` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 425 |
| `_onVisibilityChange` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 472 |
| `_onBlur` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 515 |
| `_onFocus` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 528 |
| `_onResize` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 545 |
| `_onOnline` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 313 |
| `_flushBufferedFromIdb` | Method | `client/apps/web/src/services/proctoring/combatProctoring.js` | 326 |
| `randomId` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 17 |
| `getViewportRatio` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 22 |
| `openIdb` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 46 |
| `idbPut` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 60 |
| `idbGetAll` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 75 |
| `idbDeleteMany` | Function | `client/apps/web/src/services/proctoring/combatProctoring.js` | 91 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → OpenIdb` | cross_community | 5 |
| `CombatPermissionGate → GetViewportRatio` | cross_community | 4 |
| `_onVisibilityChange → OpenIdb` | cross_community | 4 |
| `_onBlur → OpenIdb` | cross_community | 4 |
| `Start → RandomId` | intra_community | 4 |
| `_onFocus → OpenIdb` | cross_community | 4 |
| `_onResize → OpenIdb` | cross_community | 4 |
| `_onVisibilityChange → RandomId` | intra_community | 3 |
| `_onBlur → RandomId` | intra_community | 3 |
| `_onFocus → RandomId` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "start"})` — see callers and callees
2. `gitnexus_query({query: "proctoring"})` — find related execution flows
3. Read key files listed above for implementation details
