# HOW — Implementation Plan: DSA Live Coding

> Tài liệu này là kế hoạch triển khai kỹ thuật cho epic DSA & Live Coding.
> Đọc cùng với [WHAT & WHY](../epic-dsa-live-coding-design.md).

---

## Tổng quan kiến trúc

```
Client (React)                     Server (NestJS)               External
─────────────────                  ───────────────               ────────
RoundSelectionStep (sửa)
  └─ DSAProblemPicker              LiveCodingModule
DSASessionPage
  ├─ ProblemPicker                 live-coding.controller
  ├─ ProblemPanel    ──REST──►     live-coding.service       ──► code-runner
  ├─ ApproachBox     ──REST──►       ├─ run()                    (judge.service.ts)
  ├─ MonacoEditor                    ├─ onTLE()
  ├─ RunResultPanel                live-coding-ai.service    ──► Groq API
  ├─ AIChat          ◄─Socket──      ├─ onIdle()                 (groq.service.ts)
  └─ Timer                           └─ generateDebrief()
                                   ProblemsModule (đã có)
ScoringPage (sửa)
  └─ DSAScoringTab
       └─ SolutionWalkthrough
```

---

## Schema thay đổi

> **Problem**, **ProblemTemplate**, **TestCase** — không thay đổi gì.
> Chỉ mở rộng `LiveCodingSession`.

### `server/src/live-coding/entities/live-coding-session.entity.ts`

Thêm các column sau:

| Column | Type | Ghi chú |
|---|---|---|
| `problemIds` | `uuid[]` (FK → problems) | Danh sách bài trong session (user chọn trước khi bắt đầu) |
| `activeProblemId` | `uuid, nullable` | Bài đang làm tại thời điểm hiện tại |
| `language` | `varchar(20)` | `'python'` / `'javascript'` / `'java'` / `'cpp'` |
| `approachText` | `text, nullable` | Nội dung Approach Box |
| `approachSubmittedAt` | `timestamptz, nullable` | Thời điểm unlock editor |
| `problemProgress` | `jsonb, default {}` | Trạng thái theo từng `problemId` (phase, lastRun, submitAt) |
| `runHistory` | `jsonb, default []` | Mảng các lần Run (xem schema bên dưới, có `problemId`) |
| `aiConversation` | `jsonb, default []` | Tin nhắn AI trong session |
| `idleEvents` | `jsonb, default []` | Timestamps khi idle > 5 phút |
| `finalCode` | `jsonb, default {}` | Code cuối theo từng `problemId` |

**Schema `runHistory[]`:**
```json
{
  "problemId": "uuid",
  "runAt": "ISO timestamp",
  "results": [
    { "testCaseId": "uuid", "isHidden": false, "status": "AC|WA|TLE|RE|CE", "timeMs": 120 }
  ],
  "hasTLE": true
}
```

**Schema `aiConversation[]`:**
```json
{ "role": "ai|user", "content": "...", "trigger": "TLE|IDLE|MANUAL", "sentAt": "ISO" }
```

---

## Task 1 — Backend: Hoàn thiện LiveCoding Module

**Mục tiêu:** Tạo đủ API endpoints để client gọi trong suốt session.

### Files cần tạo / sửa

| File | Hành động |
|---|---|
| `server/src/live-coding/entities/live-coding-session.entity.ts` | Thêm các column ở bảng trên, thêm `@ManyToOne` → Problem |
| `server/src/live-coding/live-coding.module.ts` | Tạo mới — import ProblemsModule, TypeOrmModule, HttpModule |
| `server/src/live-coding/live-coding.controller.ts` | Tạo mới — các route bên dưới |
| `server/src/live-coding/live-coding.service.ts` | Tạo mới — business logic |
| `server/src/app.module.ts` | Import LiveCodingModule |

### API Endpoints

