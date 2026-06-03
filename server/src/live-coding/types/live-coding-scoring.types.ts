export interface ScoringInput {
  testResults: {
    visible: { passed: number; total: number };
    hidden: { passed: number; total: number };
  };
  timeUsedMs: number | null;
  timeLimitMs: number;
  runsUsed: number;
  hintsUsed: number;
  timedOut: boolean;
  approachVerdict: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'FAILED' | null;
  actualTimeComplexity: string | null;
  actualSpaceComplexity: string | null;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
}

export interface ScoringResult {
  correctness: number;
  complexity: number;
  thinkAloud: number;
  timeEfficiency: number;
  runEfficiency: number;
  hintPenalty: number;
  total: number;
  gradeBand: 'Exceptional' | 'Strong' | 'Good' | 'Developing' | 'Needs Work';
}
