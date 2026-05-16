# Feature 030 — Session Planning (Stage 1)

Stage 1 chuyển calibration artifact (Stage 0) thành `SessionPlan` — execution contract cho Interview Runtime (Stage 2–4). Plan xác định trước: probe nào được hỏi ở stage nào, theo thứ tự nào, với persona và pressure nào, trong bao nhiêu phút.

**Scope:** Toàn bộ 6 stage của mock interview:
- Stage 1: Culture Fit & Company Alignment
- Stage 2: Tech Stack Deep-Dive
- Stage 3: Domain Knowledge
- Stage 4: CV Deep-Dive
- Stage 5: Soft Skills & Situational
- Stage 6: Reverse Interview

**Session mode hiện tại:** Interview mode — mô phỏng phỏng vấn thực tế, mỗi session độc lập. Practice mode (cross-session history, weight decay) là scope của F031.

---

## Tại sao cần Stage 1 tách biệt

Nếu runtime tự chọn probe giữa chừng, nó phải đồng thời duy trì conversation flow, track stage coverage, và quyết định probe chiến lược — ba trách nhiệm xung đột nhau trong cùng một turn cycle.

Stage 1 tách strategy ra khỏi execution:
- **Strategy (Stage 1):** quyết định trước khi vào phòng — stage nào có probe gì, tech tags nào được ưu tiên, bao nhiêu phút mỗi stage.
- **Execution (Stage 2–4):** runtime chỉ lo adaptive tactics trong từng turn: follow-up, challenge, transition giữa probe.

`SessionPlan` là bản hợp đồng cố định objective. Runtime có thể dùng fallback, dừng probe sớm — nhưng không tự thêm probe ngoài plan.

---

## Input contract từ Stage 0

```ts
interface Stage1Input {
  calibrationProfile: BehaviorCalibrationProfile
  candidateClaims: CandidateClaim[]   // từ F029 — immutable
  riskHypotheses: RiskHypothesis[]    // từ F029 — immutable
}
```

Ngoài ra, Stage 1 nhận từ user khi khởi tạo session:

```ts
type InterviewDepth = 'broad' | 'deep'

interface SessionInitRequest {
  userId: string
  depth: InterviewDepth           // broad: cover đủ 6 stage; deep: đào sâu hơn ở tech stages
  durationMinutes: number
  language: QuestionProbeLanguage
  personaPreference?: PersonaTone
}
```

**Guard:** Nếu `calibrationProfile.status !== 'ready'` và `status !== 'partial'` → từ chối tạo plan, trả lỗi rõ ràng.

---

## Schema mới trong Stage 1

### `SessionPlan`

Output chính. Tổ chức probe theo stage thay vì flat list.

```ts
interface SessionPlan {
  id: string
  sessionId: string
  userId: string
  calibrationProfileId: string
  roleFamily: QuestionProbeRoleFamily
  targetRole: string
  targetLevel: QuestionProbeLevel
  language: QuestionProbeLanguage
  durationMinutes: number
  depth: InterviewDepth
  personaPolicy: PersonaPolicy
  pressureProfile: PressureProfile
  stageAllocations: StageProbeAllocation[]  // một entry per stage, ordered 1→6
  planVersion: string
  createdAt: string
}
```

Quyết định: Thay `selectedProbes: PlannedProbe[]` flat bằng `stageAllocations: StageProbeAllocation[]`. Runtime biết mình đang ở stage nào, user thấy progress "Stage 2/6", coaching sau session breakdown theo stage.

---

### `StageProbeAllocation`

Execution budget cho một stage.

```ts
type StagePriority = 'must_include' | 'nice_to_include'

interface StageProbeAllocation {
  stage: QuestionProbeStage         // 'stage_1_culture_fit' | 'stage_2_tech_stack' | ...
  priority: StagePriority
  allocatedMinutes: number
  selectedProbes: PlannedProbe[]
  fallbackProbes: PlannedProbe[]
}
```

**Priority theo stage:**

