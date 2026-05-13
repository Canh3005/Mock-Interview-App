# Behavior Session Intelligence Design

Tài liệu này thiết kế lại behavior session như một **interview intelligence system**, không phải một chatbot hỏi đáp. Thiết kế này độc lập với flow hiện tại trong codebase; các khái niệm, stage, policy và data model bên dưới được chọn theo tiêu chí: đo đúng năng lực hành vi, ép câu trả lời có evidence, điều phối probe có chủ đích, chấm theo level, và biến kết quả thành coaching có thể luyện tiếp.

## Capability index

Các capability trong tài liệu mục tiêu được ký hiệu để dễ trace coverage:

| ID | Capability |
| --- | --- |
| C1 | Session competency modeling |
| C2 | Role-level calibration |
| C3 | Question selection |
| C4 | Probe generation |
| C5 | Evidence extraction |
| C6 | Generic answer detection |
| C7 | STAR and structure assessment |
| C8 | Session memory |
| C9 | Adaptive interview control |
| C10 | Rubric-based scoring |
| C11 | Level-aware feedback |
| C12 | Interviewer persona simulation |
| C13 | Pressure and constraint simulation |
| C14 | CV/JD-based behavioral mining |
| C15 | Risk signal detection |
| C16 | Coaching and rewrite capability |
| C17 | Progress tracking across sessions |
| C18 | Transcript, scorecard and audit trail |

## Design principles

1. **Evidence first, language second**

   AI không được chấm vì câu trả lời nghe hay. Mỗi score, risk, feedback hoặc rewrite phải trace được về evidence trong transcript, CV/JD claim, hoặc việc thiếu evidence.

   Covers: C5, C6, C10, C15, C18.

2. **Probe is the unit of interview**

   Behavior session không nên tổ chức quanh "stage chung chung". Đơn vị lõi phải là `Probe`: một mục tiêu kiểm chứng cụ thể gồm competency, expected signals, red flags, follow-up strategy, level expectation và scoring rubric.

   Covers: C1, C3, C4, C10, C18.

3. **The interviewer asks; the policy decides**

   LLM có thể viết câu hỏi tự nhiên, nhưng không được tự quyết định toàn bộ flow. Quyết định hỏi gì tiếp, dừng probe hay chuyển competency phải do `InterviewPolicy` dựa trên state có cấu trúc.

   Covers: C4, C8, C9, C13, C18.

4. **Level calibration is a first-class object**

   Junior, Mid, Senior, Lead không chỉ khác persona. Mỗi level phải có expected evidence, depth threshold, acceptable ambiguity và scoring anchor riêng.

   Covers: C2, C10, C11.

5. **Session memory is structured, not only summarized text**

   Summary tự do giúp prompt ngắn hơn nhưng không đủ để đánh giá pattern. Hệ thống phải lưu các pattern có cấu trúc như `missing_metric_count`, `we_vs_i_ratio`, `conflict_avoidance`, `probe_recovery`, `contradictions`.

   Covers: C8, C15, C17, C18.

6. **Coaching is generated from the same evidence graph as scoring**

   Feedback, rewrite và practice plan phải dùng lại evidence map. Không tạo lời khuyên mới không có căn cứ trong transcript.

   Covers: C11, C16, C17, C18.

## Target architecture

```text
CV/JD/Profile/History
        |
        v
Profile Mining Engine
        |
        v
Session Planner ------ Probe Bank / Competency Model / Level Calibration
        |
        v
Interview Runtime
  Ask -> Answer -> Turn Evaluation -> Policy Decision -> Next Probe/Challenge/Transition
        |
        v
Evidence Graph + Session Memory + Audit Trail
        |
        v
Session Scoring Engine
        |
        v
Coaching Engine -> Scorecard / Rewrite / Practice Plan / Progress Profile
```

Quyết định thiết kế: Tách hệ thống thành 3 lớp `Interview intelligence`, `Evaluation intelligence`, `Coaching intelligence`.

Lý do: Nếu một LLM prompt vừa hỏi, vừa nhớ, vừa chấm, vừa coach thì output khó kiểm soát, khó audit và dễ drift. Tách lớp giúp mỗi layer có contract rõ: interview layer tạo áp lực và thu evidence; evaluation layer biến transcript thành structured truth; coaching layer chuyển truth thành hành động cải thiện.

Covers: toàn bộ C1-C18.

## Core data model

Model convention:

- Trường nào có tập giá trị hữu hạn phải tạo enum/union type rõ ràng, không hardcode text trực tiếp trong model.
- Nếu enum/taxonomy đã tồn tại trong hệ thống thì phải tái sử dụng, ví dụ `QuestionProbeCompetency` từ `QUESTION_BANK_TAXONOMY.competencies`.
- Chỉ tạo enum mới khi đó là taxonomy mới chưa có owner trong codebase, ví dụ `CandidateClaimType` cho loại claim được mine từ CV/JD/profile.
- Field dạng free text chỉ dùng cho nội dung người dùng, mô tả, quote, reasoning hoặc dữ liệu chưa thể chuẩn hóa.

### SessionCompetency

Định nghĩa năng lực canonical dùng chung cho các vòng phỏng vấn.

```ts
type InterviewSessionType = 'behavior' | 'live_coding' | 'system_design';

type SessionCompetency = {
  id: string;
  sessionTypes: InterviewSessionType[];
  name: string;
  description: string;
  positiveSignals: string[];
  negativeSignals: string[];
  relatedRisks: HiringRiskType[];
};
```

