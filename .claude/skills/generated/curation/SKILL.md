---
name: curation
description: "Skill for the Curation area of Mock-Interview-App. 49 symbols across 5 files."
---

# Curation

49 symbols | 5 files | Cohesion: 85%

## When to Use

- Working with code in `server/`
- Understanding how findOne, submitReview, reopenDraft work
- Modifying curation-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/question-bank/services/curation/question-probe-curation.service.ts` | findOne, submitReview, reopenDraft, publish, markNeedsRevision (+15) |
| `server/src/question-bank/services/curation/question-probe-validation.service.ts` | validate, _validateScoringHints, _validateFollowUps, _validateLocalizedContent, _nestedIssue (+9) |
| `server/src/question-bank/services/curation/interview-set-curation.service.ts` | create, findOne, update, _applyDto, _assertCodeAvailable (+7) |
| `server/src/question-bank/services/curation/question-probe-audit.service.ts` | record, _buildSnapshot |
| `server/src/question-bank/services/question-bank.service.ts` | validateProbe |

## Entry Points

Start here when exploring this area:

- **`findOne`** (Method) — `server/src/question-bank/services/curation/question-probe-curation.service.ts:88`
- **`submitReview`** (Method) — `server/src/question-bank/services/curation/question-probe-curation.service.ts:142`
- **`reopenDraft`** (Method) — `server/src/question-bank/services/curation/question-probe-curation.service.ts:163`
- **`publish`** (Method) — `server/src/question-bank/services/curation/question-probe-curation.service.ts:183`
- **`markNeedsRevision`** (Method) — `server/src/question-bank/services/curation/question-probe-curation.service.ts:206`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `findOne` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 88 |
| `submitReview` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 142 |
| `reopenDraft` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 163 |
| `publish` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 183 |
| `markNeedsRevision` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 206 |
| `retire` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 227 |
| `findAudit` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 249 |
| `_transition` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 282 |
| `_assertProbeValid` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 389 |
| `_assertAllowedStatus` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 399 |
| `_assertReason` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 407 |
| `validateProbe` | Method | `server/src/question-bank/services/question-bank.service.ts` | 18 |
| `validate` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 19 |
| `_validateScoringHints` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 194 |
| `_validateFollowUps` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 224 |
| `_validateLocalizedContent` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 260 |
| `_nestedIssue` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 319 |
| `_isRecord` | Method | `server/src/question-bank/services/curation/question-probe-validation.service.ts` | 326 |
| `createDraft` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 46 |
| `update` | Method | `server/src/question-bank/services/curation/question-probe-curation.service.ts` | 112 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ImportDrafts → FindOne` | cross_community | 4 |
| `Update → FindOne` | cross_community | 3 |
| `ImportDrafts → _applyDraftDto` | intra_community | 3 |
| `Update → FindOne` | intra_community | 3 |
| `Create → FindOne` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "findOne"})` — see callers and callees
2. `gitnexus_query({query: "curation"})` — find related execution flows
3. Read key files listed above for implementation details
