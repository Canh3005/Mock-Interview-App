---
name: combat
description: "Skill for the Combat area of Mock-Interview-App. 12 symbols across 2 files."
---

# Combat

12 symbols | 2 files | Cohesion: 95%

## When to Use

- Working with code in `server/`
- Understanding how calculateIntegrity, calculateBaseDeductions, _calculateCorrelations work
- Modifying combat-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `server/src/combat/integrity-calculator.service.ts` | calculateIntegrity, calculateBaseDeductions, _calculateCorrelations, calculateFinalIntegrityScore, getVerdict (+1) |
| `server/src/combat/combat-metrics.service.ts` | ingestProctoringEvent, ingestProctoringEventBatch, _normalizeEventDto, _buildFallbackClientEventId, _ensureProctoringSession (+1) |

## Entry Points

Start here when exploring this area:

- **`calculateIntegrity`** (Method) — `server/src/combat/integrity-calculator.service.ts:25`
- **`calculateBaseDeductions`** (Method) — `server/src/combat/integrity-calculator.service.ts:100`
- **`_calculateCorrelations`** (Method) — `server/src/combat/integrity-calculator.service.ts:108`
- **`calculateFinalIntegrityScore`** (Method) — `server/src/combat/integrity-calculator.service.ts:228`
- **`getVerdict`** (Method) — `server/src/combat/integrity-calculator.service.ts:237`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `calculateIntegrity` | Method | `server/src/combat/integrity-calculator.service.ts` | 25 |
| `calculateBaseDeductions` | Method | `server/src/combat/integrity-calculator.service.ts` | 100 |
| `_calculateCorrelations` | Method | `server/src/combat/integrity-calculator.service.ts` | 108 |
| `calculateFinalIntegrityScore` | Method | `server/src/combat/integrity-calculator.service.ts` | 228 |
| `getVerdict` | Method | `server/src/combat/integrity-calculator.service.ts` | 237 |
| `buildHrNotes` | Method | `server/src/combat/integrity-calculator.service.ts` | 246 |
| `ingestProctoringEvent` | Method | `server/src/combat/combat-metrics.service.ts` | 91 |
| `ingestProctoringEventBatch` | Method | `server/src/combat/combat-metrics.service.ts` | 117 |
| `_normalizeEventDto` | Method | `server/src/combat/combat-metrics.service.ts` | 127 |
| `_buildFallbackClientEventId` | Method | `server/src/combat/combat-metrics.service.ts` | 149 |
| `_ensureProctoringSession` | Method | `server/src/combat/combat-metrics.service.ts` | 154 |
| `_incrementCounters` | Method | `server/src/combat/combat-metrics.service.ts` | 178 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `IngestProctoringEventBatch → _buildFallbackClientEventId` | intra_community | 4 |
| `IngestProctoringEventBatch → _ensureProctoringSession` | intra_community | 3 |
| `IngestProctoringEventBatch → _incrementCounters` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "calculateIntegrity"})` — see callers and callees
2. `gitnexus_query({query: "combat"})` — find related execution flows
3. Read key files listed above for implementation details
