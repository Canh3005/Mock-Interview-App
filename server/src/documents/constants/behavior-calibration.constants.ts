import { QUESTION_BANK_TAXONOMY } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbeCompetency } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type {
  HiringRiskType,
  RiskSeverity,
} from '../types/behavior-calibration.types';
import type {
  LevelExpectationEntry,
  LevelKey,
} from '../types/behavior-calibration-internal.types';

export const VALID_COMPETENCIES = new Set<string>(
  QUESTION_BANK_TAXONOMY.competencies.map((c) => c.key),
);

export const ALL_TECH_TAGS = new Set<string>(
  QUESTION_BANK_TAXONOMY.techTagGroups.flatMap((g) => g.tags),
);

export const FIT_GAP_TO_RISK: Record<string, HiringRiskType> = {
  level_mismatch: 'level_mismatch',
  weak_evidence: 'claim_without_evidence',
};

export const FIT_FLAG_TO_RISK: Record<string, HiringRiskType> = {
  seniority_mismatch: 'level_mismatch',
  missing_core_stack: 'weak_technical_depth',
  ambiguous_timeline: 'unclear_scope',
};

export const BEHAVIORAL_RISK_DEFAULT_SEVERITY: Record<string, RiskSeverity> = {
  overstated_ownership: 'medium',
  missing_business_impact: 'medium',
  weak_conflict_handling: 'low',
  generic_answering: 'low',
  poor_tradeoff_reasoning: 'medium',
  low_learning_agility: 'low',
  communication_gap: 'low',
};

export const RISK_TAG_TO_TYPE: Record<string, HiringRiskType> = {
  vague_ownership: 'overstated_ownership',
  no_metric: 'missing_business_impact',
  no_scope: 'claim_without_evidence',
  no_conflict_depth: 'weak_conflict_handling',
  generic: 'generic_answering',
  no_impact: 'missing_business_impact',
};

export const RISK_TYPE_TO_COMPETENCIES: Record<
  HiringRiskType,
  QuestionProbeCompetency[]
> = {
  level_mismatch: ['ownership', 'system_thinking', 'trade_off_analysis'],
  claim_without_evidence: ['impact_measurement', 'ownership'],
  weak_technical_depth: ['technical_fundamentals', 'trade_off_analysis'],
  unclear_scope: ['ownership', 'problem_solving'],
  overstated_ownership: ['ownership', 'collaboration'],
  missing_business_impact: ['impact_measurement', 'problem_solving'],
  weak_conflict_handling: ['conflict_handling', 'communication'],
  generic_answering: ['communication', 'problem_solving'],
  poor_tradeoff_reasoning: ['trade_off_analysis', 'system_thinking'],
  low_learning_agility: ['learning_agility'],
  communication_gap: ['communication'],
};

export const CLAIM_COUNT_READY_THRESHOLD = 3;
export const COVERAGE_SCORE_READY_THRESHOLD = 0.5;
export const MIN_PRIORITY_COMPETENCIES = 2;

export const LEVEL_EXPECTATION_MAP: Record<LevelKey, LevelExpectationEntry> = {
  junior: {
    mustHaveSignals: [
      'Delivers assigned tasks with clear scope',
      'Explains their approach when asked',
      'Asks for help proactively before getting blocked',
      'Receptive to code review feedback',
      'Shows curiosity and willingness to learn',
    ],
    dealBreakers: [
      'Cannot explain basic technical concepts in their stack',
      'Resists or dismisses feedback',
      'Struggles to complete a well-defined task independently',
    ],
    depthRequirement:
      'Demonstrates foundational skills and learning agility. Depth expected on their primary tech stack at task level.',
  },
  mid: {
    mustHaveSignals: [
      'Owns features end-to-end without close supervision',
      'Identifies edge cases and raises them proactively',
      'Collaborates cross-functionally without hand-holding',
      'Can break down ambiguous requirements into deliverable tasks',
      'Makes local technical decisions with clear rationale',
    ],
    dealBreakers: [
      'Needs constant direction on well-understood problems',
      'Cannot prioritize or scope their own work',
      'Avoids taking ownership when things go wrong',
    ],
    depthRequirement:
      'Expected to own features independently, handle moderate ambiguity, and show initiative in improving the codebase.',
  },
  senior: {
    mustHaveSignals: [
      'Drives technical decisions and defends them with tradeoffs',
      'Influences stakeholders and aligns cross-functional teams',
      'Mentors or unblocks junior and mid-level engineers',
      'Delivers measurable business or system-level impact',
      'Handles high-ambiguity problems with structured approach',
      'Proactively identifies systemic risks or opportunities',
    ],
    dealBreakers: [
      'Cannot make decisions independently under ambiguity',
      'No evidence of leading or influencing others beyond their immediate team',
      'Works in isolation, does not share knowledge',
      'Impact limited to individual tasks, not system or team level',
    ],
    depthRequirement:
      'Expected to operate at system and team scope. Impact should be demonstrable beyond individual features. Leadership and mentoring are required signals.',
  },
};
