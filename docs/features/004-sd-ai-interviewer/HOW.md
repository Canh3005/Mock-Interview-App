## Overview

Xây dựng `SDInterviewerService` mới, expose qua 2 endpoint (SSE message stream + REST hint), tích hợp `GroqService` đã có với prompt template theo 4 phase. Frontend thêm `AiChatPanel` component + saga SSE (copy pattern từ behavioral round). Split thành 2 story: Story 1 (BE engine) → Story 2 (FE chat panel).

**Phase names trong codebase:** Entity dùng `DESIGN` (không phải `HIGH_LEVEL_ARCHITECTURE`) và `WRAP_UP` (không phải `EDGE_CASES`) — HOW này dùng tên codebase.

---

## Architectural Decisions

### Decision 1: Transport cho AI response

**Option A — SSE (Server-Sent Events):**
- Pro: Đã implement đầy đủ trong behavioral module, copy pattern là đủ. One-directional (server → client) phù hợp với chat stream.
- Con: Không hỗ trợ full-duplex nếu sau này cần.

**Option B — WebSocket:**
- Pro: Full-duplex, phù hợp nếu sau này cần push event từ server (phase change notification).
- Con: Cần infra mới (gateway, adapter), không có precedent trong codebase.

**Chọn: Option A (SSE)** — behavioral pattern đã production-ready, không cần infra mới. Phase change FE đã có polling qua `sdSessionSaga.js` (mỗi 5s), không cần WebSocket để push phase event.

---

### Decision 2: Phase Transition Authority

**Option A — Pure AI signal:**
- AI tự quyết định khi nào đủ điều kiện chuyển phase bằng cách include `[PHASE_COMPLETE]` token trong response.
- Pro: Linh hoạt, AI hiểu context hơn.
- Con: AI có thể hallucinate, trigger sớm/muộn không đúng lúc.

**Option B — Pure rule-based (elapsed time):**
- Backend đo elapsed time của phase, tự chuyển khi hết giờ.
- Pro: Deterministic, không bị AI hallucinate.
- Con: Không phản ánh chất lượng clarification — ứng viên có thể chuyển phase dù chưa hỏi gì.

**Option C — Hybrid:**
- AI include `[PHASE_COMPLETE]` khi đánh giá đủ điều kiện.
- Backend validate: `[PHASE_COMPLETE]` present AND (đã có entry về tất cả 3 dimension hoặc elapsed >= minPhaseTime) → transition.
- Hard override: elapsed >= maxPhaseTime → tự động transition dù không có AI signal.

**Chọn: Option C (Hybrid)** — BA.md yêu cầu hybrid. AI signal là soft gate, time limit là hard gate.

---

### Decision 3: componentCoverage Computation

**Option A — Recompute fresh mỗi request:**
- Load `architectureJSON` từ DB (đã được Epic 2 auto-save mỗi 30s), so sánh `nodes[].type` với `problem.expectedComponents`.
- Pro: Luôn chính xác, không có cache invalidation issue.
- Con: DB read mỗi /message call — acceptable vì `findOne()` đã chạy để load session anyway.

**Option B — Cache trong Redis:**
- Cache `coverage:{sessionId}` với TTL = durationMinutes.
- Pro: Nhanh hơn.
- Con: Phức tạp hơn, có thể stale nếu auto-save chậm.

**Chọn: Option A** — session `findOne()` đã load `architectureJSON`, recompute thêm O(n) so sánh string là negligible. Không thêm complexity không cần thiết.

---

### Decision 4: Hint endpoint

**Option A — SSE stream (cùng pattern với /message):**
- Pro: UX nhất quán.
- Con: Hint là 1 câu ngắn — overhead SSE không xứng.

**Option B — REST POST trả JSON:**
- Pro: Đơn giản, ít code hơn.
- Con: Không stream, nhưng hint response ngắn — không cần stream.

**Chọn: Option B (REST)** — hint là 1 Socratic question ngắn, không cần stream. Giảm complexity FE saga.

---

## Story 1: BE AI Interviewer Engine

**File count: 7 / 10**

### Backend Changes (server/)

---

**1. `server/src/sd-session/entities/sd-session.entity.ts`** — thêm 3 field mới

```typescript
@Column({ type: 'int', default: 0 })
hintsUsed: number;

@Column({ type: 'timestamp', nullable: true })
curveballInjectedAt: Date | null;

@Column({ type: 'jsonb', nullable: true })
curveballArchitectureSnapshot: { nodes: unknown[]; edges: unknown[] } | null;
```

> Cần tạo migration TypeORM sau khi thêm field. Chạy: `npm run migration:generate -- src/migrations/AddSDSessionCurveballHints`

---

**2. `server/src/sd-interviewer/dto/send-message.dto.ts`** — DTO mới

```typescript
export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userMessage: string;
}
```

---

