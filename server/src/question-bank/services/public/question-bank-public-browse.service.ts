import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  QUESTION_BANK_TAXONOMY,
  QUESTION_PROBE_COMPETENCIES,
  QUESTION_PROBE_LANGUAGES,
  QUESTION_PROBE_LEVELS,
  QUESTION_PROBE_ROLE_FAMILIES,
  QUESTION_PROBE_STAGES,
  QUESTION_PROBE_TYPES,
  QuestionProbeLanguage,
} from '../../constants/question-bank-taxonomy.constants';
import { QuestionProbe } from '../../entities/question-probe.entity';
import { QuestionBankPublicProjectionService } from './question-bank-public-projection.service';
import {
  PublicProbeListQuery,
  PublicProbeListRequest,
  PublicQuestionProbeCard,
  PublicQuestionProbeListResponse,
} from '../../types/question-bank-public.types';

const PUBLIC_QUESTION_BANK_PAGE_SIZE = 12;

@Injectable()
export class QuestionBankPublicBrowseService {
  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    private readonly projectionService: QuestionBankPublicProjectionService,
  ) {}

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
        this.projectionService.toPublicCard({
          probe,
          locale: normalized.locale,
        }),
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
      defaultValue: PUBLIC_QUESTION_BANK_PAGE_SIZE,
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
      stage: this._optionalTaxonomy({
        value: request.stage,
        allowed: QUESTION_PROBE_STAGES,
        field: 'stage',
      }),
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
      techTags: this._techTags(request.techTags ?? request.techTag),
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
    if (query.stage) qb.andWhere(':stage = ANY(probe.stages)', query);
    if (query.roleFamily) {
      qb.andWhere(':roleFamily = ANY(probe.roleFamilies)', query);
    }
    if (query.level) qb.andWhere(':level = ANY(probe.levels)', query);
    if (query.type) qb.andWhere('probe.type = :type', query);
    if (query.competency) {
      qb.andWhere(':competency = ANY(probe.competencies)', query);
    }
    if (query.techTags.length > 0) {
      qb.andWhere('probe.techTags && :techTags', {
        techTags: query.techTags,
      });
    }
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

  private _techTags(value?: string | string[]): string[] {
    const cleanValues: string[] = (Array.isArray(value) ? value : [value])
      .flatMap((item: string | undefined): string[] =>
        item ? item.split(',') : [],
      )
      .map((item: string): string => item.trim())
      .filter((item: string): boolean => item.length > 0);
    const allowed: string[] = QUESTION_BANK_TAXONOMY.techTagGroups.flatMap(
      (group: { tags: string[] }): string[] => group.tags,
    );
    const uniqueValues: string[] = [...new Set(cleanValues)];
    if (uniqueValues.every((item: string): boolean => allowed.includes(item))) {
      return uniqueValues;
    }
    throw new BadRequestException('Invalid techTags');
  }

  private _cleanText(value?: string): string | undefined {
    const cleanValue: string | undefined = value?.trim();
    return cleanValue && cleanValue.length > 0 ? cleanValue : undefined;
  }
}