| Stage | Priority | Lý do |
|---|---|---|
| `stage_1_culture_fit` | `must_include` | Luôn hỏi — signal về fit với môi trường |
| `stage_2_tech_stack` | `must_include` | Core của kỹ năng kỹ thuật |
| `stage_3_domain_knowledge` | `must_include` | Depth kỹ thuật theo domain |
| `stage_4_cv_deep_dive` | `nice_to_include` | Bỏ nếu hết time — đã cover qua Stage 2/3 |
| `stage_5_soft_skills` | `must_include` | Behavioral signal không thể bỏ |
| `stage_6_reverse_interview` | `nice_to_include` | Bonus — bỏ nếu hết time |

---

### `PlannedProbe`

Không đổi về mặt cấu trúc. Wrap `QuestionProbe` với metadata runtime.

```ts
type FallbackTrigger =
  | 'no_relevant_story'
  | 'story_exhausted'
  | 'time_overrun'
  | 'low_evidence_yield'

interface PlannedProbe {
  questionProbeId: string
  questionProbeRevision: number
  plannedOrder: number           // thứ tự trong stage này
  selectionScore: number
  selectionReason: string        // "Selected: Redis in CV + JD requires caching layer"
  estimatedMinutes: number
  isFallbackFor?: string         // questionProbeId của probe chính
  fallbackTrigger?: FallbackTrigger
}
```

---

### `PersonaPolicy` và `PressureProfile`

Giữ nguyên từ F030 cũ. Preset theo level:

| Level | Persona tone | Challenge style | Pressure | maxChallenges |
|---|---|---|---|---|
| Junior | `friendly` | `supportive` | `low` | 1 |
| Mid | `neutral` | `direct` | `medium` | 2 |
| Senior | `skeptical` | `direct` | `high` | 3 |

Adjustment theo depth: `deep` → `maxChallengesPerProbe` tăng 1; `broad` → giảm 1.

```ts
type PersonaTone = 'friendly' | 'neutral' | 'skeptical' | 'silent' | 'detail_oriented'
type ChallengeStyle = 'supportive' | 'direct' | 'adversarial'
type VerbosityLevel = 'brief' | 'moderate' | 'verbose'

interface PersonaPolicy {
  name: string
  tone: PersonaTone
  challengeStyle: ChallengeStyle
  verbosity: VerbosityLevel
  silenceBehavior: 'prompt_immediately' | 'wait_briefly' | 'rephrase_question'
  challengeThreshold: 'low' | 'medium' | 'high'
}

interface PressureProfile {
  level: 'low' | 'medium' | 'high'
  challengeOnGenericAnswer: boolean
  challengeOnWeLanguage: boolean
  challengeOnNoMetric: boolean
  challengeOnNoConsequence: boolean
  maxChallengesPerProbe: number
}
```

---

## Probe Selection — Per Stage

Stage 1 chọn probe theo từng stage. Mỗi stage type có scoring function riêng vì mục tiêu khác nhau.

### Bước 1 — Hard filter (áp dụng cho tất cả stage)

```
1. stages.includes(targetStage)
2. levels.includes(targetLevel)
3. roleFamilies.includes(roleFamily) || roleFamilies.length === 0
4. status === 'active'
5. localizedContent[language] != null
```

Probe không pass tất cả 5 filter → loại hoàn toàn.

---

### Bước 2 — Scoring theo stage type

**Stage 1, 5 — Behavioral stages**

```
probe_score =
    competency_fit(probe.competencies, priorityCompetencies)  × 0.45
  + role_level_fit(probe.levels, probe.roleFamilies)          × 0.35
  + risk_signal_weight(probe.competencies, riskHypotheses)    × 0.20
  - recent_repetition_penalty
```

`competency_fit`: phần trăm `probe.competencies` overlap với `CalibrationProfile.priorityCompetencies`, weighted theo `competencyWeights`.

`risk_signal_weight`: normalize số risk hypotheses có `relatedCompetencies` overlap với probe — severity high = 1.0, medium = 0.6, low = 0.2.

---

**Stage 2, 3 — Technical stages**

```
probe_score =
    tech_tag_fit(probe.techTags, cvTechStack, jdTechStack)  × 0.55
  + role_level_fit(probe.levels, probe.roleFamilies)         × 0.30
  + difficulty_fit(probe.difficulty, targetLevel)            × 0.15
  - recent_repetition_penalty
```

