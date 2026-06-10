import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Response } from 'express';
import { SDTurnRecord } from './entities/sd-turn-record.entity';
import { SDStageSummary } from './entities/sd-stage-summary.entity';
import { SDGraphSnapshotEntity } from './entities/sd-graph-snapshot.entity';
import { SDPolicyEngineService } from './sd-policy-engine.service';
import { SDResponseAssessmentService } from './sd-response-assessment.service';
import { SDQuestionRendererService } from './sd-question-renderer.service';
import { SDDrawingTransitionService } from './sd-drawing-transition.service';
import { SDClarificationPlannerService } from './planners/sd-clarification-planner.service';
import { SDClarificationAssessorService } from './assessors/sd-clarification-assessor.service';
import { SDWalkthroughPlannerService } from './planners/sd-walkthrough-planner.service';
import { WALKTHROUGH_CRITERIA } from './constants/sd-walkthrough.constants';
import { SDWalkthroughAssessorService } from './assessors/sd-walkthrough-assessor.service';
import { SDDeepDivePlannerService } from './planners/sd-deep-dive-planner.service';
import { SDDeepDiveAssessorService } from './assessors/sd-deep-dive-assessor.service';
import { SDWrapUpPlannerService } from './planners/sd-wrap-up-planner.service';
import { SDWrapUpAssessorService } from './assessors/sd-wrap-up-assessor.service';
import { SDGraphAnalysisService } from './assessors/sd-graph-analysis.service';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import type {
  SDStage,
  SDScoredStage,
  SDIntentType,
  SDCandidateIntent,
  SDDecisionAction,
  SDSessionStageState,
  SDClarificationTracker,
  SDClarificationLeftoverJson,
  SDClarificationAssessment,
  SDClarificationData,
  SDClarificationTransitionCriteria,
  SDWalkthroughTracker,
  SDWalkthroughLeftoverJson,
  SDDeepDiveTracker,
  SDDeepDivePlannerInput,
  SDDeepDiveLeftoverJson,
  SDActiveProbeState,
  SDProbe,
  SDWrapUpTracker,
  SDWrapUpLeftoverJson,
  SDActiveScenarioState,
  SDGraphState,
  SDGraphNode,
  SDGraphEdge,
  SDGraphMetrics,
  SDStageLeftoverJson,
  SDDeepDiveIntentContext,
  SDWrapUpIntentContext,
} from './types/sd-orchestrator.types';
import { SUPPORTED_SD_LANGUAGES } from './constants/sd-orchestrator.constants';
import { CLARIFICATION_CRITERIA } from './constants/sd-clarification.constants';
import type {
  SDLanguage,
  SDTargetLevel,
} from './types/sd-orchestrator-internal.types';

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
    private readonly graphAnalysis: SDGraphAnalysisService,
  ) {}

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
    const stageState = this.getStageState(session);
    const tracker = this.getClarificationTracker(session);
    const lang = this.getSessionLanguage(session);
    const level = this.getSessionLevel(session);
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
    const newDisclosedKeys = [
      ...new Set([
        ...tracker.progress.disclosedFactKeys,

        ...assessment.signals.matchedFactKeys,
      ]),
    ];

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
        signalsJson: this.toJsonRecord(assessment.signals),
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
      const redirectIntent =
        this.clarificationPlanner.buildRedirectIntent(lang);
      const redirectText = await this.renderer.renderClarification(
        redirectIntent,
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
        signalsJson: this.toJsonRecord(assessment.signals),
        scoreDeltas: assessment.scoreDelta,
        action: 'REDIRECT',
        decisionReason: decision.reason,
      });

      await this.updateStageState(session, {
        ...stageState,
        stage: 'CLARIFICATION',
        trackerJson: this.toJsonRecord(updatedTracker),
        runningScores: this._aggregateScores(session, assessment.scoreDelta),
      });

      this.streamText(res, redirectText, null);
      return;
    }

    if (decision.action === 'ANSWER_FACT') {
      const matchedFacts = data.facts.filter((f) =>
        assessment.signals.matchedFactKeys.includes(f.key),
      );
      console.log('Facts to answer:', matchedFacts);
      if (matchedFacts.length > 0) {
        const factDecision = this.clarificationPlanner.buildAnswerFactDecision(
          matchedFacts,
          updatedTracker,
          criteria,
          elapsedSeconds,
          lang,
        );
        console.log('Answer fact decision:', factDecision);
        const answerIntent = factDecision.nextIntent!;
        console.log('Answer fact intent:', answerIntent);
        const combinedAnswer = matchedFacts.map((f) => f.answer).join(' ');
        const answerText = await this.renderer.renderClarification(
          answerIntent,
          combinedAnswer,
        );
        console.log('Answer fact text:', answerText);
        const matchedKeys = matchedFacts.map((f) => f.key);
        const matchedDimensions = [
          ...new Set(matchedFacts.map((f) => f.dimension)),
        ];
        await this.persistTurnRecord({
          sessionId: session.id,
          stage: 'CLARIFICATION',
          turnIndex: updatedTracker.turnCount,
          intentType: 'ANSWER_FACT',
          intentTargetJson: {
            factKeys: matchedKeys,
            dimensions: matchedDimensions,
          },
          promptRendered: answerText,
          candidateAnswer,
          candidateIntent: assessment.candidateIntent,
          signalsJson: this.toJsonRecord(assessment.signals),
          scoreDeltas: assessment.scoreDelta,
          action: 'ANSWER_FACT',
          decisionReason: decision.reason,
        });

        // Check if answering these facts completes the transition criteria
        const allCoveredAfterFact = criteria.requiredDimensions.every((d) =>
          newCoveredDims.includes(d),
        );
        const meetsMinCriteria =
          updatedTracker.turnCount >= criteria.minCandidateTurns;

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
              factKeys: matchedKeys,
              dimensions: matchedDimensions,
            },
            promptRendered: `${answerText}\n\n${transitionText}`,
            candidateAnswer,
            candidateIntent: assessment.candidateIntent,
            signalsJson: this.toJsonRecord(assessment.signals),
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
          trackerJson: this.toJsonRecord(updatedTracker),
          runningScores: this._aggregateScores(session, assessment.scoreDelta),
        });

        this.streamText(res, answerText, null);
        return;
      }

      // no matched facts found in data.facts — LLM returned key(s) not present
      const outOfScopeFallback =
        (
          {
            vi: 'Hãy đặt câu hỏi nằm trong phạm vi của hệ thống.',
            en: 'Please ask questions within the scope of the system.',
            ja: 'システムの範囲内で質問してください。',
          } as Record<string, string>
        )[lang] ?? 'Please ask questions within the scope of the system.';

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'CLARIFICATION',
        turnIndex: updatedTracker.turnCount,
        intentType: 'REDIRECT',
        intentTargetJson: {},
        promptRendered: outOfScopeFallback,
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: this.toJsonRecord(assessment.signals),
        scoreDeltas: assessment.scoreDelta,
        action: 'REDIRECT',
        decisionReason: 'ANSWER_FACT: factKey not found in data.facts',
      });
      await this.updateStageState(session, {
        ...stageState,
        stage: 'CLARIFICATION',
        trackerJson: this.toJsonRecord(updatedTracker),
        runningScores: this._aggregateScores(session, assessment.scoreDelta),
      });
      this.streamText(res, outOfScopeFallback, null);
      return;
    }

    // ASK_NUDGE
    const nudgePlan = this.clarificationPlanner.planNextIntent({
      data,
      tracker: updatedTracker,
      lastCandidateIntent: assessment.candidateIntent,
      context: { language: lang, level },
      elapsedSeconds,
    });
    console.log('Nudge plan:', nudgePlan);
    const nudgeFallbacks: Record<string, string> = {
      vi: 'Bạn có điều gì muốn làm rõ thêm không?',
      en: "Is there anything else you'd like to clarify?",
      ja: '他に確認したいことはありますか？',
    };
    const nudgeText = nudgePlan.nextIntent
      ? await this.renderer.renderClarification(nudgePlan.nextIntent)
      : nudgeFallbacks[lang];
    console.log('Nudge plan:', nudgeText);
    await this.updateStageState(session, {
      ...stageState,
      stage: 'CLARIFICATION',
      trackerJson: this.toJsonRecord(updatedTracker),
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });

    this.streamText(res, nudgeText, null);
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
    const stageState = this.getStageState(session);
    const lang = this.getSessionLanguage(session);
    const level = this.getSessionLevel(session);
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const graph = this.extractGraph(session);
    const flowPaths = problem.flowPaths ?? [];

    // Load walkthrough tracker from stageState
    const rawTracker = stageState.trackerJson as
      | Partial<SDWalkthroughTracker>
      | undefined;
    const rawProgress = this.toJsonRecord(rawTracker?.progress);
    const unexplainedNodeIds = this.stringArray(rawProgress.unexplainedNodeIds);
    const unexplainedEdgeIds = this.stringArray(rawProgress.unexplainedEdgeIds);
    const isFirstTurn = !rawTracker || (rawTracker.turnCount ?? 0) === 0;
    const tracker: SDWalkthroughTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        unexplainedNodeIds: unexplainedNodeIds.length
          ? unexplainedNodeIds
          : graph.nodes.map((n) => n.id),
        unexplainedEdgeIds: unexplainedEdgeIds.length
          ? unexplainedEdgeIds
          : graph.edges.map((e) => e.id),
        coveredPathIds: this.stringArray(rawProgress.coveredPathIds),
        criticalPathsCovered: this.booleanValue(
          rawProgress.criticalPathsCovered,
          false,
        ),
        contradictionChallengesUsed: this.numberValue(
          rawProgress.contradictionChallengesUsed,
          0,
        ),
      },
    };
    console.log('graph:', graph);
    // Load clarification leftover
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
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
    console.log('Walkthrough turn assessment output:', assessment);
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
    console.log(
      'Updated walkthrough tracker for policy input:',
      trackerForPolicy,
    );
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
      const walkthroughScores = this._aggregateScores(
        session,
        assessment.scoreDelta,
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
        signalsJson: this.toJsonRecord(assessment.signals),
        scoreDeltas: assessment.scoreDelta,
        extraJson: this.toJsonRecord(extra),
        action: 'TRANSITION_STAGE',
        decisionReason: decision.reason,
      });

      await this.persistStageSummary({
        sessionId: session.id,
        stage: 'DESIGN_WALKTHROUGH',
        totalTurns: updatedTracker.turnCount,
        elapsedSeconds,
        scores: walkthroughScores,
        redFlags: assessment.redFlags,
        leftoverJson: leftover,
      });

      const ddOpeningText = await this._openDeepDiveFromWalkthrough({
        session,
        problem,
        graph,
        graphMetrics,
        clarificationLeftover,
        walkthroughLeftover: leftover,
        walkthroughScores,
        transitionText,
        lang,
        level,
      });

      this.streamText(res, ddOpeningText, {
        stageChanged: true,
        stage: 'DEEP_DIVE',
      });
      return;
    }

    // Plan next intent (CHALLENGE, REDIRECT, or FOLLOW_UP)
    let intentText: string;
    let recordIntentType: SDIntentType;
    if (decision.action === 'ASK_CHALLENGE') {
      const contradictionDetail =
        assessment.extra?.contradictionDetail ??
        'What you described does not match the structure shown in your diagram';
      const challengeIntent = {
        stage: 'DESIGN_WALKTHROUGH' as const,
        type: 'CONTRADICTION_CHALLENGE' as const,
        promptTemplate: `${contradictionDetail}. Ask candidate to reconcile this with their graph.`,
        forbiddenHints: newUnexplainedNodes
          .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? '')
          .filter(Boolean),
        maxSentences: 2,
        language: lang,
        target: {},
      };
      console.log('Challenge intent:', challengeIntent);
      intentText = await this.renderer.renderWalkthrough(challengeIntent);
      recordIntentType = 'CONTRADICTION_CHALLENGE';
    } else if (decision.action === 'REDIRECT') {
      const redirectPrefix: Record<'vi' | 'en' | 'ja', string> = {
        vi: 'Hãy tập trung vào mục tiêu làm rõ thiết kế của bạn.',
        en: "Let's refocus on clarifying your design.",
        ja: '設計の説明に集中しましょう。',
      };
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
        elapsedSeconds,
      });
      const rendered = await this.renderer.renderWalkthrough(nextIntent);
      intentText = `${redirectPrefix[lang]} ${rendered}`;
      recordIntentType = 'REDIRECT';
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
        elapsedSeconds,
      });
      console.log('Next intent plan:', nextIntent);
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
      signalsJson: this.toJsonRecord(assessment.signals),
      scoreDeltas: assessment.scoreDelta,
      extraJson: this.toJsonRecord(extra),
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'DESIGN_WALKTHROUGH',
      trackerJson: this.toJsonRecord(updatedTracker),
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
    });

    this.streamText(res, intentText, null);
  }

  private async _openDeepDiveFromWalkthrough(input: {
    session: SDSession;
    problem: SDProblem;
    graph: SDGraphState;
    graphMetrics: SDGraphMetrics | null | undefined;
    clarificationLeftover: SDClarificationLeftoverJson;
    walkthroughLeftover: SDWalkthroughLeftoverJson;
    walkthroughScores: Record<string, number>;
    transitionText: string;
    lang: SDLanguage;
    level: SDTargetLevel;
  }): Promise<string> {
    const {
      session,
      problem,
      graph,
      graphMetrics,
      clarificationLeftover,
      walkthroughLeftover,
      walkthroughScores,
      transitionText,
      lang,
      level,
    } = input;

    const probeBank = problem.probeBank ?? [];
    const ddCriteria = this.deepDivePlanner.getCriteriaForLevel(level);
    const initialDDProgress = {
      completedProbeIds: [],
      activeProbe: null,
      probeBudgetRemaining: ddCriteria.maxProbes,
      perProbeSignals: {} as Record<string, string[]>,
    };
    const initialTracker: SDDeepDiveTracker = {
      turnCount: 0,
      elapsedSeconds: 0,
      progress: initialDDProgress,
    };

    const graphAnalysisResult = await this.graphAnalysis
      .analyze(
        graph,
        problem.flowPaths ?? [],
        problem.expectedComponents ?? [],
        clarificationLeftover,
      )
      .catch(() => undefined);

    const { probe: firstProbe, isStructuralGap } =
      this.deepDivePlanner.selectNextProbe({
        graph,
        graphMetrics: this._resolveGraphMetrics(graphMetrics, graph),
        graphAnalysis: graphAnalysisResult,
        clarificationLeftover,
        walkthroughLeftover,
        walkthroughScores,
        tracker: initialTracker,
        probeBank,
        context: { language: lang, level },
        elapsedSeconds: 0,
      });

    let openingText = transitionText;
    let trackerJson: Record<string, unknown> =
      this.toJsonRecord(initialTracker);

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
        isStructuralGap,
      );
      const probeText = await this.renderer.renderDeepDive(probeIntent);
      openingText = `${transitionText}\n\n${probeText}`;
      trackerJson = this.toJsonRecord({
        ...initialTracker,
        progress: { ...initialDDProgress, activeProbe: firstActive },
      });
    }

    await this.updateSessionPhase(session, 'DEEP_DIVE', {
      stage: 'DEEP_DIVE',
      trackerJson,
      runningScores: {},
      graphAnalysisJson: graphAnalysisResult
        ? this.toJsonRecord(graphAnalysisResult)
        : undefined,
    });

    return openingText;
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
    const stageState = this.getStageState(session);
    const lang = this.getSessionLanguage(session);
    const level = this.getSessionLevel(session);
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const graph = this.extractGraph(session);
    const probeBank = problem.probeBank ?? [];
    const graphMetrics = await this._getGraphMetrics(session);

    // Load tracker
    const rawTracker = stageState.trackerJson as
      | Partial<SDDeepDiveTracker>
      | undefined;
    const criteria = this.deepDivePlanner.getCriteriaForLevel(level);
    const rawProgress = this.toJsonRecord(rawTracker?.progress);
    const tracker: SDDeepDiveTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        completedProbeIds: this.stringArray(rawProgress.completedProbeIds),
        activeProbe: this.toActiveProbeState(rawProgress.activeProbe),
        probeBudgetRemaining: this.numberValue(
          rawProgress.probeBudgetRemaining,
          criteria.maxProbes,
        ),
        perProbeSignals: this.toStringArrayRecord(rawProgress.perProbeSignals),
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
    // If no active probe, start the next one or close the stage.
    if (!tracker.progress.activeProbe) {
      await this._startNextProbeOrClose(
        session,
        tracker,
        stageState,
        elapsedSeconds,
        res,
        lang,
        level,
        graph,
        probeBank,
        graphMetrics,
        clarificationLeftover,
        walkthroughLeftover,
        walkthroughSummary?.scores ?? {},
        stageState.runningScores ?? {},
      );
      return;
    }

    // Active probe exists — assess candidate response
    const activeProbe = tracker.progress.activeProbe;
    const probeObj = probeBank.find((p) => p.id === activeProbe.probeId);
    if (!probeObj) {
      await this._closeDeepDive(session, tracker, elapsedSeconds, res, lang);
      return;
    }

    const rawDeepDiveIntent = stageState.activeIntentJson;
    const deepDiveIntentContext: SDDeepDiveIntentContext | undefined =
      rawDeepDiveIntent && typeof rawDeepDiveIntent['intentType'] === 'string'
        ? (rawDeepDiveIntent as unknown as SDDeepDiveIntentContext)
        : undefined;

    const assessment = await this.deepDiveAssessor.assess(
      candidateAnswer,
      graph,
      probeObj,
      activeProbe.coveredSignals,
      clarificationLeftover,
      deepDiveIntentContext,
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
      newCoveredSignals,
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
          perProbeSignals: {
            ...tracker.progress.perProbeSignals,
            [probeObj.id]: newCoveredSignals,
          },
        },
      };

      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'DEEP_DIVE',
        turnIndex: updatedTracker.turnCount,
        intentType: 'PROBE_CLOSE',
        intentTargetJson: { probeId: probeObj.id },
        promptRendered: '',
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: this.toJsonRecord(assessment.signals),
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
        await this._startNextProbeOrClose(
          session,
          updatedTracker,
          stageState,
          elapsedSeconds,
          res,
          lang,
          level,
          graph,
          probeBank,
          graphMetrics,
          clarificationLeftover,
          walkthroughLeftover,
          walkthroughSummary?.scores ?? {},
          this._aggregateScores(session, assessment.scoreDelta),
        );
      }
      return;
    }

    // Follow-up or challenge
    const trigger = this.deepDivePlanner.pickFollowUpTrigger(
      newCoveredSignals,
      probeObj.expectedSignals,
      assessment.redFlags,
      Boolean(assessment.signals.tradeoffMentioned),
      Boolean(assessment.signals.metricsMentioned),
      Boolean(assessment.signals.failureModeMentioned),
    );

    let intentText: string;
    let intentType: 'PROBE_FOLLOW_UP' | 'PROBE_CHALLENGE' | 'PROBE_REDIRECT' =
      'PROBE_FOLLOW_UP';

    let nextDeepDiveIntentContext: SDDeepDiveIntentContext;
    if (decision.action === 'ASK_CHALLENGE') {
      const challengeIntent = this.deepDivePlanner.buildChallengeIntent(
        probeObj,
        lang,
        assessment.redFlags[0] ?? 'red flag',
        newCoveredSignals,
      );
      intentText = await this.renderer.renderDeepDive(challengeIntent);
      intentType = 'PROBE_CHALLENGE';
      nextDeepDiveIntentContext = {
        intentType: 'PROBE_CHALLENGE',
        followUpTrigger: assessment.redFlags[0],
      };
    } else if (decision.action === 'REDIRECT') {
      const redirectIntent = this.deepDivePlanner.buildRedirectIntent(
        probeObj,
        lang,
        newCoveredSignals,
      );
      intentText = await this.renderer.renderDeepDive(redirectIntent);
      intentType = 'PROBE_REDIRECT';
      nextDeepDiveIntentContext = { intentType: 'PROBE_REDIRECT' };
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
      nextDeepDiveIntentContext = {
        intentType: 'PROBE_FOLLOW_UP',
        followUpTrigger: trigger ?? undefined,
      };
    }

    // No intent text: planner has no trigger or probe is missing followUp definition.
    // Treat as CLOSE_PROBE — avoid streaming a silent turn.
    if (!intentText) {
      updatedActive.closeReason = 'signals_covered';
      const newBudget = tracker.progress.probeBudgetRemaining - 1;
      const closedTracker: SDDeepDiveTracker = {
        turnCount: tracker.turnCount + 1,
        elapsedSeconds,
        progress: {
          completedProbeIds: [
            ...tracker.progress.completedProbeIds,
            probeObj.id,
          ],
          activeProbe: null,
          probeBudgetRemaining: newBudget,
          perProbeSignals: {
            ...tracker.progress.perProbeSignals,
            [probeObj.id]: newCoveredSignals,
          },
        },
      };
      await this.persistTurnRecord({
        sessionId: session.id,
        stage: 'DEEP_DIVE',
        turnIndex: closedTracker.turnCount,
        intentType: 'PROBE_CLOSE',
        intentTargetJson: { probeId: probeObj.id },
        promptRendered: '',
        candidateAnswer,
        candidateIntent: assessment.candidateIntent,
        signalsJson: this.toJsonRecord(assessment.signals),
        scoreDeltas: assessment.scoreDelta,
        action: 'CLOSE_PROBE',
        decisionReason:
          'No follow-up trigger or probe missing followUp definition',
      });
      if (newBudget <= 0) {
        await this._closeDeepDive(
          session,
          closedTracker,
          elapsedSeconds,
          res,
          lang,
        );
      } else {
        await this._startNextProbeOrClose(
          session,
          closedTracker,
          stageState,
          elapsedSeconds,
          res,
          lang,
          level,
          graph,
          probeBank,
          graphMetrics,
          clarificationLeftover,
          walkthroughLeftover,
          walkthroughSummary?.scores ?? {},
          this._aggregateScores(session, assessment.scoreDelta),
        );
      }
      return;
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
      signalsJson: this.toJsonRecord(assessment.signals),
      scoreDeltas: assessment.scoreDelta,
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'DEEP_DIVE',
      trackerJson: this.toJsonRecord(updatedTracker),
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
      activeIntentJson: this.toJsonRecord(nextDeepDiveIntentContext),
    });

    this.streamText(res, intentText, null);
  }

  private async _startNextProbeOrClose(
    session: SDSession,
    tracker: SDDeepDiveTracker,
    stageState: Partial<SDSessionStageState>,
    elapsedSeconds: number,
    res: Response,
    lang: SDLanguage,
    level: SDTargetLevel,
    graph: SDGraphState,
    probeBank: SDProbe[],
    graphMetrics: SDGraphMetrics | null,
    clarificationLeftover: SDClarificationLeftoverJson,
    walkthroughLeftover: SDWalkthroughLeftoverJson,
    walkthroughScores: Record<string, number>,
    runningScores: Record<string, number>,
  ): Promise<void> {
    if (tracker.progress.probeBudgetRemaining <= 0) {
      await this._closeDeepDive(session, tracker, elapsedSeconds, res, lang);
      return;
    }

    const savedAnalysis =
      stageState.graphAnalysisJson as SDDeepDivePlannerInput['graphAnalysis'];

    const { probe: nextProbe, isStructuralGap } =
      this.deepDivePlanner.selectNextProbe({
        graph,
        graphMetrics: this._resolveGraphMetrics(graphMetrics, graph),
        graphAnalysis: savedAnalysis,
        clarificationLeftover,
        walkthroughLeftover,
        walkthroughScores,
        tracker,
        probeBank,
        context: { language: lang, level },
        elapsedSeconds,
      });

    if (!nextProbe) {
      await this._closeDeepDive(session, tracker, elapsedSeconds, res, lang);
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
      isStructuralGap,
    );
    const primaryText = await this.renderer.renderDeepDive(primaryIntent);

    const finalTracker: SDDeepDiveTracker = {
      ...tracker,
      progress: { ...tracker.progress, activeProbe: newActive },
    };

    await this.persistTurnRecord({
      sessionId: session.id,
      stage: 'DEEP_DIVE',
      turnIndex: finalTracker.turnCount,
      intentType: 'PROBE_PRIMARY',
      intentTargetJson: {
        probeId: nextProbe.id,
        probeDimension: nextProbe.dimension,
      },
      promptRendered: primaryText,
      candidateAnswer: '',
      action: 'ASK_FOLLOW_UP',
      decisionReason: 'New probe started',
    });

    const primaryIntentContext: SDDeepDiveIntentContext = {
      intentType: 'PROBE_PRIMARY',
    };
    await this.updateStageState(session, {
      ...stageState,
      stage: 'DEEP_DIVE',
      trackerJson: this.toJsonRecord(finalTracker),
      runningScores,
      activeIntentJson: this.toJsonRecord(primaryIntentContext),
    });

    this.streamText(res, primaryText, null);
  }

  private async _closeDeepDive(
    session: SDSession,
    tracker: SDDeepDiveTracker,
    elapsedSeconds: number,
    res: Response,
    lang: 'vi' | 'en' | 'ja',
  ): Promise<void> {
    const stageState = this.getStageState(session);
    const transitionText = this.renderer.buildTransitionText(
      'DEEP_DIVE',
      'WRAP_UP',
      lang,
    );

    const problem =
      session.problem ??
      (await this.problemRepo.findOneOrFail({
        where: { id: session.problemId },
      }));
    const probeBank = problem.probeBank ?? [];

    const unresolvedRedFlags = tracker.progress.completedProbeIds
      .filter((probeId) => {
        const covered = tracker.progress.perProbeSignals[probeId] ?? [];
        const probe = probeBank.find((p) => p.id === probeId);
        return probe && probe.expectedSignals.some((s) => !covered.includes(s));
      })
      .map((probeId) => {
        const probe = probeBank.find((p) => p.id === probeId);
        return `Incomplete signal coverage on dimension: ${probe?.dimension ?? probeId}`;
      });

    const leftover: SDDeepDiveLeftoverJson = {
      completedProbeIds: tracker.progress.completedProbeIds,
      perProbeSignals: tracker.progress.perProbeSignals,
      unresolvedRedFlags,
    };

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'DEEP_DIVE',
      totalTurns: tracker.turnCount,
      elapsedSeconds,
      scores: stageState.runningScores ?? {},
      redFlags: [],
      leftoverJson: leftover,
    });

    // Skip WRAP_UP entirely when curveball is disabled
    if (!session.enableCurveball) {
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
      this.streamText(res, endText, {
        stageChanged: true,
        stage: 'EVALUATING',
      });
      return;
    }

    const wuOpeningText = await this._openWrapUpFromDeepDive({
      session,
      tracker,
      probeBank,
      transitionText,
      lang,
    });

    this.streamText(res, wuOpeningText, {
      stageChanged: true,
      stage: 'WRAP_UP',
    });
  }

  private async _openWrapUpFromDeepDive(input: {
    session: SDSession;
    tracker: SDDeepDiveTracker;
    probeBank: SDProbe[];
    transitionText: string;
    lang: SDLanguage;
  }): Promise<string> {
    const { session, tracker, probeBank, transitionText, lang } = input;
    const wuCriteria = this.wrapUpPlanner.getCriteria();
    const clarificationSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'CLARIFICATION' },
    });
    const clarificationLeftover =
      (clarificationSummary?.leftoverJson as SDClarificationLeftoverJson | null) ?? {
        requirementContract: { disclosedFacts: [], coveredDimensions: [] },
        uncoveredDimensions: [],
      };
    const deepDiveSummary = await this.summaryRepo.findOne({
      where: { sessionId: session.id, stage: 'DEEP_DIVE' },
    });
    const graph = this.extractGraph(session);
    const level = this.getSessionLevel(session);
    const wuProbeBank = probeBank.filter((p) => p.stage === 'WRAP_UP');
    const initialWUProgress = {
      completedItemIds: [] as string[],
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
        probeBank: wuProbeBank,
        clarificationLeftover,
        deepDiveLeftover: {
          completedProbeIds: tracker.progress.completedProbeIds,
          perProbeSignals: tracker.progress.perProbeSignals,
          unresolvedRedFlags: [],
        },
        deepDiveScores:
          (deepDiveSummary?.scores as Record<string, number>) ?? {},
        tracker: initialWUTracker,
        context: { language: lang, level },
        timeRemainingSeconds: wuCriteria.maxStageSeconds,
      }) ?? null;

    let openingText = transitionText;
    let trackerJson: Record<string, unknown> = initialWUProgress;
    if (firstScenario) {
      const firstActiveScenario: SDActiveScenarioState = {
        scenarioId: firstScenario.id,
        turnCount: 0,
        followUpCount: 0,
        challengeCount: 0,
        mentionedMitigations: [],
      };
      const presentIntent = this.wrapUpPlanner.buildPresentIntent(
        firstScenario,
        lang,
        [],
      );
      const presentText = await this.renderer.renderWrapUp(presentIntent);
      openingText = `${transitionText}\n\n${presentText}`;
      trackerJson = {
        turnCount: 0,
        elapsedSeconds: 0,
        progress: { ...initialWUProgress, activeScenario: firstActiveScenario },
      };
    }

    await this.updateSessionPhase(session, 'WRAP_UP', {
      stage: 'WRAP_UP',
      trackerJson,
      runningScores: {},
    });

    return openingText;
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
    const stageState = this.getStageState(session);
    const lang = this.getSessionLanguage(session);
    const elapsedSeconds = this.computeStageElapsedSeconds(session);
    const probeBank = problem.probeBank ?? [];
    const wuProbeBank = probeBank.filter((p) => p.stage === 'WRAP_UP');
    const criteria = this.wrapUpPlanner.getCriteria();
    const graph = this.extractGraph(session);

    // Load tracker
    const rawTracker = stageState.trackerJson as
      | Partial<SDWrapUpTracker>
      | undefined;
    const rawProgress = this.toJsonRecord(rawTracker?.progress);
    const tracker: SDWrapUpTracker = {
      turnCount: rawTracker?.turnCount ?? 0,
      elapsedSeconds,
      progress: {
        completedItemIds: this.stringArray(rawProgress.completedItemIds),
        activeScenario: this.toActiveScenarioState(rawProgress.activeScenario),
        scenarioBudgetRemaining: this.numberValue(
          rawProgress.scenarioBudgetRemaining,
          criteria.maxScenarios,
        ),
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

    const level = this.getSessionLevel(session);

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
          res,
          lang,
        );
        return;
      }

      const nextScenario =
        this.wrapUpPlanner.selectNextScenario({
          graph,
          probeBank: wuProbeBank,
          clarificationLeftover,
          deepDiveLeftover,
          deepDiveScores,
          tracker,
          context: { language: lang, level },
          timeRemainingSeconds: criteria.maxStageSeconds - elapsedSeconds,
        }) ?? null;

      if (!nextScenario) {
        await this._completeSession(
          session,
          tracker,
          elapsedSeconds,
          res,
          lang,
        );
        return;
      }

      const newActiveScenario: SDActiveScenarioState = {
        scenarioId: nextScenario.id,
        turnCount: 1,
        followUpCount: 0,
        challengeCount: 0,
        mentionedMitigations: [],
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
        trackerJson: this.toJsonRecord(updatedTracker),
        runningScores: stageState.runningScores ?? {},
        activeIntentJson: { intentType: 'SCENARIO_PRESENT' },
      });

      this.streamText(res, presentText, null);
      return;
    }

    // Active scenario — assess
    const activeScenario = tracker.progress.activeScenario;
    const rawWrapUpIntent = stageState.activeIntentJson;
    const wrapUpIntentContext: SDWrapUpIntentContext | undefined =
      rawWrapUpIntent && typeof rawWrapUpIntent['intentType'] === 'string'
        ? (rawWrapUpIntent as unknown as SDWrapUpIntentContext)
        : undefined;
    const scenarioObj = probeBank.find(
      (p) => p.id === activeScenario.scenarioId,
    );

    if (!scenarioObj) {
      await this._completeSession(session, tracker, elapsedSeconds, res, lang);
      return;
    }

    const assessment = await this.wrapUpAssessor.assess(
      candidateAnswer,
      scenarioObj,
      clarificationLeftover,
      wrapUpIntentContext,
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
      mentionedMitigations: [
        ...new Set([
          ...activeScenario.mentionedMitigations,
          ...assessment.signals.mentionedMitigations,
        ]),
      ],
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
        signalsJson: this.toJsonRecord(assessment.signals),
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
          ...this.getStageState(session),
          runningScores: aggregatedScores,
        };
        await this._completeSession(
          session,
          updatedTracker,
          elapsedSeconds,
          res,
          lang,
        );
        return;
      }

      // Next scenario in same stream
      const nextScenario =
        this.wrapUpPlanner.selectNextScenario({
          graph,
          probeBank: wuProbeBank,
          clarificationLeftover,
          deepDiveLeftover,
          deepDiveScores,
          tracker: updatedTracker,
          context: { language: lang, level },
          timeRemainingSeconds: criteria.maxStageSeconds - elapsedSeconds,
        }) ?? null;

      if (!nextScenario) {
        const aggregatedScores = this._aggregateScores(
          session,
          assessment.scoreDelta,
        );
        session.stageState = {
          ...this.getStageState(session),
          runningScores: aggregatedScores,
        };
        await this._completeSession(
          session,
          updatedTracker,
          elapsedSeconds,
          res,
          lang,
        );
        return;
      }

      const newActive: SDActiveScenarioState = {
        scenarioId: nextScenario.id,
        turnCount: 1,
        followUpCount: 0,
        challengeCount: 0,
        mentionedMitigations: [],
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
        trackerJson: this.toJsonRecord(finalTracker),
        runningScores: this._aggregateScores(session, assessment.scoreDelta),
        activeIntentJson: { intentType: 'SCENARIO_PRESENT' },
      });
      this.streamText(res, presentText, null);
      return;
    }

    // Follow-up or challenge
    let intentText: string;
    let nextWrapUpIntentContext: SDWrapUpIntentContext;
    const cumulativeMitigations = updatedActive.mentionedMitigations;
    if (decision.action === 'ASK_CHALLENGE') {
      const challengeDetail =
        assessment.redFlags.length > 0
          ? assessment.redFlags[0]
          : 'Candidate assumption contradicts original design';
      const challengeIntent = this.wrapUpPlanner.buildChallengeIntent(
        scenarioObj,
        lang,
        cumulativeMitigations,
        challengeDetail,
      );
      intentText = await this.renderer.renderWrapUp(challengeIntent);
      nextWrapUpIntentContext = {
        intentType: 'SCENARIO_CHALLENGE',
        challengeDetail,
      };
    } else {
      const followUpReason = !assessment.signals.blastRadiusRecognized
        ? 'blastRadius'
        : !assessment.signals.mitigationProposed
          ? 'mitigation'
          : 'consistency';
      const followUpIntent = this.wrapUpPlanner.buildFollowUpIntent(
        scenarioObj,
        lang,
        cumulativeMitigations,
        followUpReason,
      );
      intentText = await this.renderer.renderWrapUp(followUpIntent);
      nextWrapUpIntentContext = {
        intentType: 'SCENARIO_FOLLOW_UP',
        followUpReason,
      };
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
      signalsJson: this.toJsonRecord(assessment.signals),
      scoreDeltas: assessment.scoreDelta,
      action: decision.action,
      decisionReason: decision.reason,
    });

    await this.updateStageState(session, {
      ...stageState,
      stage: 'WRAP_UP',
      trackerJson: this.toJsonRecord(updatedTracker),
      runningScores: this._aggregateScores(session, assessment.scoreDelta),
      activeIntentJson: this.toJsonRecord(nextWrapUpIntentContext),
    });
    this.streamText(res, intentText, null);
  }

  private async _completeSession(
    session: SDSession,
    tracker: SDWrapUpTracker,
    elapsedSeconds: number,
    res: Response,
    lang: 'vi' | 'en' | 'ja',
  ): Promise<void> {
    const stageState = this.getStageState(session);
    const leftover: SDWrapUpLeftoverJson = {
      completedScenarioIds: tracker.progress.completedItemIds,
    };

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'WRAP_UP',
      totalTurns: tracker.turnCount,
      elapsedSeconds,
      scores: stageState.runningScores ?? {},
      redFlags: [],
      leftoverJson: leftover,
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
        const lang = this.getSessionLanguage(session);
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
    const lang = this.getSessionLanguage(session);
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
    const stageState = this.getStageState(session);
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
          this.getSessionLanguage(session),
        );
        this.streamText(res, nudgeText, null);
        await this.updateStageState(session, {
          ...stageState,
          hasNudgedEmptyCanvas: true,
        });
        return;
      }

      // Transition to DESIGN_WALKTHROUGH
      const lang = this.getSessionLanguage(session);
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
    intentType: SDIntentType;
    intentTargetJson: Record<string, unknown>;
    promptRendered: string;
    candidateAnswer: string;
    candidateIntent?: SDCandidateIntent | null;
    signalsJson?: Record<string, unknown>;
    scoreDeltas?: Record<string, number>;
    extraJson?: Record<string, unknown>;
    action?: SDDecisionAction | null;
    decisionReason?: string;
  }): Promise<SDTurnRecord> {
    const record = this.turnRepo.create({
      sessionId: params.sessionId,
      stage: params.stage,
      turnIndex: params.turnIndex,
      intentType: params.intentType,
      intentTargetJson: params.intentTargetJson,
      promptRendered: params.promptRendered,
      candidateAnswer: params.candidateAnswer,
      candidateIntent: params.candidateIntent ?? null,
      signalsJson: params.signalsJson ?? {},
      scoreDeltas: params.scoreDeltas ?? {},
      extraJson: params.extraJson ?? null,
      action: params.action ?? null,
      decisionReason: params.decisionReason ?? null,
    });
    return this.turnRepo.save(record);
  }

  async persistStageSummary(params: {
    sessionId: string;
    stage: SDScoredStage;
    totalTurns: number;
    elapsedSeconds: number;
    scores: Record<string, number>;
    redFlags: string[];
    leftoverJson: SDStageLeftoverJson;
  }): Promise<SDStageSummary> {
    const existing = await this.summaryRepo.findOne({
      where: { sessionId: params.sessionId, stage: params.stage },
    });
    const summary =
      existing ??
      this.summaryRepo.create({
        sessionId: params.sessionId,
        stage: params.stage,
      });
    summary.totalTurns = params.totalTurns;
    summary.elapsedSeconds = params.elapsedSeconds;
    summary.scores = params.scores;
    summary.redFlags = params.redFlags;
    summary.leftoverJson = params.leftoverJson;
    return this.summaryRepo.save(summary);
  }

  async updateStageState(
    session: SDSession,
    stageState: Partial<SDSessionStageState>,
  ): Promise<void> {
    await this.sessionRepo.update(session.id, {
      stageState: this.toStageStateColumn(stageState),
    });
  }

  async updateSessionPhase(
    session: SDSession,
    phase: SDStage,
    stageState: SDSessionStageState,
  ): Promise<void> {
    await this.sessionRepo.update(session.id, {
      phase: phase as SDSession['phase'],
      stageState: this.toStageStateColumn(stageState),
      stageStartedAt: new Date(),
    });
  }

  // ─── Tracker helpers ─────────────────────────────────────────────────────────

  private getSessionLanguage(session: SDSession): SDLanguage {
    return this.isSupportedLanguage(session.language) ? session.language : 'vi';
  }

  private getSessionLevel(session: SDSession): SDTargetLevel {
    return this.isTargetLevel(session.targetLevel)
      ? session.targetLevel
      : 'mid';
  }

  private isSupportedLanguage(value: string): value is SDLanguage {
    return SUPPORTED_SD_LANGUAGES.includes(value as SDLanguage);
  }

  private isTargetLevel(
    value: string | null | undefined,
  ): value is SDTargetLevel {
    return (
      value === 'junior' ||
      value === 'mid' ||
      value === 'senior' ||
      value === 'staff'
    );
  }

  private getStageState(session: SDSession): Partial<SDSessionStageState> {
    return this.toJsonRecord(
      session.stageState,
    ) as Partial<SDSessionStageState>;
  }

  private toStageStateColumn(
    stageState: unknown,
  ): QueryDeepPartialEntity<SDSession>['stageState'] {
    return this.toJsonRecord(
      stageState,
    ) as QueryDeepPartialEntity<SDSession>['stageState'];
  }

  private toJsonRecord(value: unknown): Record<string, unknown> {
    return this.isRecord(value) ? value : {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private stringValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private numberValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : fallback;
  }

  private booleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private toStringArrayRecord(value: unknown): Record<string, string[]> {
    const raw = this.toJsonRecord(value);
    const result: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw)) {
      result[k] = this.stringArray(v);
    }
    return result;
  }

  private isPresent<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  private toActiveProbeState(value: unknown): SDActiveProbeState | null {
    const raw = this.toJsonRecord(value);
    const probeId = this.stringValue(raw.probeId);
    if (!probeId) return null;

    const closeReason = this.stringValue(raw.closeReason);
    return {
      probeId,
      turnCount: this.numberValue(raw.turnCount, 0),
      followUpCount: this.numberValue(raw.followUpCount, 0),
      challengeCount: this.numberValue(raw.challengeCount, 0),
      coveredSignals: this.stringArray(raw.coveredSignals),
      ...(closeReason === 'signals_covered' ||
      closeReason === 'turn_limit' ||
      closeReason === 'timebox'
        ? { closeReason }
        : {}),
    };
  }

  private toActiveScenarioState(value: unknown): SDActiveScenarioState | null {
    const raw = this.toJsonRecord(value);
    const scenarioId = this.stringValue(raw.scenarioId);
    if (!scenarioId) return null;

    const closeReason = this.stringValue(raw.closeReason);
    return {
      scenarioId,
      turnCount: this.numberValue(raw.turnCount, 0),
      followUpCount: this.numberValue(raw.followUpCount, 0),
      challengeCount: this.numberValue(raw.challengeCount, 0),
      mentionedMitigations: this.stringArray(raw.mentionedMitigations),
      ...(closeReason === 'signals_covered' ||
      closeReason === 'turn_limit' ||
      closeReason === 'timebox'
        ? { closeReason }
        : {}),
    };
  }

  getClarificationTracker(session: SDSession): SDClarificationTracker {
    const state = this.getStageState(session);
    const tracker = state.trackerJson as
      | Partial<SDClarificationTracker>
      | undefined;
    const progress = this.toJsonRecord(tracker?.progress);
    return {
      turnCount: tracker?.turnCount ?? 0,
      elapsedSeconds: tracker?.elapsedSeconds ?? 0,
      progress: {
        coveredDimensions: this.stringArray(progress.coveredDimensions),
        disclosedFactKeys: this.stringArray(progress.disclosedFactKeys),
      },
    };
  }

  computeStageElapsedSeconds(session: SDSession): number {
    const stageStartedAt = session.stageStartedAt;
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
  ): Promise<{
    transitionText: string;
    leftover: SDClarificationLeftoverJson;
  }> {
    const transitionIntent =
      this.clarificationPlanner.buildTransitionIntent(lang);
    const transitionText =
      await this.renderer.renderClarification(transitionIntent);

    const leftover: SDClarificationLeftoverJson = {
      requirementContract: {
        disclosedFacts: data.facts
          .filter((f) => newDisclosedKeys.includes(f.key))
          .map((f) => ({
            dimension: f.dimension,
            key: f.key,
            value: f.answer,
          })),
        coveredDimensions: newCoveredDims,
      },
      uncoveredDimensions: criteria.requiredDimensions.filter(
        (d) => !newCoveredDims.includes(d),
      ),
    };

    await this.persistStageSummary({
      sessionId: session.id,
      stage: 'CLARIFICATION',
      totalTurns: updatedTracker.turnCount,
      elapsedSeconds,
      scores: this._aggregateScores(session, assessment.scoreDelta),
      redFlags: assessment.redFlags,
      leftoverJson: leftover,
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
    // EMA α=0.4: recent turns weighted higher, one strong turn doesn't lock in a high score
    const alpha = 0.4;
    const stageState = this.getStageState(session);
    const existing = stageState.runningScores ?? {};
    const result: Record<string, number> = { ...existing };
    for (const [key, val] of Object.entries(newDelta)) {
      const prev = result[key];
      result[key] = prev !== undefined ? alpha * val + (1 - alpha) * prev : val;
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
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  streamText(
    res: Response,
    text: string,
    meta: Record<string, unknown> | null,
  ): void {
    const flush = (res as Response & { flush?: () => void }).flush?.bind(res);
    const chunks = text.split(' ');
    for (const chunk of chunks) {
      res.write(
        `data: ${JSON.stringify({ token: chunk + ' ', done: false })}\n\n`,
      );
      flush?.();
    }
    res.write(`data: ${JSON.stringify({ done: true, meta: meta ?? {} })}\n\n`);
    flush?.();
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
    const arch = this.toJsonRecord(session.architectureJSON);
    const rawNodes = Array.isArray(arch.nodes) ? arch.nodes : [];
    const rawEdges = Array.isArray(arch.edges) ? arch.edges : [];

    return {
      nodes: rawNodes
        .map((node) => this.toGraphNode(node))
        .filter((node): node is SDGraphNode => this.isPresent(node)),
      edges: rawEdges
        .map((edge) => this.toGraphEdge(edge))
        .filter((edge): edge is SDGraphEdge => this.isPresent(edge)),
    };
  }

  private toGraphNode(value: unknown): SDGraphNode | null {
    const node = this.toJsonRecord(value);
    const data = this.toJsonRecord(node.data);
    const id = this.stringValue(node.id);
    const type = this.stringValue(node.type);

    if (!id || !type) {
      return null;
    }

    const metadata = this.toGraphNodeMetadata(data.metadata);
    return {
      id,
      type,
      label:
        this.stringValue(data.label) ?? this.stringValue(node.label) ?? type,
      ...(metadata ? { metadata } : {}),
    };
  }

  private toGraphNodeMetadata(
    value: unknown,
  ): SDGraphNode['metadata'] | undefined {
    const metadata = this.toJsonRecord(value);
    const technology = this.stringValue(metadata.technology);
    const notes = this.stringValue(metadata.notes);
    return technology || notes ? { technology, notes } : undefined;
  }

  private toGraphEdge(value: unknown): SDGraphEdge | null {
    const edge = this.toJsonRecord(value);
    const id = this.stringValue(edge.id);
    const sourceId =
      this.stringValue(edge.source) ?? this.stringValue(edge.sourceId);
    const targetId =
      this.stringValue(edge.target) ?? this.stringValue(edge.targetId);

    if (!id || !sourceId || !targetId) {
      return null;
    }

    return {
      id,
      sourceId,
      targetId,
      label: this.stringValue(edge.label),
      direction: 'unidirectional',
    };
  }
}
