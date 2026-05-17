import type { QuestionProbeCompetency } from '../../question-bank/constants/question-bank-taxonomy.constants';

// ─── Calibration path ────────────────────────────────────────────────────────

export type CalibrationPath = 'cv_only' | 'jd_only' | 'full';

export type CalibrationStatus = 'partial' | 'ready' | 'failed';

export type EvidenceStrictness = 'standard' | 'strict' | 'very_strict';

// ─── Source completeness ─────────────────────────────────────────────────────

export interface SourceCompleteness {
  hasCv: boolean;
  hasJd: boolean;
  hasProfile: boolean;
  hasWeaknessHistory: boolean;
}

// ─── BC-3 output — claim mining (LLM) ────────────────────────────────────────

export type ClaimType =
  | 'led_team'
  | 'owned_feature'
  | 'improved_metric'
  | 'handled_incident'
  | 'cross_functional'
  | 'mentored'
  | 'conflict'
  | 'failure'
  | 'domain_experience';

export type ClaimSourceType = 'cv' | 'jd' | 'profile' | 'history';

export type VerificationPriority = 'low' | 'medium' | 'high';

export interface RawCandidateClaim {
  sourceType: ClaimSourceType;
  sourceRef: {
    section: string;
    textHash?: string;
  };
  claimType: ClaimType;
  claimText: string;
  normalizedClaim: string;
  impliedCompetencies: string[];
  evidenceHints: string[];
  techContext: string[];
  riskTags: string[];
}

export interface ClaimMiningOutput {
  miningConfidence: 'high' | 'medium' | 'low';
  claims: RawCandidateClaim[];
  unmappedSignals: string[];
}

// ─── BC-4a output — seeded risks (deterministic) ─────────────────────────────

export type HiringRiskType =
  | 'level_mismatch'
  | 'claim_without_evidence'
  | 'weak_technical_depth'
  | 'unclear_scope'
  | 'overstated_ownership'
  | 'missing_business_impact'
  | 'weak_conflict_handling'
  | 'generic_answering'
  | 'poor_tradeoff_reasoning'
  | 'low_learning_agility'
  | 'communication_gap';

export type RiskSeverity = 'low' | 'medium' | 'high';

export interface SeededRisk {
  riskType: HiringRiskType;
  severity: RiskSeverity;
  sourceRef: {
    fitAssessmentField: 'gaps' | 'riskFlags' | 'claim_tags';
    originalCategory: string;
  };
  rationale: string;
  relatedRequirement?: string;
}

// ─── BC-4b output — behavioral risks (LLM) ───────────────────────────────────

export type BehavioralRiskType =
  | 'overstated_ownership'
  | 'missing_business_impact'
  | 'weak_conflict_handling'
  | 'generic_answering'
  | 'poor_tradeoff_reasoning'
  | 'low_learning_agility'
  | 'communication_gap';

export interface RawBehavioralRisk {
  riskType: BehavioralRiskType;
  candidateClaimRef?: string;
  rationale: string;
  relatedCompetencies: string[];
  suggestedProbeFocus: string[];
}

export interface BehavioralRiskOutput {
  hypotheses: RawBehavioralRisk[];
  priorityCompetencies: string[];
  calibrationNotes: string[];
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
    missingDataWarning?: string;
  };
}

// ─── BC-5 output — calibration profile (deterministic) ───────────────────────

export interface LevelExpectation {
  level: string;
  mustHaveSignals: string[];
  dealBreakers: string[];
  depthRequirement: string;
}

export interface BehaviorCalibrationProfileData {
  status: CalibrationStatus;
  sourceCompleteness: SourceCompleteness;
  roleFamily: string;
  targetRole: string;
  targetLevel: string;
  profileLevel: string;
  levelMismatch: boolean;
  levelExpectations: LevelExpectation[];
  priorityCompetencies: QuestionProbeCompetency[];
  competencyWeights: Partial<Record<QuestionProbeCompetency, number>>;
  previousWeakCompetencies: QuestionProbeCompetency[];
  evidenceStrictness: EvidenceStrictness;
  calibrationNotes: string[];
  cvTechStack: string[];
  jdTechRequirements: string[];
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
    missingDataWarning?: string;
    levelMismatchWarning?: string;
  };
  internalVersion: 'behavior-calibration-v1';
}

// ─── Calibration summary for FE / interview preflight ────────────────────────

export interface BehaviorCalibrationSummary {
  status: CalibrationStatus;
  levelMismatch: boolean;
  priorityCompetencies: QuestionProbeCompetency[];
  evidenceStrictness: EvidenceStrictness;
  userFacingSummary: BehaviorCalibrationProfileData['userFacingSummary'];
  missingSources: string[];
}