`tech_tag_fit`:
```ts
if (probe.techTags.length === 0) return 0.3  // generic probe, không thưởng không phạt nhiều

const jdMatches    = probe.techTags.filter(t => jdTechStack.includes(t)).length
const cvOnlyMatch  = probe.techTags.filter(t =>
  cvTechStack.includes(t) && !jdTechStack.includes(t)
).length

const score = (jdMatches × 0.7 + cvOnlyMatch × 0.3) / probe.techTags.length
// nếu score === 0 (probe có techTags nhưng không match cả JD lẫn CV): filter ra khỏi pool tech stages
```

`difficulty_fit`: Junior → difficulty 1–2, Mid → 2–3, Senior → 3–4. Probe match target difficulty range → 1.0; lệch 1 bậc → 0.5; lệch 2+ bậc → 0.0.

Stage 2 ưu tiên probe `type: 'technical_depth'` và `type: 'trade_off'` với tech tags cụ thể.
Stage 3 ưu tiên probe có `competencies` chứa `system_thinking`, `trade_off_analysis`, `problem_solving` — conceptual hơn Stage 2.

---

**Stage 4 — CV Deep-Dive**

```
probe_score =
    claim_verification_fit(probe, candidateClaims)         × 0.50
  + tech_tag_fit(probe.techTags, cvTechStack, jdTechStack) × 0.30
  + role_level_fit(probe.levels, probe.roleFamilies)        × 0.20
  - recent_repetition_penalty
```

`claim_verification_fit`: ưu tiên probe có `type: 'cv_claim_verification'`. Score = phần trăm `candidateClaims` có `impliedCompetencies` overlap với `probe.competencies`, weighted theo `verificationPriority` (high = 1.0, medium = 0.6, low = 0.3).

Nếu pool `stage_4_cv_deep_dive` + `cv_claim_verification` rỗng sau filter: Stage 4 bị downgrade sang `nice_to_include` và bỏ qua.

---

**Stage 5 — Soft Skills & Situational**

Dùng cùng scoring function với Stage 1 (behavioral). Khác biệt ở chỗ `priorityCompetencies` cho Stage 5 ưu tiên: `conflict_handling`, `collaboration`, `communication`, `impact_measurement`.

---

**Stage 6 — Reverse Interview**

Không cần scoring function. Chọn 1 probe:
```
Filter: stages.includes('stage_6_reverse_interview') + hard filters
Sort by: role_level_fit, lấy probe đầu tiên
```

Stage 6 luôn có đúng 1 `selectedProbe` và 0 fallback.

---

### Bước 3 — Probe count per stage

**Công thức dựa trên `depth` và `durationMinutes`:**

| Stage | broad | deep |
|---|---|---|
| Stage 1 Culture Fit | 2 probes | 1 probe |
| Stage 2 Tech Stack | 2 probes | 3 probes |
| Stage 3 Domain | 2 probes | 3 probes |
| Stage 4 CV Deep-Dive | 1 probe | 1 probe |
| Stage 5 Soft Skills | 2 probes | 1 probe |
| Stage 6 Reverse | 1 probe | 1 probe |

`deep` dồn probe vào Stage 2, 3 vì đó là mục tiêu đào sâu kỹ thuật. Các stage behavioral giảm để nhường time.

Fallback: mỗi `must_include` probe có 1 fallback từ cùng stage, cùng competency/techTag nhưng score thứ hai.

---

## Duration Allocation

```
usable_minutes = durationMinutes - opening_overhead(2) - closing_overhead(3)

// Stage weight defaults (tổng = 1.0)
// Có thể adjust theo depth
stage_weights = {
  stage_1_culture_fit:       broad: 0.15, deep: 0.10
  stage_2_tech_stack:        broad: 0.25, deep: 0.30
  stage_3_domain_knowledge:  broad: 0.20, deep: 0.30
  stage_4_cv_deep_dive:      broad: 0.15, deep: 0.10
  stage_5_soft_skills:       broad: 0.15, deep: 0.10
  stage_6_reverse_interview: broad: 0.10, deep: 0.10
}

allocatedMinutes[stage] = usable_minutes × stage_weights[stage][depth]

estimatedMinutes per probe = allocatedMinutes[stage] / selectedProbes[stage].length
// clamp: min 4 phút, max 12 phút per probe
```

Nếu `nice_to_include` stages bị cắt (hết budget): thời gian không dùng phân bổ lại cho `must_include` stages theo tỷ lệ weight.

---

