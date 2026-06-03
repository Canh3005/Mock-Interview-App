import type {
  ProbeCvClaimResult,
  ProbeRedFlagResult,
  ProbeSignalResult,
} from '../../question-bank/types/question-practice-scoring.types';
import type { QuestionProbeStage } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { OverallBand } from '../../question-bank/types/question-practice-scoring.types';
import type { ProbeCloseReason } from './behavior-session.types';
import type { MultimodalScore } from '../../combat/types/multimodal.types';

export type ReadinessBand =
  | 'ready'
  | 'almost_ready'
  | 'needs_practice'
  | 'not_ready';

export type ProbeResilienceResult = 'resilient' | 'collapsed' | 'unchallenged';

export type ConsistencyFlagType =
  | 'must_include_stage_skipped'
  | 'no_story_for_probe'
  | 'high_risk_low_signal'
  | 'all_probes_unchallenged';

export interface ProbeAuditEntry {
  questionProbeId: string;
  stage: QuestionProbeStage;
  stageLabel: string;
  primaryQuestion: string;
  band: OverallBand;
  score: number;
  scoreContribution: number;
  candidateTurnCount: number;
  challengeCount: number;
  followUpCount: number;
  closeReason: ProbeCloseReason;
  isFallback: boolean;
  candidateAnswerQuotes: string[];
  followUpReasons: string[];
  signalResults: ProbeSignalResult[];
  redFlags: ProbeRedFlagResult[];
  cvClaimResults: ProbeCvClaimResult[];
  improvementSuggestions: string[];
  summary: string;
}

export interface ProbeResilienceEntry {
  questionProbeId: string;
  challengeCount: number;
  finalBand: OverallBand;
  result: ProbeResilienceResult;
}

export interface ProbeResilienceSummary {
  entries: ProbeResilienceEntry[];
  challengedProbeCount: number;
  resilientCount: number;
  collapsedCount: number;
  resilienceScore: number;
}

export interface CompetencyScoreEntry {
  competencyKey: string;
  label: string;
  probeCount: number;
  avgSignalCoverageRatio: number;
  score: number;
}

export interface SessionRiskSummary {
  totalRedFlagsPresent: number;
  presentFlagKeys: string[];
  cvClaimInflatedCount: number;
  cvClaimNotVerifiedCount: number;
  riskPenalty: number;
}

export interface CommunicationSummary {
  genericAnswerCount: number;
  avgRedFlagRate: number;
  score: number;
}

export interface ConsistencyFlag {
  type: ConsistencyFlagType;
  affectedProbeId?: string;
  affectedStage?: QuestionProbeStage;
  detail: string;
}

export interface ConsistencyCheck {
  flags: ConsistencyFlag[];
  hasHighRiskPattern: boolean;
  hasCoverageGap: boolean;
}

export interface ReadinessSummary {
  competencyAggregate: number;
  resilienceScore: number;
  communicationScore: number;
  riskPenalty: number;
  riskMultiplier: number;
  subTotal: number;
  finalScore: number;
  band: ReadinessBand;
}

export interface BehaviorScorecardData {
  scorecardVersion: '1.0';
  sessionId: string;
  synthesizedAt: string;
  probeAuditTrail: ProbeAuditEntry[];
  probeResilience: ProbeResilienceSummary;
  competencyScores: CompetencyScoreEntry[];
  riskSummary: SessionRiskSummary;
  communication: CommunicationSummary;
  consistencyCheck: ConsistencyCheck;
  readiness: ReadinessSummary;
  stagesCompleted: QuestionProbeStage[];
  stagesSkipped: QuestionProbeStage[];
  /** Combat mode only — phân tích multimodal (eye/filler/expression/pace) toàn phiên. */
  multimodal?: MultimodalScore;
  /** Combat mode only — điểm liêm chính + timeline proctoring. */
  integrity?: Record<string, unknown>;
}
