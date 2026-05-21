import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentWorker } from './workers/document.worker';
import { DsaDebriefWorker } from './workers/dsa-debrief.worker';
import { SdEvaluationWorker } from './workers/sd-evaluation.worker';
import { QuestionPracticeScoringWorker } from './workers/question-practice-scoring.worker';
import { DocumentsModule } from '../documents/documents.module';
import { LiveCodingModule } from '../live-coding/live-coding.module';
import { SDEvaluatorModule } from '../sd-evaluator/sd-evaluator.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import {
  DOCUMENT_PARSING_QUEUE,
  DSA_DEBRIEF_QUEUE,
  SD_EVALUATION_QUEUE,
  QUESTION_PRACTICE_SCORING_QUEUE,
} from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    BullModule.registerQueueAsync({ name: DSA_DEBRIEF_QUEUE }),
    BullModule.registerQueueAsync({ name: SD_EVALUATION_QUEUE }),
    BullModule.registerQueueAsync({ name: QUESTION_PRACTICE_SCORING_QUEUE }),
    DocumentsModule,
    LiveCodingModule,
    SDEvaluatorModule,
    QuestionBankModule,
  ],
  providers: [
    DocumentWorker,
    DsaDebriefWorker,
    SdEvaluationWorker,
    QuestionPracticeScoringWorker,
  ],
})
export class JobsModule {}
