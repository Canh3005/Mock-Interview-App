# Requirement-Evidence Scoring Plan

## 1. Summary

Muc tieu la lam scoring bot mong manh hon bang cach them `requirements`
vao tung `expectedSignal`, de LLM chi extract bang chung va requirement duoc
support, con code tu quyet `missing | unclear | covered`.

Pham vi v1 tap trung logic code truoc:

- Them schema optional cho `expectedSignals[].requirements`.
- Giu tuong thich voi seed/data cu chua co requirements.
- Refactor scoring prompt/output theo huong evidence-first.
- Harden `cvClaim` verification de tranh false `verified` hoac `inflated_risk`.
- Tam thoi khong migrate seed data hang loat; data enrichment lam sau.
- Tam thoi khong mo rong red flag schema; chi giu rule phan biet missing requirement va red flag trong prompt neu can.

## 2. Current Problems

### Signal scoring qua mong

Hien tai LLM tu quyet truc tiep:

```json
{
  "key": "signal_1",
  "status": "covered|unclear|missing",
  "evidenceQuotes": ["..."]
}
```

Code chi validate quote co nam trong answer khong. Code chua biet quote do
co dap ung metric, action, trade-off, personal ownership, result hay khong.

Ket qua la `status` de dao dong, nhat la khi signal label dang o dang cau tu
nhien.

### relatedTrigger khong phai scoring criteria

`relatedTrigger` dang dung dung vai tro policy: neu signal thieu thi hoi
follow-up loai nao. No khong nen bi dung nhu tieu chi cham diem.

### cvClaim dang dua vao prompt bang raw text

LLM hien tra `cvClaims[].claim` bang text. Du prompt da yeu cau khop claim goc,
van co rui ro paraphrase/invent. Validation hien tai cung chi downgrade
`verified` neu khong co quote, nhung chua downgrade `inflated_risk` neu khong co
quote hop le.

## 3. Target Design

### Expected signal schema

Mo rong `QuestionProbeExpectedSignal`:

```ts
export interface QuestionProbeSignalRequirement {
  key: string;
  description: string;
}

export interface QuestionProbeExpectedSignal {
  label: string;
  relatedTrigger: QuestionProbeFollowUpTrigger | null;
  requirements?: QuestionProbeSignalRequirement[];
}
```

`relatedTrigger` van giu nullable o code level de backward-compatible voi data cu.
Trong data da enrich, moi signal phai set `relatedTrigger` non-null va phai co
follow-up tuong ung trong cung probe.

Quy uoc:

- `key`: ID ky thuat on dinh, slug ASCII, unique trong mot signal.
- `description`: rubric cho LLM doc.
- `requirements` optional de seed cu van chay.
- Neu `requirements` rong hoac absent, scoring fallback ve logic hien tai.

Vi du:

```json
{
  "label": "Shows awareness of index trade-offs",
  "relatedTrigger": "missing_tradeoff",
  "requirements": [
    {
      "key": "read_benefit",
      "description": "Mentions that indexes improve reads, filtering, lookup, joins, ordering, or query performance"
    },
    {
      "key": "write_overhead",
      "description": "Mentions slower writes, inserts, updates, deletes, or index maintenance overhead"
    },
    {
      "key": "storage_overhead",
      "description": "Mentions additional storage or index size cost"
    }
  ]
}
```

### Scoring extraction schema

Them requirement-level extraction vao LLM signal output:

```ts
export interface LlmRequirementExtraction {
  key: string;
  supported: boolean;
  evidenceQuotes: string[];
  feedback: string;
}

export interface LlmSignalExtraction {
  key: string;
  label: string;
  status?: SignalStatus; // legacy fallback only
  evidenceQuotes: string[]; // legacy/general quotes
  requirementResults?: LlmRequirementExtraction[];
  feedback: string;
}
```

Prompt phai noi ro:

- Neu signal co requirements, return `requirementResults` cho tung requirement key.
- `supported: true` chi khi co exact quote support requirement do.
- Requirement khong support thi `supported: false` va `evidenceQuotes: []`.
- Khong duoc danh dau red flag chi vi answer thieu/vague; do la missing requirement.

### Deterministic status mapping

Trong `QuestionPracticeScoringResultService`:

- Neu signal khong co requirements: giu `_validatedSignals` behavior hien tai.
- Neu signal co requirements:
  - Drop requirement result co unknown key.
  - Validate exact quotes bang `_validQuotes`.
  - Chi coi requirement supported khi `supported === true` va co it nhat mot valid quote.
  - Tao `ProbeSignalRequirementResult[]` de audit:

