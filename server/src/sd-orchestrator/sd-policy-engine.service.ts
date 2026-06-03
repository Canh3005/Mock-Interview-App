import { Injectable } from '@nestjs/common';
import type {
  SDClarificationAssessment,
  SDClarificationDecision,
  SDClarificationTracker,
  SDClarificationTransitionCriteria,
  SDWalkthroughAssessment,
  SDWalkthroughDecision,
  SDWalkthroughTracker,
  SDWalkthroughTransitionCriteria,
  SDDeepDiveAssessment,
  SDDeepDiveDecision,
  SDDeepDiveTracker,
  SDDeepDiveTransitionCriteria,
  SDWrapUpAssessment,
  SDWrapUpDecision,
  SDWrapUpTracker,
  SDWrapUpTransitionCriteria,
} from './types/sd-orchestrator.types';

@Injectable()
export class SDPolicyEngineService {
  // ─── Stage 1 — Clarification ────────────────────────────────────────────────

  decideClarification(
    assessment: SDClarificationAssessment,
    tracker: SDClarificationTracker,
    criteria: SDClarificationTransitionCriteria,
    elapsedSeconds: number,
  ): SDClarificationDecision {
    const { signals, candidateIntent } = assessment;

    // 1. REDIRECT — highest priority
    if (signals.solutionLeapDetected) {
      return {
        action: 'REDIRECT',
        reason:
          'solutionLeapDetected=true — candidate is designing before requirements are gathered',
      };
    }

    // 2. ANSWER_FACT — matched a fact key
    if (signals.matchedFactKey) {
      return {
        action: 'ANSWER_FACT',
        reason: `matchedFactKey=${signals.matchedFactKey}`,
      };
    }

    // 3. Check if can transition
    const allRequiredCovered = criteria.requiredDimensions.every((d) =>
      tracker.progress.coveredDimensions.includes(d),
    );
    const meetsMinCriteria =
      tracker.turnCount >= criteria.minCandidateTurns &&
      elapsedSeconds >= criteria.minDurationSeconds;
    const maxTimeReached = elapsedSeconds >= criteria.maxDurationSeconds;

    const candidateReady = candidateIntent === 'ready_to_continue';
    if (
      (allRequiredCovered && (meetsMinCriteria || candidateReady)) ||
      maxTimeReached
    ) {
      return {
        action: 'TRANSITION_STAGE',
        reason:
          allRequiredCovered && candidateReady && !meetsMinCriteria
            ? 'Candidate ready and all required dimensions covered — transitioning early'
            : 'All required dimensions covered and min criteria met',
      };
    }

    // 4. ASK_NUDGE — candidate is ready_to_continue or dont_know but missing required dims
    if (
      candidateReady ||
      candidateIntent === 'dont_know' ||
      candidateIntent === 'off_topic'
    ) {
      return {
        action: 'ASK_NUDGE',
        reason: `candidateIntent=${candidateIntent}, missing required dimensions`,
      };
    }

    // 5. Default — no action needed (candidate is asking normally)
    return {
      action: 'ASK_NUDGE',
      reason: 'Awaiting candidate clarification questions',
    };
  }

  // ─── Stage 2 — Walkthrough ──────────────────────────────────────────────────

  decideWalkthrough(
    assessment: SDWalkthroughAssessment,
    tracker: SDWalkthroughTracker,
    criteria: SDWalkthroughTransitionCriteria,
  ): SDWalkthroughDecision {
    const { signals, extra } = assessment;
    const { progress, turnCount } = tracker;

    // Contradiction challenge (before transition check)
    if (
      signals.contradictionDetected &&
      progress.contradictionChallengesUsed < criteria.maxContradictionChallenges
    ) {
      return {
        action: 'ASK_CHALLENGE',
        reason: `contradictionDetected — challenge ${progress.contradictionChallengesUsed + 1}/${criteria.maxContradictionChallenges}`,
      };
    }

    // Check transition conditions
    const unexplainedCount =
      progress.unexplainedNodeIds.length + progress.unexplainedEdgeIds.length;
    const canTransition =
      (progress.criticalPathsCovered && turnCount >= criteria.minTurns) ||
      (turnCount >= criteria.maxTurns &&
        unexplainedCount <= criteria.maxUnexplainedAllowed);

    if (canTransition) {
      return {
        action: 'TRANSITION_STAGE',
        reason: 'Critical paths covered and min turns met',
      };
    }

    // Contradiction limit reached — force transition with red flag
    if (
      signals.contradictionDetected &&
      progress.contradictionChallengesUsed >=
        criteria.maxContradictionChallenges
    ) {
      return {
        action: 'TRANSITION_STAGE',
        reason: `Max contradiction challenges reached (${criteria.maxContradictionChallenges}); transitioning with red flag`,
      };
    }

    // Continue walkthrough
    if (signals.scopeViolation) {
      return {
        action: 'REDIRECT',
        reason: 'Candidate mentioned components outside scope',
      };
    }

    return {
      action: 'ASK_FOLLOW_UP',
      reason: 'Continue walkthrough — unexplained nodes/paths remain',
    };
  }

  // ─── Stage 3 — Deep Dive ────────────────────────────────────────────────────