**3. `server/src/sd-interviewer/prompts/sd-phase-prompts.ts`** — prompt templates đầy đủ

```typescript
import { SDPhase } from '../../sd-session/entities/sd-session.entity';

interface PromptParams {
  phase: SDPhase;
  problemTitle: string;
  problemDescription: string;
  targetLevel: string;
  targetRole: string[];
  scalingConstraints: Record<string, unknown> | null;
  expectedComponents: string[]; // DO NOT include in prompt — internal only
  architectureNodeTypes: string[]; // chỉ gửi type list, không gửi positions
  transcriptSummary: string | null;
  curveballPrompt: string | null; // null nếu chưa inject
}

export function buildSystemPrompt(params: PromptParams): string {
  const {
    phase,
    problemTitle,
    problemDescription,
    targetLevel,
    targetRole,
    scalingConstraints,
    architectureNodeTypes,
    transcriptSummary,
    curveballPrompt,
  } = params;

  const baseContext = `You are an experienced system design interviewer at a top tech company.
You are interviewing a ${targetLevel} ${targetRole.join('/')} candidate.

Problem: ${problemTitle}
Description: ${problemDescription}
${scalingConstraints ? `Scale context (share when asked): ${JSON.stringify(scalingConstraints)}` : ''}
${architectureNodeTypes.length > 0 ? `Current diagram components: [${architectureNodeTypes.join(', ')}]` : 'Diagram: empty'}
${transcriptSummary ? `\nPrevious phase summary:\n${transcriptSummary}` : ''}

