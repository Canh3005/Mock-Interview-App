import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDPolicyEngineService } from '../services/nsd-policy-engine.service';
import { NSDCanvasAnalyzerService } from '../services/nsd-canvas-analyzer.service';
import { NSDResponderService } from '../services/nsd-responder.service';
import type { NSDExtraNodeResult } from '../services/nsd-canvas-analyzer.service';
import { NSDAssessorService } from '../services/nsd-assessor.service';
import { NSDStreamService } from '../services/nsd-stream.service';
import { NSDTurnPersisterService } from '../services/nsd-turn-persister.service';
import { NSDPhaseTransitionService } from '../services/nsd-phase-transition.service';
import { NSDPhase5Service } from './nsd-phase5.service';
import type {
  NSDCanvasState,
  NSDPhase4Progress,
  NSDPhase4Data,
  NSDPhase4FeatureDesign,
  NSDIntegrationReviewState,
  NSDFillEvent,
  NSDExtraNodeEvent,
  NSDItemCounters,
  NSDEvalLevel,
  NSDTurnAction,
  NSDSSEMeta,
} from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

interface NSDPhase4TurnOutcome {
  action: NSDTurnAction;
  responseText: string;
  questionKey: string;
  candidateAnswer: string;
  itemKey?: string;
  evalLevel?: NSDEvalLevel;
  countersSnapshot?: NSDItemCounters[];
  fillEvents?: NSDFillEvent[];
  extraNodeEvents?: NSDExtraNodeEvent[];
  wasFill?: boolean;
  fillAnswer?: string;
}

/**
 * Phase 4 (High-Level Design) turn handler — canvas-accumulation model.
 * Each turn:
 *   0. If an integration review is in progress, dispatch to it exclusively.
 *   1. Turn 1 of a feature: holistic initial assessment of required_explanations.
 *   2. Canvas analysis: role/label matching of required_nodes against the canvas
 *      and accumulated accepted roles, plus extra-node review lifecycle.
 *   3. Extra-node probe state machine (pending answer, or ask a new probe) — exclusive.
 *   4. Required nodes loop (canvas presence only, no LLM).
 *   5. Required explanations loop (LLM classify via policy counters).
 *   6. Last feature, all resolved: integration review, then advance to Phase 5.
 */
