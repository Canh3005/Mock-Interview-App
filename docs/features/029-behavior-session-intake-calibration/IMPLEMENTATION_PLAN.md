# Implementation Plan - Feature 029 Behavior Session Intake Calibration

## Mục Tiêu

Plan này gom 2 dòng việc phải làm cùng nhau:

1. Harden luồng CV/JD assessment hiện tại theo các P0/P1 đã audit, để dự án không xây Stage 0 trên một nền tảng dữ liệu mong manh.
2. Implement nội dung trong `BA.md`: biến kết quả CV/JD assessment thành behavior calibration artifact gồm `CandidateClaim[]`, `RiskHypothesis[]`, priority competencies và `CalibrationProfile` để Behavior Session Stage 1 có input đáng tin.

Nguyên tắc: không tạo intake wizard mới. User vẫn upload CV/JD ở Skill Passport/Context Injection. Backend mở rộng pipeline hiện tại, frontend chỉ thêm state/summary cần thiết.

## Baseline Hiện Tại Cần Giữ

- Endpoint upload hiện có: `POST /documents/upload`.
- Queue hiện có: `DOCUMENT_PARSING_QUEUE`, worker `DocumentWorker`.
- Entity hiện có: `UserCv`, `JdAnalysis`, `UserProfile`.
- UI hiện có: `DocumentUploadZone`, `AssessmentHistory`, `SkillPassportPage`.
- Interview setup hiện đọc `cv_context:{userId}` và `jd_context:{userId}` từ Redis.

Không được làm hỏng:

- Upload CV/JD PDF/DOCX.
- Parse CV/JD cơ bản.
- Fit score/gap analysis user-facing, nhưng backend implementation được thay bằng V2 trong feature này.
- Assessment history.
- Interview setup đang yêu cầu CV/JD context.

## Target Architecture

### Source Of Truth

Postgres là source of truth. Redis chỉ là cache và có thể mất bất kỳ lúc nào.

- `UserCv.parsedJson` giữ CV structured facts mới nhất.
- `JdAnalysis.parsedJson` giữ JD structured facts.
- `JdAnalysis.fitAssessment` là source of truth cho CV/JD fit assessment.
- `JdAnalysis.fitScore` là projection số từ `fitAssessment.finalScore`, không còn là kết quả LLM tự chấm.
- `JdAnalysis.matchReport` nếu còn tồn tại trong migration chỉ là legacy read adapter sinh từ `fitAssessment.gaps`, không được có logic chấm riêng.
- Thêm artifact behavior calibration persist trong DB.
- Redis context được rehydrate từ DB khi thiếu cache.
- Interview session snapshot phải lấy từ DB-backed context đã validate, không phụ thuộc Redis TTL.

### Replacement Policy

Feature này ưu tiên thay thế clean thay vì giữ song song code cũ. Khi V2 được implement:

- Xóa hoặc đổi hẳn `DocumentsAiService.assessFitScore()` cũ thành `assessFitRubric()`.
- Không giữ prompt một-score như fallback mặc định.
- Không tạo service path thứ hai cho old fit assessment.
- UI/API có thể giữ tên field `fitScore` trong một thời gian vì đó là product concept đang hiển thị, nhưng giá trị phải được sinh từ V2.
- Field/response legacy như `matchReport.missing_skills` chỉ được phép là adapter read-only từ taxonomy mới để tránh phá màn hình cũ trong lúc migrate UI.
- Sau khi UI đã đọc trực tiếp `fitAssessment`, tạo cleanup task để bỏ adapter/field legacy khỏi response và DB nếu không còn cần.

### Processing Flow Mới

1. User upload file.
2. API validate auth, size, mime/extension, tạo upload record/job, trả `jobId` nhanh.
3. Worker extract text, validate content, parse CV/JD, persist DB.
4. Worker cập nhật Redis cache nếu thành công.
5. Nếu có đủ CV và JD, worker chạy fit assessment bằng rubric mới.
6. Worker chạy behavior calibration builder:
   - Mine candidate claims từ CV/profile.
   - Map JD behavior expectations.
   - Tạo risk hypotheses đang mở.
   - Tạo calibration profile và user-facing summary.
7. FE poll job status và hiển thị kết quả theo state rõ ràng.
8. Interview preflight/init đọc context từ DB service, Redis là optimization.

## Data Model Đề Xuất

### Update Existing Entities

`UserCv`

- Thêm `processingStatus`: `processing | completed | failed`.
- Thêm `parseError`: nullable text.
- Thêm `parsedTextHash`: nullable string, để audit/dedupe mà không lưu raw text.
- Thêm `deletedAt` nếu cần soft delete sau này.

`JdAnalysis`

- Thêm `processingStatus`: `processing | completed | failed`.
- Thêm `parseError`: nullable text.
- Thêm `assessmentStatus`: `not_ready | completed | failed`.
- Thêm `assessmentError`: nullable text.
- Thêm `cvId`: nullable FK tới `UserCv`, để biết fit score được chấm với CV nào.
- Thêm `scoringVersion`: string.
- Thêm `fitAssessment`: jsonb nullable, chứa rubric chi tiết.

Note: các status trên nếu codebase đã có enum tương đương thì tái sử dụng enum hiện có. Nếu chưa có, tạo enum mới thay vì hardcode string literal rải rác trong service/controller/FE.

### New Entity: `BehaviorCalibrationProfile`

Bảng/entity để lưu Stage 0 output.

Fields:

- `id`
- `userId`
- `cvId` nullable
- `jdAnalysisId` nullable
- `status`: `partial | ready | failed`
- `sourceCompleteness`: `{ hasCv, hasJd, hasProfile, hasWeaknessHistory }`
- `roleFamily`
- `targetRole`
- `targetLevel`
- `profileLevel`
- `levelMismatch`: boolean
- `priorityCompetencies`: array/jsonb
- `competencyWeights`: jsonb
- `evidenceStrictness`: `low | medium | high`
- `calibrationNotes`: string[]
- `cvTechStack`: string[] — canonicalized skills từ `CvJson.skills`, dùng canonical key của `QUESTION_BANK_TAXONOMY.techTagGroups`. Empty array nếu không có CV
- `jdTechRequirements`: string[] — canonicalized required skills từ `JdJson.required_skills`. Empty array nếu không có JD
- `userFacingSummary`: jsonb
- `internalVersion`: string
- `createdAt`, `updatedAt`

Không lưu `CandidateClaim` và `RiskHypothesis` dạng JSONB array trong profile. Tách thành bảng riêng ngay từ đầu để Stage 1 query/rerank theo từng claim/risk, dễ audit nguồn evidence, dễ deactivate claim cũ khi CV/JD thay đổi và không phải migrate lớn khi cần analytics.

### New Entity: `CandidateClaim`

Claim được mine từ CV/JD/profile. Đây là **calibration snapshot** — mô tả CV/JD có những claim hành vi gì. Immutable sau khi Stage 0 tạo ra; không bao giờ bị session ghi đè. Kết quả verify từng session được lưu riêng ở `SessionClaimOutcome`.

Fields:

- `id`
- `userId`
- `calibrationProfileId`
- `cvId` nullable
- `jdAnalysisId` nullable
- `sourceType`: `cv | jd | profile | history`
- `sourceRef`: jsonb, ví dụ `{ section, itemIndex, textHash }`
- `claimType`: enum, ví dụ `ownership | leadership | impact | collaboration | conflict | incident | mentoring | ambiguity | technical_depth | domain_experience`
- `claimText`
- `normalizedClaim`
- `impliedCompetencies`: string[]
- `verificationPriority`: `low | medium | high` — priority từ Stage 0 dựa trên claim type và risk tags, không thay đổi theo session
- `techContext`: string[] — canonical tech tags liên quan đến câu chuyện cụ thể trong claim này (ví dụ claim "improved_metric" về DB perf → `['postgresql', 'indexing']`). LLM extract trong BC-3 cùng lúc mine claim. Empty array nếu claim không có tech context cụ thể
- `evidenceHints`: string[]
- `riskTags`: string[]
- `createdAt`, `updatedAt`

Không có `verificationStatus` trên entity này. Status theo session được track ở `SessionClaimOutcome`.

### New Entity: `RiskHypothesis`

Risk hypothesis là **calibration snapshot** — mô tả rủi ro tuyển dụng cần kiểm chứng, được tạo từ CV/JD/FA. Immutable sau khi Stage 0 tạo ra; không bao giờ bị session ghi đè. Kết quả probe từng session được lưu riêng ở `SessionRiskOutcome`.

Fields:

- `id`
- `userId`
- `calibrationProfileId`
- `candidateClaimId` nullable
- `riskType`: enum, ví dụ `overstated_ownership | missing_business_impact | weak_conflict_handling | weak_technical_depth | generic_answering | level_mismatch | claim_without_evidence | unclear_scope`
- `severity`: `low | medium | high` — severity từ Stage 0, không thay đổi theo session
- `rationale`
- `relatedCompetencies`: string[]
- `suggestedProbeFocus`: string[]
- `sourceRefs`: jsonb
- `createdAt`, `updatedAt`

Không có `status` trên entity này. Status theo session được track ở `SessionRiskOutcome`.

### New Entity: `SessionClaimOutcome`

Kết quả verify một claim trong một session cụ thể. Được tạo bởi Stage 3 runtime khi probe targeting claim đó chạy, và được finalize bởi Stage 5 synthesis.

**Mục đích:** phục vụ Stage 6 coaching ("claim này được verify tốt hay thiếu evidence") và Stage 7 progress tracking ("xu hướng verify claim theo thời gian"). Trong interview mode, Stage 1 không đọc entity này để chọn probe — mỗi session luôn probe toàn bộ claims từ calibration.

Fields:

- `id`
- `sessionId`
- `claimId`
- `userId`
- `status`: `probed | supported | contradicted | insufficient_evidence`
- `evidenceQuote`: string nullable — trích dẫn ngắn từ transcript
- `turnId`: string nullable — turn nào trong session tạo ra outcome này
- `createdAt`, `updatedAt`

### New Entity: `SessionRiskOutcome`

Kết quả probe một risk trong một session cụ thể. Được tạo bởi Stage 3 runtime và finalize bởi Stage 5 synthesis.

**Mục đích:** phục vụ Stage 6 coaching ("risk này đã được confirm hay dismiss với evidence nào") và Stage 7 progress tracking ("risk nào recurring qua nhiều session"). Trong interview mode, Stage 1 không đọc entity này — mọi risk đều được xét bình đẳng theo severity gốc từ calibration.