```ts
export interface ProbeSignalRequirementResult {
  key: string;
  description: string;
  supported: boolean;
  evidenceQuotes: string[];
  feedback: string;
}
```

Map status:

```ts
if supportedCount === 0 => 'missing'
else if supportedCount === totalRequirements => 'covered'
else => 'unclear'
```

`ProbeSignalResult` them field optional:

```ts
requirementResults?: ProbeSignalRequirementResult[];
```

`evidenceQuotes` cua signal la unique valid quotes tu supported requirement results.
`overallBand` tiep tuc tinh tu `signal.status`, nen policy engine khong can doi.

### cvClaim verification

Giu `cvClaim` la branch rieng, khong tron vao expected signal requirements.

Thay vi yeu cau LLM tra raw `claim`, prompt nen dua catalog:

```json
[
  { "key": "cv_claim_1", "claim": "Led PostgreSQL migration for order service" }
]
```

LLM output moi:

```json
{
  "cvClaims": [
    {
      "key": "cv_claim_1",
      "verification": "verified|not_verified|inflated_risk",
      "evidenceQuotes": ["..."],
      "feedback": "..."
    }
  ]
}
```

Validation:

- Unknown `key` => drop.
- Legacy output co `claim` text exact-match claim goc => map ve key de backward-compatible.
- `verified` can valid quote.
- `inflated_risk` can valid quote.
- Neu `verified` hoac `inflated_risk` khong co valid quote => downgrade thanh `not_verified`.
- `not_verified` co the khong co quote.
- `cvClaimResults` van tra claim text goc cho consumer hien tai; co the them optional `key`.
- `cvClaimResults` khong anh huong `overallBand` v1.
- Runtime policy khong dung `cvClaimResults` de follow-up v1, tru probe type `cv_claim_verification` neu da co logic rieng sau nay.

### Red flags

V1 khong enrich red flag schema.

Giu `redFlags: string[]` va output hien tai de backward-compatible, nhung prompt nen co guard ngan LLM lan red flag voi missing requirement:

```txt
Do not mark a red flag because an answer is vague, incomplete, short, or missing a requirement.
A red flag requires an explicit quote showing a risky recommendation, harmful behavior, integrity issue, ownership issue, or contradiction.
```

Neu muon giam scope toi da, co the chi them guard nay vao prompt va khong doi
logic red flag nao khac trong v1.

## 4. Implementation Plan

### Step 1 - Types and DTOs

Update type definitions:

- Add `QuestionProbeSignalRequirement`.
- Add optional `requirements` to `QuestionProbeExpectedSignal`.
- Add `requirements?: QuestionProbeSignalRequirement[]` to scoring catalog items used by prompt/result builder.
- Add `ProbeSignalRequirementResult`.
- Add `requirementResults?: ProbeSignalRequirementResult[]` to `ProbeSignalResult`.
- Add optional `key?: string` to `ProbeCvClaimResult`.

Update DTOs:

- Add nested requirement DTOs in `question-probe-curation.dto.ts`.
- Add nested requirement DTOs in `validate-question-probe.dto.ts`.
- `requirements` optional.
- Validate `key` non-empty, slug-like, and unique within one signal.
- Validate `description` non-empty.

Update curation:

- Preserve `requirements` in `question-probe-curation.service.ts` when saving expectedSignals.
- Preserve existing `relatedTrigger` behavior.

Update validation:

- Existing probes without requirements remain valid.
- If requirements provided, every item must have valid `key` and `description`.
- Duplicate requirement keys within one signal are invalid.

### Step 2 - Prompt input shape

Update scoring catalog construction:

- `signalCatalog` should include `requirements`.
- `_promptCatalog` should include requirements when present.
- For legacy signals without requirements, prompt remains close to current format.

Update extraction prompt:

- Explain requirement-level extraction rules.
- Keep `status` in schema as legacy fallback, but instruct model that requirement-enabled signals must return `requirementResults`.
- Keep exact quote requirement.
- Keep red flag guard.
- Change CV claim output to use `key`.

### Step 3 - Result validation and deterministic mapping

Refactor `QuestionPracticeScoringResultService`:

- Split `_validatedSignals` into:
  - legacy path for signals without requirements
  - requirement path for signals with requirements
- Add helper `_validatedRequirementResults`.
- Add helper `_statusFromRequirementResults`.
- Add helper `_uniqueQuotes`.
- Keep `_overallBand` unchanged except it now consumes derived statuses.

Requirement path:

