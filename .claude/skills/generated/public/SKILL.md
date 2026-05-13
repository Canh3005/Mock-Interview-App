---
name: public
description: "Skill for the Public area of Mock-Interview-App. 24 symbols across 4 files."
---

# Public

24 symbols | 4 files | Cohesion: 96%

## When to Use

- Working with code in `server/`
- Understanding how _normalizePublicQuery, _positiveInteger, _difficulty work
- Modifying public-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | _normalizePublicQuery, _positiveInteger, _difficulty, _language, _sort (+6) |
| `server/src/question-bank/services/public/question-bank-related.service.ts` | findRelatedQuestions, _addOverlapClause, _sortRelated, _relatedScore, _difficultyDistance (+1) |
| `server/src/question-bank/services/public/question-bank-public-projection.service.ts` | toPublicCard, supportedLanguages, resolvedLocale, contentForLocale |
| `server/src/question-bank/services/public/question-bank-detail.service.ts` | getPublicProbeDetail, _nonNegativeInteger, _language |

## Entry Points

Start here when exploring this area:

- **`_normalizePublicQuery`** (Method) — `server/src/question-bank/services/public/question-bank-public-browse.service.ts:65`
- **`_positiveInteger`** (Method) — `server/src/question-bank/services/public/question-bank-public-browse.service.ts:184`
- **`_difficulty`** (Method) — `server/src/question-bank/services/public/question-bank-public-browse.service.ts:204`
- **`_language`** (Method) — `server/src/question-bank/services/public/question-bank-public-browse.service.ts:213`
- **`_sort`** (Method) — `server/src/question-bank/services/public/question-bank-public-browse.service.ts:230`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `_normalizePublicQuery` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 65 |
| `_positiveInteger` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 184 |
| `_difficulty` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 204 |
| `_language` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 213 |
| `_sort` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 230 |
| `_optionalTaxonomy` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 236 |
| `_techTags` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 251 |
| `_cleanText` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 268 |
| `toPublicCard` | Method | `server/src/question-bank/services/public/question-bank-public-projection.service.ts` | 13 |
| `supportedLanguages` | Method | `server/src/question-bank/services/public/question-bank-public-projection.service.ts` | 52 |
| `resolvedLocale` | Method | `server/src/question-bank/services/public/question-bank-public-projection.service.ts` | 59 |
| `contentForLocale` | Method | `server/src/question-bank/services/public/question-bank-public-projection.service.ts` | 73 |
| `listPublicProbes` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 31 |
| `_applyPublicFilters` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 125 |
| `_applyPublicSort` | Method | `server/src/question-bank/services/public/question-bank-public-browse.service.ts` | 164 |
| `findRelatedQuestions` | Method | `server/src/question-bank/services/public/question-bank-related.service.ts` | 16 |
| `_addOverlapClause` | Method | `server/src/question-bank/services/public/question-bank-related.service.ts` | 92 |
| `_sortRelated` | Method | `server/src/question-bank/services/public/question-bank-related.service.ts` | 111 |
| `_relatedScore` | Method | `server/src/question-bank/services/public/question-bank-related.service.ts` | 144 |
| `_difficultyDistance` | Method | `server/src/question-bank/services/public/question-bank-related.service.ts` | 163 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ListPublicProbes → _cleanText` | cross_community | 4 |
| `ListPublicProbes → ContentForLocale` | intra_community | 4 |
| `ListPublicProbes → _positiveInteger` | cross_community | 3 |
| `ListPublicProbes → _sort` | cross_community | 3 |
| `ListPublicProbes → _language` | cross_community | 3 |
| `FindRelatedQuestions → _overlapCount` | intra_community | 3 |
| `FindRelatedQuestions → _difficultyDistance` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "_normalizePublicQuery"})` — see callers and callees
2. `gitnexus_query({query: "public"})` — find related execution flows
3. Read key files listed above for implementation details
