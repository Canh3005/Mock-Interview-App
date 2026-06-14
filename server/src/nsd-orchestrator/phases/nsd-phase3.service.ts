import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDResponderService } from '../services/nsd-responder.service';
import { NSDStreamService } from '../services/nsd-stream.service';
import { NSDGroupTurnService } from '../services/nsd-group-turn.service';
import { NSDPhaseTransitionService } from '../services/nsd-phase-transition.service';
import type { NSDPhase3Progress } from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';

/**
 * Phase 3 (Scale Estimation) turn handler.
 * Same shape as Phase 1/2, but loops over data.scale_dimensions[].
 * Closing transitions into Phase 4 (no opening question to forward — canvas-based).
 */
@Injectable()
export class NSDPhase3Service {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly responder: NSDResponderService,
    private readonly streamSvc: NSDStreamService,
    private readonly groupTurn: NSDGroupTurnService,
    private readonly phaseTransition: NSDPhaseTransitionService,
  ) {}

  initProgress(): NSDPhase3Progress {
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
    const data = problem.phase3Data!;
    const language = this.streamSvc.getLanguage(session);
    let progress: NSDPhase3Progress =
      session.phase3Progress ?? this.initProgress();

    // Opening turn: send provided numbers + first dimension's question.
    if (!progress.openingDone) {
      progress = { ...progress, openingDone: true };
      await this.sessions.updatePhaseProgress(session.id, {
        phase3Progress: progress,
      });
      const text = this.responder.buildPhase3ContextAndFirstDimension(data);
      await this.streamSvc.streamText(
        res,
        text,
        { stageChanged: false, wasFill: false },
        language,
      );
      return;
    }

    // Closing group: all dimensions done, now resolving data.closing.red_flags.
    // Once handleGroupTurn reports done → transition to Phase 4 (canvas-based, no opening question).
    if (progress.closingStarted) {
      const { responseText, updatedProgress, done, wasFill, fillAnswer } =
        await this.groupTurn.handleGroupTurn(
          'PHASE_3_SCALE',
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
        phase3Progress: progress,
      });
      if (done) {
        await this.phaseTransition.advanceToNextPhase(
          session.id,
          'PHASE_3_SCALE',
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

    // Current scale dimension group: holistic eval + per-item followups via handleGroupTurn.
    const dimension = data.scale_dimensions[progress.dimensionIndex];

    const { responseText, updatedProgress, done, wasFill, fillAnswer } =
      await this.groupTurn.handleGroupTurn(
        'PHASE_3_SCALE',
        candidateAnswer,
        progress.group,
        progress.resolvedItems,
        progress.fillEvents,
        dimension.expected_elements,
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

      if (nextDimIdx < data.scale_dimensions.length) {
        const nextDim = data.scale_dimensions[nextDimIdx];
        progress = {
          ...progress,
          dimensionIndex: nextDimIdx,
          group: this.groupTurn.initGroupState(),
        };
        await this.sessions.updatePhaseProgress(session.id, {
          phase3Progress: progress,
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
        phase3Progress: progress,
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
      phase3Progress: progress,
    });
    await this.streamSvc.streamText(
      res,
      responseText,
      { stageChanged: false, wasFill, fillAnswer },
      language,
    );
  }
}
