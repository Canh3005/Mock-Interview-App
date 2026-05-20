import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Response } from 'express';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { SessionPlan } from '../session-planning/entities/session-plan.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { QuestionPracticeScoringService } from '../question-bank/services/scoring/question-practice-scoring.service';
import { PolicyEngineService } from './policy-engine.service';
import { ProbeRendererService } from './probe-renderer.service';
import { BehaviorSessionFlowService } from './behavior-session-flow.service';
import type { CreateBehaviorSessionDto } from './dto/create-behavior-session.dto';
import type { SubmitAnswerDto } from './dto/submit-answer.dto';
import type {
  ActiveProbeSession,
  InterviewTurn,
  PolicyDecision,
  RenderedQuestionsMap,
  SseEvent,
  StageProgress,
} from './types/behavior-session.types';
import type { ProbeScoringResult } from '../question-bank/types/question-practice-scoring.types';
import type { StageProbeAllocation } from '../session-planning/types/session-plan.types';

@Injectable()
export class BehaviorSessionService {
  private readonly logger = new Logger(BehaviorSessionService.name);

  constructor(
    @InjectRepository(BehavioralSession)
    private readonly sessionRepo: Repository<BehavioralSession>,
    @InjectRepository(BehavioralStageLog)
    private readonly logRepo: Repository<BehavioralStageLog>,
    @InjectRepository(SessionPlan)
    private readonly planRepo: Repository<SessionPlan>,
    @InjectRepository(QuestionProbe)
    private readonly probeRepo: Repository<QuestionProbe>,
    private readonly scoringService: QuestionPracticeScoringService,
    private readonly policyEngine: PolicyEngineService,
    private readonly probeRenderer: ProbeRendererService,
    private readonly flowService: BehaviorSessionFlowService,
  ) {}

  /**
   * Tạo probe-based behavioral session mới từ interviewSessionId.
   * Pre-render tất cả probe questions (Promise.allSettled) và emit opening contract.
   *
   * @param dto - { interviewSessionId }
   * @param userId - ID user thực hiện phỏng vấn
   * @returns sessionId, openingTurn, state = 'OPENING'
   * @throws NotFoundException nếu SessionPlan không tồn tại cho interviewSessionId
   */
  async create({
    dto,
    userId,
  }: {
    dto: CreateBehaviorSessionDto;
    userId: string;
  }): Promise<{
    sessionId: string;
    openingTurn: InterviewTurn;
    state: string;
  }> {
    const plan: SessionPlan | null = await this.planRepo.findOne({
      where: { sessionId: dto.interviewSessionId },
    });
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException(
        `SessionPlan not found for interviewSessionId: ${dto.interviewSessionId}`,
      );
    }

    const probeMap: Map<string, QuestionProbe> = await this._loadProbeMap(plan);
    const stageProgress: StageProgress[] =
      this._buildInitialStageProgress(plan);

    const session: BehavioralSession = this.sessionRepo.create({
      interviewSessionId: dto.interviewSessionId,
      candidateLevel: plan.targetLevel,
      sessionMode: 'probe_based',
      planId: plan.id,
      interviewState: 'PLANNED',
      currentStageIndex: 0,
      currentProbeIndex: 0,
      stageProgress,
      activeProbeSession: null,
      renderedQuestions: null,
      renderedFollowUps: null,
      globalTurnCounter: 0,
      status: 'IN_PROGRESS',
      currentStage: 0,
      coveredCompetencies: {},
      stageSummaries: {},
    });
    const saved: BehavioralSession = await this.sessionRepo.save(session);

    const renderedQuestions: RenderedQuestionsMap =
      await this._preRenderAllQuestions({ plan, probeMap });
    saved.renderedQuestions = renderedQuestions;

    const openingText: string = this.probeRenderer.buildOpeningContract({
      targetRole: plan.targetRole,
      targetLevel: plan.targetLevel,
      personaPolicy: plan.personaPolicy,
      language: plan.language,
    });
    const openingTurn: InterviewTurn = await this.flowService.saveTurn({
      session: saved,
      content: openingText,
      type: 'opening_contract',
      stageKey: null,
      probeId: null,
    });

    saved.interviewState = 'OPENING';
    await this.sessionRepo.save(saved);

