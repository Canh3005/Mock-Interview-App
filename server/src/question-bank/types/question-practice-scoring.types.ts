import { z } from 'zod';
import type { QuestionProbeFollowUpTrigger } from '../constants/question-bank-taxonomy.constants';

export type SignalStatus = 'covered' | 'unclear' | 'missing';
export type ClaimVerification = 'verified' | 'not_verified' | 'inflated_risk';
export type OverallBand =
  | 'strong'
  | 'solid'
  | 'needs_work'
  | 'insufficient_evidence';
export type ScoringConfidence = 'high' | 'medium' | 'low';
export type CandidateIntent = 'answer' | 'dont_know' | 'clarification_request';
export type QuestionPracticeFailureCode =
  | 'ai_timeout'
  | 'invalid_ai_output'
  | 'queue_failed'
  | 'system_error';

/** Subset của QuestionProbeSignalRequirement dùng ở tầng prompt/scoring — không import từ entity để tránh coupling. */
export interface CatalogItemRequirement {
  key: string;
  description: string;
}

export interface CatalogItem {
  key: string;
  label: string;
  relatedTrigger?: QuestionProbeFollowUpTrigger | null;
  requirements?: CatalogItemRequirement[];
}

/**
 * Shape code build sau khi validate LLM output cho 1 requirement.
 * `description` được code enrich từ signal.requirements[].description theo key — LLM không cung cấp.
 */
export interface ProbeSignalRequirementResult {
  key: string;
  description: string;
  supported: boolean;
  evidenceQuotes: string[];
  feedback: string;
}

export interface ProbeSignalResult {
  key: string;
  status: SignalStatus;
  evidenceQuotes: string[];
  feedback: string;
  relatedTrigger: QuestionProbeFollowUpTrigger | null;
  requirementResults?: ProbeSignalRequirementResult[];
}

export interface ProbeCvClaimResult {
  key?: string;
  claim: string;
  verification: ClaimVerification;
  evidenceQuotes: string[];
  feedback: string;
}

export interface ProbeScoringResult {
  scoringVersion: string;
  overallBand: OverallBand;
  confidence: ScoringConfidence;
  summary: string;
  signalResults: ProbeSignalResult[];
  cvClaimResults?: ProbeCvClaimResult[];
  improvementSuggestions: string[];
  candidateIntent: CandidateIntent;
}

export interface QuestionPracticeAttemptFeedbackResponse {
  attemptId: string;
  probeId: string;
  status:
    | 'pending_feedback'
    | 'processing'
    | 'feedback_ready'
    | 'feedback_failed';
  answerInputType: 'text' | 'voice';
  displayLocale: 'vi' | 'en' | 'ja';
  resolvedQuestionLocale: 'vi' | 'en' | 'ja';
  feedbackLocale: 'vi' | 'en' | 'ja';
  submittedAt: string;
  processingStartedAt?: string | null;
  feedbackReadyAt?: string | null;
  failureCode?: QuestionPracticeFailureCode | null;
  retryable: boolean;
  result?: ProbeScoringResult | null;
}

export const SignalStatusSchema = z.enum(['covered', 'unclear', 'missing']);
export const ClaimVerificationSchema = z.enum([
  'verified',
  'not_verified',
  'inflated_risk',
]);
export const ScoringConfidenceSchema = z.enum(['high', 'medium', 'low']);

export const LlmRequirementExtractionSchema = z.object({
  key: z.string().min(1),
  supported: z.boolean(),
  evidenceQuotes: z.array(z.string()),
  feedback: z.string(),
});

export const LlmSignalExtractionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  // requirement-enabled signals omit status; default 'missing' keeps output type as SignalStatus (not optional)
  status: SignalStatusSchema.optional().default('missing'),
  evidenceQuotes: z.array(z.string()).default([]),
  requirementResults: z.array(LlmRequirementExtractionSchema).optional(),
  feedback: z.string().default(''),
});

export const LlmCvClaimExtractionSchema = z.object({
  key: z.string().optional(),
  // optional vì format mới dùng key thay vì claim; legacy output vẫn có claim
  claim: z.string().optional().default(''),
  verification: ClaimVerificationSchema,
  evidenceQuotes: z.array(z.string()),
  feedback: z.string().min(1),
});

export const CandidateIntentSchema = z
  .enum(['answer', 'dont_know', 'clarification_request'])
  .default('answer');

export const LlmScoringExtractionSchema = z.object({
  candidateIntent: CandidateIntentSchema,
  signals: z.array(LlmSignalExtractionSchema),
  cvClaims: z.array(LlmCvClaimExtractionSchema).optional().default([]),
  confidence: ScoringConfidenceSchema,
});

export type LlmRequirementExtraction = z.infer<
  typeof LlmRequirementExtractionSchema
>;
export type LlmSignalExtraction = z.infer<typeof LlmSignalExtractionSchema>;
export type LlmCvClaimExtraction = z.infer<typeof LlmCvClaimExtractionSchema>;
export type LlmScoringExtraction = z.infer<typeof LlmScoringExtractionSchema>;
