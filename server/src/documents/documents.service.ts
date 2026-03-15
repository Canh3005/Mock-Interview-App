import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import Redis from 'ioredis';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import { DocumentJobName } from './enums/document-job-name.enum';
import { DOCUMENT_PARSING_QUEUE } from '../jobs/jobs.constants';
import {
  DocumentsAiService,
  CvJson,
  DocumentValidationResult,
} from './documents.ai.service';
import { CV_SIGNALS, JD_SIGNALS } from './constants/document-signals.constants';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserProfile } from '../users/entities/user-profile.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private redisClient: Redis;

  constructor(
    @InjectQueue(DOCUMENT_PARSING_QUEUE) private documentQueue: Queue,
    @InjectRepository(UserCv) private cvRepository: Repository<UserCv>,
    @InjectRepository(JdAnalysis)
    private jdRepository: Repository<JdAnalysis>,
    private configService: ConfigService,
    private aiService: DocumentsAiService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST') || '127.0.0.1',
      port: this.configService.get('REDIS_PORT') || 6379,
    });
  }

  async queueDocumentForParsing(
    userId: string,
    file: Express.Multer.File,
    type: DocumentUploadType,
  ) {
    const extractedText = await this.extractTextFromFile(
      file.path,
      file.mimetype,
      file.originalname,
    );
    console.log('Extracted text:', extractedText);
    await this.validateUploadedDocumentContent(
      extractedText,
      type,
      file.originalname,
    );

    const jobData = {
      userId,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      type,
      extractedText,
    };

    const jobName =
      type === DocumentUploadType.CV
        ? DocumentJobName.PARSE_CV
        : DocumentJobName.PARSE_JD;

    const job = await this.documentQueue.add(jobName, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(
      `Queued document parse job ${job.id} for user ${userId} (Type: ${type})`,
    );

    return {
      message: 'Document uploaded and is being processed by AI.',
      jobId: job.id,
      status: 'processing',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.documentQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress;
    const result: unknown = job.returnvalue;

    return {
      id: job.id,
      status: state,
      progress,
      result,
      failedReason: job.failedReason,
    };
  }

  async extractTextFromFile(
    filePath: string,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const isDocx =
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.toLowerCase().endsWith('.docx');

    if (isDocx) {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      if (result.messages.length > 0) {
        this.logger.warn(
          `mammoth warnings for ${originalName}: ${result.messages.map((m) => m.message).join('; ')}`,
        );
      }
      return result.value;
    }

    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  }

  private normalizeExtractedText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private countKeywordHits(text: string, signals: string[]): number {
    return signals.filter((signal) => text.includes(signal)).length;
  }

  private buildValidationErrorMessage(
    expectedType: DocumentUploadType,
    validation: DocumentValidationResult,
  ): string {
    if (validation.detectedType === 'OTHER') {
      return `The uploaded file does not look like a valid ${expectedType}. ${validation.reason}`;
    }

    return `The uploaded file appears to be a ${validation.detectedType}, not a ${expectedType}. ${validation.reason}`;
  }

  private async validateUploadedDocumentContent(
    extractedText: string,
    expectedType: DocumentUploadType,
    originalName: string,
  ): Promise<void> {
    const normalizedText = this.normalizeExtractedText(extractedText);

    if (normalizedText.length < 120) {
      throw new BadRequestException(
        'The uploaded file does not contain enough readable text to verify it as a CV or JD.',
      );
    }

    const lowerText = normalizedText.toLowerCase();
    const cvHits = this.countKeywordHits(lowerText, CV_SIGNALS);
    const jdHits = this.countKeywordHits(lowerText, JD_SIGNALS);
    console.log(
      `Keyword hits for ${originalName}: CV signals=${cvHits}, JD signals=${jdHits}`,
    );
    if (cvHits === 0 && jdHits === 0) {
      throw new BadRequestException(
        'The uploaded file does not appear to be a CV or a job description.',
      );
    }

    const validation = await this.aiService.validateDocumentType(
      normalizedText.slice(0, 12000),
      expectedType,
    );

    if (!validation.isRelevant) {
      this.logger.warn(
        `Rejected document ${originalName}. Expected ${expectedType}, detected ${validation.detectedType}, confidence ${validation.confidence}.`,
      );
      throw new BadRequestException(
        this.buildValidationErrorMessage(expectedType, validation),
      );
    }
  }

  async parseCv(
    userId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
    extractedText?: string,
  ): Promise<{ status: string; type: string; recordId: string }> {
    const documentText =
      extractedText ||
      (await this.extractTextFromFile(filePath, mimeType, originalName));
    const cvJson = await this.aiService.extractCvJson(documentText);
    this.logger.log('CV JSON extracted successfully');

    let cvRecord = await this.cvRepository.findOne({ where: { userId } });
    if (cvRecord) {
      cvRecord.fileUrl = filePath;
      cvRecord.originalName = originalName;
      cvRecord.parsedJson = cvJson;
    } else {
      cvRecord = this.cvRepository.create({
        userId,
        fileUrl: filePath,
        originalName,
        parsedJson: cvJson,
      });
    }
    await this.cvRepository.save(cvRecord);

    await this.redisClient.set(
      `cv_context:${userId}`,
      JSON.stringify(cvJson),
      'EX',
      86400 * 7,
    );

    // AUTO-SYNC to User Profile
    try {
      const userProfileRepo =
        this.cvRepository.manager.getRepository(UserProfile);
      const profile = await userProfileRepo.findOne({
        where: { user: { id: userId } },
      });

      const flatTechStack = [
        ...(cvJson.skills?.languages || []),
        ...(cvJson.skills?.frameworks || []),
        ...(cvJson.skills?.tools || []),
      ];

      if (profile) {
        profile.techStack = Array.from(
          new Set([...(profile.techStack || []), ...flatTechStack]),
        );
        profile.experience = cvJson.experiences || [];
        if (!profile.role && cvJson.experiences?.length > 0) {
          profile.role = cvJson.experiences[0].role;
        }
        await userProfileRepo.save(profile);
        this.logger.log(`Auto-synced CV data to UserProfile for ${userId}`);
      }
    } catch (syncErr: unknown) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      this.logger.error(`Failed to auto-sync profile: ${msg}`);
    }

    this.logger.log(`CV parsed and cached successfully for user ${userId}`);
    return { status: 'success', type: 'CV', recordId: cvRecord.id };
  }

  async parseJd(
    userId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
    extractedText?: string,
  ): Promise<{
    status: string;
    type: string;
    recordId: string;
    fitScore?: number;
    gapAnalysis: unknown;
  }> {
    const documentText =
      extractedText ||
      (await this.extractTextFromFile(filePath, mimeType, originalName));
    const jdJson = await this.aiService.extractJdJson(documentText);

    let fitScore: number | undefined;
    let matchReport: unknown;

    const cachedCv = await this.redisClient.get(`cv_context:${userId}`);
    if (cachedCv) {
      const assessment = await this.aiService.assessFitScore(
        JSON.parse(cachedCv) as CvJson,
        jdJson,
      );
      fitScore = assessment.fit_score;
      matchReport = assessment.gap_analysis;
    }

    const jdRecord = this.jdRepository.create({
      userId,
      fileUrl: filePath,
      originalName,
      parsedJson: jdJson,
      fitScore,
      matchReport,
    });
    await this.jdRepository.save(jdRecord);

    await this.redisClient.set(
      `jd_context:${userId}`,
      JSON.stringify(jdJson),
      'EX',
      86400 * 7,
    );
    this.logger.log(`JD parsed and cached successfully for user ${userId}`);
    return {
      status: 'success',
      type: 'JD',
      recordId: jdRecord.id,
      fitScore,
      gapAnalysis: matchReport,
    };
  }
}
