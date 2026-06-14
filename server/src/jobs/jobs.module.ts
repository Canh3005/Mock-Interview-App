import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentWorker } from './workers/document.worker';
import { DsaDebriefWorker } from './workers/dsa-debrief.worker';
import { QuestionPracticeScoringWorker } from './workers/question-practice-scoring.worker';
import { BehaviorScoringWorker } from './workers/behavior-scoring.worker';
import { NsdEvaluationWorker } from './workers/nsd-evaluation.worker';
import { DocumentsModule } from '../documents/documents.module';
import { LiveCodingModule } from '../live-coding/live-coding.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { BehaviorSessionModule } from '../behavior-session/behavior-session.module';
import { InterviewModule } from '../interview/interview.module';
import { CombatModule } from '../combat/combat.module';
import { NSDEvaluatorModule } from '../nsd-evaluator/nsd-evaluator.module';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { SessionPlan } from '../session-planning/entities/session-plan.entity';
import {
  DOCUMENT_PARSING_QUEUE,
  DSA_DEBRIEF_QUEUE,
  QUESTION_PRACTICE_SCORING_QUEUE,
  BEHAVIOR_SCORING_QUEUE,
  NSD_EVALUATION_QUEUE,
} from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({ name: DOCUMENT_PARSING_QUEUE }),
    BullModule.registerQueueAsync({ name: DSA_DEBRIEF_QUEUE }),
    BullModule.registerQueueAsync({ name: QUESTION_PRACTICE_SCORING_QUEUE }),
    BullModule.registerQueueAsync({ name: BEHAVIOR_SCORING_QUEUE }),
    BullModule.registerQueueAsync({ name: NSD_EVALUATION_QUEUE }),
    TypeOrmModule.forFeature([
      BehavioralSession,
      InterviewSession,
      SessionPlan,
    ]),
    DocumentsModule,
    LiveCodingModule,
    QuestionBankModule,
    BehaviorSessionModule,
    InterviewModule,
    CombatModule,
    NSDEvaluatorModule,
  ],
  providers: [
    DocumentWorker,
    DsaDebriefWorker,
    QuestionPracticeScoringWorker,
    BehaviorScoringWorker,
    NsdEvaluationWorker,
  ],
})
export class JobsModule {}