Fields:

- `id`
- `sessionId`
- `riskId`
- `userId`
- `status`: `probed | confirmed | dismissed | reduced`
- `evidenceQuote`: string nullable
- `turnId`: string nullable
- `createdAt`, `updatedAt`

### Types

Define TypeScript types riêng, không để `any` lan rộng:

- `CandidateClaim`
- `CandidateClaimSource`
- `CandidateClaimType`
- `ClaimVerificationPriority`
- `RiskHypothesis`
- `RiskHypothesisType`
- `SessionClaimOutcome`
- `SessionClaimOutcomeStatus`
- `SessionRiskOutcome`
- `SessionRiskOutcomeStatus`
- `BehaviorCalibrationSummary`
- `BehaviorCalibrationProfileJson`
- `FitAssessmentV2`

Competency phải map về taxonomy hiện có trong question-bank/behavior domain. Nếu không map được thì dùng `unmappedSignals`, không tạo vocabulary song song.

## P0 Work Packages

### P0.1 - PII Và Document Safety

Backend:

- Xóa `console.log('Extracted text:', extractedText)` trong `DocumentsService`.
- Không đưa raw `extractedText` vào BullMQ job data nếu không cần. Nếu cần truyền giữa request và worker thì ưu tiên lưu file path + checksum, worker tự extract.
- Log theo `userId`, `recordId`, `jobId`, `documentType`, `textLength`, `hash`, không log raw CV/JD.
- Thêm upload retention policy:
  - Sau parse thành công có thể xóa file local nếu không cần download lại.
  - Nếu giữ file thì lưu ngoài public path và có cleanup job.
- Chuẩn hóa error message để không leak nội dung file.

Acceptance:

- Log không chứa raw CV/JD.
- Job payload không chứa full text PII.
- File upload có cleanup/retention rõ.

### P0.2 - DB Source Of Truth Và Redis Fallback

Backend:

- Tạo service `DocumentContextService`:
  - `getLatestCvContext(userId)`
  - `getLatestJdContext(userId)`
  - `getInterviewContext(userId)`
  - `refreshRedisContext(userId)`
- Service đọc Redis trước, nếu miss thì đọc DB, validate schema, rehydrate Redis.
- Sửa `InterviewService.preflight()` và `initSession()` dùng `DocumentContextService`, không đọc Redis trực tiếp.
- Khi `updateContext()` được user confirm trước interview:
  - Ghi Redis.
  - Persist vào DB dưới dạng context override/snapshot hoặc update current parsed context có version.
  - Cần audit `updatedByUser: true`.
- Redis key có TTL thống nhất, nhưng session init không fail chỉ vì TTL hết.

Acceptance:

- User đã upload CV/JD trước đó vẫn start interview được sau khi Redis bị flush.
- Preflight trả đúng missing source nếu DB cũng thiếu.
- Session snapshot được lấy từ context đã persist.

### P0.3 - Fit Assessment Rubric V2

Mục tiêu của P0.3 là đổi fit assessment từ "LLM tự cho một số %" sang mô hình 2 lớp:

1. LLM chỉ đọc CV/JD và trả structured evidence theo rubric cố định.
2. Backend validate schema, normalize dữ liệu, tính score cuối bằng rule deterministic và lưu breakdown để UI/history giải thích được.

Fit score vẫn là chỉ số "CV/JD match", không phải behavior readiness. Behavior calibration có thể dùng fit/gap làm input phụ, nhưng không được biến fit thấp thành kết luận candidate yếu behavior.

#### Backend Contract

Tạo type `FitAssessmentV2` và lưu vào `JdAnalysis.fitAssessment` dạng JSONB. V2 thay thế luồng cũ:

- `JdAnalysis.fitAssessment`: full rubric/breakdown, là source of truth.
- `JdAnalysis.fitScore`: số 0-100 được copy từ `fitAssessment.finalScore` để query/sort/render nhanh, không phải output trực tiếp từ LLM.
- `JdAnalysis.matchReport`: chỉ giữ nếu cần migration UI, và phải được build từ `fitAssessment.gaps`. Không còn prompt hoặc parser riêng cho shape cũ.
- `JdAnalysis.scoringVersion`: ví dụ `fit-assessment-v2.0.0`.
- `JdAnalysis.assessmentStatus`: `not_ready | completed | failed`.
- `JdAnalysis.assessmentError`: nullable.
- `JdAnalysis.cvId`: CV dùng để chấm JD đó.

Schema đề xuất:

```ts
type CoverageStatus = 'met' | 'partial' | 'missing' | 'unclear';
type EvidenceStrength = 'strong' | 'weak' | 'none';
type ConfidenceLevel = 'high' | 'medium' | 'low';
type GapCategory =
  | 'missing_required_skill'
  | 'weak_evidence'
  | 'level_mismatch'
  | 'transferable_not_direct';

interface FitRequirementSignal {
  requirementId: string;   // tham chiếu NormalizedJdRequirement.id, e.g. "required_skill:javascript"
  source: 'required_skill' | 'nice_to_have_skill' | 'responsibility' | 'experience' | 'domain';
  status: CoverageStatus;
  evidenceStrength: EvidenceStrength;
  cvEvidence: string[];
  rationale: string;
}

interface FitGap {
  category: GapCategory;
  label: string;
  severity: 'high' | 'medium' | 'low';
  relatedRequirement: string;
  explanation: string;
  practiceSuggestion?: string;
}

interface FitScoreBreakdown {
  mustHaveSkillCoverage: number;      // 0-100
  niceToHaveCoverage: number;         // 0-100
  experienceLevelFit: number;         // 0-100
  roleResponsibilityFit: number;      // 0-100
  domainFit: number;                  // 0-100
  evidenceQuality: number;            // 0-100
  transferableExperience: number;     // 0-100
  riskPenalty: number;                // 0-30
}

interface FitAssessmentV2 {
  scoringVersion: 'fit-assessment-v2.0.0';
  model: string;
  createdAt: string;
  confidence: ConfidenceLevel;
  requirementSignals: FitRequirementSignal[];
  gaps: FitGap[];
  riskFlags: Array<{
    code: 'insufficient_cv_detail' | 'seniority_mismatch' | 'missing_core_stack' | 'domain_gap' | 'ambiguous_timeline';
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  scoreBreakdown: FitScoreBreakdown;
  finalScore: number;
  userSummary: {
    headline: string;
    strengths: string[];
    gapsToImprove: string[];
    transferableNotes: string[];
  };
}
```

#### JD Requirement Definition

"Từng yêu cầu trong JD" là danh sách requirement đã được backend normalize từ `JdJson`, không chỉ là skill keyword. V2 nên tạo một danh sách internal trước khi gọi rubric/evaluator:

```ts
interface NormalizedJdRequirement {
  id: string;
  text: string;
  source: 'required_skill' | 'nice_to_have_skill' | 'responsibility' | 'experience' | 'domain';
  priority: 'must_have' | 'nice_to_have' | 'context';
  weightHint: 'high' | 'medium' | 'low';
}
```

Mapping mặc định:

- `required_skill`: mỗi item trong `jdJson.required_skills`. Đây là must-have, ảnh hưởng mạnh nhất tới `mustHaveSkillCoverage`.
- `nice_to_have_skill`: mỗi item trong `jdJson.nice_to_have_skills`. Đây là optional/bonus, không được làm tụt score quá mạnh nếu thiếu.
- `responsibility`: mỗi item trong `jdJson.key_responsibilities`. Ví dụ "own end-to-end frontend features", "collaborate with product/design", "mentor junior engineers".
- `experience`: yêu cầu năm kinh nghiệm, seniority hoặc scope role. Ví dụ `minimum_experience_years=5`, role có chữ `Senior`, `Lead`, `Staff`, hoặc responsibility yêu cầu ownership/mentoring/architecture.
- `domain`: domain/product/industry nếu JD thể hiện rõ. Ví dụ fintech, healthcare, B2B SaaS, e-commerce, high-scale realtime system. Nếu JD không có domain rõ thì bỏ qua hoặc để weight thấp.

Ví dụ với JD:

```json
{
  "role": "Senior Frontend Engineer",
  "required_skills": ["React", "TypeScript", "GraphQL"],
  "nice_to_have_skills": ["Kafka", "AWS"],
  "minimum_experience_years": 5,
  "key_responsibilities": [
    "Own end-to-end frontend features",
    "Collaborate with Product and Design",
    "Mentor junior engineers"
  ]
}
```

Backend normalize thành các requirement để LLM đánh evidence:

- Required skill: React.
- Required skill: TypeScript.
- Required skill: GraphQL.
- Nice-to-have skill: Kafka.
- Nice-to-have skill: AWS.
- Experience/level: 5+ years and senior frontend scope.
- Responsibility: Own end-to-end frontend features.
- Responsibility: Collaborate with Product and Design.
- Responsibility: Mentor junior engineers.

Mỗi requirement sau đó sẽ có một `FitRequirementSignal` tương ứng, link qua `requirementId` (e.g. `"required_skill:react"`). Backend scoring iterate qua `requirementSignals`, lookup `NormalizedJdRequirement` bằng `requirementId` để biết `priority` và `weightHint`, rồi tính `scoreBreakdown` deterministic.

#### Document Parse Pipelines

CV và JD được upload và parse **độc lập** theo 2 flow riêng. Fit assessment chỉ chạy khi đã có đủ cả hai trong DB. Cả hai pipeline đều theo cùng pattern: AI parse → backend validate/coerce → persist, không để raw AI output đi thẳng vào downstream mà không qua guard.

##### CV Parse Pipeline

```
Bước CV-1 — Extract text
  Input:  file buffer (PDF / DOCX)
  Output: rawText: string

Bước CV-2 — Validate là CV
  Input:  rawText: string
  Output: throw DocumentValidationException nếu không phải CV
          (heuristic: có tên + kinh nghiệm/education section, không phải JD/invoice/...)

Bước CV-3 — AI parse: extractCvJson(rawText)
  Input:  rawText: string
  Output: CvJson  ← locked bởi responseSchema, xem schema bên dưới

Bước CV-4 — Backend validate/coerce
  Input:  CvJson (raw từ AI)
  Output: { cvJson: CvJson, parseError?: string, confidence: ConfidenceLevel }
  Persist: UserCv.parsedJson = cvJson
```

Schema `CvJson` — output của `extractCvJson`, locked bởi responseSchema:

```ts
interface CvExperience {
  company: string;
  title: string;
  startDate?: string;       // "2020-01" hoặc "Jan 2020"
  endDate?: string;         // "2023-06" hoặc "present"
  responsibilities: string[];
  achievements?: string[];  // metric, impact, outcome cụ thể — dùng cho evidenceQuality
  techStack?: string[];     // skill dùng tại vị trí này
}

interface CvEducation {
  institution: string;
  degree?: string;
  field?: string;
  graduationYear?: number;
}

// Bước CV-3 output / CV-4 input — persist vào UserCv.parsedJson
interface CvJson {
  name?: string;
  currentTitle?: string;
  totalYearsExperience?: number;  // LLM ước tính hoặc tính từ experience dates
  skills: string[];               // flat list, không group theo loại — dùng cho skill matching
  experience: CvExperience[];
  education?: CvEducation[];
  certifications?: string[];
  domain?: string[];              // domain/industry candidate đã làm việc
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff' | 'manager' | 'unknown';
}
```

Backend validate/coerce `CvJson` sau AI:

- Trim string, bỏ item rỗng, dedupe `skills` case-insensitive.
- Apply `canonicalize()` lên từng item trong `skills` và `experience[].techStack` — cùng function với JD (xem quy tắc canonicalize ở JD section).
- Nếu `skills` rỗng nhưng `experience[].techStack` có data → merge techStack thành fallback cho `skills`, đánh `confidence=low`.
- Nếu `totalYearsExperience` null nhưng `experience` có `startDate`/`endDate` → tính heuristic từ tổng khoảng thời gian.
- Clamp `totalYearsExperience` về 0–50.
- Nếu `seniority` null nhưng `currentTitle` có keyword rõ (Senior/Lead/Staff/Principal/VP/Director) → infer heuristic.
- Nếu `experience` rỗng hoàn toàn → đánh `parseError`, không tự bịa experience.
- Prompt của `extractCvJson` phải instruct LLM output tên skill dạng đầy đủ (cùng rule với JD: "JavaScript" không phải "JS").

##### JD Parse And Normalize Pipeline

```
Bước JD-1 — Extract text
  Input:  file buffer (PDF / DOCX)
  Output: rawText: string

Bước JD-2 — Validate là JD
  Input:  rawText: string
  Output: throw DocumentValidationException nếu không phải JD
          (heuristic: có role title + requirement section, không phải CV/invoice/...)

Bước JD-3 — AI parse: extractJdJson(rawText)
  Input:  rawText: string
  Output: JdJson  ← locked bởi responseSchema, xem schema bên dưới

Bước JD-4 — Backend validate/coerce
  Input:  JdJson (raw từ AI)
  Output: { jdJson: JdJson, parseError?: string, confidence: ConfidenceLevel }
  Persist: JdAnalysis.parsedJson = jdJson

Bước JD-5 — buildNormalizedJdRequirements(jdJson)
  Input:  JdJson (đã coerce)
  Output: NormalizedJdRequirement[]  ← xem schema bên dưới
```

Schema `JdJson` — output của `extractJdJson`, locked bởi responseSchema:

```ts
// Bước JD-3 output / JD-4 input
interface JdJson {
  role: string;
  required_skills: string[];
  nice_to_have_skills?: string[];
  minimum_experience_years?: number;
  key_responsibilities: string[];
  domain?: string;
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff' | 'manager' | 'unknown';
}
```

Backend validate/coerce `JdJson` sau AI:

- Trim string, bỏ item rỗng, dedupe case-insensitive.
- System canonical là tech tag key trong `question-bank-taxonomy.constants.ts` (lowercase snake_case: `javascript`, `nodejs`, `postgresql`, `spring_boot`, `kubernetes`, ...). Hàm `canonicalize(skill)` convert display name về tag key: lowercase → bỏ dấu chấm → replace space/gạch ngang thành underscore (e.g., `Node.js` → `nodejs`, `Spring Boot` → `spring_boot`, `GitHub Actions` → `github_actions`). Static alias dictionary chỉ cho alias không canonicalize được tự nhiên: `js` → `javascript`, `ts` → `typescript`, `k8s` → `kubernetes`, `pg` / `postgres` → `postgresql`. Prompt của `extractJdJson` phải instruct LLM output tên đầy đủ để `canonicalize()` ra đúng tag key — không build dictionary thay thế cho prompt instruction.
- Clamp `minimum_experience_years` về 0–30; nếu không rõ thì để `undefined`.
- Nếu AI bỏ sót `role` nhưng text có title rõ, fallback bằng simple heading/title heuristic.
- Nếu `required_skills` rỗng nhưng JD có skill section rõ, đánh `parseError` hoặc `confidence=low`, không tự bịa skill.
- Không đưa benefit, company intro, salary, location, application instruction vào requirement.

##### Fit Assessment Pipeline

Chạy sau khi đã có `CvJson` (từ CV pipeline) và `NormalizedJdRequirement[]` (từ JD pipeline):

```
Bước FA-1 — AI rubric: assessFitRubric(requirements, cvJson)
  Input:  NormalizedJdRequirement[], CvJson (từ UserCv.parsedJson)
  Output: RubricLlmOutput  ← xem schema bên dưới
  LLM không tính score — chỉ trả evidence per requirement + gaps + risk flags

Bước FA-2 — Backend computeFitAssessment(rubricOutput, requirements)
  Input:  RubricLlmOutput, NormalizedJdRequirement[]
  Output: FitAssessmentV2  ← RubricLlmOutput + backend-computed { scoreBreakdown, finalScore, scoringVersion, model, createdAt }
  Persist: JdAnalysis.fitAssessment = FitAssessmentV2
           JdAnalysis.fitScore      = fitAssessment.finalScore  (projection số để query/sort)

Bước FA-3 — Behavior calibration builder  (F29.x)
  Input:  CvJson, JdJson, FitAssessmentV2 (nếu có)
  Output: BehaviorCalibrationProfile + CandidateClaim[] + RiskHypothesis[]
```

Sau đó backend mới normalize requirement deterministic:

```ts
function buildNormalizedJdRequirements(jd: JdJson): NormalizedJdRequirement[] {
  return [
    ...jd.required_skills.map((skill) => ({
      id: `required_skill:${canonicalize(skill)}`,
      text: skill,
      source: 'required_skill',
      priority: 'must_have',
      weightHint: 'high',
    })),
    ...(jd.nice_to_have_skills ?? []).map((skill) => ({
      id: `nice_to_have_skill:${canonicalize(skill)}`,
      text: skill,
      source: 'nice_to_have_skill',
      priority: 'nice_to_have',
      weightHint: 'low',
    })),
    ...jd.key_responsibilities.map((responsibility, index) => ({
      id: `responsibility:${index}`,
      text: responsibility,
      source: 'responsibility',
      priority: 'must_have',
      weightHint: 'medium',
    })),
    ...(jd.minimum_experience_years
      ? [{
          id: 'experience:min_years',
          text: `${jd.minimum_experience_years}+ years experience`,
          source: 'experience',
          priority: 'must_have',
          weightHint: 'medium',
        }]
      : []),
    ...(jd.domain
      ? [{
          id: `domain:${canonicalize(jd.domain)}`,
          text: jd.domain,
          source: 'domain',
          priority: 'context',
          weightHint: 'low',
        }]
      : []),
  ];
}
```

`RubricLlmOutput` là output thực của LLM ở Bước 6 — chỉ chứa evidence, không chứa score:

```ts
// Bước 6 output — output của LLM assessFitRubric, bị lock bởi responseSchema
// LLM KHÔNG trả scoreBreakdown hay finalScore — đó là việc của backend ở Bước 7
interface RubricLlmOutput {
  confidence: ConfidenceLevel;
  requirementSignals: FitRequirementSignal[];   // per-requirement evidence assessment
  gaps: FitGap[];
  riskFlags: Array<{
    code: 'insufficient_cv_detail' | 'seniority_mismatch' | 'missing_core_stack' | 'domain_gap' | 'ambiguous_timeline';
    severity: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
  userSummary: {
    headline: string;
    strengths: string[];
    gapsToImprove: string[];
    transferableNotes: string[];
  };
}
```

Bước 7 backend merge `RubricLlmOutput` với các field backend-computed để tạo `FitAssessmentV2`:

```ts
// FitAssessmentV2 = RubricLlmOutput + backend-computed fields
// Không có field nào trong scoreBreakdown hay finalScore được lấy từ LLM
type FitAssessmentV2 = RubricLlmOutput & {
  scoringVersion: 'fit-assessment-v2.0.0';
  model: string;
  createdAt: string;
  scoreBreakdown: FitScoreBreakdown;   // tính deterministic từ requirementSignals
  finalScore: number;                  // clamp(weighted - riskPenalty, 0, 100)
};
```

Điểm quan trọng: AI parse giúp chuyển raw JD không cấu trúc thành `JdJson`; backend normalize requirement từ `JdJson` bằng rule cố định để fit scoring test được và không phụ thuộc prompt cho weight/score.

**Cần đảm bảo để pipeline hoạt động đúng:**

1. **Caller phải xử lý `confidence=low` / `parseError` trước khi chạy scoring** — không bỏ qua flag. Nếu parse quality thấp, scoring chạy trên input kém chất lượng mà không ai biết. Tối thiểu: log warning + không trigger calibration nếu `parseError=true`.

2. **Prompt của `extractJdJson` phải có few-shot examples** đủ bao phủ edge cases: JD dạng narrative (không bullet), JD tiếng Việt/Nhật mix English term, JD thiếu section required/nice-to-have rõ ràng. Thiếu few-shot thì LLM dễ nhầm required vs nice-to-have hoặc bỏ sót skills lồng trong mô tả trách nhiệm.

3. **Baseline parse quality phải được test trước production** — chạy `extractJdJson` trên tập JD mẫu thực tế (10–20 JDs đa dạng), so sánh output với expectation thủ công. Nếu accuracy thấp ở step này thì toàn bộ downstream calibration không tin được.

#### LLM Responsibility

`DocumentsAiService.assessFitScore()` phải được thay bằng `assessFitRubric()`:

