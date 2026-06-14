import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDResponderService } from '../services/nsd-responder.service';
import { NSDStreamService } from '../services/nsd-stream.service';
import { NSDGroupTurnService } from '../services/nsd-group-turn.service';
import { NSDPhaseTransitionService } from '../services/nsd-phase-transition.service';
import type { NSDPhase2Progress } from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';

/**
 * Phase 2 (Non-Functional Requirements) turn handler.
 * Same shape as Phase 1, but loops over data.nfr_dimensions[] instead of features.
 */
@Injectable()
export class NSDPhase2Service {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly responder: NSDResponderService,
    private readonly streamSvc: NSDStreamService,
    private readonly groupTurn: NSDGroupTurnService,
    private readonly phaseTransition: NSDPhaseTransitionService,
  ) {}

  initProgress(): NSDPhase2Progress {
    return {
      openingDone: false,
      dimensionIndex: 0,
      group: this.groupTurn.initGroupState(),
      resolvedItems: [],
      fillEvents: [],
      closingStarted: false,
      closing: this.groupTurn.initGroupState(),
      closingResolvedItems: [],
      closingFillEvents: [],
      turnCount: 0,
    };
  }

  async handleTurn(
    session: NSDSession,
    problem: NSDProblem,
    candidateAnswer: string,
    res: Response,
  ): Promise<void> {
    const data = problem.phase2Data!;
    const language = this.streamSvc.getLanguage(session);
    let progress: NSDPhase2Progress =
      session.phase2Progress ?? this.initProgress();

    // Opening turn: send NFR context + first dimension's question.
    if (!progress.openingDone) {
      progress = { ...progress, openingDone: true };
      await this.sessions.updatePhaseProgress(session.id, {
        phase2Progress: progress,
      });
      const text = this.responder.buildPhase2ContextAndFirstDimension(data);
      await this.streamSvc.streamText(
        res,
        text,
        { stageChanged: false, wasFill: false },
        language,
      );
      return;
    }

    // Closing group: all dimensions done, now resolving data.closing.red_flags.
    // Once handleGroupTurn reports done → transition to Phase 3.
    if (progress.closingStarted) {
      const { responseText, updatedProgress, done, wasFill, fillAnswer } =
        await this.groupTurn.handleGroupTurn(
          'PHASE_2_NFR',
          candidateAnswer,
          progress.closing,
          progress.closingResolvedItems,
          progress.closingFillEvents,
          data.closing.red_flags,
          data.closing.question,
          data.closing.expected_result,
          'closing',
          language,
        );
      progress = {
        ...progress,
        closing: updatedProgress.group,
        closingResolvedItems: updatedProgress.resolvedItems,
        closingFillEvents: updatedProgress.fillEvents,
      };
      await this.sessions.updatePhaseProgress(session.id, {
        phase2Progress: progress,
      });
      if (done) {
        await this.phaseTransition.advanceToNextPhase(
          session.id,
          'PHASE_2_NFR',
          problem,
          session,
          res,
          language,
          [
            this.groupTurn.resolvedToCounters([
              ...progress.resolvedItems,
              ...progress.closingResolvedItems,
            ]),
            [],
          ],
        );
        return;
      }
      await this.streamSvc.streamText(
        res,
        responseText,
        { stageChanged: false, wasFill, fillAnswer },
        language,
      );
      return;
    }

    // Current NFR dimension group: holistic eval + per-item followups via handleGroupTurn.
    const dimension = data.nfr_dimensions[progress.dimensionIndex];

    const { responseText, updatedProgress, done, wasFill, fillAnswer } =
      await this.groupTurn.handleGroupTurn(
        'PHASE_2_NFR',
        candidateAnswer,
        progress.group,
        progress.resolvedItems,
        progress.fillEvents,
        dimension.expected_reasoning,
        dimension.question,
        dimension.expected_result,
        dimension.key,
        language,
      );

    progress = {
      ...progress,
      group: updatedProgress.group,
      resolvedItems: updatedProgress.resolvedItems,
      fillEvents: updatedProgress.fillEvents,
    };

    // Dimension fully resolved → acknowledge and move to the next dimension, or start closing.
    if (done) {
      const ack = this.responder.buildAcknowledgment(dimension.key);
      const nextDimIdx = progress.dimensionIndex + 1;

      if (nextDimIdx < data.nfr_dimensions.length) {
        const nextDim = data.nfr_dimensions[nextDimIdx];
        progress = {
          ...progress,
          dimensionIndex: nextDimIdx,
          group: this.groupTurn.initGroupState(),
        };
        await this.sessions.updatePhaseProgress(session.id, {
          phase2Progress: progress,
        });
        const text = this.phaseTransition.joinText(
          responseText,
          ack,
          nextDim.question,
        );
        await this.streamSvc.streamText(
          res,
          text,
          { stageChanged: false, wasFill: false },
          language,
        );
        return;
      }

      progress = {
        ...progress,
        closingStarted: true,
        closing: this.groupTurn.initGroupState(),
      };
      await this.sessions.updatePhaseProgress(session.id, {
        phase2Progress: progress,
      });
      const text = this.phaseTransition.joinText(
        responseText,
        ack,
        data.closing.question,
      );
      await this.streamSvc.streamText(
        res,
        text,
        { stageChanged: false, wasFill: false },
        language,
      );
      return;
    }

    await this.sessions.updatePhaseProgress(session.id, {
      phase2Progress: progress,
    });
    await this.streamSvc.streamText(
      res,
      responseText,
      { stageChanged: false, wasFill, fillAnswer },
      language,
    );
  }
}
