# Epic 1.5: Tối ưu hoá Behavioral Interview – Realism, Evaluation Accuracy & Orchestrator Foundation

> **Scope:** Nâng cấp hệ thống STAR Simulator từ Epic 1 theo hai hướng song song:
> 1. **Approach C – Hybrid Question Strategy**: Bank cho structure/coverage, AI cho depth/personalization
> 2. **Question Orchestrator Pattern**: Tách biệt "hỏi gì" khỏi "hỏi như thế nào" — foundation để scale lên B2B ở Epic 1.6

---

## Bối cảnh & Động lực

Sau Epic 1, hệ thống đã hoạt động nhưng có các gap so với phỏng vấn thực tế:

| Gap | Biểu hiện |
|-----|-----------|
| Câu hỏi cứng nhắc | Phỏng vấn lần 2 = câu hỏi y hệt lần 1 |
| STAR áp dụng sai context | Stage 2/3 hỏi kỹ thuật nhưng vẫn enforce STAR narrative |
| AI làm quá nhiều việc | Vừa quyết định hỏi gì, vừa hỏi, vừa đánh giá — không tách biệt |
| Không có bộ nhớ liên stage | Stage 3 không biết candidate đã nói gì ở Stage 1 |
| Coverage không đảm bảo | AI có thể "quên" hỏi về một competency quan trọng |
| Scoring thiếu chiều sâu | Bỏ sót mâu thuẫn giữa stages, CV inflation, communication quality |

Epic này giải quyết tất cả các gap trên và đồng thời xây **boundary kiến trúc** chuẩn bị cho B2B (Epic 1.6).

---

## Kiến trúc tổng quan sau Epic 1.5

```
┌──────────────────────────────────────────────────────┐
│              Interview Template (default)             │
│   Competency Anchors + Coverage Rules + Freedom Level │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│            QuestionOrchestratorService  [MỚI]         │
│  - Load anchors từ template                           │
│  - Track coverage (competency nào đã hỏi)             │
│  - Quyết định next question intent                    │
│  - Pass intent + context xuống Facilitator            │
└───────────────────────┬──────────────────────────────┘
                        │  intent: { anchor, stage, level,
                        │    candidateContext, freedomLevel }
                        ▼
┌──────────────────────────────────────────────────────┐
│              AIFacilitatorService  [hiện tại]         │
│  - Nhận intent từ Orchestrator                        │
│  - Rephrase anchor → câu hỏi tự nhiên, fit CV         │
│  - Generate follow-ups trong scope cho phép           │
│  - Stream response về FE                             │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                  ScoringService  [mở rộng]            │
│  Practice mode: AI holistic eval (như hiện tại)       │
│  Structured mode (Epic 1.6): match vs rubric signals  │
└──────────────────────────────────────────────────────┘
```

---

## Task 1.5.1: BE – Competency Anchor Bank (Approach C)

**Vấn đề:** Task 1.5.1 cũ chỉ đề xuất random opening question. Approach C đi xa hơn: bank không lưu câu hỏi đầy đủ mà lưu **competency intents (anchors)** — AI nhận intent và rephrase thành câu hỏi tự nhiên, cá nhân hoá theo CV.

**Sự khác biệt với Approach B (Full Question Bank):**

| | Approach B (Full Bank) | Approach C (Anchor Bank) |
|--|--|--|
| Bank lưu | Câu hỏi đầy đủ, word-for-word | Intent + scope, không phải câu hoàn chỉnh |
| AI làm gì | Chọn câu, có thể rephrase nhẹ | Nhận intent → tạo câu phù hợp CV/context |
| Follow-ups | Cũng từ bank | AI tự do trong scope của anchor |
| Chi phí build | Hàng trăm câu chất lượng cao | ~3–5 anchors/stage (nhỏ gọn) |
| Stage 4 (CV) | Gần như không bank hoá được | AI handle tự do, orchestrator chỉ track coverage |

**Chi tiết công việc:**

1. Tạo file `competency-anchors.constant.ts` trong `behavioral/`:

```ts
export interface CompetencyAnchor {
  id: string;
  competency: string;          // Tên competency cần đánh giá
  intent: string;              // Mô tả intent cho AI hiểu cần hỏi gì
  scope: string;               // AI chỉ follow-up trong phạm vi này
  exampleQuestion: string;     // Ví dụ tham khảo (không dùng verbatim)
  applicableLevels: CandidateLevel[];
  evaluationMode: EvaluationMode;
}

export const COMPETENCY_ANCHORS: Record<number, CompetencyAnchor[]> = {
  1: [ // Culture Fit
    {
      id: 'CULT_LEARNING',
      competency: 'Learning Agility',
      intent: 'Đánh giá khả năng học công nghệ/kỹ năng mới dưới áp lực thời gian',
      scope: 'Hỏi về cách tiếp cận học, nguồn tài nguyên, kết quả đạt được',
      exampleQuestion: 'Kể về lần bạn phải học công nghệ mới trong thời gian ngắn',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_CONFLICT',
      competency: 'Conflict & Disagreement Handling',
      intent: 'Đánh giá cách xử lý bất đồng quan điểm kỹ thuật hoặc công việc với team',
      scope: 'Hỏi về cách lắng nghe, thuyết phục, tìm điểm chung, outcome',
      exampleQuestion: 'Khi không đồng ý với quyết định kỹ thuật của team, bạn xử lý thế nào?',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_FAILURE',
      competency: 'Self-Awareness & Growth Mindset',
      intent: 'Đánh giá khả năng nhận lỗi, rút kinh nghiệm, và trưởng thành từ thất bại',
      scope: 'Tập trung vào lesson learned và hành động thay đổi sau đó',
      exampleQuestion: 'Kể về một lần bạn thất bại và bạn học được gì từ đó',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_AUTONOMY',
      competency: 'Autonomy & Ownership',
      intent: 'Đánh giá mức độ tự chủ, chủ động nhận ownership thay vì chờ được giao',
      scope: 'Hỏi về initiative cụ thể, quyết định độc lập, kết quả',
      exampleQuestion: 'Kể về lần bạn chủ động làm điều gì đó không ai yêu cầu',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_CULTURE_SHAPE',
      competency: 'Culture Leadership',
      intent: 'Đánh giá khả năng định hình và cải thiện văn hoá team',
      scope: 'Hỏi về thay đổi cụ thể đã tạo ra, cách thuyết phục người khác, tác động lâu dài',
      exampleQuestion: 'Bạn đã từng thay đổi văn hoá làm việc của một team chưa?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  2: [ // Tech Stack Deep-Dive
    {
      id: 'TECH_UNDERSTANDING',
      competency: 'Technical Fundamentals',
      intent: 'Kiểm tra hiểu biết bản chất (why), không chỉ cách dùng (how)',
      scope: 'Đào sâu vào cơ chế bên trong, trade-offs, khi nào nên/không nên dùng',
      exampleQuestion: 'Giải thích sự khác biệt giữa useEffect và useMemo — không chỉ syntax mà cơ chế',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'TECH_TRADEOFF',
      competency: 'Trade-off Analysis',
      intent: 'Đánh giá khả năng nhận ra trade-off khi chọn solution kỹ thuật',
      scope: 'Hỏi về performance, maintainability, scalability trade-offs trong quyết định đã làm',
      exampleQuestion: 'Khi nào bạn chọn Redis thay vì database? Và ngược lại?',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'TECH_ARCHITECTURE',
      competency: 'System Architecture Thinking',
      intent: 'Đánh giá tư duy kiến trúc, khả năng thiết kế hệ thống ở mức cao',
      scope: 'Hỏi về distributed systems, scalability patterns, kiến trúc tổng thể',
      exampleQuestion: 'Hãy phân tích trade-off khi kết hợp NestJS OOP backend với React functional frontend',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
  ],
  3: [ // Domain Knowledge
    {
      id: 'DOM_FEATURE_DESIGN',
      competency: 'Feature Design',
      intent: 'Đánh giá tư duy thiết kế tính năng từ đầu đến cuối',
      scope: 'Schema, API, edge cases, failure handling',
      exampleQuestion: 'Thiết kế collection MongoDB để lưu câu trả lời ứng viên, có pagination',
      applicableLevels: ['junior', 'mid'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'DOM_OPTIMIZATION',
      competency: 'Performance & Optimization',
      intent: 'Đánh giá khả năng nhận diện bottleneck và tối ưu luồng dữ liệu',
      scope: 'Caching strategy, DB query optimization, batching',
      exampleQuestion: 'Làm thế nào dùng Redis để giảm tải write operations cho chat log?',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'DOM_SCALABILITY',
      competency: 'Scalability Design',
      intent: 'Đánh giá tư duy scale hệ thống, event-driven architecture',
      scope: 'Message queue, async processing, horizontal scaling',
      exampleQuestion: 'Thiết kế kiến trúc event-driven với RabbitMQ cho LLM async response',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
  ],
  4: [ // CV Deep-Dive — anchors mang tính gợi ý, AI tự adapt theo CV thực tế
    {
      id: 'CV_EXECUTION',
      competency: 'Task Execution',
      intent: 'Đào sâu vào cách candidate implement một tính năng cụ thể trong CV',
      scope: 'Chi tiết kỹ thuật, quyết định thiết kế, khó khăn gặp phải',
      exampleQuestion: 'Bạn implement [feature từ CV] như thế nào? Cho biết chi tiết kỹ thuật.',
      applicableLevels: ['junior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CV_TROUBLESHOOTING',
      competency: 'Debugging & Problem Solving',
      intent: 'Đào sâu vào một bug/issue khó mà candidate đã giải quyết trong CV',
      scope: 'Root cause analysis, debugging approach, prevention',
      exampleQuestion: 'Kể về bug khó nhất bạn phải debug trong dự án [từ CV]. Bạn tìm ra root cause thế nào?',
      applicableLevels: ['mid'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CV_IMPACT',
      competency: 'System Impact & Technical Leadership',
      intent: 'Đánh giá quyết định kỹ thuật lớn và tác động đến hệ thống/team',
      scope: 'Quyết định architecture, trade-offs, kết quả đo được',
      exampleQuestion: 'Quyết định kỹ thuật quan trọng nhất bạn đưa ra trong dự án [từ CV] là gì?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  5: [ // Soft Skills
    {
      id: 'SOFT_FEEDBACK',
      competency: 'Receiving & Acting on Feedback',
      intent: 'Đánh giá phản ứng với feedback tiêu cực, khả năng cải thiện',
      scope: 'Cảm xúc ban đầu, hành động cụ thể, kết quả sau đó',
      exampleQuestion: 'Kể về lần nhận feedback tiêu cực từ senior mà bạn ban đầu không đồng ý',
      applicableLevels: ['junior', 'mid'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'SOFT_CROSS_FUNCTIONAL',
      competency: 'Cross-Functional Communication',
      intent: 'Đánh giá khả năng giao tiếp kỹ thuật với non-technical stakeholder',
      scope: 'Cách giải thích technical debt/risk cho PM/PO, kết quả đạt được',
      exampleQuestion: 'Kể về lần bạn phải thuyết phục PO/PM ưu tiên technical debt hơn feature mới',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'SOFT_MENTORSHIP',
      competency: 'Mentorship & Team Development',
      intent: 'Đánh giá khả năng dẫn dắt, phát triển người khác',
      scope: 'Approach mentoring, handling performance issues, long-term development',
      exampleQuestion: 'Nếu junior trong team liên tục commit code lỗi lên production, bạn xử lý thế nào?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  6: [ // Reverse Interview
    {
      id: 'REV_INVITE',
      competency: 'Question Quality',
      intent: 'Mời candidate hỏi về công ty/team, đánh giá chiều sâu câu hỏi',
      scope: 'Trả lời câu hỏi của candidate như interviewer thực tế, đánh giá ngầm chất lượng',
      exampleQuestion: 'Bạn có câu hỏi nào cho tôi về team hoặc công ty không?',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.REVERSE_INTERVIEW,
    },
  ],
};
```