Quyết định thiết kế: Competency phải độc lập với câu hỏi và được gắn với loại session bằng `sessionTypes`.

Lý do: Hệ thống có nhiều vòng như behavior, live coding và system design. Cùng một competency có thể được kiểm chứng qua nhiều probe khác nhau trong một hoặc nhiều loại session. Nếu competency bị hardcode trong prompt hoặc stage, hệ thống không đo được tiến bộ qua nhiều session.

Covers: C1, C10, C17.

### LevelExpectation

Chuẩn đánh giá theo role level.

```ts
type LevelExpectation = {
  roleFamily: string;
  level: 'junior' | 'mid' | 'senior' | 'lead';
  competencyId: string;
  mustHaveSignals: string[];
  strongSignals: string[];
  weakSignals: string[];
  dealBreakers: string[];
  depthRequirement: 'basic' | 'independent' | 'cross_team' | 'org_level';
};
```

Quyết định thiết kế: Level expectation phải là dữ liệu, không chỉ là wording trong prompt.

Lý do: Chấm theo level cần threshold cụ thể. Ví dụ, "tôi tự fix bug" có thể đủ cho Junior ownership nhưng yếu cho Senior nếu không có impact, trade-off hoặc mentoring.

Covers: C2, C10, C11.

### CalibrationProfile

Hồ sơ hiệu chuẩn cho một session cụ thể, được tạo sau intake và trước khi chọn probe.

```ts
import type {
  QuestionProbeCompetency,
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
} from '../server/src/question-bank/constants/question-bank-taxonomy.constants';

type SessionGoal =
  | 'screening'
  | 'deep_practice'
  | 'weakness_repair'
  | 'company_specific';

type CalibrationProfile = {
  id: string;
  targetRoleText: string;
  roleFamily: QuestionProbeRoleFamily;
  targetLevel: QuestionProbeLevel;
  sessionType: 'behavior';
  durationMinutes: number;
  sessionGoal: SessionGoal;
  language: QuestionProbeLanguage;
  levelExpectations: LevelExpectation[];
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Partial<Record<QuestionProbeCompetency, number>>;
  previousWeakCompetencies: QuestionProbeCompetency[];
  evidenceStrictness: 'standard' | 'strict' | 'very_strict';
  calibrationNotes: string[];
};
```

Quyết định thiết kế: `CalibrationProfile` không phải session plan và không chứa danh sách câu hỏi đã chọn. Nó là contract chuẩn hóa role, level, goal, duration, ngôn ngữ, competency priority và độ nghiêm evidence để `SessionPlanner` chọn probe nhất quán.

Lý do: Cùng một CV/JD có thể chạy nhiều session khác nhau. Ví dụ cùng Senior Backend nhưng session goal là `screening` cần coverage rộng hơn, còn `weakness_repair` cần tập trung vào competency yếu từ lịch sử trước đó. Nếu các yếu tố này nằm rải rác trong prompt, planner khó audit và dễ chọn câu hỏi lệch mục tiêu.

Covers: C1, C2, C3, C11, C14, C17.

### CandidateClaim

Claim được mine từ CV/JD/profile.

```ts
import type { QuestionProbeCompetency } from '../server/src/question-bank/constants/question-bank-taxonomy.constants';

type CandidateClaimType =
  | 'led_team'
  | 'owned_feature'
  | 'improved_metric'
  | 'handled_incident'
  | 'cross_functional'
  | 'mentored'
  | 'conflict'
  | 'failure'
  | 'domain_experience';

type CandidateClaim = {
  id: string;
  source: 'cv' | 'jd' | 'profile' | 'previous_session';
  text: string;
  claimType: CandidateClaimType;
  impliedCompetencies: QuestionProbeCompetency[];
  verificationPriority: 'high' | 'medium' | 'low';
  riskIfUnverified: HiringRiskType[];
};
```

Quyết định thiết kế: CV/JD mining tạo `CandidateClaim` trước session thay vì nhét raw CV vào prompt. `impliedCompetencies` phải lấy từ `QUESTION_BANK_TAXONOMY.competencies`; không tạo vocabulary competency riêng cho claim mining.

Lý do: Raw CV dài, nhiễu và khó điều phối. Claim map giúp session planner chọn đúng câu hỏi để kiểm chứng claim quan trọng như "led team", "improved performance", "owned architecture".

Covers: C3, C14, C15.

### RiskHypothesis

Giả thuyết rủi ro tuyển dụng cần kiểm chứng trong session.

```ts
import type {
  QuestionProbeCompetency,
  QuestionProbeType,
} from '../server/src/question-bank/constants/question-bank-taxonomy.constants';

type HiringRiskType =
  | 'overstated_ownership'
  | 'missing_business_impact'
  | 'weak_conflict_handling'
  | 'weak_technical_depth'
  | 'poor_tradeoff_reasoning'
  | 'low_learning_agility'
  | 'generic_answering'
  | 'claim_without_evidence'
  | 'level_mismatch'
  | 'communication_gap';

type RiskHypothesis = {
  id: string;
  source: 'cv' | 'jd' | 'profile' | 'previous_session' | 'system_inference';
  sourceClaimIds: string[];
  riskType: HiringRiskType;
  description: string;
  affectedCompetencies: QuestionProbeCompetency[];
  severity: 'low' | 'medium' | 'high';
  verificationPriority: 'low' | 'medium' | 'high';
  evidenceNeededToReject: string[];
  probeSelectionHints: {
    preferredCompetencies: QuestionProbeCompetency[];
    preferredProbeTypes: QuestionProbeType[];
    avoidProbeIds?: string[];
  };
  status: 'open' | 'confirmed' | 'rejected' | 'inconclusive';
};
```

