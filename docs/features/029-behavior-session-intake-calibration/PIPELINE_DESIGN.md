# F29 — Pipeline Design: CV/JD → Behavior Calibration

Tài liệu này mô tả thiết kế pipeline xử lý từ CV/JD thô đến behavior calibration artifact cho Stage 1 (Session Planning). Pipeline ưu tiên quality: FA hiển thị cho user trước, BC chạy hoàn toàn background trong cùng worker job — FE không nhận và không hiển thị BC output.

## Nguyên tắc thiết kế

- **FA hiển thị trước:** user thấy fit score và gap ngay khi FA xong, không cần chờ behavior calibration.
- **BC chạy hoàn toàn background:** FE không nhận, không poll, không hiển thị BC output. BC artifact là internal input cho Stage 1 (Session Planning).
- **BC chạy tiếp trong cùng job:** không cần worker riêng, không cần trigger thứ hai.
- **BC luôn có FA input đầy đủ:** BC-3 nhận `fitEvidenceHints` chắc chắn (không phải optional), BC-4b nhận `SeededRisk[]` đầy đủ trước khi gọi LLM.
- **LLM không tính score, không kết luận:** LLM chỉ extract evidence và detect pattern. Score và aggregate là deterministic backend.
- **Dependency một chiều:** `CvJson + JdJson → FA → BC`. Không có nhánh "nếu FA chưa xong thì làm gì".

---

## Schema output theo từng giai đoạn

### Giai đoạn 1 — Parse

| Schema | Nguồn | Mục đích |
|---|---|---|
| `CvJson` | LLM extract từ CV text | Structured facts: skills, experience, seniority, domain |
| `JdJson` | LLM extract từ JD text | Structured facts: role, required skills, responsibilities, seniority |
| `NormalizedJdRequirement[]` | Backend normalize từ `JdJson` (deterministic) | Weighted requirement list cho FA scoring |

`NormalizedJdRequirement` được build deterministic — không dùng LLM:

```ts
interface NormalizedJdRequirement {
  id: string           // "required_skill:javascript", "responsibility:0"
  text: string
  source: 'required_skill' | 'nice_to_have_skill' | 'responsibility' | 'experience' | 'domain'
  priority: 'must_have' | 'nice_to_have' | 'context'
  weightHint: 'high' | 'medium' | 'low'
}
```

### Giai đoạn 2 — Fit Assessment (user-facing)

| Schema | Nguồn | Mục đích |
|---|---|---|
| `FitAssessmentV2` | FA-1 LLM rubric + FA-2 backend score | Evidence per requirement, gaps, risk flags, score breakdown |

`FitAssessmentV2` là output user thấy — fit score, gap breakdown, confidence. Sau khi persist, job status chuyển sang `fit_ready` và FE có thể render kết quả ngay.

FA tách 2 lớp rõ:
- **FA-1 (LLM):** chỉ trả `RubricLlmOutput` — evidence per requirement, gaps, risk flags. Không trả score.
- **FA-2 (backend):** tính `scoreBreakdown` và `finalScore` deterministic từ `requirementSignals`.

### Giai đoạn 3 — Behavior Calibration (internal, cho Stage 1)

| Schema | Nguồn | Mục đích |
|---|---|---|
| `CandidateClaim[]` | BC-3 LLM claim mining | Behavioral claims từ CV: ownership, leadership, impact, conflict, v.v. |
| `SeededRisk[]` | BC-4a backend map từ FA (deterministic) | Risks đã biết từ FA: level mismatch, weak evidence, missing core stack |
| `BehavioralRiskOutput` | BC-4b LLM detect từ claim text | Risks ẩn trong ngôn ngữ CV: overstated ownership, generic writing, missing impact |
| `BehaviorCalibrationProfile` | BC-5 backend aggregate (deterministic) | Contract cho Stage 1: roleFamily, level, priorityCompetencies, weights, evidenceStrictness |

---

## Pipeline chi tiết

