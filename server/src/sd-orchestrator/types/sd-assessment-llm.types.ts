export interface LLMClarificationOutput {
  candidateIntent: string;
  dimensionCovered: string[];
  matchedFactKeys: string[];
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
  failureModeMentioned: boolean;
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

export interface LLMGraphAnalysisFlowCoverage {
  pathId: string;
  covered: boolean;
  missingRoles: string[];
}

export interface LLMGraphAnalysisOutput {
  flowCoverage: LLMGraphAnalysisFlowCoverage[];
  componentGaps: string[];
  structuralGapNodeTypes: string[];
  probePriorities: string[];
}

export interface LLMWrapUpOutput {
  candidateIntent: string;
  blastRadiusRecognized: boolean;
  mitigationProposed: boolean;
  consistencyWithOriginalDesign: boolean;
  mentionedMitigations: string[];
  failureReasoning: number;
  adaptationQuality: number;
  curveballHandling: number;
  riskPrioritization: number;
  consistencyScore: number;
  redFlags: string[];
}
