# Implementation Plan - Feature 029 Behavior Session Intake Calibration

## Muc Tieu

Plan nay gom 2 dong viec phai lam cung nhau:

1. Harden luong CV/JD assessment hien tai theo cac P0/P1 da audit, de du an khong xay Stage 0 tren mot nen tang du lieu mong manh.
2. Implement noi dung trong `BA.md`: bien ket qua CV/JD assessment thanh behavior calibration artifact gom `CandidateClaim[]`, `RiskHypothesis[]`, priority competencies va `CalibrationProfile` de Behavior Session Stage 1 co input dang tin.

Nguyen tac: khong tao intake wizard moi. User van upload CV/JD o Skill Passport/Context Injection. Backend mo rong pipeline hien tai, frontend chi them state/summary can thiet.

## Baseline Hien Tai Can Giu

- Endpoint upload hien co: `POST /documents/upload`.
- Queue hien co: `DOCUMENT_PARSING_QUEUE`, worker `DocumentWorker`.
- Entity hien co: `UserCv`, `JdAnalysis`, `UserProfile`.
- UI hien co: `DocumentUploadZone`, `AssessmentHistory`, `SkillPassportPage`.
- Interview setup hien doc `cv_context:{userId}` va `jd_context:{userId}` tu Redis.

Khong duoc lam hong:

- Upload CV/JD PDF/DOCX.
- Parse CV/JD co ban.
- Fit score/gap analysis hien co.
- Assessment history.
- Interview setup dang yeu cau CV/JD context.

## Target Architecture

### Source Of Truth

Postgres la source of truth. Redis chi la cache va co the mat bat ky luc nao.

- `UserCv.parsedJson` giu CV structured facts moi nhat.
- `JdAnalysis.parsedJson`, `fitScore`, `matchReport` giu JD assessment.
- Them artifact behavior calibration persist trong DB.
- Redis context duoc rehydrate tu DB khi thieu cache.
- Interview session snapshot phai lay tu DB-backed context da validate, khong phu thuoc Redis TTL.

### Processing Flow Moi

1. User upload file.
2. API validate auth, size, mime/extension, tao upload record/job, tra `jobId` nhanh.
3. Worker extract text, validate content, parse CV/JD, persist DB.
4. Worker cap nhat Redis cache neu thanh cong.
5. Neu co du CV va JD, worker chay fit assessment bang rubric moi.
6. Worker chay behavior calibration builder:
   - mine candidate claims tu CV/profile.
   - map JD behavior expectations.
   - tao risk hypotheses dang mo.
   - tao calibration profile va user-facing summary.
7. FE poll job status va hien ket qua theo state ro rang.
8. Interview preflight/init doc context tu DB service, Redis la optimization.

## Data Model De Xuat

### Update Existing Entities

`UserCv`

- Them `processingStatus`: `processing | completed | failed`.
- Them `parseError`: nullable text.
- Them `parsedTextHash`: nullable string, de audit/dedupe ma khong luu raw text.
- Them `deletedAt` neu can soft delete sau nay.

`JdAnalysis`

- Them `processingStatus`: `processing | completed | failed`.
- Them `parseError`: nullable text.
- Them `assessmentStatus`: `not_ready | completed | failed`.
- Them `assessmentError`: nullable text.
- Them `cvId`: nullable FK toi `UserCv`, de biet fit score duoc cham voi CV nao.
- Them `scoringVersion`: string.
- Them `fitAssessment`: jsonb nullable, chua rubric chi tiet.

### New Entity: `BehaviorCalibrationProfile`

Bang/Entity de luu Stage 0 output.

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
- `candidateClaims`: jsonb typed array
- `riskHypotheses`: jsonb typed array
- `calibrationNotes`: string[]
- `userFacingSummary`: jsonb
- `internalVersion`: string
- `createdAt`, `updatedAt`

Chap nhan JSONB cho claims/risks o phase nay vi Stage 1 can load theo profile moi nhat, chua can query tung claim. Neu sau nay can analytics/ranking cross-user thi tach `CandidateClaim` va `RiskHypothesis` thanh bang rieng.

### Types

Define TypeScript types rieng, khong de `any` lan rong:

