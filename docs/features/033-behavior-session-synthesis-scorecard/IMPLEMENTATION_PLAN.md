# Feature 033 — Behavior Session Synthesis & Scorecard UI

**Prerequisite:** F032 (Interview Runtime) đã hoàn thành. Session kết thúc với `interviewState = 'COMPLETED'`, `status = 'SCORING'`, và `stageProgress[]` đầy đủ `ProbeRunSummary`.

**Phạm vi:**
- **BE:** Stage 5 — Session-level synthesis (deterministic, không LLM)
- **FE:** Scorecard UI mới cho behavior session — đập cũ xây lại

---

## Bối cảnh hiện tại

### Data đã có sau runtime (F032)

Mỗi `StageProgress` tích lũy `ProbeRunSummary[]`, mỗi summary có:

```ts
interface ProbeRunSummary {
  questionProbeId: string
  questionProbeRevision: number
  candidateTurnCount: number
  followUpCount: number
  challengeCount: number
  finalBand: OverallBand         // 'strong' | 'solid' | 'needs_work' | 'insufficient_evidence'
  finalScoringResult: ProbeScoringResult
  closeReason: ProbeCloseReason
  isFallback: boolean
}
```

`ProbeScoringResult` có: `signalResults[]` (status: `covered | unclear | missing`, evidenceQuotes[]), `redFlags[]` (present: boolean, evidenceQuotes[]), `cvClaimResults[]` (verification: `verified | not_verified | inflated_risk`), `overallBand`, `confidence`, `summary`, `improvementSuggestions`.

`BehavioralStageLog` table lưu từng turn kèm: `role`, `content` (text của turn), `turnType`, `probeId`, `followUpTrigger`, `challengeReason`.

### Lifecycle hiện tại

```
submitAnswer (last turn)
  → session.interviewState = 'COMPLETED'
  → session.status = 'SCORING'
  → [F033: chạy synthesis ở đây, sync, trước khi emit SSE]
  → session.finalScore = BehaviorScorecardData
  → session.status = 'COMPLETED'
  → emit SSE { state: 'COMPLETED' }
```

**Synthesis chạy synchronous — toàn bộ trong `submitAnswer` flow, trước khi emit SSE.** FE nhận SSE `COMPLETED` đồng nghĩa synthesis đã xong. Không có 202/polling — FE không bao giờ thấy trạng thái `SCORING`.

### API hiện tại

`getAllSessionsForInterview(interviewSessionId)` trả:
```json
{ "sessions": { "behavioral": { ...session.finalScore }, "liveCoding": null, "systemDesign": null } }
```

`sessions.behavioral` là nội dung của `BehavioralSession.finalScore` — không phải session wrapper. F033 dùng đường này, không tạo endpoint mới.

### UI hiện tại

`ScorecardDisplay.jsx` phục vụ cả behavioral lẫn combat, schema cũ (`total_score`, `breakdown[stage]`) không khớp schema mới. F033 tạo `BehaviorScorecardDisplay` riêng, giữ nguyên `ScorecardDisplay` cho combat/legacy.

---

## BE — Session Synthesis Pipeline

### Nguyên tắc

- Toàn bộ deterministic — không gọi LLM.
- Mỗi score và decision phải trace được về evidence trong `ProbeRunSummary` và `BehavioralStageLog`.
- `evidence_quality` và `level_depth_fit` từ design E8 được **approximated** trong F033 (xem ghi chú cuối section). Defer đầy đủ sang F034.
- `improvementSuggestions` trong `ProbeAuditEntry` là dữ liệu audit có sẵn từ scoring engine (F032) — không generate coaching mới.

---

### Output schema: `BehaviorScorecardData`

