import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import {
  QUESTION_PROBE_LANGUAGES,
  QuestionProbeLanguage,
} from '../../constants/question-bank-taxonomy.constants';
import { PUBLIC_QUESTION_BANK_DETAIL_CACHE_TTL_SECONDS } from '../../constants/question-bank-public.constants';
import {
  QuestionProbe,
  QuestionProbeLocalizedContent,
} from '../../entities/question-probe.entity';
import { QuestionBankPublicProjectionService } from './question-bank-public-projection.service';
import {
  PublicProbeDetailRequest,
  PublicQuestionProbeCard,
  PublicQuestionProbeDetail,
} from '../../types/question-bank-public.types';
import { QuestionBankRelatedService } from './question-bank-related.service';

@Injectable()
export class QuestionBankDetailService {
  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    private readonly projectionService: QuestionBankPublicProjectionService,
    private readonly relatedService: QuestionBankRelatedService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getPublicProbeDetail({
    probeId,
    query,
  }: {
    probeId: string;
    query: PublicProbeDetailRequest;
  }): Promise<PublicQuestionProbeDetail> {
    const locale: QuestionProbeLanguage = this._language({
      value: query.locale,
      field: 'locale',
      required: false,
    });
    const relatedLimit: number = this._nonNegativeInteger({
      value: query.relatedLimit,
      field: 'relatedLimit',
      defaultValue: 4,
      maxValue: 6,
    });

    this.probeRepository
      .increment({ id: probeId }, 'viewCount', 1)
      .catch(() => {});

    const cacheKey = `qbank:detail:${probeId}:${locale}:${relatedLimit}`;
    const cached: string | null = await this.redis
      .get(cacheKey)
      .catch(() => null);
    if (cached) return JSON.parse(cached) as PublicQuestionProbeDetail;

    const probe: QuestionProbe | null = await this.probeRepository.findOne({
      where: { id: probeId, status: 'active' },
    });
    if (!probe) throw new NotFoundException('Question probe not found');

    const card: PublicQuestionProbeCard = this.projectionService.toPublicCard({
      probe,
      locale,
    });
    const content: QuestionProbeLocalizedContent | null =
      this.projectionService.contentForLocale({
        probe,
        locale: card.resolvedLocale,
      });
    const relatedQuestions: PublicQuestionProbeCard[] =
      await this.relatedService.findRelatedQuestions({
        probe,
        locale,
        relatedLimit,
      });

    const detail: PublicQuestionProbeDetail = {
      ...card,
      guidance: content?.guidance ?? [],
      commonMistakes: content?.commonMistakes ?? [],
      relatedQuestions,
    };

    this.redis
      .set(
        cacheKey,
        JSON.stringify(detail),
        'EX',
        PUBLIC_QUESTION_BANK_DETAIL_CACHE_TTL_SECONDS,
      )
      .catch(() => {});

    return detail;
  }

  private _nonNegativeInteger({
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
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    if (maxValue !== undefined && parsed > maxValue) return maxValue;
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
}