2. **Coverage rules** — quy định số lượng competency tối thiểu phải hỏi per stage per level:

```ts
export const COVERAGE_RULES: Record<number, Record<CandidateLevel, number>> = {
  1: { junior: 2, mid: 3, senior: 3 },  // Stage 1: Junior hỏi 2, Mid/Senior hỏi 3
  2: { junior: 1, mid: 2, senior: 2 },
  3: { junior: 1, mid: 2, senior: 2 },
  4: { junior: 1, mid: 1, senior: 1 },  // Stage 4: Mỗi level 1 anchor (CV-specific)
  5: { junior: 1, mid: 2, senior: 2 },
  6: { junior: 1, mid: 1, senior: 1 },
};
```

**Files cần tạo/sửa:**
- `server/src/behavioral/competency-anchors.constant.ts` — file mới
- `server/src/behavioral/prompt-builder.service.ts` — xoá hardcoded opening questions, dùng anchors

---

## Task 1.5.2: BE – Stage-Specific Evaluation Mode (Bỏ STAR uniform)

**Vấn đề:** STAR enforcement được inject vào tất cả 6 stages, kể cả Stage 2/3 (câu hỏi kỹ thuật) và Stage 6 (candidate hỏi ngược).

**Chi tiết công việc:**

1. Định nghĩa `EvaluationMode` enum (dùng chung với Task 1.5.1):

