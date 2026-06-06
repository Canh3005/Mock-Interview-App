import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DocumentUploadType } from '../../documents/enums/document-upload-type.enum';
import { DocumentJobName } from '../../documents/enums/document-job-name.enum';
import { DOCUMENT_PARSING_QUEUE } from '../jobs.constants';
import { DocumentsService } from '../../documents/documents.service';

interface DocumentJobData {
  userId: string;
  recordId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
  type: DocumentUploadType;
}

@Processor(DOCUMENT_PARSING_QUEUE)
export class DocumentWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentWorker.name);

  constructor(
    private readonly documentsService: DocumentsService,
  ) {
    super();
    this.logger.log(
      `DocumentWorker listening to queue: ${DOCUMENT_PARSING_QUEUE}`,
    );
  }

  async process(job: Job<DocumentJobData, unknown, string>): Promise<unknown> {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} (Data Type: ${job.data.type})`,
    );

    const { userId, recordId, filePath, originalName, mimeType } = job.data;

    try {
      let result: unknown;
      switch (job.name as DocumentJobName) {
        case DocumentJobName.PARSE_CV:
          result = await this.documentsService.parseCv(
            userId,
            recordId,
            filePath,
            originalName,
            mimeType,
          );
          break;
        case DocumentJobName.PARSE_JD:
          result = await this.documentsService.parseJd(
            userId,
            recordId,
            filePath,
            originalName,
            mimeType,
          );
          break;
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
      return result;
    } catch (error) {
      throw error;
    } finally {
      await this.documentsService.cleanupUploadedFile(filePath);
    }
  }
}
