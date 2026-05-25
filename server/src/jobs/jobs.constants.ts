export const DOCUMENT_PARSING_QUEUE =
  process.env.DOCUMENT_PARSING_QUEUE || 'document-parsing';

export const DSA_DEBRIEF_QUEUE = process.env.DSA_DEBRIEF_QUEUE || 'dsa-debrief';

export const DsaDebriefJobName = {
  DEBRIEF_SESSION: 'debrief-session',
} as const;

export const SD_EVALUATION_QUEUE =
  process.env.SD_EVALUATION_QUEUE || 'sd-evaluation';

export const SdEvaluationJobName = {
  EVALUATE_SESSION: 'evaluate-session',
} as const;

export const QUESTION_PRACTICE_SCORING_QUEUE =
  process.env.QUESTION_PRACTICE_SCORING_QUEUE || 'question-practice-scoring';

export const QuestionPracticeScoringJobName = {
  SCORE_ATTEMPT: 'score-question-practice-attempt',
} as const;

export const BEHAVIOR_SCORING_QUEUE =
  process.env.BEHAVIOR_SCORING_QUEUE || 'behavior-scoring';

export const BehaviorScoringJobName = {
  SCORE_SESSION: 'score-behavior-session',
} as const;