- `CandidateClaim`
- `CandidateClaimSource`
- `CandidateClaimType`
- `ClaimVerificationPriority`
- `RiskHypothesis`
- `RiskHypothesisType`
- `BehaviorCalibrationSummary`
- `BehaviorCalibrationProfileJson`
- `FitAssessmentV2`

Competency phai map ve taxonomy hien co trong question-bank/behavior domain. Neu khong map duoc thi dung `unmappedSignals`, khong tao vocabulary song song.

## P0 Work Packages

### P0.1 - PII va Document Safety

Backend:

- Xoa `console.log('Extracted text:', extractedText)` trong `DocumentsService`.
- Khong dua raw `extractedText` vao BullMQ job data neu khong can. Neu can truyen giua request va worker thi uu tien luu file path + checksum, worker tu extract.
- Log theo `userId`, `recordId`, `jobId`, `documentType`, `textLength`, `hash`, khong log raw CV/JD.
- Them upload retention policy:
  - sau parse thanh cong co the xoa file local neu khong can download lai.
  - neu giu file thi luu ngoai public path va co cleanup job.
- Chuan hoa error message de khong leak noi dung file.

Acceptance:

- Log khong chua raw CV/JD.
- Job payload khong chua full text PII.
- File upload co cleanup/retention ro.

### P0.2 - DB Source Of Truth va Redis Fallback

Backend:

- Tao service `DocumentContextService`:
  - `getLatestCvContext(userId)`
  - `getLatestJdContext(userId)`
  - `getInterviewContext(userId)`
  - `refreshRedisContext(userId)`
- Service doc Redis truoc, neu miss thi doc DB, validate schema, rehydrate Redis.
- Sua `InterviewService.preflight()` va `initSession()` dung `DocumentContextService`, khong doc Redis truc tiep.
- Khi `updateContext()` duoc user confirm truoc interview:
  - ghi Redis.
  - persist vao DB duoi dang context override/snapshot hoac update current parsed context co version.
  - can audit `updatedByUser: true`.
- Redis key co TTL thong nhat, nhung session init khong fail chi vi TTL het.

Acceptance:

- User da upload CV/JD truoc do van start interview duoc sau khi Redis bi flush.
- Preflight tra dung missing source neu DB cung thieu.
- Session snapshot duoc lay tu context da persist.

### P0.3 - Fit Assessment Rubric V2

Backend:

- Thay prompt mot-score bang rubric structured:
  - `mustHaveSkillCoverage`
  - `niceToHaveCoverage`
  - `experienceLevelFit`
  - `roleResponsibilityFit`
  - `domainFit`
  - `evidenceQuality`
  - `transferableExperience`
  - `riskFlags`
  - `confidence`
  - `scoreBreakdown`
- Score final tinh deterministic tu breakdown, LLM chi extract/evaluate evidence theo schema.
- Clamp score 0-100 server-side.
- Luu `scoringVersion`, `model`, `createdAt`, `confidence`.
- Gap analysis phai phan biet:
  - missing required skills.
  - weak evidence.
  - level mismatch.
  - transferable but not direct.

Acceptance:

- Cung CV/JD cho output co cau truc giai thich duoc, khong chi mot so `%`.
- Fit score khong duoc dung lam behavior readiness.
- UI van hien fit score cu, nhung backend co breakdown cho history/detail sau nay.

## P1 Work Packages

### P1.1 - Move Heavy Work Fully To Worker

Backend:

- API upload chi lam validation nhe va tao job.
- Worker lam:
  - extract text.
  - content validation.
  - AI parse.
  - fit assessment.
  - behavior calibration.
- Them persistent processing status vao DB, khong chi dua vao BullMQ return value.
- Them `removeOnComplete`, `removeOnFail`, attempts/backoff hop ly.
- Them concurrency limit cho document worker.

Acceptance:

- Request upload tra nhanh, khong bi block boi PDF parse/AI call.
- User refresh page van xem duoc status tu DB/history.

### P1.2 - Server-Side File Validation

Backend:

- Them server-side mime + extension allowlist cho PDF/DOCX.
- Kiem tra magic bytes neu co the.
- Xu ly file parse fail thanh `processingStatus=failed`.
- Dung `BadRequestException` co message ngan gon.

Frontend:

- Giu client validation hien co, nhung coi server la source of truth.

