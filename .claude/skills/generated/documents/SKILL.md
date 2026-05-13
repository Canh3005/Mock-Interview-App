---
name: documents
description: "Skill for the Documents area of Mock-Interview-App. 10 symbols across 2 files."
---

# Documents

10 symbols | 2 files | Cohesion: 89%

## When to Use

- Working with code in `server/`
- Understanding how DocumentsAiService, queueDocumentForParsing, extractTextFromFile work
- Modifying documents-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/documents/documents.service.ts` | queueDocumentForParsing, extractTextFromFile, parseCv, parseJd, normalizeExtractedText (+3) |
| `server/src/documents/documents.ai.service.ts` | IAiProvider, DocumentsAiService |

## Entry Points

Start here when exploring this area:

- **`DocumentsAiService`** (Class) — `server/src/documents/documents.ai.service.ts:58`
- **`queueDocumentForParsing`** (Method) — `server/src/documents/documents.service.ts:42`
- **`extractTextFromFile`** (Method) — `server/src/documents/documents.service.ts:111`
- **`parseCv`** (Method) — `server/src/documents/documents.service.ts:195`
- **`parseJd`** (Method) — `server/src/documents/documents.service.ts:291`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `DocumentsAiService` | Class | `server/src/documents/documents.ai.service.ts` | 58 |
| `IAiProvider` | Interface | `server/src/documents/documents.ai.service.ts` | 47 |
| `queueDocumentForParsing` | Method | `server/src/documents/documents.service.ts` | 42 |
| `extractTextFromFile` | Method | `server/src/documents/documents.service.ts` | 111 |
| `parseCv` | Method | `server/src/documents/documents.service.ts` | 195 |
| `parseJd` | Method | `server/src/documents/documents.service.ts` | 291 |
| `normalizeExtractedText` | Method | `server/src/documents/documents.service.ts` | 136 |
| `countKeywordHits` | Method | `server/src/documents/documents.service.ts` | 140 |
| `buildValidationErrorMessage` | Method | `server/src/documents/documents.service.ts` | 144 |
| `validateUploadedDocumentContent` | Method | `server/src/documents/documents.service.ts` | 155 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `QueueDocumentForParsing → NormalizeExtractedText` | cross_community | 3 |
| `QueueDocumentForParsing → CountKeywordHits` | cross_community | 3 |
| `QueueDocumentForParsing → BuildValidationErrorMessage` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "DocumentsAiService"})` — see callers and callees
2. `gitnexus_query({query: "documents"})` — find related execution flows
3. Read key files listed above for implementation details