Quyết định thiết kế: `RiskHypothesis` là mục tiêu kiểm chứng, không phải kết luận. Nó bắt đầu với `status: 'open'` và chỉ được đổi sang `confirmed`, `rejected` hoặc `inconclusive` khi có evidence từ transcript hoặc khi session kết thúc mà vẫn thiếu evidence.

Lý do: Behavior interview cần kiểm chứng rủi ro, không chỉ hỏi theo checklist. Ví dụ CV ghi "led team" nhưng thiếu metric và thiếu decision ownership thì hệ thống có thể tạo risk `overstated_ownership` hoặc `missing_business_impact`, sau đó planner ưu tiên probe về ownership, conflict handling, communication và impact measurement.

Covers: C3, C5, C10, C14, C15, C18.

### QuestionProbe

Đơn vị hỏi và chấm cốt lõi phải tái sử dụng `QuestionProbe` có sẵn trong question bank.

```ts
import type { QuestionProbe } from '../server/src/question-bank/entities/question-probe.entity';

type PlannedProbe = {
  questionProbeId: QuestionProbe['id'];
  questionProbeRevision: QuestionProbe['revision'];
  plannedOrder: number;
  selectionReason: string;
  estimatedMinutes: number;
  targetClaimIds: string[];
};
```

Quyết định thiết kế: Không tạo model `InterviewProbe` riêng. Session planner phải lấy probe từ `QuestionProbe` và chỉ bọc thêm metadata runtime trong `PlannedProbe`.

Lý do: `QuestionProbe` đã là source of truth hiện có cho question bank, gồm `stages`, `roleFamilies`, `levels`, `type`, `competencies`, `intent`, `primaryQuestion`, `expectedSignals`, `redFlags`, `scoringHints`, `followUps`, `localizedContent`, `status` và `revision`. Tạo thêm `InterviewProbe` sẽ làm lệch taxonomy, duplicate dữ liệu, khó audit và khó tái sử dụng UI/API hiện có.

Các chỉnh sửa cần ghi nhận:

| Cần chỉnh sửa | Lý do |
| --- | --- |
| Thay mọi tham chiếu model `InterviewProbe` trong behavior intelligence bằng `QuestionProbe`. | Dùng lại entity và taxonomy đã có trong hệ thống, tránh tạo vocabulary song song. |
| `SessionPlan.selectedProbes` và `fallbackProbes` lưu `PlannedProbe[]`, trong đó reference `questionProbeId` + `questionProbeRevision`. | Session cần biết probe nào đã được chọn và audit đúng phiên bản probe tại thời điểm chạy session. |
| `estimatedMinutes`, `plannedOrder`, `selectionReason`, `targetClaimIds` nằm ở `PlannedProbe`, không nằm trong `QuestionProbe`. | Đây là dữ liệu phụ thuộc từng session, không phải thuộc tính canonical của câu hỏi. |
| `pressureOptions` không đưa vào `QuestionProbe`. Pressure phải đi qua `PersonaPolicy`, `PressureProfile` và runtime policy. | Cùng một probe có thể chạy với nhiều persona/pressure khác nhau. |
| Nếu cần scoring sâu hơn, nâng cấp dần `QuestionProbe.expectedSignals`, `redFlags`, `scoringHints`, `followUps` từ text/hint hiện tại sang cấu trúc typed có enum. | Runtime adaptive cần signal id, severity, risk type, level anchor và follow-up reason để chấm/audit ổn định hơn. |

Covers: C3, C4, C5, C10, C15, C18.

### SessionPlan

Kế hoạch buổi phỏng vấn.

```ts
type SessionPlan = {
  sessionId: string;
  targetRole: string;
  targetLevel: string;
  durationMinutes: number;
  sessionGoal: SessionGoal;
  personaId: string;
  pressureProfileId: string;
  selectedProbes: PlannedProbe[];
  coverageTarget: Record<string, number>;
  fallbackProbes: PlannedProbe[];
};
```

Quyết định thiết kế: Plan phải được tạo trước khi vào phòng, nhưng được phép adapt trong runtime.

Lý do: Không có plan thì AI hỏi ngẫu nhiên. Nhưng plan cứng tuyệt đối sẽ bỏ lỡ tín hiệu phát sinh trong câu trả lời thật. Cách tốt nhất là fixed objective, adaptive execution.

Covers: C3, C8, C9, C14.

### TurnEvaluation

Kết quả đánh giá từng câu trả lời.

```ts
type TurnEvaluation = {
  turnId: string;
  probeId: string;
  extractedEvidence: EvidenceItem[];
  signalCoverage: SignalCoverage[];
  starStructure: StarSubstanceScore;
  genericAnswerRisk: RiskLevel;
  hiringRiskSignals: HiringRiskSignal[];
  followUpNeed: FollowUpNeed[];
  probeResilience: ProbeResilienceSnapshot;
  confidence: 'high' | 'medium' | 'low';
};
```

Quyết định thiết kế: Mỗi user answer phải được evaluate ngay sau turn.

Lý do: Nếu chỉ chấm cuối session, interviewer không biết cần probe thêm điểm nào. Turn-level evaluation là điều kiện bắt buộc để flow adaptive thật.

