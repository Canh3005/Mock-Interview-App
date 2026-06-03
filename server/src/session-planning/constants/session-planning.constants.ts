import type { QuestionProbeStage } from '../../question-bank/constants/question-bank-taxonomy.constants';
import type {
  InterviewDepth,
  PersonaPolicy,
  PressureProfile,
} from '../types/session-plan.types';

export const OPENING_OVERHEAD_MINUTES = 2;

export const RECENT_SESSION_LOOKBACK = 3;

export const CLOSING_OVERHEAD_MINUTES = 3;

export const MIN_PROBE_MINUTES = 4;

export const MAX_PROBE_MINUTES = 12;

export const STAGE_WEIGHTS: Record<
  QuestionProbeStage,
  Record<InterviewDepth, number>
> = {
  stage_1_culture_fit: { broad: 0.15, deep: 0.1 },
  stage_2_tech_stack: { broad: 0.25, deep: 0.3 },
  stage_3_domain_knowledge: { broad: 0.2, deep: 0.3 },
  stage_4_cv_deep_dive: { broad: 0.15, deep: 0.1 },
  stage_5_soft_skills: { broad: 0.15, deep: 0.1 },
  stage_6_reverse_interview: { broad: 0.1, deep: 0.1 },
};

export const MUST_INCLUDE_STAGES: QuestionProbeStage[] = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_5_soft_skills',
];

export const PERSONA_PRESETS: Record<string, PersonaPolicy> = {
  junior: {
    name: 'Supportive Interviewer',
    tone: 'friendly',
    challengeStyle: 'supportive',
    verbosity: 'moderate',
    silenceBehavior: 'prompt_immediately',
    challengeThreshold: 'low',
  },
  mid: {
    name: 'Balanced Interviewer',
    tone: 'neutral',
    challengeStyle: 'direct',
    verbosity: 'moderate',
    silenceBehavior: 'wait_briefly',
    challengeThreshold: 'medium',
  },
  senior: {
    name: 'Skeptical Interviewer',
    tone: 'skeptical',
    challengeStyle: 'direct',
    verbosity: 'brief',
    silenceBehavior: 'rephrase_question',
    challengeThreshold: 'high',
  },
};

export const PRESSURE_PRESETS: Record<string, PressureProfile> = {
  junior: {
    level: 'low',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: false,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: false,
    maxChallengesPerProbe: 1,
  },
  mid: {
    level: 'medium',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: true,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: false,
    maxChallengesPerProbe: 2,
  },
  senior: {
    level: 'high',
    challengeOnGenericAnswer: true,
    challengeOnWeLanguage: true,
    challengeOnNoMetric: true,
    challengeOnNoConsequence: true,
    maxChallengesPerProbe: 3,
  },
};