```ts
// server/src/behavior-session/types/session-synthesis.types.ts

import type {
  OverallBand,
  ProbeRedFlagResult,
  ProbeSignalResult,
  ProbeCvClaimResult,
} from '../../question-bank/types/question-practice-scoring.types';
import type { QuestionProbeStage } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { ProbeCloseReason } from './behavior-session.types';

export type ReadinessBand = 'ready' | 'almost_ready' | 'needs_practice' | 'not_ready';
export type ProbeResilienceResult = 'resilient' | 'collapsed' | 'unchallenged';
export type ConsistencyFlagType =
  | 'must_include_stage_skipped'
  | 'no_story_for_probe'
  | 'high_risk_low_signal'
  | 'all_probes_unchallenged';

export interface ProbeAuditEntry {
  questionProbeId: string;
  stage: QuestionProbeStage;
  stageLabel: string;
  primaryQuestion: string;          // từ QuestionProbe, ngôn ngữ của session
  band: OverallBand;
  score: number;                    // 0–100, computed từ band + signalCoverageRatio
  scoreContribution: number;        // đóng góp vào competencyAggregate (0.0–1.0 weight share)
  candidateTurnCount: number;
  challengeCount: number;
  followUpCount: number;
  closeReason: ProbeCloseReason;
  isFallback: boolean;
  // Audit trail per C18
  candidateAnswerQuotes: string[];  // text các turn type='candidate_answer' của probe này
  followUpReasons: string[];        // followUpTrigger + challengeReason của các turn follow_up/challenge
  // Scoring detail
  signalResults: ProbeSignalResult[];
  redFlags: ProbeRedFlagResult[];
  cvClaimResults: ProbeCvClaimResult[];
  improvementSuggestions: string[];  // từ ProbeScoringResult — dữ liệu audit, không phải coaching mới
  summary: string;
}

export interface ProbeResilienceEntry {
  questionProbeId: string;
  challengeCount: number;
  finalBand: OverallBand;
  result: ProbeResilienceResult;    // resilient | collapsed | unchallenged
}

export interface ProbeResilienceSummary {
  entries: ProbeResilienceEntry[];
  challengedProbeCount: number;     // probes có challengeCount > 0
  resilientCount: number;           // challenged + finalBand in ['strong', 'solid']
  collapsedCount: number;           // challenged + finalBand in ['needs_work', 'insufficient_evidence']
  resilienceScore: number;          // 0.0–1.0; 0.5 nếu không có probe nào bị challenge
}

export interface CompetencyScoreEntry {
  competencyKey: string;
  label: string;
  probeCount: number;
  coveredSignals: number;
  unclearSignals: number;
  missingSignals: number;
  totalSignals: number;
  signalCoverageRatio: number;      // (covered + unclear × 0.5) / max(total, 1)
  score: number;                    // 0–100
  band: OverallBand;
}

export interface SessionRiskSummary {
  totalRedFlagsPresent: number;
  presentFlagKeys: string[];
  cvClaimInflatedCount: number;
  cvClaimNotVerifiedCount: number;  // informational only — không tính vào penalty F033
  riskPenalty: number;              // 0.0–1.0, dùng làm risk multiplier
}

export interface CommunicationSummary {
  genericAnswerCount: number;       // probes band in ['needs_work', 'insufficient_evidence']
  avgRedFlagRate: number;           // avg(presentFlagCount / max(totalFlagCount, 1)) per probe
  score: number;                    // 0–100, formula bên dưới
}

export interface ConsistencyFlag {
  type: ConsistencyFlagType;
  affectedProbeId?: string;
  affectedStage?: QuestionProbeStage;
  detail: string;
}

export interface ConsistencyCheck {
  flags: ConsistencyFlag[];
  hasHighRiskPattern: boolean;      // ít nhất 1 flag type = 'high_risk_low_signal'
  hasCoverageGap: boolean;          // must_include_stage_skipped hoặc no_story_for_probe
}

export interface ReadinessSummary {
  competencyAggregate: number;      // weighted avg competency scores 0–100
  resilienceScore: number;          // 0.0–1.0 trước khi nhân hệ số
  communicationScore: number;       // 0–100 trước khi nhân hệ số
  riskPenalty: number;              // 0.0–1.0
  riskMultiplier: number;           // 1.0 - riskPenalty × 0.30, clamp [0.70, 1.0]
  subTotal: number;                 // trước khi áp riskMultiplier
  finalScore: number;               // 0–100
  band: ReadinessBand;
}

export interface BehaviorScorecardData {
  scorecardVersion: '1.0';
  sessionId: string;
  synthesizedAt: string;
  probeAuditTrail: ProbeAuditEntry[];
  probeResilience: ProbeResilienceSummary;
  competencyScores: CompetencyScoreEntry[];
  riskSummary: SessionRiskSummary;
  communication: CommunicationSummary;
  consistencyCheck: ConsistencyCheck;
  readiness: ReadinessSummary;
  stagesCompleted: QuestionProbeStage[];
  stagesSkipped: QuestionProbeStage[];
}
```

---

### Công thức aggregate

#### Band → base score (0–100)

```
strong                → 90
solid                 → 72
needs_work            → 45
insufficient_evidence → 20
```

#### Signal coverage ratio (per probe)