```
[Document uploaded]
        │
        ▼
   CV parse → CvJson  (persist UserCv.parsedJson)
   JD parse → JdJson → NormalizedJdRequirement[]  (persist JdAnalysis.parsedJson)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  FA PHASE — user-facing                                   │
│                                                           │
│  FA-1: LLM rubric                                         │
│        input:  NormalizedJdRequirement[], CvJson          │
│        output: RubricLlmOutput (evidence + gaps + flags)  │
│        ↓                                                  │
│  FA-2: backend score (deterministic)                      │
│        input:  RubricLlmOutput, NormalizedJdRequirement[] │
│        output: FitAssessmentV2 (scoreBreakdown, finalScore│
│                scoringVersion, model, createdAt)          │
│        ↓                                                  │
│  persist FitAssessmentV2 → JdAnalysis.fitAssessment       │
│  persist fitScore         → JdAnalysis.fitScore           │
│  update job status → "fit_ready"                          │
│  → FE poll nhận kết quả, render score + gaps              │
└───────────────────────────────────────────────────────────┘
        │
        │  worker tiếp tục (user đã thấy FA rồi)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  BC PHASE — internal, artifact cho Stage 1               │
│                                                           │
│  BC-1: collect inputs từ DB                               │
│        { cvJson, jdJson, fitAssessment, profile,          │
│          sourceCompleteness }                             │
│        ↓                                                  │
│  BC-2: determine calibration path                         │
│        cv_only  → chỉ BC-3, skip BC-4a                   │
│        jd_only  → chỉ JD expectation, skip BC-3          │
│        full     → BC-3 + BC-4a + BC-4b + BC-5            │
│        ↓                                                  │
│  [Chạy song song]                                         │
│  ├── BC-3: LLM claim mining                               │
│  │         input:  CvJson                                 │
│  │                 JdJson (optional context)              │
│  │                 fitEvidenceHints từ FA  ← có sẵn ✓    │
│  │         output: ClaimMiningOutput                      │
│  │                 { claims, unmappedSignals,             │
│  │                   miningConfidence }                   │
│  │                                                        │
│  └── BC-4a: seedRisks(FitAssessmentV2)  ← instant, no LLM│
│             mapping:                                      │
│             gaps[level_mismatch]      → level_mismatch    │
│             gaps[weak_evidence]       → claim_without_evidence│
│             riskFlags[seniority_mismatch] → level_mismatch│
│             riskFlags[missing_core_stack] → weak_technical_depth│
│             riskFlags[ambiguous_timeline] → unclear_scope │
│             output: SeededRisk[]                          │
│                                                           │
│  [sync: cả BC-3 và BC-4a xong]                            │
│        ↓                                                  │
│  BC-4b: LLM behavioral risks                              │
│         input:  ClaimMiningOutput.claims                  │
│                 SeededRisk[]  ← đầy đủ trước khi gọi ✓   │
│                 JdJson (optional)                         │
│         output: BehavioralRiskOutput                      │
│         LLM detect (FA/BC-4a không làm được):            │
│         - overstated_ownership                            │
│         - generic_answering                               │
│         - weak_conflict_handling                          │
│         - missing_business_impact                         │
│         - poor_tradeoff_reasoning                         │
│         - low_learning_agility                            │
│         - communication_gap                               │
│         LLM KHÔNG tạo lại risk đã có trong SeededRisk[]  │
│        ↓                                                  │
│  BC-5: buildCalibrationProfile (backend, deterministic)   │
│        input:  ClaimMiningOutput, SeededRisk[],           │
│                BehavioralRiskOutput, cvJson, jdJson,      │
│                fitAssessment, profile                     │
│        compute:                                           │
│        1. Merge SeededRisk[] + BehavioralRiskOutput       │
│           → RiskHypothesis[] (với source, probeHints,    │
│              evidenceNeededToReject)                      │
│        2. levelMismatch deterministic:                    │
│           jdJson.minimum_experience_years >               │
│             cvJson.totalYearsExperience                   │
│           OR jdJson.seniority ≠ cvJson.seniority          │
│        3. Map roleFamily + targetLevel → LevelExpectation[]│
│        4. Map previousWeakCompetencies từ profile         │
│        5. priorityCompetencies = intersection(            │
│             JD signals, claim impliedCompetencies)        │
│           → phải dùng QuestionProbeCompetency taxonomy    │
│        6. competencyWeights, evidenceStrictness,          │
│           calibrationNotes, userFacingSummary             │
│        ↓                                                  │
│  persist BehaviorCalibrationProfile                       │
│  persist CandidateClaim[]  (bảng riêng)                  │
│  persist RiskHypothesis[]  (bảng riêng)                  │
│  update BehaviorCalibrationProfile.status → "ready"       │
│  (internal only — FE không đọc, Stage 1 đọc khi cần)    │
└───────────────────────────────────────────────────────────┘
```

---

## Tại sao FA-trước giải quyết được vấn đề chất lượng

### `fitEvidenceHints` từ optional trở thành guaranteed input

