export type RequirementSource =
  | 'required_skill'
  | 'nice_to_have_skill'
  | 'responsibility'
  | 'experience'
  | 'domain';

export type RequirementPriority = 'must_have' | 'nice_to_have' | 'context';
export type WeightHint = 'high' | 'medium' | 'low';
export type CoverageStatus = 'met' | 'partial' | 'missing' | 'unclear';
export type EvidenceStrength = 'strong' | 'weak' | 'none';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type GapCategory =
  | 'missing_required_skill'
  | 'weak_evidence'
  | 'level_mismatch'
  | 'transferable_not_direct';

export interface NormalizedJdRequirement {
  id: string;
  text: string;
  source: RequirementSource;
  priority: RequirementPriority;
  weightHint: WeightHint;
}

export interface FitRequirementSignal {
  requirementId: string;
  requirement: string;
  source: RequirementSource;
  status: CoverageStatus;
  evidenceStrength: EvidenceStrength;
  cvEvidence: string[];
  rationale: string;
}

export interface FitGap {
  category: GapCategory;
  label: string;
  severity: 'high' | 'medium' | 'low';
  relatedRequirement: string;
  explanation: string;
  practiceSuggestion?: string;
}

export interface FitRiskFlag {
  code:
    | 'insufficient_cv_detail'
    | 'seniority_mismatch'
    | 'missing_core_stack'
    | 'domain_gap'
    | 'ambiguous_timeline';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface FitRubricEvaluation {
  confidence: ConfidenceLevel;
  requirementSignals: FitRequirementSignal[];
  gaps: FitGap[];
  riskFlags: FitRiskFlag[];
  userSummary: {
    headline: string;
    strengths: string[];
    gapsToImprove: string[];
    transferableNotes: string[];
  };
}

export interface FitScoreBreakdown {
  mustHaveSkillCoverage: number;
  niceToHaveCoverage: number;
  experienceLevelFit: number;
  roleResponsibilityFit: number;
  domainFit: number;
  evidenceQuality: number;
  transferableExperience: number;
  riskPenalty: number;
}

export interface FitAssessmentV2 extends FitRubricEvaluation {
  scoringVersion: 'fit-assessment-v2.0.0';
  model: string;
  createdAt: string;
  normalizedRequirements: NormalizedJdRequirement[];
  scoreBreakdown: FitScoreBreakdown;
  finalScore: number;
}

export interface GroupedFitGaps {
  missingRequiredSkills: FitGap[];
  weakEvidence: FitGap[];
  levelMismatch: FitGap[];
  transferableButNotDirect: FitGap[];
}

export interface FitAssessmentSummary {
  confidence: ConfidenceLevel;
  headline: string;
  scoreBreakdown: FitScoreBreakdown;
  riskFlags: FitRiskFlag[];
  groupedGaps: GroupedFitGaps;
  strengths: string[];
  gapsToImprove: string[];
  transferableNotes: string[];
}

export interface LegacyMatchReport {
  missing_skills: string[];
  suggestions: string[];
}
