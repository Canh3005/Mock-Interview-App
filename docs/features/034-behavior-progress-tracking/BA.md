# BA.md — 034 Behavior Progress Tracking (Stage 7)

## WHAT

Ngay sau khi Stage 5 (session synthesis) hoàn tất và `BehaviorScorecardData` được persist vào `BehavioralSession.finalScore`, hệ thống tự động chạy một pipeline cập nhật hồ sơ tiến bộ dài hạn của user. Kết quả là `BehaviorProgressProfile` được cập nhật với competency trend mới, các signal weakness lặp lại được phát hiện ở mức `(signalKey)`, failed probe pattern được ghi nhận, và hệ thống đưa ra recommendation cho session luyện tiếp theo.

Stage 6 (coaching debrief) không phải trigger và không cung cấp input gì thêm cho pipeline này. Stage 6 chỉ render coaching content ra UI từ `BehaviorScorecardData` đã có.

## WHY

Người dùng luyện nhiều session nhưng chưa có cơ chế đo xem họ thực sự cải thiện ở đâu. Total score không đủ vì session dễ hơn có thể cho điểm cao hơn mà không phản ánh tiến bộ thật. Signal-level trend mới phân biệt được: user đang lặp lại miss cùng một signal cụ thể hay đã thực sự cải thiện từng competency qua các session khác nhau.

Covers: **C17** (Progress tracking across sessions), **C10** (Rubric-based scoring), **C11** (Level-aware feedback).

## SCOPE

**Trong scope:**

- Pipeline trigger ngay sau Stage 5 synthesis persist thành công
- Input duy nhất: `BehaviorScorecardData` từ `BehavioralSession.finalScore`
- Cập nhật `BehaviorProgressProfile`: competency trend, readiness trend
- Theo dõi signal-level weakness: track theo `signalKey`, chỉ đưa vào `recurringWeaknesses` khi đạt threshold
- Phát hiện recurring strength: signal covered ổn định >= N session liên tiếp
- Detect failed probe pattern: probe `collapsed` trong `probeResilience`
- Generate practice plan từ recurring weakness
- Generate next session recommendation: `suggestedGoal` + `suggestedLevel` tách biệt
- Idempotency đảm bảo bởi ledger `behavior_progress_session_log` với unique constraint `(userId, sessionId)`

**Ngoài scope:**

- UI progress dashboard (feature riêng)
- Cross-user analytics / leaderboard
- Thay đổi cách tính score trong session (thuộc F033)
- Cập nhật F030 calibration service để đọc từ `BehaviorProgressProfile` thay vì `UserProfile.weaknessHistory` (ghi nhận ở integration note, implement ở feature sau)

## Epic Context

Feature này là Stage 7 trong thiết kế behavior session intelligence.

Depends on:

- **F033 — behavior-session-synthesis-scorecard**: tạo và persist `BehaviorScorecardData` vào `BehavioralSession.finalScore`. F034 đọc từ đây.

Provides output for (future):

- **F030 — behavior-session-planning**: `CalibrationProfile.previousWeakCompetencies` hiện đọc từ `UserProfile.weaknessHistory` (qua `_getPreviousWeakCompetencies` trong `behavior-calibration.service.ts`). Sau F034, planner sẽ đọc `BehaviorProgressProfile.recurringWeaknesses` thay thế — nhưng đó là việc của feature sau.

## Input Contract

Pipeline nhận input từ `BehavioralSession` sau khi synthesis hoàn tất:

```ts
// Nguồn: BehavioralSession.finalScore (JSONB), cast sang BehaviorScorecardData
// import từ server/src/behavior-session/types/session-synthesis.types.ts

interface PipelineInput {
  behavioralSessionId: string;
  userId: string;
  candidateLevel: CandidateLevel;             // từ BehavioralSession.candidateLevel
  scorecard: BehaviorScorecardData;            // từ BehavioralSession.finalScore
}
```

Các field của `BehaviorScorecardData` mà pipeline sử dụng:

| Field | Dùng cho |
|-------|---------|
| `competencyScores: CompetencyScoreEntry[]` | Cập nhật `competencyTrend`, detect weak competency |
| `readiness.finalScore` + `readiness.band` | Cập nhật `readinessScoreHistory` |
| `probeAuditTrail[].signalResults` | Detect signal-level weakness/strength |
| `probeResilience.entries[]` | Detect failed probe pattern |
| `communication.genericAnswerCount` | Input cho practice plan (90s_answer task) |
| `sessionId` + `synthesizedAt` | TrendPoint metadata |

## Data Model

### SignalWeaknessRecord — bảng theo dõi nội bộ

Không expose ra API. Dùng để track signal miss count trước khi đạt threshold recurring.

