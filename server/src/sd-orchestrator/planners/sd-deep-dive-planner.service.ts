import { Injectable } from '@nestjs/common';
import type {
  SDDeepDiveIntent,
  SDDeepDivePlannerInput,
  SDDeepDiveTransitionCriteria,
  SDProbe,
  SDGraphMetrics,
} from '../types/sd-orchestrator.types';
import {
  DEEP_DIVE_CRITERIA,
  DIMENSION_TO_METRIC,
  WALKTHROUGH_SCORE_TO_PROBE_DIMENSION,
} from '../constants/sd-deep-dive.constants';

export interface ProbeSelectionResult {
  probe: SDProbe | null;
  isStructuralGap: boolean;
}

@Injectable()
export class SDDeepDivePlannerService {
  selectNextProbe(input: SDDeepDivePlannerInput): ProbeSelectionResult {
    const {
      walkthroughLeftover,
      walkthroughScores,
      graphMetrics,
      graphAnalysis,
      tracker,
      probeBank,
      context,
    } = input;
    const criteria =
      DEEP_DIVE_CRITERIA[context.level] ?? DEEP_DIVE_CRITERIA['senior'];
    const completedIds = tracker.progress.completedProbeIds;

    const availableProbes = probeBank.filter(
      (p) => p.stage === 'DEEP_DIVE' && !completedIds.includes(p.id),
    );
    if (availableProbes.length === 0)
      return { probe: null, isStructuralGap: false };

    // Rule 0: walkthrough weak-area targeting — low score → probe that dimension
    const WEAK_THRESHOLD = 0.5;
    for (const [scoreKey, probeDimension] of Object.entries(
      WALKTHROUGH_SCORE_TO_PROBE_DIMENSION,
    )) {
      const score = (walkthroughScores[scoreKey] as number | undefined) ?? 1;
      if (score < WEAK_THRESHOLD) {
        const probe = availableProbes.find(
          (p) => p.dimension === probeDimension,
        );
        if (probe) return { probe, isStructuralGap: false };
      }
    }

    // Rule 1: unexplained nodes from walkthrough — pick probe matching that node type
    const { unexplainedAtEnd } = walkthroughLeftover;
    if (unexplainedAtEnd.nodeIds.length > 0) {
      const targetNodeType = input.graph.nodes.find((n) =>
        unexplainedAtEnd.nodeIds.includes(n.id),
      )?.type;
      if (targetNodeType) {
        const probeForType = availableProbes.find((p) =>
          p.appliesToNodeTypes?.includes(targetNodeType),
        );
        if (probeForType)
          return { probe: probeForType, isStructuralGap: false };
      }
    }

    // Rule 1.5: structural gap — ask about missing critical component before stress-testing
    if (graphAnalysis?.structuralGapNodeTypes?.length) {
      const gapTypes = new Set(graphAnalysis.structuralGapNodeTypes);
      const gapProbe = availableProbes.find((p) =>
        p.appliesToNodeTypes?.some((t) => gapTypes.has(t)),
      );
      if (gapProbe) return { probe: gapProbe, isStructuralGap: true };
    }

    // Rule 2a: LLM analysis probePriorities — stress-test dimensions in order
    if (graphAnalysis?.probePriorities?.length) {
      for (const dim of graphAnalysis.probePriorities) {
        const probe = availableProbes.find((p) => p.dimension === dim);
        if (probe) return { probe, isStructuralGap: false };
      }
    }

    // Rule 2: lowest graphMetrics score → probe that dimension (fallback)
    const lowestMetricDim = this._findLowestMetricDimension(
      graphMetrics,
      availableProbes,
    );
    if (lowestMetricDim)
      return { probe: lowestMetricDim, isStructuralGap: false };

    // Rule 3: required dimensions per level
    for (const requiredDim of criteria.requiredDimensions) {
      const probe = availableProbes.find((p) => p.dimension === requiredDim);
      if (probe) return { probe, isStructuralGap: false };
    }

    // Fallback: first available probe
    const fallback = availableProbes[0] ?? null;
    return { probe: fallback, isStructuralGap: false };
  }