Acceptance:

- File sai type khong duoc xu ly nhu PDF/DOCX.
- File corrupted tra failed state co retry path.

### P1.3 - Frontend State Va UX Fixes

Frontend:

- Sua dieu kien hien JD result: khong dung truthy `fitScore`; score `0` van phai hien.
- Neu upload JD khi chua co CV:
  - hien "JD da xu ly, can CV de cham fit score va behavior calibration theo ho so".
- Neu upload CV khi chua co JD:
  - hien "CV da xu ly, behavior claims co the da tao mot phan, can JD de calibration day du".
- Them section `Behavior interview focus`:
  - focus competencies.
  - evidence to prepare.
  - missing data.
  - level mismatch warning neu co.
- Assessment history co the hien badge:
  - `Fit ready`
  - `Calibration ready`
  - `Needs CV`
  - `Needs JD`
  - `Failed`

Acceptance:

- User luon biet dang thieu CV hay JD.
- Score 0% khong bi an.
- Raw claims/risks noi bo khong hien cho candidate.

### P1.4 - Production Config Va Observability

Backend:

- Tach config production:
  - `synchronize: false` khi production.
  - CORS doc tu env.
- Them structured logs cho document jobs.
- Them metrics/log fields:
  - job duration.
  - parse success/failure count.
  - AI latency.
  - validation reject reason.
  - calibration status.
- Them timeout/retry policy cho Gemini calls.

Acceptance:

- Production khong tu sync schema.
- Co du log de debug job fail ma khong xem PII.

## Feature 029 Work Packages

### F29.1 - Behavior Calibration AI Service

Backend:

- Tao `BehaviorCalibrationAiService` hoac mo rong documents AI theo module rieng.
- Input:
  - latest CV facts.
  - latest JD facts.
  - profile role/seniority/domain.
  - fit assessment V2 neu co.
  - weakness history neu san co.
- Output schema:
  - claims.
  - risk hypotheses.
  - priority competencies.
  - evidence strictness.
  - user-facing summary.
  - calibration notes.
- Prompt guardrails:
  - claim trong CV la unverified.
  - khong ket luan pass/fail.
  - khong bien fit score thap thanh behavior weakness.
  - raw risk la internal.
  - moi claim/risk phai co source span/summary.

Acceptance mapping voi BA:

- AC claim "led team" tao leadership/collaboration claim va risk mo.
- AC JD stakeholder management uu tien competency lien quan.
- AC fit score thap khong thanh behavior verdict.

### F29.2 - Calibration Builder Service

Backend:

- Tao `BehaviorCalibrationService`:
  - `buildFromCvOnly(userId, cvId)`
  - `buildFromJdOnly(userId, jdAnalysisId)`
  - `buildFromCvAndJd(userId, cvId, jdAnalysisId)`
  - `getLatestForUser(userId)`
- Sau `parseCv()`: build partial calibration tu CV neu co tin hieu.
- Sau `parseJd()`: build partial JD expectation, va build ready calibration neu co latest CV.
- Sau fit assessment: update calibration voi gap/fit signals.
- Versioning:
  - `internalVersion = behavior-calibration-v1`.
  - Neu CV/JD moi hon, tao/cap nhat calibration moi.

Acceptance:

- Chi co CV: co partial claim map, summary noi thieu JD.
- Chi co JD: co JD expectation, khong tao fake CV claim.
- Co ca hai: status `ready`.

### F29.3 - API Contracts

Backend:

- Mo rong job result cua `/documents/status/:jobId`:
  - `documentRecordId`
  - `fitScore`
  - `gapAnalysis`
  - `fitAssessment`
  - `calibrationStatus`
  - `behaviorSummary`
  - `missingSources`
- Mo rong `/documents/history`:
  - fit assessment summary.
  - calibration status.
  - user-facing behavior summary.
- Them endpoint read-only neu can:
  - `GET /documents/calibration/latest`
  - hoac `GET /behavioral/calibration/latest`

Can tranh endpoint tra raw internal risks cho candidate UI. Neu can cho admin/debug sau nay, tao permission rieng.

Acceptance:

- FE lay du summary ma khong can doc raw JSON noi bo.
- Stage 1 sau nay co endpoint/service de lay full internal calibration.

