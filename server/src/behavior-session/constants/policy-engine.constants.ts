import type { QuestionProbeLevel } from '../../question-bank/constants/question-bank-taxonomy.constants';

export const MAX_REDIRECTS_PER_PROBE = 1;

export const MAX_FOLLOW_UPS_PER_LEVEL: Record<QuestionProbeLevel, number> = {
  junior: 1,
  mid: 2,
  senior: 3,
};

export const MAX_TURNS_PER_PROBE: Record<QuestionProbeLevel, number> = {
  junior: 2,
  mid: 3,
  senior: 4,
};
