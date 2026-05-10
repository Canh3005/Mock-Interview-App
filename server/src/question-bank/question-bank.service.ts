import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  QUESTION_BANK_TAXONOMY,
  QUESTION_PROBE_COMPETENCIES,
  QUESTION_PROBE_LANGUAGES,
  QUESTION_PROBE_LEVELS,
  QUESTION_PROBE_ROLE_FAMILIES,
  QUESTION_PROBE_TYPES,
  QuestionBankTaxonomy,
  QuestionProbeLanguage,
} from './constants/question-bank-taxonomy.constants';
import {
  QuestionProbe,
  QuestionProbeLocalizedContent,
} from './entities/question-probe.entity';
import { ProbeValidationResult } from './question-probe-validation.types';
import { QuestionProbeValidationService } from './question-probe-validation.service';

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

interface PublicProbeListQuery {
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

@Injectable()
export class QuestionBankService {
  constructor(
    private readonly validationService: QuestionProbeValidationService,
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
  ) {}

  getTaxonomy(): QuestionBankTaxonomy {
    return QUESTION_BANK_TAXONOMY;
  }

  validateProbe(input: unknown): ProbeValidationResult {
    return this.validationService.validate(input);
  }

  async listPublicProbes({
    query,
  }: {
    query: PublicProbeListRequest;
  }): Promise<PublicQuestionProbeListResponse> {
    const normalized: PublicProbeListQuery = this._normalizePublicQuery(query);
    const qb: SelectQueryBuilder<QuestionProbe> = this.probeRepository
      .createQueryBuilder('probe')
      .where('probe.status = :status', { status: 'active' });

    this._applyPublicFilters({ qb, query: normalized });
    this._applyPublicSort({ qb, sort: normalized.sort });

    const [probes, total]: [QuestionProbe[], number] = await qb
      .skip((normalized.page - 1) * normalized.limit)
      .take(normalized.limit)
      .getManyAndCount();

    const data: PublicQuestionProbeCard[] = probes.map(
      (probe: QuestionProbe): PublicQuestionProbeCard =>
        this._toPublicCard({ probe, locale: normalized.locale }),
    );

    return {
      data,
      total,
      page: normalized.page,
      limit: normalized.limit,
    };
  }

  private _normalizePublicQuery(
    request: PublicProbeListRequest,
  ): PublicProbeListQuery {
    const page: number = this._positiveInteger({
      value: request.page,
      field: 'page',
      defaultValue: 1,
    });
    const limit: number = this._positiveInteger({
      value: request.limit,
      field: 'limit',
      defaultValue: 10,
      maxValue: 50,
    });
    const sort: 'newest' | 'popular' = this._sort(request.sort);
    const locale: QuestionProbeLanguage = this._language({
      value: request.locale,
      field: 'locale',
      required: false,
    });
    const language: QuestionProbeLanguage | undefined = request.language
      ? this._language({
          value: request.language,
          field: 'language',
          required: true,
        })
      : undefined;

    return {
      page,
      limit,
      locale,
      language,
      roleFamily: this._optionalTaxonomy({
        value: request.roleFamily,
        allowed: QUESTION_PROBE_ROLE_FAMILIES,
        field: 'roleFamily',
      }),
      level: this._optionalTaxonomy({
        value: request.level,
        allowed: QUESTION_PROBE_LEVELS,
        field: 'level',
      }),
      type: this._optionalTaxonomy({
        value: request.type,
        allowed: QUESTION_PROBE_TYPES,
        field: 'type',
      }),
      competency: this._optionalTaxonomy({
        value: request.competency,
        allowed: QUESTION_PROBE_COMPETENCIES,
        field: 'competency',
      }),
      techTag: this._techTag(request.techTag),
      difficulty: this._difficulty(request.difficulty),
      search: this._cleanText(request.search),
      sort,
    };
  }

  private _applyPublicFilters({
    qb,
    query,
  }: {
    qb: SelectQueryBuilder<QuestionProbe>;
    query: PublicProbeListQuery;
  }): void {
    if (query.language) {
      qb.andWhere('probe.localizedContent ? :language', {
        language: query.language,
      });
    }
    if (query.roleFamily) {
      qb.andWhere(':roleFamily = ANY(probe.roleFamilies)', query);
    }
    if (query.level) qb.andWhere(':level = ANY(probe.levels)', query);
    if (query.type) qb.andWhere('probe.type = :type', query);
    if (query.competency) {
      qb.andWhere(':competency = ANY(probe.competencies)', query);
    }
    if (query.techTag) qb.andWhere(':techTag = ANY(probe.techTags)', query);
    if (query.difficulty) qb.andWhere('probe.difficulty = :difficulty', query);
    if (query.search) {
      qb.andWhere(
        `(${[
          'probe.code ILIKE :search',
          'probe.intent ILIKE :search',
          'probe.primaryQuestion ILIKE :search',
          'CAST(probe.localizedContent AS TEXT) ILIKE :search',
        ].join(' OR ')})`,
        { search: `%${query.search}%` },
      );
    }
  }

