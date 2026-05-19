import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';
import { QuestionBankPublicBrowseService } from '../../../src/question-bank/services/public/question-bank-public-browse.service';
import { QuestionBankPublicProjectionService } from '../../../src/question-bank/services/public/question-bank-public-projection.service';

interface MockQueryBuilder {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
}

describe('QuestionBankPublicBrowseService', () => {
  let service: QuestionBankPublicBrowseService;
  let queryBuilder: MockQueryBuilder;
  let probeRepository: { createQueryBuilder: jest.Mock };

  beforeEach(() => {
    queryBuilder = _createQueryBuilder();
    probeRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    service = new QuestionBankPublicBrowseService(
      probeRepository as unknown as Repository<QuestionProbe>,
      new QuestionBankPublicProjectionService(),
    );
  });

  it('lists active probes with canonical filters and safe projection', async () => {
    const probe: QuestionProbe = _createProbe({
      localizedContent: {
        en: _localized(
          'Caching trade-off',
          'Explain Redis cache invalidation.',
        ),
        ja: _localized('Cache question', 'Explain cache invalidation.'),
      },
    });
    queryBuilder.getManyAndCount.mockResolvedValue([[probe], 1]);

    const result = await service.listPublicProbes({
      query: {
        locale: 'ja',
        stage: 'stage_2_tech_stack',
        roleFamily: 'backend',
        level: 'mid',
        type: 'technical_depth',
        search: 'cache',
      },
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('probe.status = :status', {
      status: 'active',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      ':stage = ANY(probe.stages)',
      expect.objectContaining({ stage: 'stage_2_tech_stack' }),
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      ':roleFamily = ANY(probe.roleFamilies)',
      expect.objectContaining({ roleFamily: 'backend' }),
    );
    expect(result.data[0]).toMatchObject({
      id: 'probe-1',
      title: 'Cache question',
      resolvedLocale: 'ja',
      localeFallbackUsed: false,
      roleFamilies: ['backend'],
      type: 'technical_depth',
    });
    expect(result.data[0]).not.toHaveProperty('expectedSignals');
    expect(result.total).toBe(1);
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(12);
  });

  it('falls back to an available locale without changing probe identity', async () => {
    const probe: QuestionProbe = _createProbe({
      id: 'probe-fallback',
      localizedContent: {
        en: _localized('Backend ownership', 'Tell me about ownership.'),
      },
    });
    queryBuilder.getManyAndCount.mockResolvedValue([[probe], 1]);

    const result = await service.listPublicProbes({
      query: { locale: 'ja', language: 'en' },
    });

    expect(result.data[0]).toMatchObject({
      id: 'probe-fallback',
      locale: 'ja',
      resolvedLocale: 'en',
      localeFallbackUsed: true,
      supportedLanguages: ['en'],
    });
  });

  it('filters by multiple tech tags using overlap semantics', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await service.listPublicProbes({
      query: { techTags: 'javascript,react,javascript' },
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'probe.techTags && :techTags',
      { techTags: ['javascript', 'react'] },
    );
  });

  it('rejects invalid canonical filters before querying', async () => {
    await expect(
      service.listPublicProbes({
        query: { roleFamily: 'mobile' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(probeRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects invalid stage filters before querying', async () => {
    await expect(
      service.listPublicProbes({
        query: { stage: 'screening' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(probeRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});

function _createQueryBuilder(): MockQueryBuilder {
  const queryBuilder: MockQueryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
  queryBuilder.skip.mockReturnValue(queryBuilder);
  queryBuilder.take.mockReturnValue(queryBuilder);
  return queryBuilder;
}

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
  };
}
