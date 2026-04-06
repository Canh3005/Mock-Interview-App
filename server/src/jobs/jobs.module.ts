import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentWorker } from './workers/document.worker';
import { BehavioralScoringWorker } from './workers/behavioral-scoring.worker';
import { DocumentsModule } from '../documents/documents.module';
import { BehavioralModule } from '../behavioral/behavioral.module';
import {
  DOCUMENT_PARSING_QUEUE,
  BEHAVIORAL_SCORING_QUEUE,
} from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    BullModule.registerQueueAsync({ name: BEHAVIORAL_SCORING_QUEUE }),
    DocumentsModule,
    BehavioralModule,
  ],
  providers: [DocumentWorker, BehavioralScoringWorker],
})
export class JobsModule {}