  private _applyPublicSort({
    qb,
    sort,
  }: {
    qb: SelectQueryBuilder<QuestionProbe>;
    sort: 'newest' | 'popular';
  }): void {
    if (sort === 'popular') {
      qb.orderBy('probe.publishedAt', 'DESC', 'NULLS LAST').addOrderBy(
        'probe.id',
        'ASC',
      );
      return;
    }
    qb.orderBy('probe.publishedAt', 'DESC', 'NULLS LAST').addOrderBy(
      'probe.id',
      'ASC',
    );
  }

  private _toPublicCard({
    probe,
    locale,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
  }): PublicQuestionProbeCard {
    const supportedLanguages: QuestionProbeLanguage[] =
      this._supportedLanguages(probe);
    const resolvedLocale: QuestionProbeLanguage = this._resolvedLocale({
      probe,
      locale,
      supportedLanguages,
    });
    const content: QuestionProbeLocalizedContent | null =
      this._contentForLocale({ probe, locale: resolvedLocale });

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

  private _supportedLanguages(probe: QuestionProbe): QuestionProbeLanguage[] {
    return QUESTION_PROBE_LANGUAGES.filter(
      (language: QuestionProbeLanguage): boolean =>
        this._contentForLocale({ probe, locale: language }) !== null,
    );
  }

  private _resolvedLocale({
    probe,
    locale,
    supportedLanguages,
  }: {
    probe: QuestionProbe;
    locale: QuestionProbeLanguage;
    supportedLanguages: QuestionProbeLanguage[];
  }): QuestionProbeLanguage {
    if (this._contentForLocale({ probe, locale })) return locale;
    if (supportedLanguages.includes('vi')) return 'vi';
    return supportedLanguages[0] ?? 'vi';
  }

  private _contentForLocale({
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

  private _positiveInteger({
    value,
    field,
    defaultValue,
    maxValue,
  }: {
    value?: string;
    field: string;
    defaultValue: number;
    maxValue?: number;
  }): number {
    if (!value) return defaultValue;
    const parsed: number = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    if (maxValue && parsed > maxValue) return maxValue;
    return parsed;
  }

  private _difficulty(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed: number = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      throw new BadRequestException('Invalid difficulty');
    }
    return parsed;
  }

  private _language({
    value,
    field,
    required,
  }: {
    value?: string;
    field: string;
    required: boolean;
  }): QuestionProbeLanguage {
    if (!value && !required) return 'vi';
    if (!value) throw new BadRequestException(`Invalid ${field}`);
    if (QUESTION_PROBE_LANGUAGES.includes(value as QuestionProbeLanguage)) {
      return value as QuestionProbeLanguage;
    }
    throw new BadRequestException(`Invalid ${field}`);
  }

  private _sort(value?: string): 'newest' | 'popular' {
    if (!value) return 'newest';
    if (value === 'newest' || value === 'popular') return value;
    throw new BadRequestException('Invalid sort');
  }

  private _optionalTaxonomy({
    value,
    allowed,
    field,
  }: {
    value?: string;
    allowed: readonly string[];
    field: string;
  }): string | undefined {
    const cleanValue: string | undefined = this._cleanText(value);
    if (!cleanValue) return undefined;
    if (allowed.includes(cleanValue)) return cleanValue;
    throw new BadRequestException(`Invalid ${field}`);
  }

  private _techTag(value?: string): string | undefined {
    const cleanValue: string | undefined = this._cleanText(value);
    const allowed: string[] = QUESTION_BANK_TAXONOMY.techTagGroups.flatMap(
      (group: { tags: string[] }): string[] => group.tags,
    );
    if (!cleanValue) return undefined;
    if (allowed.includes(cleanValue)) return cleanValue;
    throw new BadRequestException('Invalid techTag');
  }

  private _cleanText(value?: string): string | undefined {
    const cleanValue: string | undefined = value?.trim();
    return cleanValue && cleanValue.length > 0 ? cleanValue : undefined;
  }
}