@Injectable()
export class NSDPhase4Service {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly policy: NSDPolicyEngineService,
    private readonly canvasAnalyzer: NSDCanvasAnalyzerService,
    private readonly responder: NSDResponderService,
    private readonly assessor: NSDAssessorService,
    private readonly streamSvc: NSDStreamService,
    private readonly persister: NSDTurnPersisterService,
    private readonly phaseTransition: NSDPhaseTransitionService,
    private readonly phase5: NSDPhase5Service,
  ) {}

  initProgress(data: NSDPhase4Data, featureIndex: number): NSDPhase4Progress {
    const feature = data.feature_design[featureIndex];
    return {
      featureIndex,
      initialAssessmentDone: false,
      nodeItemCounters: feature.evaluation_checklist.required_nodes.map((n) =>
        this.policy.initCounters(n.key, !!n.optional),
      ),
      explanationItemCounters:
        feature.evaluation_checklist.required_explanations.map((e) =>
          this.policy.initCounters(e.key, !!e.optional),
        ),
      acceptedNodeRoles: [],
      extraNodeReviews: [],
      integrationReview: null,
      turnCount: 0,
    };
  }

  /** Backfill defaults for sessions created before the canvas-accumulation redesign. */
  private normalizeProgress(progress: NSDPhase4Progress): NSDPhase4Progress {
    return {
      ...progress,
      initialAssessmentDone: progress.initialAssessmentDone ?? false,
      acceptedNodeRoles: progress.acceptedNodeRoles ?? [],
      extraNodeReviews: progress.extraNodeReviews ?? [],
      integrationReview: progress.integrationReview ?? null,
    };
  }

  async handleTurn(
    session: NSDSession,
    problem: NSDProblem,
    candidateAnswer: string,
    canvas: NSDCanvasState | null,
    res: Response,
  ): Promise<void> {
    const data = problem.phase4Data!;
    const language = this.streamSvc.getLanguage(session);
    let progress = this.normalizeProgress(
      session.phase4Progress ?? this.initProgress(data, 0),
    );
    const canvasState = canvas ??
      session.canvasJSON ?? { nodes: [], edges: [] };
    const feature = data.feature_design[progress.featureIndex];
    const isLastFeature =
      progress.featureIndex === data.feature_design.length - 1;

    // An integration review in progress owns the turn exclusively.
    if (progress.integrationReview?.started) {
      await this.handleIntegrationReviewTurn(
        session,
        problem,
        progress,
        feature,
        candidateAnswer,
        res,
        language,
      );
      return;
    }

    // Turn 1 of this feature: holistic pass over required_explanations.
    if (!progress.initialAssessmentDone) {
      progress = await this.runInitialAssessment(
        progress,
        feature,
        candidateAnswer,
      );
    }

    const analysis = this.canvasAnalyzer.analyzeForFeature(
      canvasState,
      feature,
      data.feature_design,
      progress.featureIndex,
      progress.acceptedNodeRoles,
      progress.extraNodeReviews,
    );

    progress = {
      ...progress,
      acceptedNodeRoles: [
        ...progress.acceptedNodeRoles,
        ...analysis.promotedFromFutureRole,
        ...analysis.newAcceptedRoles,
      ],
      extraNodeReviews: analysis.newExtraNodeReviews,
      nodeItemCounters: this.applyRequiredNodeStatuses(
        progress.nodeItemCounters,
        analysis.requiredNodeStatuses,
      ),
    };

    if (analysis.pendingProbeNode) {
      await this.handlePendingProbe(
        session,
        progress,
        feature,
        analysis.pendingProbeNode,
        candidateAnswer,
        res,
        language,
      );
      return;
    }

    if (analysis.newProbeToAsk) {
      await this.askExtraNodeProbe(
        session,
        progress,
        feature,
        analysis.newProbeToAsk,
        candidateAnswer,
        res,
        language,
      );
      return;
    }

    const activeNode = this.policy.findNextUnresolved(
      progress.nodeItemCounters,
    );
    if (activeNode) {
      await this.askRequiredNodeFollowup(
        session,
        progress,
        feature,
        activeNode,
        candidateAnswer,
        res,
        language,
      );
      return;
    }

    const activeExpl = this.policy.findNextUnresolved(
      progress.explanationItemCounters,
    );
    if (activeExpl) {
      await this.handleExplanationTurn(
        session,
        problem,
        progress,
        feature,
        activeExpl,
        candidateAnswer,
        res,
        language,
        isLastFeature,
      );
      return;
    }

    if (isLastFeature && feature.integration_checks?.length) {
      await this.startIntegrationReview(
        session,
        problem,
        progress,
        feature,
        candidateAnswer,
        res,
        language,
      );
      return;
    }

    await this.advanceFeatureAndFinalize(
      session,
      problem,
      progress,
      feature,
      candidateAnswer,
      res,
      language,
      'NEXT_FEATURE',
    );
  }

  // ── Step 1: holistic initial assessment ───────────────────────────────────

  private async runInitialAssessment(
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    candidateAnswer: string,
  ): Promise<NSDPhase4Progress> {
    const items = feature.evaluation_checklist.required_explanations.filter(
      (e) => !e.optional,
    );
    const { unresolvedKeys } = await this.assessor.classifyInitialPhase4(
      candidateAnswer,
      feature.question,
      items,
    );
    const unresolvedSet = new Set(unresolvedKeys);
    const explanationItemCounters = progress.explanationItemCounters.map(
      (c) => {
        if (c.isOptional || unresolvedSet.has(c.itemKey)) return c;
        return { ...c, resolved: true, rounds_needed: 0 };
      },
    );
    return {
      ...progress,
      explanationItemCounters,
      initialAssessmentDone: true,
    };
  }

  // ── Step 2: required_nodes counters from canvas analysis ──────────────────

  private applyRequiredNodeStatuses(
    counters: NSDItemCounters[],
    statuses: Array<{ key: string; status: 'present' | 'missing' }>,
  ): NSDItemCounters[] {
    return counters.map((c) => {
      const status = statuses.find((s) => s.key === c.itemKey);
      if (!status) return c;
      if (status.status === 'present') {
        if (c.resolved) return c;
        return { ...c, resolved: true, added: c.isOptional ? true : c.added };
      }
      // missing
      if (c.isOptional) return { ...c, resolved: true };
      return c;
    });
  }

  // ── Step 3: extra-node probe state machine ─────────────────────────────────

  private async handlePendingProbe(
    session: NSDSession,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    pending: NSDExtraNodeResult,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    const evalLevel = await this.assessor.classify(
      candidateAnswer,
      {
        key: pending.nodeId,
        red_flag: `Candidate added unexplained ${pending.nodeType} node`,
        followup_question: pending.probeQuestion,
        fill_answer: '',
        skill_tag: 'architecture_connection',
      },
      {
        phase: 'PHASE_4_HLD',
        questionKey: feature.feature,
        questionAsked: pending.probeQuestion,
      },
    );

    const outcome: NSDExtraNodeEvent['outcome'] =
      evalLevel === 'good'
        ? 'valid_advanced'
        : evalLevel === 'irrelevant'
          ? 'misunderstanding'
          : 'unjustified';

    const newReviewStatus = evalLevel === 'good' ? 'accepted' : 'rejected';
    progress = {
      ...progress,
      extraNodeReviews: progress.extraNodeReviews.map((r) =>
        r.nodeId === pending.nodeId ? { ...r, status: newReviewStatus } : r,
      ),
    };

    await this.finalize(
      session,
      progress,
      {
        action: 'CANVAS_PROBE',
        responseText: this.responder.buildProbeAcknowledgment(
          evalLevel,
          language,
        ),
        itemKey: pending.nodeId,
        questionKey: feature.feature,
        candidateAnswer,
        evalLevel,
        extraNodeEvents: [
          {
            nodeKey: pending.nodeId,
            nodeType: pending.nodeType,
            in_known_extra_nodes: !!pending.knownExtra,
            candidate_justified: evalLevel === 'good',
            probeQuestion: pending.probeQuestion,
            outcome,
            skill_tag:
              outcome === 'misunderstanding'
                ? 'architecture_connection'
                : undefined,
          },
        ],
      },
      res,
      language,
    );
  }

  private async askExtraNodeProbe(
    session: NSDSession,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    probe: NSDExtraNodeResult,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    const responseText = probe.knownExtra
      ? this.responder.buildExtraNodeProbe(probe.knownExtra)
      : this.responder.buildUnknownExtraNodeProbe(
          probe.nodeLabel,
          probe.nodeType,
        );

    await this.finalize(
      session,
      progress,
      {
        action: 'CANVAS_PROBE',
        responseText,
        itemKey: probe.nodeId,
        questionKey: feature.feature,
        candidateAnswer,
      },
      res,
      language,
    );
  }

  // ── Step 4: required nodes loop (canvas presence only) ─────────────────────

  private async askRequiredNodeFollowup(
    session: NSDSession,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    activeItem: NSDItemCounters,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    const check = feature.evaluation_checklist.required_nodes.find(
      (n) => n.key === activeItem.itemKey,
    )!;

    await this.finalize(
      session,
      progress,
      {
        action: 'NEXT_ITEM',
        responseText: check.followup_question,
        itemKey: activeItem.itemKey,
        questionKey: feature.feature,
        candidateAnswer,
        countersSnapshot: progress.nodeItemCounters,
      },
      res,
      language,
    );
  }

  // ── Step 5: required explanations loop (LLM-classified) ─────────────────────

  private async handleExplanationTurn(
    session: NSDSession,
    problem: NSDProblem,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    activeItem: NSDItemCounters,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
    isLastFeature: boolean,
  ): Promise<void> {
    const check = feature.evaluation_checklist.required_explanations.find(
      (e) => e.key === activeItem.itemKey,
    )!;

    const evalLevel = await this.assessor.classify(candidateAnswer, check, {
      phase: 'PHASE_4_HLD',
      questionKey: feature.feature,
      questionAsked: check.followup_question,
    });

    const { action, updatedCounters } = this.policy.applyEvalLevel(
      activeItem,
      evalLevel,
    );
    const explanationItemCounters = progress.explanationItemCounters.map((c) =>
      c.itemKey === activeItem.itemKey ? updatedCounters : c,
    );
    progress = { ...progress, explanationItemCounters };

    let responseText: string;
    let turnAction: NSDTurnAction;
    let wasFill = false;
    let fillAnswer: string | undefined;
    let fillEvent: NSDFillEvent | undefined;

    if (action === 'fill') {
      responseText = this.responder.buildFillAnswer(check);
      turnAction = 'FILL';
      wasFill = true;
      fillAnswer = check.fill_answer;
      fillEvent = {
        itemKey: check.key,
        skill_tag: check.skill_tag,
        fill_answer: check.fill_answer,
        followup_count_at_fill: updatedCounters.rounds_needed,
        canvasUpdated: false,
        phase: 'PHASE_4_HLD',
        featureOrDimensionKey: feature.feature,
      };
    } else if (action === 'followup') {
      responseText = this.responder.buildFollowup(check);
      turnAction = 'FOLLOWUP';
    } else {
      const nextExpl = this.policy.findNextUnresolved(explanationItemCounters);
      if (nextExpl) {
        const nextCheck =
          feature.evaluation_checklist.required_explanations.find(
            (e) => e.key === nextExpl.itemKey,
          )!;
        responseText = nextCheck.followup_question;
        turnAction = 'NEXT_ITEM';
      } else if (isLastFeature && feature.integration_checks?.length) {
        await this.startIntegrationReview(
          session,
          problem,
          progress,
          feature,
          candidateAnswer,
          res,
          language,
        );
        return;
      } else {
        await this.advanceFeatureAndFinalize(
          session,
          problem,
          progress,
          feature,
          candidateAnswer,
          res,
          language,
          'NEXT_FEATURE',
        );
        return;
      }
    }

    await this.finalize(
      session,
      progress,
      {
        action: turnAction,
        responseText,
        itemKey: activeItem.itemKey,
        questionKey: feature.feature,
        candidateAnswer,
        evalLevel,
        countersSnapshot: explanationItemCounters,
        fillEvents: fillEvent ? [fillEvent] : [],
        wasFill,
        fillAnswer,
      },
      res,
      language,
    );
  }

  // ── Step 6: integration review (last feature only) ─────────────────────────

  private async startIntegrationReview(
    session: NSDSession,
    problem: NSDProblem,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    const integrationReview: NSDIntegrationReviewState = {
      started: true,
      itemCounters: feature.integration_checks!.map((c) =>
        this.policy.initCounters(c.key, false),
      ),
      initialAssessmentDone: false,
    };
    progress = { ...progress, integrationReview };

    await this.finalize(
      session,
      progress,
      {
        action: 'INTEGRATION_REVIEW',
        responseText: this.responder.buildIntegrationReviewQuestion(feature),
        questionKey: feature.feature,
        candidateAnswer,
        countersSnapshot: integrationReview.itemCounters,
      },
      res,
      language,
    );
  }

  private async handleIntegrationReviewTurn(
    session: NSDSession,
    problem: NSDProblem,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    let review = progress.integrationReview!;
    const checks = feature.integration_checks!;
    let initialAssessmentRan = false;

    if (!review.initialAssessmentDone) {
      const { unresolvedKeys } = await this.assessor.classifyInitialPhase4(
        candidateAnswer,
        this.responder.buildIntegrationReviewQuestion(feature),
        checks,
      );
      const unresolvedSet = new Set(unresolvedKeys);
      const itemCounters = review.itemCounters.map((c) =>
        unresolvedSet.has(c.itemKey)
          ? c
          : { ...c, resolved: true, rounds_needed: 0 },
      );
      review = { ...review, itemCounters, initialAssessmentDone: true };
      initialAssessmentRan = true;
    }
    progress = { ...progress, integrationReview: review };

    const activeItem = this.policy.findNextUnresolved(review.itemCounters);

    if (!activeItem) {
      await this.advanceFeatureAndFinalize(
        session,
        problem,
        progress,
        feature,
        candidateAnswer,
        res,
        language,
        'INTEGRATION_REVIEW',
      );
      return;
    }

    if (initialAssessmentRan) {
      // Just discovered the remaining gaps — ask the first one, no LLM classify yet.
      const check = checks.find((c) => c.key === activeItem.itemKey)!;
      await this.finalize(
        session,
        progress,
        {
          action: 'INTEGRATION_REVIEW',
          responseText: check.followup_question,
          itemKey: activeItem.itemKey,
          questionKey: feature.feature,
          candidateAnswer,
          countersSnapshot: review.itemCounters,
        },
        res,
        language,
      );
      return;
    }

    // Followup turn — classify candidateAnswer against the active integration check.
    const check = checks.find((c) => c.key === activeItem.itemKey)!;
    const evalLevel = await this.assessor.classify(candidateAnswer, check, {
      phase: 'PHASE_4_HLD',
      questionKey: feature.feature,
      questionAsked: check.followup_question,
    });
    const { action, updatedCounters } = this.policy.applyEvalLevel(
      activeItem,
      evalLevel,
    );
    const itemCounters = review.itemCounters.map((c) =>
      c.itemKey === activeItem.itemKey ? updatedCounters : c,
    );
    review = { ...review, itemCounters };
    progress = { ...progress, integrationReview: review };

    let responseText: string;
    let turnAction: NSDTurnAction;
    let wasFill = false;
    let fillAnswer: string | undefined;
    let fillEvent: NSDFillEvent | undefined;

    if (action === 'fill') {
      responseText = this.responder.buildFillAnswer(check);
      turnAction = 'FILL';
      wasFill = true;
      fillAnswer = check.fill_answer;
      fillEvent = {
        itemKey: check.key,
        skill_tag: check.skill_tag,
        fill_answer: check.fill_answer,
        followup_count_at_fill: updatedCounters.rounds_needed,
        canvasUpdated: false,
        phase: 'PHASE_4_HLD',
        featureOrDimensionKey: feature.feature,
      };
    } else if (action === 'followup') {
      responseText = this.responder.buildFollowup(check);
      turnAction = 'FOLLOWUP';
    } else {
      const nextItem = this.policy.findNextUnresolved(itemCounters);
      if (nextItem) {
        const nextCheck = checks.find((c) => c.key === nextItem.itemKey)!;
        responseText = nextCheck.followup_question;
        turnAction = 'NEXT_ITEM';
      } else {
        await this.advanceFeatureAndFinalize(
          session,
          problem,
          progress,
          feature,
          candidateAnswer,
          res,
          language,
          'NEXT_ITEM',
        );
        return;
      }
    }

    await this.finalize(
      session,
      progress,
      {
        action: turnAction,
        responseText,
        itemKey: activeItem.itemKey,
        questionKey: feature.feature,
        candidateAnswer,
        evalLevel,
        countersSnapshot: itemCounters,
        fillEvents: fillEvent ? [fillEvent] : [],
        wasFill,
        fillAnswer,
      },
      res,
      language,
    );
  }

  // ── Feature/phase advance ───────────────────────────────────────────────────

  /**
   * Advance to the next Phase 4 feature (carrying over acceptedNodeRoles/extraNodeReviews),
   * or — if this was the last feature — persist this turn and transition to Phase 5/EVALUATING.
   */
  private async advanceFeatureAndFinalize(
    session: NSDSession,
    problem: NSDProblem,
    progress: NSDPhase4Progress,
    feature: NSDPhase4FeatureDesign,
    candidateAnswer: string,
    res: Response,
    language: InterviewLanguage,
    turnAction: NSDTurnAction,
  ): Promise<void> {
    const data = problem.phase4Data!;
    const nextFeatureIndex = progress.featureIndex + 1;

    if (nextFeatureIndex < data.feature_design.length) {
      const nextFeature = data.feature_design[nextFeatureIndex];
      const newProgress: NSDPhase4Progress = {
        ...this.initProgress(data, nextFeatureIndex),
        acceptedNodeRoles: progress.acceptedNodeRoles,
        extraNodeReviews: progress.extraNodeReviews,
        turnCount: progress.turnCount,
      };
      await this.finalize(
        session,
        newProgress,
        {
          action: turnAction,
          responseText: this.responder.buildNextFeatureTransition(
            nextFeature.feature,
            nextFeature.question,
          ),
          questionKey: feature.feature,
          candidateAnswer,
        },
        res,
        language,
      );
      return;
    }

    // Last feature fully resolved — persist this turn (no stream), then transition phases.
    await this.persistTurn(session, progress, {
      action: turnAction,
      responseText: '(phase 4 completed)',
      questionKey: feature.feature,
      candidateAnswer,
    });

    await this.phaseTransition.advanceToNextPhase(
      session.id,
      'PHASE_4_HLD',
      problem,
      session,
      res,
      language,
      [
        progress.nodeItemCounters,
        progress.explanationItemCounters,
        progress.integrationReview?.itemCounters ?? [],
      ],
      () => {
        const inheritedCanvas = session.canvasJSON ?? { nodes: [], edges: [] };
        const phase5Progress = this.phase5.buildInitialProgress(
          problem.phase5Data!,
          inheritedCanvas,
          progress.acceptedNodeRoles,
          progress.extraNodeReviews,
        );
        return this.sessions.updatePhaseProgress(session.id, {
          phase5Progress,
        });
      },
    );
  }

  // ── Single-writer persistence ───────────────────────────────────────────────

  private async persistTurn(
    session: NSDSession,
    progress: NSDPhase4Progress,
    outcome: NSDPhase4TurnOutcome,
  ): Promise<void> {
    await this.sessions.updatePhaseProgress(session.id, {
      phase4Progress: progress,
    });
    const turnIndex = await this.persister.getNextTurnIndex(session.id);
    await this.persister.saveTurn({
      sessionId: session.id,
      phase: 'PHASE_4_HLD',
      turnIndex,
      action: outcome.action,
      itemKey: outcome.itemKey,
      questionKey: outcome.questionKey,
      candidateAnswer: outcome.candidateAnswer,
      responseText: outcome.responseText,
      evalLevel: outcome.evalLevel,
      countersSnapshot: outcome.countersSnapshot,
      fillEvents: outcome.fillEvents,
      extraNodeEvents: outcome.extraNodeEvents,
    });
  }

  private async finalize(
    session: NSDSession,
    progress: NSDPhase4Progress,
    outcome: NSDPhase4TurnOutcome,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    await this.persistTurn(session, progress, outcome);
    await this.streamSvc.streamText(
      res,
      outcome.responseText,
      {
        stageChanged: false,
        wasFill: outcome.wasFill ?? false,
        fillAnswer: outcome.fillAnswer,
      } satisfies NSDSSEMeta,
      language,
    );
  }
}