    return { sessionId: saved.id, openingTurn, state: 'OPENING' };
  }

  /**
   * Submit candidate answer và stream interviewer response qua SSE.
   * Flow: save answer → evaluating → score → policy → emit turn(s) → turn_complete.
   *
   * @param sessionId - ID của BehavioralSession
   * @param dto - { content: string }
   * @param userId - ID user (ownership check)
   * @param res - Express Response để write SSE
   */
  async submitAnswer({
    sessionId,
    dto,
    userId,
    res,
  }: {
    sessionId: string;
    dto: SubmitAnswerDto;
    userId: string;
    res: Response;
  }): Promise<void> {
    this._openSseStream(res);
    try {
      const session: BehavioralSession = await this._loadSession({
        sessionId,
        userId,
      });
      const plan: SessionPlan = await this._loadPlan(session.planId!);
      const probeMap: Map<string, QuestionProbe> =
        await this._loadProbeMap(plan);

      this._emitSse(res, { type: 'evaluating' });

      if (session.interviewState === 'OPENING') {
        const turns: InterviewTurn[] = await this.flowService.startStage({
          session,
          plan,
          stageIndex: 0,
          probeMap,
        });
        await this.sessionRepo.save(session);
        for (const turn of turns) {
          this._streamTurn(res, turn, session);
        }
        return;
      }

      this._assertActiveProbe(session);
      await this.flowService.saveTurn({
        session,
        content: dto.content,
        type: 'candidate_answer',
        stageKey: session.activeProbeSession!.stage,
        probeId: session.activeProbeSession!.questionProbeId,
        isCandidate: true,
      });

      const activeProbe: ActiveProbeSession = session.activeProbeSession!;
      activeProbe.candidateTurnCount++;
      activeProbe.candidateAnswerTexts.push(dto.content);
      session.interviewState = 'EVALUATING_TURN';

      const currentProbe: QuestionProbe = probeMap.get(
        activeProbe.questionProbeId,
      )!;
      const cumulativeAnswer: string =
        activeProbe.candidateAnswerTexts.join('\n');
      const scoringResult: ProbeScoringResult =
        await this.scoringService.scoreForRuntime({
          questionProbe: currentProbe,
          answerText: cumulativeAnswer,
          language: plan.language,
        });
        console.log('Scoring result:', scoringResult);
      activeProbe.previousBand =
        activeProbe.lastScoringResult?.overallBand ?? null;
      activeProbe.lastScoringResult = scoringResult;
      session.interviewState = 'DECIDING_NEXT_ACTION';

      const hasFallback: boolean = this._hasFallbackProbe(session, plan);
      const decision: PolicyDecision = this.policyEngine.decide({
        scoringResult,
        activeProbe,
        pressureProfile: plan.pressureProfile,
        probeFollowUps: currentProbe.followUps,
        level: plan.targetLevel,
        hasFallbackProbe: hasFallback,
      });

      const nextTurns: InterviewTurn[] = await this.flowService.handleDecision({
        session,
        plan,
        probe: currentProbe,
        decision,
        scoringResult,
        probeMap,
      });

      await this.sessionRepo.save(session);
      for (const turn of nextTurns) {
        this._streamTurn(res, turn, session);
      }
    } catch (error: unknown) {
      const msg: string =
        error instanceof Error ? error.message : 'Internal server error';
      this.logger.error(`submitAnswer error: ${msg}`);
      this._emitSse(res, { type: 'error', message: msg });
    } finally {
      res.end();
    }
  }

  /**
   * Trả về trạng thái hiện tại của session: state, stageProgress, turnHistory.
   *
   * @param sessionId - ID của BehavioralSession
   * @param userId - ID user (ownership check)
   * @returns state, turnHistory, stageProgress
   * @throws NotFoundException nếu session không tồn tại hoặc không thuộc về userId
   */
  async getSession({
    sessionId,
    userId,
  }: {
    sessionId: string;
    userId: string;
  }): Promise<{
    state: string | null;
    turnHistory: InterviewTurn[];
    stageProgress: StageProgress[];
  }> {
    const session: BehavioralSession = await this._loadSession({
      sessionId,
      userId,
    });
    const logs: BehavioralStageLog[] = await this.logRepo.find({
      where: { behavioralSessionId: sessionId },
      order: { globalTurnIndex: 'ASC' },
    });
    const turnHistory: InterviewTurn[] = logs
      .filter((log) => log.globalTurnIndex !== null)
      .map((log) =>
        this._logToTurn(
          log,
          sessionId,
          log.stageName as Parameters<typeof this._logToTurn>[2],
          log.globalTurnIndex!,
        ),
      );
    return {
      state: session.interviewState,
      turnHistory,
      stageProgress: session.stageProgress ?? [],
    };
  }

  /**
   * Đánh dấu session hoàn tất và kick off Stage 5 synthesis.
   *
   * @param sessionId - ID của BehavioralSession
   * @param userId - ID user (ownership check)
   * @returns sessionId, state = 'COMPLETED'
   */
  async complete({
    sessionId,
    userId,
  }: {
    sessionId: string;
    userId: string;
  }): Promise<{ sessionId: string; state: string }> {
    const session: BehavioralSession = await this._loadSession({
      sessionId,
      userId,
    });
    session.interviewState = 'COMPLETED';
    session.status = 'SCORING';
    session.completedAt = new Date();
    await this.sessionRepo.save(session);
    return { sessionId, state: 'COMPLETED' };
  }

  private async _loadSession({
    sessionId,
    userId,
  }: {
    sessionId: string;
    userId: string;
  }): Promise<BehavioralSession> {
    const session: BehavioralSession | null = await this.sessionRepo.findOne({
      where: { id: sessionId, sessionMode: 'probe_based' },
      relations: ['interviewSession'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.interviewSession?.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private async _loadPlan(planId: string): Promise<SessionPlan> {
    const plan: SessionPlan | null = await this.planRepo.findOne({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('SessionPlan not found');
    return plan;
  }

  private async _loadProbeMap(
    plan: SessionPlan,
  ): Promise<Map<string, QuestionProbe>> {
    const probeIds: string[] = plan.stageAllocations.flatMap(
      (alloc: StageProbeAllocation) => [
        ...alloc.selectedProbes.map((p) => p.questionProbeId),
        ...alloc.fallbackProbes.map((p) => p.questionProbeId),
      ],
    );
    const probes: QuestionProbe[] = probeIds.length
      ? await this.probeRepo.findBy({ id: In(probeIds) })
      : [];
    const map: Map<string, QuestionProbe> = new Map();
    probes.forEach((probe) => map.set(probe.id, probe));
    return map;
  }

  private async _preRenderAllQuestions({
    plan,
    probeMap,
  }: {
    plan: SessionPlan;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<RenderedQuestionsMap> {
    const rendered: RenderedQuestionsMap = {};
    const allProbes: QuestionProbe[] = Array.from(probeMap.values());

    const results = await Promise.allSettled(
      allProbes.map(async (probe) => {
        const localized = this.probeRenderer.resolveLocalizedContent({
          localizedContent: probe.localizedContent,
          language: plan.language,
        });
        const displayQuestion: string =
          localized?.displayQuestion ?? probe.primaryQuestion ?? '';
        const stageName: string = this.flowService.stageDisplayName(
          probe.stages[0] ?? 'stage_1_culture_fit',
          plan.language,
        );
        const text: string = await this.probeRenderer.renderProbeQuestion({
          displayQuestion,
          stageName,
          personaPolicy: plan.personaPolicy,
          language: plan.language,
        });
        return { probeId: probe.id, text };
      }),
    );

    results.forEach((result, index) => {
      const probe: QuestionProbe = allProbes[index];
      if (result.status === 'fulfilled') {
        rendered[result.value.probeId] = result.value.text;
      } else {
        const localized = this.probeRenderer.resolveLocalizedContent({
          localizedContent: probe.localizedContent,
          language: plan.language,
        });
        rendered[probe.id] =
          localized?.displayQuestion ?? probe.primaryQuestion ?? '';
      }
    });
    return rendered;
  }

  private _buildInitialStageProgress(plan: SessionPlan): StageProgress[] {
    return plan.stageAllocations.map(
      (alloc: StageProbeAllocation): StageProgress => ({
        stage: alloc.stage,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        allocatedMinutes: alloc.allocatedMinutes,
        usedMinutes: 0,
        probeRuns: [],
      }),
    );
  }

  private _hasFallbackProbe(
    session: BehavioralSession,
    plan: SessionPlan,
  ): boolean {
    if (session.activeProbeSession?.isFallback) return false;
    const alloc: StageProbeAllocation | undefined =
      plan.stageAllocations[session.currentStageIndex];
    const fallbackIndex = session.currentProbeIndex;
    return (alloc?.fallbackProbes?.length ?? 0) > fallbackIndex;
  }

  private _assertActiveProbe(session: BehavioralSession): void {
    if (
      !session.activeProbeSession ||
      session.activeProbeSession.status !== 'active'
    ) {
      throw new BadRequestException(
        'No active probe session. Start a session first.',
      );
    }
  }

  private _openSseStream(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  private _emitSse(res: Response, event: SseEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  private _streamTurn(
    res: Response,
    turn: InterviewTurn,
    session: BehavioralSession,
  ): void {
    this._emitSse(res, { type: 'turn_start', turnType: turn.type });
    const words: string[] = turn.content.split(' ');
    for (const word of words) {
      this._emitSse(res, { type: 'chunk', token: `${word} ` });
    }
    this._emitSse(res, {
      type: 'turn_complete',
      nextTurn: turn,
      state: session.interviewState ?? 'ASKING_PROBE',
      stageProgress: session.stageProgress ?? [],
    });
  }

  private _logToTurn(
    log: BehavioralStageLog,
    sessionId: string,
    stageKey:
      | Parameters<(typeof this.flowService)['stageDisplayName']>[0]
      | null,
    turnIndex: number,
  ): InterviewTurn {
    return {
      id: log.id,
      sessionId,
      stageKey: stageKey,
      probeId: log.probeId ?? null,
      turnIndex,
      probeTurnIndex: log.probeTurnIndex,
      role: log.role === 'USER' ? 'candidate' : 'interviewer',
      type: log.turnType ?? 'probe_question',
      content: log.content,
      followUpTrigger: log.followUpTrigger ?? undefined,
      challengeReason: log.challengeReason ?? undefined,
      timestamp:
        log.timestamp instanceof Date
          ? log.timestamp.toISOString()
          : String(log.timestamp),
    };
  }
}
