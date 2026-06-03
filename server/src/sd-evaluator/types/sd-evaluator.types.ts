export interface DimensionResult {
  dimension: string;
  score: number;
  maxScore: number;
  data: Record<string, unknown>;
}

export interface EvaluationProgress {
  completedDimensions: DimensionResult[];
}

export interface EvaluationStatusResponse {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: EvaluationProgress | null;
  result?: Record<string, unknown>;
}

export interface SDGraphMetricsFlat {
  componentCoverage: number;
  topologyCoverage: number;
  dataFlowCompleteness: number;
  requirementAlignment: number;
  architectureSimplicity: number;
}

export interface GraphDelta {
  nodesAdded: number;
  edgesAdded: number;
  changedLabels: number;
}

export interface SDStructuredEvalInput {
  sessionId: string;
  hasStageSummaries: boolean;
  hasCurveball: boolean;
  hintsUsed: number;
  summaries: Array<{
    stage: string;
    scores: Record<string, number>;
    redFlags: string[];
    leftoverJson: Record<string, unknown> | null;
  }>;
  finalGraphMetrics: SDGraphMetricsFlat | null;
  graphDeltaAfterCurveball: GraphDelta | null;
  constraintReuseCount: number;
  wrapUpQualitySignalCount: number;
  uncoveredRequiredDimensions: string[];
  allRedFlags: string[];
}
