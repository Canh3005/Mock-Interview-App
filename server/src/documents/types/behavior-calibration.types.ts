import type { QuestionProbeCompetency } from '../../question-bank/constants/question-bank-taxonomy.constants';

// ─── Calibration path ────────────────────────────────────────────────────────

export type CalibrationPath = 'cv_only' | 'jd_only' | 'full';

export type CalibrationStatus = 'processing' | 'partial' | 'ready' | 'failed';

export type EvidenceStrictness = 'standard' | 'strict' | 'very_strict';

// ─── Source completeness ─────────────────────────────────────────────────────

export interface SourceCompleteness {
  hasCv: boolean;
  hasJd: boolean;
  hasProfile: boolean;
  hasWeaknessHistory: boolean;
}

// ─── Step 1 — structured claim (deterministic extraction) ────────────────────

export type ClaimType =
  | 'led_team'
  | 'owned_feature'
  | 'improved_metric'
  | 'handled_incident'
  | 'cross_functional'
  | 'mentored'
  | 'conflict'
  | 'failure'
  | 'domain_experience'
  | 'unknown';

export type ClaimSourceType = 'cv' | 'jd' | 'profile' | 'history';

export type VerificationPriority = 'low' | 'medium' | 'high';

export interface StructuredClaim {
  localId: string;
  sourceType: ClaimSourceType;
  sourceRef: { section: string };
  claimType: ClaimType;
  claimText: string;
  techContext: string[];
}

// ─── Step 2 — claim enrichment (LLM) ─────────────────────────────────────────

export interface ClaimEnrichment {
  localId: string;
  claimType: ClaimType;
  impliedCompetencies: QuestionProbeCompetency[];
  riskTags: string[];
  suggestedQuestions: string[];
}

export interface EnrichedClaimOutput {
  enrichments: ClaimEnrichment[];
}

// ─── Merged claim (StructuredClaim + ClaimEnrichment) ────────────────────────

export interface RawCandidateClaim {
  sourceType: ClaimSourceType;
  sourceRef: {
    localId: string;
    section: string;
    textHash?: string;
  };
  claimType: ClaimType;
  claimText: string;
  impliedCompetencies: string[];
  techContext: string[];
  riskTags: string[];
  suggestedQuestions: string[];
}

// ─── Step 3 — seeded risks (deterministic) ───────────────────────────────────

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
  localRiskId: string;
  riskType: HiringRiskType;
  severity: RiskSeverity;
  sourceRef: {
    fitAssessmentField: 'gaps' | 'riskFlags' | 'claim_tags' | 'coverage_gap';
    originalCategory: string;
  };
  rationale: string;
  relatedRequirement?: string;
}

// ─── Step 4 — risk enrichment (LLM) ──────────────────────────────────────────

export interface SeededRiskEnrichment {
  localRiskId: string;
  suggestedProbeFocus: string[];
}

export interface AdditionalRisk {
  riskType: HiringRiskType;
  candidateClaimLocalId: string;
  rationale: string;
  suggestedProbeFocus: string[];
}

export interface RiskEnrichmentOutput {
  seededRiskEnrichments: SeededRiskEnrichment[];
  additionalRisks: AdditionalRisk[];
  userFacingSummary: {
    focusAreas: string[];
    evidenceToPrep: string[];
  };
}

// ─── Step 5 — calibration profile (deterministic) ────────────────────────────

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
