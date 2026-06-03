import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import type {
  QuestionProbeLanguage,
  QuestionProbeStage,
} from '../question-bank/constants/question-bank-taxonomy.constants';
import type { SessionPlan } from '../session-planning/entities/session-plan.entity';
import type { StageProbeAllocation } from '../session-planning/types/session-plan.types';
import type { ProbeScoringResult } from '../question-bank/types/question-practice-scoring.types';
import { ProbeRendererService } from './probe-renderer.service';
import type {
  ActiveProbeSession,
  InterviewTurn,
  InterviewTurnType,
  PolicyDecision,
  ProbeRunSummary,
  StageProgress,
} from './types/behavior-session.types';
import { STAGE_DISPLAY_NAMES } from './constants/behavior-session-flow.constants';

@Injectable()
export class BehaviorSessionFlowService {
  private readonly logger = new Logger(BehaviorSessionFlowService.name);

  constructor(
    @InjectRepository(BehavioralStageLog)
    private readonly logRepo: Repository<BehavioralStageLog>,
    private readonly probeRenderer: ProbeRendererService,
  ) {}

  /**
   * Khởi động stage đầu tiên hoặc stage tiếp theo.
   * Trả về [stage_intro turn, probe_question turn] của probe đầu tiên trong stage.
   */
  async startStage({
    session,
    plan,
    stageIndex,
    probeMap,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    stageIndex: number;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<InterviewTurn[]> {
    const allocation: StageProbeAllocation = plan.stageAllocations[stageIndex];

    if (allocation.selectedProbes.length === 0) {
      const progress: StageProgress = session.stageProgress![stageIndex];
      progress.status = 'skipped';
      this.logger.warn(
        `Stage ${stageIndex} (${allocation.stage}) has no selected probes, skipping`,
      );
      const nextStageIndex: number = stageIndex + 1;
      if (nextStageIndex >= plan.stageAllocations.length) {
        session.interviewState = 'COMPLETED';
        session.status = 'SCORING';
        return [];
      }
      session.currentStageIndex = nextStageIndex;
      return this.startStage({
        session,
        plan,
        stageIndex: nextStageIndex,
        probeMap,
      });
    }

    const stageName: string = this.stageDisplayName(
      allocation.stage,
      plan.language,
    );

    const progress: StageProgress = session.stageProgress![stageIndex];
    progress.status = 'active';
    progress.startedAt = new Date().toISOString();

    const turns: InterviewTurn[] = [];
    if (stageIndex > 0) {
      const prevStage: QuestionProbeStage =
        plan.stageAllocations[stageIndex - 1].stage;
      const prevStageName: string = this.stageDisplayName(
        prevStage,
        plan.language,
      );
      const transitionText: string =
        await this.probeRenderer.buildStageTransition({
          prevStageName,
          nextStageName: stageName,
          personaPolicy: plan.personaPolicy,
          targetRole: plan.targetRole,
          language: plan.language,
        });
      turns.push(
        await this.saveTurn({
          session,
          content: transitionText,
          type: 'stage_transition',
          stageKey: prevStage,
          probeId: null,
        }),
      );
    } else {
      turns.push(
        await this.saveTurn({
          session,
          content: this.probeRenderer.buildStageIntro({
            stageName,
            language: plan.language,
          }),
          type: 'stage_intro',
          stageKey: allocation.stage,
          probeId: null,
        }),
      );
    }

    const probeTurns: InterviewTurn[] = await this.startProbe({
      session,
      plan,
      stageIndex,
      probeIndex: 0,
      probeMap,
    });
    return [...turns, ...probeTurns];
  }

  /**
   * Khởi động probe tại vị trí probeIndex trong stage stageIndex.
   * Cập nhật activeProbeSession và trả về probe_question turn.
   */
  async startProbe({
    session,
    plan,
    stageIndex,
    probeIndex,
    probeMap,
    isFallback = false,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    stageIndex: number;
    probeIndex: number;
    probeMap: Map<string, QuestionProbe>;
    isFallback?: boolean;
  }): Promise<InterviewTurn[]> {
    const allocation: StageProbeAllocation = plan.stageAllocations[stageIndex];
    const probeList = isFallback
      ? allocation.fallbackProbes
      : allocation.selectedProbes;
    const plannedProbe = probeList[probeIndex];
    if (!plannedProbe) {
      this.logger.warn(
        `No probe at index ${probeIndex} for stage ${stageIndex} (isFallback=${String(isFallback)})`,
      );
      return [];
    }
    const probe: QuestionProbe | undefined = probeMap.get(
      plannedProbe.questionProbeId,
    );
    if (!probe) {
      this.logger.warn(
        `Probe not found: ${plannedProbe.questionProbeId}, skipping`,
      );
      return [];
    }

    session.activeProbeSession = {
      plannedProbe,
      questionProbeId: probe.id,
      stage: allocation.stage,
      startedAt: new Date().toISOString(),
      candidateTurnCount: 0,
      followUpCount: 0,
      challengeCount: 0,
      redirectCount: 0,
      rephraseCount: 0,
      totalTurnCount: 0,
      candidateAnswerTexts: [],
      lastScoringResult: null,
      previousBand: null,
      status: 'active',
      isFallback,
    };
    session.currentStageIndex = stageIndex;
    session.currentProbeIndex = probeIndex;
    session.interviewState = 'ASKING_PROBE';

    const renderedText: string =
      session.renderedQuestions?.[probe.id] ??
      this.probeRenderer.resolveLocalizedContent({
        localizedContent: probe.localizedContent,
        language: plan.language,
      })?.displayQuestion ??
      probe.primaryQuestion ??
      '';

    const probeTurn: InterviewTurn = await this.saveTurn({
      session,
      content: renderedText,
      type: 'probe_question',
      stageKey: allocation.stage,
      probeId: probe.id,
    });

    // Background render follow-ups
    this._backgroundRenderFollowUps({ session, probe, plan }).catch(
      (err: unknown) =>
        this.logger.warn(
          `Background follow-up render failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
    );

    return [probeTurn];
  }

  /**
   * Xử lý policy decision sau khi scoring.
   * Trả về các turns cần emit và cập nhật session state.
   */
  async handleDecision({
    session,
    plan,
    probe,
    decision,
    scoringResult,
    probeMap,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    probe: QuestionProbe;
    decision: PolicyDecision;
    scoringResult: ProbeScoringResult;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<InterviewTurn[]> {
    const activeProbe: ActiveProbeSession = session.activeProbeSession!;
    const allocation: StageProbeAllocation =
      plan.stageAllocations[session.currentStageIndex];

    const lastAnswer: string | undefined =
      activeProbe.candidateAnswerTexts.at(-1);

    if (decision.action === 'REDIRECT') {
      activeProbe.redirectCount++;
      activeProbe.totalTurnCount++;
      session.interviewState = 'ASKING_REDIRECT';
      const redirectText: string = await this.probeRenderer.buildRedirectText({
        language: plan.language,
        lastCandidateAnswer: lastAnswer,
        personaPolicy: plan.personaPolicy,
      });
      return [
        await this.saveTurn({
          session,
          content: redirectText,
          type: 'redirect',
          stageKey: allocation.stage,
          probeId: probe.id,
        }),
      ];
    }

    if (decision.action === 'FOLLOW_UP' && decision.followUpTrigger) {
      activeProbe.followUpCount++;
      activeProbe.totalTurnCount++;
      session.interviewState = 'ASKING_FOLLOW_UP';
      const followUp = probe.followUps.find(
        (f) => f.trigger === decision.followUpTrigger,
      );
      const renderedText: string = await this.probeRenderer.getOrRenderFollowUp(
        {
          probeId: probe.id,
          trigger: decision.followUpTrigger,
          rawFollowUpText: followUp?.question ?? '',
          stageName: this.stageDisplayName(allocation.stage, plan.language),
          personaPolicy: plan.personaPolicy,
          language: plan.language,
          renderedFollowUps: session.renderedFollowUps ?? {},
          lastCandidateAnswer: lastAnswer,
        },
      );
      return [
        await this.saveTurn({
          session,
          content: renderedText,
          type: 'follow_up',
          stageKey: allocation.stage,
          probeId: probe.id,
          followUpTrigger: decision.followUpTrigger,
        }),
      ];
    }

    if (decision.action === 'CHALLENGE' && decision.followUpTrigger) {
      activeProbe.challengeCount++;
      activeProbe.totalTurnCount++;
      session.interviewState = 'CHALLENGING';
      const challengeFollowUp = probe.followUps.find(
        (f) => f.trigger === 'red_flag',
      );
      const renderedText: string = await this.probeRenderer.getOrRenderFollowUp(
        {
          probeId: probe.id,
          trigger: 'red_flag',
          rawFollowUpText: challengeFollowUp?.question ?? '',
          stageName: this.stageDisplayName(allocation.stage, plan.language),
          personaPolicy: plan.personaPolicy,
          language: plan.language,
          renderedFollowUps: session.renderedFollowUps ?? {},
          lastCandidateAnswer: lastAnswer,
        },
      );
      return [
        await this.saveTurn({
          session,
          content: renderedText,
          type: 'challenge',
          stageKey: allocation.stage,
          probeId: probe.id,
          challengeReason: decision.challengeReason,
        }),
      ];
    }

    if (decision.action === 'REPHRASE') {
      activeProbe.rephraseCount++;
      activeProbe.totalTurnCount++;
      session.interviewState = 'REPHRASING';
      const originalQuestion: string =
        session.renderedQuestions?.[probe.id] ?? probe.primaryQuestion ?? '';
      const rephraseText: string = await this.probeRenderer.buildRephraseText({
        originalQuestion,
        language: plan.language,
        personaPolicy: plan.personaPolicy,
      });
      return [
        await this.saveTurn({
          session,
          content: rephraseText,
          type: 'rephrase',
          stageKey: allocation.stage,
          probeId: probe.id,
        }),
      ];
    }

    if (decision.action === 'USE_FALLBACK') {
      return this._handleFallback({
        session,
        plan,
        allocation,
        scoringResult,
        probeMap,
      });
    }

    // CLOSE_PROBE (default)
    return this._handleCloseProbe({
      session,
      plan,
      allocation,
      scoringResult,
      decision,
      probeMap,
    });
  }

  async saveTurn({
    session,
    content,
    type,
    stageKey,
    probeId,
    followUpTrigger,
    challengeReason,
    isCandidate = false,
  }: {
    session: BehavioralSession;
    content: string;
    type: InterviewTurnType;
    stageKey: QuestionProbeStage | null;
    probeId: string | null;
    followUpTrigger?: string;
    challengeReason?: string;
    isCandidate?: boolean;
  }): Promise<InterviewTurn> {
    const turnIndex: number = session.globalTurnCounter;
    session.globalTurnCounter = turnIndex + 1;

    const log: BehavioralStageLog = this.logRepo.create({
      behavioralSessionId: session.id,
      stageNumber: session.currentStageIndex,
      stageName: stageKey ?? null,
      role: isCandidate ? 'USER' : 'AI_FACILITATOR',
      content,
      inputType: 'text',
      probeId: probeId ?? null,
      turnType: type,
      followUpTrigger:
        (followUpTrigger as BehavioralStageLog['followUpTrigger']) ?? null,
      challengeReason: challengeReason ?? null,
      probeTurnIndex: session.activeProbeSession?.candidateTurnCount ?? 0,
      globalTurnIndex: turnIndex,
    });
    await this.logRepo.save(log);
    return this._logToTurn(log, session.id, stageKey, turnIndex);
  }

  stageDisplayName(
    stage: QuestionProbeStage,
    language: QuestionProbeLanguage,
  ): string {
    return STAGE_DISPLAY_NAMES[stage]?.[language] ?? stage;
  }

  private async _handleCloseProbe({
    session,
    plan,
    allocation,
    scoringResult,
    decision,
    probeMap,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    allocation: StageProbeAllocation;
    scoringResult: ProbeScoringResult;
    decision: PolicyDecision;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<InterviewTurn[]> {
    const activeProbe: ActiveProbeSession = session.activeProbeSession!;
    const summary: ProbeRunSummary = {
      questionProbeId: activeProbe.questionProbeId,
      questionProbeRevision: activeProbe.plannedProbe.questionProbeRevision,
      candidateTurnCount: activeProbe.candidateTurnCount,
      followUpCount: activeProbe.followUpCount,
      challengeCount: activeProbe.challengeCount,
      finalBand: scoringResult.overallBand,
      finalScoringResult: scoringResult,
      closeReason: decision.closeReason ?? 'no_new_evidence',
      isFallback: activeProbe.isFallback,
    };
    session.stageProgress![session.currentStageIndex].probeRuns.push(summary);
    activeProbe.status = 'closed';
    activeProbe.closeReason = decision.closeReason;

    const nextProbeIndex: number = session.currentProbeIndex + 1;
    const hasNextProbe: boolean =
      nextProbeIndex < allocation.selectedProbes.length;

    if (hasNextProbe) {
      const transitionTurn: InterviewTurn = await this.saveTurn({
        session,
        content: await this.probeRenderer.buildProbeTransition({
          language: plan.language,
          lastCandidateAnswer: activeProbe.candidateAnswerTexts.at(-1),
          personaPolicy: plan.personaPolicy,
        }),
        type: 'probe_transition',
        stageKey: allocation.stage,
        probeId: null,
      });
      const probeTurns: InterviewTurn[] = await this.startProbe({
        session,
        plan,
        stageIndex: session.currentStageIndex,
        probeIndex: nextProbeIndex,
        probeMap,
      });
      return [transitionTurn, ...probeTurns];
    }

    return this._handleCloseStage({ session, plan, probeMap });
  }

  private async _handleFallback({
    session,
    plan,
    allocation,
    scoringResult,
    probeMap,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    allocation: StageProbeAllocation;
    scoringResult: ProbeScoringResult;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<InterviewTurn[]> {
    const activeProbe: ActiveProbeSession = session.activeProbeSession!;
    const summary: ProbeRunSummary = {
      questionProbeId: activeProbe.questionProbeId,
      questionProbeRevision: activeProbe.plannedProbe.questionProbeRevision,
      candidateTurnCount: activeProbe.candidateTurnCount,
      followUpCount: activeProbe.followUpCount,
      challengeCount: activeProbe.challengeCount,
      finalBand: scoringResult.overallBand,
      finalScoringResult: scoringResult,
      closeReason: 'fallback_triggered',
      isFallback: activeProbe.isFallback,
    };
    session.stageProgress![session.currentStageIndex].probeRuns.push(summary);
    activeProbe.status = 'closed';

    const fallbackIndex = session.currentProbeIndex;
    if (
      allocation.fallbackProbes.length === 0 ||
      fallbackIndex >= allocation.fallbackProbes.length
    ) {
      return this._handleCloseStage({ session, plan, probeMap });
    }
    const transitionTurn: InterviewTurn = await this.saveTurn({
      session,
      content: await this.probeRenderer.buildProbeTransition({
        language: plan.language,
        lastCandidateAnswer: activeProbe.candidateAnswerTexts.at(-1),
        personaPolicy: plan.personaPolicy,
      }),
      type: 'probe_transition',
      stageKey: allocation.stage,
      probeId: null,
    });
    const fallbackTurns: InterviewTurn[] = await this.startProbe({
      session,
      plan,
      stageIndex: session.currentStageIndex,
      probeIndex: fallbackIndex,
      probeMap,
      isFallback: true,
    });
    return [transitionTurn, ...fallbackTurns];
  }

  private async _handleCloseStage({
    session,
    plan,
    probeMap,
  }: {
    session: BehavioralSession;
    plan: SessionPlan;
    probeMap: Map<string, QuestionProbe>;
  }): Promise<InterviewTurn[]> {
    const progress: StageProgress =
      session.stageProgress![session.currentStageIndex];
    progress.status = 'completed';
    progress.completedAt = new Date().toISOString();

    const nextStageIndex: number = session.currentStageIndex + 1;
    if (nextStageIndex >= plan.stageAllocations.length) {
      session.interviewState = 'COMPLETED';
      session.status = 'SCORING';
      return [];
    }

    const nextAllocation: StageProbeAllocation =
      plan.stageAllocations[nextStageIndex];
    const timeUsedRatio: number =
      progress.usedMinutes / (plan.durationMinutes || 60);
    if (nextAllocation.priority === 'nice_to_include' && timeUsedRatio > 0.85) {
      session.stageProgress![nextStageIndex].status = 'skipped';
      return this._handleCloseStage({
        session,
        plan: {
          ...plan,
          stageAllocations: plan.stageAllocations,
        } as SessionPlan,
        probeMap,
      });
    }

    session.currentStageIndex = nextStageIndex;
    return this.startStage({
      session,
      plan,
      stageIndex: nextStageIndex,
      probeMap,
    });
  }

  private async _backgroundRenderFollowUps({
    session,
    probe,
    plan,
  }: {
    session: BehavioralSession;
    probe: QuestionProbe;
    plan: SessionPlan;
  }): Promise<void> {
    const rendered = await this.probeRenderer.renderProbeFollowUps({
      probeId: probe.id,
      followUps: probe.followUps,
      stageName: this.stageDisplayName(
        session.activeProbeSession!.stage,
        plan.language,
      ),
      personaPolicy: plan.personaPolicy,
      language: plan.language,
    });
    session.renderedFollowUps = {
      ...(session.renderedFollowUps ?? {}),
      ...rendered,
    };
  }

  private _logToTurn(
    log: BehavioralStageLog,
    sessionId: string,
    stageKey: QuestionProbeStage | null,
    turnIndex: number,
  ): InterviewTurn {
    return {
      id: log.id,
      sessionId,
      stageKey,
      probeId: log.probeId ?? null,
      turnIndex,
      probeTurnIndex: log.probeTurnIndex,
      role: log.role === 'USER' ? 'candidate' : 'interviewer',
      type: log.turnType ?? 'probe_question',
      content: log.content,
      followUpTrigger: log.followUpTrigger ?? undefined,
      challengeReason: log.challengeReason ?? undefined,
      timestamp: log.timestamp.toISOString(),
    };
  }
}