```
covered = signalResults.filter(s => s.status === 'covered').length
unclear = signalResults.filter(s => s.status === 'unclear').length
total   = signalResults.length

signalCoverageRatio = (covered + unclear × 0.5) / max(total, 1)
```

#### Probe score (per probe, 0–100)

```
probeScore = bandBase × 0.70 + signalCoverageRatio × 100 × 0.30
```

#### Probe resilience (per probe)

Không dùng "initial band" vì `ProbeRunSummary` không persist nó. Resilience được xác định từ dữ liệu có sẵn:

```
nếu challengeCount === 0:
  result = 'unchallenged'

nếu challengeCount > 0:
  finalBand ∈ ['strong', 'solid']                    → result = 'resilient'
  finalBand ∈ ['needs_work', 'insufficient_evidence'] → result = 'collapsed'

challengedProbeCount = entries.filter(e => e.result !== 'unchallenged').length

resilienceScore =
  nếu challengedProbeCount === 0: 0.5           // không có probe nào bị challenge — neutral
  else: resilientCount / challengedProbeCount   // 0.0–1.0
```

#### Competency score (per competency)

Synthesis load `QuestionProbe.competencies[]` per probe (batch query). Chỉ tính competency có ít nhất 1 probe.

```
Per competency C:
  probes_C = probeAuditTrail.filter(p => probe.competencies.includes(C))
  nếu probes_C.length === 0: bỏ qua

  score_C = sum(probeScore[p]) / probes_C.length   // simple avg across probes

  weight_C = calibrationProfile.competencyWeights[C] ?? 1.0

competencyAggregate =
  sum(score_C × weight_C) / sum(weight_C)          // normalized weighted avg
  // chỉ tính trên các competency có probe
  // nếu không có competency nào: competencyAggregate = 0
```

**Approximation note (F033):** Design E8 yêu cầu `evidence_quality` và `level_depth_fit` trong công thức competency. F033 approximates:
- `evidence_quality` → được xấp xỉ bởi `signalCoverageRatio` (signals có evidenceQuotes vs không)
- `level_depth_fit` → deferred sang F034, cần `LevelExpectation` trong `CalibrationProfile` được populate đầy đủ

#### Communication score (0–100)

```
genericAnswerCount = probeAuditTrail.filter(p =>
  p.band ∈ ['needs_work', 'insufficient_evidence']
).length

genericRate = genericAnswerCount / max(totalProbes, 1)

avgRedFlagRate = avg per probe: (
  probe.redFlags.filter(f => f.present).length / max(probe.redFlags.length, 1)
)

communicationScore = clamp(
  round(100 × (1 - avgRedFlagRate × 0.60 - genericRate × 0.40)),
  0, 100
)
```

#### Risk penalty

```
riskPenalty = min(1.0,
  presentFlagCount × 0.05
  + cvClaimInflatedCount × 0.08
)

// cvClaimNotVerifiedCount → informational only, không tính vào penalty
// Reserved: F034 coaching sẽ dùng not_verified để generate feedback
```

#### Readiness final score (0–100)

```
subTotal =
  competencyAggregate × 0.70      // max 70
  + resilienceScore × 20          // max 20 (resilienceScore 0.0–1.0)
  + communicationScore × 0.10     // max 10
// subTotal max = 100

riskMultiplier = clamp(1.0 - riskPenalty × 0.30, 0.70, 1.0)
// max penalty: giảm 30% điểm; không bao giờ nhân dưới 0.70

finalScore = round(clamp(subTotal × riskMultiplier, 0, 100))

band:
  80–100 → 'ready'
  65–79  → 'almost_ready'
  45–64  → 'needs_practice'
  0–44   → 'not_ready'
```

#### Consistency check

```
Chạy TRƯỚC khi tính điểm. Flags không block synthesis, chỉ annotate.

Flag 'must_include_stage_skipped':
  stageProgress.filter(s => s.status === 'skipped' && allocation.priority === 'must_include')

Flag 'no_story_for_probe':
  ProbeRunSummary.filter(p => p.closeReason === 'no_relevant_story')

Flag 'high_risk_low_signal':
  ProbeRunSummary.filter(p =>
    p.finalScoringResult.redFlags.filter(f => f.present).length >= 2
    && p.finalScoringResult.signalResults.filter(s => s.status !== 'missing').length === 0
  )

Flag 'all_probes_unchallenged':
  probeAuditTrail.every(p => p.challengeCount === 0)
```

---

