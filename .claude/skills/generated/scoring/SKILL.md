---
name: scoring
description: "Skill for the Scoring area of Mock-Interview-App. 47 symbols across 5 files."
---

# Scoring

47 symbols | 5 files | Cohesion: 82%

## When to Use

- Working with code in `server/`
- Understanding how ScorecardDisplay, MultimodalScoreCard, IntegrityScoreCard work
- Modifying scoring-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | _scoreAttempt, _extractWithRetry, _extractionPrompt, _withNarrative, _narrativePrompt (+11) |
| `server/src/question-bank/services/scoring/question-practice-scoring-result.service.ts` | buildResult, fallbackSuggestions, _validatedCvClaims, _overallBand, _confidence (+10) |
| `client/apps/web/src/components/scoring/ScorecardDisplay.jsx` | scoreColor, getOverallCombatScore, AccordionStage, CommunicationTab, CombatTab (+3) |
| `client/apps/web/src/components/scoring/MultimodalScoreCard.jsx` | scoreColor, MetricCard, MultimodalScoreCard, scoreBarColor, ScoreBar |
| `client/apps/web/src/components/scoring/IntegrityScoreCard.jsx` | getOverallCombatScore, scoreColor, IntegrityScoreCard |

## Entry Points

Start here when exploring this area:

- **`ScorecardDisplay`** (Function) — `client/apps/web/src/components/scoring/ScorecardDisplay.jsx:544`
- **`MultimodalScoreCard`** (Function) — `client/apps/web/src/components/scoring/MultimodalScoreCard.jsx:43`
- **`IntegrityScoreCard`** (Function) — `client/apps/web/src/components/scoring/IntegrityScoreCard.jsx:47`
- **`_scoreAttempt`** (Method) — `server/src/question-bank/services/scoring/question-practice-scoring.service.ts:86`
- **`_extractWithRetry`** (Method) — `server/src/question-bank/services/scoring/question-practice-scoring.service.ts:112`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ScorecardDisplay` | Function | `client/apps/web/src/components/scoring/ScorecardDisplay.jsx` | 544 |
| `MultimodalScoreCard` | Function | `client/apps/web/src/components/scoring/MultimodalScoreCard.jsx` | 43 |
| `IntegrityScoreCard` | Function | `client/apps/web/src/components/scoring/IntegrityScoreCard.jsx` | 47 |
| `_scoreAttempt` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 86 |
| `_extractWithRetry` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 112 |
| `_extractionPrompt` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 157 |
| `_withNarrative` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 203 |
| `_narrativePrompt` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 235 |
| `_contextForExtraction` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 248 |
| `_semanticChunks` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 274 |
| `_topChunkIndexes` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 283 |
| `_overlapScore` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 305 |
| `_terms` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 316 |
| `_errorMessage` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 368 |
| `processAttempt` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 50 |
| `_markProcessing` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 324 |
| `_saveReady` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 336 |
| `_saveFailed` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 351 |
| `_isEvaluable` | Method | `server/src/question-bank/services/scoring/question-practice-scoring.service.ts` | 364 |
| `buildResult` | Method | `server/src/question-bank/services/scoring/question-practice-scoring-result.service.ts` | 23 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessAttempt → _terms` | cross_community | 5 |
| `ProcessAttempt → _overlapScore` | cross_community | 5 |
| `ProcessAttempt → _semanticChunks` | cross_community | 4 |
| `ProcessAttempt → _extractionPrompt` | cross_community | 4 |
| `ProcessAttempt → _errorMessage` | cross_community | 4 |
| `ProcessAttempt → _narrativePrompt` | cross_community | 4 |
| `BuildResult → _normalize` | cross_community | 4 |
| `BuildResult → _missingSignal` | cross_community | 3 |
| `BuildResult → _absentRedFlag` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "ScorecardDisplay"})` — see callers and callees
2. `gitnexus_query({query: "scoring"})` — find related execution flows
3. Read key files listed above for implementation details