```
POST   /live-coding/sessions              body: { problemIds, language, mode: 'practice'|'combat' }
GET    /live-coding/sessions/:id          trả về session + activeProblem + problemProgress + aiConversation
PATCH  /live-coding/sessions/:id/problem  body: { problemId }       → đổi activeProblemId
PATCH  /live-coding/sessions/:id/approach body: { problemId, approachText }   → set approachSubmittedAt theo bài
POST   /live-coding/sessions/:id/run      body: { problemId, code }           → Judge0 → lưu runHistory theo bài
POST   /live-coding/sessions/:id/submit   body: { problemId, code }           → lưu finalCode theo bài, trigger debrief bài đó
POST   /live-coding/sessions/:id/idle     (frontend gọi khi idle)  → trigger AI
```

Rule bắt buộc: `problemId` gửi lên phải thuộc `session.problemIds`; nếu không thì trả `403`.

---

## Task 2 — Backend: Code Runner Integration

**Mục tiêu:** Chạy code ứng viên qua custom code-runner, trả về kết quả từng test case.

### Files cần sửa

| File | Hành động |
|---|---|
| `server/src/live-coding/live-coding.module.ts` | Import `JudgeModule` (đã có) để inject `JudgeService` |
| `server/src/live-coding/live-coding.service.ts` | Inject `JudgeService` từ `server/src/judge/judge.service.ts` |

> Không tạo service mới. `JudgeService` (`server/src/judge/judge.service.ts`) đã có sẵn `runBatchTests()` — inject trực tiếp vào `LiveCodingService`.

### Logic `run(code, language, problemId)` trong `LiveCodingService`

1. Lấy tất cả TestCase của problem (cả visible lẫn hidden).
2. Lấy `ProblemTemplate` theo `language` → lấy `driverCode` và `timeLimitMs`.
3. Gọi `judgeService.runBatchTests()` với:
   - `sourceCode` = `driverCode` có inject code ứng viên vào.
   - `timeLimitMultiplier` từ `problem.timeLimitMultiplier`.
   - `input` = `testCase.inputData`, `expectedOutput` = `testCase.expectedOutput`.
4. Map status description → `AC | WA | TLE | RE | CE`.
5. Trả về mảng kết quả. **Với hidden test case: trả `status` + `timeMs` nhưng không trả `inputData` / `expectedOutput` về client.**
6. Nếu có ít nhất 1 `TLE` → set `hasTLE: true` trong runHistory entry, cập nhật `problemProgress[problemId]`.

---

## Task 3 — Backend: AI Trigger Service

**Mục tiêu:** Hai trigger theo WHAT 2.3 — TLE và Idle.

### Files cần tạo

| File | Hành động |
|---|---|
| `server/src/live-coding/live-coding-ai.service.ts` | Tạo mới — inject `GroqService` từ `server/src/ai/groq.service.ts` |

### Method `onTLE(session, problem, problemId)`

Gọi sau khi `run(problemId)` trả về `hasTLE: true`. Prompt:

```
Bạn là AI Interviewer trong một buổi DSA live coding.
Bài toán: {problem.title} | Tags: {problem.tags.join(', ')} | Difficulty: {problem.difficulty}
Approach ứng viên ghi ban đầu: "{session.approachText}"
Kết quả vừa chạy: pass {visiblePassed}/{visibleTotal} test case nhỏ, TLE trên test case lớn.

Hãy hỏi 1 câu follow-up ngắn (≤3 câu) để gợi ý ứng viên suy nghĩ về optimization.
Không được tiết lộ thuật toán cụ thể. Tham chiếu tag [{problem.tags}] để định hướng câu hỏi.
```

### Method `onIdle(session, problem, problemId)`

Gọi sau khi nhận `POST /sessions/:id/idle`. Prompt:

```
Ứng viên đã không tương tác hơn 5 phút.
Bài toán: {problem.title} | Approach ban đầu: "{session.approachText}"
Lần run gần nhất: {lastRunSummary}

Gửi 1 câu gợi ý nhẹ để ứng viên tự nói ra chỗ đang bị stuck. Không tiết lộ hướng giải.
```

Append kết quả vào `session.aiConversation` (kèm `problemId`), emit WebSocket event `ai_message` đến client.

---

## Task 4 — Backend: Debrief Generation via Job Queue

**Mục tiêu:** Sinh Debrief Report 5 phần sau khi session kết thúc — đẩy vào BullMQ job queue, không block request, giống pattern của behavioral scoring.

### Files cần tạo / sửa

