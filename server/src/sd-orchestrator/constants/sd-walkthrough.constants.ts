import type { SDWalkthroughTransitionCriteria } from '../types/sd-orchestrator.types';

export const WALKTHROUGH_CRITERIA: SDWalkthroughTransitionCriteria = {
  minTurns: 8,
  maxTurns: 8,
  mustCoverCriticalPath: true,
  maxUnexplainedAllowed: 2,
  contradictionMustBeResolved: true,
  maxContradictionChallenges: 2,
};

// Entry-point infrastructure types — probe before source actors
export const ENTRY_POINT_TYPES = ['lb', 'gateway', 'service'];

export const SOURCE_ACTOR_TYPES = ['client', 'browser', 'mobile', 'user'];
