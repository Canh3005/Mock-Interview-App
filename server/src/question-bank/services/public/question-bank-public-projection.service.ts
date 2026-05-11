import { Injectable } from '@nestjs/common';
import {
  QUESTION_PROBE_LANGUAGES,
  QuestionProbeLanguage,
} from '../../constants/question-bank-taxonomy.constants';
import {
  QuestionProbe,
  QuestionProbeLocalizedContent,
} from '../../entities/question-probe.entity';
import { PublicQuestionProbeCard } from '../../types/question-bank-public.types';

@Injectable()
export class QuestionBankPublicProjectionService {
  toPublicCard({
    probe,
    locale,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
  }): PublicQuestionProbeCard {
    const supportedLanguages: QuestionProbeLanguage[] =
      this.supportedLanguages(probe);
    const resolvedLocale: QuestionProbeLanguage = this.resolvedLocale({
      probe,
      locale,
      supportedLanguages,
    });
    const content: QuestionProbeLocalizedContent | null = this.contentForLocale(
      { probe, locale: resolvedLocale },
    );

    return {
      id: probe.id,
      code: probe.code,
      title: content?.title ?? probe.code ?? 'Untitled question',
      displayQuestion: content?.displayQuestion ?? probe.primaryQuestion ?? '',
      displayIntent: content?.displayIntent ?? probe.intent ?? '',
      difficulty: probe.difficulty,
      roleFamilies: probe.roleFamilies,
      levels: probe.levels,
      type: probe.type,
      competencies: probe.competencies,
      techTags: probe.techTags,
      supportedLanguages,
      locale,
      resolvedLocale,
      localeFallbackUsed: resolvedLocale !== locale,
      popularity: null,
      publishedAt: probe.publishedAt ? probe.publishedAt.toISOString() : null,
    };
  }

  supportedLanguages(probe: QuestionProbe): QuestionProbeLanguage[] {
    return QUESTION_PROBE_LANGUAGES.filter(
      (language: QuestionProbeLanguage): boolean =>
        this.contentForLocale({ probe, locale: language }) !== null,
    );
  }

  resolvedLocale({
    probe,
    locale,
    supportedLanguages,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
    supportedLanguages: QuestionProbeLanguage[];
  }): QuestionProbeLanguage {
    if (this.contentForLocale({ probe, locale })) return locale;
    if (supportedLanguages.includes('vi')) return 'vi';
    return supportedLanguages[0] ?? 'vi';
  }

  contentForLocale({
    probe,
    locale,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
  }): QuestionProbeLocalizedContent | null {
    const content: QuestionProbeLocalizedContent | undefined =
      probe.localizedContent?.[locale];
    if (!content?.title || !content.displayQuestion) return null;
    return content;
  }
}
