export interface LLMClarificationOutput {
  candidateIntent: string;
  dimensionCovered: string[];
  matchedFactKey: string | null;
  solutionLeapDetected: boolean;
  requirementCoverage: number;
  questionSpecificity: number;
  assumptionDiscipline: number;
  prioritization: number;
}

export interface LLMDeepDiveOutput {
  candidateIntent: string;
  expectedSignalsCovered: string[];
  tradeoffMentioned: boolean;
  metricsMentioned: boolean;
  redFlagTriggered: boolean;
  constraintLinked: boolean;
  technicalDepth: number;
  tradeoffArticulation: number;
  bottleneckReasoning: number;
  componentOwnership: number;
  operationalAwareness: number;
  redFlags: string[];
}

export interface LLMWalkthroughOutput {
  candidateIntent: string;
  explainedNodeIds: string[];
  explainedEdgeIds: string[];
  coveredPathIds: string[];
  dataOwnershipMentioned: boolean;
  syncAsyncBoundaryMentioned: boolean;
  constraintLinked: boolean;
  scopeViolation: boolean;
  contradictionDetected: boolean;
  contradictionDetail?: string;
  requirementSynthesis?: boolean;
  scaleReasoning?: boolean;
  scopeControl?: boolean;
  walkthroughCompleteness: number;
  flowClarity: number;
  graphVerbalAlignment: number;
  communicationStructure: number;
  redFlags: string[];
}

export interface LLMWrapUpOutput {
  candidateIntent: string;
  blastRadiusRecognized: boolean;
  mitigationProposed: boolean;
  tradeoffMentioned: boolean;
  costOrLatencyImpactMentioned: boolean;
  consistencyWithOriginalDesign: boolean;
  graphAdaptationMade: boolean;
  failureReasoning: number;
  adaptationQuality: number;
  curveballHandling: number;
  riskPrioritization: number;
  consistencyScore: number;
  redFlags: string[];
}