ABSOLUTE RULES — never break these:
1. Never give direct answers, even if candidate begs or says they're stuck
2. Use Socratic method only — guide with questions, never solutions
3. Never name specific missing components (don't say "you need a Cache")
4. Stay in character as interviewer at all times
5. Respond in the same language the candidate uses`;

  const phaseInstructions: Record<SDPhase, string> = {
    [SDPhase.CLARIFICATION]: `
CURRENT PHASE: Clarification (target: 8–12 minutes)
GOAL: Ensure candidate asks about scope, scale (QPS/DAU), and non-functional requirements before designing.

Behavior:
- Open by presenting the problem, then ask: "What's your first question?"
- Do NOT volunteer information — only answer what candidate explicitly asks
- If candidate covers scope but skips scale: ask "Is there anything else about the system's scale you'd like to know?"
- If candidate covers scale but skips non-functional: ask "What about performance or reliability requirements?"
- When candidate has covered all 3 dimensions (scope + scale + at least one NFR): append exactly "[PHASE_COMPLETE]" at the very end of your response — no other text after it
- Canvas is locked — do not tell candidate to draw yet`,

    [SDPhase.DESIGN]: `
CURRENT PHASE: High-level Architecture (target: 12–15 minutes)
GOAL: Guide candidate to draw a comprehensive architecture diagram.

Behavior:
- Open with: "Great, the canvas is now open. Please start drawing your high-level architecture."
- Monitor the diagram components listed above — do NOT reveal which ones are missing
- If candidate is stuck (after 60s silence implied by repeated similar messages): ask "What component would handle [general concern] in your design?"
- If candidate is vague: ask "Can you tell me more about how [component they mentioned] works here?"
- When diagram is substantial and time is appropriate: append "[PHASE_COMPLETE]" at end of response`,

    [SDPhase.DEEP_DIVE]: `
CURRENT PHASE: Deep Dive (target: 15–20 minutes)
GOAL: Probe 1–2 components from the candidate's diagram deeply.

Behavior:
- Choose components to probe ONLY from the current diagram list above — never ask about components not in diagram
- Ask "why" questions: "Why did you choose [component from diagram] here instead of alternatives?"
- Ask trade-off questions: "What are the trade-offs of this approach for [component]?"
- Ask failure questions: "What happens if [component] goes down?"
- If candidate cannot answer after 3 follow-ups on same component: move to probe a different component from diagram
- When deep dive is complete: append "[PHASE_COMPLETE]" at end of response`,

    [SDPhase.WRAP_UP]: `
CURRENT PHASE: Edge Cases & Scenarios (remaining time)
GOAL: Test failure scenarios and scaling limits.

Behavior:
- Ask about failure scenarios: "What happens if [component from diagram] suddenly fails?"
- Ask about scaling: "How does your design handle 10x the expected traffic?"
${curveballPrompt
      ? `- INJECT THIS CURVEBALL NOW (this is your primary question for this turn): "${curveballPrompt}"`
      : '- Ask general scaling and failure questions based on the diagram'}
- Do NOT append "[PHASE_COMPLETE]" — this phase ends by session timeout`,

    [SDPhase.COMPLETED]: `Session is completed. Respond with: "The session has ended. Thank you for your time." — nothing else.`,
  };

  return `${baseContext}\n${phaseInstructions[phase]}`;
}

export function buildHintPrompt(params: {
  phase: SDPhase;
  problemTitle: string;
  architectureNodeTypes: string[];
}): string {
  return `You are providing a hint for a system design interview candidate.
Problem: ${params.problemTitle}
Phase: ${params.phase}
Current diagram: [${params.architectureNodeTypes.join(', ')}]

The candidate has requested a hint. You MUST:
1. Ask exactly ONE guiding question
2. NOT name any specific component they should add
3. NOT explain any solution or approach
4. Frame the question around a system constraint or failure scenario

Bad: "Have you considered adding a Cache?"
Good: "What happens to your database when 1 million users try to read the same popular URL at the same time?"

Respond with only the single guiding question. No preamble.`;
}
```

---

**4. `server/src/sd-interviewer/sd-interviewer.service.ts`** — service chính

Methods:
- `streamMessage({ sessionId, userMessage, res })` — SSE stream, orchestrates toàn bộ logic
- `requestHint(sessionId)` — REST, trả `{ hintMessage, hintsUsed }`
- `_computeCoverage({ architectureJSON, expectedComponents })` — private, trả `number` 0–1
- `_checkCurveballEligible(session, coverage)` — private, trả `CurveBallScenario | null`
- `_detectPhaseTransition({ session, aiResponseText })` — private, trả `SDPhase | null`
- `_buildHistory(transcriptHistory)` — private, convert transcript → GroqMessage[]
- `_getLatestSummary(transcriptHistory)` — private, lấy summary entry gần nhất
- `_summarizePhaseTranscript({ sessionId, phase, transcriptEntries })` — private fire-and-forget

```typescript
// Skeleton để Dev implement — logic đầy đủ theo spec dưới đây

@Injectable()
export class SDInterviewerService {
  private readonly logger = new Logger(SDInterviewerService.name);

  constructor(
    @InjectRepository(SDSession)
    private sdSessionRepo: Repository<SDSession>,
    private groqService: GroqService,
  ) {}

  async streamMessage({
    sessionId,
    userMessage,
    res,
  }: {
    sessionId: string;
    userMessage: string;
    res: Response;
  }): Promise<void> {
    // 1. Load session + problem (eager: false → cần load problem manually)
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.phase === SDPhase.COMPLETED) {
      throw new BadRequestException('Session already completed');
    }

    // 2. Tính componentCoverage từ architectureJSON hiện tại
    const coverage: number = this._computeCoverage({
      architectureJSON: session.architectureJSON,
      expectedComponents: session.problem.expectedComponents,
    });

    // 3. Kiểm tra curveball eligibility
    const curveball: CurveBallScenario | null = this._checkCurveballEligible(session, coverage);

    // 4. Build system prompt theo phase
    const architectureNodeTypes: string[] = session.architectureJSON
      ? session.architectureJSON.nodes.map((n: { type: string }) => n.type)
      : [];

    const latestSummary: string | null = this._getLatestSummary(session.transcriptHistory);

    const systemPrompt: string = buildSystemPrompt({
      phase: session.phase,
      problemTitle: session.problem.title,
      problemDescription: session.problem.description ?? '',
      targetLevel: session.problem.targetLevel,
      targetRole: session.problem.targetRole,
      scalingConstraints: session.problem.scalingConstraints,
      expectedComponents: session.problem.expectedComponents,
      architectureNodeTypes,
      transcriptSummary: latestSummary,
      curveballPrompt: curveball ? curveball.prompt : null,
    });

    // 5. Build conversation history (chỉ lấy entries phase hiện tại, không load full history)
    const history: GroqMessage[] = this._buildHistory(session.transcriptHistory, session.phase);

    // 6. Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 7. Stream AI response với timeout 30s
    let fullText: string = '';
    const timeoutId = setTimeout(() => {
      res.write(`data: ${JSON.stringify({ done: true, error: 'AI response timeout' })}\n\n`);
      res.end();
    }, 30_000);

    try {
      for await (const chunk of this.groqService.generateContentStream({
        model: 'llama-3.3-70b-versatile',
        contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 512 },
      })) {
        fullText += chunk.text;
        res.write(`data: ${JSON.stringify({ token: chunk.text, done: false })}\n\n`);
      }
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      this.logger.error('Groq stream error', err);
      res.write(`data: ${JSON.stringify({ done: true, error: 'AI service error' })}\n\n`);
      res.end();
      return;
    }

    // 8. Strip [PHASE_COMPLETE] token từ response
    const phaseComplete: boolean = fullText.includes('[PHASE_COMPLETE]');
    const cleanText: string = fullText.replace('[PHASE_COMPLETE]', '').trim();

    // 9. Append transcript (user + ai entries)
    const now: Date = new Date();
    const newEntries: TranscriptEntry[] = [
      { role: 'user', content: userMessage, timestamp: now, phase: session.phase },
      { role: 'ai', content: cleanText, timestamp: now, phase: session.phase },
    ];
    await this.sdSessionRepo.update(sessionId, {
      transcriptHistory: [...session.transcriptHistory, ...newEntries],
    });

    // 10. Phase transition check (hybrid: AI signal + elapsed time hard override)
    const elapsedMs: number = Date.now() - new Date(session.createdAt).getTime();
    const sessionTimeoutMs: number = session.durationMinutes * 60 * 1000;
    const isSessionTimeout: boolean = elapsedMs >= sessionTimeoutMs;

    const phaseStartEntry = session.transcriptHistory.find(
      (e: TranscriptEntry) => e.phase === session.phase,
    );
    const phaseElapsedMs: number = phaseStartEntry
      ? Date.now() - new Date(phaseStartEntry.timestamp).getTime()
      : 0;

    const PHASE_MAX_MS: Record<SDPhase, number> = {
      [SDPhase.CLARIFICATION]: 12 * 60 * 1000,
      [SDPhase.DESIGN]: 15 * 60 * 1000,
      [SDPhase.DEEP_DIVE]: 20 * 60 * 1000,
      [SDPhase.WRAP_UP]: Infinity,
      [SDPhase.COMPLETED]: 0,
    };

    // AI signal chỉ có hiệu lực sau khi đã qua thời gian tối thiểu của phase
    // Tránh AI trigger transition sau 1-2 câu hỏi đầu tiên
    const PHASE_MIN_MS: Record<SDPhase, number> = {
      [SDPhase.CLARIFICATION]: 5 * 60 * 1000,
      [SDPhase.DESIGN]: 8 * 60 * 1000,
      [SDPhase.DEEP_DIVE]: 10 * 60 * 1000,
      [SDPhase.WRAP_UP]: 0,
      [SDPhase.COMPLETED]: 0,
    };

    const isPhaseTimeout: boolean = phaseElapsedMs >= PHASE_MAX_MS[session.phase];
    const isAiSignalValid: boolean =
      phaseComplete && phaseElapsedMs >= PHASE_MIN_MS[session.phase];
    const shouldTransition: boolean = isAiSignalValid || isPhaseTimeout || isSessionTimeout;

    const PHASE_SEQUENCE: Partial<Record<SDPhase, SDPhase>> = {
      [SDPhase.CLARIFICATION]: SDPhase.DESIGN,
      [SDPhase.DESIGN]: SDPhase.DEEP_DIVE,
      [SDPhase.DEEP_DIVE]: SDPhase.WRAP_UP,
      [SDPhase.WRAP_UP]: SDPhase.COMPLETED,
    };

    let newPhase: SDPhase | null = null;
    if (isSessionTimeout) {
      newPhase = SDPhase.COMPLETED;
    } else if (shouldTransition && PHASE_SEQUENCE[session.phase]) {
      newPhase = PHASE_SEQUENCE[session.phase]!;
    }

    if (newPhase) {
      await this.sdSessionRepo.update(sessionId, { phase: newPhase });
      // Fire-and-forget summarization
      this._summarizePhaseTranscript({
        sessionId,
        phase: session.phase,
        transcriptEntries: session.transcriptHistory.filter(
          (e: TranscriptEntry) => e.phase === session.phase,
        ),
      }).catch((err: unknown) => this.logger.error('Summarization failed', err));
    }

    // 11. Curveball: mark injected nếu curveball đã được inject lần này
    let curveballInjected: boolean = false;
    if (curveball && !session.curveballInjectedAt) {
      curveballInjected = true;
      await this.sdSessionRepo.update(sessionId, {
        curveballInjectedAt: new Date(),
        curveballArchitectureSnapshot: session.architectureJSON,
      });
    }

    // 12. Done SSE event với metadata
    res.write(
      `data: ${JSON.stringify({
        done: true,
        meta: {
          phase: newPhase ?? session.phase,
          phaseChanged: !!newPhase,
          componentCoverage: Math.round(coverage * 100),
          curveballInjected,
        },
      })}\n\n`,
    );
    res.end();
  }

  async requestHint(sessionId: string): Promise<{ hintMessage: string; hintsUsed: number }> {
    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const architectureNodeTypes: string[] = session.architectureJSON
      ? session.architectureJSON.nodes.map((n: { type: string }) => n.type)
      : [];

    const hintPrompt: string = buildHintPrompt({
      phase: session.phase,
      problemTitle: session.problem.title,
      architectureNodeTypes,
    });

    const hintMessage: string = await this.groqService.generateContent({
      model: 'llama-3.3-70b-instant',
      contents: [{ role: 'user', parts: [{ text: 'Generate hint' }] }],
      config: { systemInstruction: hintPrompt, maxOutputTokens: 150 },
    });

    const newHintsUsed: number = (session.hintsUsed ?? 0) + 1;
    await this.sdSessionRepo.update(sessionId, { hintsUsed: newHintsUsed });

    return { hintMessage: hintMessage.trim(), hintsUsed: newHintsUsed };
  }

  private _computeCoverage({
    architectureJSON,
    expectedComponents,
  }: {
    architectureJSON: { nodes: { type: string }[]; edges: unknown[] } | null;
    expectedComponents: string[];
  }): number {
    if (!architectureJSON || expectedComponents.length === 0) return 0;
    const presentTypes: Set<string> = new Set(
      architectureJSON.nodes.map((n: { type: string }) => n.type),
    );
    const matched: number = expectedComponents.filter((c: string) => presentTypes.has(c)).length;
    return matched / expectedComponents.length;
  }

  private _checkCurveballEligible(
    session: SDSession,
    coverage: number,
  ): CurveBallScenario | null {
    if (!session.enableCurveball) return null;
    if (session.curveballInjectedAt) return null; // đã inject rồi
    if (session.phase === SDPhase.CLARIFICATION) return null;
    if (coverage < 0.8) return null; // threshold 80%
    if (!session.problem.curveBallScenarios?.length) return null;
    return session.problem.curveBallScenarios[0]; // luôn lấy scenario đầu tiên
  }

  private _buildHistory(
    transcriptHistory: TranscriptEntry[],
    currentPhase: SDPhase,
  ): GroqMessage[] {
    // Lấy entries của phase hiện tại (sau summary) + 1 summary entry gần nhất
    const summaryEntry = [...transcriptHistory]
      .reverse()
      .find((e: TranscriptEntry) => e.role === 'summary');
    const currentPhaseEntries = transcriptHistory.filter(
      (e: TranscriptEntry) => e.phase === currentPhase && e.role !== 'summary',
    );

    const entries: TranscriptEntry[] = summaryEntry
      ? [summaryEntry, ...currentPhaseEntries]
      : currentPhaseEntries;

    return entries.map((e: TranscriptEntry) => ({
      role: e.role === 'ai' ? 'model' : 'user',
      parts: [{ text: e.content }],
    }));
  }

  private _getLatestSummary(transcriptHistory: TranscriptEntry[]): string | null {
    const summaryEntry = [...transcriptHistory]
      .reverse()
      .find((e: TranscriptEntry) => e.role === 'summary');
    return summaryEntry ? summaryEntry.content : null;
  }

  private async _summarizePhaseTranscript({
    sessionId,
    phase,
    transcriptEntries,
  }: {
    sessionId: string;
    phase: SDPhase;
    transcriptEntries: TranscriptEntry[];
  }): Promise<void> {
    if (transcriptEntries.length === 0) return;
    const dialogue = transcriptEntries
      .map((e: TranscriptEntry) => `${e.role.toUpperCase()}: ${e.content}`)
      .join('\n');

    const summary: string = await this.groqService.generateContent({
      model: 'llama-3.1-8b-instant',
      contents: [{ role: 'user', parts: [{ text: dialogue }] }],
      config: {
        systemInstruction: `Summarize this system design interview phase (${phase}) conversation in 3–5 bullet points. Focus on key decisions, trade-offs mentioned, and components discussed. Be concise.`,
        maxOutputTokens: 300,
      },
    });

    const session: SDSession | null = await this.sdSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return;

    const summaryEntry: TranscriptEntry = {
      role: 'summary',
      content: `[${phase} SUMMARY]\n${summary.trim()}`,
      timestamp: new Date(),
      phase,
    };

    await this.sdSessionRepo.update(sessionId, {
      transcriptHistory: [...session.transcriptHistory, summaryEntry],
    });
  }
}

// Types (thêm vào entity hoặc file riêng)
interface TranscriptEntry {
  role: 'user' | 'ai' | 'summary';
  content: string;
  timestamp: Date;
  phase: SDPhase;
}

interface CurveBallScenario {
  trigger: string;
  prompt: string;
  expectedAdaptation: string;
}
```

---

**5. `server/src/sd-interviewer/sd-interviewer.controller.ts`** — 2 endpoints

```typescript
@ApiTags('sd-interviewer')
@Controller('sd-sessions')
export class SDInterviewerController {
  constructor(private readonly sdInterviewerService: SDInterviewerService) {}

  @Post(':id/message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message to AI interviewer (SSE stream)' })
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.sdInterviewerService.streamMessage({
      sessionId,
      userMessage: dto.userMessage,
      res,
    });
  }

  @Post(':id/hint')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a Socratic hint (REST, no stream)' })
  async requestHint(
    @Param('id') sessionId: string,
  ): Promise<{ hintMessage: string; hintsUsed: number }> {
    return this.sdInterviewerService.requestHint(sessionId);
  }
}
```

---

**6. `server/src/sd-interviewer/sd-interviewer.module.ts`** — module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([SDSession])],
  controllers: [SDInterviewerController],
  providers: [SDInterviewerService],
})
export class SDInterviewerModule {}
```

> `AiModule` đã `@Global()` — `GroqService` available không cần import lại.

---

**7. `server/src/app.module.ts`** — import module mới

```typescript
// Thêm vào imports array:
SDInterviewerModule,
```

---

## API Contract — Story 1

### `POST /sd-sessions/:id/message`
- **Auth:** Bearer token (JwtAuthGuard)
- **Request body:** `{ "userMessage": "string" }`
- **Response:** SSE stream (`Content-Type: text/event-stream`)

```
// Mỗi token:
data: { "token": "string", "done": false }

