import { PolicyEngineService } from '../../../src/behavior-session/policy-engine.service';
import type {
  QuestionProbeFollowUpTrigger,
} from '../../../src/question-bank/constants/question-bank-taxonomy.constants';
import type { QuestionProbeFollowUp } from '../../../src/question-bank/entities/question-probe.entity';
import type {
  ProbeScoringResult,
  ProbeSignalResult,
} from '../../../src/question-bank/types/question-practice-scoring.types';
import type {
  ActiveProbeSession,
  PolicyDecision,
} from '../../../src/behavior-session/types/behavior-session.types';
import type { PressureProfile } from '../../../src/session-planning/types/session-plan.types';

describe('PolicyEngineService._pickTrigger (via decide)', () => {
  let service: PolicyEngineService;

  beforeEach(() => {
    service = new PolicyEngineService();
  });

  function _signal(
    overrides: Partial<ProbeSignalResult>,
  ): ProbeSignalResult {
    return {
      key: 'signal_1',
      label: 'signal label',
      status: 'covered',
      evidenceQuotes: [],
      feedback: '',
      relatedTrigger: null,
      ...overrides,
    };
  }

  function _scoringResult(
    signalResults: ProbeSignalResult[],
  ): ProbeScoringResult {
    return {
      scoringVersion: 'v1',
      overallBand: 'needs_work',
      confidence: 'high',
      summary: '',
      signalResults,
      redFlags: [],
      improvementSuggestions: [],
      candidateIntent: 'answer',
    };
  }

  function _followUp(trigger: QuestionProbeFollowUpTrigger): QuestionProbeFollowUp {
    return { trigger, question: 'q', purpose: 'p' };
  }

  function _activeProbe(): ActiveProbeSession {
    return {
      plannedProbe: {
        questionProbeId: 'probe-1',
        questionProbeRevision: 1,
        plannedOrder: 1,
        selectionScore: 1,
        selectionReason: 'test',
        estimatedMinutes: 3,
      },
      questionProbeId: 'probe-1',
      stage: 'stage_2_tech_stack',
      startedAt: new Date().toISOString(),
      candidateTurnCount: 1,
      followUpCount: 0,
      challengeCount: 0,
      redirectCount: 0,
      rephraseCount: 0,
      totalTurnCount: 0,
      candidateAnswerTexts: ['some answer'],
      lastScoringResult: null,
      previousBand: null,
      status: 'active',
      isFallback: false,
    };
  }

  const pressureProfile: PressureProfile = { level: 'low', maxChallengesPerProbe: 1 };

  function _decide(
    signalResults: ProbeSignalResult[],
    probeFollowUps: QuestionProbeFollowUp[],
  ): PolicyDecision {
    return service.decide({
      scoringResult: _scoringResult(signalResults),
      activeProbe: _activeProbe(),
      pressureProfile,
      probeFollowUps,
      level: 'senior',
      hasFallbackProbe: false,
    });
  }

  it('targets the trigger tied to the actually-missing signal, ignoring legacy priority order', () => {
    const decision = _decide(
      [
        _signal({ key: 'signal_1', status: 'covered', relatedTrigger: 'missing_metric' }),
        _signal({ key: 'signal_2', status: 'missing', relatedTrigger: 'missing_context' }),
      ],
      [_followUp('missing_metric'), _followUp('missing_context')],
    );

    expect(decision.action).toBe('FOLLOW_UP');
    expect(decision.followUpTrigger).toBe('missing_context');
  });

  it('prefers a missing signal over an unclear one regardless of array order', () => {
    const decision = _decide(
      [
        _signal({ key: 'signal_1', status: 'unclear', relatedTrigger: 'missing_context' }),
        _signal({ key: 'signal_2', status: 'missing', relatedTrigger: 'missing_metric' }),
      ],
      [_followUp('missing_context'), _followUp('missing_metric')],
    );

    expect(decision.followUpTrigger).toBe('missing_metric');
  });

  it('falls back to legacy priority order when no gap has a usable relatedTrigger', () => {
    const decision = _decide(
      [_signal({ key: 'signal_1', status: 'missing', relatedTrigger: null })],
      [_followUp('vague_answer'), _followUp('missing_metric')],
    );

    expect(decision.followUpTrigger).toBe('missing_metric');
  });

  it('falls back to legacy priority order when the relatedTrigger has no matching follow-up on the probe', () => {
    const decision = _decide(
      [_signal({ key: 'signal_1', status: 'missing', relatedTrigger: 'missing_tradeoff' })],
      [_followUp('vague_answer')],
    );

    expect(decision.followUpTrigger).toBe('vague_answer');
  });

  it('closes the probe when every signal is covered', () => {
    const decision = _decide(
      [_signal({ key: 'signal_1', status: 'covered', relatedTrigger: 'missing_metric' })],
      [_followUp('missing_metric')],
    );

    expect(decision.action).toBe('CLOSE_PROBE');
  });
});
