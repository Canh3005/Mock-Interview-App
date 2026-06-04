import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  BEHAVIOR_SCORING_QUEUE,
  BehaviorScoringJobName,
} from '../jobs.constants';
import { SessionSynthesisService } from '../../behavior-session/session-synthesis.service';
import { RoundOrchestratorService } from '../../interview/round-orchestrator.service';
import { AnalyticsService } from '../../interview/analytics.service';
import { MultimodalScoringService } from '../../combat/multimodal-scoring.service';
import { IntegrityCalculatorService } from '../../combat/integrity-calculator.service';
import { BehavioralSession } from '../../behavioral/entities/behavioral-session.entity';
import { InterviewSession } from '../../interview/entities/interview-session.entity';
import { SessionPlan } from '../../session-planning/entities/session-plan.entity';
import type { BehaviorScorecardData } from '../../behavior-session/types/session-synthesis.types';

export interface BehaviorScoringJobData {
  behavioralSessionId: string;
  interviewSessionId: string;
}

@Processor(BEHAVIOR_SCORING_QUEUE)
export class BehaviorScoringWorker extends WorkerHost {
  private readonly logger = new Logger(BehaviorScoringWorker.name);

  constructor(
    @InjectRepository(BehavioralSession)
    private readonly behavioralSessionRepo: Repository<BehavioralSession>,
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepo: Repository<InterviewSession>,
    @InjectRepository(SessionPlan)
    private readonly sessionPlanRepo: Repository<SessionPlan>,
    private readonly synthesisService: SessionSynthesisService,
    private readonly roundOrchestrator: RoundOrchestratorService,
    private readonly analyticsService: AnalyticsService,
    private readonly multimodalScoring: MultimodalScoringService,
    private readonly integrityCalculator: IntegrityCalculatorService,
  ) {
    super();
  }

  async process(job: Job<BehaviorScoringJobData>): Promise<void> {
    switch (job.name) {
      case BehaviorScoringJobName.SCORE_SESSION:
        return this._scoreSession(job.data);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async _scoreSession({
    behavioralSessionId,
    interviewSessionId,
  }: BehaviorScoringJobData): Promise<void> {
    this.logger.log(
      `Scoring behavior session ${behavioralSessionId} for interview ${interviewSessionId}`,
    );

    const session = await this.behavioralSessionRepo.findOne({
      where: { id: behavioralSessionId },
    });
    if (!session) {
      throw new Error(`BehavioralSession ${behavioralSessionId} not found`);
    }

    const plan = await this.sessionPlanRepo.findOne({
      where: { id: session.planId ?? '' },
    });
    if (!plan) {
      throw new Error(
        `SessionPlan not found for session ${behavioralSessionId}`,
      );
    }

    let scorecard: BehaviorScorecardData;
    try {
      scorecard = await this.synthesisService.run({ session, plan });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Synthesis failed for session ${behavioralSessionId}: ${msg}`,
      );
      session.status = 'COMPLETED';
      session.completedAt = session.completedAt ?? new Date();
      await this.behavioralSessionRepo.save(session);
      return;
    }

    const interviewSession = await this.interviewSessionRepo.findOne({
      where: { id: interviewSessionId },
    });

    // Combat mode: gắn multimodal + integrity vào scorecard trước khi persist cả hai bản
    // (behavioralSession.finalScore và interviewSession.finalScorecard chia sẻ cùng object).
    if (interviewSession?.mode === 'combat') {
      await this._enrichWithCombat(
        scorecard,
        interviewSessionId,
        behavioralSessionId,
      );
    }

    session.finalScore = scorecard as unknown as Record<string, unknown>;
    session.status = 'COMPLETED';
    session.completedAt = session.completedAt ?? new Date();
    await this.behavioralSessionRepo.save(session);

    if (!interviewSession) {
      this.logger.warn(
        `InterviewSession ${interviewSessionId} not found — skipping finalScorecard update`,
      );
      return;
    }

    interviewSession.finalScorecard = {
      ...(interviewSession.finalScorecard ?? {}),
      behavioral: scorecard,
    };

    const nextRound = await this.roundOrchestrator.getNextRound(
      interviewSessionId,
      'hr_behavioral',
    );
    if (nextRound === null) {
      interviewSession.status = 'COMPLETED';
      interviewSession.finishedAt = new Date();
      this.logger.log(
        `All rounds done for interview ${interviewSessionId} — marking COMPLETED`,
      );
    }

    await this.interviewSessionRepo.save(interviewSession);

    try {
      await this.analyticsService.refreshCache(interviewSession.userId);
    } catch (err: unknown) {
      this.logger.warn(
        `Analytics cache refresh failed for user ${interviewSession.userId}: ${String(err)}`,
      );
    }
  }

  /**
   * Tính & gắn multimodal soft-skill + integrity (proctoring) vào scorecard.
   * Cả hai service đã null-guard khi thiếu aggregate (camera bị từ chối) nên
   * degrade an toàn; lỗi từng nhánh không chặn việc lưu scorecard.
   */
  private async _enrichWithCombat(
    scorecard: BehaviorScorecardData,
    interviewSessionId: string,
    behavioralSessionId: string,
  ): Promise<void> {
    const [mmRes, intRes] = await Promise.allSettled([
      this.multimodalScoring.scoreSession(interviewSessionId),
      this.integrityCalculator.calculateIntegrity(
        interviewSessionId,
        behavioralSessionId,
      ),
    ]);

    if (mmRes.status === 'fulfilled' && mmRes.value) {
      scorecard.multimodal = mmRes.value;
    } else if (mmRes.status === 'rejected') {
      this.logger.warn(
        `Multimodal scoring failed for ${interviewSessionId}: ${String(mmRes.reason)}`,
      );
    }

    if (intRes.status === 'fulfilled' && intRes.value) {
      scorecard.integrity = intRes.value;
    } else if (intRes.status === 'rejected') {
      this.logger.warn(
        `Integrity calculation failed for ${interviewSessionId}: ${String(intRes.reason)}`,
      );
    }
  }
}
