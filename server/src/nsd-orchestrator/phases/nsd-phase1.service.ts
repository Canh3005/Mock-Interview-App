import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { NSDSessionService } from '../../nsd-session/nsd-session.service';
import { NSDResponderService } from '../services/nsd-responder.service';
import { NSDStreamService } from '../services/nsd-stream.service';
import { NSDGroupTurnService } from '../services/nsd-group-turn.service';
import { NSDPhaseTransitionService } from '../services/nsd-phase-transition.service';
import type { NSDPhase1Progress } from '../types/nsd.types';
import type { NSDSession } from '../../nsd-session/entities/nsd-session.entity';
import type { NSDProblem } from '../../nsd-problem/entities/nsd-problem.entity';

/**
 * Phase 1 (Functional Requirements) turn handler.
 * Flow: opening → loop over data.features[] (each via groupTurn.handleGroupTurn) → closing → transition to Phase 2.
 */
@Injectable()
export class NSDPhase1Service {
  constructor(
    private readonly sessions: NSDSessionService,
    private readonly responder: NSDResponderService,
    private readonly streamSvc: NSDStreamService,
    private readonly groupTurn: NSDGroupTurnService,
    private readonly phaseTransition: NSDPhaseTransitionService,
  ) {}

  initProgress(): NSDPhase1Progress {
    return {
      openingDone: false,
      featureIndex: 0,
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
    const data = problem.phase1Data!;
    const language = this.streamSvc.getLanguage(session);
    let progress: NSDPhase1Progress =
      session.phase1Progress ?? this.initProgress();

    // Opening turn: user just answered opening question → send system facts + first feature question
    if (!progress.openingDone) {
      progress = { ...progress, openingDone: true };
      await this.sessions.updatePhaseProgress(session.id, {
        phase1Progress: progress,
      });
      const text = this.responder.buildPhase1SystemFactsAndFirstFeature(data);
      await this.streamSvc.streamText(
        res,
        text,
        { stageChanged: false, wasFill: false },
        language,
      );
      return;
    }

    // Closing group: all features done, now resolving data.closing.red_flags.
    // Once handleGroupTurn reports done → transition to Phase 2.
    if (progress.closingStarted) {
      const { responseText, updatedProgress, done, wasFill, fillAnswer } =
        await this.groupTurn.handleGroupTurn(
          'PHASE_1_FR',
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
        phase1Progress: progress,
      });
      if (done) {
        await this.phaseTransition.advanceToNextPhase(
          session.id,
          'PHASE_1_FR',
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

    // Current feature group: holistic eval + per-item followups via handleGroupTurn.
    const feature = data.features[progress.featureIndex];

    const { responseText, updatedProgress, done, wasFill, fillAnswer } =
      await this.groupTurn.handleGroupTurn(
        'PHASE_1_FR',
        candidateAnswer,
        progress.group,
        progress.resolvedItems,
        progress.fillEvents,
        feature.expected_constraints,
        feature.question,
        feature.expected_result,
        feature.name,
        language,
      );
    progress = {
      ...progress,
      group: updatedProgress.group,
      resolvedItems: updatedProgress.resolvedItems,
      fillEvents: updatedProgress.fillEvents,
    };

    // Feature fully resolved → acknowledge and move to the next feature, or start closing.
    if (done) {
      const ack = this.responder.buildAcknowledgment(
        `yêu cầu của tính năng ${feature.name}`,
      );
      const nextFeatureIndex = progress.featureIndex + 1;

      if (nextFeatureIndex < data.features.length) {
        const nextFeature = data.features[nextFeatureIndex];
        progress = {
          ...progress,
          featureIndex: nextFeatureIndex,
          group: this.groupTurn.initGroupState(),
        };
        await this.sessions.updatePhaseProgress(session.id, {
          phase1Progress: progress,
        });
        const text = this.phaseTransition.joinText(
          responseText,
          ack,
          nextFeature.question,
        );
        await this.streamSvc.streamText(
          res,
          text,
          { stageChanged: false, wasFill: false },
          language,
        );
        return;
      }

      // All features done — start closing
      progress = {
        ...progress,
        closingStarted: true,
        closing: this.groupTurn.initGroupState(),
      };
      await this.sessions.updatePhaseProgress(session.id, {
        phase1Progress: progress,
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
      phase1Progress: progress,
    });
    await this.streamSvc.streamText(
      res,
      responseText,
      { stageChanged: false, wasFill, fillAnswer },
      language,
    );
  }
}