- **Input:** `NormalizedJdRequirement[]` (Bước 5 output) + `CvJson` (từ `UserCv.parsedJson`). Không truyền raw full text.
- **Output:** `RubricLlmOutput` — locked bởi responseSchema, xem schema ở trên.
- LLM **không** trả `scoreBreakdown` hay `finalScore` — hai field này do backend tính ở Bước 7.
- LLM chỉ làm một việc: với mỗi `NormalizedJdRequirement`, tìm evidence trong `CvJson` và trả `FitRequirementSignal` tương ứng.
- Prompt phải yêu cầu LLM phân biệt rõ trong `FitRequirementSignal.status`:
  - `missing` — required skill bị thiếu hoàn toàn, không có evidence.
  - `partial` — skill có nhắc tới nhưng evidence yếu (chỉ keyword, không có project/scope/result).
  - `met` — có evidence rõ ràng với project hoặc responsibility cụ thể.
  - `unclear` — candidate có kinh nghiệm gần tương đương nhưng không trực tiếp, hoặc CV không đủ thông tin để kết luận.

Nếu `RubricLlmOutput` schema invalid hoặc thiếu field quan trọng, backend đánh `assessmentStatus=failed`, giữ `parsedJson` JD, không crash cả job parse JD.

#### Deterministic Scoring

Backend tính `scoreBreakdown` và `finalScore` bằng rule cố định. Ví dụ weight mặc định:

```ts
const weights = {
  mustHaveSkillCoverage: 0.35,
  roleResponsibilityFit: 0.20,
  experienceLevelFit: 0.15,
  evidenceQuality: 0.10,
  niceToHaveCoverage: 0.08,
  domainFit: 0.07,
  transferableExperience: 0.05,
};
```

Cách tính:

- `mustHaveSkillCoverage`: trung bình điểm các `required_skill`; `met=100`, `partial=60`, `unclear=30`, `missing=0`.
- `niceToHaveCoverage`: tương tự nhưng lấy từ `nice_to_have_skill`.
- `roleResponsibilityFit`: coverage trên `key_responsibilities`.
- `experienceLevelFit`: so sánh `minimum_experience_years`, role title/seniority, scope trong CV.
- `domainFit`: mức trùng domain/product/industry nếu JD có tín hiệu domain.
- `evidenceQuality`: evidence CV có dự án, responsibility, impact, metric, scope rõ hay chỉ keyword.
- `transferableExperience`: điểm cộng có kiểm soát cho kinh nghiệm gần tương đương, nhưng không thay thế required skill trực tiếp.
- `riskPenalty`: trừ điểm từ `riskFlags`, ví dụ high=10, medium=5, low=2, cap tối đa 30.

Pseudo-code:

```ts
const weighted =
  breakdown.mustHaveSkillCoverage * 0.35 +
  breakdown.roleResponsibilityFit * 0.20 +
  breakdown.experienceLevelFit * 0.15 +
  breakdown.evidenceQuality * 0.10 +
  breakdown.niceToHaveCoverage * 0.08 +
  breakdown.domainFit * 0.07 +
  breakdown.transferableExperience * 0.05;

const finalScore = clamp(Math.round(weighted - breakdown.riskPenalty), 0, 100);
```

Low confidence không nên tự động làm fail assessment, nhưng nên ảnh hưởng hiển thị:

- `high`: hiển thị bình thường.
- `medium`: hiển thị "analysis may need review" ở detail.
- `low`: vẫn lưu, nhưng UI nên nói CV/JD thiếu thông tin rõ ràng; không dùng làm input mạnh cho calibration.

#### Gap Taxonomy

Không còn chỉ trả `missing_skills`. Backend map thành 4 nhóm:

- `missing_required_skill`: JD yêu cầu bắt buộc nhưng CV không có evidence đủ.
- `weak_evidence`: CV có keyword hoặc claim, nhưng thiếu project/scope/result cụ thể.
- `level_mismatch`: JD yêu cầu seniority/ownership cao hơn hoặc khác scope CV.
- `transferable_not_direct`: CV có kinh nghiệm gần tương đương, có thể luyện cách trình bày chuyển đổi, nhưng chưa phải match trực tiếp.

Nếu UI/API cũ vẫn cần `matchReport` trong giai đoạn migrate, backend chỉ được build adapter từ taxonomy mới:

```ts
matchReport = {
  missing_skills: gaps
    .filter((g) => g.category === 'missing_required_skill')
    .map((g) => g.label),
  suggestions: gaps.map((g) => g.practiceSuggestion ?? g.explanation),
};
```

#### UI Rubric Summary

UI không nên chỉ hiện thanh `%`. Cần thêm detail để user hiểu "miss ở đâu" và luyện gì.

Trong `DocumentUploadZone` sau khi job JD complete:

- Luôn render score nếu `fitScore !== null && fitScore !== undefined`, để score `0` không bị ẩn.
- Dưới score thêm `Fit breakdown` dạng compact:
  - Required skills.
  - Responsibilities.
  - Experience level.
  - Evidence quality.
  - Transferable experience.
- Thêm `What to improve` chia theo 4 nhóm gap:
  - Missing required skills: học/bổ sung skill thật.
  - Weak evidence: chuẩn bị project, metric, impact, STAR evidence.
  - Level mismatch: chuẩn bị câu chuyện ownership/scope/leadership.
  - Transferable experience: luyện cách nối kinh nghiệm tương đương với JD.

Trong `AssessmentHistory` detail:

- Giữ `ScoreBar`.
- Thêm badge `Confidence: high/medium/low`.
- Thêm breakdown mini bars hoặc list score theo rubric.
- Thêm grouped gaps thay vì một list `Missing Skills`.
- Không hiển thị raw prompt, internal weights, hoặc risk code thô.

Copy user-facing đề xuất:

- "Fit score đo mức CV hiện tại khớp với JD này, không phải khả năng behavior interview."
- "Các mục dưới đây cho biết bạn nên bổ sung skill, làm rõ evidence, hoặc chuẩn bị cách giải thích kinh nghiệm tương đương."
- "Weak evidence nghĩa là CV có tín hiệu liên quan nhưng chưa đủ ví dụ cụ thể để người tuyển dụng tin chắc."

#### Acceptance

- Cùng CV/JD cho output có cấu trúc giải thích được, không chỉ một số `%`.
- `fitScore` được tính deterministic và clamp 0-100 server-side.
- `fitScore=0` vẫn hiển thị trên UI.
- Không còn code path/prompt cũ tự chấm một-score.
- `matchReport` nếu còn trả về phải là adapter từ `fitAssessment`, không phải source of truth.
- Backend lưu `fitAssessment`, `scoringVersion`, `model`, `createdAt`, `confidence`.
- Gap analysis phân biệt đủ 4 nhóm: missing required skill, weak evidence, level mismatch, transferable but not direct.
- Fit score không được dùng làm behavior readiness.
- UI cho user biết thiếu gì và luyện gì, nhưng không lộ raw internal risk/prompt/weight.

## P1 Work Packages

### P1.1 - Move Heavy Work Fully To Worker

Backend:

- API upload chỉ làm validation nhẹ và tạo job.
- Worker làm:
  - Extract text.
  - Content validation.
  - AI parse.
  - Fit assessment.
  - Behavior calibration.
- Thêm persistent processing status vào DB, không chỉ dựa vào BullMQ return value.
- Thêm `removeOnComplete`, `removeOnFail`, attempts/backoff hợp lý.
- Thêm concurrency limit cho document worker.

Acceptance:

- Request upload trả nhanh, không bị block bởi PDF parse/AI call.
- User refresh page vẫn xem được status từ DB/history.

### P1.2 - Server-Side File Validation

Backend:

- Thêm server-side mime + extension allowlist cho PDF/DOCX.
- Kiểm tra magic bytes nếu có thể.
- Xử lý file parse fail thành `processingStatus=failed`.
- Dùng `BadRequestException` có message ngắn gọn.

Frontend:

- Giữ client validation hiện có, nhưng coi server là source of truth.

Acceptance:

- File sai type không được xử lý như PDF/DOCX.
- File corrupted trả failed state có retry path.

### P1.3 - Frontend State Và UX Fixes

Frontend:

- Sửa điều kiện hiện JD result: không dùng truthy `fitScore`; score `0` vẫn phải hiện.
- Nếu upload JD khi chưa có CV:
  - Hiện "JD đã xử lý, cần CV để chấm fit score và behavior calibration theo hồ sơ".
- Nếu upload CV khi chưa có JD:
  - Hiện "CV đã xử lý, behavior claims có thể đã tạo một phần, cần JD để calibration đầy đủ".
- Thêm section `Behavior interview focus`:
  - Focus competencies.
  - Evidence to prepare.
  - Missing data.
  - Level mismatch warning nếu có.
- Assessment history có thể hiện badge:
  - `Fit ready`
  - `Calibration ready`
  - `Needs CV`
  - `Needs JD`
  - `Failed`

Acceptance:

- User luôn biết đang thiếu CV hay JD.
- Score 0% không bị ẩn.
- Raw claims/risks nội bộ không hiện cho candidate.

### P1.4 - Production Config Và Observability

Backend:

- Tách config production:
  - `synchronize: false` khi production.
  - CORS đọc từ env.
- Thêm structured logs cho document jobs.
- Thêm metrics/log fields:
  - Job duration.
  - Parse success/failure count.
  - AI latency.
  - Validation reject reason.
  - Calibration status.
- Thêm timeout/retry policy cho Gemini calls.

Acceptance:

- Production không tự sync schema.
- Có đủ log để debug job fail mà không xem PII.

## Feature 029 Work Packages

### F29.1 - Behavior Calibration AI Service

Backend:

- Tạo `BehaviorCalibrationAiService` hoặc mở rộng documents AI theo module riêng.
- Input:
  - Latest CV facts.
  - Latest JD facts.
  - Profile role/seniority/domain.
  - Fit assessment V2 nếu có.
  - Weakness history nếu sẵn có.
- Output schema:
  - Claims.
  - Risk hypotheses.
  - Priority competencies.
  - Evidence strictness.
  - User-facing summary.
  - Calibration notes.
- Prompt guardrails:
  - Claim trong CV là unverified.
  - Không kết luận pass/fail.
  - Không biến fit score thấp thành behavior weakness.
  - Raw risk là internal.
  - Mỗi claim/risk phải có source span/summary.

Acceptance mapping với BA:

- AC claim "led team" tạo leadership/collaboration claim và risk mở.
- AC JD stakeholder management ưu tiên competency liên quan.
- AC fit score thấp không thành behavior verdict.

### F29.2 - Calibration Builder Service

Backend:

- Tạo `BehaviorCalibrationService`:
  - `buildFromCvOnly(userId, cvId)`
  - `buildFromJdOnly(userId, jdAnalysisId)`
  - `buildFromCvAndJd(userId, cvId, jdAnalysisId)`
  - `getLatestForUser(userId)`