### `SessionSynthesisService` — pipeline

```ts
async run(
  session: BehavioralSession,
  plan: SessionPlan,
  calibrationProfile: BehaviorCalibrationProfile | null,
): Promise<BehaviorScorecardData>
```

**Repository inject:** `QuestionProbeRepository`, `BehavioralStageLogRepository`.

**Bước 1:** Collect tất cả `ProbeRunSummary` từ `session.stageProgress`.

**Bước 2:** Batch load `QuestionProbe[]` theo `questionProbeId` unique.

**Bước 3:** Batch load `BehavioralStageLog[]` theo `probeId IN (...)` và `behavioralSessionId = session.id`.
→ Group by `probeId`:
  - `candidateAnswerQuotes`: logs có `role = 'USER'` → lấy `content`
  - `followUpReasons`: logs có `turnType IN ['follow_up', 'challenge']` → lấy `followUpTrigger ?? challengeReason`

**Bước 4:** Build `ProbeAuditEntry[]` — merge ProbeRunSummary + QuestionProbe + logs.
Tính `probeScore` per probe. `scoreContribution` = `weight_C / sum(weights)` — điền lại sau bước 7.

**Bước 5:** Chạy consistency check → `ConsistencyCheck`.

**Bước 6:** Tính `ProbeResilienceSummary`.

**Bước 7:** Tính `SessionRiskSummary`.

**Bước 8:** Tính `CommunicationSummary`.

**Bước 9:** Tính `CompetencyScoreEntry[]` (load competencies từ QuestionProbe đã batch ở bước 2).
→ Normalize weights. → Tính `competencyAggregate`.
→ Back-fill `scoreContribution` vào `probeAuditTrail`.

**Bước 10:** Tính `ReadinessSummary`.

**Bước 11:** Build và return `BehaviorScorecardData`.

---

### Files BE cần tạo/sửa

| File | Action | Nội dung |
|---|---|---|
| `server/src/behavior-session/types/session-synthesis.types.ts` | Tạo mới | Toàn bộ types trên |
| `server/src/behavior-session/session-synthesis.service.ts` | Tạo mới | Pipeline 11 bước, inject `QuestionProbeRepository` + `BehavioralStageLogRepository` |
| `server/src/behavior-session/behavior-session.service.ts` | Sửa | Sau `interviewState = 'COMPLETED'`: gọi synthesis sync → persist `finalScore` → `status = 'COMPLETED'` → save → emit SSE |
| `server/src/behavior-session/behavior-session.module.ts` | Sửa | Register `SessionSynthesisService` |

**Không tạo endpoint mới.** `getAllSessionsForInterview` trả `session.finalScore` dưới `sessions.behavioral`. FE phân biệt schema qua `sessions.behavioral?.scorecardVersion`.

---

## FE — Scorecard UI mới

### Nguyên tắc

- Tối giản: score ring → competency bars → probe accordion. Không radar chart ở F033.
- Probe là đơn vị chính: header hiện band, expand mới thấy signal detail.
- `improvementSuggestions` trong accordion được label là "Nhận xét" — dữ liệu audit từ scoring engine, không phải coaching.
- `ScorecardDisplay` cũ giữ nguyên cho combat/legacy. Phân biệt bằng `scorecardVersion`.

### Layout — Full page (ScoringPage + BehaviorScorecardDisplay)

Tab bar session type thuộc `ScoringPage.jsx` (sticky top, đã có sẵn). `BehaviorScorecardDisplay` là nội dung bên dưới tab bar.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← sticky top (ScoringPage)
  Behavioral  |  Live Coding  |  ...    ← session type tabs, gạch dưới tab active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                         ↓ BehaviorScorecardDisplay (scroll)