| File | Hành động |
|---|---|
| `server/src/jobs/jobs.constants.ts` | Thêm constant `DSA_DEBRIEF_QUEUE = 'dsa-debrief'` |
| `server/src/jobs/workers/dsa-debrief.worker.ts` | Tạo mới — `@Processor(DSA_DEBRIEF_QUEUE)` |
| `server/src/live-coding/live-coding.service.ts` | Inject `@InjectQueue(DSA_DEBRIEF_QUEUE)`, thêm `submit()` + `processDebrief()` + `getScore()` |
| `server/src/live-coding/live-coding.module.ts` | Register `BullModule.registerQueue({ name: DSA_DEBRIEF_QUEUE })`, import `JobsModule` |
| `server/src/live-coding/live-coding.controller.ts` | Thêm `GET /live-coding/sessions/:id/score` |

### Luồng

```
Client gọi POST /sessions/:id/submit
  → LiveCodingService.submit()
      → lưu finalCode[problemId]
      → session.status = 'SCORING'
      → scoringQueue.add('debrief-session', { sessionId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
      → trả về 202 Accepted ngay

DsaDebriefWorker.process()
  → gọi LiveCodingService.processDebrief(sessionId)
      → với mỗi problemId trong session.problemIds:
          → gọi groqService.generateContent() (llama-3.3-70b-versatile)
          → parse JSON debrief
          → lưu vào session.finalScore[problemId]
      → session.status = 'COMPLETED'

Client polling GET /live-coding/sessions/:id/score mỗi 3s
  → trả { status: 'SCORING' | 'COMPLETED', score: finalScore | null }
  → khi COMPLETED → điều hướng sang ScoringPage
```

### Payload interface

```typescript
// server/src/jobs/workers/dsa-debrief.worker.ts
interface DsaDebriefJobData {
  sessionId: string;
}
```

### Groq prompt trong `processDebrief(sessionId)`

Chạy **per problemId** (có thể `Promise.allSettled` nếu nhiều bài):

```
Bạn là interviewer phân tích buổi DSA live coding.
---
Bài: {problem.title} | Tags: {tags} | Difficulty: {difficulty}
Approach ứng viên: "{approachText}"
Lịch sử chạy: {runHistory[problemId]} — X lần TLE, Y lần WA, lần cuối: {lastStatus}
Thời gian idle liên quan bài này: {filteredIdleEvents}
Conversation AI trong bài này: {aiConversation.filter(m => m.problemId === problemId)}
Code cuối: {finalCode[problemId]}

Trả về JSON:
{
  "approachVerdict": "...",
  "complexityAnalysis": { "submitted": "O(...)", "optimal": "O(...)", "verdict": "..." },
  "stuckPoints": ["..."],
  "followUpPerformance": "...",
  "actionableSuggestion": "..."
}
```

### Client polling trong `dsaSessionSaga.js`

Reuse đúng pattern của `behavioralSaga.js` — polling mỗi 3s, tối đa 20 lần (60s):

```js
// sau khi dispatch submitDSA thành công
for (let i = 0; i < 20; i++) {
  yield delay(3000);
  const { data } = yield call(dsaApi.getScore, sessionId);
  if (data.status === 'COMPLETED') {
    yield put(debriefReady(data.score));
    return;
  }
}
yield put(debriefTimeout());
```

---

## Task 5 — Frontend: DSA Session Page

**Mục tiêu:** Trang chính của session, 3-panel layout.

### Files cần tạo

| File | Hành động |
|---|---|
| `client/apps/web/src/pages/DSASessionPage.jsx` | Tạo mới — layout chính |
| `client/apps/web/src/components/dsa/ProblemPicker.jsx` | Tạo mới — chọn bài trong cùng session |
| `client/apps/web/src/components/dsa/ProblemPanel.jsx` | Đề bài + tags + difficulty badge |
| `client/apps/web/src/components/dsa/ApproachBox.jsx` | Textarea + submit button |
| `client/apps/web/src/components/dsa/CodeEditor.jsx` | Monaco wrapper |
| `client/apps/web/src/components/dsa/RunResultPanel.jsx` | Kết quả từng test case |
| `client/apps/web/src/components/dsa/AIChat.jsx` | Hiển thị aiConversation |
| `client/apps/web/src/store/slices/dsaSessionSlice.js` | Tạo mới |
| `client/apps/web/src/store/sagas/dsaSessionSaga.js` | Tạo mới |

