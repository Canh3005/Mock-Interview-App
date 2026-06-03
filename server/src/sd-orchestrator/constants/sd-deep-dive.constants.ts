import type {
  SDDeepDiveTransitionCriteria,
  SDGraphMetrics,
} from '../types/sd-orchestrator.types';

export const DEEP_DIVE_CRITERIA: Record<string, SDDeepDiveTransitionCriteria> =
  {
    junior: {
      minProbes: 1,
      maxProbes: 1,
      maxStageSeconds: 600,
      requiredDimensions: ['scalability'],
    },
    mid: {
      minProbes: 1,
      maxProbes: 2,
      maxStageSeconds: 900,
      requiredDimensions: ['scalability'],
    },
    senior: {
      minProbes: 1,
      maxProbes: 2,
      maxStageSeconds: 1200,
      requiredDimensions: ['scalability', 'consistency'],
    },
    staff: {
      minProbes: 2,
      maxProbes: 3,
      maxStageSeconds: 1200,
      requiredDimensions: ['scalability', 'consistency', 'reliability'],
    },
  };

// Dimension → graphMetrics field mapping for probe selection
export const DIMENSION_TO_METRIC: Partial<
  Record<string, keyof SDGraphMetrics>
> = {
  scalability: 'topologyCoverage',
  reliability: 'dataFlowCompleteness',
  data_model: 'componentCoverage',
};