// Kết thúc stream:
data: {
  "done": true,
  "meta": {
    "phase": "CLARIFICATION" | "DESIGN" | "DEEP_DIVE" | "WRAP_UP" | "COMPLETED",
    "phaseChanged": boolean,
    "componentCoverage": number,   // 0–100 (integer percent)
    "curveballInjected": boolean
  }
}

// Lỗi (timeout hoặc AI fail):
data: { "done": true, "error": "string" }
```

### `POST /sd-sessions/:id/hint`
- **Auth:** Bearer token
- **Request body:** (empty)
- **Response JSON:**
```json
{
  "hintMessage": "string",
  "hintsUsed": 3
}
```

---

## Stability Notes — Story 1

| Vấn đề | Giải pháp |
|--------|-----------|
| AI stream timeout | `setTimeout(30_000)` → write error SSE event → `res.end()` — `clearTimeout` ngay khi stream xong bình thường |
| Phase transition race condition | `sdSessionRepo.update()` là idempotent (DESIGN→DESIGN là no-op) — chấp nhận race case hiếm gặp; không thêm lock vì overhead không tương xứng |
| Curveball double injection | DB field `curveballInjectedAt` là single source of truth — check `!session.curveballInjectedAt` trước mỗi inject |
| AI trả về không có `[PHASE_COMPLETE]` | Bình thường — phase chỉ chuyển khi đủ điều kiện hybrid; không error |
| Groq rate limit | Lỗi propagate qua catch → write error SSE event; không retry tự động (để tránh thundering herd) |
| `requestHint` timeout | `generateContent` (non-stream) — Groq SDK có default timeout. Không cần custom timeout cho call ngắn này |

---

## Not Changing — Story 1

- `sd-session.service.ts` và `sd-session.controller.ts` — không đụng tới
- `sd-session.entity.ts` chỉ thêm 3 field mới, không sửa field cũ
- `ai.module.ts` — không thêm service mới (dùng GroqService đã có)
- Bất kỳ epic nào khác (Epic 2 canvas, Epic 1 personalization)

---

## File Count — Story 1

| # | File | Thay đổi |
|---|------|----------|
| 1 | `server/src/sd-session/entities/sd-session.entity.ts` | Thêm 3 field |
| 2 | `server/src/sd-interviewer/dto/send-message.dto.ts` | Tạo mới |
| 3 | `server/src/sd-interviewer/prompts/sd-phase-prompts.ts` | Tạo mới |
| 4 | `server/src/sd-interviewer/sd-interviewer.service.ts` | Tạo mới |
| 5 | `server/src/sd-interviewer/sd-interviewer.controller.ts` | Tạo mới |
| 6 | `server/src/sd-interviewer/sd-interviewer.module.ts` | Tạo mới |
| 7 | `server/src/app.module.ts` | Thêm import |

**Tổng: 7 / 10** ✓

---

---

## Story 2: FE AI Chat Panel

**Prerequisite:** Story 1 done — API contract phải available.

**File count: 8 / 10**

### Frontend Changes (client/apps/web/)

---

**1. `client/apps/web/src/api/sdInterviewer.api.js`** — API wrapper

```javascript
import axiosClient from './axiosClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