Covers: C4, C5, C6, C7, C9, C15.

### EvidenceGraph

Bản đồ bằng chứng xuyên suốt session.

```ts
type EvidenceGraph = {
  evidenceItems: EvidenceItem[];
  claimVerifications: ClaimVerification[];
  competencyEvidence: Record<string, string[]>;
  contradictions: Contradiction[];
  missingEvidence: MissingEvidenceItem[];
};
```

Quyết định thiết kế: Scorecard phải render từ EvidenceGraph, không render trực tiếp từ transcript raw.

Lý do: Transcript là dữ liệu thô. EvidenceGraph là dữ liệu đã phân loại, có thể audit, aggregate và dùng lại cho coaching.

Covers: C5, C8, C10, C15, C18.

### BehaviorProgressProfile

Hồ sơ tiến bộ qua nhiều session.

```ts
type BehaviorProgressProfile = {
  userId: string;
  competencyTrend: Record<string, TrendPoint[]>;
  recurringWeaknesses: RecurringWeakness[];
  recurringStrengths: RecurringStrength[];
  failedProbePatterns: FailedProbePattern[];
  readinessScoreHistory: TrendPoint[];
  lastPracticePlan: PracticeTask[];
};
```

Quyết định thiết kế: Progress profile chỉ lưu pattern và score đã chuẩn hóa, không lưu mọi raw transcript làm source chính.

Lý do: Cross-session tracking cần dữ liệu so sánh được. Transcript raw quá dài và dễ làm LLM bị nhiễu bởi chi tiết cũ.

Covers: C17, C18.

## New session flow

### Stage 0 - Intake and calibration

Input:

- CV/profile.
- JD/target role.
- Candidate-selected level hoặc system-inferred level.
- Session duration.
- Session goal.
- Previous weakness history nếu có.
- Persona/pressure preference nếu user chọn.

Processing:

1. Parse CV/JD thành structured facts.
2. Extract `CandidateClaim`.
3. Map target role + level vào `LevelExpectation`.
4. Select priority competencies.
5. Build risk hypotheses.

Output:

- `CandidateClaim[]`.
- `CalibrationProfile`.
- `RiskHypothesis[]`.

Quyết định thiết kế: Intake phải tạo risk hypotheses trước khi chọn câu hỏi.

Lý do: Behavior interview thực tế không hỏi để phủ checklist đơn thuần; nó kiểm chứng rủi ro tuyển dụng. Ví dụ, CV ghi "led team" nhưng level là Senior thì risk cần kiểm chứng là leadership maturity, delegation, conflict mediation và ownership.

Covers: C1, C2, C3, C14, C15.

### Stage 1 - Session planning

Processing:

1. Chọn probe theo role, level, CV/JD claims, previous weak areas, duration.
2. Allocate thời lượng theo priority.
3. Tạo `coverageTarget` theo competency.
4. Chọn fallback probes cho tình huống thiếu evidence hoặc user không có story phù hợp.
5. Chọn persona và pressure profile.

Output:

- `SessionPlan`.

Quyết định thiết kế: Mỗi session nên có 3-5 primary probes thay vì 6 stage cố định.

Lý do: Behavior session tốt cần đào sâu. Hỏi quá nhiều topic làm mất probe depth. Với 20-30 phút, 3-5 probes đủ để kiểm tra pattern hành vi và probe resilience.

Covers: C3, C4, C8, C9, C12, C13.

### Stage 2 - Opening contract

Interviewer mở đầu ngắn:

- Xác nhận role/level/session goal.
- Nói rõ sẽ hỏi follow-up sâu.
- Không dạy STAR ngay trong interview mode.
- Với practice mode, có thể cho user biết sau buổi sẽ có coaching detail.

Quyết định thiết kế: Trong interview runtime, không hiển thị coaching quá sớm.

Lý do: Nếu user nhận feedback live quá nhiều, session chuyển thành guided writing exercise, không còn mô phỏng phỏng vấn. Coaching nên nằm sau evaluation hoặc trong mode luyện riêng.

Covers: C9, C13, C16.

### Stage 3 - Probe loop

Mỗi planned probe chạy theo vòng:

```text
Ask opening question
User answers
Turn evaluation
Policy decision:
  - enough evidence -> close probe
  - missing signal -> ask targeted follow-up
  - generic answer -> ask specificity challenge
  - risk signal -> ask risk verification follow-up
  - contradiction -> ask clarification
  - time pressure -> ask concise answer
  - no viable story -> switch to fallback probe
```

Quyết định thiết kế: Follow-up phải được chọn từ `FollowUpNeed`, không chỉ sinh tự do từ LLM.

Lý do: Follow-up là nơi quyết định chất lượng behavior interview. Nếu LLM tự do hỏi, nó dễ hỏi câu nghe tự nhiên nhưng không kiểm chứng được missing evidence. `FollowUpNeed` giúp probe tập trung vào context, personal contribution, metric, conflict, reflection hoặc risk cụ thể.

Covers: C4, C5, C6, C7, C9, C15.

### Stage 4 - Adaptive transition

Probe được đóng khi đạt một trong các điều kiện:

- Đủ must-have signals cho level.
- Đã xác nhận hoặc bác bỏ risk hypothesis.
- User fail sau số probe tối đa và confidence đủ cao.
- Hết time budget cho probe.
- Câu trả lời không còn tạo thêm evidence mới.

Quyết định thiết kế: Không để user tự quyết định khi nào chuyển câu trong interview mode.

