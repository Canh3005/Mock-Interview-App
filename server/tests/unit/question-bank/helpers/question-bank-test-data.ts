import { InterviewSetDraftDto } from '../../../../src/question-bank/dto/interview-set-curation.dto';
import { InterviewSet } from '../../../../src/question-bank/entities/interview-set.entity';

export function createLocalizedContent(title: string) {
  return {
    title,
    displayQuestion: '',
    displayIntent: '',
    guidance: [],
    commonMistakes: [],
    labels: {},
  };
}

export function createInterviewSetPayload(
  overrides: Partial<InterviewSetDraftDto> = {},
): InterviewSetDraftDto {
  return {
    code: `unit-set-${Date.now()}`,
    title: 'Backend Mid Set',
    localizedContent: {
      vi: createLocalizedContent('Backend Mid VI'),
      en: createLocalizedContent('Backend Mid Set'),
      ja: createLocalizedContent('Backend Mid Set'),
    },
    roleFamily: 'backend',
    level: 'mid',
    durationMinutes: 45,
    difficulty: 3,
    stages: ['stage_1_culture_fit'],
    competencies: ['ownership'],
    questionCount: 3,
    probeIds: [],
    slotRules: [
      {
        stage: 'stage_1_culture_fit',
        competency: 'ownership',
        count: 3,
      },
    ],
    ...overrides,
  };
}

export function createMockInterviewSet(
  overrides: Partial<InterviewSet> = {},
): InterviewSet {
  return {
    id: 'set-1',
    code: 'backend-mid-standard',
    title: 'Backend Mid Standard',
    localizedContent: {},
    roleFamily: 'backend',
    level: 'mid',
    durationMinutes: 45,
    difficulty: 3,
    stages: ['stage_1_culture_fit'],
    competencies: ['ownership'],
    questionCount: 3,
    probeIds: [],
    slotRules: [
      {
        stage: 'stage_1_culture_fit',
        competency: 'ownership',
        count: 3,
      },
    ],
    status: 'draft',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    revision: 1,
    lastTransitionReason: null,
    publishedAt: null,
    retiredAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}
