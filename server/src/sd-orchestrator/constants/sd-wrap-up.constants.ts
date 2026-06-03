import type { SDWrapUpTransitionCriteria } from '../types/sd-orchestrator.types';

export const WRAP_UP_CRITERIA: SDWrapUpTransitionCriteria = {
  minScenarios: 1,
  maxScenarios: 2,
  maxStageSeconds: 600,
  maxFollowUpsPerScenario: 2,
};
