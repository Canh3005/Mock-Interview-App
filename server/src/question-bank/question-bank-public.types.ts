import {
  QuestionProbeLanguage,
} from './constants/question-bank-taxonomy.constants';
import {
  QuestionPracticeAnswerInputType,
  QuestionPracticeAttemptStatus,
} from './entities/question-practice-attempt.entity';

export interface PublicProbeListRequest {
  page?: string;
  limit?: string;
  locale?: string;
  language?: string;
  roleFamily?: string;
  level?: string;
  type?: string;
  competency?: string;
  techTag?: string;
  difficulty?: string;
  search?: string;
  sort?: string;
}

export interface PublicProbeListQuery {
  page: number;
  limit: number;
  locale: QuestionProbeLanguage;
  language?: QuestionProbeLanguage;
  roleFamily?: string;
  level?: string;
  type?: string;
  competency?: string;
  techTag?: string;
  difficulty?: number;
  search?: string;
  sort: 'newest' | 'popular';
}

export interface PublicQuestionProbeCard {
  id: string;
  code: string | null;
  title: string;
  displayQuestion: string;
  displayIntent: string;
  difficulty: number | null;
  roleFamilies: string[];
  levels: string[];
  type: string | null;
  competencies: string[];
  techTags: string[];
  supportedLanguages: QuestionProbeLanguage[];
  locale: QuestionProbeLanguage;
  resolvedLocale: QuestionProbeLanguage;
  localeFallbackUsed: boolean;
  popularity: { practiceCount: number; label: 'popular' } | null;
  publishedAt: string | null;
}

export interface PublicQuestionProbeListResponse {
  data: PublicQuestionProbeCard[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicProbeDetailRequest {
  locale?: string;
  relatedLimit?: string;
}

export interface PublicQuestionProbeDetail extends PublicQuestionProbeCard {
  guidance: string[];
  commonMistakes: string[];
  relatedQuestions: PublicQuestionProbeCard[];
}

export interface SubmitQuestionPracticeAttemptRequest {
  clientSubmissionId?: string;
  answerInputType?: string;
  answerText?: string;
  displayLocale?: string;
  feedbackLocale?: string;
}

export interface SubmitQuestionPracticeAttemptResponse {
  attemptId: string;
  probeId: string;
  status: QuestionPracticeAttemptStatus;
  answerInputType: QuestionPracticeAnswerInputType;
  displayLocale: QuestionProbeLanguage;
  resolvedQuestionLocale: QuestionProbeLanguage;
  feedbackLocale: QuestionProbeLanguage;
  submittedAt: string;
  next: 'feedback_processing';
}