### F29.4 - Behavior Session Integration Boundary

Backend:

- `InterviewService.preflight()` them `behaviorCalibration` summary neu co.
- Session snapshot them `behaviorCalibrationSnapshot` cho behavior session sau nay.
- Chua tao `SessionPlan` trong feature nay.
- Neu level mismatch:
  - preflight tra flag.
  - FE sau nay co the yeu cau confirm level.

Acceptance:

- BA AC cuoi: Stage 1 co the dung `CandidateClaim[]`, `CalibrationProfile`, `RiskHypothesis[]` tu assessment.
- Feature 029 khong chon probe.

### F29.5 - Frontend Skill Passport

Frontend:

- `DocumentUploadZone` hien behavior summary sau job completed.
- `AssessmentHistory` hien behavior focus trong details.
- Them component nho:
  - `BehaviorCalibrationSummary`
  - props: `summary`, `status`, `missingSources`, `levelMismatch`
- Copywriting:
  - "Trong buoi phong van behavior, nen chuan bi evidence ve..."
  - "Phan nay la goi y luyen tap, khong phai ket luan tuyen dung."
- Khong hien:
  - raw risk labels.
  - internal weights.
  - prompt.
  - verdict.

Acceptance:

- UI dap ung BA UI Boundary.
- Candidate khong bi qua tai boi payload noi bo.

## Suggested Implementation Order

### Phase 1 - Safety va Source Of Truth

1. Remove PII logs and raw text job payload.
2. Add server-side file validation.
3. Add DB-backed document context service.
4. Update `InterviewService` to use DB fallback.
5. Add tests for Redis flush fallback.

Ly do: neu khong sua P0 nay truoc, calibration moi se tiep tuc phu thuoc Redis TTL va lam tang PII exposure.

### Phase 2 - Persistent Processing State

1. Add entity fields/migration for CV/JD processing state.
2. Move extraction/validation fully into worker.
3. Persist job status in DB.
4. Update frontend polling/result state.

Ly do: can state ben vung truoc khi them multi-step calibration.

### Phase 3 - Fit Assessment V2

1. Add typed `FitAssessmentV2`.
2. Add rubric prompt/schema.
3. Compute final score deterministic.
4. Persist breakdown and scoring version.
5. Keep backward-compatible `fitScore` and `matchReport`.

Ly do: behavior calibration can su dung gap/fit co giai thich, khong chi `%`.

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
- Behavior focus summary renders user-facing text only.
- Assessment history shows calibration badge.

Manual verification:

- Real sample CV/JD English.
- Real sample CV/JD Vietnamese.
- Short/blank document rejection.
- Large-but-valid 5MB boundary.
- Redis unavailable/miss scenario.

## Rollout Strategy

1. Merge P0 safety first behind normal code path.
2. Add DB fallback before changing FE.
3. Add new DB fields as backward-compatible nullable columns.
4. Keep old `fitScore` and `matchReport` response fields.
5. Gate calibration generation behind env flag initially:
   - `BEHAVIOR_CALIBRATION_ENABLED=true`
6. Enable for development/staging.
7. Validate logs contain no raw CV/JD.
8. Enable production after sample QA.

## Review Checklist

Before implementation starts, reviewer should confirm:

- Co chap nhan them `BehaviorCalibrationProfile` entity JSONB arrays hay muon normalize claims/risks thanh bang rieng ngay tu dau.
- Context edit truoc interview se persist theo cach nao: update current parsed context, tao override record, hay snapshot-only.
- Calibration endpoint nen nam trong `documents` hay `behavioral`.
- Retention policy cho uploaded original files: xoa sau parse hay giu co thoi han.
- Fit Assessment V2 weights mac dinh.
- Competency taxonomy nao la source of truth cho mapping behavior.

## Definition Of Done

- P0 safety hoan tat: khong log PII, DB source of truth, assessment rubric co evidence.
- P1 UX/worker/test/config hoan tat o muc khong con blocker production ro rang.
- Feature 029 co calibration artifact persist trong DB.
- Skill Passport hien behavior interview focus summary user-facing.
- Interview preflight co the lay calibration cho Stage 1, nhung chua chon probe trong feature nay.
- Backend and frontend build pass.
- Unit/integration tests cho cac case chinh pass.
