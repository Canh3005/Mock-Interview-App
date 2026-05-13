---
name: dsa
description: "Skill for the Dsa area of Mock-Interview-App. 10 symbols across 2 files."
---

# Dsa

10 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `client/`
- Understanding how updatePosition, handleMouseMove, animate work
- Modifying dsa-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/components/dsa/CameraPreview.jsx` | updatePosition, handleMouseMove, animate, handleResize, CameraPreview (+3) |
| `client/apps/web/src/components/dsa/SessionTimer.jsx` | formatTime, SessionTimer |

## Entry Points

Start here when exploring this area:

- **`updatePosition`** (Function) — `client/apps/web/src/components/dsa/CameraPreview.jsx:25`
- **`handleMouseMove`** (Function) — `client/apps/web/src/components/dsa/CameraPreview.jsx:53`
- **`animate`** (Function) — `client/apps/web/src/components/dsa/CameraPreview.jsx:72`
- **`handleResize`** (Function) — `client/apps/web/src/components/dsa/CameraPreview.jsx:111`
- **`SessionTimer`** (Function) — `client/apps/web/src/components/dsa/SessionTimer.jsx:11`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `updatePosition` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 25 |
| `handleMouseMove` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 53 |
| `animate` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 72 |
| `handleResize` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 111 |
| `SessionTimer` | Function | `client/apps/web/src/components/dsa/SessionTimer.jsx` | 11 |
| `CameraPreview` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 2 |
| `defaultPosition` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 5 |
| `applyInertia` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 68 |
| `handleMouseUp` | Function | `client/apps/web/src/components/dsa/CameraPreview.jsx` | 94 |
| `formatTime` | Function | `client/apps/web/src/components/dsa/SessionTimer.jsx` | 5 |

## How to Explore

1. `gitnexus_context({name: "updatePosition"})` — see callers and callees
2. `gitnexus_query({query: "dsa"})` — find related execution flows
3. Read key files listed above for implementation details