  private _findLowestMetricDimension(
    metrics: SDGraphMetrics,
    probes: SDProbe[],
  ): SDProbe | null {
    let lowestScore = Infinity;
    let bestProbe: SDProbe | null = null;
    for (const probe of probes) {
      const dim = probe.dimension;
      if (!dim) continue;
      const metricKey = DIMENSION_TO_METRIC[dim];
      if (metricKey) {
        const score = metrics[metricKey];
        if (score < lowestScore) {
          lowestScore = score;
          bestProbe = probe;
        }
      }
    }
    return bestProbe;
  }

  buildPrimaryIntent(
    probe: SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeCoveredSignals: string[],
    isStructuralGap = false,
  ): SDDeepDiveIntent {
    const forbiddenHints = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    const promptTemplate: string =
      isStructuralGap && probe.structuralGapQuestion
        ? probe.structuralGapQuestion
        : probe.primaryQuestionTemplate;
    return {
      stage: 'DEEP_DIVE',
      type: 'PROBE_PRIMARY',
      promptTemplate,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: { probeId: probe.id, probeDimension: probe.dimension ?? '' },
    };
  }

  buildFollowUpIntent(
    probe: SDProbe,
    trigger: string,
    language: 'vi' | 'en' | 'ja',
    cumulativeCoveredSignals: string[],
  ): SDDeepDiveIntent | null {
    const followUp = (probe.followUps ?? []).find((f) => f.trigger === trigger);
    if (!followUp) return null;
    const forbiddenHints = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    return {
      stage: 'DEEP_DIVE',
      type: 'PROBE_FOLLOW_UP',
      promptTemplate: followUp.questionTemplate,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: {
        probeId: probe.id,
        probeDimension: probe.dimension ?? '',
        followUpTrigger: trigger,
      },
    };
  }

  buildChallengeIntent(
    probe: SDProbe,
    language: 'vi' | 'en' | 'ja',
    redFlagTriggered: string,
    cumulativeCoveredSignals: string[],
  ): SDDeepDiveIntent {
    const followUps = probe.followUps ?? [];
    const redFlagFollowUp =
      followUps.find((f) => f.trigger === redFlagTriggered) ??
      followUps.find((f) => f.trigger === 'red_flag');
    const forbiddenHints = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    return {
      stage: 'DEEP_DIVE',
      type: 'PROBE_CHALLENGE',
      promptTemplate:
        redFlagFollowUp?.questionTemplate ??
        `Challenge the candidate on their answer regarding: ${redFlagTriggered}`,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: {
        probeId: probe.id,
        probeDimension: probe.dimension ?? '',
        followUpTrigger: 'red_flag',
      },
    };
  }

  buildRedirectIntent(
    probe: SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeCoveredSignals: string[],
  ): SDDeepDiveIntent {
    const forbiddenHints = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    return {
      stage: 'DEEP_DIVE',
      type: 'PROBE_REDIRECT',
      promptTemplate: probe.primaryQuestionTemplate,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: { probeId: probe.id, probeDimension: probe.dimension ?? '' },
    };
  }

  pickFollowUpTrigger(
    signalsCovered: string[],
    expectedSignals: string[],
    detectedRedFlags: string[],
    tradeoffMentioned: boolean,
    metricsMentioned: boolean,
    failureModeMentioned: boolean,
  ): string | null {
    if (detectedRedFlags.length > 0) return detectedRedFlags[0];
    const uncovered = expectedSignals.filter(
      (s) => !signalsCovered.includes(s),
    );
    if (uncovered.length === 0) return null;
    if (!tradeoffMentioned) return 'missing_tradeoff';
    if (!metricsMentioned) return 'missing_metric';
    if (!failureModeMentioned) return 'vague_answer';
    return 'vague_answer';
  }

  getCriteriaForLevel(level: string): SDDeepDiveTransitionCriteria {
    return DEEP_DIVE_CRITERIA[level] ?? DEEP_DIVE_CRITERIA['senior'];
  }
}