```ts
export enum EvaluationMode {
  STAR_BEHAVIORAL  = 'star_behavioral',   // Stage 1, 4, 5
  TECHNICAL_DEPTH  = 'technical_depth',   // Stage 2, 3
  REVERSE_INTERVIEW = 'reverse_interview', // Stage 6
}
```

2. **Sửa Khối 4 trong `buildSystemPrompt()`** — inject đúng block theo mode thay vì STAR uniform:

```ts
// TECHNICAL_DEPTH block (mới — thay thế STAR cho Stage 2, 3)
const TECHNICAL_DEPTH_BLOCK = `
Đây là câu hỏi kỹ thuật. Đánh giá theo 4 chiều:
- Độ chính xác: Ứng viên có hiểu đúng bản chất không, hay chỉ nhớ syntax?
- Chiều sâu: Có giải thích được "tại sao" không, không chỉ "làm thế nào"?
- Trade-offs: Có nhận ra khi nào nên/không nên dùng approach đó không?
- Ví dụ thực tế: Có dẫn được case từ kinh nghiệm thực tế của bản thân không?
Nếu câu trả lời còn nông (chỉ ở mức syntax/usage), hãy hỏi thêm về performance implications,
edge cases, hoặc "bạn đã gặp vấn đề này trong thực tế chưa?".`;

// REVERSE_INTERVIEW block (mới — thay thế STAR cho Stage 6)
const REVERSE_INTERVIEW_BLOCK = `
Ứng viên đang hỏi bạn về công ty/team. Hãy:
1. Trả lời như một interviewer thực sự — thành thật, không cần bịa số liệu cụ thể.
2. Đánh giá ngầm chất lượng câu hỏi: Có chiều sâu chiến lược? Hay chỉ là câu hỏi xã giao?
3. Nếu ứng viên không hỏi gì, hoặc câu hỏi quá bề mặt (chỉ về lương/môi trường làm việc),
   hãy gợi ý nhẹ: "Bạn có muốn hỏi thêm về roadmap kỹ thuật hoặc cách team handle
   technical debt không?" — nhưng không ép buộc.`;
```

3. **Tắt `checkStarCompleteness()`** trong `AIFacilitatorService` cho Stage 2, 3, 6:

```ts
const mode = STAGE_EVALUATION_MODE[currentStage];
const starStatus = (mode === EvaluationMode.STAR_BEHAVIORAL)
  ? await this.checkStarCompleteness(userMessage)
  : { situation: true, task: true, action: true, result: true }; // neutral
```

4. **FE:** Ẩn STAR Guide Panel ở Stage 2, 3, 6 — thay bằng context-panel phù hợp:
   - Stage 2, 3: *"Hãy giải thích trade-offs, không chỉ dừng ở cách dùng"*
   - Stage 6: *"Câu hỏi tốt thể hiện bạn đã research về công ty"*

**Files cần sửa:**
- `server/src/behavioral/prompt-builder.service.ts`
- `server/src/behavioral/ai-facilitator.service.ts`
- `client/apps/web/src/components/behavioral-room/StarGuidePanel.jsx`

---

## Task 1.5.3: BE – QuestionOrchestratorService (Foundation cho B2B)

**Mục tiêu:** Tách biệt trách nhiệm *"quyết định hỏi gì tiếp theo"* ra khỏi `AIFacilitatorService` và `BehavioralSessionService`. Đây là boundary kiến trúc quan trọng nhất — không phải để dùng ngay, mà để Epic 1.6 (B2B) có thể plug in mà không cần refactor lớn.

**Trách nhiệm của `QuestionOrchestratorService`:**

```ts
@Injectable()
export class QuestionOrchestratorService {

