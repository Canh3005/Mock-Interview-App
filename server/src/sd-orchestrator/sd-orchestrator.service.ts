import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { SDTurnRecord } from './entities/sd-turn-record.entity';
import { SDStageSummary } from './entities/sd-stage-summary.entity';
import { SDGraphSnapshotEntity } from './entities/sd-graph-snapshot.entity';
import { SDPolicyEngineService } from './sd-policy-engine.service';
import { SDResponseAssessmentService } from './sd-response-assessment.service';
import { SDQuestionRendererService } from './sd-question-renderer.service';
import { SDDrawingTransitionService } from './sd-drawing-transition.service';
import {
  SDClarificationPlannerService,
  CLARIFICATION_CRITERIA,
} from './planners/sd-clarification-planner.service';
import { SDClarificationAssessorService } from './assessors/sd-clarification-assessor.service';
import {
  SDWalkthroughPlannerService,
  WALKTHROUGH_CRITERIA,
} from './planners/sd-walkthrough-planner.service';
import { SDWalkthroughAssessorService } from './assessors/sd-walkthrough-assessor.service';
import { SDDeepDivePlannerService } from './planners/sd-deep-dive-planner.service';
import { SDDeepDiveAssessorService } from './assessors/sd-deep-dive-assessor.service';
import { SDWrapUpPlannerService } from './planners/sd-wrap-up-planner.service';
import { SDWrapUpAssessorService } from './assessors/sd-wrap-up-assessor.service';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import type {
  SDStage,
  SDSessionStageState,
  SDClarificationTracker,
  SDClarificationLeftoverJson,
  SDClarificationAssessment,
  SDClarificationData,
  SDClarificationTransitionCriteria,
  SDWalkthroughTracker,
  SDWalkthroughLeftoverJson,
  SDDeepDiveTracker,
  SDDeepDiveLeftoverJson,
  SDActiveProbeState,
  SDWrapUpTracker,
  SDWrapUpLeftoverJson,
  SDActiveScenarioState,
  SDGraphState,
  SDGraphMetrics,
} from './types/sd-orchestrator.types';

@Injectable()
export class SDOrchestratorService {
  private readonly logger = new Logger(SDOrchestratorService.name);

  constructor(
    @InjectRepository(SDSession)
    private readonly sessionRepo: Repository<SDSession>,
    @InjectRepository(SDProblem)
    private readonly problemRepo: Repository<SDProblem>,
    @InjectRepository(SDTurnRecord)
    private readonly turnRepo: Repository<SDTurnRecord>,
    @InjectRepository(SDStageSummary)
    private readonly summaryRepo: Repository<SDStageSummary>,
    @InjectRepository(SDGraphSnapshotEntity)
    private readonly snapshotRepo: Repository<SDGraphSnapshotEntity>,
    private readonly policyEngine: SDPolicyEngineService,
    private readonly assessmentService: SDResponseAssessmentService,
    private readonly renderer: SDQuestionRendererService,
    private readonly drawingTransition: SDDrawingTransitionService,
    private readonly clarificationPlanner: SDClarificationPlannerService,
    private readonly clarificationAssessor: SDClarificationAssessorService,
    private readonly walkthroughPlanner: SDWalkthroughPlannerService,
    private readonly walkthroughAssessor: SDWalkthroughAssessorService,
    private readonly deepDivePlanner: SDDeepDivePlannerService,
    private readonly deepDiveAssessor: SDDeepDiveAssessorService,
    private readonly wrapUpPlanner: SDWrapUpPlannerService,
    private readonly wrapUpAssessor: SDWrapUpAssessorService,
  ) { }

  // ─── Main turn handler ───────────────────────────────────────────────────────

  async handleCandidateTurn(
    sessionId: string,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const session = await this.loadSession(sessionId);
    const stage = session.phase as SDStage;

    this.startSSE(res);

    try {
      switch (stage) {
        case 'CLARIFICATION':
          await this.handleClarificationTurn(session, candidateAnswer, res);
          break;
        case 'DESIGN_WALKTHROUGH':
          await this.handleWalkthroughTurn(session, candidateAnswer, res);
          break;
        case 'DEEP_DIVE':
          await this.handleDeepDiveTurn(session, candidateAnswer, res);
          break;
        case 'WRAP_UP':
          await this.handleWrapUpTurn(session, candidateAnswer, res);
          break;
        default:
          this.streamText(res, 'Session is not in an active stage.', null);
      }
    } finally {
      this.endSSE(res);
    }
  }

  // ─── Stage handlers (implemented per phase) ──────────────────────────────────

