import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsAiService } from './documents.ai.service';
import { DocumentContextService } from './document-context.service';
import { FitAssessmentService } from './fit-assessment.service';
import { DOCUMENT_PARSING_QUEUE } from '../jobs/jobs.constants';
import { DocumentContextOverride } from './entities/document-context-override.entity';
import { UserCv } from '../users/entities/user-cv.entity';
import { JdAnalysis } from '../users/entities/jd-analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCv, JdAnalysis, DocumentContextOverride]),
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsAiService,
    DocumentContextService,
    FitAssessmentService,
  ],
  exports: [
    DocumentsService,
    DocumentsAiService,
    DocumentContextService,
    FitAssessmentService,
  ],
})
export class DocumentsModule {}
