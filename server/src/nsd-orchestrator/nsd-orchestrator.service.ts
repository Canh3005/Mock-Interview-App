import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../nsd-session/nsd-session.service';
import { NSDTurnPersisterService } from './services/nsd-turn-persister.service';
import { NSDStreamService } from './services/nsd-stream.service';
import { NSDPhaseTransitionService } from './services/nsd-phase-transition.service';
import { NSDPhase1Service } from './phases/nsd-phase1.service';
import { NSDPhase2Service } from './phases/nsd-phase2.service';
import { NSDPhase3Service } from './phases/nsd-phase3.service';
import { NSDPhase4Service } from './phases/nsd-phase4.service';
import { NSDPhase5Service } from './phases/nsd-phase5.service';
import type { NSDCanvasState } from './types/nsd.types';

/**
 * Thin facade over the per-phase services: starts a session in PHASE_1_FR and
 * dispatches each candidate turn to the handler for the session's current phase.
 */
@Injectable()
export class NSDOrchestratorService {
  private readonly logger = new Logger(NSDOrchestratorService.name);

  constructor(
    private readonly sessions: NSDSessionService,
    private readonly persister: NSDTurnPersisterService,
    private readonly streamSvc: NSDStreamService,
    private readonly phaseTransition: NSDPhaseTransitionService,
    private readonly phase1: NSDPhase1Service,
    private readonly phase2: NSDPhase2Service,
    private readonly phase3: NSDPhase3Service,
    private readonly phase4: NSDPhase4Service,
    private readonly phase5: NSDPhase5Service,
  ) {}

  // ── Start session ─────────────────────────────────────────────────────────

  /**
   * First call when a session enters PHASE_1_FR: stream the opening question,
   * persist the initial Phase 1 progress, and record the OPEN_PHASE turn.
   */
  async startSession(sessionId: string, res: Response): Promise<void> {
    this.streamSvc.startSSE(res);
    try {
      const session = await this.sessions.findOne(sessionId);
      const problem = session.problem;
      const language = this.streamSvc.getLanguage(session);

      if (session.phase !== 'PHASE_1_FR') {
        await this.streamSvc.streamText(
          res,
          `Session is in phase ${session.phase}.`,
          null,
          language,
          { skipRender: true },
        );
        return;
      }

      const start = this.phaseTransition.resolveNextPhase(problem, null);
      if (start === 'EVALUATING') {
        this.logger.error(
          `NSD problem ${problem.id} has no phase data configured`,
        );
        await this.streamSvc.streamText(
          res,
          'This problem has no phase data configured.',
          null,
          language,
          { skipRender: true },
        );
        return;
      }

      const text = this.phaseTransition.buildPhaseOpeningText(start, problem);
      await this.phaseTransition.advanceToNextPhase(
        sessionId,
        null,
        problem,
        session,
        res,
        language,
        [],
      );

      const turnIndex = await this.persister.getNextTurnIndex(sessionId);
      await this.persister.saveTurn({
        sessionId,
        phase: start,
        turnIndex,
        action: 'OPEN_PHASE',
        responseText: text,
        candidateAnswer: '',
      });
    } finally {
      this.streamSvc.endSSE(res);
    }
  }

  // ── Handle candidate turn ─────────────────────────────────────────────────

  /** Dispatch the candidate's turn to the handler for the session's current phase. */
  async handleCandidateTurn(
    sessionId: string,
    candidateAnswer: string,
    canvas: NSDCanvasState | null,
    res: Response,
  ): Promise<void> {
    this.streamSvc.startSSE(res);
    try {
      const session = await this.sessions.findOne(sessionId);
      const problem = session.problem;
      const phase = session.phase;

      switch (phase) {
        case 'PHASE_1_FR':
          await this.phase1.handleTurn(session, problem, candidateAnswer, res);
          break;
        case 'PHASE_2_NFR':
          await this.phase2.handleTurn(session, problem, candidateAnswer, res);
          break;
        case 'PHASE_3_SCALE':
          await this.phase3.handleTurn(session, problem, candidateAnswer, res);
          break;
        case 'PHASE_4_HLD':
          await this.phase4.handleTurn(
            session,
            problem,
            candidateAnswer,
            canvas,
            res,
          );
          break;
        case 'PHASE_5_DEEP_DIVE':
          await this.phase5.handleTurn(
            session,
            problem,
            candidateAnswer,
            canvas,
            res,
          );
          break;
        default:
          await this.streamSvc.streamText(
            res,
            `Session is in ${phase} — no turn input accepted.`,
            null,
            this.streamSvc.getLanguage(session),
            { skipRender: true },
          );
      }
    } finally {
      this.streamSvc.endSSE(res);
    }
  }
}
