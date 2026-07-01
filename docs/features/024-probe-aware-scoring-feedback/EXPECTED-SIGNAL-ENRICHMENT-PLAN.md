# Expected Signal Enrichment Plan

## 1. Summary

Muc tieu cua plan nay la lam giau `expectedSignals` bang `requirements`
va dam bao moi signal thieu deu co du duong dan hoi tiep qua `relatedTrigger`
va `followUps`.

Plan nay tap trung vao rubric/data quality, khong thay the plan code scoring:

- Moi `expectedSignal` nen co 2-4 `requirements` ro rang.
- Moi requirement co `key` on dinh va `description` de LLM extract evidence.
- Moi signal enriched phai co `relatedTrigger`; khong de `null` trong target data.
- Moi signal enriched phai co duong dan toi follow-up qua `relatedTrigger`.
- Moi `relatedTrigger` duoc signal su dung phai co follow-up tuong ung trong cung probe.

## 2. Definitions

### expectedSignal

Signal la tieu chi nang luc cap cao ma probe muon danh gia.

Vi du:

```json
{
  "label": "Shows awareness of index trade-offs",
  "relatedTrigger": "missing_tradeoff",
  "requirements": []
}
```

### requirement

Requirement la tieu chi nho ben trong mot signal. LLM dung description de tim
bang chung, code dung key de track ket qua.

```json
{
  "key": "write_overhead",
  "description": "Mentions slower writes, inserts, updates, deletes, or index maintenance overhead"
}
```

Quy uoc:

- `key` la ID ky thuat, ASCII slug, stable, khong hien thi cho user.
- `description` la rubric tu nhien cho LLM.
- Key unique trong pham vi mot signal.
- Nen dung 2-4 requirements/signal; tranh tach qua min vi se lam scoring qua khat.

### relatedTrigger

`relatedTrigger` khong phai scoring criteria. No tra loi cau hoi:

> Neu signal nay missing/unclear, policy engine nen hoi follow-up loai nao?

Trong enriched data, `relatedTrigger` la bat buoc cho moi signal. `null` chi
duoc xem la legacy/backward-compatible state cho data chua migrate, khong phai
target rubric sau enrichment.

Hien trigger hop le:

- `missing_metric`
- `missing_context`
- `missing_tradeoff`
- `vague_answer`
- `missing_personal_contribution`
- `missing_consequence`
- `missing_reflection`

### followUp

`followUps` la cau hoi thuc te ma interviewer se hoi khi policy chon trigger.
Moi signal enriched phai route duoc toi it nhat mot follow-up qua
`relatedTrigger`.

Hien runtime dung:

```ts
probe.followUps.find((f) => f.trigger === decision.followUpTrigger)
```

Nghia la v1 chi su dung **cau follow-up dau tien** cho moi trigger. Vi vay
"du so luong follow-up" trong v1 nen hieu la:

- Moi signal phai co `relatedTrigger` non-null.
- Moi trigger duoc `expectedSignals[].relatedTrigger` su dung phai co it nhat
  mot follow-up trong `followUps`.
- Khong can tao nhieu follow-up cung trigger neu chua doi runtime selector.

Neu hai signal share cung trigger thi v1 se share cung mot cau follow-up. Neu
muon moi signal co cau hoi rieng biet, can plan code rieng: them id/variant,
chon theo signal key hoac requirement key, va thay `.find()` bang selector co
context.

## 3. Enrichment Shape

