---
name: sd-evaluator
description: "Skill for the Sd-evaluator area of Mock-Interview-App. 20 symbols across 2 files."
---

# Sd-evaluator

20 symbols | 2 files | Cohesion: 88%

## When to Use

- Working with code in `server/`
- Understanding how buildScalabilityPrompt, buildTradeoffPrompt, buildCommunicationPrompt work
- Modifying sd-evaluator-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/sd-evaluator/sd-evaluator.service.ts` | _runAiDimensions, _callWithTimeout, _parseAiJson, _evaluateScalability, _evaluateTradeoff (+9) |
| `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | buildScalabilityPrompt, buildTradeoffPrompt, buildCommunicationPrompt, buildSuggestionsPrompt, buildCurveballPrompt (+1) |

## Entry Points

Start here when exploring this area:

- **`buildScalabilityPrompt`** (Function) — `server/src/sd-evaluator/prompts/evaluation-prompts.ts:8`
- **`buildTradeoffPrompt`** (Function) — `server/src/sd-evaluator/prompts/evaluation-prompts.ts:40`
- **`buildCommunicationPrompt`** (Function) — `server/src/sd-evaluator/prompts/evaluation-prompts.ts:74`
- **`buildSuggestionsPrompt`** (Function) — `server/src/sd-evaluator/prompts/evaluation-prompts.ts:137`
- **`buildCurveballPrompt`** (Function) — `server/src/sd-evaluator/prompts/evaluation-prompts.ts:181`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildScalabilityPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 8 |
| `buildTradeoffPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 40 |
| `buildCommunicationPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 74 |
| `buildSuggestionsPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 137 |
| `buildCurveballPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 181 |
| `pushAndUpdate` | Function | `server/src/sd-evaluator/sd-evaluator.service.ts` | 120 |
| `buildAnnotationPrompt` | Function | `server/src/sd-evaluator/prompts/evaluation-prompts.ts` | 101 |
| `_runAiDimensions` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 149 |
| `_callWithTimeout` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 197 |
| `_parseAiJson` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 210 |
| `_evaluateScalability` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 247 |
| `_evaluateTradeoff` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 280 |
| `_evaluateCommunication` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 307 |
| `_evaluateCurveball` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 334 |
| `_generateSuggestions` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 476 |
| `processEvaluation` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 109 |
| `_computeComponentCoverage` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 168 |
| `_computeFinalScore` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 388 |
| `_gradeBand` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 416 |
| `_annotateTranscript` | Method | `server/src/sd-evaluator/sd-evaluator.service.ts` | 424 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessEvaluation → BuildScalabilityPrompt` | cross_community | 4 |
| `ProcessEvaluation → _callWithTimeout` | cross_community | 4 |
| `ProcessEvaluation → _parseAiJson` | cross_community | 4 |
| `ProcessEvaluation → BuildTradeoffPrompt` | cross_community | 4 |
| `ProcessEvaluation → BuildCommunicationPrompt` | cross_community | 4 |
| `ProcessEvaluation → BuildCurveballPrompt` | cross_community | 4 |
| `ProcessEvaluation → BuildAnnotationPrompt` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "buildScalabilityPrompt"})` — see callers and callees
2. `gitnexus_query({query: "sd-evaluator"})` — find related execution flows
3. Read key files listed above for implementation details
