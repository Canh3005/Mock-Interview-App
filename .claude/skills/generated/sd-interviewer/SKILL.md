---
name: sd-interviewer
description: "Skill for the Sd-interviewer area of Mock-Interview-App. 18 symbols across 2 files."
---

# Sd-interviewer

18 symbols | 2 files | Cohesion: 90%

## When to Use

- Working with code in `server/`
- Understanding how buildSystemPrompt, buildHintPrompt, streamMessage work
- Modifying sd-interviewer-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/sd-interviewer/sd-interviewer.service.ts` | streamMessage, startSession, _computeCoverage, _checkCurveballEligible, _buildHistory (+11) |
| `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` | buildSystemPrompt, buildHintPrompt |

## Entry Points

Start here when exploring this area:

- **`buildSystemPrompt`** (Function) — `server/src/sd-interviewer/prompts/sd-phase-prompts.ts:48`
- **`buildHintPrompt`** (Function) — `server/src/sd-interviewer/prompts/sd-phase-prompts.ts:159`
- **`streamMessage`** (Method) — `server/src/sd-interviewer/sd-interviewer.service.ts:72`
- **`startSession`** (Method) — `server/src/sd-interviewer/sd-interviewer.service.ts:148`
- **`_computeCoverage`** (Method) — `server/src/sd-interviewer/sd-interviewer.service.ts:253`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildSystemPrompt` | Function | `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` | 48 |
| `buildHintPrompt` | Function | `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` | 159 |
| `streamMessage` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 72 |
| `startSession` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 148 |
| `_computeCoverage` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 253 |
| `_checkCurveballEligible` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 274 |
| `_buildHistory` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 307 |
| `_setSSEHeaders` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 358 |
| `_streamToClient` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 366 |
| `_appendTranscript` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 424 |
| `_processTransition` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 459 |
| `_summarizePhaseTranscript` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 505 |
| `requestHint` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 216 |
| `_buildSystemPrompt` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 287 |
| `_getCurrentPhaseExchanges` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 317 |
| `_getLatestSummary` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 333 |
| `_getLastInterviewerQuestion` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 341 |
| `_getNodeTypes` | Method | `server/src/sd-interviewer/sd-interviewer.service.ts` | 352 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `StreamMessage → BuildSystemPrompt` | cross_community | 3 |
| `StreamMessage → _getNodeTypes` | cross_community | 3 |
| `StreamMessage → _getLatestSummary` | cross_community | 3 |
| `StartSession → BuildSystemPrompt` | cross_community | 3 |
| `StartSession → _getNodeTypes` | cross_community | 3 |
| `StartSession → _getLatestSummary` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "buildSystemPrompt"})` — see callers and callees
2. `gitnexus_query({query: "sd-interviewer"})` — find related execution flows
3. Read key files listed above for implementation details