- Sau `parseCv()`: build partial calibration từ CV nếu có tín hiệu.
- Sau `parseJd()`: build partial JD expectation, và build ready calibration nếu có latest CV.
- Sau fit assessment: update calibration với gap/fit signals.
- Versioning:
  - `internalVersion = behavior-calibration-v1`.
  - Nếu CV/JD mới hơn, tạo/cập nhật calibration mới.

Acceptance:

- Chỉ có CV: có partial claim map, summary nói thiếu JD.
- Chỉ có JD: có JD expectation, không tạo fake CV claim.
- Có cả hai: status `ready`.

### F29.3 - API Contracts

Backend:

- Thay response nội bộ của `/documents/status/:jobId` sang contract V2:
  - `documentRecordId`
  - `fitScore`
  - `fitAssessment`
  - `fitAssessmentSummary`
  - `calibrationStatus`
  - `behaviorSummary`
  - `missingSources`
- `gapAnalysis` chỉ được giữ như alias tạm thời nếu FE chưa migrate kịp, và phải sinh từ `fitAssessment.gaps`.
- Thay `/documents/history` detail sang V2:
  - Fit assessment summary.
  - Grouped gaps.
  - Score breakdown.
  - Confidence.
  - Calibration status.
  - User-facing behavior summary.
- Thêm endpoint read-only nếu cần:
  - `GET /documents/calibration/latest`
  - Hoặc `GET /behavioral/calibration/latest`

Cần tránh endpoint trả raw internal risks cho candidate UI. Nếu cần cho admin/debug sau này, tạo permission riêng.

Acceptance:

- FE lấy đủ summary mà không cần đọc raw JSON nội bộ.
- FE mới không phụ thuộc `matchReport.missing_skills` hoặc `gapAnalysis` shape cũ.
- Stage 1 sau này có endpoint/service để lấy full internal calibration.

### F29.4 - Behavior Session Integration Boundary

Backend:

- `InterviewService.preflight()` thêm `behaviorCalibration` summary nếu có.
- Session snapshot thêm `behaviorCalibrationSnapshot` cho behavior session sau này.
- Chưa tạo `SessionPlan` trong feature này.
- Nếu level mismatch:
  - Preflight trả flag.
  - FE sau này có thể yêu cầu confirm level.

Acceptance:

- BA AC cuối: Stage 1 có thể dùng `CandidateClaim[]`, `CalibrationProfile`, `RiskHypothesis[]` từ assessment.
- Feature 029 không chọn probe.

### F29.5 - Frontend Skill Passport

Frontend:

- `DocumentUploadZone` hiện behavior summary sau job completed.
- `AssessmentHistory` hiện behavior focus trong details.
- Thêm component nhỏ:
  - `BehaviorCalibrationSummary`
  - Props: `summary`, `status`, `missingSources`, `levelMismatch`
- Copywriting:
  - "Trong buổi phỏng vấn behavior, nên chuẩn bị evidence về..."
  - "Phần này là gợi ý luyện tập, không phải kết luận tuyển dụng."
- Không hiện:
  - Raw risk labels.
  - Internal weights.
  - Prompt.
  - Verdict.

Acceptance:

- UI đáp ứng BA UI Boundary.
- Candidate không bị quá tải bởi payload nội bộ.

### F29 - Behavior Calibration Pipeline (Detail)

Mục tiêu của F29 là biến CV/JD/Fit Assessment đã validate thành calibration artifact cho Behavior Session Stage 1, theo cùng mô hình 2 lớp như P0.3:

1. LLM chỉ đọc structured facts (không raw text) và trả claims + risks dạng structured output.
2. Backend validate schema, normalize, build profile deterministic và persist.

CV và JD có thể có hoặc không có; pipeline xử lý partial case theo source completeness.

#### Reuse từ P0.3 — Không phân tích CV/JD lần 2

`FitAssessmentV2` từ P0.3 đã chứa structured evidence đủ để BC không cần ask LLM re-read CV/JD raw:

| Có sẵn trong `FitAssessmentV2` | BC dùng thế nào |
|---|---|
| `requirementSignals[].cvEvidence[]` | Pass vào BC-3 như pre-extracted evidence context thay vì full CvJson raw — giảm token và tăng focus |
| `gaps[category='level_mismatch']` | BC-4a map trực tiếp thành `RiskHypothesis` `level_mismatch` — không cần LLM |
| `gaps[category='weak_evidence']` | BC-4a map thành `claim_without_evidence` — không cần LLM |
| `riskFlags[code='seniority_mismatch']` | BC-4a map thành `level_mismatch` risk — không cần LLM |
| `riskFlags[code='missing_core_stack']` | BC-4a tạo `weak_technical_depth` seed — LLM chỉ cần xác nhận nếu CV có claim liên quan |

Những gì **không có trong FA-1** và buộc phải dùng LLM:
- `overstated_ownership` — đọc ownership language trong claim text (LLM detect "led" vs "helped with")
- `generic_answering` — detect pattern viết CV chung chung, không có impact/scope cụ thể
- `weak_conflict_handling` / `missing_business_impact` — chỉ detect được sau khi BC-3 đã mine claim text

#### Behavior Calibration Pipeline Steps

```
Bước BC-1 — Collect inputs
  Input:  userId
  Output: { cvJson: CvJson | null, jdJson: JdJson | null,
            fitAssessment: FitAssessmentV2 | null, profile: UserProfile | null,
            sourceCompleteness: SourceCompleteness }
  Source: DB via DocumentContextService
  Guard:  nếu không có CV lẫn JD → skip pipeline hoàn toàn, không tạo profile

Bước BC-2 — Determine calibration path
  Input:  sourceCompleteness
  Output: path: 'cv_only' | 'jd_only' | 'full'
          cv_only  → mine claims từ CV, skip JD expectation và BC-4a
          jd_only  → build JD expectations chỉ từ jdJson, không tạo CV claim
          full     → chạy đủ BC-3, BC-4a, BC-4b

Bước BC-3 — AI: extractCandidateClaims(cvJson, jdJson?, fitEvidenceHints?)
  Input:  CvJson (required nếu path 'cv_only' | 'full')
          JdJson (optional — để LLM biết context role/level, không tạo claim từ JD)
          fitEvidenceHints?: FitAssessmentV2.requirementSignals[].cvEvidence
            (pre-extracted evidence snippets từ P0.3, optional enrichment)
  Output: ClaimMiningOutput  ← locked bởi responseSchema, xem schema bên dưới
  LLM không verify claim — chỉ mine tín hiệu behavior từ CV text
  LLM không re-evaluate skill coverage — FA-1 đã làm việc đó

Bước BC-4a — Backend: seedRisksFromFitAssessment(fitAssessment)
  Input:  FitAssessmentV2 (chỉ chạy nếu fitAssessment != null)
  Output: SeededRisk[]  ← map deterministic, không gọi LLM
  Mapping:
    gaps[category='level_mismatch']      → riskType='level_mismatch',    severity=gap.severity
    gaps[category='weak_evidence']       → riskType='claim_without_evidence', severity=gap.severity
    riskFlags[code='seniority_mismatch'] → riskType='level_mismatch',    severity=flag.severity
    riskFlags[code='missing_core_stack'] → riskType='weak_technical_depth', severity=flag.severity
    riskFlags[code='ambiguous_timeline'] → riskType='unclear_scope',     severity=flag.severity
  Dedupe: nếu `level_mismatch` đã có từ gaps và riskFlags → chỉ giữ 1, lấy severity cao hơn

Bước BC-4b — AI: generateBehavioralRisks(claims, seededRisks, jdJson?)
  Input:  ClaimMiningOutput.claims (từ BC-3)
          SeededRisk[] (từ BC-4a — LLM biết risk nào đã seed để không duplicate)
          JdJson (optional)
  Output: BehavioralRiskOutput  ← locked bởi responseSchema, xem schema bên dưới
  LLM chỉ làm những gì BC-4a không làm được:
    - overstated_ownership: detect ownership language trong claim text
    - generic_answering: pattern viết CV "worked with / helped" không có scope
    - weak_conflict_handling: chỉ nếu CV có claim conflict/stakeholder nhưng thiếu depth
    - missing_business_impact: claim có action nhưng không có outcome/metric
    - poor_tradeoff_reasoning: claim về design/architecture nhưng không có trade-off rationale
    - low_learning_agility: pattern không có failure story hoặc thiếu reflection
    - communication_gap: claim về cross-functional work nhưng không có communication evidence
  LLM không tạo lại risk đã có trong SeededRisk[] (instruction trong prompt)
  LLM KHÔNG trả levelAssessment — level mismatch được tính deterministic ở BC-5

Bước BC-5 — Backend: buildCalibrationProfile(claimOutput, seededRisks, behavioralRisks, inputs)
  Input:  ClaimMiningOutput, SeededRisk[], BehavioralRiskOutput,
          sourceCompleteness, cvJson, jdJson, fitAssessment, profile
  Output: BehaviorCalibrationProfileData
  Compute:
    1. Merge SeededRisk[] + BehavioralRiskOutput.hypotheses → RiskHypothesis[] (với source, probeSelectionHints, evidenceNeededToReject)
    2. Tính levelMismatch deterministic:
         jdJson.minimum_experience_years > cvJson.totalYearsExperience
         OR jdJson.seniority và cvJson.seniority không khớp
    3. Nếu levelMismatch=true và chưa có SeededRisk 'level_mismatch' → thêm vào RiskHypothesis[] với source='system_inference'
    4. Map roleFamily + targetLevel → LevelExpectation[] từ taxonomy/config (không gọi LLM)
    5. Map previousWeakCompetencies từ profile.weaknessHistory nếu có
    6. Tính priorityCompetencies: QuestionProbeCompetency[] (intersection JD + claim signals — phải dùng taxonomy values)
    7. Tính competencyWeights, evidenceStrictness, calibrationNotes, userFacingSummary
    8. Flatten cvTechStack: canonicalize(cvJson.skills) — copy thẳng, không gọi LLM
    9. Flatten jdTechRequirements: canonicalize(jdJson.required_skills) — copy thẳng, không gọi LLM
       (canonicalize = cùng function với F029 JD parse pipeline, ra canonical key của QUESTION_BANK_TAXONOMY.techTagGroups)
  Persist: BehaviorCalibrationProfile + CandidateClaim[] + RiskHypothesis[]
```

#### ClaimMiningOutput Schema

