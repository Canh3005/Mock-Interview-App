import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDResponderService } from './nsd-responder.service';
import { NSDRenderService } from './nsd-render.service';
import { NSDPolicyEngineService } from './nsd-policy-engine.service';
import { NSDTurnPersisterService } from './nsd-turn-persister.service';
import { NSDStreamService } from './nsd-stream.service';
import { NSD_EVALUATION_QUEUE } from '../../jobs/jobs.constants';
import type {
  NSDPhase,
  NSDInterviewPhase,
  NSDItemCounters,
  NSDSSEMeta,
  NSDPhaseSummaryRecord,
  NSDPhaseDimension,
} from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

export const CANVAS_MODE: Record<NSDPhase, 'locked' | 'editable'> = {
  PHASE_1_FR: 'locked',
  PHASE_2_NFR: 'locked',
  PHASE_3_SCALE: 'locked',
  PHASE_4_HLD: 'editable',
  PHASE_5_DEEP_DIVE: 'editable',
  EVALUATING: 'locked',
  COMPLETED: 'locked',
};

/** Ordered sequence of interview phases — used to find the next phase with configured data. */
export const PHASE_ORDER: NSDInterviewPhase[] = [
  'PHASE_1_FR',
  'PHASE_2_NFR',
  'PHASE_3_SCALE',
  'PHASE_4_HLD',
  'PHASE_5_DEEP_DIVE',
];

const DIMENSION_MAP: Record<NSDInterviewPhase, NSDPhaseDimension[]> = {
  PHASE_1_FR: ['completeness', 'synthesis'],
  PHASE_2_NFR: ['nfr_coverage', 'reasoning_quality', 'tradeoff_awareness'],
  PHASE_3_SCALE: ['calculation_approach', 'architecture_connection'],
  PHASE_4_HLD: [
    'component_correctness',
    'design_reasoning',
    'cross_feature_coherence',
  ],
  PHASE_5_DEEP_DIVE: [
    'bottleneck_identification',
    'solution_knowledge',
    'tradeoff_articulation',
  ],
};

/**
 * Shared "phase lifecycle" logic: moving between interview phases, writing phase
 * summaries, and transitioning into EVALUATING. Only mutates the session at phase
 * boundaries (never writes a running phase's own `phaseNProgress`).
 */
