import { ProbeSelectorService } from '../../../src/session-planning/probe-selector.service';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';

describe('ProbeSelectorService', () => {
  let service: ProbeSelectorService;

  beforeEach(() => {
    service = new ProbeSelectorService();
  });

  it('treats empty probe levels as applicable to every target level', () => {
    const universalLevelProbe: QuestionProbe = _createProbe({
      id: 'probe-all-levels',
      levels: [],
    });
    const mismatchedLevelProbe: QuestionProbe = _createProbe({
      id: 'probe-junior-only',
      levels: ['junior'],
    });

    const allocations = service.buildStageAllocations({
      probes: [universalLevelProbe, mismatchedLevelProbe],
      depth: 'broad',
      durationMinutes: 60,
      targetLevel: 'senior',
      roleFamily: 'backend',
      language: 'en',
      priorityCompetencies: ['technical_fundamentals'],
      competencyWeights: { technical_fundamentals: 1 },
      riskHypotheses: [],
      candidateClaims: [],
      cvTechStack: [],
      jdTechStack: [],
      selectionSeed: 'test-session-levels',
      recentlyUsedProbeIds: [],
    });

    const techStage = allocations.find(
      (allocation) => allocation.stage === 'stage_2_tech_stack',
    );

    expect(techStage?.selectedProbes.map((p) => p.questionProbeId)).toEqual([
      'probe-all-levels',
    ]);
  });

  it('allocates expanded probe counts for technical and CV stages', () => {
    const probes: QuestionProbe[] = [
      ..._createStageProbes('stage_2_tech_stack', 4),
      ..._createStageProbes('stage_3_domain_knowledge', 4),
      ..._createStageProbes('stage_4_cv_deep_dive', 3),
    ];

    const allocations = service.buildStageAllocations({
      probes,
      depth: 'broad',
      durationMinutes: 60,
      targetLevel: 'senior',
      roleFamily: 'backend',
      language: 'en',
      priorityCompetencies: ['technical_fundamentals'],
      competencyWeights: { technical_fundamentals: 1 },
      riskHypotheses: [],
      candidateClaims: [],
      cvTechStack: [],
      jdTechStack: [],
      selectionSeed: 'test-session-counts',
      recentlyUsedProbeIds: [],
    });

    expect(_selectedCount(allocations, 'stage_2_tech_stack')).toBe(4);
    expect(_selectedCount(allocations, 'stage_3_domain_knowledge')).toBe(4);
    expect(_selectedCount(allocations, 'stage_4_cv_deep_dive')).toBe(2);
  });

  it('covers each selected JD tech with intro and mid/deep probes in stage 2', () => {
    const probes: QuestionProbe[] = [
      _createProbe({
        id: 'node-intro-1',
        techTags: ['nodejs'],
        conversationDepth: 'intro',
      }),
      _createProbe({
        id: 'node-intro-2',
        techTags: ['nodejs'],
        conversationDepth: 'intro',
      }),
      _createProbe({
        id: 'node-mid',
        techTags: ['nodejs'],
        conversationDepth: 'mid',
      }),
      _createProbe({
        id: 'node-deep',
        techTags: ['nodejs'],
        conversationDepth: 'deep',
      }),
      _createProbe({
        id: 'express-intro',
        techTags: ['express'],
        conversationDepth: 'intro',
      }),
      _createProbe({
        id: 'express-mid',
        techTags: ['express'],
        conversationDepth: 'mid',
      }),
    ];

    const allocations = service.buildStageAllocations({
      probes,
      depth: 'broad',
      durationMinutes: 60,
      targetLevel: 'mid',
      roleFamily: 'backend',
      language: 'en',
      priorityCompetencies: ['technical_fundamentals'],
      competencyWeights: { technical_fundamentals: 1 },
      riskHypotheses: [],
      candidateClaims: [],
      cvTechStack: [],
      jdTechStack: ['nodejs', 'express'],
      selectionSeed: 'test-session-stage-2',
      recentlyUsedProbeIds: [],
    });

    const selectedIds = _selectedIds(allocations, 'stage_2_tech_stack');

    // nodejs must have exactly 1 intro probe (not both)
    const nodeIntros = selectedIds.filter((id) =>
      ['node-intro-1', 'node-intro-2'].includes(id),
    );
    expect(nodeIntros).toHaveLength(1);

    // each covered tech must have at least 1 mid/deep probe
    expect(selectedIds).toEqual(
      expect.arrayContaining(['node-mid', 'express-intro', 'express-mid']),
    );

    // probes are grouped: all nodejs probes come before express probes
    const firstExpressIdx = selectedIds.findIndex((id) =>
      id.startsWith('express'),
    );
    const lastNodeIdx = selectedIds.reduce(
      (last, id, i) => (id.startsWith('node') ? i : last),
      -1,
    );
    expect(lastNodeIdx).toBeLessThan(firstExpressIdx);

    // within nodejs group: intro must appear before mid/deep
    const nodeGroup = selectedIds.filter((id) => id.startsWith('node'));
    const nodeIntroIdx = nodeGroup.findIndex((id) => id.includes('intro'));
    const nodeMidIdx = nodeGroup.findIndex(
      (id) => id === 'node-mid' || id === 'node-deep',
    );
    expect(nodeIntroIdx).toBeLessThan(nodeMidIdx);
  });

  it('prefers applied domain probes over pure intro tech probes in stage 3', () => {
    const probes: QuestionProbe[] = [
      _createProbe({
        id: 'pure-node-intro',
        stages: ['stage_3_domain_knowledge'],
        type: 'technical_depth',
        conversationDepth: 'intro',
        competencies: ['technical_fundamentals'],
        techTags: ['nodejs'],
      }),
      _createProbe({
        id: 'api-scenario',
        stages: ['stage_3_domain_knowledge'],
        type: 'situational',
        conversationDepth: 'mid',
        competencies: ['system_thinking', 'problem_solving'],
        techTags: ['nodejs', 'express', 'api_design'],
      }),
      _createProbe({
        id: 'debugging-scenario',
        stages: ['stage_3_domain_knowledge'],
        type: 'debugging',
        conversationDepth: 'mid',
        competencies: ['problem_solving', 'communication'],
        techTags: ['nodejs', 'redis', 'debugging'],
      }),
      _createProbe({
        id: 'tradeoff-scenario',
        stages: ['stage_3_domain_knowledge'],
        type: 'trade_off',
        conversationDepth: 'deep',
        competencies: ['system_thinking', 'trade_off_analysis'],
        techTags: ['nodejs', 'postgresql', 'consistency'],
      }),
      _createProbe({
        id: 'auth-scenario',
        stages: ['stage_3_domain_knowledge'],
        type: 'situational',
        conversationDepth: 'mid',
        competencies: ['system_thinking', 'impact_measurement'],
        techTags: ['nodejs', 'jwt', 'security'],
      }),
    ];

    const allocations = service.buildStageAllocations({
      probes,
      depth: 'broad',
      durationMinutes: 60,
      targetLevel: 'mid',
      roleFamily: 'backend',
      language: 'en',
      priorityCompetencies: ['technical_fundamentals'],
      competencyWeights: { technical_fundamentals: 1 },
      riskHypotheses: [],
      candidateClaims: [],
      cvTechStack: ['nodejs', 'express', 'redis', 'postgresql', 'jwt'],
      jdTechStack: ['nodejs', 'express'],
      selectionSeed: 'test-session-stage-3',
      recentlyUsedProbeIds: [],
    });

    const selectedIds = _selectedIds(allocations, 'stage_3_domain_knowledge');

    expect(selectedIds).toEqual(
      expect.arrayContaining([
        'api-scenario',
        'debugging-scenario',
        'tradeoff-scenario',
        'auth-scenario',
      ]),
    );
    expect(selectedIds).not.toContain('pure-node-intro');
  });

  it('uses a seeded top-2N pool for generic stage selection', () => {
    const probes = _createStageProbes('stage_5_soft_skills', 7);

    const selectedBySeed = Array.from({ length: 10 }, (_, index) =>
      _selectedIds(
        service.buildStageAllocations({
          probes,
          depth: 'broad',
          durationMinutes: 60,
          targetLevel: 'senior',
          roleFamily: 'backend',
          language: 'en',
          priorityCompetencies: ['communication'],
          competencyWeights: { communication: 1 },
          riskHypotheses: [],
          candidateClaims: [],
          cvTechStack: [],
          jdTechStack: [],
          selectionSeed: `top-k-seed-${index}`,
          recentlyUsedProbeIds: [],
        }),
        'stage_5_soft_skills',
      ),
    );

    expect(
      selectedBySeed.every((selectedIds) =>
        selectedIds.every((id) =>
          [
            'stage_5_soft_skills-1',
            'stage_5_soft_skills-2',
            'stage_5_soft_skills-3',
            'stage_5_soft_skills-4',
            'stage_5_soft_skills-5',
            'stage_5_soft_skills-6',
          ].includes(id),
        ),
      ),
    ).toBe(true);
    expect(
      selectedBySeed.some(
        (ids) => ids.join('|') !== selectedBySeed[0].join('|'),
      ),
    ).toBe(true);
  });

  it('blends RAG similarity into CV deep-dive probe scores', () => {
    const ragFavored = _createProbe({
      id: 'rag-favored',
      stages: ['stage_4_cv_deep_dive'],
      type: 'technical_depth',
      conversationDepth: 'mid',
      competencies: ['technical_fundamentals'],
      techTags: [],
    });
    const heuristicStrong = _createProbe({
      id: 'heuristic-strong',
      stages: ['stage_4_cv_deep_dive'],
      type: 'cv_claim_verification',
      conversationDepth: 'deep',
      competencies: ['technical_fundamentals'],
      techTags: ['nodejs'],
    });

    const allocations = service.buildStageAllocations({
      probes: [ragFavored, heuristicStrong],
      depth: 'broad',
      durationMinutes: 60,
      targetLevel: 'mid',
      roleFamily: 'backend',
      language: 'en',
      priorityCompetencies: ['technical_fundamentals'],
      competencyWeights: { technical_fundamentals: 1 },
      riskHypotheses: [],
      candidateClaims: [],
      cvTechStack: ['nodejs'],
      jdTechStack: ['nodejs'],
      selectionSeed: 'test-session-rag-stage-4',
      recentlyUsedProbeIds: [],
      ragSignals: new Map([
        [
          'rag-favored',
          {
            similarity: 0.95,
            source: 'claim_verification',
            queryLabel: 'claim_verification',
            reason: 'Semantic match from claim_verification',
          },
        ],
      ]),
    });

    const stage = allocations.find(
      (allocation) => allocation.stage === 'stage_4_cv_deep_dive',
    );
    const ragProbe = stage?.selectedProbes.find(
      (probe) => probe.questionProbeId === 'rag-favored',
    );
    const heuristicProbe = stage?.selectedProbes.find(
      (probe) => probe.questionProbeId === 'heuristic-strong',
    );

    expect(ragProbe?.ragSimilarity).toBe(0.95);
    expect(ragProbe?.ragMatchedSource).toBe('claim_verification');
    expect(ragProbe?.selectionScore).toBeGreaterThan(
      heuristicProbe?.selectionScore ?? 0,
    );
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
    techTags: [],
    difficulty: 4,
    intent: 'Assess backend fundamentals.',
    primaryQuestion: 'How do you debug async Node.js behavior?',
    expectedSignals: [{ label: 'Explains the event loop clearly', relatedTrigger: null }],
    redFlags: ['Only repeats buzzwords'],
    scoringHints: [{ scoreBand: 'strong', description: 'Clear reasoning' }],
    followUps: [
      {
        trigger: 'missing_tradeoff',
        question: 'What is the trade-off?',
        purpose: 'Clarify reasoning',
      },
    ],
    localizedContent: {
      en: _localized('Node.js async behavior', 'Explain the event loop.'),
    },
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

function _createStageProbes(
  stage: QuestionProbe['stages'][number],
  count: number,
): QuestionProbe[] {
  return Array.from({ length: count }, (_, index) =>
    _createProbe({
      id: `${stage}-${index + 1}`,
      code: `${stage}-${index + 1}`,
      stages: [stage],
      levels: ['senior'],
    }),
  );
}

function _selectedCount(
  allocations: ReturnType<ProbeSelectorService['buildStageAllocations']>,
  stage: QuestionProbe['stages'][number],
): number {
  return (
    allocations.find((allocation) => allocation.stage === stage)?.selectedProbes
      .length ?? 0
  );
}

function _selectedIds(
  allocations: ReturnType<ProbeSelectorService['buildStageAllocations']>,
  stage: QuestionProbe['stages'][number],
): string[] {
  return (
    allocations
      .find((allocation) => allocation.stage === stage)
      ?.selectedProbes.map((probe) => probe.questionProbeId) ?? []
  );
}
