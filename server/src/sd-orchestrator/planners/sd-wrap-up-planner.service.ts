import { Injectable } from '@nestjs/common';
import type {
  SDWrapUpIntent,
  SDWrapUpPlannerInput,
  SDWrapUpTransitionCriteria,
  SDCurveball,
  SDProbe,
} from '../types/sd-orchestrator.types';

export const WRAP_UP_CRITERIA: SDWrapUpTransitionCriteria = {
  minScenarios: 1,
  maxScenarios: 2,
  maxStageSeconds: 600,
  maxFollowUpsPerScenario: 2,
};

@Injectable()
export class SDWrapUpPlannerService {
  selectNextScenario(
    input: SDWrapUpPlannerInput,
  ): SDCurveball | SDProbe | null {
    const { curveballs, tracker, deepDiveLeftover, deepDiveScores } = input;
    const completedIds = new Set(tracker.progress.completedItemIds);

    // Rule 1: curveballs from problem definition in order
    const nextCurveball = curveballs.find((c) => !completedIds.has(c.id));
    if (nextCurveball) return nextCurveball;

    // Rule 2: SDProbe fallback (stage: 'WRAP_UP') — pick weakest deep-dive dimension
    // (probeBank is not directly available in WrapUpPlannerInput — handled by orchestrator)
    return null;
  }

  buildPresentIntent(
    scenario: SDCurveball | SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
  ): SDWrapUpIntent {
    const isCurveball = 'scenarioTemplate' in scenario;
    const template = isCurveball
      ? scenario.scenarioTemplate
      : scenario.primaryQuestionTemplate;
    const expectedMitigations = isCurveball
      ? scenario.expectedMitigations
      : scenario.expectedSignals;
    const forbiddenHints = expectedMitigations.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );
    const target: any = isCurveball
      ? { source: 'curveball' as const, scenarioId: scenario.id }
      : { source: 'probe_fallback' as const, probeId: scenario.id };

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_PRESENT',
      promptTemplate: template,
      forbiddenHints,
      maxSentences: 3,
      language,
      target,
    };
  }

  buildFollowUpIntent(
    scenario: SDCurveball | SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
    reason: 'blastRadius' | 'graphAdaptation' | 'consistency' | 'mitigation',
  ): SDWrapUpIntent {
    const isCurveball = 'scenarioTemplate' in scenario;
    const expectedMitigations = isCurveball
      ? scenario.expectedMitigations
      : scenario.expectedSignals;
    const forbiddenHints = expectedMitigations.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );
    const templates: Record<string, string> = {
      blastRadius:
        'Ask the candidate to elaborate on the impact and blast radius of this scenario.',
      graphAdaptation:
        'Ask candidate to update the diagram to reflect how their design handles this scenario.',
      consistency:
        'Ask how this scenario affects the consistency or correctness guarantees of their original design.',
      mitigation:
        'Ask the candidate to propose a concrete mitigation or adaptation strategy for this scenario.',
    };
    const target: any = isCurveball
      ? { source: 'curveball' as const, scenarioId: scenario.id }
      : { source: 'probe_fallback' as const, probeId: scenario.id };

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_FOLLOW_UP',
      promptTemplate: templates[reason] ?? templates['blastRadius'],
      forbiddenHints,
      maxSentences: 2,
      language,
      target,
    };
  }

  buildChallengeIntent(
    scenario: SDCurveball | SDProbe,
    language: 'vi' | 'en' | 'ja',
    cumulativeMentionedMitigations: string[],
    challengeDetail: string,
  ): SDWrapUpIntent {
    const isCurveball = 'scenarioTemplate' in scenario;
    const expectedMitigations = isCurveball
      ? scenario.expectedMitigations
      : scenario.expectedSignals;
    const forbiddenHints = expectedMitigations.filter(
      (m) => !cumulativeMentionedMitigations.includes(m),
    );
    const target: any = isCurveball
      ? { source: 'curveball' as const, scenarioId: scenario.id }
      : { source: 'probe_fallback' as const, probeId: scenario.id };

    return {
      stage: 'WRAP_UP',
      type: 'SCENARIO_CHALLENGE',
      promptTemplate: `Challenge: ${challengeDetail}. Ask candidate to reconcile this with their original design.`,
      forbiddenHints,
      maxSentences: 2,
      language,
      target,
    };
  }

  isScenarioClosed(
    signals: {
      mitigationProposed: boolean;
      blastRadiusRecognized: boolean;
      consistencyWithOriginalDesign: boolean;
      graphAdaptationMade: boolean;
    },
    followUpBudgetExhausted: boolean,
  ): boolean {
    return (
      signals.mitigationProposed &&
      signals.blastRadiusRecognized &&
      signals.consistencyWithOriginalDesign &&
      (signals.graphAdaptationMade || followUpBudgetExhausted)
    );
  }

  getCriteria(): SDWrapUpTransitionCriteria {
    return WRAP_UP_CRITERIA;
  }
}
