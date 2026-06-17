import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, QueueEvents } from 'bullmq';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';
import { DocumentJobName } from './enums/document-job-name.enum';
import { DOCUMENT_PARSING_QUEUE } from '../jobs/jobs.constants';
import { DocumentsAiService } from './documents.ai.service';
import { DocumentContextService } from './document-context.service';
import { FitAssessmentService } from './fit-assessment.service';
import { BehaviorCalibrationService } from './behavior-calibration.service';
import { CV_SIGNALS, JD_SIGNALS } from './constants/document-signals.constants';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import type { FitAssessmentV2 } from './types/fit-assessment.types';
import { DOCX_MIME } from './constants/document-file.constants';
import { DOCUMENT_FIT_ASSESSMENT_MODEL } from './constants/document-ai.constants';
import type { DocumentJobPayload } from './types/document-job.types';
import type {
  CvJson,
  DocumentValidationResult,
  JdJson,
} from './types/document-ai.types';

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
    @Inject('DOCUMENT_QUEUE_EVENTS') private queueEvents: QueueEvents,
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
    cvData: {
      name?: string;
      currentTitle?: string;
      seniority?: string;
      totalYearsExperience?: number;
      skills: string[];
      experience: object[];
      education: object[];
      certifications: string[];
      languages: object[];
      domain: string[];
    };
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

      const cvDuplicate = await this.cvRepository.findOne({
        where: { userId, parsedTextHash, processingStatus: 'completed' },
        select: ['id', 'parsedJson'],
      });

      let cvJson: CvJson;
      let cvParseError: string | undefined;
      if (cvDuplicate?.parsedJson) {
        cvJson = cvDuplicate.parsedJson as unknown as CvJson;
        this.logger.log(
          `CV duplicate detected, reusing parsedJson from record ${cvDuplicate.id} userId=${userId}`,
        );
      } else {
        const rawCvJson = await this.aiService.extractCvJson(documentText);
        ({ cvJson, parseError: cvParseError } =
          this.fitAssessmentService.normalizeCvJson(rawCvJson));
      }

      cvRecord.fileUrl = filePath;
      cvRecord.originalName = originalName;
      cvRecord.parsedJson = cvJson;
      cvRecord.processingStatus = 'completed';
      cvRecord.parseError = cvParseError ?? null;
      cvRecord.parsedTextHash = parsedTextHash;
      await this.cvRepository.save(cvRecord);

      await this.syncCvToUserProfile(userId, cvJson);

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
        cvData: {
          name: cvJson.name,
          currentTitle: cvJson.currentTitle,
          seniority: cvJson.seniority,
          totalYearsExperience: cvJson.totalYearsExperience,
          skills: cvJson.skills ?? [],
          experience: cvJson.experience ?? [],
          education: cvJson.education ?? [],
          certifications: cvJson.certifications ?? [],
          languages: cvJson.languages ?? [],
          domain: cvJson.domain ?? [],
        },
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

  async getDocumentContext(
    userId: string,
  ): Promise<{ cv: CvJson | null; jd: JdJson | null }> {
    const context = await this.contextService.getInterviewContext(userId);
    return { cv: context.cv, jd: context.jd };
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
    assessmentStatus: 'not_ready';
    missingSources: string[];
    jdData: JdJson;
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

      const jdDuplicate = await this.jdRepository.findOne({
        where: { userId, parsedTextHash, processingStatus: 'completed' },
        select: ['id', 'parsedJson'],
      });

      let jdJson: JdJson;
      if (jdDuplicate?.parsedJson) {
        jdJson = jdDuplicate.parsedJson as unknown as JdJson;
        this.logger.log(
          `JD duplicate detected, reusing parsedJson from record ${jdDuplicate.id} userId=${userId}`,
        );
      } else {
        const rawJdJson = await this.aiService.extractJdJson(documentText);
        jdJson = this.fitAssessmentService.normalizeJdJson(rawJdJson);
      }

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
      const missingSources: string[] = latestCv?.parsedJson
        ? []
        : ['cv_context'];

      await this.jdRepository.save(jdRecord);

      this.logger.log(
        `JD parsed successfully userId=${userId} recordId=${recordId} textHash=${parsedTextHash}`,
      );
      return {
        status: 'success',
        type: 'JD',
        recordId: jdRecord.id,
        assessmentStatus: 'not_ready',
        missingSources,
        jdData: jdJson,
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
  ): Promise<void> {
    try {
      const cvJson = cvRecord.parsedJson as CvJson;
      const jdJson = jdRecord.parsedJson as JdJson;
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
        requirements,
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

  async updateCvJson(userId: string, cvJson: CvJson): Promise<void> {
    const record = await this.contextService.getLatestCompletedCvRecord(userId);
    if (!record) {
      throw new BadRequestException('No completed CV record found to update.');
    }
    record.parsedJson = cvJson;
    await this.cvRepository.save(record);
    await this.syncCvToUserProfile(userId, cvJson);
  }

  async updateJdJson(userId: string, jdJson: JdJson): Promise<void> {
    const record = await this.contextService.getLatestCompletedJdRecord(userId);
    if (!record) {
      throw new BadRequestException('No completed JD record found to update.');
    }
    record.parsedJson = jdJson;
    await this.jdRepository.save(record);
  }

  async streamParseResult(
    jobId: string,
    _userId: string,
    res: Response,
  ): Promise<void> {
    this._openSseStream(res);
    try {
      const job = await this.documentQueue.getJob(jobId);
      if (!job) {
        this._emitSse(res, { type: 'error', message: 'Job not found' });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await job.waitUntilFinished(
        this.queueEvents,
        5 * 60 * 1000,
      );
      this._emitSse(res, result as object);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Parse failed';
      this._emitSse(res, { type: 'error', message });
    } finally {
      res.end();
    }
  }

  async runCompatibilityAssessment(userId: string): Promise<{
    fitScore: number;
    fitAssessmentSummary: ReturnType<FitAssessmentService['buildSummary']>;
  }> {
    const cvRecord =
      await this.contextService.getLatestCompletedCvRecord(userId);
    const jdRecord =
      await this.contextService.getLatestCompletedJdRecord(userId);
    if (!cvRecord || !jdRecord) {
      throw new BadRequestException('CV và JD là bắt buộc để đánh giá.');
    }

    await this.assessJdFit(jdRecord, cvRecord);
    await this.jdRepository.save(jdRecord);

    const fitAssessment = jdRecord.fitAssessment as FitAssessmentV2;
    const fitAssessmentSummary =
      this.fitAssessmentService.buildSummary(fitAssessment);

    void this.calibrationService.run({
      userId,
      cvId: cvRecord.id,
      jdAnalysisId: jdRecord.id,
      cvJson: cvRecord.parsedJson as CvJson,
      jdJson: jdRecord.parsedJson as JdJson,
      fitAssessment,
    });

    return { fitScore: jdRecord.fitScore ?? 0, fitAssessmentSummary };
  }

  private _openSseStream(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  private _emitSse(res: Response, event: object): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
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
