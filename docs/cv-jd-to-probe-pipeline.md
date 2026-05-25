# Pipeline: CV + JD → Probe Selection

Tài liệu này mô tả toàn bộ quá trình hệ thống biến đổi đầu vào là CV và JD thành các probe được chọn cho từng stage của phỏng vấn.

---

## Tổng quan: 3 lớp biến đổi chính

```
CV + JD  →  [Parsing]       →  CvJson + JdJson + FitAssessmentV2
                ↓
             [Calibration]   →  BehaviorCalibrationProfile
                                + CandidateClaim[]
                                + RiskHypothesis[]
                ↓
          [Probe Selection]  →  SessionPlan (StageProbeAllocation[])
```

---

## Lớp 1 — Document Parsing (LLM extraction)

**Service:** `server/src/documents/documents.ai.service.ts`

Từ raw text PDF/DOCX, LLM (Groq `llama-3.3-70b-versatile`) trả về hai struct:

### CvJson
| Field | Mô tả |
|-------|-------|
| `name`, `currentTitle` | Tên và vị trí hiện tại |
| `totalYearsExperience`, `seniority` | Số năm kinh nghiệm, mức senior (`junior \| mid \| senior \| lead \| staff \| manager \| unknown`) |
| `skills[]` | Toàn bộ kỹ năng kỹ thuật |
| `domain[]`, `certifications[]` | Domain và chứng chỉ |
| `experience[]` | Mỗi entry: company, title, responsibilities, achievements, techStack |
| `education[]`, `languages[]` | Học vấn và ngôn ngữ |

### JdJson
| Field | Mô tả |
|-------|-------|
| `role`, `domain`, `seniority` | Vị trí tuyển dụng |
| `required_skills[]`, `nice_to_have_skills[]` | Yêu cầu kỹ năng |
| `key_responsibilities[]` | Trách nhiệm chính |
| `requiredCompetencies: QuestionProbeCompetency[]` | Taxonomy năng lực cố định |

### FitAssessmentV2

Sau khi parse xong, service chạy `assessFitRubric(CvJson, JdJson)` → **`FitAssessmentV2`**: đánh giá mức độ phù hợp CV↔JD, trả về evidence rubric, gaps và risk flags. Đây là đầu vào quan trọng cho bước seeded risk generation.

---

## Lớp 2 — Behavior Calibration (Intermediate representation chính)

**Service:** `server/src/documents/behavior-calibration.service.ts`

Đây là bước tốn kém nhất — chạy qua 5 sub-step (BC-1 → BC-5) và tạo ra ba artifact:

### 2a. BehaviorCalibrationProfile

**Entity:** `server/src/documents/entities/behavior-calibration-profile.entity.ts`

"Bộ hồ sơ ứng viên đã được tiêu hóa" — không chỉ lưu dữ liệu raw mà đã so sánh CV↔JD, infer role family, gán trọng số competency.

| Field | Nguồn | Dùng ở stage |
|-------|-------|--------------|
| `roleFamily` | Inferred từ role + techStack | Hard filter + scoring |
| `targetLevel` | Từ JD seniority | Hard filter + scoring |
| `profileLevel` | Từ CV seniority | So sánh level |
| `levelMismatch` | Khi CV level ≠ JD level | Seeded risks |
| `priorityCompetencies[]` | Từ JD `requiredCompetencies` | Stage 1, 5 scoring |
| `competencyWeights{}` | Weighted map quan trọng | Stage 1, 5 scoring |
| `cvTechStack[]` | Canonicalized từ CV | Stage 2, 3, 4 scoring |
| `jdTechRequirements[]` | Canonicalized từ JD | Stage 2, 3, 4 scoring |
| `evidenceStrictness` | Dựa trên số lượng risks | Pressure profile |
| `previousWeakCompetencies[]` | Từ lịch sử phỏng vấn cũ | Tăng weight cho điểm yếu |
| `userFacingSummary` | Build tổng hợp | Hiển thị cho user |

### 2b. CandidateClaim[]

**Entity:** `server/src/documents/entities/candidate-claim.entity.ts`  
**Nguồn:** LLM mine từ CV text — `BehaviorCalibrationAiService.extractCandidateClaims()`

Mỗi claim đại diện cho một tuyên bố của ứng viên trong CV:

| Field | Mô tả |
|-------|-------|
| `claimType` | `led_team \| owned_feature \| improved_metric \| handled_incident \| cross_functional \| mentored \| conflict \| failure \| domain_experience` |
| `claimText` | Đoạn text gốc trong CV |
| `normalizedClaim` | AI-normalized version |
| `impliedCompetencies[]` | e.g., `['ownership', 'collaboration']` |
| `techContext[]` | Tech liên quan trong claim đó |
| `evidenceHints[]` | Metrics/results cụ thể được đề cập |
| `riskTags[]` | e.g., `'vague_ownership'`, `'no_metric'`, `'generic'` |
| `verificationPriority` | `low \| medium \| high` → ảnh hưởng trực tiếp đến Stage 4 scoring |

### 2c. RiskHypothesis[]

**Entity:** `server/src/documents/entities/risk-hypothesis.entity.ts`

Được tạo từ **hai nguồn khác nhau**:

**Seeded (deterministic):** `_seedRisksFromFitAssessment(FitAssessmentV2)`  
Các risk cố định được extract từ gaps và flags trong FitAssessmentV2 — e.g., `level_mismatch`, `missing_business_impact`, `overstated_ownership`.

**Behavioral (LLM):** `generateBehavioralRisks(CvJson, JdJson, claims)`  
AI phân tích thêm để phát hiện hiring risks từ pattern hành vi trong CV.

Mỗi risk hypothesis gồm:

| Field | Mô tả |
|-------|-------|
| `riskType` | `HiringRiskType` — loại rủi ro |
| `severity` | `low \| medium \| high` |
| `rationale` | Giải thích lý do |
| `relatedCompetencies[]` | Competency liên quan |
| `suggestedProbeFocus[]` | Gợi ý hướng khai thác |
| `source` | `'cv' \| 'jd' \| 'system_inference'` |

---

## Lớp 3 — ProbeSelectionContext (đầu vào duy nhất của probe selector)

**Type:** `server/src/session-planning/types/session-plan.types.ts`

Được build bởi `SessionPlanningService.createPlan()` từ toàn bộ artifact ở Lớp 2:

```typescript
interface ProbeSelectionContext {
  probes: QuestionProbe[];              // Toàn bộ probe bank (pre-filtered)
  depth: 'broad' | 'deep';             // Từ CreateSessionPlanDto

  // Từ BehaviorCalibrationProfile
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
  language: QuestionProbeLanguage;
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Record<string, number>;
  cvTechStack: string[];
  jdTechRequirements: string[];

  // Từ CandidateClaim entities
  candidateClaims: CandidateClaim[];

  // Từ RiskHypothesis entities
  riskHypotheses: RiskHypothesis[];

  // Session metadata
  selectionSeed: string;               // sessionId → deterministic randomness
  recentlyUsedProbeIds: string[];      // Tránh lặp probe từ 3 session gần nhất
}
```

---

## Probe Selection per Stage

**Service:** `server/src/session-planning/probe-selector.service.ts`

Mỗi stage đều chạy qua: **Hard Filter → Score → Select → Fallback**

### Hard Filter (áp dụng cho mọi stage)

Loại bỏ probe không đủ điều kiện:
- Probe phải hỗ trợ stage hiện tại
- `levels` phải include `targetLevel` (hoặc rỗng = universal)
- `roleFamilies` phải include `roleFamily` (hoặc rỗng = universal)
- `status = 'active'`
- Có localized content cho `language`

### Scoring và Selection Strategy theo Stage

| Stage | Tên | Input chính | Scoring function | Strategy |
|-------|-----|------------|-----------------|----------|
| 1 | Culture Fit | `priorityCompetencies`, `competencyWeights`, `riskHypotheses` | `_scoreBehavioralProbe()` | MMR (Max Marginal Relevance) |
| 2 | Tech Stack | `jdTechRequirements`, `cvTechStack` | `_scoreTechnicalProbe()` | Tech coverage buckets |
| 3 | Domain Knowledge | `cvTechStack`, `jdTechStack` | `_scoreDomainProbe()` | Domain theme detection |
| 4 | CV Deep Dive | `candidateClaims` (verificationPriority, techContext) | `_scoreCvProbe()` | Claim coverage |
| 5 | Soft Skills | `riskHypotheses` (override nếu high-risk) | `_scoreBehavioralProbe()` | MMR |
| 6 | Reverse Interview | `roleFamily`, `targetLevel` | `roleLevelFit()` | Simple fit |

### Scoring Weights