### Luồng phase trong `DSASessionPage`

```
phase theo từng bài: 'READ' → 'APPROACH' → 'CODE' → 'DONE'
```

| Phase | Điều kiện chuyển | UI state |
|---|---|---|
| `READ` | Tự động sau 2 phút hoặc user bấm "Sẵn sàng" | Editor disabled, ApproachBox hidden |
| `APPROACH` | User submit ApproachBox (gọi PATCH approach) | Editor disabled, ApproachBox visible |
| `CODE` | approachSubmittedAt set (server confirm) | Editor enabled, Run button active |
| `DONE` | submit hoặc timer hết | Tất cả disabled, redirect Debrief |

`ProblemPicker` cho phép đổi `activeProblemId`; khi đổi bài, UI load state theo `problemProgress[problemId]` thay vì reset toàn trang.

---

## Task 6 — Frontend: Monaco Configuration

**Mục tiêu:** IDE đủ thật, không có autocomplete.

### File cần sửa

`client/apps/web/src/components/dsa/CodeEditor.jsx`

### Monaco options cần set

```js
const MONACO_OPTIONS = {
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  snippetSuggestions: 'none',
  wordBasedSuggestions: 'off',
  parameterHints: { enabled: false },
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
};
```

### RunResultPanel

Hiển thị mỗi test case visible dưới dạng:

```
Test 1: ✓ AC  (45ms)
Test 2: ✗ WA
Test 3: ✗ TLE   ← hidden test — chỉ hiện status, không hiện input/output
```

Badge hidden test: label "Large Input", không hiện `inputData`.

---

## Task 7 — Frontend: Timer Component

### File cần tạo

`client/apps/web/src/components/dsa/SessionTimer.jsx`

| Mode | Behavior |
|---|---|
| `practice` | Đếm lên từ 00:00 — không có màu cảnh báo |
| `combat` | Đếm ngược từ `timeLimit` (20/35/50 phút theo difficulty) |

**Visual warnings (combat only):**
- `≤ 5 phút`: timer text → màu `text-yellow-500`
- `≤ 1 phút`: timer text → màu `text-red-500` + pulse animation

Khi hết giờ: tự động submit toàn bộ bài chưa submit bằng code snapshot hiện tại của từng `problemId`.

---

## Task 8 — Frontend: Idle Detection

**Mục tiêu:** Detect 5 phút không tương tác → trigger AI.

Trong `CodeEditor.jsx`:

```js
// Attach listener vào Monaco model
editor.onDidChangeModelContent(() => { lastActivity = Date.now(); });

// Interval check mỗi 30s
setInterval(() => {
  if (Date.now() - lastActivity > 5 * 60 * 1000 && phase === 'CODE') {
    dispatch(triggerIdleAI(sessionId));  // gọi POST /sessions/:id/idle
    lastActivity = Date.now();           // reset để không spam
  }
}, 30_000);
```

---

## Task 9 — Frontend: DSA Scoring Tab trong ScoringPage

**Mục tiêu:** Tích hợp kết quả DSA vào trang đánh giá tổng hợp đã có — không tạo page riêng.

`ScoringPage.jsx` (`client/apps/web/src/components/scoring/ScoringPage.jsx`) đã có tabs cho nhiều session type (`behavioral`, `liveCoding`, `prompt`, `systemDesign`). DSA sẽ dùng tab `liveCoding`.

### Files cần tạo / sửa

| File | Hành động |
|---|---|
| `client/apps/web/src/components/scoring/DSAScoringTab.jsx` | Tạo mới — hiển thị debrief từng bài |
| `client/apps/web/src/components/dsa/SolutionWalkthrough.jsx` | Tạo mới — diff view code ứng viên vs solution mẫu |
| `client/apps/web/src/components/scoring/ScoringPage.jsx` | Sửa — render `DSAScoringTab` khi tab `liveCoding` active |

### DSAScoringTab