  private async handleClarificationTurn(
    session: SDSession,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const tracker = this.getClarificationTracker(session);
    const lang = session.language as 'vi' | 'en' | 'ja';
    const level = (session as any).targetLevel ?? 'mid';
    const criteria =
      CLARIFICATION_CRITERIA[level] ?? CLARIFICATION_CRITERIA['senior'];
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const data = problem.clarificationData ?? { facts: [] };
    console.log('Clarification turn input:', {
      candidateAnswer,
      data,
      tracker,
      context: { language: lang, level },
      elapsedSeconds,
    });
    // Assess candidate response
    const assessment = await this.clarificationAssessor.assess(
      candidateAnswer,
      data,
      tracker,
      {
        language: lang,
        level,
      },
    );
    console.log('Clarification turn assessment output:', assessment);
    // Update tracker
    const newCoveredDims = [
      ...new Set([
        ...tracker.progress.coveredDimensions,
        ...assessment.signals.dimensionCovered,
      ]),
    ];
    const newDisclosedKeys = assessment.signals.matchedFactKey
      ? [
        ...new Set([
          ...tracker.progress.disclosedFactKeys,
          assessment.signals.matchedFactKey,
        ]),
      ]
      : tracker.progress.disclosedFactKeys;

    const updatedTracker: SDClarificationTracker = {
      turnCount: tracker.turnCount + 1,
      elapsedSeconds,
      progress: {
        coveredDimensions: newCoveredDims,
        disclosedFactKeys: newDisclosedKeys,
      },
    };

    // Policy decision
    const decision = this.policyEngine.decideClarification(
      assessment,
      updatedTracker,
      criteria,
      elapsedSeconds,
    );
    console.log('Clarification turn policy decision:', decision);
    // Handle each action
    if (decision.action === 'TRANSITION_STAGE') {
      const { transitionText } = await this._commitClarificationTransition(
        session,
        updatedTracker,
        elapsedSeconds,
        assessment,
        data,
        newDisclosedKeys,
        newCoveredDims,
        criteria,
        lang,
      );
      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'CLARIFICATION',
        turnIndex: updatedTracker.turnCount,
        intentType: 'OPENING',
        intentTargetJson: {},
        promptRendered: transitionText,
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        action: 'TRANSITION_STAGE',
        decisionReason: decision.reason,
      });
      this.streamText(res, transitionText, {
        stageChanged: true,
        stage: 'DESIGN_DRAWING',
      });
      return;
    }

    if (decision.action === 'REDIRECT') {
      const intent = this.clarificationPlanner.planNextIntent({
        data,
        tracker: updatedTracker,
        lastCandidateIntent: 'solution_leap',
        context: { language: lang, level },
        elapsedSeconds,
      });
      const redirectText = await this.renderer.renderClarification(
        intent.nextIntent!,
        undefined,
        candidateAnswer,
      );

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'CLARIFICATION',
        turnIndex: updatedTracker.turnCount,
        intentType: 'REDIRECT',
        intentTargetJson: {},
        promptRendered: redirectText,
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        action: 'REDIRECT',
        decisionReason: decision.reason,
      });

      await this.updateStageState(session, {
        ...stageState,
        stage: 'CLARIFICATION',
        trackerJson: updatedTracker as any,
        runningScores: this._aggregateScores(session, assessment.scoreDelta),
      });

      this.streamText(res, redirectText, null);
      return;
    }

    if (decision.action === 'ANSWER_FACT') {
      const fact = data.facts.find(
        (f) => f.key === assessment.signals.matchedFactKey,
      );
      if (fact) {
        const factDecision = this.clarificationPlanner.buildAnswerFactDecision(
          assessment.signals.matchedFactKey!,
          fact.dimension,
          fact.answer,
          updatedTracker,
          criteria,
          elapsedSeconds,
          lang,
        );
        console.log('Answer fact decision:', factDecision);
        const answerIntent = factDecision.nextIntent!;
        console.log('Answer fact intent:', answerIntent);
        const answerText = await this.renderer.renderClarification(
          answerIntent,
          fact.answer,
        );
        console.log('Answer fact text:', answerText);
        await this.persistTurnRecord({
          sessionId: session.id,
          stage: 'CLARIFICATION',
          turnIndex: updatedTracker.turnCount,
          intentType: 'ANSWER_FACT',
          intentTargetJson: {
            factKey: assessment.signals.matchedFactKey,
            dimension: fact.dimension,
          },
          promptRendered: answerText,
          candidateAnswer,
          candidateIntent: assessment.candidateIntent,
          signalsJson: assessment.signals as any,
          scoreDeltas: assessment.scoreDelta,
          action: 'ANSWER_FACT',
          decisionReason: decision.reason,
        });

        // Check if answering this fact completes the transition criteria
        const allCoveredAfterFact = criteria.requiredDimensions.every((d) =>
          newCoveredDims.includes(d),
        );
        const meetsMinCriteria =
          updatedTracker.turnCount >= criteria.minCandidateTurns &&
          elapsedSeconds >= criteria.minDurationSeconds;

        if (allCoveredAfterFact && meetsMinCriteria) {
          const { transitionText } = await this._commitClarificationTransition(
            session,
            updatedTracker,
            elapsedSeconds,
            assessment,
            data,
            newDisclosedKeys,
            newCoveredDims,
            criteria,
            lang,
          );
          await this.persistTurnRecord({
            sessionId: session.id,
            stage: 'CLARIFICATION',
            turnIndex: updatedTracker.turnCount,
            intentType: 'ANSWER_FACT',
            intentTargetJson: {
              factKey: assessment.signals.matchedFactKey,
              dimension: fact.dimension,
            },
            promptRendered: `${answerText}\n\n${transitionText}`,
            candidateAnswer,
            candidateIntent: assessment.candidateIntent,
            signalsJson: assessment.signals as any,
            scoreDeltas: assessment.scoreDelta,
            action: 'TRANSITION_STAGE',
            decisionReason: 'All dimensions covered after fact answer',
          });
          this.streamText(res, `${answerText}\n\n${transitionText}`, {
            stageChanged: true,
            stage: 'DESIGN_DRAWING',
          });
          return;
        }

        await this.updateStageState(session, {
          ...stageState,
          stage: 'CLARIFICATION',
          trackerJson: updatedTracker as any,
          runningScores: this._aggregateScores(session, assessment.scoreDelta),
        });

        if (factDecision.chainedAction) {
          const nudgeIntent = factDecision.chainedAction.intent;
          const nudgeText = await this.renderer.renderClarification(nudgeIntent);
          this.streamText(res, `${answerText}\n\n${nudgeText}`, null);
        } else {
          this.streamText(res, answerText, null);
        }
        return;
      }
      // fact not found — LLM returned a key not in data.facts; fall through to ASK_NUDGE
    }

    // ASK_NUDGE or default
    const nudgePlan = this.clarificationPlanner.planNextIntent({
      data,
      tracker: updatedTracker,
      lastCandidateIntent: assessment.candidateIntent,
      context: { language: lang, level },
      elapsedSeconds,
    });
    console.log('Clarification turn nudge plan:', nudgePlan);
    if (nudgePlan.action === 'TRANSITION_STAGE') {
      const { transitionText } = await this._commitClarificationTransition(
        session,
        updatedTracker,
        elapsedSeconds,
        assessment,
        data,
        newDisclosedKeys,
        newCoveredDims,
        criteria,
        lang,
      );
      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'CLARIFICATION',
        turnIndex: updatedTracker.turnCount,
        intentType: 'OPENING',
        intentTargetJson: {},
        promptRendered: transitionText,
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        action: 'TRANSITION_STAGE',
        decisionReason: nudgePlan.reason,
      });
      this.streamText(res, transitionText, {
        stageChanged: true,
        stage: 'DESIGN_DRAWING',
      });
      return;
    }

    const nudgeText = nudgePlan.nextIntent
      ? await this.renderer.renderClarification(nudgePlan.nextIntent)
      : '';

    await this.updateStageState(session, {
      ...stageState,
      stage: 'CLARIFICATION',
      trackerJson: updatedTracker as any,
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });

    if (nudgeText) {
      this.streamText(res, nudgeText, null);
    }
  }

  private async handleWalkthroughTurn(
    session: SDSession,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const lang = session.language as 'vi' | 'en' | 'ja';
    // TODO: add targetLevel to SDSession entity
    const level: string =
      (session as { targetLevel?: string }).targetLevel ?? 'mid';
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const graph = this.extractGraph(session);
    const flowPaths = problem.flowPaths ?? [];

    // Load walkthrough tracker from stageState
    const rawTracker = stageState.trackerJson as
      | Partial<SDWalkthroughTracker>
      | undefined;
    const isFirstTurn = !rawTracker || (rawTracker.turnCount ?? 0) === 0;
    const tracker: SDWalkthroughTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        unexplainedNodeIds:
          (rawTracker?.progress as any)?.unexplainedNodeIds ??
          graph.nodes.map((n) => n.id),
        unexplainedEdgeIds:
          (rawTracker?.progress as any)?.unexplainedEdgeIds ??
          graph.edges.map((e) => e.id),
        coveredPathIds: (rawTracker?.progress as any)?.coveredPathIds ?? [],
        criticalPathsCovered:
          (rawTracker?.progress as any)?.criticalPathsCovered ?? false,
        contradictionChallengesUsed:
          (rawTracker?.progress as any)?.contradictionChallengesUsed ?? 0,
      },
    };

    // Load clarification leftover
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
        disclosedFactCount: 0,
      };

    const graphMetrics = await this._getGraphMetrics(session);
    console.log('Walkthrough turn input:', {
      candidateAnswer,
      graph,
      flowPaths,
      tracker,
      clarificationLeftover,
      isFirstTurn,
      graphMetrics,
    });
    // Assess candidate response
    const assessment = await this.walkthroughAssessor.assess(
      candidateAnswer,
      graph,
      flowPaths,
      tracker,
      clarificationLeftover,
      isFirstTurn,
    );
    console.log('Walkthrough turn assessment output:', {
      signals: assessment.signals,
      scoreDelta: assessment.scoreDelta,
      redFlags: assessment.redFlags,
    });
    // Update tracker (merge per-turn IDs into cumulative)
    const extra = assessment.extra ?? {
      explainedNodeIds: [],
      explainedEdgeIds: [],
    };
    const newUnexplainedNodes = tracker.progress.unexplainedNodeIds.filter(
      (id) => !(extra.explainedNodeIds ?? []).includes(id),
    );
    const newUnexplainedEdges = tracker.progress.unexplainedEdgeIds.filter(
      (id) => !(extra.explainedEdgeIds ?? []).includes(id),
    );
    const newCoveredPaths = [
      ...new Set([
        ...tracker.progress.coveredPathIds,
        ...assessment.signals.coveredPathIds,
      ]),
    ];
    const criticalPathsCovered = flowPaths
      .filter((p) => p.required)
      .every((p) => newCoveredPaths.includes(p.id));

    // Build tracker reflecting this turn's progress — pass to policy so transition
    // check uses updated criticalPathsCovered/unexplained, not stale pre-turn state.
    // Contradiction counter stays at current value (not yet bumped) so policy
    // correctly decides whether to issue another challenge.
    const trackerForPolicy: SDWalkthroughTracker = {
      turnCount: tracker.turnCount + 1,
      elapsedSeconds,
      progress: {
        unexplainedNodeIds: newUnexplainedNodes,
        unexplainedEdgeIds: newUnexplainedEdges,
        coveredPathIds: newCoveredPaths,
        criticalPathsCovered,
        contradictionChallengesUsed:
          tracker.progress.contradictionChallengesUsed,
      },
    };

    const decision = this.policyEngine.decideWalkthrough(
      assessment,
      trackerForPolicy,
      WALKTHROUGH_CRITERIA,
    );
    console.log('Walkthrough turn policy decision:', decision);
    // Bump counter only when a challenge is actually sent
    const contradictionChallengesUsed =
      decision.action === 'ASK_CHALLENGE'
        ? trackerForPolicy.progress.contradictionChallengesUsed + 1
        : trackerForPolicy.progress.contradictionChallengesUsed;

    const updatedTracker: SDWalkthroughTracker = {
      ...trackerForPolicy,
      progress: { ...trackerForPolicy.progress, contradictionChallengesUsed },
    };

    // Handle TRANSITION_STAGE
    if (decision.action === 'TRANSITION_STAGE') {
      const leftover: SDWalkthroughLeftoverJson = {
        unexplainedAtEnd: {
          nodeIds: newUnexplainedNodes,
          edgeIds: newUnexplainedEdges,
        },
      };
      const transitionText = this.renderer.buildTransitionText(
        'DESIGN_WALKTHROUGH',
        'DEEP_DIVE',
        lang,
      );

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'DESIGN_WALKTHROUGH',
        turnIndex: updatedTracker.turnCount,
        intentType: 'TRANSITION_STAGE',
        intentTargetJson: {},
        promptRendered: transitionText,
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        extraJson: extra as any,
        action: 'TRANSITION_STAGE',
        decisionReason: decision.reason,
      });

      await this.persistStageSummary({
        sessionId: session.id,
        stage: 'DESIGN_WALKTHROUGH',
        totalTurns: updatedTracker.turnCount,
        elapsedSeconds,
        scores: this._aggregateScores(session, assessment.scoreDelta),
        redFlags: assessment.redFlags,
        leftoverJson: leftover as any,
      });

      const probeBank = problem.probeBank ?? [];
      const ddCriteria = this.deepDivePlanner.getCriteriaForLevel(level);
      const initialDDProgress = {
        completedProbeIds: [],
        activeProbe: null,
        probeBudgetRemaining: ddCriteria.maxProbes,
      };
      const firstProbe = this.deepDivePlanner.selectNextProbe({
        graph,
        graphMetrics: this._resolveGraphMetrics(graphMetrics, graph),
        clarificationLeftover,
        walkthroughLeftover: leftover,
        walkthroughScores: this._aggregateScores(
          session,
          assessment.scoreDelta,
        ),
        tracker: {
          turnCount: 0,
          elapsedSeconds: 0,
          progress: initialDDProgress,
        },
        probeBank,
        context: { language: lang, level },
        elapsedSeconds: 0,
      });

      let ddOpeningText = transitionText;
      let ddTrackerJson: Record<string, unknown> = {
        turnCount: 0,
        elapsedSeconds: 0,
        progress: initialDDProgress,
      };
      if (firstProbe) {
        const firstActive: SDActiveProbeState = {
          probeId: firstProbe.id,
          turnCount: 0,
          followUpCount: 0,
          challengeCount: 0,
          coveredSignals: [],
        };
        const probeIntent = this.deepDivePlanner.buildPrimaryIntent(
          firstProbe,
          lang,
          [],
        );
        const probeText = await this.renderer.renderDeepDive(probeIntent);
        ddOpeningText = `${transitionText}\n\n${probeText}`;
        ddTrackerJson = {
          turnCount: 0,
          elapsedSeconds: 0,
          progress: { ...initialDDProgress, activeProbe: firstActive },
        };
      }

      await this.updateSessionPhase(session, 'DEEP_DIVE', {
        stage: 'DEEP_DIVE',
        trackerJson: ddTrackerJson as any,
        runningScores: {},
      });

      this.streamText(res, ddOpeningText, {
        stageChanged: true,
        stage: 'DEEP_DIVE',
      });
      return;
    }

    // Plan next intent (CHALLENGE, REDIRECT, or FOLLOW_UP)
    let intentText: string;
    let recordIntentType: string;
    if (
      decision.action === 'ASK_CHALLENGE' &&
      assessment.extra?.contradictionDetail
    ) {
      const challengeIntent = {
        stage: 'DESIGN_WALKTHROUGH' as const,
        type: 'CONTRADICTION_CHALLENGE' as const,
        promptTemplate: `${assessment.extra.contradictionDetail}. Ask candidate to reconcile this with their graph.`,
        forbiddenHints: newUnexplainedNodes
          .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? '')
          .filter(Boolean),
        maxSentences: 2,
        language: lang,
        target: {},
      };
      intentText = await this.renderer.renderWalkthrough(challengeIntent);
      recordIntentType = 'CONTRADICTION_CHALLENGE';
    } else {
      const nextIntent = this.walkthroughPlanner.planNextIntent({
        graph,
        flowPaths,
        tracker: updatedTracker,
        clarificationLeftover,
        graphMetrics: graphMetrics ?? {
          componentCoverage: 0.5,
          topologyCoverage: 0.5,
          dataFlowCompleteness: 0.5,
          requirementAlignment: 0.5,
          architectureSimplicity: 1,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        },
        context: { language: lang, level },
        isFirstTurn: false,
        elapsedSeconds,
      });
      intentText = await this.renderer.renderWalkthrough(nextIntent);
      recordIntentType = nextIntent.type;
    }

    // TODO: wrap persistTurnRecord + updateStageState in a DB transaction to prevent inconsistent state on partial failure
    await this.persistTurnRecord({
      sessionId: session.id,
      stage: 'DESIGN_WALKTHROUGH',
      turnIndex: updatedTracker.turnCount,
      intentType: recordIntentType,
      intentTargetJson: {},
      promptRendered: intentText,
      candidateAnswer,
      candidateIntent: assessment.candidateIntent,
      signalsJson: assessment.signals as any,
      scoreDeltas: assessment.scoreDelta,
      extraJson: extra as any,
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'DESIGN_WALKTHROUGH',
      trackerJson: updatedTracker as any,
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });

    this.streamText(res, intentText, null);
  }

  private async handleDeepDiveTurn(
    session: SDSession,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const lang = session.language as 'vi' | 'en' | 'ja';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const level = (session as any).targetLevel ?? 'mid';
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const graph = this.extractGraph(session);
    const probeBank = problem.probeBank ?? [];
    const graphMetrics = await this._getGraphMetrics(session);

    // Load tracker
    const rawTracker = stageState.trackerJson as
      | Partial<SDDeepDiveTracker>
      | undefined;
    const criteria = this.deepDivePlanner.getCriteriaForLevel(level);
    const tracker: SDDeepDiveTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        completedProbeIds:
          (rawTracker?.progress as any)?.completedProbeIds ?? [],
        activeProbe: (rawTracker?.progress as any)?.activeProbe ?? null,
        probeBudgetRemaining:
          (rawTracker?.progress as any)?.probeBudgetRemaining ??
          criteria.maxProbes,
      },
    };

    // Load clarification leftover
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
        disclosedFactCount: 0,
      };
    const walkthroughSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'DESIGN_WALKTHROUGH' },
    });
    const walkthroughLeftover =
      (walkthroughSummary?.leftoverJson as SDWalkthroughLeftoverJson | null) ?? {
        unexplainedAtEnd: { nodeIds: [], edgeIds: [] },
      };
    console.log('Deep Dive turn input:', {
      candidateAnswer,
      graph,
      probeBank,
      tracker,
      clarificationLeftover,
      walkthroughLeftover,
      graphMetrics,
    });
    // If no active probe, select one
    if (!tracker.progress.activeProbe) {
      const nextProbe = this.deepDivePlanner.selectNextProbe({
        graph,
        graphMetrics: this._resolveGraphMetrics(graphMetrics, graph),
        clarificationLeftover,
        walkthroughLeftover,
        walkthroughScores: walkthroughSummary?.scores ?? {},
        tracker,
        probeBank,
        context: { language: lang, level },
        elapsedSeconds,
      });

      if (!nextProbe || tracker.progress.probeBudgetRemaining === 0) {
        await this._closeDeepDive(session, tracker, elapsedSeconds, res, lang);
        return;
      }

      const firstAssessment = candidateAnswer.trim()
        ? await this.deepDiveAssessor.assess(
            candidateAnswer,
            graph,
            nextProbe,
            [],
            clarificationLeftover,
          )
        : null;

      const newActiveProbe: SDActiveProbeState = {
        probeId: nextProbe.id,
        turnCount: 1,
        followUpCount: 0,
        challengeCount: 0,
        coveredSignals: firstAssessment?.signals.expectedSignalsCovered ?? [],
      };
      const primaryIntent = this.deepDivePlanner.buildPrimaryIntent(
        nextProbe,
        lang,
        newActiveProbe.coveredSignals,
      );
      console.log('initial primary intent for new probe:', primaryIntent);
      const primaryText = await this.renderer.renderDeepDive(primaryIntent);
      console.log('Rendered primary text for new probe:', primaryText);
      const updatedTracker: SDDeepDiveTracker = {
        turnCount: tracker.turnCount + 1,
        elapsedSeconds,
        progress: { ...tracker.progress, activeProbe: newActiveProbe },
      };

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'DEEP_DIVE',
        turnIndex: updatedTracker.turnCount,
        intentType: 'PROBE_PRIMARY',
        intentTargetJson: {
          probeId: nextProbe.id,
          probeDimension: nextProbe.dimension,
        },
        promptRendered: primaryText,
        candidateAnswer,
        candidateIntent: firstAssessment?.candidateIntent,
        signalsJson: firstAssessment?.signals as any,
        scoreDeltas: firstAssessment?.scoreDelta,
        action: 'ASK_FOLLOW_UP',
        decisionReason: 'New probe started',
      });

      await this.updateStageState(session, {
        ...stageState,
        stage: 'DEEP_DIVE',
        trackerJson: updatedTracker as any,
        runningScores: firstAssessment
          ? this._aggregateScores(session, firstAssessment.scoreDelta)
          : (stageState.runningScores ?? {}),
      });

      this.streamText(res, primaryText, null);
      return;
    }

    // Active probe exists — assess candidate response
    const activeProbe = tracker.progress.activeProbe;
    const probeObj = probeBank.find((p) => p.id === activeProbe.probeId);
    if (!probeObj) {
      await this._closeDeepDive(session, tracker, elapsedSeconds, res, lang);
      return;
    }

    const assessment = await this.deepDiveAssessor.assess(
      candidateAnswer,
      graph,
      probeObj,
      activeProbe.coveredSignals,
      clarificationLeftover,
    );
    console.log('Deep Dive turn assessment output:', {
      signals: assessment.signals,
      scoreDelta: assessment.scoreDelta,
      redFlags: assessment.redFlags,
    });
    // Update cumulative covered signals
    const newCoveredSignals = [
      ...new Set([
        ...activeProbe.coveredSignals,
        ...assessment.signals.expectedSignalsCovered,
      ]),
    ];

    const decision = this.policyEngine.decideDeepDive(
      assessment,
      tracker,
      criteria,
      probeObj.expectedSignals,
    );
    console.log('Deep Dive turn policy decision:', decision);
    // Update active probe state
    const updatedActive: SDActiveProbeState = {
      ...activeProbe,
      turnCount: activeProbe.turnCount + 1,
      coveredSignals: newCoveredSignals,
      followUpCount:
        decision.action === 'ASK_FOLLOW_UP'
          ? activeProbe.followUpCount + 1
          : activeProbe.followUpCount,
      challengeCount:
        decision.action === 'ASK_CHALLENGE'
          ? activeProbe.challengeCount + 1
          : activeProbe.challengeCount,
    };

    if (
      decision.action === 'TRANSITION_STAGE' ||
      decision.action === 'CLOSE_PROBE'
    ) {
      // Close probe
      updatedActive.closeReason =
        decision.action === 'TRANSITION_STAGE' ? 'timebox' : 'signals_covered';
      const newBudget = tracker.progress.probeBudgetRemaining - 1;
      const updatedTracker: SDDeepDiveTracker = {
        turnCount: tracker.turnCount + 1,
        elapsedSeconds,
        progress: {
          completedProbeIds: [
            ...tracker.progress.completedProbeIds,
            probeObj.id,
          ],
          activeProbe: null,
          probeBudgetRemaining: newBudget,
        },
      };

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'DEEP_DIVE',
        turnIndex: updatedTracker.turnCount,
        intentType: 'PROBE_PRIMARY',
        intentTargetJson: { probeId: probeObj.id },
        promptRendered: '',
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        action: decision.action,
        decisionReason: decision.reason,
      });

      if (newBudget <= 0 || decision.action === 'TRANSITION_STAGE') {
        await this._closeDeepDive(
          session,
          updatedTracker,
          elapsedSeconds,
          res,
          lang,
        );
      } else {
        // Select next probe immediately — emit in same stream
        const nextProbe = this.deepDivePlanner.selectNextProbe({
          graph,
          graphMetrics: this._resolveGraphMetrics(graphMetrics, graph),
          clarificationLeftover,
          walkthroughLeftover,
          walkthroughScores: walkthroughSummary?.scores ?? {},
          tracker: updatedTracker,
          probeBank,
          context: { language: lang, level },
          elapsedSeconds,
        });

        if (!nextProbe) {
          await this._closeDeepDive(
            session,
            updatedTracker,
            elapsedSeconds,
            res,
            lang,
          );
          return;
        }

        const newActive: SDActiveProbeState = {
          probeId: nextProbe.id,
          turnCount: 1,
          followUpCount: 0,
          challengeCount: 0,
          coveredSignals: [],
        };
        const primaryIntent = this.deepDivePlanner.buildPrimaryIntent(
          nextProbe,
          lang,
          [],
        );
        const primaryText = await this.renderer.renderDeepDive(primaryIntent);

        const finalTracker: SDDeepDiveTracker = {
          ...updatedTracker,
          progress: { ...updatedTracker.progress, activeProbe: newActive },
        };

        await this.updateStageState(session, {
          ...stageState,
          stage: 'DEEP_DIVE',
          trackerJson: finalTracker as any,
          runningScores: this._aggregateScores(session, assessment.scoreDelta),
        });

        this.streamText(res, primaryText, null);
      }
      return;
    }

    // Follow-up or challenge
    const trigger = this.deepDivePlanner.pickFollowUpTrigger(
      newCoveredSignals,
      probeObj.expectedSignals,
      assessment.signals.redFlagTriggered,
      assessment.signals.tradeoffMentioned,
      assessment.signals.metricsMentioned,
    );

    let intentText: string;
    let intentType: 'PROBE_FOLLOW_UP' | 'PROBE_CHALLENGE' | 'PROBE_REDIRECT' =
      'PROBE_FOLLOW_UP';

    if (decision.action === 'ASK_CHALLENGE') {
      const challengeIntent = this.deepDivePlanner.buildChallengeIntent(
        probeObj,
        lang,
        assessment.redFlags[0] ?? 'red flag',
        newCoveredSignals,
      );
      intentText = await this.renderer.renderDeepDive(challengeIntent);
      intentType = 'PROBE_CHALLENGE';
    } else if (decision.action === 'REDIRECT') {
      const redirectIntent = this.deepDivePlanner.buildRedirectIntent(
        probeObj,
        lang,
        newCoveredSignals,
      );
      intentText = await this.renderer.renderDeepDive(redirectIntent);
      intentType = 'PROBE_REDIRECT';
    } else {
      const followUpIntent = trigger
        ? this.deepDivePlanner.buildFollowUpIntent(
            probeObj,
            trigger,
            lang,
            newCoveredSignals,
          )
        : null;
      intentText = followUpIntent
        ? await this.renderer.renderDeepDive(followUpIntent)
        : '';
    }

    const updatedTracker: SDDeepDiveTracker = {
      turnCount: tracker.turnCount + 1,
      elapsedSeconds,
      progress: { ...tracker.progress, activeProbe: updatedActive },
    };

    await this.persistTurnRecord({
      sessionId: session.id,
      stage: 'DEEP_DIVE',
      turnIndex: updatedTracker.turnCount,
      intentType,
      intentTargetJson: { probeId: probeObj.id },
      promptRendered: intentText,
      candidateAnswer,
      candidateIntent: assessment.candidateIntent,
      signalsJson: assessment.signals as any,
      scoreDeltas: assessment.scoreDelta,
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'DEEP_DIVE',
      trackerJson: updatedTracker as any,
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });

    if (intentText) {
      this.streamText(res, intentText, null);
    }
  }

  private async _closeDeepDive(
    session: SDSession,
    tracker: SDDeepDiveTracker,
    elapsedSeconds: number,
    res: Response,
    lang: 'vi' | 'en' | 'ja',
  ): Promise<void> {
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const leftover: SDDeepDiveLeftoverJson = {
      completedProbeIds: tracker.progress.completedProbeIds,
      perProbeSignals: {},
      unresolvedRedFlags: [],
    };
    const transitionText = this.renderer.buildTransitionText(
      'DEEP_DIVE',
      'WRAP_UP',
      lang,
    );

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'DEEP_DIVE',
      totalTurns: tracker.turnCount,
      elapsedSeconds,
      scores: stageState.runningScores ?? {},
      redFlags: [],
      leftoverJson: leftover as any,
    });

    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const curveballs = problem.curveballs ?? [];
    const probeBank = problem.probeBank ?? [];
    const wuCriteria = this.wrapUpPlanner.getCriteria();
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
        disclosedFactCount: 0,
      };
    const deepDiveSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'DEEP_DIVE' },
    });
    const graph = this.extractGraph(session);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const level: string = (session as any).targetLevel ?? 'mid';
    const initialWUProgress = {
      completedItemIds: [] as string[],
      baseGraphSnapshotId: '',
      activeScenario: null,
      scenarioBudgetRemaining: wuCriteria.maxScenarios,
    };
    const initialWUTracker: SDWrapUpTracker = {
      turnCount: 0,
      elapsedSeconds: 0,
      progress: initialWUProgress,
    };
    const firstScenario =
      this.wrapUpPlanner.selectNextScenario({
        graph,
        curveballs,
        clarificationLeftover,
        deepDiveLeftover: {
          completedProbeIds: tracker.progress.completedProbeIds,
          perProbeSignals: {},
          unresolvedRedFlags: [],
        },
        deepDiveScores:
          (deepDiveSummary?.scores as Record<string, number>) ?? {},
        tracker: initialWUTracker,
        context: { language: lang, level },
        timeRemainingSeconds: wuCriteria.maxStageSeconds,
      }) ??
      probeBank.find(
        (p) =>
          p.stage === 'WRAP_UP' &&
          !initialWUProgress.completedItemIds.includes(p.id),
      ) ??
      null;

    let wuOpeningText = transitionText;
    let wuTrackerJson: Record<string, unknown> = initialWUProgress;
    if (firstScenario) {
      const firstActiveScenario: SDActiveScenarioState = {
        source:
          'scenarioTemplate' in firstScenario ? 'curveball' : 'probe_fallback',
        scenarioId: firstScenario.id,
        turnCount: 0,
        followUpCount: 0,
        challengeCount: 0,
      };
      const presentIntent = this.wrapUpPlanner.buildPresentIntent(
        firstScenario,
        lang,
        [],
      );
      const presentText = await this.renderer.renderWrapUp(presentIntent);
      wuOpeningText = `${transitionText}\n\n${presentText}`;
      wuTrackerJson = {
        turnCount: 0,
        elapsedSeconds: 0,
        progress: { ...initialWUProgress, activeScenario: firstActiveScenario },
      };
    }

    await this.updateSessionPhase(session, 'WRAP_UP', {
      stage: 'WRAP_UP',
      trackerJson: wuTrackerJson,
      runningScores: {},
    });

    this.streamText(res, wuOpeningText, {
      stageChanged: true,
      stage: 'WRAP_UP',
    });
  }

  private async handleWrapUpTurn(
    session: SDSession,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const lang = session.language as 'vi' | 'en' | 'ja';
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const curveballs = problem.curveballs ?? [];
    const probeBank = problem.probeBank ?? [];
    const criteria = this.wrapUpPlanner.getCriteria();
    const graph = this.extractGraph(session);

    // Load tracker
    const rawTracker = stageState.trackerJson as
      | Partial<SDWrapUpTracker>
      | undefined;
    const tracker: SDWrapUpTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        completedItemIds: (rawTracker?.progress as any)?.completedItemIds ?? [],
        baseGraphSnapshotId:
          (rawTracker?.progress as any)?.baseGraphSnapshotId ?? '',
        activeScenario: (rawTracker?.progress as any)?.activeScenario ?? null,
        scenarioBudgetRemaining:
          (rawTracker?.progress as any)?.scenarioBudgetRemaining ??
          criteria.maxScenarios,
      },
    };

    // Get or capture base graph snapshot for delta tracking
    let baseGraph = graph;
    if (!tracker.progress.baseGraphSnapshotId) {
      const snapshot = await this.drawingTransition.saveGraphSnapshot(
        session.id,
        'WRAP_UP',
        graph,
        {
          componentCoverage: 0,
          topologyCoverage: 0,
          dataFlowCompleteness: 0,
          requirementAlignment: 0,
          architectureSimplicity: 1,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        },
      );
      tracker.progress.baseGraphSnapshotId = snapshot.id;
    } else {
      const baseSnapshot = await this.snapshotRepo.findOne({
        where: { id: tracker.progress.baseGraphSnapshotId },
      });
      if (baseSnapshot) baseGraph = baseSnapshot.graph;
    }

    // Load clarification leftover
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
        disclosedFactCount: 0,
      };

    // Load deep-dive leftover and scores from stage summary
    const deepDiveSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'DEEP_DIVE' },
    });
    const deepDiveLeftover: SDDeepDiveLeftoverJson =
      (deepDiveSummary?.leftoverJson as SDDeepDiveLeftoverJson | null) ?? {
        completedProbeIds: [],
        perProbeSignals: {},
        unresolvedRedFlags: [],
      };
    const deepDiveScores =
      (deepDiveSummary?.scores as Record<string, number>) ?? {};

    const level = (session as { targetLevel?: string }).targetLevel ?? 'mid';

    // If no active scenario, select one
    if (!tracker.progress.activeScenario) {
      if (
        tracker.progress.scenarioBudgetRemaining <= 0 ||
        elapsedSeconds >= criteria.maxStageSeconds
      ) {
        await this._completeSession(
          session,
          tracker,
          elapsedSeconds,
          graph,
          baseGraph,
          res,
          lang,
        );
        return;
      }

      const nextScenario =
        this.wrapUpPlanner.selectNextScenario({
          graph,
          curveballs,
          clarificationLeftover,
          deepDiveLeftover,
          deepDiveScores,
          tracker,
          context: { language: lang, level },
          timeRemainingSeconds: criteria.maxStageSeconds - elapsedSeconds,
        }) ??
        probeBank.find(
          (p) =>
            p.stage === 'WRAP_UP' &&
            !tracker.progress.completedItemIds.includes(p.id),
        ) ??
        null;

      if (!nextScenario) {
        await this._completeSession(
          session,
          tracker,
          elapsedSeconds,
          graph,
          baseGraph,
          res,
          lang,
        );
        return;
      }

      // Save per-scenario baseline so graphAdaptation tracks only changes within this scenario
      const scenarioSnap = await this.drawingTransition.saveGraphSnapshot(
        session.id,
        'WRAP_UP',
        graph,
        {
          componentCoverage: 0,
          topologyCoverage: 0,
          dataFlowCompleteness: 0,
          requirementAlignment: 0,
          architectureSimplicity: 1,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        },
      );

      const newActiveScenario: SDActiveScenarioState = {
        source:
          'scenarioTemplate' in nextScenario ? 'curveball' : 'probe_fallback',
        scenarioId: nextScenario.id,
        turnCount: 1,
        followUpCount: 0,
        challengeCount: 0,
        perScenarioBaseSnapshotId: scenarioSnap.id,
      };

      const presentIntent = this.wrapUpPlanner.buildPresentIntent(
        nextScenario,
        lang,
        [],
      );
      const presentText = await this.renderer.renderWrapUp(presentIntent);

      const updatedTracker: SDWrapUpTracker = {
        turnCount: tracker.turnCount + 1,
        elapsedSeconds,
        progress: { ...tracker.progress, activeScenario: newActiveScenario },
      };

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'WRAP_UP',
        turnIndex: updatedTracker.turnCount,
        intentType: 'SCENARIO_PRESENT',
        intentTargetJson: { scenarioId: nextScenario.id },
        promptRendered: presentText,
        candidateAnswer,
        action: 'ASK_FOLLOW_UP',
        decisionReason: 'New scenario started',
      });

      await this.updateStageState(session, {
        ...stageState,
        stage: 'WRAP_UP',
        trackerJson: updatedTracker as any,
        runningScores: stageState.runningScores ?? {},
      });

      this.streamText(res, presentText, null);
      return;
    }

    // Active scenario — assess
    const activeScenario = tracker.progress.activeScenario;
    const scenarioObj =
      curveballs.find((c) => c.id === activeScenario.scenarioId) ??
      probeBank.find((p) => p.id === activeScenario.scenarioId);

    if (!scenarioObj) {
      await this._completeSession(
        session,
        tracker,
        elapsedSeconds,
        graph,
        baseGraph,
        res,
        lang,
      );
      return;
    }

    // Use per-scenario baseline for accurate graphAdaptation detection
    let assessmentBaseGraph = baseGraph;
    if (activeScenario.perScenarioBaseSnapshotId) {
      const perScenarioSnap = await this.snapshotRepo.findOne({
        where: { id: activeScenario.perScenarioBaseSnapshotId },
      });
      if (perScenarioSnap) {
        assessmentBaseGraph = perScenarioSnap.graph as unknown as SDGraphState;
      }
    }

    const assessment = await this.wrapUpAssessor.assess(
      candidateAnswer,
      scenarioObj,
      graph,
      assessmentBaseGraph,
      clarificationLeftover,
    );

    const decision = this.policyEngine.decideWrapUp(
      assessment,
      tracker,
      criteria,
    );

    const updatedActive: SDActiveScenarioState = {
      ...activeScenario,
      turnCount: activeScenario.turnCount + 1,
      followUpCount:
        decision.action === 'ASK_FOLLOW_UP'
          ? activeScenario.followUpCount + 1
          : activeScenario.followUpCount,
      challengeCount:
        decision.action === 'ASK_CHALLENGE'
          ? activeScenario.challengeCount + 1
          : activeScenario.challengeCount,
    };

    if (
      decision.action === 'COMPLETE_SESSION' ||
      decision.action === 'CLOSE_PROBE'
    ) {
      const newBudget = tracker.progress.scenarioBudgetRemaining - 1;
      const newCompleted = [
        ...tracker.progress.completedItemIds,
        scenarioObj.id,
      ];
      const updatedTracker: SDWrapUpTracker = {
        turnCount: tracker.turnCount + 1,
        elapsedSeconds,
        progress: {
          ...tracker.progress,
          completedItemIds: newCompleted,
          activeScenario: null,
          scenarioBudgetRemaining: newBudget,
        },
      };

      // Persist close record — audit trail for this scenario's final assessment
      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'WRAP_UP',
        turnIndex: updatedTracker.turnCount,
        intentType: 'SCENARIO_CLOSE',
        intentTargetJson: { scenarioId: scenarioObj.id },
        promptRendered: '',
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: assessment.signals as any,
        scoreDeltas: assessment.scoreDelta,
        action: decision.action,
        decisionReason: decision.reason,
      });

      if (newBudget <= 0 || decision.action === 'COMPLETE_SESSION') {
        // Aggregate final scenario scores before completing so _completeSession reads them
        const aggregatedScores = this._aggregateScores(
          session,
          assessment.scoreDelta,
        );
        session.stageState = {
          ...(session.stageState ?? {}),
          runningScores: aggregatedScores,
        };
        await this._completeSession(
          session,
          updatedTracker,
          elapsedSeconds,
          graph,
          baseGraph,
          res,
          lang,
        );
        return;
      }

      // Next scenario in same stream
      const nextScenario =
        this.wrapUpPlanner.selectNextScenario({
          graph,
          curveballs,
          clarificationLeftover,
          deepDiveLeftover,
          deepDiveScores,
          tracker: updatedTracker,
          context: { language: lang, level },
          timeRemainingSeconds: criteria.maxStageSeconds - elapsedSeconds,
        }) ??
        probeBank.find(
          (p) => p.stage === 'WRAP_UP' && !newCompleted.includes(p.id),
        ) ??
        null;

      if (!nextScenario) {
        const aggregatedScores = this._aggregateScores(
          session,
          assessment.scoreDelta,
        );
        session.stageState = {
          ...(session.stageState ?? {}),
          runningScores: aggregatedScores,
        };
        await this._completeSession(
          session,
          updatedTracker,
          elapsedSeconds,
          graph,
          baseGraph,
          res,
          lang,
        );
        return;
      }

      // Save per-scenario baseline for the next scenario
      const nextScenarioSnap = await this.drawingTransition.saveGraphSnapshot(
        session.id,
        'WRAP_UP',
        graph,
        {
          componentCoverage: 0,
          topologyCoverage: 0,
          dataFlowCompleteness: 0,
          requirementAlignment: 0,
          architectureSimplicity: 1,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
        },
      );
      const newActive: SDActiveScenarioState = {
        source:
          'scenarioTemplate' in nextScenario ? 'curveball' : 'probe_fallback',
        scenarioId: nextScenario.id,
        turnCount: 1,
        followUpCount: 0,
        challengeCount: 0,
        perScenarioBaseSnapshotId: nextScenarioSnap.id,
      };
      const presentIntent = this.wrapUpPlanner.buildPresentIntent(
        nextScenario,
        lang,
        [],
      );
      const presentText = await this.renderer.renderWrapUp(presentIntent);
      const finalTracker: SDWrapUpTracker = {
        ...updatedTracker,
        progress: { ...updatedTracker.progress, activeScenario: newActive },
      };

      await this.updateStageState(session, {
        ...stageState,
        stage: 'WRAP_UP',
        trackerJson: finalTracker as any,
        runningScores: this._aggregateScores(session, assessment.scoreDelta),
      });
      this.streamText(res, presentText, null);
      return;
    }

    // Follow-up or challenge
    let intentText: string;
    if (decision.action === 'ASK_CHALLENGE') {
      const challengeDetail =
        assessment.redFlags.length > 0
          ? assessment.redFlags[0]
          : 'Candidate assumption contradicts original design';
      const challengeIntent = this.wrapUpPlanner.buildChallengeIntent(
        scenarioObj,
        lang,
        [],
        challengeDetail,
      );
      intentText = await this.renderer.renderWrapUp(challengeIntent);
    } else {
      const followUpReason = !assessment.signals.blastRadiusRecognized
        ? 'blastRadius'
        : !assessment.signals.mitigationProposed
          ? 'mitigation'
          : !assessment.signals.graphAdaptationMade
            ? 'graphAdaptation'
            : 'consistency';
      const followUpIntent = this.wrapUpPlanner.buildFollowUpIntent(
        scenarioObj,
        lang,
        [],
        followUpReason,
      );
      intentText = await this.renderer.renderWrapUp(followUpIntent);
    }

    const updatedTracker: SDWrapUpTracker = {
      turnCount: tracker.turnCount + 1,
      elapsedSeconds,
      progress: { ...tracker.progress, activeScenario: updatedActive },
    };

    await this.persistTurnRecord({
      sessionId: session.id,
      stage: 'WRAP_UP',
      turnIndex: updatedTracker.turnCount,
      intentType:
        decision.action === 'ASK_CHALLENGE'
          ? 'SCENARIO_CHALLENGE'
          : 'SCENARIO_FOLLOW_UP',
      intentTargetJson: { scenarioId: scenarioObj.id },
      promptRendered: intentText,
      candidateAnswer,
      candidateIntent: assessment.candidateIntent,
      signalsJson: assessment.signals as any,
      scoreDeltas: assessment.scoreDelta,
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'WRAP_UP',
      trackerJson: updatedTracker as any,
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });
    this.streamText(res, intentText, null);
  }

  private async _completeSession(
    session: SDSession,
    tracker: SDWrapUpTracker,
    elapsedSeconds: number,
    currentGraph: SDGraphState,
    baseGraph: SDGraphState,
    res: Response,
    lang: 'vi' | 'en' | 'ja',
  ): Promise<void> {
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const delta = this.wrapUpAssessor.detectGraphDelta(currentGraph, baseGraph);
    const leftover: SDWrapUpLeftoverJson = {
      completedItemIds: tracker.progress.completedItemIds,
      graphDeltaAfterCurveball: delta,
    };

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'WRAP_UP',
      totalTurns: tracker.turnCount,
      elapsedSeconds,
      scores: stageState.runningScores ?? {},
      redFlags: [],
      leftoverJson: leftover as any,
    });

    await this.updateSessionPhase(session, 'EVALUATING', {
      stage: 'EVALUATING',
      trackerJson: {},
      runningScores: {},
    });

    const endText =
      lang === 'vi'
        ? 'Cảm ơn. Phiên phỏng vấn đã kết thúc. Chúng tôi đang đánh giá kết quả của bạn.'
        : lang === 'ja'
          ? 'ありがとうございました。面接が終了しました。結果を評価しています。'
          : "Thank you. The interview session is complete. We're evaluating your performance.";

    this.streamText(res, endText, { stageChanged: true, stage: 'EVALUATING' });
  }

  // ─── Session open ────────────────────────────────────────────────────────────

  async openSession(sessionId: string, res: Response): Promise<void> {
    const session = await this.loadSession(sessionId);
    const stage = session.phase as SDStage;

    this.startSSE(res);
    try {
      if (stage === 'CLARIFICATION') {
        await this.openClarification(session, res);
      } else {
        const lang = session.language as 'vi' | 'en' | 'ja';
        const statusText = this.renderer.buildStageStatusText(stage, lang);
        this.streamText(res, statusText, null);
      }
    } finally {
      this.endSSE(res);
    }
  }

  private async openClarification(
    session: SDSession,
    res: Response,
  ): Promise<void> {
    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const lang = session.language as 'vi' | 'en' | 'ja';
    const durationMinutes = session.durationMinutes;

    const openingIntent = this.clarificationPlanner.buildOpeningIntent(
      problem.title,
      durationMinutes,
      lang,
    );
    const openingText = openingIntent.promptTemplate;

    await this.persistTurnRecord({
      sessionId: session.id,
      stage: 'CLARIFICATION',
      turnIndex: 0,
      intentType: 'OPENING',
      intentTargetJson: {},
      promptRendered: openingText,
      candidateAnswer: '',
      action: 'ANSWER_FACT',
      decisionReason: 'Session opening',
    });

    await this.sessionRepo.update(session.id, { stageStartedAt: new Date() });

    await this.updateStageState(session, {
      stage: 'CLARIFICATION',
      trackerJson: {
        turnCount: 0,
        elapsedSeconds: 0,
        progress: { coveredDimensions: [], disclosedFactKeys: [] },
      },
      runningScores: {},
    });

    this.streamText(res, openingText, null);
  }

  // ─── Done Drawing handler ────────────────────────────────────────────────────

  async handleDoneDrawing(sessionId: string, res: Response): Promise<void> {
    const session = await this.loadSession(sessionId);

    if (session.phase !== 'DESIGN_DRAWING') {
      this.startSSE(res);
      this.streamText(res, 'Session is not in DESIGN_DRAWING stage.', null);
      this.endSSE(res);
      return;
    }

    const problem = await this.problemRepo.findOneOrFail({
      where: { id: session.problemId },
    });
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const hasNudged = stageState.hasNudgedEmptyCanvas ?? false;

    const graph: SDGraphState = this.extractGraph(session);

    this.startSSE(res);
    try {
      const result = await this.drawingTransition.handleDoneDrawing(
        session,
        graph,
        problem,
        hasNudged,
      );

      if (!result.shouldTransition) {
        // Empty canvas — send nudge once
        const nudgeText = this.renderer.buildEmptyCanvasNudge(
          session.language as any,
        );
        this.streamText(res, nudgeText, null);
        await this.updateStageState(session, {
          ...stageState,
          hasNudgedEmptyCanvas: true,
        });
        return;
      }

      // Transition to DESIGN_WALKTHROUGH
      const lang = session.language as 'vi' | 'en' | 'ja';
      const transitionText = this.renderer.buildTransitionText(
        'DESIGN_DRAWING',
        'DESIGN_WALKTHROUGH',
        lang,
      );

      await this.updateSessionPhase(session, 'DESIGN_WALKTHROUGH', {
        stage: 'DESIGN_WALKTHROUGH',
        trackerJson: {},
        runningScores: {},
        graphSnapshotId: result.snapshotId,
        hasNudgedEmptyCanvas: false,
      });

      this.streamText(res, transitionText, {
        stageChanged: true,
        stage: 'DESIGN_WALKTHROUGH',
        isSparse: result.isSparse,
      });
    } finally {
      this.endSSE(res);
    }
  }

  // ─── Persistence helpers ─────────────────────────────────────────────────────

  async persistTurnRecord(params: {
    sessionId: string;
    stage: SDStage;
    turnIndex: number;
    intentType: string;
    intentTargetJson: Record<string, unknown>;
    promptRendered: string;
    candidateAnswer: string;
    candidateIntent?: string;
    signalsJson?: Record<string, unknown>;
    scoreDeltas?: Record<string, number>;
    extraJson?: Record<string, unknown>;
    action?: string;
    decisionReason?: string;
  }): Promise<SDTurnRecord> {
    const record = this.turnRepo.create({
      sessionId: params.sessionId,
      stage: params.stage,
      turnIndex: params.turnIndex,
      intentType: params.intentType as any,
      intentTargetJson: params.intentTargetJson,
      promptRendered: params.promptRendered,
      candidateAnswer: params.candidateAnswer,
      candidateIntent: (params.candidateIntent as any) ?? null,
      signalsJson: params.signalsJson ?? {},
      scoreDeltas: params.scoreDeltas ?? {},
      extraJson: params.extraJson ?? null,
      action: (params.action as any) ?? null,
      decisionReason: params.decisionReason ?? null,
    });
    return this.turnRepo.save(record);
  }

  async persistStageSummary(params: {
    sessionId: string;
    stage: string;
    totalTurns: number;
    elapsedSeconds: number;
    scores: Record<string, number>;
    redFlags: string[];
    leftoverJson: Record<string, unknown>;
  }): Promise<SDStageSummary> {
    const existing = await this.summaryRepo.findOne({
      where: { sessionId: params.sessionId, stage: params.stage as any },
    });
    const summary =
      existing ??
      this.summaryRepo.create({
        sessionId: params.sessionId,
        stage: params.stage as any,
      });
    summary.totalTurns = params.totalTurns;
    summary.elapsedSeconds = params.elapsedSeconds;
    summary.scores = params.scores;
    summary.redFlags = params.redFlags;
    summary.leftoverJson = params.leftoverJson as any;
    return this.summaryRepo.save(summary);
  }

  async updateStageState(
    session: SDSession,
    stageState: Partial<SDSessionStageState>,
  ): Promise<void> {
    await this.sessionRepo.update(session.id, {
      stageState: stageState as any,
    });
  }

  async updateSessionPhase(
    session: SDSession,
    phase: string,
    stageState: SDSessionStageState,
  ): Promise<void> {
    await this.sessionRepo.update(session.id, {
      phase: phase as any,
      stageState: stageState as any,
      stageStartedAt: new Date(),
    });
  }

  // ─── Tracker helpers ─────────────────────────────────────────────────────────

  getClarificationTracker(session: SDSession): SDClarificationTracker {
    const state = (session.stageState ?? {}) as unknown as SDSessionStageState;
    const tracker = state.trackerJson as
      | Partial<SDClarificationTracker>
      | undefined;
    return {
      turnCount: tracker?.turnCount ?? 0,
      elapsedSeconds: tracker?.elapsedSeconds ?? 0,
      progress: {
        coveredDimensions: (tracker?.progress as any)?.coveredDimensions ?? [],
        disclosedFactKeys: (tracker?.progress as any)?.disclosedFactKeys ?? [],
      },
    };
  }

  computeStageElapsedSeconds(session: SDSession): number {
    const stageStartedAt = session.stageStartedAt as Date | null;
    const refMs = stageStartedAt
      ? stageStartedAt.getTime()
      : session.createdAt.getTime();
    return Math.floor((Date.now() - refMs) / 1000);
  }

  // ─── Graph metrics helper ────────────────────────────────────────────────────

  private async _getGraphMetrics(session: SDSession) {
    const snapshot = await this.snapshotRepo.findOne({
      where: { sessionId: session.id, stage: 'DESIGN_DRAWING' },
      order: { capturedAt: 'DESC' },
    });
    return snapshot?.metrics ?? null;
  }

  // ─── Clarification transition helper ────────────────────────────────────────

  private async _commitClarificationTransition(
    session: SDSession,
    updatedTracker: SDClarificationTracker,
    elapsedSeconds: number,
    assessment: SDClarificationAssessment,
    data: SDClarificationData,
    newDisclosedKeys: string[],
    newCoveredDims: string[],
    criteria: SDClarificationTransitionCriteria,
    lang: 'vi' | 'en' | 'ja',
  ): Promise<{ transitionText: string; leftover: SDClarificationLeftoverJson }> {
    const transitionIntent = this.clarificationPlanner.buildTransitionIntent(lang);
    const transitionText = await this.renderer.renderClarification(transitionIntent);

    const leftover: SDClarificationLeftoverJson = {
      requirementContract: {
        disclosedFacts: data.facts
          .filter((f) => newDisclosedKeys.includes(f.key))
          .map((f) => ({ dimension: f.dimension, key: f.key, value: f.answer })),
        coveredDimensions: newCoveredDims,
      },
      uncoveredDimensions: criteria.requiredDimensions.filter(
        (d) => !newCoveredDims.includes(d),
      ),
      disclosedFactCount: newDisclosedKeys.length,
    };

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'CLARIFICATION',
      totalTurns: updatedTracker.turnCount,
      elapsedSeconds,
      scores: this._aggregateScores(session, assessment.scoreDelta),
      redFlags: assessment.redFlags,
      leftoverJson: leftover as any,
    });

    await this.updateSessionPhase(session, 'DESIGN_DRAWING', {
      stage: 'DESIGN_DRAWING',
      trackerJson: {},
      runningScores: {},
      hasNudgedEmptyCanvas: false,
    });

    return { transitionText, leftover };
  }

  // ─── Score aggregation ───────────────────────────────────────────────────────

  private _aggregateScores(
    session: SDSession,
    newDelta: Record<string, number>,
  ): Record<string, number> {
    const stageState = (session.stageState ??
      {}) as unknown as SDSessionStageState;
    const existing = stageState.runningScores ?? {};
    const result: Record<string, number> = { ...existing };
    for (const [key, val] of Object.entries(newDelta)) {
      const prev = result[key];
      // Running average starting from first observation — avoids discounting
      // turn 1 by 50% when averaged against the initial 0 baseline
      result[key] = prev !== undefined ? Math.max(prev, val) : val;
    }
    return result;
  }

  private _resolveGraphMetrics(
    metrics: SDGraphMetrics | null | undefined,
    graph: SDGraphState,
  ): SDGraphMetrics {
    return (
      metrics ?? {
        componentCoverage: 0.5,
        topologyCoverage: 0.5,
        dataFlowCompleteness: 0.5,
        requirementAlignment: 0.5,
        architectureSimplicity: 1,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      }
    );
  }

  // ─── SSE helpers ─────────────────────────────────────────────────────────────

  startSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  streamText(
    res: Response,
    text: string,
    meta: Record<string, unknown> | null,
  ): void {
    const chunks = text.split(' ');
    for (const chunk of chunks) {
      res.write(
        `data: ${JSON.stringify({ token: chunk + ' ', done: false })}\n\n`,
      );
    }
    res.write(`data: ${JSON.stringify({ done: true, meta: meta ?? {} })}\n\n`);
  }

  endSSE(res: Response): void {
    res.end();
  }

  // ─── Session loader ──────────────────────────────────────────────────────────

  private async loadSession(sessionId: string): Promise<SDSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['problem'],
    });
    if (!session)
      throw new NotFoundException(`SDSession ${sessionId} not found`);
    return session;
  }

  private extractGraph(session: SDSession): SDGraphState {
    const arch = session.architectureJSON as any;
    return {
      nodes: (arch?.nodes ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label ?? n.label ?? n.type,
        metadata: n.data?.metadata,
      })),
      edges: (arch?.edges ?? []).map((e: any) => ({
        id: e.id,
        sourceId: e.source ?? e.sourceId,
        targetId: e.target ?? e.targetId,
        label: e.label,
        direction: 'unidirectional' as const,
      })),
    };
  }
}
