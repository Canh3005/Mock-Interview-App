import { Injectable } from '@nestjs/common';

const COMPLEXITY_RANK: Record<string, number> = {
  'O(1)': 0,
  'O(log n)': 1,
  'O(n)': 2,
  'O(n log n)': 3,
  'O(n^2)': 4,
  'O(n²)': 4,
  'O(n^3)': 5,
  'O(n³)': 5,
  'O(2^n)': 6,
  'O(2ⁿ)': 6,
  'O(n!)': 7,
};

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

@Injectable()
export class LiveCodingScoringService {
  compute(input: ScoringInput): ScoringResult {
    const correctness = this.scoreCorrectness(input.testResults);
    const complexity = this.scoreComplexity(
      input.actualTimeComplexity,
      input.actualSpaceComplexity,
      input.optimalTimeComplexity,
      input.optimalSpaceComplexity,
    );
    const thinkAloud = this.scoreThinkAloud(input.approachVerdict);
    const timeEfficiency = this.scoreTimeEfficiency(
      input.timeUsedMs,
      input.timeLimitMs,
      input.timedOut,
    );
    const runEfficiency = this.scoreRunEfficiency(input.runsUsed);
    const hintPenalty = Math.min(15, input.hintsUsed * 5);

    const total = Math.max(
      0,
      correctness +
        complexity +
        thinkAloud +
        timeEfficiency +
        runEfficiency -
        hintPenalty,
    );

    return {
      correctness,
      complexity,
      thinkAloud,
      timeEfficiency,
      runEfficiency,
      hintPenalty,
      total,
      gradeBand: this.toGradeBand(total),
    };
  }

  private scoreCorrectness(testResults: ScoringInput['testResults']): number {
    const visibleScore =
      testResults.visible.total > 0
        ? (testResults.visible.passed / testResults.visible.total) * 15
        : 0;
    const hiddenScore =
      testResults.hidden.total > 0
        ? (testResults.hidden.passed / testResults.hidden.total) * 30
        : 0;
    return Math.round(visibleScore + hiddenScore);
  }

  private scoreComplexity(
    actualTime: string | null,
    actualSpace: string | null,
    optimalTime: string | null,
    optimalSpace: string | null,
  ): number {
    const timeScore = this.complexityGap(
      actualTime,
      optimalTime,
      [16, 10, 4, 0],
    );
    const spaceScore = this.complexityGap(actualSpace, optimalSpace, [4, 0]);
    return timeScore + spaceScore;
  }

  private complexityGap(
    actual: string | null,
    optimal: string | null,
    thresholds: number[],
  ): number {
    if (!actual || !optimal) return 0;
    const actualRank = COMPLEXITY_RANK[actual.trim()] ?? null;
    const optimalRank = COMPLEXITY_RANK[optimal.trim()] ?? null;
    if (actualRank === null || optimalRank === null) return 0;
    const gap = Math.abs(actualRank - optimalRank);
    return thresholds[Math.min(gap, thresholds.length - 1)];
  }

  private scoreThinkAloud(verdict: ScoringInput['approachVerdict']): number {
    switch (verdict) {
      case 'STRONG':
        return 15;
      case 'ADEQUATE':
        return 9;
      case 'WEAK':
        return 3;
      default:
        return 0;
    }
  }

  private scoreTimeEfficiency(
    timeUsedMs: number | null,
    timeLimitMs: number,
    timedOut: boolean,
  ): number {
    if (timedOut || timeUsedMs === null) return 0;
    const ratio = timeUsedMs / timeLimitMs;
    if (ratio <= 0.5) return 10;
    if (ratio <= 0.7) return 7;
    if (ratio <= 0.9) return 4;
    if (ratio <= 1.0) return 1;
    return 0;
  }

  private scoreRunEfficiency(runsUsed: number): number {
    if (runsUsed === 0) return 5;
    if (runsUsed <= 3) return 10;
    if (runsUsed <= 7) return 7;
    if (runsUsed <= 12) return 4;
    return 1;
  }

  private toGradeBand(score: number): ScoringResult['gradeBand'] {
    if (score >= 90) return 'Exceptional';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 45) return 'Developing';
    return 'Needs Work';
  }
}
