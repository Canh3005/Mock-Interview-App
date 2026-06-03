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