┌─────────────────────────────────────┐
│  Senior Backend Engineer            │  ← meta: targetRole · targetLevel · ngày
│  20/05/2026  ·  45 phút  ·  6 stage │
│                                     │
│     ╭──────────╮                    │
│     │    74    │  Gần đạt chuẩn     │  ← score ring (to be centered)
│     │   /100   │  ████████░░░░      │     + readiness band badge
│     ╰──────────╯                    │
│                                     │
│  6 câu hỏi  ·  4/6 stage  ·  42 ph │  ← stats strip nhỏ (probe count, stages done, time)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  PHẨM CHẤT ĐÁNH GIÁ                │  ← Competency bars
│  Ownership        ████████░░  78   │
│  Collaboration    ██████░░░░  62   │
│  Communication    ████████░░  84   │
│  Handling Ambiguity ██████░░░  64  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  CHI TIẾT TỪNG CÂU HỎI             │  ← Probe list, grouped by stage
│                                     │
│  ── Culture Fit & Alignment ──      │  ← stage header (nhỏ, slate-500)
│  ┌──────────────────────────────┐  │
│  │ Bạn thích môi trường...  [Tốt ▼]│  ← closed: title + band badge + chevron
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Kể về lần xử lý conflict  [Ổn ▼]│
│  │  ▼ (expanded)                │  │  ← open probe
│  │  "Lúc đó team tôi đang..."   │  │    candidate answer quote (1-2 dòng)
│  │  ─────────────────────────   │  │
│  │  ✓ Mô tả tình huống cụ thể  │  │    signal list
│  │  ~ Vai trò cá nhân           │  │
│  │  ✗ Kết quả đo được           │  │
│  │  ⚠ Blame shifting detected   │  │    red flag
│  │  ─────────────────────────   │  │
│  │  Nhận xét:                   │  │    improvement notes (label rõ, không phải coaching)
│  │  · Thêm metric cụ thể        │  │
│  │  · Nêu rõ quyết định của bạn │  │
│  └──────────────────────────────┘  │
│                                     │
│  ── Tech Stack Deep-Dive ──         │  ← stage tiếp theo
│  ┌──────────────────────────────┐  │
│  │ Redis eviction policy... [Tốt ▼]│
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ [Fallback] NestJS DI...  [Cần cải thiện ▼] │  ← fallback badge
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Home]              [Luyện lại]   │  ← actions
└─────────────────────────────────────┘
```

**Điểm khác so với layout cũ:**
- Tab bar session type ở trên cùng (sticky, từ `ScoringPage`) — mở rộng được cho Behavioral / Live Coding / System Design
- Meta strip: role, level, ngày, thời lượng — user biết đây là kết quả của buổi nào
- Stats strip: số probe, số stage hoàn thành, thời gian thực — cảm giác "buổi phỏng vấn thật"
- Probe **grouped by stage** với stage header — thay vì flat list; dễ đọc hơn khi có 6 stage
- Candidate answer quote ngắn hiện trong accordion — audit trail user có thể thấy
- Fallback badge rõ ràng

### Band display config

```js
const READINESS_BAND_CONFIG = {
  ready:          { label: 'Sẵn sàng phỏng vấn', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  almost_ready:   { label: 'Gần đạt chuẩn',       color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/40' },
  needs_practice: { label: 'Cần luyện thêm',       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/40' },
  not_ready:      { label: 'Chưa đạt',             color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
}

const PROBE_BAND_CONFIG = {
  strong:                { label: 'Tốt',            color: 'text-emerald-400' },
  solid:                 { label: 'Ổn',             color: 'text-cyan-400' },
  needs_work:            { label: 'Cần cải thiện',  color: 'text-amber-400' },
  insufficient_evidence: { label: 'Thiếu evidence', color: 'text-red-400' },
}
```

### `BehaviorProbeAccordion` — behavior

- Default: closed. Click header → toggle.
- Animation: CSS `transition: max-height 0.25s ease, opacity 0.2s ease`; không dùng thư viện.
- **Header:** `[title (truncate 80 chars)]` — `[band badge]` — `[chevron]`
- **Body khi mở:**
  - `summary` (1–2 dòng, font nhỏ, màu slate)
  - Signal list: `✓` / `~` / `✗` + label + evidenceQuote nếu có (italic, truncated)
  - Red flags: chỉ hiện nếu `present === true` → `⚠ [label]` + quote
  - "Nhận xét" (không phải "Gợi ý coaching"): bulleted `improvementSuggestions`
  - Badge stage + badge "Fallback" nếu `isFallback === true`

### Files FE cần tạo/sửa

| File | Action | Nội dung |
|---|---|---|
| `client/apps/web/src/components/scoring/BehaviorScorecardDisplay.jsx` | Tạo mới | Component chính nhận `scorecard: BehaviorScorecardData` |
| `client/apps/web/src/components/scoring/BehaviorProbeAccordion.jsx` | Tạo mới | Accordion per probe với CSS transition |
| `client/apps/web/src/components/scoring/BehaviorCompetencyBar.jsx` | Tạo mới | Competency score bar atom |
| `client/apps/web/src/components/scoring/ScoringPage.jsx` | Sửa | Phân biệt schema cũ/mới, render đúng component |

Không tạo api file mới — `getAllSessionsForInterview` đã có, trả đúng data.

### `ScoringPage.jsx` — thay đổi

```jsx
// sessions.behavioral = session.finalScore content
const behavioralScore = currentSessionData  // khi selectedSessionType === 'behavioral'

{selectedSessionType === 'behavioral'
  ? behavioralScore?.scorecardVersion === '1.0'
    ? <BehaviorScorecardDisplay scorecard={behavioralScore} />
    : <ScorecardDisplay scoreData={behavioralScore} isCombat={mode === 'combat'} />
  : /* liveCoding, systemDesign tabs giữ nguyên */
}
```

`scorecardVersion === '1.0'` là sentinel phân biệt schema mới vs cũ. `sessions.behavioral` là `finalScore` content trực tiếp, không phải session wrapper — kiểm tra `scorecardVersion` ở top level là đúng.

---

## Sequence flow đầy đủ

```
submitAnswer (last turn của probe cuối)
  → interviewState = 'COMPLETED', status = 'SCORING'
  → load plan từ DB
  → SessionSynthesisService.run(session, plan, calibrationProfile)
      Bước 1: collect ProbeRunSummary[]
      Bước 2: batch load QuestionProbe[]
      Bước 3: batch load BehavioralStageLog[] → candidateAnswerQuotes, followUpReasons
      Bước 4: build ProbeAuditEntry[]
      Bước 5: consistency check
      Bước 6: probe resilience
      Bước 7: risk summary
      Bước 8: communication summary
      Bước 9: competency scores + competencyAggregate
      Bước 10: readiness score
      Bước 11: return BehaviorScorecardData
  → session.finalScore = scorecardData
  → session.status = 'COMPLETED'
  → session.completedAt = now()
  → save session
  → emit SSE { state: 'COMPLETED' }

FE nhận SSE COMPLETED
  → navigate to ScoringPage
  → getAllSessionsForInterview(interviewSessionId)
      → sessions.behavioral = BehaviorScorecardData { scorecardVersion: '1.0', ... }
  → render BehaviorScorecardDisplay
```

---

## Những gì F033 KHÔNG làm

- Không gọi LLM — toàn bộ deterministic
- Không generate coaching text / rewrite / practice plan — đó là F034 (Stage 6)
- Không update BehaviorProgressProfile — đó là F035 (Stage 7)
- Không implement `level_depth_fit` đầy đủ — deferred sang F034
- Không break combat/legacy — `ScorecardDisplay` giữ nguyên, sentinel `scorecardVersion` bảo vệ
- Không tạo endpoint API mới — dùng `getAllSessionsForInterview`
- Không có 202/polling — synthesis sync xong trước SSE

---

## Definition of done

**BE:**
- [ ] `SessionSynthesisService.run()` chạy đúng pipeline 11 bước trên mock `stageProgress` với các edge case: probe không có signal, stage skipped, không có probe bị challenge, `cvClaimResults` rỗng
- [ ] Readiness formula: max 100 khi `riskPenalty = 0` và tất cả probes `strong`; không bao giờ xuống dưới 0
- [ ] Resilience: `resilienceScore = 0.5` khi không có probe nào bị challenge
- [ ] `cvClaimNotVerifiedCount` tồn tại trong schema nhưng không ảnh hưởng `riskPenalty`
- [ ] Consistency check tạo đúng flags cho: stage skipped, no_story probe, high_risk_low_signal pattern
- [ ] `competencyAggregate` dùng normalized weighted avg (sum(score × weight) / sum(weight))
- [ ] `session.finalScore` có `scorecardVersion: '1.0'` sau synthesis
- [ ] `session.status = 'COMPLETED'` TRƯỚC KHI emit SSE
- [ ] Không ảnh hưởng `sessionMode: 'legacy'` sessions

**FE:**
- [ ] `BehaviorScorecardDisplay` render đúng score ring + readiness band
- [ ] Competency bars đúng label, score, màu theo band
- [ ] Probe accordion: đóng mặc định, toggle animation CSS (không flicker)
- [ ] Probe body: signals với icon ✓/~/✗, red flags chỉ hiện khi `present === true`, "Nhận xét" (không phải "Coaching")
- [ ] Fallback probe hiển thị badge
- [ ] `ScoringPage` check `scorecardVersion === '1.0'` → render `BehaviorScorecardDisplay`; else → `ScorecardDisplay` cũ
- [ ] Legacy/combat session không bị ảnh hưởng
