import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentUploadType } from './enums/document-upload-type.enum';
import { DocumentContextOverride } from './entities/document-context-override.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserCv } from '../users/entities/user-cv.entity';
import { RedisService } from '../common/redis.service';
import { CONTEXT_TTL_SECONDS } from './constants/document-context.constants';
import type {
  ActiveContext,
  InterviewDocumentContext,
} from './types/document-context.types';
import type { CvJson, JdJson } from './types/document-ai.types';

@Injectable()
export class DocumentContextService {
  constructor(
    @InjectRepository(UserCv)
    private readonly cvRepository: Repository<UserCv>,
    @InjectRepository(JdAnalysis)
    private readonly jdRepository: Repository<JdAnalysis>,
    @InjectRepository(DocumentContextOverride)
    private readonly overrideRepository: Repository<DocumentContextOverride>,
    private readonly redisService: RedisService,
  ) {}

  private get redisClient() {
    return this.redisService.redis;
  }

  async getLatestCvContext(userId: string): Promise<ActiveContext<CvJson>> {
    const override = await this.overrideRepository.findOne({
      where: { userId },
    });
    if (override?.cvJson) {
      return {
        json: override.cvJson as unknown as CvJson,
        source: 'override',
      };
    }

    const record = await this.getLatestCompletedCvRecord(userId);
    if (!record?.parsedJson) {
      return { json: null, source: 'missing' };
    }

    return {
      json: record.parsedJson as CvJson,
      source: 'db',
      recordId: record.id,
    };
  }

  async getLatestJdContext(userId: string): Promise<ActiveContext<JdJson>> {
    const override = await this.overrideRepository.findOne({
      where: { userId },
    });
    if (override?.jdJson) {
      return {
        json: override.jdJson as unknown as JdJson,
        source: 'override',
      };
    }

    const record = await this.getLatestCompletedJdRecord(userId);
    if (!record?.parsedJson) {
      return { json: null, source: 'missing' };
    }

    return {
      json: record.parsedJson as JdJson,
      source: 'db',
      recordId: record.id,
    };
  }

  async getInterviewContext(userId: string): Promise<InterviewDocumentContext> {
    const [cvContext, jdContext] = await Promise.all([
      this.getLatestCvContext(userId),
      this.getLatestJdContext(userId),
    ]);

    const missing: string[] = [];
    if (!cvContext.json) missing.push('cv_context');
    if (!jdContext.json) missing.push('jd_context');

    await this.refreshRedisContext(userId, {
      cv: cvContext.json,
      jd: jdContext.json,
    });

    return {
      cv: cvContext.json,
      jd: jdContext.json,
      missing,
      sources: {
        cv: cvContext.source,
        jd: jdContext.source,
      },
    };
  }

  async refreshRedisContext(
    userId: string,
    context?: { cv: CvJson | null; jd: JdJson | null },
  ): Promise<void> {
    let resolved = context;
    if (!resolved) {
      const [cvContext, jdContext] = await Promise.all([
        this.getLatestCvContext(userId),
        this.getLatestJdContext(userId),
      ]);
      resolved = {
        cv: cvContext.json,
        jd: jdContext.json,
      };
    }

    const pipeline = this.redisClient.pipeline();
    if (resolved.cv) {
      pipeline.set(
        `cv_context:${userId}`,
        JSON.stringify(resolved.cv),
        'EX',
        CONTEXT_TTL_SECONDS,
      );
    } else {
      pipeline.del(`cv_context:${userId}`);
    }

    if (resolved.jd) {
      pipeline.set(
        `jd_context:${userId}`,
        JSON.stringify(resolved.jd),
        'EX',
        CONTEXT_TTL_SECONDS,
      );
    } else {
      pipeline.del(`jd_context:${userId}`);
    }

    await pipeline.exec();
  }

  async saveContextOverride(
    userId: string,
    context: { cv?: CvJson; jd?: JdJson },
  ): Promise<void> {
    let override = await this.overrideRepository.findOne({ where: { userId } });
    if (!override) {
      override = this.overrideRepository.create({
        userId,
        updatedByUser: true,
      });
    }

    const now = new Date();
    if (context.cv) {
      override.cvJson = context.cv as unknown as Record<string, unknown>;
      override.cvUpdatedAt = now;
    }
    if (context.jd) {
      override.jdJson = context.jd as unknown as Record<string, unknown>;
      override.jdUpdatedAt = now;
    }
    override.updatedByUser = true;

    await this.overrideRepository.save(override);
    await this.refreshRedisContext(userId, {
      cv: context.cv ?? (await this.getLatestCvContext(userId)).json,
      jd: context.jd ?? (await this.getLatestJdContext(userId)).json,
    });
  }

  async clearOverrideForType(
    userId: string,
    type: DocumentUploadType,
  ): Promise<void> {
    const override = await this.overrideRepository.findOne({
      where: { userId },
    });
    if (!override) return;

    if (type === DocumentUploadType.CV) {
      override.cvJson = null;
      override.cvUpdatedAt = null;
    } else {
      override.jdJson = null;
      override.jdUpdatedAt = null;
    }

    if (!override.cvJson && !override.jdJson) {
      await this.overrideRepository.remove(override);
    } else {
      await this.overrideRepository.save(override);
    }
  }

  async getLatestCompletedCvRecord(userId: string): Promise<UserCv | null> {
    return this.cvRepository
      .createQueryBuilder('cv')
      .where('cv.userId = :userId', { userId })
      .andWhere('cv.parsedJson IS NOT NULL')
      .andWhere(
        '(cv.processingStatus IS NULL OR cv.processingStatus = :completed)',
        { completed: 'completed' },
      )
      .orderBy('cv.updatedAt', 'DESC')
      .getOne();
  }

  async getLatestCompletedJdRecord(userId: string): Promise<JdAnalysis | null> {
    return this.jdRepository
      .createQueryBuilder('jd')
      .where('jd.userId = :userId', { userId })
      .andWhere('jd.parsedJson IS NOT NULL')
      .andWhere(
        '(jd.processingStatus IS NULL OR jd.processingStatus = :completed)',
        { completed: 'completed' },
      )
      .orderBy('jd.updatedAt', 'DESC')
      .getOne();
  }
}
