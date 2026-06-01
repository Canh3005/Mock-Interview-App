import { Injectable } from '@nestjs/common';
import type {
  SDDeepDiveIntent,
  SDDeepDivePlannerInput,
  SDDeepDiveTransitionCriteria,
  SDProbe,
  SDGraphMetrics,
  SDWalkthroughLeftoverJson,
} from '../types/sd-orchestrator.types';

export const DEEP_DIVE_CRITERIA: Record<string, SDDeepDiveTransitionCriteria> =
  {
    junior: {
      minProbes: 1,
      maxProbes: 1,
      maxStageSeconds: 600,
      requiredDimensions: ['scalability'],
    },
    mid: {
      minProbes: 1,
      maxProbes: 2,
      maxStageSeconds: 900,
      requiredDimensions: ['scalability'],
    },
    senior: {
      minProbes: 1,
      maxProbes: 2,
      maxStageSeconds: 1200,
      requiredDimensions: ['scalability', 'consistency'],
    },
    staff: {
      minProbes: 2,
      maxProbes: 3,
      maxStageSeconds: 1200,
      requiredDimensions: ['scalability', 'consistency', 'reliability'],
    },
  };

// Dimension → graphMetrics field mapping for probe selection
const DIMENSION_TO_METRIC: Partial<Record<string, keyof SDGraphMetrics>> = {
  scalability: 'topologyCoverage',
  reliability: 'dataFlowCompleteness',
  data_model: 'componentCoverage',
};

@Injectable()
export class SDDeepDivePlannerService {
  selectNextProbe(input: SDDeepDivePlannerInput): SDProbe | null {
    const { walkthroughLeftover, graphMetrics, tracker, probeBank, context } =
      input;
    const criteria =
      DEEP_DIVE_CRITERIA[context.level] ?? DEEP_DIVE_CRITERIA['senior'];
    const completedIds = tracker.progress.completedProbeIds;

    const availableProbes = probeBank.filter(
      (p) => p.stage === 'DEEP_DIVE' && !completedIds.includes(p.id),
    );
    if (availableProbes.length === 0) return null;

    // Rule 1: unexplained nodes from walkthrough — pick probe matching that node type
    const { unexplainedAtEnd } = walkthroughLeftover;
    if (unexplainedAtEnd.nodeIds.length > 0) {
      const targetNodeType = input.graph.nodes.find((n) =>
        unexplainedAtEnd.nodeIds.includes(n.id),
      )?.type;
      if (targetNodeType) {
        const probeForType = availableProbes.find((p) =>
          p.appliesToNodeTypes.includes(targetNodeType),
        );
        if (probeForType) return probeForType;
      }
    }

    // Rule 2: lowest graphMetrics score → probe that dimension
    const lowestMetricDim = this._findLowestMetricDimension(
      graphMetrics,
      availableProbes,
    );
    if (lowestMetricDim) return lowestMetricDim;

    // Rule 3: required dimensions per level
    for (const requiredDim of criteria.requiredDimensions) {
      const probe = availableProbes.find((p) => p.dimension === requiredDim);
      if (probe) return probe;
    }

    // Fallback: first available probe
    return availableProbes[0] ?? null;
  }

  private _findLowestMetricDimension(
    metrics: SDGraphMetrics,
    probes: SDProbe[],
  ): SDProbe | null {
    let lowestScore = Infinity;
    let bestProbe: SDProbe | null = null;
    for (const probe of probes) {
      const metricKey = DIMENSION_TO_METRIC[probe.dimension];
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
  ): SDDeepDiveIntent {
    const forbiddenHints = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    return {
      stage: 'DEEP_DIVE',
      type: 'PROBE_PRIMARY',
      promptTemplate: probe.primaryQuestionTemplate,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: { probeId: probe.id, probeDimension: probe.dimension },
    };
  }

  buildFollowUpIntent(
    probe: SDProbe,
    trigger:
      | 'missing_tradeoff'
      | 'missing_metric'
      | 'vague_answer'
      | 'red_flag',
    language: 'vi' | 'en' | 'ja',
    cumulativeCoveredSignals: string[],
  ): SDDeepDiveIntent | null {
    const followUp = probe.followUps.find((f) => f.trigger === trigger);
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
        probeDimension: probe.dimension,
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
    const redFlagFollowUp = probe.followUps.find(
      (f) => f.trigger === 'red_flag',
    );
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
        probeDimension: probe.dimension,
        followUpTrigger: 'red_flag',
      },
    };
  }

  pickFollowUpTrigger(
    signalsCovered: string[],
    expectedSignals: string[],
    redFlagTriggered: boolean,
    tradeoffMentioned: boolean,
    metricsMentioned: boolean,
  ):
    | 'missing_tradeoff'
    | 'missing_metric'
    | 'vague_answer'
    | 'red_flag'
    | null {
    if (redFlagTriggered) return 'red_flag';
    const uncovered = expectedSignals.filter(
      (s) => !signalsCovered.includes(s),
    );
    if (uncovered.length === 0) return null;
    if (!tradeoffMentioned) return 'missing_tradeoff';
    if (!metricsMentioned) return 'missing_metric';
    return 'vague_answer';
  }

  getCriteriaForLevel(level: string): SDDeepDiveTransitionCriteria {
    return DEEP_DIVE_CRITERIA[level] ?? DEEP_DIVE_CRITERIA['senior'];
  }
}