Output thực của LLM ở Bước BC-3 — chỉ chứa claims và tín hiệu, không chứa verification status hay risk verdict:

```ts
// Bước BC-3 output — locked bởi responseSchema
// LLM KHÔNG trả verificationStatus hay verificationPriority — đó là việc của backend (BC-5)
// claimType phải dùng đúng taxonomy từ design doc — verb-object style, không dùng abstract noun
interface RawCandidateClaim {
  sourceType: 'cv' | 'jd' | 'profile';
  sourceRef: {
    section: string;       // e.g. "experience[0].responsibilities[2]"
    textHash?: string;
  };
  claimType:
    | 'led_team'           // "led", "managed", "was responsible for team"
    | 'owned_feature'      // "owned", "built from scratch", "single-handedly"
    | 'improved_metric'    // "reduced X by Y%", "increased performance"
    | 'handled_incident'   // "responded to", "resolved production issue"
    | 'cross_functional'   // "worked with PM/Design/Ops", "collaborated across teams"
    | 'mentored'           // "mentored", "coached", "onboarded"
    | 'conflict'           // "resolved disagreement", "mediated", "pushed back on"
    | 'failure'            // "learned from", "post-mortem", "mistake"
    | 'domain_experience'; // domain/industry/product-specific claim
  claimText: string;         // trích dẫn gần đúng từ CV/JD
  normalizedClaim: string;   // paraphrase ngắn gọn, không PII
  // phải là giá trị từ QuestionProbeCompetency taxonomy — prompt phải instruct LLM output đúng enum value
  impliedCompetencies: string[];
  evidenceHints: string[];   // gợi ý probe cho Stage 1, không phải verdict
  // canonical tech tags liên quan đến câu chuyện này — phải là key trong QUESTION_BANK_TAXONOMY.techTagGroups
  // LLM extract cùng lúc mine claim, không tốn thêm LLM call
  // empty array nếu claim không có tech context cụ thể (ví dụ led_team thuần behavioral)
  techContext: string[];
  // free-form tags từ LLM — BC-5 sẽ map về riskIfUnverified: HiringRiskType[]
  riskTags: string[];
}

interface ClaimMiningOutput {
  miningConfidence: 'high' | 'medium' | 'low';
  claims: RawCandidateClaim[];
  unmappedSignals: string[];   // tín hiệu có nhưng không map được về claimType cụ thể
}
```

#### SeededRisk Schema (BC-4a — Deterministic, không dùng LLM)

Backend map trực tiếp từ `FitAssessmentV2` — không gọi AI:

```ts
// BC-4a output — mapping rule từ FitAssessmentV2, không phải LLM output
interface SeededRisk {
  riskType:
    | 'level_mismatch' | 'claim_without_evidence'
    | 'weak_technical_depth' | 'unclear_scope';
  severity: 'high' | 'medium' | 'low';
  sourceRef: {
    fitAssessmentField: 'gaps' | 'riskFlags';
    originalCategory: string;   // e.g. "level_mismatch", "seniority_mismatch"
  };
  rationale: string;            // build từ gap.explanation hoặc riskFlag.explanation
  relatedRequirement?: string;  // từ gap.relatedRequirement nếu có
}

// Mapping rule — deterministic, không thay đổi theo prompt
const FIT_TO_RISK_MAP: Record<string, SeededRisk['riskType']> = {
  // gaps
  'level_mismatch':      'level_mismatch',
  'weak_evidence':       'claim_without_evidence',
  // riskFlags
  'seniority_mismatch':  'level_mismatch',
  'missing_core_stack':  'weak_technical_depth',
  'ambiguous_timeline':  'unclear_scope',
};
// gaps[category='missing_required_skill'] và riskFlags[code='insufficient_cv_detail'] / 'domain_gap'
// → KHÔNG seed thành RiskHypothesis vì đây là skill fit domain, không phải behavior domain
```

#### BehavioralRiskOutput Schema (BC-4b — AI, chỉ cho behavioral risks)

Output thực của LLM ở Bước BC-4b — chỉ chứa risks không derive được từ fit assessment:

```ts
// Bước BC-4b output — locked bởi responseSchema
// LLM KHÔNG tạo lại level_mismatch / claim_without_evidence / weak_technical_depth / unclear_scope
// vì các risk này đã được seed ở BC-4a từ FitAssessmentV2
// LLM KHÔNG trả levelAssessment — level mismatch là việc của backend BC-5 (deterministic)
// LLM KHÔNG trả severity final — đó là việc của backend (BC-5)
// relatedCompetencies phải là giá trị từ QuestionProbeCompetency taxonomy
interface RawBehavioralRisk {
  riskType:
    | 'overstated_ownership'      // ownership language phóng đại trong claim text
    | 'missing_business_impact'   // claim có action nhưng không có outcome/metric
    | 'weak_conflict_handling'    // CV có claim conflict/stakeholder nhưng thiếu depth
    | 'generic_answering'         // pattern "worked with / helped" không có scope cụ thể
    | 'poor_tradeoff_reasoning'   // claim về design/architecture thiếu trade-off rationale
    | 'low_learning_agility'      // không có failure story hoặc thiếu reflection evidence
    | 'communication_gap';        // cross-functional claim nhưng không có communication evidence
  candidateClaimRef?: string;     // tham chiếu RawCandidateClaim.sourceRef.section
  rationale: string;
  // phải là giá trị từ QuestionProbeCompetency taxonomy
  relatedCompetencies: string[];
  // gợi ý probe focus — BC-5 sẽ build probeSelectionHints từ đây
  suggestedProbeFocus: string[];
}

interface BehavioralRiskOutput {
  hypotheses: RawBehavioralRisk[];
  // phải là giá trị từ QuestionProbeCompetency taxonomy
  priorityCompetencies: string[];
  calibrationNotes: string[];
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
    missingDataWarning?: string;
  };
}
```

#### Backend Build Profile Responsibility

Bước BC-5 nhận output từ BC-3 (1 AI call), BC-4a (deterministic), BC-4b (1 AI call) và build `BehaviorCalibrationProfile` — không có field nào trong block dưới được lấy trực tiếp từ LLM:

```ts
// BC-5 output — BehaviorCalibrationProfile = RawAiOutputs + backend-computed fields
// Không có field nào trong BehaviorCalibrationProfileComputed được lấy thẳng từ LLM
// Tất cả competency fields phải dùng QuestionProbeCompetency từ QUESTION_BANK_TAXONOMY
interface BehaviorCalibrationProfileComputed {
  status: 'partial' | 'ready' | 'failed';
  sourceCompleteness: { hasCv: boolean; hasJd: boolean; hasProfile: boolean; hasWeaknessHistory: boolean };

  // Role/level — lấy từ jdJson + profile, không từ LLM
  roleFamily: string;               // map về QuestionProbeRoleFamily nếu được
  targetRole: string;
  targetLevel: string;              // map về QuestionProbeLevel nếu được
  profileLevel: string;
  levelMismatch: boolean;           // deterministic: jd minYears vs cv totalYears OR seniority title mismatch

  // LevelExpectation — lookup từ taxonomy/config theo roleFamily + targetLevel (không gọi LLM)
  // Stage 1 dùng trực tiếp để biết mustHaveSignals, dealBreakers, depthRequirement
  levelExpectations: LevelExpectation[];

  // Competency — phải là QuestionProbeCompetency[] từ taxonomy, không phải free string
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Partial<Record<QuestionProbeCompetency, number>>;
  // Lấy từ profile.weaknessHistory nếu hasWeaknessHistory=true; rỗng nếu không có
  previousWeakCompetencies: QuestionProbeCompetency[];

  // 'standard' | 'strict' | 'very_strict' — mapping từ high-severity risk count
  // (nhiều high-severity risk → very_strict; không có → standard)
  evidenceStrictness: 'standard' | 'strict' | 'very_strict';

  calibrationNotes: string[];

  // userFacingSummary — FE-only, không expose risk label nội bộ
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
    missingDataWarning?: string;
    levelMismatchWarning?: string;
  };

  // sessionGoal, durationMinutes, language — KHÔNG thuộc Stage 0
  // Stage 1 sẽ set khi user confirm session setup
  // CalibrationProfile đầy đủ (theo design doc) = BehaviorCalibrationProfile + Stage 1 session config

  internalVersion: 'behavior-calibration-v1';
}
```

Quy tắc compute trong BC-5:

- **Map `RawCandidateClaim` → `CandidateClaim` entity:**
  - `riskTags[]` (free-form từ LLM) → map về `riskIfUnverified: HiringRiskType[]` bằng static alias dict: `"vague_ownership"` → `overstated_ownership`, `"no_metric"` → `missing_business_impact`, `"no_scope"` → `claim_without_evidence`. Tag không map được → bỏ qua, không tạo unknown type.
  - `verificationPriority`: high nếu claim overlap với `>=1` JD priority competency VÀ có `riskTags` không rỗng; low nếu claim xa JD.
  - `impliedCompetencies` từ LLM: validate từng giá trị là `QuestionProbeCompetency` hợp lệ; loại bỏ giá trị không hợp lệ, không ghi unknown.

- **Merge `SeededRisk[]` + `BehavioralRiskOutput.hypotheses` → `RiskHypothesis[]` entity:**
  - `SeededRisk` → `source='system_inference'`, `severity` từ mapping rule (deterministic).
  - `RawBehavioralRisk` → `source='cv'`/`'jd'`, assign `severity` từ riskType default table:
    `overstated_ownership=medium`, `missing_business_impact=medium`, `weak_conflict_handling=low`, `generic_answering=low`, `poor_tradeoff_reasoning=medium`, `low_learning_agility=low`, `communication_gap=low`.
  - Dedupe: cùng `riskType` từ BC-4a và BC-4b → giữ BC-4a, discard AI duplicate.
  - Nếu `levelMismatch=true` và không có `level_mismatch` trong merged list → thêm 1 entry `source='system_inference'`.
  - Build `evidenceNeededToReject` từ `suggestedProbeFocus` + design pattern theo riskType.
  - Build `probeSelectionHints.preferredCompetencies` từ `relatedCompetencies` (validate taxonomy); `preferredProbeTypes` từ riskType default table.

- **`levelMismatch`:** `jdJson.minimum_experience_years > cvJson.totalYearsExperience` OR (`jdJson.seniority` và `cvJson.seniority` đều non-unknown và không khớp cấp). Không dùng LLM output.

