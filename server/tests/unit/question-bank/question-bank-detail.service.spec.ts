import { Repository } from 'typeorm';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { QuestionBankDetailService } from '../../../src/question-bank/services/public/question-bank-detail.service';
import { QuestionBankPublicProjectionService } from '../../../src/question-bank/services/public/question-bank-public-projection.service';
import { QuestionBankRelatedService } from '../../../src/question-bank/services/public/question-bank-related.service';

describe('QuestionBankDetailService', () => {
  let service: QuestionBankDetailService;
  let probeRepository: { findOne: jest.Mock; increment: jest.Mock };
  let projectionService: QuestionBankPublicProjectionService;
  let relatedService: { findRelatedQuestions: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(() => {
    probeRepository = {
      findOne: jest.fn(),
      increment: jest.fn(() => Promise.resolve({ affected: 1 })),
    };
    projectionService = new QuestionBankPublicProjectionService();
    relatedService = {
      findRelatedQuestions: jest.fn(() => Promise.resolve([])),
    };
    redis = {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve('OK')),
    };
    service = new QuestionBankDetailService(
      probeRepository as unknown as Repository<QuestionProbe>,
      projectionService,
      relatedService as unknown as QuestionBankRelatedService,
      redis as unknown as import('ioredis').default,
    );
  });

  it('returns detail with public content and deterministic related questions', async () => {
    const currentProbe: QuestionProbe = _createProbe({
      id: 'current-probe',
      code: 'backend-ownership-001',
      competencies: ['ownership'],
      techTags: ['incident-response'],
      localizedContent: {
        en: _localized('Ownership', 'Tell me about ownership.'),
      },
    });
    const relatedProbe: QuestionProbe = _createProbe({
      id: 'related-probe',
      code: 'backend-ownership-002',
      competencies: ['ownership'],
      techTags: ['incident-response'],
      localizedContent: {
        en: _localized('Incident ownership', 'Describe an incident.'),
      },
    });
    const relatedCard = projectionService.toPublicCard({
      probe: relatedProbe,
      locale: 'en',
    });
    probeRepository.findOne.mockResolvedValue(currentProbe);
    relatedService.findRelatedQuestions.mockResolvedValue([relatedCard]);

    const result = await service.getPublicProbeDetail({
      probeId: 'current-probe',
      query: { locale: 'en', relatedLimit: '4' },
    });

    expect(result).toMatchObject({
      id: 'current-probe',
      title: 'Ownership',
      guidance: [],
      commonMistakes: [],
    });
    expect(result.relatedQuestions).toHaveLength(1);
    expect(result.relatedQuestions[0]).toMatchObject({
      id: 'related-probe',
      title: 'Incident ownership',
    });
    expect(relatedService.findRelatedQuestions).toHaveBeenCalledWith({
      probe: currentProbe,
      locale: 'en',
      relatedLimit: 4,
    });
    expect(probeRepository.increment).toHaveBeenCalledWith(
      { id: 'current-probe' },
      'viewCount',
      1,
    );
    expect(result).not.toHaveProperty('expectedSignals');
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
    expectedSignals: [{ label: 'Trade-off clarity', relatedTrigger: null }],
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
