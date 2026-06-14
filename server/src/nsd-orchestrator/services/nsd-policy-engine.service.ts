import { Injectable } from '@nestjs/common';
import type {
  NSDEvalLevel,
  NSDItemCounters,
  NSDDimensionScore,
  NSDPhaseDimensionResult,
  NSDPhaseDimension,
} from '../types/nsd.types';

export type NSDPolicyDecision = 'followup' | 'fill' | 'advance';

export interface NSDApplyResult {
  action: NSDPolicyDecision;
  updatedCounters: NSDItemCounters;
}

// Limits (inclusive): exceed → fill
const INCOMPLETE_LIMIT = 2;
const WEAK_LIMIT = 1;
const IRRELEVANT_LIMIT = 1;

@Injectable()
export class NSDPolicyEngineService {
  /**
   * Apply LLM eval level to an item's counters.
   * Returns decision + updated counters.
   * Optional items: never fill, always advance on any non-good response after first attempt.
   */
  applyEvalLevel(
    counters: NSDItemCounters,
    level: NSDEvalLevel,
  ): NSDApplyResult {
    if (level === 'good') {
      return {
        action: 'advance',
        updatedCounters: { ...counters, resolved: true },
      };
    }

    if (counters.isOptional) {
      // Optional: skip silently — never fill, mark as "mentioned" only if good
      return { action: 'advance', updatedCounters: counters };
    }

    const updated = { ...counters };

    if (level === 'incomplete') {
      updated.incomplete_count++;
      if (updated.incomplete_count > INCOMPLETE_LIMIT) {
        updated.filled = true;
        return { action: 'fill', updatedCounters: updated };
      }
      updated.rounds_needed++;
      return { action: 'followup', updatedCounters: updated };
    }

    if (level === 'weak') {
      updated.weak_count++;
      if (updated.weak_count > WEAK_LIMIT) {
        updated.filled = true;
        return { action: 'fill', updatedCounters: updated };
      }
      updated.rounds_needed++;
      return { action: 'followup', updatedCounters: updated };
    }

    // irrelevant
    updated.irrelevant_count++;
    if (updated.irrelevant_count > IRRELEVANT_LIMIT) {
      updated.filled = true;
      return { action: 'fill', updatedCounters: updated };
    }
    updated.rounds_needed++;
    return { action: 'followup', updatedCounters: updated };
  }

  /** Mark an optional item as proactively added by candidate. */
  markOptionalAdded(counters: NSDItemCounters): NSDItemCounters {
    return { ...counters, added: true, resolved: true };
  }

  /** Initialize fresh counters for a check item. */
  initCounters(itemKey: string, isOptional: boolean): NSDItemCounters {
    return {
      itemKey,
      isOptional,
      incomplete_count: 0,
      weak_count: 0,
      irrelevant_count: 0,
      filled: false,
      resolved: false,
      added: false,
      rounds_needed: 0,
    };
  }

  /** Find the next unresolved counter in a list (required only unless resolveOptional). */
  findNextUnresolved(
    counters: NSDItemCounters[],
    resolveOptional = false,
  ): NSDItemCounters | null {
    for (const c of counters) {
      if (c.resolved || c.filled) continue;
      if (!resolveOptional && c.isOptional) continue;
      return c;
    }
    return null;
  }

  /**
   * Compute a dimension score from an array of counters.
   * Only required (isOptional=false) items count toward total.
   * Priority: poor → good → pass → needs_improvement.
   */
  computeDimensionScore(
    dimension: NSDPhaseDimension,
    counters: NSDItemCounters[],
  ): NSDPhaseDimensionResult {
    const required = counters.filter((c) => !c.isOptional);
    const total = required.length;

    if (total === 0) {
      return {
        dimension,
        score: 'good',
        totalItems: 0,
        selfResolved: 0,
        promptedResolved: 0,
        filled: 0,
      };
    }

    const filled = required.filter((c) => c.filled).length;
    const selfResolved = required.filter(
      (c) => c.resolved && !c.filled && c.rounds_needed === 0,
    ).length;
    const promptedResolved = required.filter(
      (c) => c.resolved && !c.filled && c.rounds_needed > 0,
    ).length;

    let score: NSDDimensionScore;
    if (filled / total > 0.5) {
      score = 'poor';
    } else if (selfResolved / total >= 0.75 && filled === 0) {
      score = 'good';
    } else if (
      (selfResolved + promptedResolved) / total >= 0.5 &&
      filled <= 1
    ) {
      score = 'pass';
    } else {
      score = 'needs_improvement';
    }

    return {
      dimension,
      score,
      totalItems: total,
      selfResolved,
      promptedResolved,
      filled,
    };
  }

  /** Phase score = the worst (lowest) dimension score. */
  computePhaseScore(
    dimensionResults: NSDPhaseDimensionResult[],
  ): NSDDimensionScore {
    const order: NSDDimensionScore[] = [
      'poor',
      'needs_improvement',
      'pass',
      'good',
    ];
    let worst: NSDDimensionScore = 'good';
    for (const d of dimensionResults) {
      if (order.indexOf(d.score) < order.indexOf(worst)) {
        worst = d.score;
      }
    }
    return worst;
  }
}