- **`levelExpectations`:** Lookup static từ taxonomy/config theo `(roleFamily, targetLevel)`. Nếu không có exact match thì dùng `targetLevel` generic. Không gọi LLM.

- **`previousWeakCompetencies`:** Đọc từ `profile.weaknessHistory` nếu `sourceCompleteness.hasWeaknessHistory=true`; validate từng giá trị là `QuestionProbeCompetency` hợp lệ.

- **`priorityCompetencies: QuestionProbeCompetency[]`:** Intersection `jdJson.key_responsibilities` competency signals + `impliedCompetencies` từ high-priority claims + `BehavioralRiskOutput.priorityCompetencies`. Validate tất cả về taxonomy. Không copy thẳng từ LLM.

- **`competencyWeights`:** JD requirement `weightHint` + claim density + risk severity trên mỗi competency.

- **`evidenceStrictness`:** Đếm `RiskHypothesis[]` có `severity=high`: 0 → `standard`; 1-2 → `strict`; >=3 → `very_strict`.

- **`userFacingSummary`:** Build từ `BehavioralRiskOutput.userFacingSummary`, không expose raw risk label hay internal riskType.

#### Partial Path Rules

| Path | CV | JD | Kết quả |
|------|----|----|---------|
| `cv_only` | ✓ | ✗ | Mine claims từ CV, không có JD expectation, `status=partial`, `missingDataWarning` nói cần JD |
| `jd_only` | ✗ | ✓ | Build JD expectations, không tạo CV claim giả, `status=partial`, `missingDataWarning` nói cần CV |
| `full` | ✓ | ✓ | Mine claims + map expectations + dùng fit gaps, `status=ready` |
| Cả hai nhưng AI fail | ✓ | ✓ | `status=failed`, log error, không persist corrupt artifact |

##### Full Path Detail — step nào làm gì

`full` path chạy đủ 3 concerns theo thứ tự sau, mỗi concern thuộc một step cụ thể:

**Mine claims — BC-3 (`extractCandidateClaims`)**

LLM đọc `CvJson` và tìm các tín hiệu behavior trong career history: ownership, leadership, impact, conflict, incident, mentoring, ambiguity, domain experience. `JdJson` được pass vào để LLM biết context role/level nhưng claim phải nguồn từ CV, không được bịa từ JD.

Output: `ClaimMiningOutput.claims[]` — mỗi claim có `sourceRef` trỏ về section trong `CvJson`.

**Map JD expectations — BC-4 (`generateRiskHypotheses`)**

LLM nhận claims từ BC-3 và `JdJson`, rồi:
- Với mỗi `key_responsibility` và `required_skill` behavior-relevant trong JD, kiểm tra có claim nào trong CV tương ứng không.
- Nếu JD yêu cầu "stakeholder management" nhưng không có claim nào về collaboration/influence → tạo risk `claim_without_evidence` cho competency đó.
- Output `RiskHypothesisOutput.priorityCompetencies` là danh sách competency LLM thấy JD cần và CV có/thiếu tín hiệu.

Đây là nơi logic "JD expects X, CV has/lacks Y" được thực hiện — không phải BC-3 và không phải BC-5.

**Dùng fit gaps — BC-4 (`generateRiskHypotheses`), input `fitAssessment`**

`FitAssessmentV2.gaps` được pass vào BC-4 như context bổ sung:
- Gap loại `missing_required_skill` → LLM có thể tạo risk `weak_technical_depth` nếu skill đó là behavior-relevant.
- Gap loại `level_mismatch` → LLM tạo risk `level_mismatch` và thêm vào `levelAssessment`.
- Gap loại `weak_evidence` → LLM tạo risk `claim_without_evidence` nếu CV có claim nhưng không có metric/scope rõ.
- Gap loại `transferable_not_direct` → LLM có thể note vào `calibrationNotes` nhưng không tạo risk severity cao.

LLM không được dùng `fitAssessment.finalScore` để kết luận behavior — chỉ dùng `gaps[]` và `riskFlags[]` như signal hỗ trợ.

**Tổng hợp — BC-5 (`buildCalibrationProfile`)**

Backend không gọi LLM thêm. BC-5 chỉ compute deterministic từ output BC-3 + BC-4:
- `priorityCompetencies` = intersection `RiskHypothesisOutput.priorityCompetencies` với JD requirement có `weightHint='high'`, không chỉ lấy thẳng từ LLM.
- `competencyWeights` = tính từ claim density + JD weight, không do LLM cho.
- `levelMismatch` = `levelAssessment.mismatch` AND (`jdJson.minimum_experience_years > cvJson.totalYearsExperience` OR seniority title mismatch).
- Persist `BehaviorCalibrationProfile` + `CandidateClaim[]` + `RiskHypothesis[]`.

Fallback khi AI output invalid:

- `ClaimMiningOutput` invalid hoặc `claims` rỗng dù có CV → đánh `status=failed`, log warning, không persist.
- `BehavioralRiskOutput` (BC-4b) invalid → skip BC-4b, vẫn dùng `SeededRisk[]` từ BC-4a, thêm `calibrationNotes=['behavioral_risk_generation_failed']`, `status=partial`. Pipeline không fail hoàn toàn vì BC-4a đã seed được risk từ fit assessment.
- BC-4a không có `FitAssessmentV2` (cv_only path hoặc assessment failed) → `SeededRisk[] = []`, chạy BC-4b bình thường với context thiếu fit gaps.

#### LLM Guardrails

Prompt của BC-3 và BC-4 phải bao gồm:

- Claim trong CV là **unverified** — không được kết luận đúng/sai, chỉ mine tín hiệu.
- Risk là **hypothesis mở** — không phải verdict tuyển dụng.
- Fit score thấp **không** được chuyển thành behavior weakness — đó là domain khác.
- Mỗi claim phải có `sourceRef`; mỗi risk phải có `rationale`.
- Raw risk label **không** được xuất hiện trong `userFacingSummary`.
- Prompt BC-3 phải có few-shot examples bao phủ: CV narrative không có bullet, CV tiếng Việt mix English, CV chỉ có experience không có achievement metric.

#### Acceptance

- CV có "led team" → tạo `leadership` claim với `riskTags=['vague_ownership']` và risk `overstated_ownership` mở.
- JD có stakeholder management → `priorityCompetencies` bao gồm `collaboration` / `influence`.
- Fit score thấp không tạo risk `severity=high` về behavior.
- `cv_only` → `status=partial`, `userFacingSummary.missingDataWarning` nói thiếu JD.
- `jd_only` → không có CV claim giả.
- `full` → `status=ready`, Stage 1 có thể dùng claims/risks/profile.
- Raw risk label không hiện trong user-facing response.
- `levelMismatch=true` được flag nhưng không chặn calibration, chỉ thêm `levelMismatchWarning` vào summary.

---

## Pre-Implementation Fixes (Review Findings)

Đây là các issue phát hiện sau khi review code hiện tại đối chiếu với plan. Phải sửa trước khi implement F29 hoặc trong cùng phase với F29 — không được bỏ qua.

### Fix-1 (Critical) — `CvJson` schema thiếu fields cần thiết cho claim mining

**File:** `server/src/documents/documents.ai.service.ts`

Schema hiện tại dùng cấu trúc nested skills và experience thiếu nhiều fields:

```ts
// ❌ Hiện tại — thiếu fields cho behavior calibration
interface CvJson {
  skills: { languages: string[]; frameworks: string[]; tools: string[] };
  experiences: Array<{ company, role, duration, responsibilities }>;
}

// ✅ Phải sửa về — flat skills + achievements + dates + seniority + totalYearsExperience
// (xem schema CvJson đầy đủ ở mục P0.3 > CV Parse Pipeline)
```

**Hậu quả nếu không sửa:** BC-3 (claim mining) nhận `CvJson` không có `achievements`, `startDate/endDate`, `seniority`, `totalYearsExperience` — không mine được `impact` / `ownership` / `technical_depth` claims. Toàn bộ F29 mất raw material.

**Sửa đồng thời:**
- Update responseSchema trong `extractCvJson()` khớp schema mới.
- Update prompt để LLM extract đủ fields, đặc biệt `achievements` là array metric/impact/outcome riêng biệt.
- Update `syncCvToUserProfile()` trong `documents.service.ts` vì field path thay đổi (`skills.languages/frameworks/tools` → `skills[]` flat).

### Fix-2 (Critical) — `canonicalize()` bỏ spaces thay vì replace thành underscore

**File:** `server/src/documents/fit-assessment.service.ts` — hàm `canonicalize()` dòng ~394

```ts
// ❌ Hiện tại — loại bỏ ký tự không phải alphanumeric, space bị xóa không thành underscore
return this.cleanText(value).toLowerCase().replace(/[^a-z0-9+#.]+/g, '');
// "Spring Boot" → các từ dính liền, không có underscore phân cách   ← sai
// "GitHub Actions" → các từ dính liền, không có underscore phân cách   ← sai

// ✅ Phải sửa — replace space/hyphen thành underscore trước, sau đó bỏ ký tự đặc biệt còn lại
// "Spring Boot"    → "spring_boot"
// "GitHub Actions" → "github_actions"
// "Node.js"        → "nodejs"
```

**Hậu quả nếu không sửa:** Requirement ID bị sai key (`spring_boot` ≠ `springboot`), scoring không match đúng requirement signal với normalized requirement → breakdown không chính xác.

**Lưu ý:** Sau khi sửa, alias dictionary và taxonomy key trong `question-bank-taxonomy.constants.ts` phải dùng underscore-style nhất quán.

### Fix-3 (Critical) — `DocumentContextService` tạo Redis instance riêng

**File:** `server/src/documents/document-context.service.ts` dòng ~43

```ts
// ❌ Hiện tại — khởi tạo Redis instance độc lập
this.redisClient = new Redis({
  host: this.configService.get('REDIS_HOST') || '127.0.0.1',
  port: this.configService.get('REDIS_PORT') || 6379,
});
```

**Việc cần làm:** Grep `RedisService`, `RedisClient`, `InjectRedis` hoặc `ioredis` trong codebase để tìm wrapper/provider hiện có. Nếu có → inject thay vì tự tạo. Nếu không có → tạo shared `RedisService` trong `common/` và dùng ở cả hai nơi.

**Hậu quả nếu không sửa:** N+1 Redis connections, config drift nếu sau này thêm auth/TLS, vi phạm "Reuse existing wrappers — extend don't duplicate".

### Fix-4 (Medium) — Prompts `extractCvJson` / `extractJdJson` / `assessFitRubric` thiếu few-shot

