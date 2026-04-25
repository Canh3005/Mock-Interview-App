import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentWorker } from './workers/document.worker';
import { BehavioralScoringWorker } from './workers/behavioral-scoring.worker';
import { DsaDebriefWorker } from './workers/dsa-debrief.worker';
import { DocumentsModule } from '../documents/documents.module';
import { BehavioralModule } from '../behavioral/behavioral.module';
import { LiveCodingModule } from '../live-coding/live-coding.module';
import {
  DOCUMENT_PARSING_QUEUE,
  BEHAVIORAL_SCORING_QUEUE,
  DSA_DEBRIEF_QUEUE,
} from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    BullModule.registerQueueAsync({ name: BEHAVIORAL_SCORING_QUEUE }),
    BullModule.registerQueueAsync({ name: DSA_DEBRIEF_QUEUE }),
    DocumentsModule,
    BehavioralModule,
    LiveCodingModule,
  ],
  providers: [DocumentWorker, BehavioralScoringWorker, DsaDebriefWorker],
})
export class JobsModule {}