Lý do: Interviewer thật điều phối flow dựa trên evidence và time budget. Nếu user tự bấm next, hệ thống không thể kiểm tra khả năng chịu probe và không có policy kiểm soát coverage.

Covers: C4, C8, C9, C13.

### Stage 5 - Session-level synthesis

Sau runtime:

1. Gom EvidenceGraph.
2. Tính competency score.
3. Tính risk score.
4. Tính probe resilience.
5. Tính communication/structure score.
6. Kiểm tra consistency.
7. Tạo audit trail.

Quyết định thiết kế: Tổng điểm là aggregate từ probe/competency score, không phải LLM tự cho một số tổng.

Lý do: Điểm tổng phải giải thích được. Aggregate deterministic giúp score ổn định, còn LLM chỉ dùng để extract/phrase trong giới hạn schema.

Covers: C5, C8, C10, C15, C18.

### Stage 6 - Coaching debrief

Debrief gồm:

- Overall readiness.
- Competency scorecard.
- Evidence map.
- Probe-by-probe feedback.
- Red flags with quotes.
- Level gap explanation.
- Best answer rewrite.
- Practice plan.

Quyết định thiết kế: Rewrite chỉ được dùng facts user đã cung cấp và phải đánh dấu chỗ cần user bổ sung.

Lý do: Coaching không được bịa thành tích. Nếu hệ thống tự thêm metric hoặc outcome, user sẽ học một câu trả lời không thật và có thể fail ở interview thật.

Covers: C11, C16, C18.

### Stage 7 - Progress update

Sau debrief:

1. Update BehaviorProgressProfile.
2. Detect recurring weakness.
3. Update readiness trend.
4. Generate next session recommendation.
5. Recommend targeted single-probe practice.

Quyết định thiết kế: Progress tracking phải dựa trên competency/probe outcomes, không dựa trên total score đơn lẻ.

Lý do: Tổng điểm có thể tăng vì session dễ hơn. Competency/probe trend mới cho biết user thật sự cải thiện ở ownership, metric, conflict handling hay probe resilience.

Covers: C17, C18.

## Interview intelligence

### I1 - Canonical competency model

Decision:

Tạo taxonomy `SessionCompetency` canonical. Với `sessionTypes: ['behavior']`, tối thiểu gồm:

- Ownership.
- Collaboration.
- Conflict handling.
- Communication clarity.
- Handling ambiguity.
- Prioritization.
- Learning from failure.
- Stakeholder management.
- Leadership maturity.
- Integrity/accountability.
- Impact orientation.
- Adaptability.

Mỗi competency có `sessionTypes`, positive signals, negative signals, related risks và level expectation.

Reason:

Đây là xương sống của session. Nếu competency không chuẩn hóa, question selection, scoring, coaching và progress tracking sẽ không cùng ngôn ngữ.

Covers: C1, C2, C10, C17.

### I2 - Role-level calibration matrix

Decision:

Mỗi role family + level có `LevelExpectation` riêng. Ví dụ:

| Level | Ownership expectation |
| --- | --- |
| Junior | Nhận task rõ, báo blocker sớm, học từ feedback |
| Mid | Tự chia nhỏ vấn đề, chủ động phối hợp, chịu trách nhiệm outcome của feature |
| Senior | Ra quyết định trong ambiguity, quản lý trade-off, tạo impact cross-team |
| Lead | Delegate, align stakeholder, xử lý conflict và nâng health của team |

Reason:

Cùng một câu trả lời không thể chấm giống nhau cho mọi level. Calibration matrix giúp scoring khách quan hơn và feedback nói đúng "thiếu gì so với level".

Covers: C2, C10, C11.

### I3 - CV/JD behavioral mining

Decision:

Trước session, hệ thống mine CV/JD thành claim map:

- "Led team" -> leadership, delegation, conflict, mentoring.
- "Improved performance" -> impact orientation, metric, ownership.
- "Worked with PM/design" -> stakeholder management, prioritization.
- "Handled incident" -> accountability, ambiguity, communication under pressure.
- JD yêu cầu "cross-functional" -> conflict/prioritization probes.

Reason:

Behavior session có giá trị nhất khi hỏi vào claim thật của candidate. Generic question list không kiểm chứng được candidate có thật sự làm những gì họ nói trong CV hay không.

Covers: C3, C14, C15.

### I4 - Probe bank as source of truth

Decision:

Tất cả opening questions và follow-ups phải xuất phát từ `QuestionProbe`, không sinh hoàn toàn từ prompt trống.

Reason:

Question bank đảm bảo mỗi câu hỏi có intent, expected signals, red flags, scoring hints và follow-ups. LLM chỉ render câu hỏi tự nhiên theo persona/context.

Covers: C3, C4, C10, C18.

### I5 - Session planner

Decision:

Session planner chọn probes bằng scoring function:

```text
probe_priority =
  role_level_fit
  + jd_relevance
  + cv_claim_verification_value
  + previous_weakness_weight
  + risk_hypothesis_weight
  - recent_repetition_penalty
```

Reason:

Best selection không phải random và cũng không phải chỉ filter role/level. Nó phải tối ưu coverage, risk verification và thời lượng.

Covers: C3, C14, C15, C17.

### I6 - Persona policy

Decision:

Persona là policy object gồm tone, pressure, verbosity, challenge style, silence behavior:

- Friendly.
- Silent/low-feedback.
- Skeptical.
- Detail-oriented.
- Senior engineering manager.
- Product-oriented.
- Cross-functional stakeholder.