Lặp qua từng `problemId` trong `session.problemIds`, render per-problem card:

```
┌─ Two Sum (EASY · #array #two-pointer) ─────────────────────┐
│  Approach Verdict:   Two pointers — đúng hướng              │
│  Complexity:         Submitted O(n²) → Optimal O(n)  ⚠️     │
│  Stuck:              8 phút ở edge case mảng rỗng            │
│  Follow-up:          Chưa trả lời được câu hỏi TLE           │
│  Gợi ý:              Tìm hiểu HashMap để đạt O(n)            │
│  [Xem Solution ▼]                                            │
└──────────────────────────────────────────────────────────────┘
```

### SolutionWalkthrough

- Lấy `solutionCode` từ `ProblemTemplate` theo `session.language`.
- Dùng `@monaco-editor/react` chế độ `diff` — `original = finalCode[problemId]`, `modified = solutionCode`.
- **Practice**: hiển thị ngay khi mở tab.
- **Combat**: ẩn, hiện thông báo "Kết quả sẽ được công bố sau khi combat kết thúc".

---

## Task 11 — Frontend + Backend: DSA Problem Auto-Assignment

**Mục tiêu:** Thí sinh không tự chọn bài — server tự assign dựa trên `candidateLevel`. User (trong RoundSelectionStep) chỉ cần chọn số bài.

### Thiết kế auto-assignment

`InterviewSession.candidateLevel` (`'junior' | 'mid' | 'senior'`) đã có sẵn. Server dùng field này để sample bài từ problem bank:

| candidateLevel | Difficulty được chọn |
|---|---|
| `junior` | `EASY` |
| `mid` | `MEDIUM` (hoặc 1 `EASY` + phần còn lại `MEDIUM` nếu count > 1) |
| `senior` | `MEDIUM` + `HARD` mix, ưu tiên `HARD` |

Logic sample: `SELECT * FROM problems WHERE difficulty = X AND status = 'PUBLISHED' ORDER BY RANDOM() LIMIT n`

Nếu pool không đủ bài theo difficulty → fallback sang difficulty liền kề (e.g. HARD không đủ → lấy thêm MEDIUM).

### Files cần tạo / sửa

| File | Hành động |
|---|---|
| `server/src/live-coding/live-coding.service.ts` | Thêm method `assignProblems(interviewSessionId, problemCount)` |
| `client/apps/web/src/components/interview-setup/steps/RoundSelectionStep.jsx` | Sửa — bật DSA round (`available: true`), thêm `DSAConfigPanel` khi DSA selected |
| `client/apps/web/src/components/interview-setup/dsa/DSAConfigPanel.jsx` | Tạo mới — chỉ chọn số bài |
| `client/apps/web/src/store/slices/interviewSetupSlice.js` | Sửa — thêm `dsaConfig: { problemCount: 1 }` |

### Method `assignProblems(interviewSessionId, problemCount)` (backend)

```
1. Lấy interviewSession → đọc candidateLevel
2. Map candidateLevel → difficulty list
3. Query problems: difficulty IN [...] AND status = 'PUBLISHED' ORDER BY RANDOM() LIMIT problemCount
4. Lưu problemIds vào LiveCodingSession.problemIds
5. Set activeProblemId = problemIds[0]
```

Gọi trong `POST /live-coding/sessions` — client chỉ gửi `{ interviewSessionId, language, mode, problemCount }`, không gửi `problemIds`.

### UI trong RoundSelectionStep

Khi user tick chọn round `dsa`, card expand ra `DSAConfigPanel`:

```
[x] DSA & Live Coding
    ┌──────────────────────────────────────┐
    │  Số bài:  [ 1 ]  [ 2 ]  [ 3 ]        │
    │                                      │
    │  Bài sẽ được chọn tự động            │
    │  phù hợp với level của bạn.          │
    └──────────────────────────────────────┘
```

Không có problem picker. Redux chỉ lưu `dsaConfig.problemCount`. Validation: `problemCount` phải được set (default 1) trước khi bắt đầu.

---

## Task 12 — Round Orchestration: Chuyển vòng thi tự động

