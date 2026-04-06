import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BEHAVIORAL_SCORING_QUEUE } from '../jobs/jobs.constants';
import {
  BehavioralSession,
  CandidateLevel,
} from './entities/behavioral-session.entity';
import { BehavioralStageLog } from './entities/behavioral-stage-log.entity';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PromptBuilderService, STAGE_NAMES } from './prompt-builder.service';
import { AIFacilitatorService, TurnContext } from './ai-facilitator.service';
import { MessageQualityService } from './message-quality.service';
import { ScoringService } from './scoring.service';
import { QuestionOrchestratorService } from './question-orchestrator.service';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { CombatTransitionService } from '../combat/combat-transition.service';
import { MultimodalHintService } from '../combat/multimodal-hint.service';
import { MultimodalScoringService } from '../combat/multimodal-scoring.service';

const REDIRECT_MESSAGES = {
  obvious:
    'Mình chưa nhận được câu trả lời rõ ràng. Bạn có thể chia sẻ suy nghĩ của mình về câu hỏi vừa rồi không?',
  offTopicRepeated:
    'Câu trả lời có vẻ chưa liên quan đến câu hỏi. Để nhắc lại — ',
  offTopicBridge:
    'Câu hỏi này có vẻ khó, chúng ta tiếp tục nhé. Nếu muốn quay lại bạn có thể cho tôi biết.',
  offTopicPersistent:
    'Chúng ta sẽ chuyển sang câu hỏi tiếp theo. Hãy cố gắng tập trung hơn ở các phần sau nhé.',
};

@Injectable()
export class BehavioralSessionService {
  private readonly logger = new Logger(BehavioralSessionService.name);
  private redisClient: Redis;