- Unknown requirement keys ignored.
- Missing requirement output becomes unsupported result.
- Supported requirement without valid quote becomes unsupported.
- Signal feedback can summarize missing requirement descriptions.

### Step 4 - cvClaim hardening

Refactor CV claim validation:

- Pass `cvClaimCatalog` into `buildResultFromRaw` and `buildResult`.
- Update `LlmCvClaimExtractionSchema` to accept new keyed shape.
- Map LLM claim entries by key first, exact claim text second for compatibility.
- Drop unknown entries.
- Downgrade `verified` and `inflated_risk` to `not_verified` when valid quotes are absent.

Update prompts:

- Tell LLM to return `cvClaims: []` if no catalog claim is relevant.
- Tell LLM to use `key`, not claim text.
- Keep quote validation rules.

### Step 5 - Compatibility

Do not require data migration for this code change.

Compatibility rules:

- Existing `expectedSignals` without requirements score using current status-based logic.
- Existing tests and fixtures that only specify label/relatedTrigger should still compile.
- Existing seed JSON remains importable.
- Requirement-enabled signals get deterministic status mapping.
- Existing public result consumers still receive `signalResults[].status` and `cvClaimResults[].claim`.
- New fields are additive.

### Step 6 - Optional service cleanup

If implementation becomes too large, extract these private helpers:

- `QuestionPracticeScoringPromptBuilder` for prompt construction.
- `QuestionPracticeSignalEvidenceService` for requirement result validation.
- Keep orchestration in `QuestionPracticeScoringService`.

This extraction is optional for v1; do it only if the scoring service becomes hard to test.

## 5. Test Plan

### Unit tests for requirement scoring

Add tests for `QuestionPracticeScoringResultService`:

- Signal without requirements preserves legacy LLM status behavior.
- Signal with all requirements supported maps to `covered`.
- Signal with some requirements supported maps to `unclear`.
- Signal with no supported requirements maps to `missing`.
- Requirement with `supported: true` but invalid quote is treated unsupported.
- Unknown requirement key is ignored.
- Missing `requirementResults` for requirement-enabled signal maps to `missing`.
- `relatedTrigger` is preserved on `ProbeSignalResult`.

### Unit tests for cvClaim hardening

Add tests for:

- `verified` with valid quote stays verified.
- `verified` without valid quote downgrades to `not_verified`.
- `inflated_risk` with valid quote stays inflated risk.
- `inflated_risk` without valid quote downgrades to `not_verified`.
- Unknown CV claim key is dropped.
- Legacy exact claim text output still maps correctly.
- Paraphrased claim text does not map.

### Policy regression tests

Policy engine should not need major changes, but run/update tests to ensure:

- Missing/unclear derived from requirements still chooses `relatedTrigger`.
- Covered derived from requirements can close probe.
- Red flag behavior remains backward-compatible.

### Runtime scoring tests

Add focused test around `scoreForRuntime` with mocked Groq:

- Prompt includes requirements when present.
- Prompt asks CV claim output by key.
- Returned requirement extraction produces deterministic status.
- Old probe without requirements still works.

Recommended commands:

```bash
cd server
npm test -- question-practice-scoring
npm test -- policy-engine
npm test -- question-probe.seed
npm test -- probe-embedding-text
```

## 6. Acceptance Criteria

- Code compiles with old expectedSignals shape.
- New `requirements` can be sent through DTOs, saved, loaded, snapshotted into practice attempts, and used by runtime scoring.
- Requirement-enabled signal status is derived by code, not accepted blindly from LLM.
- Existing seed data does not need migration to pass tests.
- `cvClaim` output is keyed and quote-validated.
- `verified` and `inflated_risk` cannot survive without exact evidence quotes.
- Policy engine still receives normal `ProbeSignalResult.status` and `relatedTrigger`.

## 7. Follow-up Data Work

Data migration/enrichment is intentionally out of this implementation.

When ready, enrich seed files incrementally:

- Start with PostgreSQL probes.
- Add 2-4 requirements per expected signal.
- Set non-null `relatedTrigger` for every expected signal.
- Ensure every used `relatedTrigger` has a matching follow-up in the same probe.
- Keep requirement keys stable and ASCII.
- Move red flag items like "vague answer" or "no concrete example" into signal requirements instead of red flags.
- Re-run probe validation and import after enrichment.

## 8. Assumptions

- `requirements` are optional in v1.
- Red flag schema remains unchanged in v1.
- `cvClaimResults` remain session synthesis input, not policy follow-up input.
- No database migration is needed because `expectedSignals` is already JSONB.
- Public API changes are additive and backward-compatible.
