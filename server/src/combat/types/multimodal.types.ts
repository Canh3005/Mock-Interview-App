export interface MultimodalContext {
  dominantExpression: 'stressed' | 'confident' | 'neutral' | 'uncertain';
  expressionConfidence: number;
  gazeOnScreenPercent: number;
  fillerRate: number;
  speakingPaceWpm: number;
  turnDurationMs: number;
}

export interface MultimodalScore {
  eye_tracking: {
    score: number;
    screen_gaze_percent: number;
    feedback: string;
  };
  filler_words: {
    score: number;
    avg_filler_rate: number;
    top_fillers: string[];
    feedback: string;
  };
  expression: {
    score: number;
    dominant_expression: string;
    stress_peak_minutes: number[];
    feedback: string;
  };
  overall_soft_skill_score: number;
}