const _getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const sdInterviewerApi = {
  // SSE stream — phải dùng fetch, axiosClient không hỗ trợ streaming
  createMessageStream: (sessionId, payload) =>
    fetch(`${API_BASE}/sd-sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ..._getAuthHeader() },
      body: JSON.stringify(payload),
    }),

  // REST — dùng axiosClient bình thường
  requestHint: (sessionId) =>
    axiosClient.post(`/sd-sessions/${sessionId}/hint`),
};
```

> `createMessageStream` dùng `fetch` trực tiếp vì axiosClient không hỗ trợ ReadableStream. Pattern này copy từ `behavioralApi.createMessageStream`.

---

**2. `client/apps/web/src/store/slices/sdInterviewerSlice.js`** — Redux slice

```javascript
import { createSlice } from '@reduxjs/toolkit';

const sdInterviewerSlice = createSlice({
  name: 'sdInterviewer',
  initialState: {
    chatHistory: [],       // [{ role: 'user'|'ai', content, timestamp, phase }]
    streamingMessage: '',  // token đang stream (chưa hoàn thành)
    componentCoverage: 0,  // 0–100 integer
    hintsUsed: 0,
    hintLoading: false,
    loading: false,
    error: null,
  },
  reducers: {
    sendMessageRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.streamingMessage = '';
    },
    streamChunk: (state, action) => {
      state.streamingMessage += action.payload;
    },
    streamDone: (state, action) => {
      const { userMessage, fullText, meta } = action.payload;
      state.loading = false;
      state.streamingMessage = '';
      state.chatHistory.push(
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'ai', content: fullText, timestamp: new Date().toISOString() },
      );
      state.componentCoverage = meta.componentCoverage;
    },
    streamFailure: (state, action) => {
      state.loading = false;
      state.streamingMessage = '';
      state.error = action.payload;
    },
    requestHintRequest: (state) => { state.hintLoading = true; },
    requestHintSuccess: (state, action) => {
      const { hintMessage, hintsUsed } = action.payload;
      state.hintLoading = false;
      state.hintsUsed = hintsUsed;
      state.chatHistory.push({
        role: 'hint',
        content: hintMessage,
        timestamp: new Date().toISOString(),
      });
    },
    requestHintFailure: (state, action) => {
      state.hintLoading = false;
      state.error = action.payload;
    },
    resetInterviewer: () => ({
      chatHistory: [], streamingMessage: '',
      componentCoverage: 0, hintsUsed: 0,
      hintLoading: false, loading: false, error: null,
    }),
  },
});

export const {
  sendMessageRequest, streamChunk, streamDone, streamFailure,
  requestHintRequest, requestHintSuccess, requestHintFailure,
  resetInterviewer,
} = sdInterviewerSlice.actions;

export default sdInterviewerSlice.reducer;
```

---

**3. `client/apps/web/src/store/sagas/sdInterviewerSaga.js`** — saga với SSE + hint

```javascript
import { call, put, take, takeLatest, cancelled } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import { sdInterviewerApi } from '../../api/sdInterviewer.api';
import {
  sendMessageRequest, streamChunk, streamDone, streamFailure,
  requestHintRequest, requestHintSuccess, requestHintFailure,
} from '../slices/sdInterviewerSlice';
import { toast } from 'react-toastify';

function _createSSEChannel({ sessionId, userMessage }) {
  return eventChannel((emit) => {
    sdInterviewerApi.createMessageStream(sessionId, { userMessage }).then((response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      const _read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            emit({ type: 'done', fullText, meta: {} });
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.error) {
                emit({ type: 'error', error: parsed.error });
                return;
              }
              if (parsed.done) {
                emit({ type: 'done', fullText, meta: parsed.meta ?? {} });
                return;
              }
              if (parsed.token) {
                fullText += parsed.token;
                emit({ type: 'chunk', token: parsed.token });
              }
            } catch {
              // ignore parse error on partial line
            }
          }
          _read();
        });
      };
      _read();
    });

    return () => {}; // no cleanup needed (stream ends naturally)
  });
}

function* _handleSendMessage(action) {
  const { sessionId, userMessage } = action.payload;
  const channel = yield call(_createSSEChannel, { sessionId, userMessage });

  try {
    while (true) {
      const event = yield take(channel);
      if (event.type === 'chunk') {
        yield put(streamChunk(event.token));
      } else if (event.type === 'done') {
        yield put(streamDone({ userMessage, fullText: event.fullText, meta: event.meta }));
        channel.close();
        break;
      } else if (event.type === 'error') {
        yield put(streamFailure(event.error));
        toast.error(event.error);
        channel.close();
        break;
      }
    }
  } finally {
    if (yield cancelled()) channel.close();
  }
}

function* _handleRequestHint(action) {
  const { sessionId } = action.payload;
  try {
    const response = yield call(sdInterviewerApi.requestHint, sessionId);
    yield put(requestHintSuccess(response));
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to get hint';
    yield put(requestHintFailure(message));
    toast.error(message);
  }
}

export function* sdInterviewerSaga() {
  yield takeLatest(sendMessageRequest.type, _handleSendMessage);
  yield takeLatest(requestHintRequest.type, _handleRequestHint);
}
```

---

**4. `client/apps/web/src/components/sd-session/AiChatPanel.jsx`** — UI component

```jsx
// Layout: panel bên phải của SD session page
// Sections: chat history (scroll), streaming bubble, input box, hint button, coverage badge

import React, { useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MessageCircle, Lightbulb, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  sendMessageRequest,
  requestHintRequest,
} from '../../store/slices/sdInterviewerSlice';

export default function AiChatPanel({ sessionId }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { chatHistory, streamingMessage, componentCoverage, hintsUsed, loading, hintLoading } =
    useSelector((s) => s.sdInterviewer);
  const [inputValue, setInputValue] = React.useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, streamingMessage]);

  const _handleSend = useCallback(() => {
    if (!inputValue.trim() || loading) return;
    dispatch(sendMessageRequest({ sessionId, userMessage: inputValue.trim() }));
    setInputValue('');
  }, [inputValue, loading, dispatch, sessionId]);

  const _handleHint = useCallback(() => {
    if (hintLoading) return;
    dispatch(requestHintRequest({ sessionId }));
  }, [hintLoading, dispatch, sessionId]);

  const _handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _handleSend(); }
  }, [_handleSend]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">{t('sdInterviewer.title')}</span>
        </div>
        <span className="text-xs text-gray-500">
          {t('sdInterviewer.coverage', { percent: componentCoverage })}
        </span>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'hint'
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.role === 'hint' && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium text-amber-700">
                  <Lightbulb size={12} /> {t('sdInterviewer.hint')}
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-800">
              {streamingMessage}
              <span className="animate-pulse">▌</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Hint button */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={_handleHint}
          disabled={hintLoading || loading}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-40"
        >
          <Lightbulb size={12} />
          {hintLoading ? t('sdInterviewer.hintLoading') : t('sdInterviewer.requestHint', { count: hintsUsed })}
        </button>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={_handleKeyDown}
          placeholder={t('sdInterviewer.inputPlaceholder')}
          disabled={loading}
          rows={2}
          className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button
          onClick={_handleSend}
          disabled={!inputValue.trim() || loading}
          className="self-end p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
```

---

**5. `client/apps/web/src/store/sagas/rootSaga.js`** — đăng ký saga mới

```javascript
// Thêm vào rootSaga:
import { sdInterviewerSaga } from './sdInterviewerSaga';

// Trong all([...]):
fork(sdInterviewerSaga),
```

---

**6–8. i18n files** — thêm keys vào cả 3 file

```json
// Thêm vào en.json:
"sdInterviewer": {
  "title": "AI Interviewer",
  "coverage": "Coverage: {{percent}}%",
  "hint": "Hint",
  "requestHint": "Request hint (used: {{count}})",
  "hintLoading": "Getting hint...",
  "inputPlaceholder": "Type your answer or question...",
  "hintPenaltyNote": "Each hint reduces your final score"
}

// vi.json:
"sdInterviewer": {
  "title": "AI Phỏng vấn",
  "coverage": "Bao phủ: {{percent}}%",
  "hint": "Gợi ý",
  "requestHint": "Xin gợi ý (đã dùng: {{count}})",
  "hintLoading": "Đang tạo gợi ý...",
  "inputPlaceholder": "Nhập câu trả lời hoặc câu hỏi...",
  "hintPenaltyNote": "Mỗi gợi ý làm giảm điểm cuối phiên"
}

// ja.json:
"sdInterviewer": {
  "title": "AIインタビュアー",
  "coverage": "カバレッジ: {{percent}}%",
  "hint": "ヒント",
  "requestHint": "ヒントをリクエスト（使用済み: {{count}}）",
  "hintLoading": "ヒントを取得中...",
  "inputPlaceholder": "回答または質問を入力してください...",
  "hintPenaltyNote": "ヒントを使用すると最終スコアが下がります"
}
```

---

## Stability Notes — Story 2

| Vấn đề | Giải pháp |
|--------|-----------|
| SSE connection drop giữa chừng | `_createSSEChannel` không có reconnect — nếu drop, `streamFailure` được dispatch, user thấy error toast và có thể retry bằng cách gửi lại message |
| `takeLatest` cancel mid-stream | Saga `cancelled()` trong `finally` → close channel gracefully (stream reader không đọc tiếp) |
| Hint click spam | `hintLoading` state disable button ngay khi click — `requestHintRequest` chỉ được gửi 1 lần |
| Phase change không reflect trên UI | Phase được poll bởi `sdSessionSaga` (đã có, mỗi 5s) → khi phase change, sdSessionSlice cập nhật → AiChatPanel và Canvas đọc phase từ đó |

---

## Not Changing — Story 2

- `sdSessionSaga.js` — không sửa (phase polling đã hoạt động)
- `sdSessionSlice.js` — không sửa
- Bất kỳ component nào của Canvas (Epic 2)

---

## File Count — Story 2

| # | File | Thay đổi |
|---|------|----------|
| 1 | `client/apps/web/src/api/sdInterviewer.api.js` | Tạo mới |
| 2 | `client/apps/web/src/store/slices/sdInterviewerSlice.js` | Tạo mới |
| 3 | `client/apps/web/src/store/sagas/sdInterviewerSaga.js` | Tạo mới |
| 4 | `client/apps/web/src/components/sd-session/AiChatPanel.jsx` | Tạo mới |
| 5 | `client/apps/web/src/store/sagas/rootSaga.js` | Thêm import + fork |
| 6 | `client/apps/web/src/i18n/locales/en.json` | Thêm keys |
| 7 | `client/apps/web/src/i18n/locales/vi.json` | Thêm keys |
| 8 | `client/apps/web/src/i18n/locales/ja.json` | Thêm keys |

**Tổng: 8 / 10** ✓
