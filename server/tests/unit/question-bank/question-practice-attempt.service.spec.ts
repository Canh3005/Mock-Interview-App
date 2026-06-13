import { Repository } from 'typeorm';
import { QuestionPracticeAttempt } from '../../../src/question-bank/entities/question-practice-attempt.entity';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { QuestionPracticeFeedbackService } from '../../../src/question-bank/services/practice/question-practice-feedback.service';
import { QuestionPracticeAttemptService } from '../../../src/question-bank/services/practice/question-practice-attempt.service';
import { QuestionBankPublicProjectionService } from '../../../src/question-bank/services/public/question-bank-public-projection.service';

describe('QuestionPracticeAttemptService', () => {
  let service: QuestionPracticeAttemptService;
  let probeRepository: { findOne: jest.Mock };
  type AttemptInput = Partial<QuestionPracticeAttempt>;
  let attemptRepository: {
    findOne: jest.Mock;
    create: jest.Mock<QuestionPracticeAttempt, [AttemptInput]>;
    save: jest.Mock<Promise<QuestionPracticeAttempt>, [AttemptInput]>;
  };
  let feedbackService: {
    enqueueScoring: jest.Mock<Promise<void>, [QuestionPracticeAttempt]>;
  };

  beforeEach(() => {
    probeRepository = { findOne: jest.fn() };
    attemptRepository = {
      findOne: jest.fn(),
      create: jest.fn(
        (attempt: AttemptInput): QuestionPracticeAttempt =>
          attempt as QuestionPracticeAttempt,
      ),
      save: jest.fn(
        (attempt: AttemptInput): Promise<QuestionPracticeAttempt> =>
          Promise.resolve({
            id: 'attempt-1',
            createdAt: new Date('2026-05-10T00:00:00.000Z'),
            updatedAt: new Date('2026-05-10T00:00:00.000Z'),
            ...attempt,
          } as QuestionPracticeAttempt),
      ),
    };
    feedbackService = {
      enqueueScoring: jest.fn(
        (attempt: QuestionPracticeAttempt): Promise<void> => {
          void attempt;
          return Promise.resolve();
        },
      ),
    };
    service = new QuestionPracticeAttemptService(
      probeRepository as unknown as Repository<QuestionProbe>,
      attemptRepository as unknown as Repository<QuestionPracticeAttempt>,
      new QuestionBankPublicProjectionService(),
      feedbackService as unknown as QuestionPracticeFeedbackService,
    );
  });

  it('creates an immutable pending attempt and returns idempotent retry', async () => {
    const probe: QuestionProbe = _createProbe({
      id: 'probe-submit',
      localizedContent: {
        vi: _localized('Ownership', 'Tell me about ownership.'),
      },
    });
    probeRepository.findOne.mockResolvedValue(probe);
    attemptRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'attempt-1',
        candidateId: 'candidate-1',
        probeId: 'probe-submit',
        clientSubmissionId: 'draft-1',
        answerInputType: 'text',
        answerText: 'My answer',
        displayLocale: 'vi',
        resolvedQuestionLocale: 'vi',
        feedbackLocale: 'en',
        status: 'pending_feedback',
        submittedAt: new Date('2026-05-10T00:00:00.000Z'),
        probeSnapshot: {},
        createdAt: new Date('2026-05-10T00:00:00.000Z'),
        updatedAt: new Date('2026-05-10T00:00:00.000Z'),
      });

    const created = await service.submitPracticeAttempt({
      candidateId: 'candidate-1',
      probeId: 'probe-submit',
      request: {
        clientSubmissionId: 'draft-1',
        answerInputType: 'text',
        answerText: ' My answer ',
        displayLocale: 'vi',
        feedbackLocale: 'en',
      },
    });
    const retry = await service.submitPracticeAttempt({
      candidateId: 'candidate-1',
      probeId: 'probe-submit',
      request: {
        clientSubmissionId: 'draft-1',
        answerInputType: 'text',
        answerText: 'Changed answer',
        displayLocale: 'vi',
        feedbackLocale: 'en',
      },
    });

    expect(created).toMatchObject({
      attemptId: 'attempt-1',
      probeId: 'probe-submit',
      status: 'pending_feedback',
      resolvedQuestionLocale: 'vi',
      next: 'feedback_processing',
    });
    expect(retry.attemptId).toBe('attempt-1');
    expect(attemptRepository.save).toHaveBeenCalledTimes(1);
    expect(feedbackService.enqueueScoring).toHaveBeenCalledTimes(1);
  });
});

function _localized(title: string, displayQuestion: string) {
  return {
    title,
    displayQuestion,
    displayIntent: 'Assess technical judgment.',
    guidance: [],
    commonMistakes: [],
    labels: {},
  };
}

function _createProbe(overrides: Partial<QuestionProbe> = {}): QuestionProbe {
  return {
    id: 'probe-1',
    code: 'backend-cache-001',
    stages: ['stage_2_tech_stack'],
    roleFamilies: ['backend'],
    levels: ['mid'],
    type: 'technical_depth',
    conversationDepth: null,
    competencies: ['technical_fundamentals'],
    techTags: ['redis'],
    difficulty: 3,
    intent: 'Assess cache design.',
    primaryQuestion: 'How do you handle cache invalidation?',
    expectedSignals: ['Trade-off clarity'],
    redFlags: ['No invalidation plan'],
    scoringHints: [{ scoreBand: 'strong', description: 'Clear trade-offs' }],
    followUps: [
      {
        trigger: 'missing_tradeoff',
        question: 'What is the trade-off?',
        purpose: 'Clarify reasoning',
      },
    ],
    localizedContent: {},
    sourceReferences: [{ label: 'Internal rubric' }],
    status: 'active',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    reviewedBy: 'admin-1',
    revision: 2,
    lastTransitionReason: null,
    publishedAt: new Date('2026-05-10T00:00:00.000Z'),
    retiredAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    ...overrides,
    viewCount: overrides.viewCount ?? 0,
  };
}
