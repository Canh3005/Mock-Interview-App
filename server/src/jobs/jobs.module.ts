import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentWorker } from './workers/document.worker';
import { DocumentsModule } from '../documents/documents.module';
import { DOCUMENT_PARSING_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    DocumentsModule,
  ],
  providers: [DocumentWorker],
})
export class JobsModule {}