```ts
interface SignalWeaknessRecord {
  userId: string;
  signalKey: string;           // ProbeSignalResult.key — định danh signal cụ thể
  competencyKey: string;       // CompetencyScoreEntry.competencyKey để group khi display
  signalLabel: string;
  missCount: number;           // số session signal này bị 'missing' hoặc 'unclear'
  lastMissSessionId: string;
  lastMissAt: string;
}
```

### RecurringWeakness — expose trong BehaviorProgressProfile

Chỉ tạo khi `missCount >= recurringWeaknessThreshold` (default 2).

```ts
interface RecurringWeakness {
  signalKey: string;           // key duy nhất để identify weakness
  competencyKey: string;
  signalLabel: string;
  missCount: number;
  severity: 'low' | 'medium' | 'high';
  lastMissSessionId: string;
}
```

Severity rule theo `missCount`:

| missCount | severity |
|-----------|----------|
| 2 | low |
| 3 | medium |
| >= 4 | high |

### RecurringStrength

```ts
interface RecurringStrength {
  signalKey: string;
  competencyKey: string;
  signalLabel: string;
  coveredSessionCount: number;  // số session liên tiếp covered
  lastCoveredSessionId: string;
}
```

### TrendPoint

```ts
interface TrendPoint {
  sessionId: string;
  sessionDate: string;          // ISO 8601 — từ BehaviorScorecardData.synthesizedAt
  score: number;                // readiness.finalScore (0–100)
  band: ReadinessBand;          // readiness.band
  candidateLevel: CandidateLevel;
}
```

Note: score chưa normalize theo session difficulty. Khi compare trend, consumer cần xem kèm `candidateLevel` để tránh so sánh sai giữa session dễ và khó. Normalization là việc của feature sau.

### FailedProbePattern

```ts
interface FailedProbePattern {
  questionProbeId: string;       // ProbeResilienceEntry.questionProbeId
  failCount: number;
  lastFailSessionId: string;
}
```

Nguồn: `probeResilience.entries[]` — entry có `result === 'collapsed'`.

### PracticeTask

```ts
type PracticeTaskType =
  | 'metric_drill'     // signal liên quan đến result/metric bị miss
  | 'we_to_i'          // signal liên quan đến personal contribution bị miss
  | 'conflict_probe'   // signal liên quan đến conflict handling bị miss
  | 'reflection_drill' // signal liên quan đến reflection/learning bị miss
  | '90s_answer';      // genericAnswerCount cao trong session

interface PracticeTask {
  id: string;
  signalKey: string;
  competencyKey: string;
  taskType: PracticeTaskType;
  prompt: string;
}
```

Mapping signal keyword → task type (heuristic, thực tế match theo `signalKey` substring/tag):

| Signal pattern | taskType |
|----------------|----------|
| metric, result, baseline, impact | `metric_drill` |
| contribution, ownership, I vs we | `we_to_i` |
| conflict, disagreement, push-back | `conflict_probe` |
| reflection, lesson, differently | `reflection_drill` |
| `communication.genericAnswerCount >= 2` | `90s_answer` |

### NextSessionRecommendation

```ts
interface NextSessionRecommendation {
  suggestedGoal: SessionGoal;
  suggestedLevel: CandidateLevel;   // tách khỏi suggestedGoal — đây là level challenge
  levelChangeReason: string | null; // null nếu level không đổi
  focusCompetencies: string[];      // top 2–3 competencyKey có score thấp nhất
  reasoningSummary: string;
}
```

Goal selection rule:

| Điều kiện | suggestedGoal |
|-----------|---------------|
| Có `RecurringWeakness` severity = high | `weakness_repair` |
| Không có high severity weakness, coverage ổn | `deep_practice` |
| Tất cả competency score >= 75 ở level hiện tại | `deep_practice` + nâng `suggestedLevel` |

Level change rule: nếu `readiness.band === 'ready'` trong 2 session liên tiếp ở cùng level → đề xuất nâng `suggestedLevel`. Ngược lại giữ nguyên.

### BehaviorProgressProfile

```ts
interface BehaviorProgressProfile {
  userId: string;
  competencyTrend: Record<string, TrendPoint[]>;   // key: competencyKey
  readinessScoreHistory: TrendPoint[];
  recurringWeaknesses: RecurringWeakness[];
  recurringStrengths: RecurringStrength[];
  failedProbePatterns: FailedProbePattern[];
  lastPracticePlan: PracticeTask[];
  nextSessionRecommendation: NextSessionRecommendation | null;
  lastUpdatedSessionId: string;
  updatedAt: string;
}
```

### behavior_progress_session_log — idempotency ledger

Bảng riêng, unique constraint trên `(userId, sessionId)`.

```ts
interface BehaviorProgressSessionLog {
  id: string;
  userId: string;
  sessionId: string;      // BehavioralSession.id
  processedAt: string;
}
```