  // Trả về anchor tiếp theo cần hỏi dựa trên coverage hiện tại
  getNextAnchor(
    stage: number,
    level: CandidateLevel,
    coveredCompetencies: string[],   // Các competency ID đã hỏi trong stage này
    conversationContext: string,     // Summary từ Task 1.5.4, để AI chọn anchor phù hợp
  ): CompetencyAnchor | null        // null = đã cover đủ, có thể next stage

  // Kiểm tra stage đã cover đủ số competency tối thiểu chưa
  isStageCoverageComplete(
    stage: number,
    level: CandidateLevel,
    coveredCompetencies: string[],
  ): boolean

  // Build instruction cho AI Facilitator: "Hãy hỏi về [anchor.intent], dựa trên CV và context"
  buildAnchorInstruction(
    anchor: CompetencyAnchor,
    cvSnapshot: string,
    candidateContext: string,   // Summary từ các stage trước (Task 1.5.4)
  ): string
}
```

**Flow sau khi có Orchestrator:**

```
User gửi message
       ↓
BehavioralSessionService
       ↓
  [Nếu là lượt mở đầu stage]
  QuestionOrchestrator.getNextAnchor()
       ↓ anchor intent
  AIFacilitator.buildAnchorInstruction(anchor, cv, context)
       ↓ instruction injected vào system prompt
  AIFacilitator.streamFacilitatorResponse()

  [Nếu là follow-up trong stage]
  AIFacilitator.streamFacilitatorResponse() — không cần orchestrator
  Sau response: orchestrator.checkCoverage() → ghi coveredCompetencies
```

**Lưu coverage vào session:**

```sql
ALTER TABLE behavioral_sessions
  ADD COLUMN covered_competencies JSONB DEFAULT '{}';
-- Cấu trúc: { "1": ["CULT_LEARNING", "CULT_CONFLICT"], "2": ["TECH_UNDERSTANDING"], ... }
```

**Tại sao cần interface rõ ràng ngay bây giờ:**
- Hiện tại: Orchestrator load anchors từ `COMPETENCY_ANCHORS` constant (hardcoded)
- Epic 1.6: Orchestrator load từ `InterviewTemplate` entity do công ty tạo ra
- `AIFacilitatorService` và `BehavioralSessionService` **không thay đổi gì** — chỉ Orchestrator thay đổi input source

**Files cần tạo/sửa:**
- `server/src/behavioral/question-orchestrator.service.ts` — file mới
- `server/src/behavioral/behavioral.module.ts` — register provider mới
- `server/src/behavioral/behavioral-session.service.ts` — inject và sử dụng Orchestrator
- Migration SQL thêm cột `covered_competencies`

---

## Task 1.5.4: BE – Cross-Stage Candidate Summary

**Vấn đề:** Mỗi stage bắt đầu với system prompt "lạnh". Interviewer thực tế luôn kết nối các câu trả lời: *"Bạn vừa nói bạn thích tự chủ — vậy khi team buộc dùng tech stack bạn không quen, bạn xử lý thế nào?"*

**Chi tiết công việc:**

1. Method `buildStageSummary()` trong `PromptBuilderService` (mini LLM call, max 150 tokens):

```
Prompt:
Dưới đây là hội thoại Stage {N} ({stageName}). Tóm tắt trong TỐI ĐA 3 câu:
1. Điểm mạnh nổi bật nhất của ứng viên trong stage này.
2. Điểm yếu hoặc thiếu sót đáng chú ý (nếu có).
3. Một chi tiết cụ thể (từ khoá, dự án, công nghệ, tên) ứng viên đề cập
   mà có thể dùng để cá nhân hoá câu hỏi ở stage sau.
