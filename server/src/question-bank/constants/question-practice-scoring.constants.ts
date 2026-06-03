import { z } from 'zod';

export const QUESTION_PRACTICE_SCORING_VERSION = 'probe-aware-v1';

export const MIN_EVALUABLE_CHARS = 80;

export const LONG_ANSWER_CHARS = 8000;

export const MAX_CONTEXT_CHARS = 16000;

export const NarrativeSchema = z.object({
  summary: z.string().min(1),
  improvementSuggestions: z.array(z.string().min(1)).min(1).max(5),
});