Pipeline check ledger trước khi chạy. Nếu `(userId, sessionId)` đã tồn tại → skip toàn bộ, return early. Insert vào ledger trong cùng transaction với upsert profile.

## Business Flow

```
[Stage 5 synthesis persist thành công]
[BehavioralSession.finalScore = BehaviorScorecardData]
        |
        v
ProgressUpdatePipeline.run({ behavioralSessionId, userId })
        |
        +---> Guard: check behavior_progress_session_log
        |       Nếu (userId, sessionId) đã có → return early (idempotent skip)
        |
        +---> Load BehavioralSession → cast finalScore sang BehaviorScorecardData
        |       Nếu finalScore null hoặc invalid → throw, không chạy với data partial
        |
        +---> Load hoặc tạo mới BehaviorProgressProfile của user
        |
        +---> CompetencyTrendUpdater
        |       Input: scorecard.competencyScores[]
        |       - Với mỗi CompetencyScoreEntry:
        |           Tạo TrendPoint { sessionId, sessionDate, score, band, candidateLevel }
        |           Append vào competencyTrend[competencyKey]
        |           Trim về trendWindowSessions (10) gần nhất
        |       - Tạo TrendPoint từ readiness.finalScore + readiness.band
        |           Append vào readinessScoreHistory, trim về 10 điểm gần nhất
        |
        +---> SignalWeaknessTracker
        |       Input: scorecard.probeAuditTrail[].signalResults[]
        |       - Với mỗi ProbeSignalResult có status 'missing' hoặc 'unclear':
        |           Upsert SignalWeaknessRecord: tăng missCount, update lastMissSessionId
        |       - Với mỗi ProbeSignalResult có status 'covered':
        |           Nếu có SignalWeaknessRecord cho signalKey này → giảm missCount
        |           Nếu missCount về 0 → xóa record
        |       - Rebuild recurringWeaknesses:
        |           Lấy tất cả SignalWeaknessRecord của user có missCount >= threshold (2)
        |           Map sang RecurringWeakness với severity theo bảng rule
        |
        +---> RecurringStrengthTracker
        |       Input: scorecard.probeAuditTrail[].signalResults[]
        |       - Với mỗi ProbeSignalResult có status 'covered':
        |           Upsert RecurringStrength: tăng coveredSessionCount
        |       - Với mỗi ProbeSignalResult có status 'missing' hoặc 'unclear':
        |           Reset coveredSessionCount = 0 cho signalKey đó
        |           Nếu coveredSessionCount = 0 → xóa khỏi recurringStrengths
        |
        +---> FailedProbePatternTracker
        |       Input: scorecard.probeResilience.entries[]
        |       - Với mỗi ProbeResilienceEntry có result === 'collapsed':
        |           Upsert FailedProbePattern: tăng failCount, update lastFailSessionId
        |       - Với mỗi ProbeResilienceEntry có result !== 'collapsed':
        |           Nếu có FailedProbePattern cho questionProbeId → giảm failCount
        |           Nếu failCount về 0 → xóa
        |
        +---> PracticePlanGenerator
        |       Input: recurringWeaknesses (mới rebuild), scorecard.communication
        |       - Sort recurringWeaknesses theo severity desc
        |       - Map mỗi RecurringWeakness sang PracticeTask theo signalKey pattern
        |       - Nếu scorecard.communication.genericAnswerCount >= 2: thêm '90s_answer' task
        |       - Giữ tối đa 5 task, priority: severity cao + mới nhất trước
        |       - Overwrite lastPracticePlan hoàn toàn
        |
        +---> NextSessionRecommendationEngine
        |       Input: recurringWeaknesses, competencyTrend (mới update), readinessScoreHistory
        |       - Xác định suggestedGoal theo bảng goal selection rule
        |       - focusCompetencies: top 2–3 competencyKey có score thấp nhất trong trend
        |       - Xác định suggestedLevel: giữ nguyên hoặc nâng theo level change rule
        |       - Tạo reasoningSummary (ngắn gọn, chỉ dùng data có trong scorecard)
        |
        +---> Transaction: persist tất cả thay đổi
        |       - Upsert BehaviorProgressProfile (theo userId)
        |       - Insert behavior_progress_session_log { userId, sessionId }
        |
        v
[Done — profile updated, idempotency logged]
```

## Thresholds & Policy

| Param | Default | Ghi chú |
|-------|---------|---------|
| `recurringWeaknessThreshold` | 2 | missCount >= 2 → đưa vào recurringWeaknesses |
| `recurringStrengthThreshold` | 3 | coveredSessionCount >= 3 → tính strength |
| `failedProbeThreshold` | 2 | failCount >= 2 → tính pattern |
| `maxPracticeTasksPerPlan` | 5 | Giữ plan ngắn, actionable |
| `trendWindowSessions` | 10 | Chỉ giữ 10 TrendPoint gần nhất per competency và readiness |

## API Contract

