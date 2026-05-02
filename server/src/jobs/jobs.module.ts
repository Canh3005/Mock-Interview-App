import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentWorker } from './workers/document.worker';
import { BehavioralScoringWorker } from './workers/behavioral-scoring.worker';
import { DsaDebriefWorker } from './workers/dsa-debrief.worker';
import { SdEvaluationWorker } from './workers/sd-evaluation.worker';
import { DocumentsModule } from '../documents/documents.module';
import { BehavioralModule } from '../behavioral/behavioral.module';
import { LiveCodingModule } from '../live-coding/live-coding.module';
import { SDEvaluatorModule } from '../sd-evaluator/sd-evaluator.module';
import {
  DOCUMENT_PARSING_QUEUE,
  BEHAVIORAL_SCORING_QUEUE,
  DSA_DEBRIEF_QUEUE,
  SD_EVALUATION_QUEUE,
} from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    BullModule.registerQueueAsync({ name: BEHAVIORAL_SCORING_QUEUE }),
    BullModule.registerQueueAsync({ name: DSA_DEBRIEF_QUEUE }),
    BullModule.registerQueueAsync({ name: SD_EVALUATION_QUEUE }),
    DocumentsModule,
    BehavioralModule,
    LiveCodingModule,
    SDEvaluatorModule,
  ],
  providers: [
    DocumentWorker,
    BehavioralScoringWorker,
    DsaDebriefWorker,
    SdEvaluationWorker,
  ],
})
export class JobsModule {}
