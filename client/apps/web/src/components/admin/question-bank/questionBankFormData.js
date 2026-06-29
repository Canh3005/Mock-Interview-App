export const SUPPORTED_LOCALES = ['vi', 'en', 'ja'];

export const DEFAULT_LOCALIZED_CONTENT = {
  title: '',
  displayQuestion: '',
  displayIntent: '',
  guidance: [],
  commonMistakes: [],
  labels: {},
};

export const DEFAULT_PROBE = {
  code: '',
  stages: ['stage_1_culture_fit'],
  roleFamilies: ['backend'],
  levels: ['mid'],
  type: 'behavioral',
  competencies: ['ownership'],
  techTags: [],
  difficulty: 3,
  intent: '',
  primaryQuestion: '',
  expectedSignals: [{ label: '', relatedTrigger: null }],
  scoringHints: [{ scoreBand: 'strong', description: '' }],
  followUps: [{ trigger: 'vague_answer', question: '', purpose: '' }],
  localizedContent: {},
  sourceReferences: [],
};

export const DEFAULT_INTERVIEW_SET = {
  code: '',
  title: '',
  localizedContent: {},
  roleFamily: 'backend',
  level: 'mid',
  durationMinutes: 45,
  difficulty: 3,
  stages: ['stage_1_culture_fit'],
  competencies: ['ownership'],
  questionCount: 4,
  probeIds: [],
  slotRules: [{ stage: 'stage_1_culture_fit', type: '', competency: '', count: 1 }],
};

function _localizedContent(source = {}) {
  return SUPPORTED_LOCALES.reduce((result, locale) => {
    result[locale] = {
      ...DEFAULT_LOCALIZED_CONTENT,
      ...(source[locale] ?? {}),
    };
    return result;
  }, {});
}

export function editableProbe(probe) {
  if (!probe) return { ...DEFAULT_PROBE, localizedContent: _localizedContent() };
  const {
    id,
    status,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    reviewedBy,
    revision,
    publishedAt,
    retiredAt,
    lastTransitionReason,
    ...editable
  } = probe;
  const merged = { ...DEFAULT_PROBE, ...editable };
  return {
    ...merged,
    code: merged.code ?? '',
    stages: merged.stages ?? [],
    roleFamilies: merged.roleFamilies ?? [],
    levels: merged.levels ?? [],
    type: merged.type ?? DEFAULT_PROBE.type,
    competencies: merged.competencies ?? [],
    techTags: merged.techTags ?? [],
    difficulty: merged.difficulty ?? DEFAULT_PROBE.difficulty,
    intent: merged.intent ?? '',
    primaryQuestion: merged.primaryQuestion ?? '',
    expectedSignals: merged.expectedSignals ?? [],
    scoringHints: merged.scoringHints?.length ? merged.scoringHints : DEFAULT_PROBE.scoringHints,
    followUps: merged.followUps?.length ? merged.followUps : DEFAULT_PROBE.followUps,
    localizedContent: _localizedContent(merged.localizedContent),
    sourceReferences: merged.sourceReferences ?? [],
  };
}

export function editableInterviewSet(interviewSet) {
  if (!interviewSet) return { ...DEFAULT_INTERVIEW_SET, localizedContent: _localizedContent() };
  const {
    id,
    status,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    revision,
    publishedAt,
    retiredAt,
    lastTransitionReason,
    ...editable
  } = interviewSet;
  const merged = { ...DEFAULT_INTERVIEW_SET, ...editable };
  return {
    ...merged,
    code: merged.code ?? '',
    title: merged.title ?? '',
    roleFamily: merged.roleFamily ?? DEFAULT_INTERVIEW_SET.roleFamily,
    level: merged.level ?? DEFAULT_INTERVIEW_SET.level,
    durationMinutes: merged.durationMinutes ?? DEFAULT_INTERVIEW_SET.durationMinutes,
    difficulty: merged.difficulty ?? DEFAULT_INTERVIEW_SET.difficulty,
    stages: merged.stages ?? [],
    competencies: merged.competencies ?? [],
    questionCount: merged.questionCount ?? DEFAULT_INTERVIEW_SET.questionCount,
    probeIds: merged.probeIds ?? [],
    localizedContent: _localizedContent(merged.localizedContent),
    slotRules: (merged.slotRules?.length ? merged.slotRules : DEFAULT_INTERVIEW_SET.slotRules).map((rule) => ({
      type: '',
      competency: '',
      ...rule,
    })),
  };
}

export function compactTextList(values = []) {
  return values.map((item) => String(item ?? '').trim()).filter(Boolean);
}

export function compactLocalizedContent(localizedContent = {}) {
  return Object.fromEntries(
    Object.entries(localizedContent).map(([locale, content]) => [
      locale,
      {
        ...content,
        guidance: compactTextList(content?.guidance),
        commonMistakes: compactTextList(content?.commonMistakes),
      },
    ]),
  );
}

export function compactObjectList(values = [], requiredKeys = []) {
  return values.filter((item) =>
    item && requiredKeys.some((key) => String(item[key] ?? '').trim()),
  );
}

export function compactCompleteObjects(values = [], requiredKeys = []) {
  return values.filter((item) =>
    item && requiredKeys.every((key) => String(item[key] ?? '').trim()),
  );
}

export function updateItem(items, index, patch) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function removeItem(items, index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}
