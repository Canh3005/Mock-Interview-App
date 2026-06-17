import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserCv } from '../users/entities/user-cv.entity';
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
  ) {}

  async getLatestCvContext(userId: string): Promise<ActiveContext<CvJson>> {
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

  async saveContextOverride(
    userId: string,
    context: { cv?: CvJson; jd?: JdJson },
  ): Promise<void> {
    const updates: Promise<unknown>[] = [];

    if (context.cv) {
      const cvRecord = await this.getLatestCompletedCvRecord(userId);
      if (cvRecord) {
        cvRecord.parsedJson = context.cv as unknown as Record<string, unknown>;
        updates.push(this.cvRepository.save(cvRecord));
      }
    }

    if (context.jd) {
      const jdRecord = await this.getLatestCompletedJdRecord(userId);
      if (jdRecord) {
        jdRecord.parsedJson = context.jd as unknown as Record<string, unknown>;
        updates.push(this.jdRepository.save(jdRecord));
      }
    }

    await Promise.all(updates);
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