Recommended final shape cho moi signal:

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
      "description": "Mentions additional storage, index size, or maintenance cost"
    }
  ]
}
```

Corresponding follow-up:

```json
{
  "trigger": "missing_tradeoff",
  "question": "What trade-offs would you consider before adding that index?",
  "purpose": "Probe write overhead, storage cost, and maintenance reasoning."
}
```

## 4. Trigger Selection Rules

### Use `missing_metric`

Dung khi signal can so lieu, baseline, row count, latency, frequency, cardinality,
SLO, before/after measurement, hoac validation bang metric.

Example requirements:

- `mentions_row_count`
- `mentions_latency_or_timing`
- `mentions_before_after_measurement`
- `mentions_selectivity_or_cardinality`

### Use `missing_context`

Dung khi signal can boi canh domain, workload, query pattern, table size,
business invariant, production condition, actor/system boundary.

Example requirements:

- `identifies_query_pattern`
- `mentions_table_size_or_workload`
- `states_business_invariant`
- `explains_domain_ownership`

### Use `missing_tradeoff`

Dung khi signal can danh doi: read/write, latency/consistency, storage/cost,
complexity/operability, isolation/performance, safety/speed.

Example requirements:

- `mentions_benefit`
- `mentions_cost`
- `states_when_not_to_use`
- `connects_choice_to_workload`

### Use `missing_personal_contribution`

Dung chu yeu cho behavioral/CV claim probes khi signal can vai tro ca nhan,
ownership, decision/action cua candidate.

Example requirements:

- `states_personal_role`
- `describes_own_action`
- `separates_team_outcome_from_own_contribution`

### Use `missing_consequence`

Dung khi signal can ket qua, impact, failure mode, incident consequence,
business/user effect.

Example requirements:

- `mentions_user_or_business_impact`
- `mentions_failure_mode`
- `mentions_operational_consequence`

### Use `missing_reflection`

Dung khi signal can bai hoc, retrospective, trade-off nhin lai, "would do
differently".

Example requirements:

- `states_lesson_learned`
- `mentions_future_change`
- `recognizes_limitation`

### Use `vague_answer`

Dung khi signal thieu su cu the nhung khong thuoc mot gap nao ro hon. Nen xem
day la fallback trigger bat buoc khi signal khong map sach vao trigger nao
cu the hon. Khong de `relatedTrigger: null`.

Example requirements:

- `provides_concrete_example`
- `names_specific_tool_or_feature`
- `states_specific_decision`

## 5. Follow-up Coverage Rules

### Required coverage

Moi probe phai thoa:

```txt
usedTriggers = unique(expectedSignals[].relatedTrigger)
availableTriggers = unique(followUps[].trigger)
every expectedSignal.relatedTrigger is non-null
usedTriggers subset of availableTriggers
```

Neu signal co `relatedTrigger = missing_metric`, trong probe phai co follow-up:

```json
{ "trigger": "missing_metric", "question": "...", "purpose": "..." }
```

### Recommended coverage

Moi probe nen co:

- 1 `vague_answer` follow-up neu co signal nao con co kha nang bi tra loi chung chung.
- 1 trigger cu the cho moi nhom gap quan trong nhat cua probe.
- Khong qua 3-4 follow-ups/probe de tranh prompt/data noise.

### Duplicate trigger policy

V1: khong tao duplicate trigger trong cung probe, tru khi chap nhan chi cau dau
tien duoc runtime dung.

Neu phat hien duplicate trigger:

- Gop thanh mot cau hoi tong quat hon, hoac
- Chon cau hoi tot nhat, hoac
- Defer den future code change de support variants.

### Follow-up wording rules

Follow-up nen:

- Hoi dung khoang trong cua trigger, khong reveal rubric day du.
- Khong hoi nhieu hon 1-2 y cung luc.
- Co the answer bang 1-3 cau.
- Khong lap lai primary question.
- Khong chua dap an mau.

Examples:

Good:

```txt
What trade-offs would you consider before adding that index?
```

Too revealing:

```txt
Please mention write overhead, storage overhead, selectivity, and EXPLAIN ANALYZE.
```

Too broad:

```txt
Can you explain everything about indexing in PostgreSQL?
```

## 6. Enrichment Workflow

### Step 1 - Pick one topic file

Bat dau voi `server/data/postgresql-probe-seeds.json` vi day la file dang mo va
co nhieu technical-depth probes ro rubric.

Khong enrich hang loat tat ca topic trong mot PR neu chua co validation script
va review loop.

### Step 2 - For each probe, classify signals

Voi moi probe:

1. Doc `intent` va `primaryQuestion`.
2. Doc tung `expectedSignal`.
3. Tach signal thanh 2-4 requirements.
4. Gan `relatedTrigger` non-null cho moi signal.
5. Neu signal chi la core correctness va khong co gap type ro hon, dung
   `vague_answer` lam fallback trigger va tao follow-up ep ung vien noi cu the.

### Step 3 - Build requirement keys

Key style:

- ASCII snake_case.
- Verb/noun ro nghia.
- Stable va ngan gon.
- Khong encode signal index vi index co the doi.

Good:

- `defines_primary_key`
- `mentions_foreign_key`
- `explains_write_overhead`
- `uses_explain_analyze`
- `mentions_rollback_plan`

Avoid:

- `requirement_1`
- `good_answer`
- `postgresql_index_btree_read_perf_write_storage_thing`

### Step 4 - Add or adjust relatedTrigger

Gan trigger dua tren gap can hoi tiep nhat.

Example:

```json
{
  "label": "Recognizes write overhead, storage cost, and maintenance cost.",
  "relatedTrigger": "missing_tradeoff",
  "requirements": [
    { "key": "mentions_write_overhead", "description": "Mentions slower writes, inserts, updates, deletes, or index maintenance overhead" },
    { "key": "mentions_storage_cost", "description": "Mentions additional storage or index size cost" },
    { "key": "mentions_maintenance_cost", "description": "Mentions ongoing maintenance, vacuum, bloat, or operational overhead from indexes" }
  ]
}
```

### Step 5 - Ensure followUp coverage

Sau khi gan relatedTrigger:

1. Kiem tra khong signal nao con `relatedTrigger: null`.
2. Lay danh sach unique trigger tu expectedSignals.
3. So voi `followUps`.
4. Them missing follow-up neu trigger chua co.
5. Xoa/gop duplicate trigger neu runtime chua support variants.

Example:

```txt
expectedSignals use: missing_tradeoff, missing_metric
followUps have: vague_answer, missing_tradeoff
missing follow-up: missing_metric
```

Them:

```json
{
  "trigger": "missing_metric",
  "question": "What measurement or query plan signal would tell you this index is actually useful?",
  "purpose": "Check whether the candidate validates indexing decisions with evidence."
}
```

### Step 6 - Validate

Can co script hoac test audit de check:

- Moi signal co `requirements` non-empty sau khi enriched.
- Requirement keys unique trong signal.
- Requirement descriptions non-empty.
- Moi signal co `relatedTrigger` non-null.
- Moi `relatedTrigger` co follow-up tuong ung.
- Khong duplicate follow-up trigger trong same probe, unless future code supports variants.

## 7. Suggested Validation Helper

Them mot helper/test rieng cho seed JSON:

```ts
function validateFollowUpCoverage(probe: QuestionProbeLike): string[] {
  const issues: string[] = [];
  const usedTriggers = new Set<QuestionProbeFollowUpTrigger>();
  const followUpTriggers = new Set(probe.followUps.map((followUp) => followUp.trigger));

  probe.expectedSignals.forEach((signal, index) => {
    if (signal.relatedTrigger === null) {
      issues.push(`${probe.code}: expectedSignals.${index}.relatedTrigger is required`);
      return;
    }
    usedTriggers.add(signal.relatedTrigger);
  });

  for (const trigger of usedTriggers) {
    if (!followUpTriggers.has(trigger)) {
      issues.push(`${probe.code}: missing followUp for relatedTrigger ${trigger}`);
    }
  }

  return issues;
}
```

Neu muon bat chat hon trong `QuestionProbeValidationService`, them check nay vao
publish quality gate. Neu chi muon data migration nhe, dat trong unit test seed
truoc de khong block admin draft ngay.

## 8. PostgreSQL Enrichment Example

Original:

```json
{
  "label": "Defines primary keys, foreign keys, and appropriate NOT NULL constraints.",
  "relatedTrigger": null
}
```

Enriched:

```json
{
  "label": "Defines primary keys, foreign keys, and appropriate NOT NULL constraints.",
  "relatedTrigger": "vague_answer",
  "requirements": [
    {
      "key": "defines_primary_keys",
      "description": "Defines primary keys for users, orders, and order_items or equivalent core tables"
    },
    {
      "key": "defines_foreign_keys",
      "description": "Defines foreign keys from orders to users and from order_items to orders"
    },
    {
      "key": "uses_not_null_constraints",
      "description": "Uses NOT NULL constraints for required relationship and domain fields"
    }
  ]
}
```

Required follow-up:

```json
{
  "trigger": "vague_answer",
  "question": "Which exact keys and constraints would you put on users, orders, and order_items?",
  "purpose": "Force concrete schema-level decisions instead of generic relational modeling."
}
```

Original:

```json
{
  "label": "Uses numeric or integer types carefully for money, quantities, and identifiers.",
  "relatedTrigger": null
}
```

Enriched:

```json
{
  "label": "Uses numeric or integer types carefully for money, quantities, and identifiers.",
  "relatedTrigger": "missing_tradeoff",
  "requirements": [
    {
      "key": "uses_numeric_for_money",
      "description": "Uses NUMERIC/DECIMAL or integer minor units for money rather than floating point"
    },
    {
      "key": "uses_integer_for_quantities",
      "description": "Uses integer or appropriately constrained numeric types for quantities"
    },
    {
      "key": "explains_rounding_risk",
      "description": "Explains rounding or precision risk when using floating point for money"
    }
  ]
}
```

Required follow-up:

```json
{
  "trigger": "missing_tradeoff",
  "question": "How would you choose data types for money and quantities, and what precision risks are you avoiding?",
  "purpose": "Check practical reasoning about numeric precision and domain constraints."
}
```

## 9. Batch Plan

### Batch 1 - PostgreSQL pilot

Scope:

- Enrich 3-5 PostgreSQL probes.
- Prefer probes with clear technical criteria:
  - schema keys/constraints
  - index trade-offs
  - slow query diagnosis
  - transactions
  - unique constraint/idempotency

Goal:

- Prove requirement shape is readable.
- Prove follow-up coverage rule catches missing triggers.
- Tune key naming convention.

### Batch 2 - Full PostgreSQL file

Scope:

- Enrich all PostgreSQL probes.
- Add/adjust followUps so every used relatedTrigger is covered.

Goal:

- PostgreSQL becomes first production-quality rubric file.

### Batch 3 - Apply pattern to other technical seed files

Order suggestion:

1. redis
2. mongodb
3. nodejs
4. express
5. nestjs
6. react/redux
7. docker/aws/bullmq

### Batch 4 - Behavioral files

Behavioral requirements need softer wording:

- situation/context
- personal action
- trade-off/decision
- impact/consequence
- reflection/learning

Follow-up triggers will use more:

- `missing_context`
- `missing_personal_contribution`
- `missing_consequence`
- `missing_reflection`
- `vague_answer`

## 10. Acceptance Criteria

For each enriched probe:

- Every expectedSignal has 2-4 requirements.
- Every requirement key is stable ASCII snake_case.
- Every requirement description is concrete enough for evidence extraction.
- Every expectedSignal has a non-null `relatedTrigger`.
- Every `relatedTrigger` has a matching followUp in the same probe.
- No duplicate followUp trigger exists in same probe unless runtime selector supports variants.
- Probe still passes existing validation/import.

## 11. Out of Scope

- Changing scoring algorithm implementation.
- Changing runtime follow-up selector to support multiple variants per trigger.
- Migrating all seed files in one pass.
- Expanding red flag schema.
- Changing public API response shape.
