import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDPolicyEngineService } from '../services/nsd-policy-engine.service';
import { NSDCanvasAnalyzerService } from '../services/nsd-canvas-analyzer.service';
import { NSDResponderService } from '../services/nsd-responder.service';
import { NSDAssessorService } from '../services/nsd-assessor.service';
import { NSDStreamService } from '../services/nsd-stream.service';
import { NSDTurnPersisterService } from '../services/nsd-turn-persister.service';
import { NSDPhaseTransitionService } from '../services/nsd-phase-transition.service';
import type {
  NSDCanvasState,
  NSDPhase5Progress,
  NSDPhase5Data,
  NSDFillEvent,
  NSDSSEMeta,
  NSDAcceptedNodeRole,
  NSDExtraNodeReview,
  NSDEvalLevel,
  NSDTurnAction,
} from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

/**
 * Phase 5 (Deep Dive) turn handler.
 *
 * Canvas accumulation: inherited roles/reviews from Phase 4 are immutable — new
 * matches in Phase 5 extend the own `acceptedNodeRoles`/`extraNodeReviews` only.
 * Required_nodes resolved exclusively by canvas presence (no LLM eval for nodes).
 * Extra nodes go through the same detected→asked→accepted/rejected lifecycle as Phase 4.
 */
@Injectable()
export class NSDPhase5Service {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly policy: NSDPolicyEngineService,
    private readonly canvasAnalyzer: NSDCanvasAnalyzerService,
    private readonly responder: NSDResponderService,
    private readonly assessor: NSDAssessorService,
    private readonly streamSvc: NSDStreamService,
    private readonly persister: NSDTurnPersisterService,
    private readonly phaseTransition: NSDPhaseTransitionService,
  ) {}

  /**
   * Seed Phase 5 progress at the Phase 4→5 transition.
   * Phase 4's acceptedNodeRoles/extraNodeReviews become immutable inherited arrays;
   * own arrays start empty and accumulate only within Phase 5.
   */
  buildInitialProgress(
    data: NSDPhase5Data,
    inheritedCanvas: NSDCanvasState,
    acceptedNodeRoles: NSDAcceptedNodeRole[],
    extraNodeReviews: NSDExtraNodeReview[],
  ): NSDPhase5Progress {
    const firstQuestion = data.deep_dive_questions[0];
    return {
      questionIndex: 0,
      nodeItemCounters: firstQuestion.evaluation_checklist.required_nodes.map(
        (n) => this.policy.initCounters(n.key, !!n.optional),
      ),
      explanationItemCounters:
        firstQuestion.evaluation_checklist.required_explanations.map((e) =>
          this.policy.initCounters(e.key, !!e.optional),
        ),
      inheritedCanvas,
      inheritedAcceptedNodeRoles: acceptedNodeRoles,
      inheritedExtraNodeReviews: extraNodeReviews,
      acceptedNodeRoles: [],
      extraNodeReviews: [],
      turnCount: 0,
    };
  }

  async handleTurn(
    session: NSDSession,
    problem: NSDProblem,
    candidateAnswer: string,
    canvas: NSDCanvasState | null,
    res: Response,
  ): Promise<void> {
    const data = problem.phase5Data!;
    const language = this.streamSvc.getLanguage(session);
    let progress: NSDPhase5Progress = this._normalizeProgress(
      session.phase5Progress!,
    );
    const canvasState =
      canvas ??
      session.canvasJSON ??
      progress.inheritedCanvas ?? { nodes: [], edges: [] };

    const question = data.deep_dive_questions[progress.questionIndex];
    const phase4KnownTypes = this.canvasAnalyzer.buildPhase4KnownTypes(
      problem.phase4Data?.feature_design ?? [],
    );

    // Canvas analysis — inherited roles/reviews treated as immutable claimed pool
    const {
      requiredNodeStatuses,
      newAcceptedRoles,
      promotedFromFutureRole,
      pendingProbeNode,
      newProbeToAsk,
      newExtraNodeReviews,
    } = this.canvasAnalyzer.analyzeForDeepDive(
      canvasState,
      question,
      progress.inheritedAcceptedNodeRoles,
      progress.inheritedExtraNodeReviews,
      progress.acceptedNodeRoles,
      progress.extraNodeReviews,
      phase4KnownTypes,
    );

    // ── Pending probe: classify the candidate's answer for the awaited node ──
    if (pendingProbeNode) {
      const evalLevel = await this.assessor.classify(
        candidateAnswer,
        {
          key: pendingProbeNode.nodeId,
          red_flag:
            'Candidate cannot explain why the component is needed or gives a vague/irrelevant answer.',
          followup_question: pendingProbeNode.probeQuestion,
          fill_answer: `Candidate provides a clear, justified explanation for the ${pendingProbeNode.nodeType} node's role in the design.`,
          skill_tag: 'architecture_connection',
          check: `Candidate provides a clear, justified explanation for the ${pendingProbeNode.nodeType} node's role in the design.`,
        },
        {
          phase: 'PHASE_5_DEEP_DIVE',
          questionKey: question.key,
          questionAsked: pendingProbeNode.probeQuestion,
        },
      );
      const resolvedStatus: NSDExtraNodeReview['status'] =
        evalLevel === 'good' ? 'accepted' : 'rejected';
      const updatedReviews = newExtraNodeReviews.map((r) =>
        r.nodeId === pendingProbeNode.nodeId
          ? { ...r, status: resolvedStatus }
          : r,
      );
      const ackText = this.responder.buildProbeAcknowledgment(
        evalLevel,
        language,
      );
      progress = {
        ...progress,
        acceptedNodeRoles: [
          ...progress.acceptedNodeRoles,
          ...promotedFromFutureRole,
          ...newAcceptedRoles,
        ],
        extraNodeReviews: updatedReviews,
        turnCount: progress.turnCount + 1,
      };
      await this._persistTurn(
        session,
        progress,
        question.key,
        candidateAnswer,
        ackText,
        'CANVAS_PROBE',
        pendingProbeNode.nodeId,
        evalLevel,
        [],
      );
      await this.streamSvc.streamText(
        res,
        ackText,
        { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
        language,
      );
      return;
    }

    // ── New probe: ask about a newly detected extra node ──────────────────────
    if (newProbeToAsk) {
      const probeText = newProbeToAsk.knownExtra
        ? this.responder.buildExtraNodeProbe(newProbeToAsk.knownExtra)
        : this.responder.buildUnknownExtraNodeProbe(
            newProbeToAsk.nodeLabel,
            newProbeToAsk.nodeType,
          );
      progress = {
        ...progress,
        acceptedNodeRoles: [
          ...progress.acceptedNodeRoles,
          ...promotedFromFutureRole,
          ...newAcceptedRoles,
        ],
        extraNodeReviews: newExtraNodeReviews,
        turnCount: progress.turnCount + 1,
      };
      await this._persistTurn(
        session,
        progress,
        question.key,
        candidateAnswer,
        probeText,
        'CANVAS_PROBE',
        newProbeToAsk.nodeId,
        undefined,
        [],
      );
      await this.streamSvc.streamText(
        res,
        probeText,
        { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
        language,
      );
      return;
    }

    // ── Merge canvas results into own arrays ──────────────────────────────────
    progress = {
      ...progress,
      acceptedNodeRoles: [
        ...progress.acceptedNodeRoles,
        ...promotedFromFutureRole,
        ...newAcceptedRoles,
      ],
      extraNodeReviews: newExtraNodeReviews,
    };

    // Apply requiredNodeStatuses to nodeItemCounters — canvas-only resolution
    const nodeItemCounters = progress.nodeItemCounters.map((counter) => {
      const status = requiredNodeStatuses.find(
        (s) => s.key === counter.itemKey,
      );
      if (!status) return counter;
      if (status.status === 'present' || counter.isOptional) {
        return { ...counter, resolved: true };
      }
      return counter;
    });
    progress = { ...progress, nodeItemCounters };

    // ── Required node followup (canvas-only, no LLM) ──────────────────────────
    const activeNodeItem = this.policy.findNextUnresolved(nodeItemCounters);
    if (activeNodeItem) {
      const nodeCheck = question.evaluation_checklist.required_nodes.find(
        (n) => n.key === activeNodeItem.itemKey,
      )!;
      progress = { ...progress, turnCount: progress.turnCount + 1 };
      await this._persistTurn(
        session,
        progress,
        question.key,
        candidateAnswer,
        nodeCheck.followup_question,
        'NEXT_ITEM',
        activeNodeItem.itemKey,
        undefined,
        [],
      );
      await this.streamSvc.streamText(
        res,
        nodeCheck.followup_question,
        { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
        language,
      );
      return;
    }

    // ── Explanation items (LLM-classified) ────────────────────────────────────
    const activeExplItem = this.policy.findNextUnresolved(
      progress.explanationItemCounters,
    );
    if (activeExplItem) {
      const explCheck = question.evaluation_checklist.required_explanations.find(
        (e) => e.key === activeExplItem.itemKey,
      )!;
      const evalLevel = await this.assessor.classify(candidateAnswer, explCheck, {
        phase: 'PHASE_5_DEEP_DIVE',
        questionKey: question.key,
        questionAsked: explCheck.followup_question,
        overallExpectedResult: question.expected_result,
      });

      const { action, updatedCounters } = this.policy.applyEvalLevel(
        activeExplItem,
        evalLevel,
      );
      const newExplCounters = progress.explanationItemCounters.map((c) =>
        c.itemKey === activeExplItem.itemKey ? updatedCounters : c,
      );
      progress = {
        ...progress,
        explanationItemCounters: newExplCounters,
        turnCount: progress.turnCount + 1,
      };

      if (action === 'fill') {
        const fillAnswer = explCheck.fill_answer;
        const responseText = this.responder.buildFillAnswer(explCheck);
        const fillEvent: NSDFillEvent = {
          itemKey: explCheck.key,
          skill_tag: explCheck.skill_tag,
          fill_answer: fillAnswer,
          followup_count_at_fill: updatedCounters.rounds_needed,
          canvasUpdated: false,
          phase: 'PHASE_5_DEEP_DIVE',
          featureOrDimensionKey: question.key,
        };
        await this._persistTurn(
          session,
          progress,
          question.key,
          candidateAnswer,
          responseText,
          'FILL',
          activeExplItem.itemKey,
          evalLevel,
          [fillEvent],
        );
        await this.streamSvc.streamText(
          res,
          responseText,
          { stageChanged: false, wasFill: true, fillAnswer } satisfies NSDSSEMeta,
          language,
        );
        return;
      }

      if (action === 'followup') {
        const responseText = this.responder.buildFollowup(explCheck);
        await this._persistTurn(
          session,
          progress,
          question.key,
          candidateAnswer,
          responseText,
          'FOLLOWUP',
          activeExplItem.itemKey,
          evalLevel,
          [],
        );
        await this.streamSvc.streamText(
          res,
          responseText,
          { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
          language,
        );
        return;
      }

      // action === 'advance' — item resolved
      const nextExpl = this.policy.findNextUnresolved(newExplCounters);
      if (nextExpl) {
        const responseText = question.evaluation_checklist.required_explanations.find(
          (e) => e.key === nextExpl.itemKey,
        )!.followup_question;
        await this._persistTurn(
          session,
          progress,
          question.key,
          candidateAnswer,
          responseText,
          'NEXT_ITEM',
          activeExplItem.itemKey,
          evalLevel,
          [],
        );
        await this.streamSvc.streamText(
          res,
          responseText,
          { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
          language,
        );
        return;
      }

      // All items for this question done — advance or finish Phase 5
      const nextIdx = progress.questionIndex + 1;
      if (nextIdx < data.deep_dive_questions.length) {
        const nextQ = data.deep_dive_questions[nextIdx];
        // Single write: save new-question state, record last resolution as NEXT_DEEP_DIVE_QUESTION
        const newProgress: NSDPhase5Progress = {
          ...progress,
          questionIndex: nextIdx,
          nodeItemCounters: nextQ.evaluation_checklist.required_nodes.map((n) =>
            this.policy.initCounters(n.key, !!n.optional),
          ),
          explanationItemCounters:
            nextQ.evaluation_checklist.required_explanations.map((e) =>
              this.policy.initCounters(e.key, !!e.optional),
            ),
        };
        await this.sessions.updatePhaseProgress(session.id, {
          phase5Progress: newProgress,
        });
        const turnIndex = await this.persister.getNextTurnIndex(session.id);
        await this.persister.saveTurn({
          sessionId: session.id,
          phase: 'PHASE_5_DEEP_DIVE',
          turnIndex,
          action: 'NEXT_DEEP_DIVE_QUESTION',
          itemKey: activeExplItem.itemKey,
          questionKey: question.key,
          candidateAnswer,
          responseText: nextQ.question,
          evalLevel,
          countersSnapshot: newExplCounters,
          fillEvents: [],
        });
        const transitionText = this.responder.buildNextDeepDiveTransition(
          nextQ.question,
        );
        await this.streamSvc.streamText(
          res,
          transitionText,
          { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
          language,
        );
        return;
      }

      // Last question — record turn then transition to EVALUATING
      await this._persistTurn(
        session,
        progress,
        question.key,
        candidateAnswer,
        '(phase 5 completed)',
        'NEXT_DEEP_DIVE_QUESTION',
        activeExplItem.itemKey,
        evalLevel,
        [],
      );
      await this.phaseTransition.advanceToNextPhase(
        session.id,
        'PHASE_5_DEEP_DIVE',
        problem,
        session,
        res,
        language,
        [progress.nodeItemCounters, progress.explanationItemCounters],
      );
      return;
    }

    // All items already resolved when this turn arrived — advance question (edge case)
    await this._advanceQuestion(session, problem, progress, res, language);
  }

  /**
   * Edge-case advance: called only when all counters are already resolved at
   * the start of a turn (no item was resolved this turn, so no saveTurn here).
   */
  private async _advanceQuestion(
    session: NSDSession,
    problem: NSDProblem,
    progress: NSDPhase5Progress,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    const data = problem.phase5Data!;
    const nextIdx = progress.questionIndex + 1;

    if (nextIdx < data.deep_dive_questions.length) {
      const nextQ = data.deep_dive_questions[nextIdx];
      const newProgress: NSDPhase5Progress = {
        ...progress,
        questionIndex: nextIdx,
        nodeItemCounters: nextQ.evaluation_checklist.required_nodes.map((n) =>
          this.policy.initCounters(n.key, !!n.optional),
        ),
        explanationItemCounters:
          nextQ.evaluation_checklist.required_explanations.map((e) =>
            this.policy.initCounters(e.key, !!e.optional),
          ),
      };
      await this.sessions.updatePhaseProgress(session.id, {
        phase5Progress: newProgress,
      });
      const text = this.responder.buildNextDeepDiveTransition(nextQ.question);
      await this.streamSvc.streamText(
        res,
        text,
        { stageChanged: false, wasFill: false } satisfies NSDSSEMeta,
        language,
      );
      return;
    }

    await this.phaseTransition.advanceToNextPhase(
      session.id,
      'PHASE_5_DEEP_DIVE',
      problem,
      session,
      res,
      language,
      [progress.nodeItemCounters, progress.explanationItemCounters],
    );
  }

  /** Single-writer: updatePhaseProgress + saveTurn. Must be paired with exactly one streamText. */
  private async _persistTurn(
    session: NSDSession,
    progress: NSDPhase5Progress,
    questionKey: string,
    candidateAnswer: string,
    responseText: string,
    action: NSDTurnAction,
    itemKey: string,
    evalLevel: NSDEvalLevel | undefined,
    fillEvents: NSDFillEvent[],
  ): Promise<void> {
    await this.sessions.updatePhaseProgress(session.id, {
      phase5Progress: progress,
    });
    const turnIndex = await this.persister.getNextTurnIndex(session.id);
    await this.persister.saveTurn({
      sessionId: session.id,
      phase: 'PHASE_5_DEEP_DIVE',
      turnIndex,
      action,
      itemKey,
      questionKey,
      candidateAnswer,
      responseText,
      evalLevel,
      countersSnapshot: [
        ...progress.nodeItemCounters,
        ...progress.explanationItemCounters,
      ],
      fillEvents,
    });
  }

  private _normalizeProgress(progress: NSDPhase5Progress): NSDPhase5Progress {
    return {
      ...progress,
      inheritedAcceptedNodeRoles: progress.inheritedAcceptedNodeRoles ?? [],
      inheritedExtraNodeReviews: progress.inheritedExtraNodeReviews ?? [],
      acceptedNodeRoles: progress.acceptedNodeRoles ?? [],
      extraNodeReviews: progress.extraNodeReviews ?? [],
    };
  }
}