**File:** `server/src/documents/documents.ai.service.ts`

Plan yêu cầu rõ: prompt phải có few-shot examples bao phủ JD narrative (không có bullet), JD tiếng Việt/Nhật mix English, CV chỉ có experience không có achievement, CV ngắn thiếu section.

Thiếu few-shot → LLM dễ nhầm required vs nice-to-have, bỏ sót skills lồng trong description, không extract `achievements` riêng khỏi `responsibilities`.

**Việc cần làm:**
- `extractCvJson`: thêm 1 few-shot example CV có achievements rõ và 1 CV chỉ có responsibilities (không có metric).
- `extractJdJson`: thêm 1 few-shot JD dạng bullet chuẩn và 1 JD narrative.
- `assessFitRubric`: thêm 1 example requirement signal `met` rõ evidence và 1 example `partial` chỉ có keyword.

### Fix-5 (Medium) — `getAssessmentHistory` trả raw `fitAssessment` JSONB ra client

**File:** `server/src/documents/documents.service.ts` — hàm `getAssessmentHistory()`

```ts
// ❌ Hiện tại — expose full internal object
fitAssessment,               // chứa requirementSignals, riskFlags code nội bộ
fitAssessmentSummary: this.fitAssessmentService.buildSummary(fitAssessment),

// ✅ Phải sửa — chỉ trả summary
fitAssessmentSummary: this.fitAssessmentService.buildSummary(fitAssessment),
// bỏ fitAssessment raw
```

Plan: "Không hiển thị raw prompt, internal weights, hoặc risk code thô." `riskFlags.code`, `requirementSignals` chi tiết là internal data không nên expose candidate UI. `fitAssessmentSummary` đã đủ cho FE hiển thị.

**Lưu ý:** Nếu FE đang đọc `fitAssessment.gaps` trực tiếp, phải migrate FE sang `fitAssessmentSummary.groupedGaps` đồng thời.

### Fix-6 (Medium) — `parseCv()` không trả `missingSources` / behavior guidance

**File:** `server/src/documents/documents.service.ts` — hàm `parseCv()`

```ts
// ❌ Hiện tại
return { status: 'success', type: 'CV', recordId: cvRecord.id };

// ✅ Phải thêm
return {
  status: 'success',
  type: 'CV',
  recordId: cvRecord.id,
  missingSources: hasLatestJd ? [] : ['jd_context'],
  calibrationStatus: 'not_started',   // sẽ là 'partial' sau khi F29 implement
  behaviorSummary: null,
};
```

Plan P1.3: khi upload CV chưa có JD → FE phải hiện "CV đã xử lý, cần JD để calibration đầy đủ." FE không nhận được signal này từ CV flow hiện tại.

### Fix-7 (Low) — `AssessmentHistory` không có null guard cho `fitScore`

**File:** `client/apps/web/src/components/dashboard/profile/AssessmentHistory.jsx` dòng 90

```jsx
// ❌ Hiện tại — nếu fitScore null, ScoreBar render 0% không phân biệt được
<ScoreBar score={item.fitScore} />

// ✅ Phải guard
{item.fitScore !== null && item.fitScore !== undefined && (
  <ScoreBar score={item.fitScore} />
)}
```

`getAssessmentHistory` hiện filter `assessmentStatus === 'completed'` nên `fitScore` không null trong practice. Nhưng cần guard để code an toàn khi logic history thay đổi sau này.

---

### Trạng Thái F29 Hiện Tại (Chưa Implement)

Các work package sau **chưa có code**, chỉ là stub placeholder trong `documents.service.ts`:

```ts
calibrationStatus: 'not_started',  // hardcoded
behaviorSummary: null,              // hardcoded
```

Cần implement theo đúng thứ tự:

1. **Fix-1 trước** — sửa `CvJson` schema để có đủ input cho claim mining.
2. **Fix-2 trước** — sửa `canonicalize()` để requirement ID đúng.
3. **F29.1** — `BehaviorCalibrationAiService` (BC-3 claim mining + BC-4 risk hypothesis).
4. **F29.2** — `BehaviorCalibrationService` (BC-5 builder + persist entities).
5. **Entities** — `BehaviorCalibrationProfile`, `CandidateClaim`, `RiskHypothesis` + migrations.
6. **F29.3** — Update API contracts, loại bỏ stub, thêm calibration endpoint.
7. **F29.4** — Cập nhật `InterviewService.preflight()` với behavior calibration snapshot.
8. **F29.5** — Thêm `BehaviorCalibrationSummary` component + badge states.

---

## Suggested Implementation Order

### Phase 1 - Safety Và Source Of Truth

1. Remove PII logs and raw text job payload.
2. Add server-side file validation.
3. Add DB-backed document context service.
4. Update `InterviewService` to use DB fallback.
5. Add tests for Redis flush fallback.

Lý do: nếu không sửa P0 này trước, calibration mới sẽ tiếp tục phụ thuộc Redis TTL và làm tăng PII exposure.

### Phase 2 - Persistent Processing State

1. Add entity fields/migration for CV/JD processing state.
2. Move extraction/validation fully into worker.
3. Persist job status in DB.
4. Update frontend polling/result state.

Lý do: cần state bền vững trước khi thêm multi-step calibration.

### Phase 3 - Fit Assessment V2

1. Add typed `FitAssessmentV2`.
2. Add rubric prompt/schema.
3. Compute final score deterministic.
4. Persist breakdown and scoring version.
5. Replace old one-score prompt/service path.
6. Update job status/history API to read V2 summary.
7. Keep `fitScore` only as a derived numeric projection from V2.
8. Keep `matchReport`/`gapAnalysis` only as temporary read adapters if FE migration cannot land in the same PR; add cleanup task and do not add new callers.

Lý do: behavior calibration cần sử dụng gap/fit có giải thích, không chỉ `%`.

### Phase 4 - Behavior Calibration Backend

1. Add `BehaviorCalibrationProfile` entity.
2. Add calibration types and schema validation.
3. Add AI service for claim/risk extraction.
4. Add builder service and call it after CV/JD processing.
5. Add latest calibration query service for Stage 1.

### Phase 5 - Frontend Summary

1. Fix JD score `0` rendering.
2. Add missing-source states.
3. Add `BehaviorCalibrationSummary` component.
4. Extend assessment history details.

### Phase 6 - Production Config, Tests, Rollout

1. Add unit tests for document validation, context fallback, scoring clamp, calibration partial/ready.
2. Add integration tests for upload CV then JD happy path.
3. Add FE tests for missing CV/JD and score 0.
4. Add observability logs/metrics.
5. Switch production config to migrations/no synchronize.

## Test Plan

Backend unit:

- Reject non-PDF/DOCX server-side.
- Corrupted PDF marks job failed without raw PII in error.
- Redis miss + DB has CV/JD returns ready preflight.
- Redis miss + DB missing JD returns missing `jd_context`.
- Fit score clamps below 0/above 100.
- Fit assessment V2 preserves required/nice-to-have separation.
- Legacy one-score prompt/service is not called by document worker.
- `fitScore` equals `fitAssessment.finalScore`.
- Legacy `matchReport`/`gapAnalysis` adapters, if present, are derived from `fitAssessment.gaps`.
- CV-only calibration creates claims and status `partial`.
- JD-only calibration does not create fake CV claims.
- CV+JD calibration creates status `ready`.
- Level mismatch is flagged, not silently applied.

Backend integration:

- Upload CV -> job completed -> UserCv saved -> Redis cache refreshed -> partial calibration exists.
- Upload JD after CV -> JdAnalysis saved -> fit assessment saved -> ready calibration exists.
- Flush Redis -> interview preflight still ready from DB.
- Delete assessment only affects that JD/calibration relation as designed.

Frontend:

- Upload JD without CV shows "needs CV" state.
- Upload CV without JD shows "needs JD" state.
- JD fit score 0 displays 0% instead of hiding result.
- Assessment result reads V2 breakdown/grouped gaps, not only `matchReport.missing_skills`.
- Behavior focus summary renders user-facing text only.
- Assessment history shows calibration badge.

Manual verification:

- Real sample CV/JD English.
- Real sample CV/JD Vietnamese.
- Short/blank document rejection.
- Large-but-valid 5MB boundary.
- Redis unavailable/miss scenario.

## Rollout Strategy

1. Merge P0 safety first.
2. Add DB fallback before changing FE.
3. Add new DB fields as nullable migration-safe columns, but make V2 the only write path once deployed.
4. Replace old fit assessment service/prompt in the same implementation phase as V2.
5. Migrate FE to `fitAssessmentSummary`/grouped gaps.
6. Keep old response aliases only if needed for a short transition; no new code may consume them.
7. Add cleanup task to remove `matchReport`/`gapAnalysis` aliases after FE no longer reads them.
8. Gate calibration generation behind env flag initially:
   - `BEHAVIOR_CALIBRATION_ENABLED=true`
9. Enable for development/staging.
10. Validate logs contain no raw CV/JD.
11. Enable production after sample QA.

## Review Checklist

Before implementation starts, reviewer should confirm:

- Có chấp nhận thiết kế normalize ngay từ đầu với 3 entity `BehaviorCalibrationProfile`, `CandidateClaim`, `RiskHypothesis`.
- Context edit trước interview sẽ persist theo cách nào: update current parsed context, tạo override record, hay snapshot-only.
- Calibration endpoint nên nằm trong `documents` hay `behavioral`.
- Retention policy cho uploaded original files: xóa sau parse hay giữ có thời hạn.
- Fit Assessment V2 weights mặc định.
- Xác nhận old `assessFitScore()`/one-score prompt bị remove hoặc đổi hẳn thành `assessFitRubric()` trong feature này.
- Thời điểm cleanup `matchReport`/`gapAnalysis` legacy aliases sau khi FE đọc V2.
- Competency taxonomy nào là source of truth cho mapping behavior.

## Definition Of Done

- P0 safety hoàn tất: không log PII, DB source of truth, assessment rubric có evidence.
- Fit Assessment V2 là write path duy nhất; không còn prompt một-score hoặc service path cũ được worker gọi.
- P1 UX/worker/test/config hoàn tất ở mức không còn blocker production rõ ràng.
- Feature 029 có calibration artifact persist trong DB.
- Skill Passport hiện behavior interview focus summary user-facing.
- Interview preflight có thể lấy calibration cho Stage 1, nhưng chưa chọn probe trong feature này.
- Backend and frontend build pass.
- Unit/integration tests cho các case chính pass.
