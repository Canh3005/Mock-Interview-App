import { Injectable } from '@nestjs/common';

export type TransitionReason =
  | 'TIME_BUDGET_EXCEEDED'
  | 'MAX_TURNS_REACHED'
  | 'OFF_TOPIC_PERSISTENT'
  | 'CANDIDATE_CEILING';

export interface TransitionDecision {
  shouldTransition: boolean;
  reason?: TransitionReason;
  nextStage?: number;
  transitionPhrase?: string;
}

const STAGE_TIME_ALLOCATION: Record<number, number> = {
  1: 0.15,
  2: 0.20,
  3: 0.20,
  4: 0.20,
  5: 0.15,
  6: 0.10,
};

const MAX_TURNS: Record<string, number> = {
  junior: 5,
  mid: 4,
  senior: 4,
};

const TRANSITION_PHRASES: Record<TransitionReason, string[]> = {
  TIME_BUDGET_EXCEEDED: [
    'Được rồi, cảm ơn bạn về phần chia sẻ vừa rồi. Bây giờ mình muốn chuyển sang một chủ đề khác nhé.',
    'Rất hay. Mình ghi nhận phần này. Giờ mình sẽ hỏi bạn về một khía cạnh khác.',
  ],
  MAX_TURNS_REACHED: [
    'OK, mình đã nắm được khá rõ về phần này. Chúng ta chuyển tiếp nhé.',
    'Được, mình đã hiểu quan điểm của bạn. Bây giờ chuyển sang chủ đề tiếp theo nhé.',
  ],
  CANDIDATE_CEILING: [
    'Mình hiểu rồi. Chúng ta sẽ chuyển sang phần tiếp theo nhé.',
    'Được, mình đã nắm được quan điểm của bạn. Giờ mình muốn tìm hiểu thêm về một khía cạnh khác.',
  ],
  OFF_TOPIC_PERSISTENT: [
    'Không sao. Mình sẽ chuyển sang một chủ đề khác, có thể sẽ phù hợp hơn với bạn.',
  ],
};

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