Reason:

Persona không nên chỉ là prompt name. Nó ảnh hưởng đến follow-up strategy, pressure intensity, response length và challenge threshold.

Covers: C12, C13.

### I7 - Runtime state machine

Decision:

Interview runtime dùng state machine:

```text
PLANNED
OPENING
ASKING_PROBE
WAITING_ANSWER
EVALUATING_TURN
DECIDING_NEXT_ACTION
ASKING_FOLLOW_UP
CHALLENGING
TRANSITIONING_PROBE
SESSION_SYNTHESIS
COACHING_READY
```

Reason:

State machine giúp hệ thống không lẫn giữa hỏi, chấm, chuyển câu và coaching. Nó cũng giúp audit vì mỗi transition có reason.

Covers: C4, C8, C9, C13, C18.

### I8 - Adaptive probe policy

Decision:

Policy quyết định next action theo matrix:

| Condition | Action |
| --- | --- |
| Missing personal contribution | Ask "I vs team" follow-up |
| Missing metric/result | Ask impact measurement follow-up |
| Generic answer risk high | Ask specificity challenge |
| Blame shifting detected | Ask ownership/reflection probe |
| Contradiction detected | Ask clarification |
| Enough evidence | Close probe |
| Time low | Ask concise final evidence question |

Reason:

Đây là khác biệt giữa chatbot và interviewer. Adaptive policy làm cho probe phản ứng với câu trả lời thật nhưng vẫn có mục tiêu rõ.

Covers: C4, C5, C6, C8, C9, C15.

### I9 - Pressure and constraint policy

Decision:

Pressure không bật ngẫu nhiên. Nó được kích hoạt theo level, persona và session goal:

- Junior: pressure thấp, chủ yếu hỏi clarify.
- Mid: pressure trung bình, challenge vague answer.
- Senior: pressure cao hơn, hỏi trade-off, contradiction, stakeholder impact.
- Lead: pressure về conflict, delegation, org impact.

Reason:

Áp lực sai mức làm user học sai. Junior cần được kiểm tra reliability và learning; Senior cần chịu challenge về ambiguity và impact.

Covers: C2, C12, C13.

## Evaluation intelligence

### E1 - Turn-level evidence extraction

Decision:

Sau mỗi answer, extract structured evidence:

- Context.
- Personal action.
- Team action.
- Decision.
- Constraint.
- Conflict.
- Stakeholder.
- Metric/result.
- Reflection.
- Unverified claim.

Reason:

Không có evidence extraction theo turn thì interviewer không biết thiếu gì để probe. Chấm cuối buổi không sửa được flow trong lúc session đang diễn ra.

Covers: C5, C7, C9, C18.

### E2 - Signal coverage scoring

Decision:

Mỗi expected signal có status:

- `covered`: có quote/evidence rõ.
- `unclear`: có nhắc tới nhưng thiếu cụ thể.
- `missing`: không có evidence.
- `contradicted`: bị mâu thuẫn với evidence khác.

Reason:

Binary pass/fail quá thô. `unclear` là trạng thái quan trọng trong behavioral interview vì nhiều câu trả lời nghe đúng nhưng chưa đủ kiểm chứng.

Covers: C5, C10, C15, C18.

### E3 - Generic answer detector

Decision:

Generic risk được tính bằng rule + LLM extraction:

- Thiếu timeline.
- Thiếu metric.
- Thiếu personal contribution.
- Dùng nhiều abstract values nhưng ít nouns/events cụ thể.
- Không có constraint.
- Không có consequence.
- Không survive follow-up.

Reason:

Generic answer detection không nên phụ thuộc hoàn toàn vào cảm giác LLM. Các dấu hiệu này có thể đo được tương đối ổn bằng structured checks.

Covers: C6, C15.

### E4 - STAR substance assessment

Decision:

STAR score tách làm 2 lớp:

- Structure: có Situation/Task/Action/Result/Reflection không.
- Substance: mỗi phần có credible evidence không.

Reason:

Một câu trả lời có thể đúng format STAR nhưng vẫn rỗng. Behavior session cần tránh reward format mà thiếu substance.

Covers: C7, C10, C11.

### E5 - Risk signal detection

Decision:

Risk signals được extract liên tục:

- Overclaiming.
- Blame shifting.
- Low ownership.
- Poor self-awareness.
- Weak collaboration.
- Defensive response.
- No measurable impact.
- Inability to reflect.
- Inconsistent story.
- Communication rambling.

Mỗi risk có severity, evidence quotes, confidence và recommended verification probe.

Reason:

Hiring risk là mục tiêu thật của behavior interview. Phát hiện risk nhưng không probe lại là chưa đủ; risk cần kích hoạt follow-up.

Covers: C15, C4, C9.

### E6 - Probe resilience score

Decision:

Đo riêng khả năng sống sót qua follow-up:

- Answer improved after probe.
- Became more concrete.
- Could defend decision.
- Could admit uncertainty.
- Could reflect without defensiveness.
- Collapsed into generic answer.

Reason:

Nhiều candidate chuẩn bị câu đầu rất tốt. Probe resilience mới phân biệt experience thật với câu chuyện học thuộc.

Covers: C4, C6, C9, C10, C15.

### E7 - Structured session memory

Decision:

Session memory lưu pattern counters:

- Missing metric count.
- Missing personal contribution count.
- We-vs-I ratio.
- Conflict avoidance count.
- Reflection quality trend.
- Probe recovery rate.
- Contradiction list.
- Rambling turns.