  decideDeepDive(
    assessment: SDDeepDiveAssessment,
    tracker: SDDeepDiveTracker,
    criteria: SDDeepDiveTransitionCriteria,
    activeProbeExpectedSignals: string[],
    maxFollowUpsPerProbe = 3,
    maxTurnsPerProbe = 4,
  ): SDDeepDiveDecision {
    const { signals } = assessment;
    const { progress } = tracker;
    const activeProbe = progress.activeProbe;

    if (!activeProbe) {
      // No active probe — need to select one (handled by orchestrator)
      if (
        progress.probeBudgetRemaining === 0 ||
        tracker.elapsedSeconds >= criteria.maxStageSeconds
      ) {
        return {
          action: 'TRANSITION_STAGE',
          reason: 'Probe budget exhausted or timebox reached',
        };
      }
      return {
        action: 'CLOSE_PROBE',
        reason: 'No active probe — orchestrator should select next',
      };
    }

    // Check all signals covered (cumulative)
    const cumulativeCovered = [
      ...new Set([
        ...activeProbe.coveredSignals,
        ...signals.expectedSignalsCovered,
      ]),
    ];
    const allSignalsCovered = activeProbeExpectedSignals.every((s) =>
      cumulativeCovered.includes(s),
    );

    if (allSignalsCovered) {
      return { action: 'CLOSE_PROBE', reason: 'All expected signals covered' };
    }

    // Turn limit
    if (activeProbe.turnCount >= maxTurnsPerProbe) {
      return { action: 'CLOSE_PROBE', reason: 'Turn limit reached' };
    }

    // Timebox
    if (tracker.elapsedSeconds >= criteria.maxStageSeconds) {
      return { action: 'TRANSITION_STAGE', reason: 'Stage timebox reached' };
    }

    // Red flag challenge
    if (signals.redFlagTriggered && activeProbe.challengeCount < 1) {
      return { action: 'ASK_CHALLENGE', reason: 'Red flag triggered' };
    }

    // Follow-up limit
    if (activeProbe.followUpCount >= maxFollowUpsPerProbe) {
      return { action: 'CLOSE_PROBE', reason: 'Follow-up limit reached' };
    }

    // Vague answer / redirect
    if (
      assessment.candidateIntent === 'dont_know' ||
      assessment.candidateIntent === 'off_topic' ||
      assessment.candidateIntent === 'clarification_question'
    ) {
      return {
        action: 'REDIRECT',
        reason: `candidateIntent=${assessment.candidateIntent}`,
      };
    }

    return {
      action: 'ASK_FOLLOW_UP',
      reason: 'Signals remaining — asking follow-up',
    };
  }

  // ─── Stage 4 — Wrap-Up ──────────────────────────────────────────────────────

  decideWrapUp(
    assessment: SDWrapUpAssessment,
    tracker: SDWrapUpTracker,
    criteria: SDWrapUpTransitionCriteria,
  ): SDWrapUpDecision {
    const { signals } = assessment;
    const { progress } = tracker;
    const activeScenario = progress.activeScenario;

    if (!activeScenario) {
      if (
        progress.scenarioBudgetRemaining === 0 ||
        tracker.elapsedSeconds >= criteria.maxStageSeconds
      ) {
        return {
          action: 'COMPLETE_SESSION',
          reason: 'Scenario budget exhausted or timebox reached',
        };
      }
      return {
        action: 'COMPLETE_SESSION',
        reason: 'No active scenario — select next',
      };
    }

    // Check close condition
    const followUpBudgetExhausted =
      activeScenario.followUpCount >= criteria.maxFollowUpsPerScenario;
    const isClosed =
      signals.mitigationProposed &&
      signals.blastRadiusRecognized &&
      signals.consistencyWithOriginalDesign &&
      (signals.graphAdaptationMade || followUpBudgetExhausted);

    if (isClosed || tracker.elapsedSeconds >= criteria.maxStageSeconds) {
      const newBudget = progress.scenarioBudgetRemaining - 1;
      if (newBudget <= 0) {
        return {
          action: 'COMPLETE_SESSION',
          reason: 'All scenarios completed',
        };
      }
      return {
        action: 'CLOSE_PROBE',
        reason: 'Scenario closed — move to next',
      };
    }

    // Challenge: consistency violation
    if (
      !signals.consistencyWithOriginalDesign &&
      activeScenario.challengeCount < 1
    ) {
      return {
        action: 'ASK_CHALLENGE',
        reason: 'consistencyWithOriginalDesign=false — challenging assumption',
      };
    }

    // Follow-up: missing blast radius
    if (!signals.blastRadiusRecognized) {
      return { action: 'ASK_FOLLOW_UP', reason: 'blastRadiusRecognized=false' };
    }

    // Follow-up: missing graph adaptation
    if (!signals.graphAdaptationMade && !followUpBudgetExhausted) {
      return {
        action: 'ASK_FOLLOW_UP',
        reason: 'graphAdaptationMade=false — asking to update diagram',
      };
    }

    return {
      action: 'ASK_FOLLOW_UP',
      reason: 'Scenario not yet closed — continuing',
    };
  }
}
