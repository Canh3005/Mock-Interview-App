import type {
  CoverageStatus,
  EvidenceStrength,
  FitRequirementSignal,
  NormalizedJdRequirement,
} from './fit-assessment.types';
import type { Seniority } from './document-ai.types';

export type FitEvidenceSource =
  | 'skills'
  | 'experience.techStack'
  | 'experience.responsibility'
  | 'experience.achievement'
  | 'experience.title'
  | 'domain'
  | 'experience.totalYears'
  | 'experience.seniority';

export interface FitEvidenceItem {
  source: FitEvidenceSource;
  text: string;
  canonicalText: string;
  canonicalSkill?: string;
}

export interface FitEvidenceIndex {
  skillEvidence: Map<string, string[]>;
  listedSkillEvidence: Map<string, string[]>;
  roleSkillEvidence: Map<string, string[]>;
  textEvidence: FitEvidenceItem[];
  domains: string[];
  totalYearsExperience?: number;
  seniority?: Seniority;
  ambiguousTimeline: boolean;
}

export interface RequirementEvidence {
  requirement: NormalizedJdRequirement;
  exactSkillEvidence: string[];
  roleSkillEvidence: string[];
  directEvidence: string[];
  relatedEvidence: string[];
}

export interface FitSemanticRequirementInput {
  requirementId: string;
  requirement: string;
  source: NormalizedJdRequirement['source'];
  priority: NormalizedJdRequirement['priority'];
  deterministicStatus: CoverageStatus;
  deterministicEvidenceStrength: EvidenceStrength;
  evidence: string[];
}

export interface FitSemanticEvaluationInput {
  cvFacts: {
    seniority?: Seniority;
    totalYearsExperience?: number;
    domains: string[];
  };
  jdFacts: {
    role: string;
    seniority?: Seniority;
    minimumExperienceYears?: number;
    domain?: string;
  };
  requirements: FitSemanticRequirementInput[];
  cvEvidencePool: string[];
}

export interface FitSemanticEvaluationResult {
  requirementSignals: FitRequirementSignal[];
}
