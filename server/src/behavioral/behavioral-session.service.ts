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
import { InterviewSession } from '../interview/entities/interview-session.entity';

const REDIRECT_MESSAGES = {
  obvious:
    'Mình chưa nhận được câu trả lời rõ ràng. Bạn có thể chia sẻ suy nghĩ của mình về câu hỏi vừa rồi không?',
  thirdOffTopic:
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

    const behavioralSession = this.sessionRepo.create({
      interviewSessionId: dto.interviewSessionId,
      candidateLevel: level,
      currentStage: 1,
      status: 'IN_PROGRESS',
    });

    await this.sessionRepo.save(behavioralSession);

    const firstQuestion = this.promptBuilder.buildFirstQuestion(level, 1);

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

    // ── Get/rebuild system prompt ──────────────────────────────────────────
    let systemPrompt = await this.redisClient.get(
      `system_prompt:${sessionId}:${stage}`,
    );

    const truncationNote = flags.includes('INPUT_TRUNCATED')
      ? 'Câu trả lời của ứng viên đã bị cắt bớt do vượt giới hạn độ dài'
      : undefined;

    if (!systemPrompt) {
      systemPrompt = this.promptBuilder.buildSystemPrompt(
        level,
        interviewSession?.cvContextSnapshot ?? '',
        interviewSession?.jdContextSnapshot ?? '',
        stage,
        truncationNote,
      );
      await this.redisClient.setex(
        `system_prompt:${sessionId}:${stage}`,
        7200,
        systemPrompt,
      );
    } else if (truncationNote) {
      systemPrompt += `\n[Lưu ý hệ thống: ${truncationNote}]`;
    }

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

    // ── Off-topic counter check ──────────────────────────────────────────
    const offTopicCount =
      this.qualityService.countConsecutiveOffTopic(stageLogs);
    if (offTopicCount >= 3) {
      // Force move on — mark stage incomplete
      await this.saveUserLog(sessionId, stage, level, content, dto, [
        ...flags,
        'OFF_TOPIC_PERSISTENT',
      ]);
      await this.saveAiLog(sessionId, stage, REDIRECT_MESSAGES.thirdOffTopic, [
        'OFF_TOPIC_PERSISTENT',
      ]);
      this.sendStaticSSE(res, REDIRECT_MESSAGES.thirdOffTopic);
      return;
    }

    // ── Save user log ─────────────────────────────────────────────────────
    await this.saveUserLog(sessionId, stage, level, content, dto, flags);

    // ── Run relevance check in parallel with main stream ─────────────────
    const lastAiMsg = stageLogs
      .filter((l) => l.role === 'AI_FACILITATOR')
      .pop();
    const currentQuestion = lastAiMsg?.content ?? '';

    const [relevanceResult, streamResult] = await Promise.all([
      this.aiFacilitator.checkRelevance(currentQuestion, content),
      this.aiFacilitator.streamFacilitatorResponse({
        res,
        systemPrompt,
        history,
        userMessage: content,
      }),
    ]);

    // ── Determine off-topic flags ────────────────────────────────────────
    const aiFlags = this.qualityService.buildOffTopicFlags(
      relevanceResult.relevant,
      offTopicCount,
    );

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

    const firstQuestion = this.promptBuilder.buildFirstQuestion(
      session.candidateLevel,
      newStage,
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

    // Build and cache new system prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt(
      session.candidateLevel,
      interviewSession?.cvContextSnapshot ?? '',
      interviewSession?.jdContextSnapshot ?? '',
      newStage,
    );
    await this.redisClient.setex(
      `system_prompt:${sessionId}:${newStage}`,
      7200,
      systemPrompt,
    );

    return {
      currentStage: newStage,
      stageName: STAGE_NAMES[newStage],
      firstQuestion,
    };
  }

  // ─── Complete & trigger scoring ───────────────────────────────────────────

  async completeSession(sessionId: string): Promise<{ status: string }> {
    const session = await this.getSessionOrThrow(sessionId);

    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: session.interviewSessionId },
    });

    const logs = await this.logRepo.find({
      where: { behavioralSessionId: sessionId },
      order: { stageNumber: 'ASC', timestamp: 'ASC' },
    });

    // Score asynchronously
    this.scoringService
      .evaluateSession(
        logs,
        session.candidateLevel,
        interviewSession?.cvContextSnapshot ?? '',
        interviewSession?.jdContextSnapshot ?? '',
      )
      .then(async (score) => {
        session.finalScore = score as unknown as Record<string, unknown>;
        session.status = 'COMPLETED';
        session.completedAt = new Date();
        await this.sessionRepo.save(session);
        this.logger.log(`Session ${sessionId} scored: ${score.total_score}`);
      })
      .catch((err) => {
        this.logger.error(`Scoring failed for ${sessionId}`, err);
      });

    return { status: 'scoring_in_progress' };
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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send as a single token then done
    res.write(`data: ${JSON.stringify({ token: message, done: false })}\n\n`);
    res.write(
      `data: ${JSON.stringify({ done: true, meta: { starStatus: { situation: true, task: true, action: true, result: true } } })}\n\n`,
    );
    res.end();
  }
}