  constructor(
    @InjectRepository(BehavioralSession)
    private sessionRepo: Repository<BehavioralSession>,
    @InjectRepository(BehavioralStageLog)
    private logRepo: Repository<BehavioralStageLog>,
    @InjectRepository(InterviewSession)
    private interviewSessionRepo: Repository<InterviewSession>,
    private configService: ConfigService,
    private promptBuilder: PromptBuilderService,
    private aiFacilitator: AIFacilitatorService,
    private qualityService: MessageQualityService,
    private scoringService: ScoringService,
    private orchestrator: QuestionOrchestratorService,
    private combatTransition: CombatTransitionService,
    private multimodalHint: MultimodalHintService,
    private multimodalScoring: MultimodalScoringService,
    @InjectQueue(BEHAVIORAL_SCORING_QUEUE) private scoringQueue: Queue,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST') || '127.0.0.1',
      port: this.configService.get('REDIS_PORT') || 6379,
    });
  }

  // ─── Start session ────────────────────────────────────────────────────────

  async startSession(dto: StartSessionDto): Promise<{
    sessionId: string;
    currentStage: number;
    firstQuestion: string;
    candidateLevel: CandidateLevel;
    stageName: string;
  }> {
    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: dto.interviewSessionId },
    });

    if (!interviewSession) {
      throw new NotFoundException('Interview session not found');
    }

    if (!interviewSession.candidateLevel) {
      throw new BadRequestException(
        'Candidate level is not set on the interview session',
      );
    }

    const level = interviewSession.candidateLevel as CandidateLevel;

    // // ── Idempotency: resume existing IN_PROGRESS session ──────────────────
    // const existingSession = await this.sessionRepo.findOne({
    //   where: {
    //     interviewSessionId: dto.interviewSessionId,
    //     status: 'IN_PROGRESS',
    //   },
    //   order: { startedAt: 'DESC' },
    // });

    // if (existingSession) {
    //   this.logger.log(
    //     `Resuming behavioral session ${existingSession.id} at stage ${existingSession.currentStage} [${level}]`,
    //   );

    //   // Ensure system prompt is cached for current stage (may have expired)
    //   const cacheKey = `system_prompt:${existingSession.id}:${existingSession.currentStage}`;
    //   const cached = await this.redisClient.get(cacheKey);
    //   if (!cached) {
    //     const systemPrompt = this.promptBuilder.buildSystemPrompt(
    //       level,
    //       interviewSession.cvContextSnapshot ?? '',
    //       interviewSession.jdContextSnapshot ?? '',
    //       existingSession.currentStage,
    //     );
    //     await this.redisClient.setex(cacheKey, 7200, systemPrompt);
    //   }

    //   const stageName = STAGE_NAMES[existingSession.currentStage];
    //   const resumeGreeting = `Chào mừng bạn quay lại! Chúng ta đang ở **${stageName}** (Giai đoạn ${existingSession.currentStage}/6). Hãy tiếp tục từ nơi chúng ta đã dừng nhé.`;

    //   return {
    //     sessionId: existingSession.id,
    //     currentStage: existingSession.currentStage,
    //     firstQuestion: resumeGreeting,
    //     candidateLevel: level,
    //     stageName,
    //   };
    // }

    // ── Create new session ────────────────────────────────────────────────
    const behavioralSession = this.sessionRepo.create({
      interviewSessionId: dto.interviewSessionId,
      candidateLevel: level,
      currentStage: 1,
      status: 'IN_PROGRESS',
    });

    await this.sessionRepo.save(behavioralSession);

    const firstQuestion = await this.promptBuilder.buildFirstQuestion(
      level,
      1,
      interviewSession.cvContextSnapshot ?? '',
    );

    // Log the first AI message
    await this.logRepo.save(
      this.logRepo.create({
        behavioralSessionId: behavioralSession.id,
        stageNumber: 1,
        stageName: STAGE_NAMES[1],
        role: 'AI_FACILITATOR',
        content: firstQuestion,
        inputType: 'text',
      }),
    );

    // Cache system prompt for stage 1
    const systemPrompt = this.promptBuilder.buildSystemPrompt(
      level,
      interviewSession.cvContextSnapshot ?? '',
      interviewSession.jdContextSnapshot ?? '',
      1,
    );
    await this.redisClient.setex(
      `system_prompt:${behavioralSession.id}:1`,
      7200,
      systemPrompt,
    );

    this.logger.log(
      `Behavioral session ${behavioralSession.id} started [${level}]`,
    );

    return {
      sessionId: behavioralSession.id,
      currentStage: 1,
      firstQuestion,
      candidateLevel: level,
      stageName: STAGE_NAMES[1],
    };
  }

  // ─── Send message (SSE streaming) ────────────────────────────────────────

  async sendMessage(
    sessionId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);

    const stage = session.currentStage;
    const level = session.candidateLevel;

    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: session.interviewSessionId },
    });

    // ── Input quality guard ────────────────────────────────────────────────
    const { content, flags } = this.qualityService.processInputQuality(dto);

    // ── Rule-based pre-filter ──────────────────────────────────────────────
    if (this.qualityService.isObviouslyIrrelevant(content)) {
      await this.saveUserLog(sessionId, stage, level, content, dto, flags);
      this.sendStaticSSE(res, REDIRECT_MESSAGES.obvious);
      await this.saveAiLog(sessionId, stage, REDIRECT_MESSAGES.obvious);
      return;
    }

    // ── Get/rebuild base system prompt ────────────────────────────────────
    let systemPrompt = await this.redisClient.get(
      `system_prompt:${sessionId}:${stage}`,
    );

    const truncationNote = flags.includes('INPUT_TRUNCATED')
      ? 'Câu trả lời của ứng viên đã bị cắt bớt do vượt giới hạn độ dài'
      : undefined;

    if (!systemPrompt) {
      const contextBlock = this.promptBuilder.buildCandidateContextBlock(
        session.stageSummaries ?? {},
        stage,
      );
      systemPrompt = this.promptBuilder.buildSystemPrompt(
        level,
        interviewSession?.cvContextSnapshot ?? '',
        interviewSession?.jdContextSnapshot ?? '',
        stage,
        truncationNote,
        contextBlock,
      );
      await this.redisClient.setex(
        `system_prompt:${sessionId}:${stage}`,
        7200,
        systemPrompt,
      );
    } else if (truncationNote) {
      systemPrompt += `\n[Lưu ý hệ thống: ${truncationNote}]`;
    }

    // ── Inject fresh anchor instruction ───────────────────────────────────
    const coveredForStage = session.coveredCompetencies?.[String(stage)] ?? [];
    console.log(`Covered competencies for stage ${stage}:`, coveredForStage);
    const nextAnchor = this.orchestrator.getNextAnchor(
      stage,
      level,
      coveredForStage,
    );
    if (nextAnchor) {
      const anchorInstruction = this.orchestrator.buildAnchorInstruction(
        nextAnchor,
        interviewSession?.cvContextSnapshot ?? '',
        '',
      );
      systemPrompt += `\n\n${anchorInstruction}`;
    } else {
      // Hết anchor — đào sâu tự do vào CV thay vì hỏi chung chung
      systemPrompt += `\n\n[Hướng dẫn khi đã cover đủ competency] Chọn một công nghệ hoặc quyết định kỹ thuật cụ thể trong CV ứng viên và hỏi sâu vào đó. KHÔNG hỏi kiểu "kể về dự án" hay "kinh nghiệm của bạn" — thay vào đó hỏi vào một chi tiết implementation cụ thể, ví dụ: tại sao chọn X thay vì Y, đã gặp vấn đề gì khi dùng X, hoặc X hoạt động như thế nào bên dưới.`;
    }
    console.log(`Final system prompt for stage ${stage}:\n`, systemPrompt);
    // ── Build history for this stage ──────────────────────────────────────
    const stageLogs = await this.logRepo.find({
      where: { behavioralSessionId: sessionId, stageNumber: stage },
      order: { timestamp: 'ASC' },
    });

    const history: TurnContext[] = stageLogs
      .filter((l) => l.role !== 'SYSTEM')
      .map((l) => ({
        role: l.role === 'USER' ? 'user' : 'model',
        parts: [{ text: l.content }],
      }));

    // ── Off-topic counter check (4-strike logic) ─────────────────────────
    const offTopicCount =
      this.qualityService.countConsecutiveOffTopic(stageLogs);

    // Strike 3 (offTopicCount === 2): bridge message, chuyển stage nhưng KHÔNG mark INCOMPLETE
    if (offTopicCount === 2) {
      await this.saveUserLog(sessionId, stage, level, content, dto, [
        ...flags,
        'OFF_TOPIC_BRIDGE',
      ]);
      await this.saveAiLog(sessionId, stage, REDIRECT_MESSAGES.offTopicBridge, [
        'OFF_TOPIC_BRIDGE',
      ]);
      this.sendStaticSSE(res, REDIRECT_MESSAGES.offTopicBridge);
      return;
    }

    // Strike 4+ (offTopicCount >= 3): mark INCOMPLETE
    if (offTopicCount >= 3) {
      await this.saveUserLog(sessionId, stage, level, content, dto, [
        ...flags,
        'OFF_TOPIC_PERSISTENT',
      ]);
      await this.saveAiLog(
        sessionId,
        stage,
        REDIRECT_MESSAGES.offTopicPersistent,
        ['OFF_TOPIC_PERSISTENT'],
      );
      this.sendStaticSSE(res, REDIRECT_MESSAGES.offTopicPersistent);
      return;
    }

    // ── Combat mode: multimodal hint injection ────────────────────────────
    const isCombat = interviewSession?.mode === 'combat';
    if (isCombat && dto.multimodalContext) {
      const hint = this.multimodalHint.buildHint(dto.multimodalContext);
      if (hint) systemPrompt += hint;
    }

    // ── Combat mode: pre-compute transition decision ───────────────────────
    if (isCombat && dto.stageElapsedMs !== undefined) {
      const totalBudget = dto.totalBudgetMs ?? 1_200_000;
      const stageBudget = this.combatTransition.getStageBudget(
        stage,
        totalBudget,
      );
      const offTopicCount =
        this.qualityService.countConsecutiveOffTopic(stageLogs);
      const turnsInStage =
        dto.turnsInStage ??
        stageLogs.filter((l) => l.role === 'USER').length + 1;
      const decision = this.combatTransition.evaluateTransition(level, stage, {
        turnsInStage,
        stageElapsedMs: dto.stageElapsedMs,
        timeBudgetMs: stageBudget,
        drillDepth: 0,
        lastResponseQuality: 'adequate',
        offTopicCount,
      });
      if (decision.shouldTransition && decision.transitionPhrase) {
        // Skip AI call entirely — send transition phrase as static SSE
        await this.saveUserLog(sessionId, stage, level, content, dto, flags);
        const transitionMeta = {
          combatTransition: {
            shouldTransition: true,
            reason: decision.reason,
            nextStage: decision.nextStage,
            transitionPhrase: decision.transitionPhrase,
          },
        };
        this.sendStaticSSEWithMeta(
          res,
          decision.transitionPhrase,
          transitionMeta,
        );
        await this.saveAiLog(sessionId, stage, decision.transitionPhrase, [
          'STAGE_TRANSITION',
        ]);
        return;
      }
    }

    // ── Run relevance check in parallel with main stream ─────────────────
    const lastAiMsg = stageLogs
      .filter((l) => l.role === 'AI_FACILITATOR')
      .pop();
    const currentQuestion = lastAiMsg?.content ?? '';

    // ── Save user log ─────────────────────────────────────────────────────
    await this.saveUserLog(sessionId, stage, level, content, dto, flags);

    const [relevanceResult, streamResult] = await Promise.all([
      this.aiFacilitator.checkRelevance(currentQuestion, content),
      this.aiFacilitator.streamFacilitatorResponse({
        res,
        systemPrompt,
        history,
        userMessage: content,
        stage,
      }),
    ]);

    // ── Determine off-topic flags ────────────────────────────────────────
    const aiFlags = this.qualityService.buildOffTopicFlags(
      relevanceResult.relevant,
      offTopicCount,
    );
    console.log(
      nextAnchor ? `Next anchor: ${nextAnchor.id}` : 'No more anchors to cover',
    );
    // ── Advance anchor every 2 user turns ────────────────────────────────
    if (
      nextAnchor &&
      !aiFlags.includes('OFF_TOPIC_FIRST') &&
      !aiFlags.includes('OFF_TOPIC_REPEATED')
    ) {
      const userTurnCount =
        stageLogs.filter((l) => l.role === 'USER').length + 1;
      console.log(`User turn count for stage ${stage}:`, userTurnCount);
      if (userTurnCount % 2 === 0) {
        const currentCovered =
          session.coveredCompetencies?.[String(stage)] ?? [];
        if (!currentCovered.includes(nextAnchor.id)) {
          session.coveredCompetencies = {
            ...(session.coveredCompetencies ?? {}),
            [String(stage)]: [...currentCovered, nextAnchor.id],
          };
          await this.sessionRepo.save(session);
        }
      }
    }

    // ── Save AI response log ─────────────────────────────────────────────
    const aiLog = this.logRepo.create({
      behavioralSessionId: sessionId,
      stageNumber: stage,
      stageName: STAGE_NAMES[stage],
      role: 'AI_FACILITATOR',
      content: streamResult.fullText,
      inputType: 'text',
      relevanceScore: relevanceResult.relevant ? 1.0 : 0.0,
      qualityFlags: aiFlags,
    });
    await this.logRepo.save(aiLog);
  }

  // ─── Next stage ───────────────────────────────────────────────────────────

  async nextStage(sessionId: string): Promise<{
    currentStage: number;
    stageName: string;
    firstQuestion: string;
  }> {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.currentStage >= 6) {
      throw new BadRequestException('Already at the last stage');
    }

    const newStage = session.currentStage + 1;
    session.currentStage = newStage;
    await this.sessionRepo.save(session);

    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: session.interviewSessionId },
    });

    const cv = interviewSession?.cvContextSnapshot ?? '';
    const jd = interviewSession?.jdContextSnapshot ?? '';

    const firstQuestion = await this.promptBuilder.buildFirstQuestion(
      session.candidateLevel,
      newStage,
      cv,
    );

    // Log the opening question for new stage
    await this.logRepo.save(
      this.logRepo.create({
        behavioralSessionId: sessionId,
        stageNumber: newStage,
        stageName: STAGE_NAMES[newStage],
        role: 'AI_FACILITATOR',
        content: firstQuestion,
        inputType: 'text',
      }),
    );

    const prevStage = newStage - 1;

    // Build initial system prompt for new stage (no difficulty signal yet)
    const contextBlock = this.promptBuilder.buildCandidateContextBlock(
      session.stageSummaries ?? {},
      newStage,
    );
    const systemPrompt = this.promptBuilder.buildSystemPrompt(
      session.candidateLevel,
      cv,
      jd,
      newStage,
      undefined,
      contextBlock,
    );
    await this.redisClient.setex(
      `system_prompt:${sessionId}:${newStage}`,
      7200,
      systemPrompt,
    );

    // Async: summarise previous stage → assess difficulty → re-cache prompt
    void (async () => {
      try {
        const prevLogs = await this.logRepo.find({
          where: { behavioralSessionId: sessionId, stageNumber: prevStage },
          order: { timestamp: 'ASC' },
        });
        const transcript = prevLogs
          .filter((l) => l.role !== 'SYSTEM')
          .map((l) => `${l.role === 'USER' ? 'Ứng viên' : 'AI'}: ${l.content}`)
          .join('\n');

        const summary = await this.promptBuilder.buildStageSummary(
          prevStage,
          STAGE_NAMES[prevStage],
          transcript,
        );

        if (summary) {
          const freshSession = await this.sessionRepo.findOne({
            where: { id: sessionId },
          });
          if (freshSession) {
            freshSession.stageSummaries = {
              ...(freshSession.stageSummaries ?? {}),
              [String(prevStage)]: summary,
            };
            await this.sessionRepo.save(freshSession);

            // Re-assess difficulty and rebuild cached prompt
            const signal =
              await this.orchestrator.assessStagePerformance(summary);
            const DIFFICULTY_SIGNALS = {
              strong:
                '\nỨng viên đang thể hiện tốt. Tăng độ khó: hỏi về edge cases phức tạp hơn, kỳ vọng câu trả lời có số liệu cụ thể, không gợi ý thêm.',
              average: '',
              weak: '\nỨng viên đang gặp khó khăn. Hỏi câu foundation trước, cho thêm thời gian, dùng câu hỏi gợi mở thay vì thách thức trực tiếp.',
            };
            const difficultySignal = DIFFICULTY_SIGNALS[signal];

            const updatedContextBlock =
              this.promptBuilder.buildCandidateContextBlock(
                freshSession.stageSummaries,
                newStage,
              );
            const updatedPrompt = this.promptBuilder.buildSystemPrompt(
              freshSession.candidateLevel,
              cv,
              jd,
              newStage,
              undefined,
              updatedContextBlock,
              difficultySignal,
            );
            await this.redisClient.setex(
              `system_prompt:${sessionId}:${newStage}`,
              7200,
              updatedPrompt,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Async summary/difficulty failed for stage ${prevStage}`,
          err,
        );
      }
    })();

    return {
      currentStage: newStage,
      stageName: STAGE_NAMES[newStage],
      firstQuestion,
    };
  }

  // ─── Complete & enqueue scoring ──────────────────────────────────────────

  async completeSession(sessionId: string): Promise<{ status: string }> {
    const session = await this.getSessionOrThrow(sessionId);

    if (session.status !== 'IN_PROGRESS') {
      // Already scoring or completed — idempotent
      return { status: session.status };
    }

    session.status = 'SCORING';
    await this.sessionRepo.save(session);

    await this.scoringQueue.add(
      'score-session',
      { sessionId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return { status: 'scoring_in_progress' };
  }

  // ─── Called by BehavioralScoringWorker ───────────────────────────────────

  async processScoring(sessionId: string): Promise<void> {
    const session = await this.getSessionOrThrow(sessionId);

    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: session.interviewSessionId },
    });

    const logs = await this.logRepo.find({
      where: { behavioralSessionId: sessionId },
      order: { stageNumber: 'ASC', timestamp: 'ASC' },
    });

    const isCombat = interviewSession?.mode === 'combat';

    const score = await this.scoringService.evaluateSession(
      logs,
      session.candidateLevel,
      interviewSession?.cvContextSnapshot ?? '',
      interviewSession?.jdContextSnapshot ?? '',
    );

    session.finalScore = score as unknown as Record<string, unknown>;

    if (isCombat) {
      const multimodalScore = await this.multimodalScoring
        .scoreSession(sessionId)
        .catch((err) => {
          this.logger.warn(`Multimodal scoring failed for ${sessionId}`, err);
          return null;
        });
      if (multimodalScore) {
        session.finalScore = {
          ...(session.finalScore ?? {}),
          multimodal: multimodalScore,
        };
      }
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date();
    await this.sessionRepo.save(session);

    this.logger.log(`Session ${sessionId} scored: ${score.total_score}`);
  }

  // ─── Get score ────────────────────────────────────────────────────────────

  async getScore(sessionId: string): Promise<{
    status: string;
    score: Record<string, unknown> | null;
  }> {
    const session = await this.getSessionOrThrow(sessionId);
    return {
      status: session.status,
      score: session.finalScore,
    };
  }

  // ─── Heartbeat (silence detection) ──────────────────────────────────────

  async heartbeat(sessionId: string): Promise<void> {
    await this.redisClient.setex(
      `heartbeat:${sessionId}`,
      30,
      Date.now().toString(),
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async getSessionOrThrow(
    sessionId: string,
  ): Promise<BehavioralSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Behavioral session not found');
    return session;
  }

  private async saveUserLog(
    sessionId: string,
    stage: number,
    level: CandidateLevel,
    content: string,
    dto: SendMessageDto,
    flags: string[],
  ): Promise<void> {
    const log = this.logRepo.create({
      behavioralSessionId: sessionId,
      stageNumber: stage,
      stageName: STAGE_NAMES[stage],
      role: 'USER',
      content,
      inputType: dto.inputType,
      voiceTranscript: dto.voiceTranscript ?? null,
      isTruncated: flags.includes('INPUT_TRUNCATED'),
      qualityFlags: flags,
    });
    await this.logRepo.save(log);
  }

  private async saveAiLog(
    sessionId: string,
    stage: number,
    content: string,
    flags: string[] = [],
  ): Promise<void> {
    const log = this.logRepo.create({
      behavioralSessionId: sessionId,
      stageNumber: stage,
      stageName: STAGE_NAMES[stage],
      role: 'AI_FACILITATOR',
      content,
      inputType: 'text',
      qualityFlags: flags,
    });
    await this.logRepo.save(log);
  }

  private sendStaticSSE(res: Response, message: string): void {
    this.sendStaticSSEWithMeta(res, message, {});
  }

  private sendStaticSSEWithMeta(
    res: Response,
    message: string,
    extraMeta: Record<string, unknown>,
  ): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ token: message, done: false })}\n\n`);
    res.write(
      `data: ${JSON.stringify({
        done: true,
        meta: {
          starStatus: {
            situation: true,
            task: true,
            action: true,
            result: true,
          },
          ...extraMeta,
        },
      })}\n\n`,
    );
    res.end();
  }
}
