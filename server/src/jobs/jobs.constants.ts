export const DOCUMENT_PARSING_QUEUE =
  process.env.DOCUMENT_PARSING_QUEUE || 'document-parsing';

export const BEHAVIORAL_SCORING_QUEUE =
  process.env.BEHAVIORAL_SCORING_QUEUE || 'behavioral-scoring';

export const BehavioralScoringJobName = {
  SCORE_SESSION: 'score-session',
} as const;

export const DSA_DEBRIEF_QUEUE = process.env.DSA_DEBRIEF_QUEUE || 'dsa-debrief';

export const DsaDebriefJobName = {
  DEBRIEF_SESSION: 'debrief-session',
} as const;

export const SD_EVALUATION_QUEUE =
  process.env.SD_EVALUATION_QUEUE || 'sd-evaluation';

export const SdEvaluationJobName = {
  EVALUATE_SESSION: 'evaluate-session',
} as const;