## Khi CalibrationProfile không đầy đủ

| Status | Stage 1 behavior |
|---|---|
| `ready` (cv + jd) | Chạy đầy đủ — tech tags từ cả hai source, claim/risk weights đầy đủ |
| `partial` (cv_only) | Chạy — tech tags từ CV, không có JD boost. Stage 4 dùng claim từ CV. `jdTechStack = []` trong tech_tag_fit |
| `partial` (jd_only) | Không tạo plan — không có CV thì không có tech tags, không verify claim. Trả lỗi rõ |
| `failed` | Không tạo plan |

---

## Khi nào Stage 1 chạy và khi nào plan bị stale

**On-demand** khi user confirm bắt đầu session.

**Plan stale** khi `SessionPlan.calibrationProfileId !== latestCalibrationProfile.id`:
- User upload CV/JD mới → Stage 0 chạy lại → calibration profile mới → plan auto rebuild
- User thay `depth` hoặc `durationMinutes` ở màn hình setup → rebuild preview, persist khi confirm

TTL cache 10 phút chỉ là optimization, không phải primary guard.

---

## Những gì Stage 1 KHÔNG làm

- Không gọi LLM — toàn bộ là deterministic backend logic.
- Không fetch probe content — chỉ lưu `questionProbeId` + `revision`. Runtime fetch khi render.
- Không tạo câu hỏi mới ngoài question bank.
- Không chạy evaluation hay scoring.
- Không tạo `SessionClaimOutcome` / `SessionRiskOutcome` — đó là việc của Stage 3–4.

---

## Output contract cho Stage 2 (Interview Runtime)

```ts
const initContext = {
  stageQueue: plan.stageAllocations
    .filter(s => s.selectedProbes.length > 0)
    .sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage)),
  personaPolicy: plan.personaPolicy,
  pressureProfile: plan.pressureProfile,
  timeBudget: plan.durationMinutes,
  language: plan.language,
}
// Runtime iterate qua stageQueue, trong mỗi stage iterate qua selectedProbes
// Fallback lookup: fallbackProbes trong cùng StageProbeAllocation
```

---

## Open Questions

### OQ-1: Tech tags từ CV — source là gì? ✅ Đã rõ

`BehaviorCalibrationProfile` (F029) mine CV và build `cvTechStack: string[]` — canonical tags theo `QUESTION_BANK_TAXONOMY.techTagGroups`. Stage 1 dùng trực tiếp field này. Không cần thêm processing.

### OQ-2: Stage 3 (Domain) vs Stage 2 (Tech Stack) — phân biệt như thế nào trong probe bank? ✅ Đã quyết định

Stage 2 probe: `techTags` specific (redis, postgresql, kafka...), `type: 'technical_depth'` hoặc `'trade_off'`.
Stage 3 probe: `techTags` rộng hơn hoặc rỗng, `competencies` chứa `system_thinking`, `problem_solving`, thiên về concept và architecture hơn là specific technology.

Phân biệt này nằm ở data trong probe bank, không cần code logic riêng — chỉ cần seed đúng `stages[]` cho từng probe.

**Quyết định:** Probe bank sẽ được bổ sung song song trong quá trình thử nghiệm flow phỏng vấn mới. F030 implement với probe bank hiện có, thiếu stage nào thì `StageProbeAllocation` của stage đó trả về `selectedProbes: []` và bị skip — không block runtime.

### OQ-3: `recent_repetition_penalty` — giữ hay bỏ?

Penalty tránh hỏi lại probe đã chạy trong session gần nhất. Implement sau khi có `BehaviorSession` entity với `usedProbeIds`. Set `penalty = 0` cho tất cả đến khi có data thực tế.

### OQ-4: Stage 4 fallback khi pool rỗng ✅ Đã quyết định

Nếu không có probe nào match `stage_4_cv_deep_dive` sau filter → Stage 4 downgrade sang `nice_to_include`, allocatedMinutes phân bổ lại cho Stage 2/3. Session vẫn chạy được.

### OQ-5: User có thể skip stage không? ✅ Đã quyết định

**Không.** Runtime kiểm soát toàn bộ stage transition. Không có nút "next stage" hay "skip" cho user. Chuyển stage khi policy quyết định — probe đủ evidence hoặc hết time budget của stage đó.