**Mục tiêu:** Khi một vòng kết thúc (behavioral hoặc DSA), hệ thống tự xác định vòng tiếp theo dựa trên `interviewSession.rounds[]` và điều hướng client sang đúng vòng đó. Chỉ khi không còn vòng nào mới polling để vào ScoringPage.

---

### Thiết kế: `nextRound` field trong polling response

Thay vì client tự quyết định điều hướng, **backend trả về `nextRound`** trong response của polling endpoint. Client chỉ follow instruction.

```typescript
// Response shape của cả 2 polling endpoints
{
  status: 'IN_PROGRESS' | 'SCORING' | 'COMPLETED',
  score: Record<string, unknown> | null,
  nextRound: 'dsa' | 'hr_behavioral' | null   // null = đây là vòng cuối
}
```

---

### Backend: Logic xác định `nextRound`

Tạo helper dùng chung trong cả `BehavioralSessionService` và `LiveCodingService`:

**Files cần tạo / sửa:**

| File | Hành động |
|---|---|
| `server/src/interview/round-orchestrator.service.ts` | Tạo mới — logic xác định next round |
| `server/src/behavioral/behavioral-session.service.ts` | Sửa `getScore()` — inject `RoundOrchestratorService`, thêm `nextRound` vào response |
| `server/src/live-coding/live-coding.service.ts` | Sửa `getScore()` — inject `RoundOrchestratorService`, thêm `nextRound` vào response |
| `server/src/interview/interview.module.ts` | Export `RoundOrchestratorService` |

**`RoundOrchestratorService.getNextRound(interviewSessionId, currentRound)`:**

```typescript
async getNextRound(interviewSessionId: string, currentRound: string): Promise<string | null> {
  const session = await interviewSessionRepo.findOne({ id: interviewSessionId });
  const rounds = session.rounds; // e.g. ['hr_behavioral', 'dsa']
  const idx = rounds.indexOf(currentRound);
  return idx >= 0 && idx < rounds.length - 1 ? rounds[idx + 1] : null;
}
```

**`getScore()` sau khi scoring COMPLETED:**
```typescript
const nextRound = await this.orchestrator.getNextRound(session.interviewSessionId, 'hr_behavioral');
return { status: session.status, score: session.finalScore, nextRound };
```

---

### Backend: DSA — trigger debrief chỉ khi tất cả bài đã submit

Trong `LiveCodingService.submit(sessionId, problemId, code)`:

```typescript
// Lưu finalCode[problemId], đánh dấu problemProgress[problemId].submittedAt
// Kiểm tra tất cả bài đã submit chưa
const allSubmitted = session.problemIds.every(id => session.problemProgress[id]?.submittedAt);

if (allSubmitted) {
  session.status = 'SCORING';
  await this.debriefQueue.add('debrief-session', { sessionId }, { attempts: 3, ... });
}
// Nếu chưa xong hết → chỉ lưu code, không enqueue
```

---

### Frontend: Cập nhật polling saga

**`behavioralSaga.js` — sửa `completeSaga`:**

```js
if (result.status === 'COMPLETED') {
  if (result.nextRound === 'dsa') {
    yield put(startDSARound());        // dispatch action tạo LiveCodingSession + navigate
  } else {
    yield put(scoringPolled(result));  // navigate sang ScoringPage như hiện tại
  }
  break;
}
```

**`dsaSessionSaga.js` — polling sau submit bài cuối:**

```js
if (data.status === 'COMPLETED') {
  if (data.nextRound !== null) {
    yield put(startNextRound(data.nextRound));   // có vòng tiếp (nếu sau này thêm rounds khác)
  } else {
    yield put(debriefReady(data.score));          // navigate sang ScoringPage
  }
  return;
}
// Nếu chưa submit hết bài → polling không COMPLETED → saga không làm gì thêm
```

**Files cần sửa:**

| File | Hành động |
|---|---|
| `client/apps/web/src/store/sagas/behavioralSaga.js` | Sửa `completeSaga` — handle `nextRound === 'dsa'` |
| `client/apps/web/src/store/sagas/dsaSessionSaga.js` | Thêm round-aware polling sau submit |

---

### Luồng tổng thể