```

2. **Lưu vào `behavioral_sessions`:**

```sql
ALTER TABLE behavioral_sessions ADD COLUMN stage_summaries JSONB DEFAULT '{}';
-- Cấu trúc: { "1": "Stage 1 summary...", "2": "Stage 2 summary...", ... }
```

3. **Inject vào system prompt** — thêm Khối 5 (Candidate Context):

```ts
const candidateContextBlock = summaries.length > 0
  ? `[Bối cảnh ứng viên từ các giai đoạn trước]\n${summaries}\n` +
    `Dựa trên thông tin này, hãy cá nhân hoá câu hỏi và refer lại khi tự nhiên.`
  : '';
```

Hard-cap: tối đa 300 tokens cho block này. Nếu vượt, chỉ giữ summary của 2 stage gần nhất.

4. **Trigger:** Gọi `buildStageSummary()` async trong `next-stage` endpoint, không block response.

**Files cần sửa:**
- `server/src/behavioral/prompt-builder.service.ts` — thêm `buildStageSummary()`
- `server/src/behavioral/behavioral-session.service.ts` — gọi sau mỗi stage, pass vào `buildSystemPrompt()`
- Migration SQL thêm cột `stage_summaries`

---

## Task 1.5.5: BE – Adaptive Difficulty Signal

**Vấn đề:** Nếu candidate trả lời Stage 2 xuất sắc, AI vẫn tiếp tục ở mức difficulty mặc định ở Stage 3.

**Chi tiết công việc:**

1. `assessStagePerformance()` trong `QuestionOrchestratorService` (cùng service, tái dùng summary từ Task 1.5.4):

```ts
async assessStagePerformance(stageSummary: string): Promise<'strong' | 'average' | 'weak'>
// Prompt: "Dựa vào tóm tắt này, phân loại hiệu suất: strong/average/weak. Trả về 1 từ."
// max_tokens: 10
```

2. **Inject signal vào cuối Khối 1 (Persona):**

```ts
const difficultySignal = {
  strong: '\nỨng viên đang thể hiện tốt. Tăng độ khó: hỏi về edge cases phức tạp hơn, ' +
          'kỳ vọng câu trả lời có số liệu cụ thể, không gợi ý thêm.',
  average: '',
  weak:   '\nỨng viên đang gặp khó khăn. Hỏi câu foundation trước, cho thêm thời gian, ' +
          'dùng câu hỏi gợi mở thay vì thách thức trực tiếp.',
}[signal];
```

**Files cần sửa:**
- `server/src/behavioral/question-orchestrator.service.ts` — thêm `assessStagePerformance()`
- `server/src/behavioral/prompt-builder.service.ts` — inject signal vào persona block

---

## Task 1.5.6: BE – Scoring Model Enhancements

**Vấn đề:** Scoring hiện tại bỏ sót: mâu thuẫn giữa stages, CV inflation, communication quality, và rubric Stage 6 không rõ ràng.

**Chi tiết công việc:**

1. **Bổ sung 3 dimension vào scoring prompt** trong `ScoringService`:

```
Ngoài breakdown theo stage, đánh giá thêm:

"consistency_check": {
  "has_contradictions": boolean,
  "detail": "Stage 1 candidate nói X, Stage 5 hành động Y mâu thuẫn",
  "impact": "none | minor | significant"
},

"communication_quality": {
  "score": 0-100,
  "clarity": "Nhận xét về độ rõ ràng",
  "conciseness": "Có dài loãng, lạc chủ đề không?",
  "structure": "Có tự tổ chức câu trả lời không?"
},

"cv_claim_verification": {
  "claims_made": ["Claim đã làm X", "Claim biết Y"],
  "verified": ["X được confirm qua Stage 4"],
  "unverified_or_inflated": ["Y: không giải thích được khi hỏi sâu"]
}
```

2. **Rubric rõ ràng cho Stage 6** trong scoring prompt:

```
Chấm "stage_6_reverse_interview" theo rubric:
- 90-100: Hỏi về chiến lược kỹ thuật dài hạn, bài toán khó nhất team đang giải, KPI,
          architecture decision gần đây và reasoning đằng sau
