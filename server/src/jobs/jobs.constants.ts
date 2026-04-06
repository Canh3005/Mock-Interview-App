export const DOCUMENT_PARSING_QUEUE =
  process.env.DOCUMENT_PARSING_QUEUE || 'document-parsing';

export const BEHAVIORAL_SCORING_QUEUE =
  process.env.BEHAVIORAL_SCORING_QUEUE || 'behavioral-scoring';

export const BehavioralScoringJobName = {
  SCORE_SESSION: 'score-session',
} as const;
