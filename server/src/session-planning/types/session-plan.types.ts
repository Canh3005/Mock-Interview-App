import type {
  QuestionProbeStage,
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeCompetency,
} from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbe } from '../../question-bank/entities/question-probe.entity';
import type { CandidateClaim } from '../../documents/entities/candidate-claim.entity';
import type { RiskHypothesis } from '../../documents/entities/risk-hypothesis.entity';

export type InterviewDepth = 'broad' | 'deep';
export type StagePriority = 'must_include' | 'nice_to_include';
export type FallbackTrigger =
  | 'no_relevant_story'
  | 'story_exhausted'
  | 'time_overrun'
  | 'low_evidence_yield';
export type PersonaTone =
  | 'friendly'
  | 'neutral'
  | 'skeptical'
  | 'silent'
  | 'detail_oriented';
export interface PersonaPolicy {
  name: string;
  tone: PersonaTone;
}

export interface PressureProfile {
  level: 'low' | 'medium' | 'high';
  maxChallengesPerProbe: number;
}

export interface PlannedProbe {
  questionProbeId: string;
  questionProbeRevision: number;
  plannedOrder: number;
  selectionScore: number;
  selectionReason: string;
  estimatedMinutes: number;
  isFallbackFor?: string;
  fallbackTrigger?: FallbackTrigger;
}

export interface StageProbeAllocation {
  stage: QuestionProbeStage;
  priority: StagePriority;
  allocatedMinutes: number;
  selectedProbes: PlannedProbe[];
  fallbackProbes: PlannedProbe[];
}

export interface ProbeSelectionContext {
  probes: QuestionProbe[];
  depth: InterviewDepth;
  durationMinutes: number;
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
  language: QuestionProbeLanguage;
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Record<string, number>;
  riskHypotheses: RiskHypothesis[];
  candidateClaims: CandidateClaim[];
  cvTechStack: string[];
  jdTechStack: string[];
  selectionSeed: string;
  recentlyUsedProbeIds: string[];
}

export interface BehavioralScoringParams {
  probe: QuestionProbe;
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Record<string, number>;
  riskHypotheses: RiskHypothesis[];
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
}

export interface TechnicalScoringParams {
  probe: QuestionProbe;
  cvTechStack: string[];
  jdTechStack: string[];
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
}

export interface CvScoringParams {
  probe: QuestionProbe;
  candidateClaims: CandidateClaim[];
  cvTechStack: string[];
  jdTechStack: string[];
  targetLevel: QuestionProbeLevel;
  roleFamily: QuestionProbeRoleFamily;
}
