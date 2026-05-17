import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import { DocumentJobName } from './enums/document-job-name.enum';
import { DOCUMENT_PARSING_QUEUE } from '../jobs/jobs.constants';
import {
  CvJson,
  DOCUMENT_FIT_ASSESSMENT_MODEL,
  DocumentValidationResult,
  DocumentsAiService,
  JdJson,
} from './documents.ai.service';
import { DocumentContextService } from './document-context.service';
import { FitAssessmentService } from './fit-assessment.service';
import { BehaviorCalibrationService } from './behavior-calibration.service';
import { CV_SIGNALS, JD_SIGNALS } from './constants/document-signals.constants';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { FitAssessmentV2 } from './types/fit-assessment.types';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface DocumentJobPayload {
  userId: string;
  recordId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  type: DocumentUploadType;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectQueue(DOCUMENT_PARSING_QUEUE) private documentQueue: Queue,
    @InjectRepository(UserCv) private cvRepository: Repository<UserCv>,
    @InjectRepository(JdAnalysis)
    private jdRepository: Repository<JdAnalysis>,
    private aiService: DocumentsAiService,
    private contextService: DocumentContextService,
    private fitAssessmentService: FitAssessmentService,
    private calibrationService: BehaviorCalibrationService,
  ) {}

  async queueDocumentForParsing(
    userId: string,
    file: Express.Multer.File,
    type: DocumentUploadType,
  ) {
    try {
      this.validateUploadedFileType(file);
    } catch (error) {
      await this.cleanupUploadedFile(file.path);
      throw error;
    }

    const record = await this.createProcessingRecord(userId, file, type);
    const jobName =
      type === DocumentUploadType.CV
        ? DocumentJobName.PARSE_CV
        : DocumentJobName.PARSE_JD;

    const jobData: DocumentJobPayload = {
      userId,
      recordId: record.id,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      type,
    };

    try {
      const job = await this.documentQueue.add(jobName, jobData, {
        attempts: 1,
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 86400 * 7,
          count: 1000,
        },
      });

      this.logger.log(
        `Queued document parse job ${job.id} for user ${userId} type=${type} recordId=${record.id}`,
      );

      return {
        message: 'Document uploaded and is being processed by AI.',
        jobId: job.id,
        recordId: record.id,
        status: 'processing',
      };
    } catch (error) {
      await this.markRecordFailed(type, record.id, userId, error);
      await this.cleanupUploadedFile(file.path);
      throw error;
    }
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

  async cleanupUploadedFile(filePath: string): Promise<void> {
    const target = path.resolve(filePath);
    const uploadRoot = path.resolve(process.cwd(), 'uploads');
    const isInsideUploadRoot =
      target === uploadRoot || target.startsWith(`${uploadRoot}${path.sep}`);
    if (!isInsideUploadRoot) {
      this.logger.warn(`Skipped upload cleanup outside upload root: ${target}`);
      return;
    }

    try {
      await fs.promises.unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to cleanup uploaded file: ${target}`);
      }
    }
  }

  async extractTextFromFile(
    filePath: string,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const isDocx =
      mimeType === DOCX_MIME || originalName.toLowerCase().endsWith('.docx');

    if (isDocx) {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      if (result.messages.length > 0) {
        this.logger.warn(
          `DOCX parser produced ${result.messages.length} warning(s).`,
        );
      }
      return result.value;
    }

    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  }

  async parseCv(
    userId: string,
    recordId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
  ): Promise<{
    status: string;
    type: string;
    recordId: string;
    missingSources: string[];
    calibrationStatus: 'not_started';
    behaviorSummary: null;
  }> {
    let parsedTextHash: string | null = null;

    try {
      const cvRecord = await this.getCvRecordOrThrow(recordId, userId);
      const documentText = await this.extractTextFromFile(
        filePath,
        mimeType,
        originalName,
      );
      await this.validateUploadedDocumentContent(
        documentText,
        DocumentUploadType.CV,
      );
      parsedTextHash = this.hashExtractedText(documentText);
      const rawCvJson = await this.aiService.extractCvJson(documentText);
      const { cvJson, parseError: cvParseError } =
        this.fitAssessmentService.normalizeCvJson(rawCvJson);
      cvRecord.fileUrl = filePath;
      cvRecord.originalName = originalName;
      cvRecord.parsedJson = cvJson;
      cvRecord.processingStatus = 'completed';
      cvRecord.parseError = cvParseError ?? null;
      cvRecord.parsedTextHash = parsedTextHash;
      await this.cvRepository.save(cvRecord);

      await this.contextService.clearOverrideForType(
        userId,
        DocumentUploadType.CV,
      );
      await this.contextService.refreshRedisContext(userId);
      await this.syncCvToUserProfile(userId, cvJson);

      const latestJdForBc =
        await this.contextService.getLatestCompletedJdRecord(userId);
      const jdJsonForBc = latestJdForBc?.parsedJson as JdJson | undefined;
      const fitAssessmentForBc = latestJdForBc?.fitAssessment as
        | FitAssessmentV2
        | undefined;
      void this.calibrationService.run({
        userId,
        cvId: cvRecord.id,
        jdAnalysisId: latestJdForBc?.id ?? null,
        cvJson,
        jdJson: jdJsonForBc ?? null,
        fitAssessment: fitAssessmentForBc ?? null,
      });

      const hasLatestJd =
        await this.contextService.getLatestCompletedJdRecord(userId);
      const missingSources: string[] = hasLatestJd ? [] : ['jd_context'];

      this.logger.log(
        `CV parsed successfully userId=${userId} recordId=${recordId} textHash=${parsedTextHash}`,
      );
      return {
        status: 'success',
        type: 'CV',
        recordId: cvRecord.id,
        missingSources,
        calibrationStatus: 'not_started' as const,
        behaviorSummary: null,
      };
    } catch (error) {
      await this.markRecordFailed(
        DocumentUploadType.CV,
        recordId,
        userId,
        error,
        parsedTextHash,
      );
      throw new Error(this.toSafeErrorMessage(error));
    }
  }

  async getAssessmentHistory(userId: string) {
    const records = await this.jdRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return records
      .filter((record) => record.assessmentStatus === 'completed')
      .map((record) => {
        const fitAssessment = record.fitAssessment as FitAssessmentV2 | null;
        return {
          id: record.id,
          originalName: record.originalName,
          fitScore: record.fitScore,
          matchReport: record.matchReport as unknown,
          fitAssessmentSummary:
            this.fitAssessmentService.buildSummary(fitAssessment),
          confidence: record.assessmentConfidence,
          scoringVersion: record.scoringVersion,
          createdAt: record.createdAt,
        };
      });
  }

  async getCalibrationLatest(userId: string) {
    const profile = await this.calibrationService.getLatestForUser(userId);
    const missing: string[] = [];
    if (!profile) return { status: 'not_started', summary: null };

    const cvCtx = await this.contextService.getLatestCvContext(userId);
    const jdCtx = await this.contextService.getLatestJdContext(userId);
    if (!cvCtx.json) missing.push('cv_context');
    if (!jdCtx.json) missing.push('jd_context');

    return {
      status: profile.status,
      summary: this.calibrationService.buildSummary(profile, missing),
    };
  }

  async deleteAssessment(userId: string, assessmentId: string) {
    const record = await this.jdRepository.findOne({
      where: { id: assessmentId, userId },
    });
    if (!record) {
      throw new BadRequestException('Assessment not found.');
    }
    await this.jdRepository.remove(record);
    return { message: 'Assessment deleted.' };
  }

  async parseJd(
    userId: string,
    recordId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
  ): Promise<{
    status: string;
    type: string;
    recordId: string;
    fitScore?: number | null;
    gapAnalysis: unknown;
    fitAssessment?: FitAssessmentV2;
    fitAssessmentSummary?: unknown;
    assessmentStatus: 'not_ready' | 'completed' | 'failed';
    assessmentError?: string | null;
    calibrationStatus: 'not_started';
    behaviorSummary: null;
    missingSources: string[];
  }> {
    let parsedTextHash: string | null = null;

    try {
      const jdRecord = await this.getJdRecordOrThrow(recordId, userId);
      const documentText = await this.extractTextFromFile(
        filePath,
        mimeType,
        originalName,
      );
      await this.validateUploadedDocumentContent(
        documentText,
        DocumentUploadType.JD,
      );
      parsedTextHash = this.hashExtractedText(documentText);

      const rawJdJson = await this.aiService.extractJdJson(documentText);
      const jdJson = this.fitAssessmentService.normalizeJdJson(rawJdJson);

      jdRecord.fileUrl = filePath;
      jdRecord.originalName = originalName;
      jdRecord.parsedJson = jdJson;
      jdRecord.processingStatus = 'completed';
      jdRecord.parseError = null;
      jdRecord.parsedTextHash = parsedTextHash;
      jdRecord.assessmentStatus = 'not_ready';
      jdRecord.assessmentError = null;

      const latestCv =
        await this.contextService.getLatestCompletedCvRecord(userId);
      const missingSources: string[] = [];

      if (latestCv?.parsedJson) {
        await this.assessJdFit(jdRecord, latestCv, jdJson);
      } else {
        missingSources.push('cv_context');
      }

      await this.jdRepository.save(jdRecord);
      await this.contextService.clearOverrideForType(
        userId,
        DocumentUploadType.JD,
      );
      await this.contextService.refreshRedisContext(userId);

      const cvJsonForBc = latestCv?.parsedJson as CvJson | undefined;
      const fitAssessmentForBc = jdRecord.fitAssessment as
        | FitAssessmentV2
        | undefined;
      void this.calibrationService.run({
        userId,
        cvId: latestCv?.id ?? null,
        jdAnalysisId: jdRecord.id,
        cvJson: cvJsonForBc ?? null,
        jdJson,
        fitAssessment: fitAssessmentForBc ?? null,
      });

      const fitAssessment = jdRecord.fitAssessment as
        | FitAssessmentV2
        | undefined;
      const fitAssessmentSummary =
        this.fitAssessmentService.buildSummary(fitAssessment);

      this.logger.log(
        `JD parsed successfully userId=${userId} recordId=${recordId} textHash=${parsedTextHash} assessmentStatus=${jdRecord.assessmentStatus}`,
      );
      return {
        status: 'success',
        type: 'JD',
        recordId: jdRecord.id,
        fitScore: jdRecord.fitScore,
        gapAnalysis: jdRecord.matchReport,
        fitAssessment,
        fitAssessmentSummary: fitAssessmentSummary ?? undefined,
        assessmentStatus: jdRecord.assessmentStatus,
        assessmentError: jdRecord.assessmentError,
        calibrationStatus: 'not_started',
        behaviorSummary: null,
        missingSources,
      };
    } catch (error) {
      await this.markRecordFailed(
        DocumentUploadType.JD,
        recordId,
        userId,
        error,
        parsedTextHash,
      );
      throw new Error(this.toSafeErrorMessage(error));
    }
  }

  private async assessJdFit(
    jdRecord: JdAnalysis,
    cvRecord: UserCv,
    jdJson: JdJson,
  ): Promise<void> {
    try {
      const cvJson = cvRecord.parsedJson as CvJson;
      const requirements =
        this.fitAssessmentService.buildNormalizedJdRequirements(jdJson);
      const rubric = await this.aiService.assessFitRubric(
        cvJson,
        jdJson,
        requirements,
      );
      const fitAssessment = this.fitAssessmentService.buildFitAssessment({
        cvJson,
        jdJson,
        rubric,
        model: DOCUMENT_FIT_ASSESSMENT_MODEL,
      });

      jdRecord.fitAssessment = fitAssessment;
      jdRecord.fitScore = fitAssessment.finalScore;
      jdRecord.matchReport =
        this.fitAssessmentService.buildLegacyMatchReport(fitAssessment);
      jdRecord.scoringVersion = fitAssessment.scoringVersion;
      jdRecord.assessmentModel = fitAssessment.model;
      jdRecord.assessmentConfidence = fitAssessment.confidence;
      jdRecord.assessmentStatus = 'completed';
      jdRecord.assessmentError = null;
      jdRecord.cvId = cvRecord.id;
    } catch (error) {
      jdRecord.assessmentStatus = 'failed';
      jdRecord.assessmentError = this.toSafeErrorMessage(error);
      jdRecord.fitAssessment = null;
      jdRecord.fitScore = null;
      jdRecord.matchReport = null;
    }
  }

  private async createProcessingRecord(
    userId: string,
    file: Express.Multer.File,
    type: DocumentUploadType,
  ): Promise<UserCv | JdAnalysis> {
    if (type === DocumentUploadType.CV) {
      return this.cvRepository.save(
        this.cvRepository.create({
          userId,
          fileUrl: file.path,
          originalName: file.originalname,
          processingStatus: 'processing',
          parseError: null,
          parsedJson: null,
        }),
      );
    }

    return this.jdRepository.save(
      this.jdRepository.create({
        userId,
        fileUrl: file.path,
        originalName: file.originalname,
        processingStatus: 'processing',
        parseError: null,
        parsedJson: null,
        assessmentStatus: 'not_ready',
      }),
    );
  }

  private validateUploadedFileType(file: Express.Multer.File): void {
    const extension = path.extname(file.originalname).toLowerCase();
    const isPdf = extension === '.pdf' && file.mimetype === 'application/pdf';
    const isDocx = extension === '.docx' && file.mimetype === DOCX_MIME;

    if (!isPdf && !isDocx) {
      throw new BadRequestException('Only PDF and DOCX files are supported.');
    }
  }

  private normalizeExtractedText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private hashExtractedText(text: string): string {
    return createHash('sha256')
      .update(this.normalizeExtractedText(text))
      .digest('hex');
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
    this.logger.log(
      `Document signal hits expectedType=${expectedType} cvSignals=${cvHits} jdSignals=${jdHits}`,
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
        `Rejected document. Expected ${expectedType}, detected ${validation.detectedType}, confidence ${validation.confidence}.`,
      );
      throw new BadRequestException(
        this.buildValidationErrorMessage(expectedType, validation),
      );
    }
  }

  private async getCvRecordOrThrow(
    recordId: string,
    userId: string,
  ): Promise<UserCv> {
    const record = await this.cvRepository.findOne({
      where: { id: recordId, userId },
    });
    if (!record) throw new BadRequestException('CV record not found.');
    return record;
  }

  private async getJdRecordOrThrow(
    recordId: string,
    userId: string,
  ): Promise<JdAnalysis> {
    const record = await this.jdRepository.findOne({
      where: { id: recordId, userId },
    });
    if (!record) throw new BadRequestException('JD record not found.');
    return record;
  }

  private async markRecordFailed(
    type: DocumentUploadType,
    recordId: string,
    userId: string,
    error: unknown,
    parsedTextHash?: string | null,
  ): Promise<void> {
    const parseError = this.toSafeErrorMessage(error);

    if (type === DocumentUploadType.CV) {
      await this.cvRepository.update(
        { id: recordId, userId },
        {
          processingStatus: 'failed',
          parseError,
          parsedTextHash: parsedTextHash ?? undefined,
        },
      );
      return;
    }

    await this.jdRepository.update(
      { id: recordId, userId },
      {
        processingStatus: 'failed',
        parseError,
        parsedTextHash: parsedTextHash ?? undefined,
        assessmentStatus: 'failed',
        assessmentError: parseError,
      },
    );
  }

  private async syncCvToUserProfile(
    userId: string,
    cvJson: CvJson,
  ): Promise<void> {
    try {
      const userProfileRepo =
        this.cvRepository.manager.getRepository(UserProfile);
      const profile = await userProfileRepo.findOne({
        where: { user: { id: userId } },
      });

      if (profile) {
        profile.techStack = Array.from(
          new Set([...(profile.techStack || []), ...(cvJson.skills || [])]),
        );
        profile.experience = cvJson.experience || [];
        profile.education = cvJson.education || [];
        profile.languages = cvJson.languages || [];
        if (!profile.role) {
          profile.role =
            cvJson.currentTitle ?? cvJson.experience?.[0]?.title ?? null;
        }
        if (
          !profile.seniority &&
          cvJson.seniority &&
          cvJson.seniority !== 'unknown'
        ) {
          profile.seniority = cvJson.seniority;
        }
        await userProfileRepo.save(profile);
        this.logger.log(`Auto-synced CV data to UserProfile for ${userId}`);
      }
    } catch (syncErr: unknown) {
      const msg =
        syncErr instanceof Error ? syncErr.message : 'Unknown sync error';
      this.logger.error(`Failed to auto-sync profile: ${msg}`);
    }
  }

  private toSafeErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response.message;
      }
      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        Array.isArray(response.message)
      ) {
        return response.message.join(', ');
      }
    }

    return 'Document processing failed. Please verify the file and try again.';
  }
}