Reason:

Behavior session đánh giá pattern, không chỉ answer đơn lẻ. Structured memory giúp final score và coaching nhất quán hơn.

Covers: C8, C15, C17.

### E8 - Deterministic scoring aggregate

Decision:

Tổng điểm được aggregate từ:

```text
competency_score = weighted_signal_coverage
                 + evidence_quality
                 + level_depth_fit
                 + probe_resilience
                 - risk_penalty

readiness_score = weighted_average(competency_scores)
                + communication_adjustment
                - major_risk_penalty
```

Reason:

LLM có thể hỗ trợ extract và explain, nhưng aggregate score nên deterministic để ổn định, test được và audit được.

Covers: C10, C11, C18.

### E9 - Audit trail

Decision:

Mỗi score và decision lưu:

- Probe asked.
- User answer quote.
- Extracted evidence.
- Missing signals.
- Follow-up reason.
- Risk signal.
- Policy decision.
- Score contribution.

Reason:

User cần biết vì sao bị chấm. Internal team cũng cần audit để cải thiện prompt/probe/rubric và debug AI drift.

Covers: C18, C5, C10, C15.

## Coaching intelligence

### C1 - Level-aware feedback

Decision:

Feedback format bắt buộc:

```text
For your target level: <pass/borderline/not enough evidence>
Evidence that works: ...
Evidence that is missing: ...
Why an interviewer may doubt this: ...
What a stronger <level> answer would include: ...
```

Reason:

Feedback chung chung không giúp user cải thiện. Level-aware feedback biến rubric thành expectation cụ thể.

Covers: C11, C16.

### C2 - Evidence-preserving answer rewrite

Decision:

Rewrite có 3 phần:

1. `Cleaned version`: chỉ dùng facts user đã nói.
2. `Stronger version with placeholders`: thêm placeholder như `[add metric]`, `[name stakeholder]`.
3. `What not to say`: đoạn nên bỏ vì lan man hoặc defensive.

Reason:

Rewrite tốt phải giúp user nói thật tốt hơn, không bịa câu chuyện tốt hơn.

Covers: C16, C11, C18.

### C3 - Practice plan generation

Decision:

Practice plan gồm task nhỏ theo weakness:

- Nếu thiếu metric: bài luyện "add baseline/result".
- Nếu thiếu personal contribution: bài luyện "convert we to I".
- Nếu né conflict: bài luyện conflict probe.
- Nếu yếu reflection: bài luyện "what would you do differently".
- Nếu rambling: bài luyện 90-second answer.

Reason:

Mock interview có giá trị thực tế khi biến diagnosis thành training loop.

Covers: C16, C17.

### C4 - Progress tracking

Decision:

Sau mỗi session, update:

- Competency trend.
- Repeated missing signals.
- Failed probe types.
- Risk trend.
- Readiness score.
- Coaching task completion.

Reason:

User luyện nhiều lần cần thấy mình tiến bộ ở đâu. Total score không đủ vì session khác nhau có độ khó khác nhau.

Covers: C17, C10, C11.

### C5 - Candidate-facing scorecard

Decision:

Scorecard có các section:

- Overview readiness.
- Competency scores.
- Probe list.
- Evidence map.
- Risk signals.
- STAR/substance breakdown.
- Level gap.
- Rewrite.
- Practice plan.

Reason:

Behavioral feedback cần minh bạch và có thể hành động. Scorecard không chỉ là điểm số mà là bản đồ cải thiện.

Covers: C10, C11, C16, C18.

### C6 - Coaching mode separate from interview mode

Decision:

Tách:

- `Interview mode`: ít gợi ý, mô phỏng áp lực thật.
- `Practice mode`: có hint, STAR guide, live structure feedback nếu user chọn.
- `Coaching mode`: sau session, rewrite và drill.

Reason:

Một sản phẩm luyện tập tốt cần cả mô phỏng thật và luyện có hỗ trợ, nhưng không nên trộn hai thứ trong cùng runtime mặc định.

Covers: C9, C13, C16, C17.

## Policy details

### Follow-up selection

Priority order:

1. Clarify contradiction.
2. Verify high-severity risk.
3. Fill must-have signal for level.
4. Probe personal contribution.
5. Probe impact/metric.
6. Probe reflection.
7. Increase pressure if answer remains generic.
8. Close probe if enough evidence.

Decision:

Follow-up priority phải explicit và deterministic.

Reason:

Nếu nhiều gaps xuất hiện cùng lúc, AI thường hỏi dàn trải. Priority giúp mỗi turn chỉ đào sâu một điểm quan trọng nhất.

Covers: C4, C9, C15.

### Stop condition

Một probe dừng khi:

- Must-have signal coverage >= threshold.
- Không còn high-priority missing signal trong time budget.
- Risk đã verified hoặc dismissed.
- Candidate failed the same signal after max follow-ups.
- Time budget reached.

Decision:

Max follow-ups mặc định:

- Junior: 1-2.
- Mid: 2-3.
- Senior/Lead: 3-4.

Reason:

Senior cần chịu probe sâu hơn vì expectation cao hơn. Nhưng probe vô hạn làm session mất cân bằng coverage.

Covers: C2, C4, C9, C13.

### Challenge policy

Decision:

Challenge dùng khi:

- Candidate overclaims.
- Candidate dùng "we" nhiều nhưng thiếu "I".
- Candidate đổ lỗi.
- Candidate nêu result lớn nhưng không có metric/baseline.
- Candidate né conflict/failure.

