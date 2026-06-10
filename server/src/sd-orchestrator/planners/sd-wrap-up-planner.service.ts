import { Injectable } from '@nestjs/common';
import type {
  SDWrapUpIntent,
  SDWrapUpPlannerInput,
  SDWrapUpTransitionCriteria,
  SDProbe,
} from '../types/sd-orchestrator.types';
import { WRAP_UP_CRITERIA } from '../constants/sd-wrap-up.constants';
import { PROBE_DIMENSION_TO_CURVEBALL_TYPE } from '../constants/sd-deep-dive.constants';

@Injectable()
export class SDWrapUpPlannerService {
  selectNextScenario(input: SDWrapUpPlannerInput): SDProbe | null {
    const { probeBank, tracker, deepDiveScores, deepDiveLeftover } = input;
    const completedIds = new Set(tracker.progress.completedItemIds);

    const available = probeBank.filter((p) => !completedIds.has(p.id));
    if (available.length === 0) return null;

    // Rule 1: target probe matching weakest deep-dive dimension
    const weakestDimension = this._findWeakestDimension(deepDiveScores);
    if (weakestDimension) {
      const targetTypes =
        PROBE_DIMENSION_TO_CURVEBALL_TYPE[weakestDimension] ?? [];
      const targeted = available.find(
        (p) => p.curveballType && targetTypes.includes(p.curveballType),
      );
      if (targeted) return targeted;
    }

    // Rule 2: unresolved red flags → prefer failure or dependency_outage probe
    if (deepDiveLeftover.unresolvedRedFlags.length > 0) {
      const failureProbe = available.find(
        (p) =>
          p.curveballType === 'failure' ||
          p.curveballType === 'dependency_outage',
      );
      if (failureProbe) return failureProbe;
    }

    // Rule 3: first available
    return available[0] ?? null;
  }

  private _findWeakestDimension(scores: Record<string, number>): string | null {
    const WEAK_THRESHOLD = 0.5;
    let weakest: string | null = null;
    let lowestScore = WEAK_THRESHOLD;
    for (const [dimension, score] of Object.entries(scores)) {
      if (score < lowestScore) {
        lowestScore = score;
        weakest = dimension;
      }
    }
    return weakest;
  }

  buildPresentIntent(
    scenario: SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
  ): SDWrapUpIntent {
    const forbiddenHints = scenario.expectedSignals.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_PRESENT',
      promptTemplate: scenario.primaryQuestionTemplate,
      forbiddenHints,
      maxSentences: 3,
      language,
      target: { scenarioId: scenario.id },
    };
  }

  buildFollowUpIntent(
    scenario: SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
    reason: 'blastRadius' | 'consistency' | 'mitigation',
  ): SDWrapUpIntent {
    const forbiddenHints = scenario.expectedSignals.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );
    const templates: Record<string, string> = {
      blastRadius:
        'Ask the candidate to elaborate on the impact and blast radius of this scenario.',
      consistency:
        'Ask how this scenario affects the consistency or correctness guarantees of their original design.',
      mitigation:
        'Ask the candidate to propose a concrete mitigation or adaptation strategy for this scenario.',
    };

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_FOLLOW_UP',
      promptTemplate: templates[reason] ?? templates['blastRadius'],
      forbiddenHints,
      maxSentences: 2,
      language,
      target: { scenarioId: scenario.id },
    };
  }

  buildChallengeIntent(
    scenario: SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
    challengeDetail: string,
  ): SDWrapUpIntent {
    const forbiddenHints = scenario.expectedSignals.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_CHALLENGE',
      promptTemplate: `Challenge: ${challengeDetail}. Ask candidate to reconcile this with their original design.`,
      forbiddenHints,
      maxSentences: 2,
      language,
      target: { scenarioId: scenario.id },
    };
  }

  isScenarioClosed(signals: {
    mitigationProposed: boolean;
    blastRadiusRecognized: boolean;
    consistencyWithOriginalDesign: boolean;
  }): boolean {
    return (
      signals.mitigationProposed &&
      signals.blastRadiusRecognized &&
      signals.consistencyWithOriginalDesign
    );
  }

  getCriteria(): SDWrapUpTransitionCriteria {
    return WRAP_UP_CRITERIA;
  }
}
