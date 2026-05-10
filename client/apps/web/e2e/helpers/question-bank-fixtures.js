export const questionBankTaxonomy = {
  stages: [{ key: 'stage_1_culture_fit', label: 'Culture Fit' }],
  roleFamilies: [{ key: 'backend', label: 'Backend' }],
  levels: [{ key: 'mid', label: 'Mid-level' }],
  types: [{ key: 'behavioral', label: 'Behavioral' }],
  competencies: [{ key: 'ownership', label: 'Ownership' }],
  languages: [
    { key: 'vi', label: 'Vietnamese' },
    { key: 'en', label: 'English' },
    { key: 'ja', label: 'Japanese' },
  ],
  statuses: [
    { key: 'draft', label: 'Draft' },
    { key: 'active', label: 'Active' },
    { key: 'retired', label: 'Retired' },
  ],
  followUpTriggers: [],
  techTagGroups: [],
};

export function createInterviewSetFixture(overrides = {}) {
  return {
    id: 'set-1',
    code: 'backend-mid-standard',
    title: 'Backend Mid Standard',
    localizedContent: {
      vi: { title: 'Backend Mid VI' },
      en: { title: 'Backend Mid EN' },
      ja: { title: 'Backend Mid JA' },
    },
    roleFamily: 'backend',
    level: 'mid',
    durationMinutes: 45,
    difficulty: 3,
    stages: ['stage_1_culture_fit'],
    competencies: ['ownership'],
    questionCount: 3,
    probeIds: [],
    slotRules: [{ stage: 'stage_1_culture_fit', competency: 'ownership', count: 3 }],
    status: 'draft',
    revision: 1,
    ...overrides,
  };
}

export function createInterviewSetPayload(code, title) {
  return {
    code,
    title,
    localizedContent: {
      vi: { title: `${title} VI`, displayQuestion: '', displayIntent: '', guidance: [], commonMistakes: [], labels: {} },
      en: { title: `${title} EN`, displayQuestion: '', displayIntent: '', guidance: [], commonMistakes: [], labels: {} },
      ja: { title: `${title} JA`, displayQuestion: '', displayIntent: '', guidance: [], commonMistakes: [], labels: {} },
    },
    roleFamily: 'backend',
    level: 'mid',
    durationMinutes: 45,
    difficulty: 3,
    stages: ['stage_1_culture_fit'],
    competencies: ['ownership'],
    questionCount: 3,
    probeIds: [],
    slotRules: [{ stage: 'stage_1_culture_fit', competency: 'ownership', count: 3 }],
  };
}