Challenge không dùng khi:

- Candidate đang trả lời đủ evidence.
- Candidate là Junior và thiếu confidence nhưng không có risk nghiêm trọng.
- Session goal là gentle practice.

Reason:

Challenge đúng lúc tạo giá trị; challenge sai lúc làm user phòng thủ và giảm chất lượng luyện tập.

Covers: C12, C13, C15.

## Recommended implementation phases

### Phase 1 - Foundation model

Build:

- Canonical competency taxonomy.
- Level expectation matrix.
- Probe schema.
- Evidence schema.
- SessionPlan schema.

Why first:

Không có data contract thì mọi prompt và UI sau đó sẽ drift.

Covers: C1, C2, C3, C5, C10, C18.

### Phase 2 - Probe-aware interview runtime

Build:

- Session planner.
- Runtime state machine.
- Probe loop.
- Follow-up policy.
- Persona/pressure policy.

Why second:

Interview intelligence phải tạo đúng transcript trước khi scoring có ý nghĩa.

Covers: C3, C4, C8, C9, C12, C13, C14.

### Phase 3 - Turn evaluation engine

Build:

- Evidence extractor.
- Signal coverage evaluator.
- Generic answer detector.
- STAR substance evaluator.
- Risk signal detector.
- Probe resilience evaluator.

Why third:

Adaptive interview control phụ thuộc vào turn evaluation. Đây là lõi phân biệt hệ thống với chatbot.

Covers: C5, C6, C7, C8, C9, C15.

### Phase 4 - Scorecard and audit

Build:

- Competency scoring.
- Risk-adjusted readiness score.
- Evidence map.
- Probe audit trail.
- Candidate-facing scorecard.

Why fourth:

Sau khi runtime và evaluation có structured data, scorecard mới đáng tin và giải thích được.

Covers: C10, C11, C15, C18.

### Phase 5 - Coaching intelligence

Build:

- Level-aware feedback.
- Evidence-preserving rewrite.
- Practice plan.
- Drill recommendation.
- Practice mode variants.

Why fifth:

Coaching tốt phải dựa trên evidence và scorecard đã ổn định, không nên xây trên nhận xét chung.

Covers: C11, C16, C17.

### Phase 6 - Progress loop

Build:

- BehaviorProgressProfile.
- Cross-session trend.
- Weakness recurrence.
- Readiness trend.
- Next-session planner using history.

Why sixth:

Progress tracking cần dữ liệu chuẩn hóa từ nhiều session. Làm quá sớm sẽ chỉ lưu analytics nhiễu.

Covers: C17, C3, C10, C11.

## Full coverage matrix

| Capability | Covered by design |
| --- | --- |
| C1 Session competency modeling | SessionCompetency, canonical taxonomy, competency score |
| C2 Role-level calibration | LevelExpectation, calibration matrix, level-specific stop/probe/challenge policy |
| C3 Question selection | SessionPlanner, probe priority scoring, CV/JD/history-aware selection |
| C4 Probe generation | QuestionProbe, FollowUpNeed, adaptive probe policy |
| C5 Evidence extraction | TurnEvaluation, EvidenceGraph, evidence item schema |
| C6 Generic answer detection | Generic answer detector, specificity challenge, probe resilience |
| C7 STAR and structure assessment | STAR structure + substance evaluator |
| C8 Session memory | Structured session memory, pattern counters, contradiction list |
| C9 Adaptive interview control | Runtime state machine, policy decision, stop condition |
| C10 Rubric-based scoring | Probe rubric, competency score, deterministic aggregate |
| C11 Level-aware feedback | Level-aware debrief format, level gap explanation |
| C12 Interviewer persona simulation | Persona policy object |
| C13 Pressure and constraint simulation | Pressure profile, challenge policy, time/concise-answer policy |
| C14 CV/JD-based behavioral mining | CandidateClaim, risk hypotheses, session planning input |
| C15 Risk signal detection | HiringRiskSignal, risk verification probes, risk-adjusted scoring |
| C16 Coaching and rewrite capability | Evidence-preserving rewrite, practice plan, coaching mode |
| C17 Progress tracking across sessions | BehaviorProgressProfile, trend and recurrence tracking |
| C18 Transcript, scorecard and audit trail | EvidenceGraph, audit trail, probe list, scorecard |

## Non-goals

- Không dùng một prompt duy nhất để vừa hỏi vừa chấm vừa coach.
- Không để LLM tự chọn câu hỏi ngẫu nhiên trong runtime.
- Không chấm điểm dựa trên transcript raw mà không có evidence map.
- Không hiển thị raw rubric nội bộ cho user trước khi trả lời.
- Không rewrite bằng cách thêm thành tích, metric hoặc outcome user chưa nói.
- Không coi total score là tín hiệu tiến bộ duy nhất.

## Definition of done

Một behavior session được coi là đạt chuẩn khi:

- Mỗi câu hỏi có probe intent và competency rõ.
- Mỗi follow-up có reason từ policy.
- Mỗi score có evidence hoặc missing evidence.
- Mỗi risk flag có quote hoặc reason thiếu evidence.
- Session memory chỉ ra pattern xuyên suốt buổi.
- Feedback nói rõ gap theo target level.
- Rewrite không bịa fact.
- Practice plan nối trực tiếp với weakness.
- Progress profile được update sau session.
- User có thể xem transcript, probe list, evidence map, scorecard và audit trail ở mức dễ hiểu.
