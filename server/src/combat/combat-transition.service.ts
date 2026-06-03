import { Injectable } from '@nestjs/common';
import {
  MAX_TURNS,
  STAGE_TIME_ALLOCATION,
  TRANSITION_PHRASES,
} from './constants/combat-transition.constants';
import type {
  TransitionDecision,
  TransitionReason,
} from './types/combat-transition.types';

@Injectable()
export class CombatTransitionService {
  getStageBudget(stage: number, totalBudgetMs: number): number {
    return Math.floor(totalBudgetMs * (STAGE_TIME_ALLOCATION[stage] ?? 0.15));
  }

  evaluateTransition(
    candidateLevel: string,
    currentStage: number,
    stageMetrics: {
      turnsInStage: number;
      stageElapsedMs: number;
      timeBudgetMs: number;
      drillDepth: number;
      lastResponseQuality: 'deep' | 'adequate' | 'shallow';
      offTopicCount: number;
    },
  ): TransitionDecision {
    const {
      turnsInStage,
      stageElapsedMs,
      timeBudgetMs,
      drillDepth,
      lastResponseQuality,
      offTopicCount,
    } = stageMetrics;

    const maxTurns = MAX_TURNS[candidateLevel] ?? 4;
    const nextStage = currentStage < 6 ? currentStage + 1 : undefined;

    if (stageElapsedMs >= timeBudgetMs) {
      return {
        shouldTransition: true,
        reason: 'TIME_BUDGET_EXCEEDED',
        nextStage,
        transitionPhrase: this.pickPhrase('TIME_BUDGET_EXCEEDED'),
      };
    }
    if (turnsInStage >= maxTurns) {
      return {
        shouldTransition: true,
        reason: 'MAX_TURNS_REACHED',
        nextStage,
        transitionPhrase: this.pickPhrase('MAX_TURNS_REACHED'),
      };
    }
    if (offTopicCount >= 3) {
      return {
        shouldTransition: true,
        reason: 'OFF_TOPIC_PERSISTENT',
        nextStage,
        transitionPhrase: this.pickPhrase('OFF_TOPIC_PERSISTENT'),
      };
    }
    if (drillDepth >= 3 && lastResponseQuality === 'shallow') {
      return {
        shouldTransition: true,
        reason: 'CANDIDATE_CEILING',
        nextStage,
        transitionPhrase: this.pickPhrase('CANDIDATE_CEILING'),
      };
    }

    return { shouldTransition: false };
  }

  private pickPhrase(reason: TransitionReason): string {
    const phrases = TRANSITION_PHRASES[reason];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}
