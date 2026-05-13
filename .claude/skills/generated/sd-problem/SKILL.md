---
name: sd-problem
description: "Skill for the Sd-problem area of Mock-Interview-App. 11 symbols across 5 files."
---

# Sd-problem

11 symbols | 5 files | Cohesion: 100%

## When to Use

- Working with code in `client/`
- Understanding how seedSDProblems, _handleSubmit, SDProblemModal work
- Modifying sd-problem-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx` | _parseJsonField, _handleSubmit, _toFormState, SDProblemModal |
| `server/src/sd-problem/sd-problem.service.ts` | findOne, update, remove |
| `client/apps/web/src/components/admin/sd-problem/SDProblemForm.jsx` | SDProblemForm, _toggle |
| `server/src/sd-problem/sd-problem.seed.ts` | seedSDProblems |
| `server/src/scripts/seed-sd-problems.ts` | run |

## Entry Points

Start here when exploring this area:

- **`seedSDProblems`** (Function) — `server/src/sd-problem/sd-problem.seed.ts:1862`
- **`_handleSubmit`** (Function) — `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx:40`
- **`SDProblemModal`** (Function) — `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx:33`
- **`SDProblemForm`** (Function) — `client/apps/web/src/components/admin/sd-problem/SDProblemForm.jsx:14`
- **`_toggle`** (Function) — `client/apps/web/src/components/admin/sd-problem/SDProblemForm.jsx:15`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `seedSDProblems` | Function | `server/src/sd-problem/sd-problem.seed.ts` | 1862 |
| `_handleSubmit` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx` | 40 |
| `SDProblemModal` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx` | 33 |
| `SDProblemForm` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemForm.jsx` | 14 |
| `_toggle` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemForm.jsx` | 15 |
| `findOne` | Method | `server/src/sd-problem/sd-problem.service.ts` | 46 |
| `update` | Method | `server/src/sd-problem/sd-problem.service.ts` | 54 |
| `remove` | Method | `server/src/sd-problem/sd-problem.service.ts` | 68 |
| `run` | Function | `server/src/scripts/seed-sd-problems.ts` | 20 |
| `_parseJsonField` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx` | 10 |
| `_toFormState` | Function | `client/apps/web/src/components/admin/sd-problem/SDProblemModal.jsx` | 15 |

## How to Explore

1. `gitnexus_context({name: "seedSDProblems"})` — see callers and callees
2. `gitnexus_query({query: "sd-problem"})` — find related execution flows
3. Read key files listed above for implementation details
