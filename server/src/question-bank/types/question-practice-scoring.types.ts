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

export interface CatalogItem {
  key: string;
  label: string;
  relatedTrigger?: QuestionProbeFollowUpTrigger | null;
}

export interface ProbeSignalResult {
  key: string;
  label: string;
  status: SignalStatus;
  evidenceQuotes: string[];
  feedback: string;
  relatedTrigger: QuestionProbeFollowUpTrigger | null;
}

export interface ProbeRedFlagResult {
  key: string;
  label: string;
  present: boolean;
  evidenceQuotes: string[];
  feedback: string;
}

export interface ProbeCvClaimResult {
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
  redFlags: ProbeRedFlagResult[];
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

export const LlmSignalExtractionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  status: SignalStatusSchema,
  evidenceQuotes: z.array(z.string()),
  feedback: z.string(),
});

export const LlmRedFlagExtractionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  present: z.boolean(),
  evidenceQuotes: z.array(z.string()),
  feedback: z.string(),
});

export const LlmCvClaimExtractionSchema = z.object({
  claim: z.string().min(1),
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
  redFlags: z.array(LlmRedFlagExtractionSchema),
  cvClaims: z.array(LlmCvClaimExtractionSchema).optional().default([]),
  confidence: ScoringConfidenceSchema,
});

export type LlmSignalExtraction = z.infer<typeof LlmSignalExtractionSchema>;
export type LlmRedFlagExtraction = z.infer<typeof LlmRedFlagExtractionSchema>;
export type LlmCvClaimExtraction = z.infer<typeof LlmCvClaimExtractionSchema>;
export type LlmScoringExtraction = z.infer<typeof LlmScoringExtractionSchema>;
