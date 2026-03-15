import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DocumentUploadType } from './enums/document-upload-type.enum.js';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(@InjectQueue('document-parsing') private documentQueue: Queue) {}

  async queueDocumentForParsing(
    userId: string,
    file: Express.Multer.File,
    type: DocumentUploadType,
  ) {
    const jobData = {
      userId,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      type, // 'CV' or 'JD'
    };

    const job = await this.documentQueue.add('parse-document', jobData, {
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

    // Check state (active, completed, failed, etc.)
    const state = await job.getState();
    const progress = job.progress;
    const result: unknown = job.returnvalue;

    return {
      id: job.id,
      status: state, // e.g., 'completed', 'failed', 'active', 'waiting'
      progress,
      result, // The { status, type, recordId, fitScore } from processor
      failedReason: job.failedReason,
    };
  }
}