```
_scoreBehavioralProbe() [Stage 1, 5]:
  competencyFit × 0.45 + roleLevelFit × 0.35 + riskWeight × 0.20

_scoreTechnicalProbe() [Stage 2]:
  techTagFit × 0.55 + roleLevelFit × 0.30 + difficultyFit × 0.15

_scoreCvProbe() [Stage 4]:
  claimFit × 0.40 + techFit × 0.25 + roleLevelFit × 0.20 + depthFit × 0.15

_scoreDomainProbe() [Stage 3]:
  competencyFit × 0.50 + techEcosystemFit × 0.30 + roleLevelFit × 0.20
```

Probe được dùng gần đây (trong `recentlyUsedProbeIds`) bị trừ `0.3` điểm.

---

## Output: SessionPlan

**Entity:** `server/src/session-planning/entities/session-plan.entity.ts`

Kết quả cuối là `SessionPlan` với `stageAllocations: StageProbeAllocation[]`. Mỗi allocation chứa:

```typescript
interface PlannedProbe {
  questionProbeId: string;
  questionProbeRevision: number;
  plannedOrder: number;
  selectionScore: number;
  selectionReason: string;       // e.g., "Tech: React, TypeScript"
  estimatedMinutes: number;
  isFallbackFor?: string;
  fallbackTrigger?: 'no_relevant_story' | 'story_exhausted' | 'time_overrun' | 'low_evidence_yield';
}
```

---

## Data Flow Diagram

```
CV (PDF/DOCX)                          JD (PDF/DOCX)
      ↓                                       ↓
  Extract text                           Extract text
      ↓                                       ↓
  LLM parse                              LLM parse
      ↓                                       ↓
   CvJson                                  JdJson
      ↓                                       ↓
      └──────────── assessFitRubric() ────────┘
                           ↓
                    FitAssessmentV2
                           ↓
        ┌──────────────────┴────────────────────┐
        ↓                                       ↓
  BC-3: extractCandidateClaims()       BC-4a: _seedRisksFromFitAssessment()
        ↓                                       ↓
  CandidateClaim[]                       SeededRisk[]
        ↓                                       ↓
        └──────────────────┬────────────────────┘
                           ↓
                  BC-4b: generateBehavioralRisks()
                           ↓
                   BehavioralRiskOutput
                           ↓
                  BC-5: _buildProfileData()
                           ↓
               BehaviorCalibrationProfile
               + CandidateClaim[] (persisted)
               + RiskHypothesis[] (persisted)

═══════════════════════════════════════════════

USER tạo session plan:
      ↓
Load BehaviorCalibrationProfile + Claims + Risks
      ↓
Build ProbeSelectionContext
      ↓
ProbeSelectorService.buildStageAllocations()
      ↓
  For each stage 1–6:
    1. _hardFilter()
    2. _scoreProbesForStage()
    3. _selectForStage() [stage-specific strategy]
    4. _selectFallbackRaw()
      ↓
StageProbeAllocation[]
      ↓
_allocateDuration()
      ↓
SessionPlan (saved to DB)
```

---

## File Reference

| File | Vai trò |
|------|---------|
| `server/src/users/entities/user-cv.entity.ts` | Lưu CV upload + CvJson |
| `server/src/users/entities/jd-analysis.entity.ts` | Lưu JD upload + JdJson + FitAssessmentV2 |
| `server/src/documents/documents.service.ts` | Orchestration: parse CV, JD, trigger calibration |
| `server/src/documents/documents.ai.service.ts` | LLM extraction: CvJson, JdJson, FitAssessmentV2 |
| `server/src/documents/behavior-calibration.service.ts` | Build profile: claims + risks + profile |
| `server/src/documents/behavior-calibration.ai.service.ts` | LLM calls cho claim mining + behavioral risks |
| `server/src/documents/entities/behavior-calibration-profile.entity.ts` | **Intermediate chính** |
| `server/src/documents/entities/candidate-claim.entity.ts` | Claims extracted từ CV |
| `server/src/documents/entities/risk-hypothesis.entity.ts` | Hiring risks |
| `server/src/session-planning/session-planning.service.ts` | Build ProbeSelectionContext, tạo SessionPlan |
| `server/src/session-planning/probe-selector.service.ts` | **Probe selection engine** |
| `server/src/session-planning/entities/session-plan.entity.ts` | Output cuối |
| `server/src/session-planning/types/session-plan.types.ts` | ProbeSelectionContext, PlannedProbe types |
| `server/src/question-bank/constants/question-bank-taxonomy.constants.ts` | Probe taxonomy |
