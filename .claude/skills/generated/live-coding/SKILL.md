---
name: live-coding
description: "Skill for the Live-coding area of Mock-Interview-App. 23 symbols across 4 files."
---

# Live-coding

23 symbols | 4 files | Cohesion: 91%

## When to Use

- Working with code in `server/`
- Understanding how handleApproachSubmit, handleRun, handleSubmit work
- Modifying live-coding-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/live-coding/live-coding.service.ts` | submitApproach, runCode, submitProblem, getSessionProblemOrThrow, getSession (+6) |
| `server/src/live-coding/live-coding-scoring.service.ts` | compute, scoreCorrectness, scoreComplexity, complexityGap, scoreThinkAloud (+3) |
| `client/apps/web/src/components/dsa/DSASessionPage.jsx` | handleApproachSubmit, handleRun, handleSubmit |
| `server/src/practice-dsa/practice-dsa.service.ts` | runCode |

## Entry Points

Start here when exploring this area:

- **`handleApproachSubmit`** (Function) — `client/apps/web/src/components/dsa/DSASessionPage.jsx:230`
- **`handleRun`** (Function) — `client/apps/web/src/components/dsa/DSASessionPage.jsx:242`
- **`handleSubmit`** (Function) — `client/apps/web/src/components/dsa/DSASessionPage.jsx:260`
- **`runCode`** (Method) — `server/src/practice-dsa/practice-dsa.service.ts:24`
- **`submitApproach`** (Method) — `server/src/live-coding/live-coding.service.ts:205`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleApproachSubmit` | Function | `client/apps/web/src/components/dsa/DSASessionPage.jsx` | 230 |
| `handleRun` | Function | `client/apps/web/src/components/dsa/DSASessionPage.jsx` | 242 |
| `handleSubmit` | Function | `client/apps/web/src/components/dsa/DSASessionPage.jsx` | 260 |
| `runCode` | Method | `server/src/practice-dsa/practice-dsa.service.ts` | 24 |
| `submitApproach` | Method | `server/src/live-coding/live-coding.service.ts` | 205 |
| `runCode` | Method | `server/src/live-coding/live-coding.service.ts` | 219 |
| `submitProblem` | Method | `server/src/live-coding/live-coding.service.ts` | 306 |
| `getSessionProblemOrThrow` | Method | `server/src/live-coding/live-coding.service.ts` | 579 |
| `compute` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 46 |
| `scoreCorrectness` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 85 |
| `scoreComplexity` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 97 |
| `complexityGap` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 112 |
| `scoreThinkAloud` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 125 |
| `scoreTimeEfficiency` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 138 |
| `scoreRunEfficiency` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 152 |
| `toGradeBand` | Method | `server/src/live-coding/live-coding-scoring.service.ts` | 160 |
| `getSession` | Method | `server/src/live-coding/live-coding.service.ts` | 147 |
| `triggerIdle` | Method | `server/src/live-coding/live-coding.service.ts` | 427 |
| `getScore` | Method | `server/src/live-coding/live-coding.service.ts` | 451 |
| `processDebrief` | Method | `server/src/live-coding/live-coding.service.ts` | 464 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Compute → ComplexityGap` | intra_community | 3 |
| `HandleRun → GetSessionOrThrow` | cross_community | 3 |
| `HandleRun → GetSessionProblemOrThrow` | intra_community | 3 |
| `HandleApproachSubmit → GetSessionProblemOrThrow` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "handleApproachSubmit"})` — see callers and callees
2. `gitnexus_query({query: "live-coding"})` — find related execution flows
3. Read key files listed above for implementation details
