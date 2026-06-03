export const FAST_MODEL = 'llama-3.1-8b-instant';

export const AI_TIMEOUT_MS = 30_000;

export const NO_CURVEBALL_MAX: Record<string, number> = {
  componentCoverage: 31,
  scalabilityFit: 25,
  tradeoffArticulation: 25,
  communicationClarity: 19,
};

// ─── Structured scoring constants ────────────────────────────────────────────

export const DIMENSION_WEIGHTS_WITH_CURVEBALL = {
  requirementElicitation: 20,
  architectureAndCoverage: 25,
  technicalDepth: 25,
  adaptationAndResilience: 20,
  communicationAndStructure: 10,
} as const;

export const DIMENSION_WEIGHTS_NO_CURVEBALL = {
  requirementElicitation: 20,
  architectureAndCoverage: 30,
  technicalDepth: 25,
  adaptationAndResilience: 15,
  communicationAndStructure: 10,
} as const;

export const CLARIFICATION_SCORE_KEYS = [
  'requirementCoverage',
  'questionSpecificity',
  'assumptionDiscipline',
  'prioritization',
] as const;

export const WALKTHROUGH_ARCH_KEYS = [
  'walkthroughCompleteness',
  'flowClarity',
  'graphVerbalAlignment',
  'requirementSynthesis',
  'scaleReasoning',
  'scopeControl',
] as const;

export const WALKTHROUGH_COMM_KEYS = ['communicationStructure'] as const;

export const DEEP_DIVE_SCORE_KEYS = [
  'technicalDepth',
  'tradeoffArticulation',
  'bottleneckReasoning',
  'componentOwnership',
  'operationalAwareness',
] as const;

export const WRAP_UP_SCORE_KEYS = [
  'failureReasoning',
  'adaptationQuality',
  'curveballHandling',
  'riskPrioritization',
  'consistencyWithOriginalDesign',
] as const;

export const GRAPH_METRIC_KEYS = [
  'componentCoverage',
  'topologyCoverage',
  'dataFlowCompleteness',
  'requirementAlignment',
] as const;

export const ARCH_WALKTHROUGH_WEIGHT = 0.6;
export const ARCH_GRAPH_WEIGHT = 0.4;

export const CONSTRAINT_REUSE_PTS_PER_TURN = 1;
export const CONSTRAINT_REUSE_MAX_BONUS = 3;

export const GRAPH_DELTA_BONUS_MAX = 0.1;

export const WRAP_UP_QUALITY_SIGNAL_MAX_BONUS = 2;

export const UNCOVERED_DIMENSION_PENALTY_PER_DIM = 2;
export const UNCOVERED_DIMENSION_MAX_PENALTY = 6;