Trong thiết kế song song (FA || BC-3), `fitEvidenceHints` chỉ là "optional enrichment" vì FA có thể chưa xong khi BC-3 bắt đầu. Với pipeline FA-trước, FA đã persist trước khi BC-3 bắt đầu — BC-3 luôn có pre-extracted evidence snippets từ FA. LLM claim mining không cần đọc lại toàn bộ `CvJson` để tìm đoạn evidence; nó nhận context đã được FA highlight. Kết quả: claim mining có focus hơn, ít hallucination hơn.

### BC-4b nhận `SeededRisk[]` đầy đủ — không cần dedupe heuristic

Trong thiết kế song song, BC-4b chạy sau BC-3 và BC-4a nhưng cần logic "nếu risk này đã có trong seeded thì không tạo lại". Với FA-trước, BC-4a chạy ngay sau FA (deterministic, instant), SeededRisk[] đầy đủ trước khi BC-4b gọi LLM. Prompt có thể list rõ các risk đã seed — LLM tập trung đúng vào behavioral risks thuần túy, không cần heuristic tránh trùng.

### Dependency graph một chiều

```
CvJson + JdJson
    → FitAssessmentV2  (user sees this)
    → CandidateClaim[] (BC-3 với FA hints)
    → SeededRisk[]     (BC-4a từ FA)
    → BehavioralRiskOutput (BC-4b với đủ seeded list)
    → BehaviorCalibrationProfile (BC-5 aggregate)
```

Không còn nhánh conditional "nếu FA có thì dùng, nếu không thì bỏ qua". Code BC đơn giản hơn, không cần xử lý trường hợp FA chưa xong.

---

## Job status machine

Job status chỉ phản ánh trạng thái FA — BC không cập nhật job status vì FE không cần biết:

```ts
// DocumentJob status — FE poll cái này
type DocumentJobStatus =
  | 'queued'
  | 'parsing'
  | 'parse_failed'
  | 'fit_ready'      // FA done → FE hiển thị score/gaps, job coi như xong với FE
  | 'fit_failed'     // FA failed → FE hiển thị error

// BehaviorCalibrationProfile.status — internal, Stage 1 đọc
type CalibrationStatus =
  | 'partial'        // chỉ có CV hoặc chỉ có JD
  | 'ready'          // BC done đầy đủ
  | 'failed'         // BC failed — Stage 1 cần handle gracefully
```

`fit_failed` không block BC hoàn toàn. BC-2 xác định path:
- Nếu FA failed nhưng có CV: chạy `cv_only` — SeededRisk[] rỗng, không có `fitEvidenceHints`.
- Nếu FA failed và không có CV: skip BC hoàn toàn.

---

## FE hiển thị theo status

FE chỉ quan tâm đến FA status. BC chạy background — FE không hiển thị tiến độ hay kết quả BC.

| Status | FE render |
|---|---|
| `parsing` | Loading spinner |
| `fit_ready` | Fit score, gap breakdown (4 nhóm), confidence badge, strengths/improvements |
| `fit_failed` | Error state, retry path |

---

## Phân tách trách nhiệm LLM vs Backend

| Bước | Ai làm | Làm gì |
|---|---|---|
| FA-1 | LLM | Evidence per requirement, gaps, risk flags — không tính score |
| FA-2 | Backend | `scoreBreakdown` + `finalScore` deterministic từ `requirementSignals` |
| BC-3 | LLM | Mine behavioral claims từ CV language — không verify, không kết luận |
| BC-4a | Backend | Map FA gaps/riskFlags → SeededRisk[] deterministic — không gọi LLM |
| BC-4b | LLM | Detect behavioral risk patterns trong claim text — không tạo lại seeded risks |
| BC-5 | Backend | Aggregate, dedupe, build profile deterministic — không gọi LLM |

LLM không bao giờ tính score, không bao giờ kết luận pass/fail, không bao giờ thêm claim không có trong CV/JD.

---

## Dependency schema sang Stage 1

Stage 1 (Session Planning) đọc từ DB:

```ts
// Input Stage 1 nhận từ F29 output
interface Stage1Input {
  calibrationProfile: BehaviorCalibrationProfile
    // roleFamily, targetLevel, priorityCompetencies,
    // competencyWeights, evidenceStrictness, levelMismatch

  candidateClaims: CandidateClaim[]
    // claimType, impliedCompetencies, verificationPriority,
    // evidenceHints — để planner chọn probe kiểm chứng đúng claim

  riskHypotheses: RiskHypothesis[]
    // riskType, severity, status: 'open',
    // relatedCompetencies, suggestedProbeFocus
    // — để planner ưu tiên probe theo risk
}
```

Stage 1 không nhận raw CV text hay raw JD text. Tất cả đã được normalize và có taxonomy rõ.