@Injectable()
export class NSDPhaseTransitionService {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly responder: NSDResponderService,
    private readonly render: NSDRenderService,
    private readonly policy: NSDPolicyEngineService,
    private readonly persister: NSDTurnPersisterService,
    private readonly streamSvc: NSDStreamService,
    @InjectQueue(NSD_EVALUATION_QUEUE) private readonly evalQueue: Queue,
  ) {}

  /** Whether `problem` has data configured for `phase`. */
  phaseHasData(problem: NSDProblem, phase: NSDInterviewPhase): boolean {
    switch (phase) {
      case 'PHASE_1_FR':
        return problem.phase1Data != null;
      case 'PHASE_2_NFR':
        return problem.phase2Data != null;
      case 'PHASE_3_SCALE':
        return problem.phase3Data != null;
      case 'PHASE_4_HLD':
        return problem.phase4Data != null;
      case 'PHASE_5_DEEP_DIVE':
        return problem.phase5Data != null;
    }
  }

  /**
   * Find the next interview phase with configured data, searching `PHASE_ORDER`.
   * `from = null` means "no phase has completed yet" (session start) — search from
   * the beginning. Otherwise search starts right after `from`.
   * Returns `'EVALUATING'` if no later phase has data.
   */
  resolveNextPhase(
    problem: NSDProblem,
    from: NSDInterviewPhase | null,
  ): NSDInterviewPhase | 'EVALUATING' {
    const startIdx = from === null ? 0 : PHASE_ORDER.indexOf(from) + 1;
    for (let i = startIdx; i < PHASE_ORDER.length; i++) {
      if (this.phaseHasData(problem, PHASE_ORDER[i])) return PHASE_ORDER[i];
    }
    return 'EVALUATING';
  }

  /** Raw (unrendered) opening text for entering `phase`. */
  buildPhaseOpeningText(phase: NSDInterviewPhase, problem: NSDProblem): string {
    switch (phase) {
      case 'PHASE_1_FR':
        return this.responder.buildPhase1Opening(problem.phase1Data!);
      case 'PHASE_2_NFR':
        return this.responder.buildPhase2Opening(problem.phase2Data!);
      case 'PHASE_3_SCALE':
        return this.responder.buildPhase3Opening(problem.phase3Data!);
      case 'PHASE_4_HLD':
        return this.responder.buildPhase4Opening(problem.phase4Data!);
      case 'PHASE_5_DEEP_DIVE':
        return this.responder.buildPhase5Opening(problem.phase5Data!);
    }
  }

  /** Join non-empty text parts with blank lines, skipping empty segments. */
  joinText(...parts: string[]): string {
    return parts.filter((p) => p.length > 0).join('\n\n');
  }

  /**
   * Land the session in interview phase `to`: optionally seed phase-specific progress
   * (via `seedProgress`, e.g. Phase4 seeding Phase5's initial progress), advance
   * `session.phase`, then stream the (optional) transition text + `to`'s opening.
   * `transitionFrom` is omitted at session start (no prior phase to transition from).
   */
  async enterInterviewPhase(
    sessionId: string,
    to: NSDInterviewPhase,
    problem: NSDProblem,
    session: NSDSession,
    res: Response,
    language: InterviewLanguage,
    transitionFrom?: NSDInterviewPhase,
    seedProgress?: () => Promise<void> | void,
  ): Promise<void> {
    if (seedProgress) {
      await seedProgress();
    }
    await this.sessions.updatePhase(sessionId, to);

    const openingRaw = this.buildPhaseOpeningText(to, problem);

    if (transitionFrom) {
      const transitionText = this.responder.buildPhaseTransition(
        transitionFrom,
        to,
        language,
      );
      const renderedOpening = await this.render.render(openingRaw, language);
      const finalText = `${transitionText}\n\n${renderedOpening}`;
      await this.streamSvc.streamText(
        res,
        finalText,
        {
          stageChanged: true,
          stage: to,
          canvasMode: CANVAS_MODE[to],
          wasFill: false,
        } satisfies NSDSSEMeta,
        language,
        { skipRender: true },
      );
    } else {
      await this.streamSvc.streamText(
        res,
        openingRaw,
        {
          stageChanged: true,
          stage: to,
          canvasMode: CANVAS_MODE[to],
          wasFill: false,
        } satisfies NSDSSEMeta,
        language,
      );
    }
  }

  /**
   * Single entry point for "a phase is done (or the session is just starting) →
   * find the next phase with data → enter it, or finish into EVALUATING".
   * `from = null` means the session has not entered any phase yet (session start);
   * in that case no phase summary is written.
   * `counterGroups` are flattened and passed to `writePhaseSummary` for `from`.
   * `seedProgress` is forwarded to `enterInterviewPhase` (used by Phase4 to seed
   * Phase5's initial progress when `to === 'PHASE_5_DEEP_DIVE'`).
   */
  async advanceToNextPhase(
    sessionId: string,
    from: NSDInterviewPhase | null,
    problem: NSDProblem,
    session: NSDSession,
    res: Response,
    language: InterviewLanguage,
    counterGroups: NSDItemCounters[][],
    seedProgress?: () => Promise<void> | void,
  ): Promise<void> {
    if (from !== null) {
      await this.writePhaseSummary(sessionId, from, ...counterGroups);
    }

    const to = this.resolveNextPhase(problem, from);
    if (to === 'EVALUATING') {
      // from === null + 'EVALUATING' (no phase data configured at all) is pre-checked
      // by startSession and never reaches here.
      await this.transitionToEvaluating(
        sessionId,
        from as NSDInterviewPhase,
        res,
        language,
      );
      return;
    }
    await this.enterInterviewPhase(
      sessionId,
      to,
      problem,
      session,
      res,
      language,
      from ?? undefined,
      seedProgress,
    );
  }

  /** Move the session into EVALUATING: enqueue the evaluation job and stream the transition text. */
  async transitionToEvaluating(
    sessionId: string,
    from: NSDInterviewPhase,
    res: Response,
    language: InterviewLanguage,
  ): Promise<void> {
    await this.sessions.updatePhase(sessionId, 'EVALUATING');
    await this.evalQueue.add('evaluate', { sessionId });
    const text = this.responder.buildPhaseTransition(
      from,
      'EVALUATING',
      language,
    );
    await this.streamSvc.streamText(
      res,
      text,
      {
        stageChanged: true,
        stage: 'EVALUATING',
        canvasMode: 'locked',
        wasFill: false,
      } satisfies NSDSSEMeta,
      language,
      { skipRender: true },
    );
  }

  /**
   * Compute the 3-tier dimension/phase scores from one or more counter groups
   * (flattened) and persist as NSDPhaseSummaryRecord.
   */
  async writePhaseSummary(
    sessionId: string,
    phase: NSDInterviewPhase,
    ...counterGroups: NSDItemCounters[][]
  ): Promise<void> {
    const allCounters = counterGroups.flat();
    const dimensions = this.computePhaseDimensions(phase, allCounters);
    const phaseScore = this.policy.computePhaseScore(dimensions);
    const summary: NSDPhaseSummaryRecord = {
      phase,
      dimensions,
      phaseScore,
      fillCount: allCounters.filter((c) => c.filled).length,
      totalItems: allCounters.filter((c) => !c.isOptional).length,
      optionalItemsAdded: allCounters
        .filter((c) => c.isOptional && c.added)
        .map((c) => c.itemKey),
    };
    await this.persister.savePhaseSummary(sessionId, phase, summary);
  }

  private computePhaseDimensions(
    phase: NSDInterviewPhase,
    counters: NSDItemCounters[],
  ) {
    const dims = DIMENSION_MAP[phase];
    // Distribute counters evenly across dimensions; for simplicity use all counters per dimension
    return dims.map((dim) => this.policy.computeDimensionScore(dim, counters));
  }
}