### Trigger pipeline (internal only)

```
POST /behavior-sessions/:sessionId/progress-update
```

Được gọi bởi session synthesis service ngay sau khi persist `BehaviorScorecardData` thành công (Stage 5). Không expose cho client. Không cần auth token vì là internal service call.

Request không cần body — `sessionId` trên path đủ để load `BehavioralSession` và lấy `userId`.

Response:

```ts
{
  skipped: boolean;                                    // true nếu idempotent skip
  recurringWeaknessCount: number;
  practicePlanTaskCount: number;
  nextSessionRecommendation: NextSessionRecommendation | null;
}
```

### Get full profile

```
GET /users/:userId/behavior-progress
Authorization: Bearer <token> — chỉ user chính hoặc admin
```

Response: `BehaviorProgressProfile`

Trả `404` nếu user chưa có profile (chưa complete session nào).

### Get practice plan

```
GET /users/:userId/behavior-progress/practice-plan
Authorization: Bearer <token>
```

Response: `{ tasks: PracticeTask[] }` — shortcut trả `lastPracticePlan`. Trả `[]` nếu chưa có plan.

## Integration Note — F030 Calibration

Hiện tại `behavior-calibration.service.ts._getPreviousWeakCompetencies()` đọc từ `UserProfile.weaknessHistory`. F034 chưa thay đổi điều này.

Sau F034, một feature tiếp theo sẽ update calibration service để đọc `recurringWeaknesses` từ `BehaviorProgressProfile` thay thế, map `signalKey` → `competencyKey` → `QuestionProbeCompetency`. F034 cần đảm bảo `recurringWeaknesses[].competencyKey` dùng cùng vocabulary với `VALID_COMPETENCIES` trong calibration service.

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Ngay sau Stage 5 persist thành công, `BehaviorProgressProfile` của user được cập nhật — không phụ thuộc Stage 6 |
| AC2 | Pipeline validate `BehavioralSession.finalScore` trước khi chạy; throw error nếu null hoặc không cast được sang `BehaviorScorecardData` |
| AC3 | `SignalWeaknessRecord` được upsert đúng theo `signalKey` sau mỗi session; missCount tăng khi `status='missing'/'unclear'`, giảm khi `status='covered'` |
| AC4 | Signal bị miss trong >= 2 session xuất hiện trong `recurringWeaknesses` với `severity` đúng theo bảng rule |
| AC5 | Signal đã `covered` trong session mới → missCount giảm đúng; nếu về 0 → xóa khỏi `SignalWeaknessRecord` và `recurringWeaknesses` |
| AC6 | `RecurringStrength` chỉ tồn tại khi `coveredSessionCount >= 3`; reset về 0 khi signal bị miss trong session mới |
| AC7 | `FailedProbePattern` được upsert từ `probeResilience.entries` có `result === 'collapsed'`; giảm failCount khi probe không còn collapsed |
| AC8 | `lastPracticePlan` overwrite hoàn toàn sau mỗi session — không accumulate task từ session cũ |
| AC9 | `PracticeTask` được generate từ `recurringWeaknesses` sorted by severity; tối đa 5 task |
| AC10 | Nếu `communication.genericAnswerCount >= 2` trong session vừa xong → có `90s_answer` task trong plan |
| AC11 | `NextSessionRecommendation.suggestedGoal` và `suggestedLevel` là 2 field độc lập; `suggestedLevel` chỉ thay đổi khi `readiness.band === 'ready'` trong 2 session liên tiếp ở cùng level |
| AC12 | Pipeline idempotent: chạy lại cùng `sessionId` không tạo duplicate TrendPoint, không tăng counter, không thay đổi profile |
| AC13 | User chưa có profile → tạo mới đúng; `GET /users/:userId/behavior-progress` trả `404` |
| AC14 | `recurringWeaknesses[].competencyKey` dùng đúng vocabulary của `VALID_COMPETENCIES` trong calibration service |
| AC15 | Tất cả data aggregate từ `BehaviorScorecardData`; không đọc raw transcript hay message history |

## Risks

| Risk | Mitigation |
|------|-----------|
| `BehavioralSession.finalScore` null khi pipeline trigger (synthesis chưa xong hoặc lỗi) | AC2: validate trước, throw error rõ ràng, không chạy partial |
| Concurrent retry trước khi ledger insert xong | Unique constraint DB-level trên `(userId, sessionId)` — constraint violation = idempotent skip |
| `signalKey` từ các QuestionProbe khác nhau không nhất quán (cùng concept, khác key string) | `signalKey` phải lấy trực tiếp từ `ProbeSignalResult.key` trong `BehaviorScorecardData` — không normalize thêm trong pipeline này |
| `competencyKey` trong `CompetencyScoreEntry` không khớp `VALID_COMPETENCIES` | AC14 + unit test mapping trước khi persist |