- 70-89:  Hỏi về CI/CD, technical debt, growth path, team dynamics
- 50-69:  Hỏi về tech stack, quy trình — thông thường, không đặc biệt
- <50:    Chỉ hỏi lương/benefit hoặc không hỏi gì
Điều chỉnh kỳ vọng theo level: Junior không cần hỏi chiến lược như Senior.
```

3. **Update `FinalScore` interface** với 3 fields mới.

4. **FE – Scorecard:** Thêm:
   - `communication_quality`: 3 thanh nhỏ (Clarity / Conciseness / Structure)
   - `cv_claim_verification`: bảng ✓ verified vs ⚠ unverified
   - `consistency_check`: warning banner nếu `has_contradictions = true`

**Files cần sửa:**
- `server/src/behavioral/scoring.service.ts`
- `server/src/behavioral/entities/behavioral-session.entity.ts`
- `client/apps/web/src/components/behavioral-room/ScorecardDisplay.jsx`

---

## Task 1.5.7: BE – Graceful Off-Topic Redirect

**Vấn đề:** 3 off-topic → force next stage là cơ học và đột ngột.

**Chi tiết công việc:**

| Strike | Hành động mới |
|--------|--------------|
| 1 | Redirect nhẹ nhàng (giữ như cũ) |
| 2 | Redirect mạnh hơn + nhắc lại câu hỏi gốc rõ ràng, ghi `OFF_TOPIC_REPEATED` |
| 3 | Bridge message: *"Câu hỏi này có vẻ khó, chúng ta tiếp tục. Nếu muốn quay lại bạn có thể cho tôi biết."* → chuyển stage, **không** mark `INCOMPLETE` |
| 4+ | Lúc này mới mark `INCOMPLETE` |

Stage bị giảm điểm do `OFF_TOPIC_REPEATED` nhưng không bị `INCOMPLETE` trừ khi ≥ 4 lần.

**Files cần sửa:**
- `server/src/behavioral/behavioral-session.service.ts`
- `server/src/behavioral/message-quality.service.ts`

---

## Thứ tự implement

```
1.5.2 (Stage-specific eval)     ← Fix quan trọng nhất, impact ngay
    ↓
1.5.1 (Anchor Bank)             ← Cần có EvaluationMode từ 1.5.2
    ↓
1.5.3 (QuestionOrchestrator)    ← Cần có anchors từ 1.5.1, DB migration
    ↓
1.5.4 (Cross-stage Summary)     ← Cần Orchestrator đã tách biệt
    ↓
1.5.7 (Graceful Redirect)       ← Độc lập, implement song song với 1.5.4
    ↓
1.5.5 (Adaptive Difficulty)     ← Cần Summary từ 1.5.4
    ↓
1.5.6 (Scoring Enhancements)    ← Cuối cùng, cần toàn bộ session data tốt
```

---

## Tổng hợp DB Migrations

```sql
ALTER TABLE behavioral_sessions
  ADD COLUMN used_questions       TEXT[]  DEFAULT '{}',
  ADD COLUMN stage_summaries      JSONB   DEFAULT '{}',
  ADD COLUMN covered_competencies JSONB   DEFAULT '{}';
```

## Quản trị rủi ro

| Rủi ro | Giải pháp |
|--------|-----------|
| `buildStageSummary()` tăng latency next-stage | Gọi async, không block response. Cache vào DB ngay khi xong. |
| Anchor bank quá nhỏ, AI rephrasing thành câu giống nhau | Mỗi anchor có `intent` đủ mô tả để AI tạo nhiều biến thể. Log câu hỏi thực tế AI đã hỏi để phát hiện repetition. |
| Context block (summaries + anchors) vượt token budget | Hard-cap 300 tokens cho `candidateContextBlock`, chỉ giữ 2 stage gần nhất nếu cần. |
| Scoring prompt quá dài với 3 dimension mới | Graceful degrade: nếu JSON parse fail 3 lần, trả về scoring cũ (không có dimensions mới) thay vì `SCORING_ERROR`. |
| Orchestrator break backward compatibility khi tách | Interface Orchestrator chỉ expose 3 public methods — BehavioralSessionService chỉ gọi qua interface đó, không trực tiếp. |
