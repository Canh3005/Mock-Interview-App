import { ProbeEmbeddingTextService } from '../../../src/session-planning/rag/probe-embedding-text.service';
import { QuestionProbe } from '../../../src/question-bank/entities/question-probe.entity';

describe('ProbeEmbeddingTextService', () => {
  let service: ProbeEmbeddingTextService;

  beforeEach(() => {
    service = new ProbeEmbeddingTextService();
  });

  it('builds one canonical embedding text per probe and language', () => {
    const probe = _createProbe({
      stages: ['stage_2_tech_stack', 'stage_4_cv_deep_dive'],
      levels: ['mid', 'senior'],
      roleFamilies: ['backend', 'fullstack'],
    });

    const result = service.build({ probe, language: 'en' });

    expect(result?.canonicalText).toContain('Suitable stages');
    expect(result?.canonicalText).toContain('stage_2_tech_stack');
    expect(result?.canonicalText).toContain('stage_4_cv_deep_dive');
    expect(result?.contentHash).toHaveLength(64);
  });

  it('keeps the hash stable for unchanged semantic content', () => {
    const probe = _createProbe();

    const first = service.build({ probe, language: 'en' });
    const second = service.build({ probe: { ...probe }, language: 'en' });

    expect(first?.contentHash).toBe(second?.contentHash);
  });

  it('changes the hash when probe content changes', () => {
    const probe = _createProbe();
    const changed = _createProbe({
      primaryQuestion: 'How did you debug a production API incident?',
    });

    const first = service.build({ probe, language: 'en' });
    const second = service.build({ probe: changed, language: 'en' });

    expect(first?.contentHash).not.toBe(second?.contentHash);
  });
});

function _localized(title: string, displayQuestion: string) {
  return {
    title,
    displayQuestion,
    displayIntent: 'Assess technical judgment.',
    guidance: ['Ask for concrete production evidence.'],
    commonMistakes: ['Only gives generic answers.'],
    labels: { topic: 'backend' },
  };
}

function _createProbe(overrides: Partial<QuestionProbe> = {}): QuestionProbe {
  return {
    id: 'probe-1',
    code: 'backend-api-001',
    stages: ['stage_2_tech_stack'],
    roleFamilies: ['backend'],
    levels: ['mid'],
    type: 'technical_depth',
    conversationDepth: 'mid',
    competencies: ['technical_fundamentals', 'problem_solving'],
    techTags: ['nodejs', 'postgresql'],
    difficulty: 3,
    intent: 'Assess backend API ownership.',
    primaryQuestion: 'How did you design a backend API?',
    expectedSignals: [{ label: 'Explains trade-offs', relatedTrigger: null }],
    redFlags: ['No concrete ownership'],
    scoringHints: [{ scoreBand: 'strong', description: 'Clear evidence' }],
    followUps: [
      {
        trigger: 'missing_tradeoff',
        question: 'What trade-off did you make?',
        purpose: 'Clarify reasoning',
      },
    ],
    localizedContent: {
      en: _localized('Backend API ownership', 'Describe your API design.'),
    },
    sourceReferences: [{ label: 'Internal rubric' }],
    status: 'active',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    reviewedBy: 'admin-1',
    revision: 1,
    lastTransitionReason: null,
    publishedAt: new Date('2026-05-10T00:00:00.000Z'),
    retiredAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    ...overrides,
    viewCount: overrides.viewCount ?? 0,
  };
}