```
InterviewSession.rounds = ['hr_behavioral', 'dsa']

[Vòng 1: Behavioral]
BehavioralSession COMPLETED
  → getScore() trả nextRound: 'dsa'
  → client dispatch startDSARound()
      → POST /live-coding/sessions { interviewSessionId, problemCount, language }
      → server assignProblems() theo candidateLevel
      → navigate sang DSASessionPage

[Vòng 2: DSA]
Submit bài cuối → allSubmitted = true
  → status = 'SCORING' → enqueue debrief job
  → DsaDebriefWorker.process() → status = 'COMPLETED'
  → getScore() trả nextRound: null   (DSA là vòng cuối)
  → client polling nhận COMPLETED + nextRound: null
  → navigate sang ScoringPage (tổng hợp cả 2 vòng)
```

---

## Task 10 — Admin: Hidden Test Case UX

**Mục tiêu:** ProblemEditor hỗ trợ tạo test case lớn + đánh dấu hidden.

### Files cần sửa

`client/apps/web/src/components/admin/problem/ProblemEditor.jsx`

Trong tab "Test Cases":
- Thêm checkbox `isHidden` khi thêm/sửa test case.
- Trong list, row có `isHidden: true` → hiện badge `Large/Hidden` (màu amber).
- Tooltip: *"Test case này ẩn với ứng viên. Dùng input lớn (n ≥ 10⁵) để filter brute force."*

---

## Thứ tự triển khai (dependencies)

```
Task 1 (entity + API)
  └─► Task 2 (code-runner)
        └─► Task 3 (AI triggers)
              └─► Task 4 (Debrief)
Task 1
  └─► Task 5 (Session page layout)
        ├─► Task 6 (Monaco)
        ├─► Task 7 (Timer)
        └─► Task 8 (Idle detection)
Task 4 + Task 5
  └─► Task 9 (DSA tab trong ScoringPage)
Task 1 + Task 4
  └─► Task 12 (Round orchestration)
        └─► sửa behavioralSaga.js (đã có)
Task 10 — độc lập, làm trước hoặc sau đều được
Task 11 — độc lập, làm song song với Task 1
```

---

## Files tóm tắt cần tạo/sửa

### Server
| File | Tạo mới / Sửa |
|---|---|
| `server/src/live-coding/entities/live-coding-session.entity.ts` | Sửa |
| `server/src/live-coding/live-coding.module.ts` | Tạo mới |
| `server/src/live-coding/live-coding.controller.ts` | Tạo mới |
| `server/src/live-coding/live-coding.service.ts` | Tạo mới |
| `server/src/live-coding/live-coding-ai.service.ts` | Tạo mới |
| `server/src/interview/round-orchestrator.service.ts` | Tạo mới |
| `server/src/interview/interview.module.ts` | Sửa |
| `server/src/behavioral/behavioral-session.service.ts` | Sửa |
| `server/src/app.module.ts` | Sửa |

### Client
| File | Tạo mới / Sửa |
|---|---|
| `client/apps/web/src/pages/DSASessionPage.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/ProblemPicker.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/ProblemPanel.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/ApproachBox.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/CodeEditor.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/RunResultPanel.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/AIChat.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/SessionTimer.jsx` | Tạo mới |
| `client/apps/web/src/components/dsa/SolutionWalkthrough.jsx` | Tạo mới |
| `client/apps/web/src/components/scoring/DSAScoringTab.jsx` | Tạo mới |
| `client/apps/web/src/components/scoring/ScoringPage.jsx` | Sửa |
| `client/apps/web/src/components/interview-setup/steps/RoundSelectionStep.jsx` | Sửa |
| `client/apps/web/src/components/interview-setup/dsa/DSAConfigPanel.jsx` | Tạo mới |
| `client/apps/web/src/store/slices/dsaSessionSlice.js` | Tạo mới |
| `client/apps/web/src/store/sagas/dsaSessionSaga.js` | Tạo mới |
| `client/apps/web/src/store/slices/interviewSetupSlice.js` | Sửa |
| `client/apps/web/src/store/sagas/behavioralSaga.js` | Sửa |
| `client/apps/web/src/components/admin/problem/ProblemEditor.jsx` | Sửa |
