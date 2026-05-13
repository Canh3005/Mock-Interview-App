---
name: behavioral
description: "Skill for the Behavioral area of Mock-Interview-App. 55 symbols across 11 files."
---

# Behavioral

55 symbols | 11 files | Cohesion: 85%

## When to Use

- Working with code in `server/`
- Understanding how getNextAnchor, buildAnchorInstruction, processInputQuality work
- Modifying behavioral-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/behavioral/prompt-builder.service.ts` | getCandidateContextHeader, getCandidateContextFooter, buildStageSummary, buildCandidateContextBlock, extractRoleTitle (+10) |
| `server/src/behavioral/behavioral-session.service.ts` | getRedirectMessages, sendMessage, saveUserLog, saveAiLog, sendStaticSSE (+8) |
| `server/src/behavioral/scoring.service.ts` | evaluateSession, buildTranscript, zeroAbsentStages, calcTotalScore, buildEvaluationPrompt (+1) |
| `server/src/behavioral/ai-facilitator.service.ts` | checkRelevance, checkStarCompleteness, summarizePreviousTurns, streamFacilitatorResponse |
| `server/src/ai/groq.service.ts` | toOpenAIMessages, generateContent, generateJsonContent, generateContentStream |
| `server/src/behavioral/question-orchestrator.service.ts` | getNextAnchor, buildAnchorInstruction, assessStagePerformance |
| `server/src/behavioral/message-quality.service.ts` | processInputQuality, countConsecutiveOffTopic, buildOffTopicFlags |
| `server/src/combat/combat-transition.service.ts` | getStageBudget, evaluateTransition, pickPhrase |
| `server/src/combat/multimodal-scoring.service.ts` | scoreSession, getDominantExpression |
| `server/src/combat/multimodal-hint.service.ts` | buildHint |

## Entry Points

Start here when exploring this area:

- **`getNextAnchor`** (Method) — `server/src/behavioral/question-orchestrator.service.ts:16`
- **`buildAnchorInstruction`** (Method) — `server/src/behavioral/question-orchestrator.service.ts:44`
- **`processInputQuality`** (Method) — `server/src/behavioral/message-quality.service.ts:10`
- **`countConsecutiveOffTopic`** (Method) — `server/src/behavioral/message-quality.service.ts:32`
- **`buildOffTopicFlags`** (Method) — `server/src/behavioral/message-quality.service.ts:54`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getNextAnchor` | Method | `server/src/behavioral/question-orchestrator.service.ts` | 16 |
| `buildAnchorInstruction` | Method | `server/src/behavioral/question-orchestrator.service.ts` | 44 |
| `processInputQuality` | Method | `server/src/behavioral/message-quality.service.ts` | 10 |
| `countConsecutiveOffTopic` | Method | `server/src/behavioral/message-quality.service.ts` | 32 |
| `buildOffTopicFlags` | Method | `server/src/behavioral/message-quality.service.ts` | 54 |
| `sendMessage` | Method | `server/src/behavioral/behavioral-session.service.ts` | 255 |
| `saveUserLog` | Method | `server/src/behavioral/behavioral-session.service.ts` | 808 |
| `saveAiLog` | Method | `server/src/behavioral/behavioral-session.service.ts` | 830 |
| `sendStaticSSE` | Method | `server/src/behavioral/behavioral-session.service.ts` | 848 |
| `sendStaticSSEWithMeta` | Method | `server/src/behavioral/behavioral-session.service.ts` | 852 |
| `checkRelevance` | Method | `server/src/behavioral/ai-facilitator.service.ts` | 56 |
| `checkStarCompleteness` | Method | `server/src/behavioral/ai-facilitator.service.ts` | 84 |
| `summarizePreviousTurns` | Method | `server/src/behavioral/ai-facilitator.service.ts` | 106 |
| `streamFacilitatorResponse` | Method | `server/src/behavioral/ai-facilitator.service.ts` | 129 |
| `buildHint` | Method | `server/src/combat/multimodal-hint.service.ts` | 13 |
| `getStageBudget` | Method | `server/src/combat/combat-transition.service.ts` | 50 |
| `evaluateTransition` | Method | `server/src/combat/combat-transition.service.ts` | 54 |
| `pickPhrase` | Method | `server/src/combat/combat-transition.service.ts` | 114 |
| `assessStagePerformance` | Method | `server/src/behavioral/question-orchestrator.service.ts` | 68 |
| `buildStageSummary` | Method | `server/src/behavioral/prompt-builder.service.ts` | 427 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `NextStage → PickRandomAnchor` | cross_community | 4 |
| `NextStage → ToOpenAIMessages` | cross_community | 4 |
| `StartSession → PickRandomAnchor` | intra_community | 4 |
| `StartSession → ToOpenAIMessages` | cross_community | 4 |
| `SendMessage → SendStaticSSEWithMeta` | intra_community | 3 |
| `ProcessScoring → BuildTranscript` | cross_community | 3 |
| `ProcessScoring → BuildEvaluationPrompt` | cross_community | 3 |
| `ProcessScoring → ZeroAbsentStages` | cross_community | 3 |
| `ProcessScoring → CalcTotalScore` | cross_community | 3 |
| `ProcessScoring → GetDominantExpression` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Combat | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getNextAnchor"})` — see callers and callees
2. `gitnexus_query({query: "behavioral"})` — find related execution flows
3. Read key files listed above for implementation details
