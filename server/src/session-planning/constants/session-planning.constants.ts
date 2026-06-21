import type { QuestionProbeStage } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type {
  InterviewDepth,
  PersonaPolicy,
  PressureProfile,
} from '../types/session-plan.types';

export const OPENING_OVERHEAD_MINUTES = 1;

export const RECENT_SESSION_LOOKBACK = 5;

export const CLOSING_OVERHEAD_MINUTES = 2;

export const MIN_PROBE_MINUTES = 2;

export const MAX_PROBE_MINUTES = 6;

export const STAGE_WEIGHTS: Record<
  QuestionProbeStage,
  Record<InterviewDepth, number>
> = {
  stage_1_culture_fit: { broad: 0.15, deep: 0.1 },
  stage_2_tech_stack: { broad: 0.3, deep: 0.35 },
  stage_3_domain_knowledge: { broad: 0.25, deep: 0.35 },
  stage_4_cv_deep_dive: { broad: 0.15, deep: 0.1 },
  stage_5_soft_skills: { broad: 0.15, deep: 0.1 },
};

export const MUST_INCLUDE_STAGES: QuestionProbeStage[] = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_5_soft_skills',
];

export const PERSONA_PRESETS: Record<string, PersonaPolicy> = {
  junior: { name: 'Supportive Interviewer', tone: 'friendly' },
  mid: { name: 'Balanced Interviewer', tone: 'neutral' },
  senior: { name: 'Skeptical Interviewer', tone: 'skeptical' },
};

export const PRESSURE_PRESETS: Record<string, PressureProfile> = {
  junior: { level: 'low', maxChallengesPerProbe: 1 },
  mid: { level: 'medium', maxChallengesPerProbe: 2 },
  senior: { level: 'high', maxChallengesPerProbe: 3 },
};
