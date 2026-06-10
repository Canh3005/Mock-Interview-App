import type {
  SDDeepDiveTransitionCriteria,
  SDGraphMetrics,
} from '../types/sd-orchestrator.types';

export const DEEP_DIVE_CRITERIA: Record<string, SDDeepDiveTransitionCriteria> =
  {
    junior: {
      minProbes: 1,
      maxProbes: 2,
      maxStageSeconds: 600,
      requiredDimensions: ['scalability'],
    },
    mid: {
      minProbes: 1,
      maxProbes: 3,
      maxStageSeconds: 900,
      requiredDimensions: ['scalability'],
    },
    senior: {
      minProbes: 1,
      maxProbes: 4,
      maxStageSeconds: 1200,
      requiredDimensions: ['scalability', 'consistency'],
    },
    staff: {
      minProbes: 2,
      maxProbes: 5,
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
  consistency: 'dataFlowCompleteness',
  latency: 'topologyCoverage',
  cost: 'architectureSimplicity',
  security: 'requirementAlignment',
  operability: 'dataFlowCompleteness',
};

// Walkthrough score key → probe dimension (for weak-area targeting)
export const WALKTHROUGH_SCORE_TO_PROBE_DIMENSION: Record<string, string> = {
  scaleReasoning: 'scalability',
  flowClarity: 'consistency',
  graphVerbalAlignment: 'data_model',
};

// Deep-dive probe dimension → curveball type (for wrap-up targeting)
export const PROBE_DIMENSION_TO_CURVEBALL_TYPE: Record<string, string[]> = {
  scalability: ['scale_spike'],
  latency: ['scale_spike'],
  reliability: ['failure', 'dependency_outage'],
  consistency: ['constraint_change'],
  cost: ['cost_pressure'],
  security: ['failure'],
  operability: ['dependency_outage', 'failure'],
  data_model: ['constraint_change'],
};
