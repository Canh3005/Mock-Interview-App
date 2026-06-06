import type {
  QuestionProbeCompetency,
  QuestionProbeLevel,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';
import type {
  InterviewDepth,
  StagePriority,
} from '../types/session-plan.types';

export const STAGE_5_BASE_PRIORITIES: QuestionProbeCompetency[] = [
  'conflict_handling',
  'collaboration',
  'communication',
  'impact_measurement',
];

export const STAGE_5_SOFT_SKILL_POOL: QuestionProbeCompetency[] = [
  'conflict_handling',
  'collaboration',
  'communication',
  'impact_measurement',
  'ownership',
  'learning_agility',
];

export const STAGE_3_DOMAIN_COMPETENCIES: QuestionProbeCompetency[] = [
  'system_thinking',
  'trade_off_analysis',
  'problem_solving',
  'impact_measurement',
  'communication',
];

export const STAGE_PRIORITIES: Record<QuestionProbeStage, StagePriority> = {
  stage_1_culture_fit: 'must_include',
  stage_2_tech_stack: 'must_include',
  stage_3_domain_knowledge: 'must_include',
  stage_4_cv_deep_dive: 'nice_to_include',
  stage_5_soft_skills: 'must_include',
  stage_6_reverse_interview: 'nice_to_include',
};

export const PROBE_COUNTS: Record<
  QuestionProbeStage,
  Record<InterviewDepth, number>
> = {
  stage_1_culture_fit: { broad: 1, deep: 1 },
  stage_2_tech_stack: { broad: 8, deep: 10 },
  stage_3_domain_knowledge: { broad: 6, deep: 8 },
  stage_4_cv_deep_dive: { broad: 2, deep: 3 },
  stage_5_soft_skills: { broad: 2, deep: 1 },
  stage_6_reverse_interview: { broad: 1, deep: 1 },
};

export const RISK_SEVERITY_SCORES: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
};

export const CLAIM_PRIORITY_WEIGHTS: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

export const DIFFICULTY_RANGES: Record<QuestionProbeLevel, [number, number]> = {
  junior: [1, 2],
  mid: [2, 3],
  senior: [3, 4],
};

export const ORDERED_STAGES: QuestionProbeStage[] = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_4_cv_deep_dive',
  'stage_5_soft_skills',
  'stage_6_reverse_interview',
];

export const TOP_K_MULTIPLIER = 2;

export const RECENT_PROBE_SCORE_PENALTY = 0.3;

export const STAGE_3_TYPE_BONUS: Record<string, number> = {
  situational: 0.08,
  trade_off: 0.07,
  debugging: 0.07,
};

export const STAGE_3_COMPETENCY_BONUS: Partial<
  Record<QuestionProbeCompetency, number>
> = {
  system_thinking: 0.06,
  trade_off_analysis: 0.05,
  problem_solving: 0.05,
  impact_measurement: 0.04,
  communication: 0.03,
};

export const STAGE_3_THEME_TAGS: Record<string, string[]> = {
  api_design: [
    'api',
    'api_design',
    'rest',
    'routing',
    'graphql',
    'grpc',
    'http',
  ],
  auth_security: [
    'auth',
    'authentication',
    'authorization',
    'jwt',
    'oauth',
    'security',
  ],
  data_consistency: [
    'consistency',
    'transaction',
    'postgresql',
    'mysql',
    'mongodb',
    'database',
  ],
  performance_scalability: [
    'performance',
    'scalability',
    'cache',
    'caching',
    'redis',
    'rate_limit',
    'rate-limiting',
  ],
  production_debugging: ['debugging', 'incident', 'logging', 'observability'],
  reliability_rollout: ['reliability', 'rollout', 'rollback', 'migration'],
};
