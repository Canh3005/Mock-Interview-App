import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { LiveCodingController } from './live-coding.controller';
import { LiveCodingService } from './live-coding.service';
import { LiveCodingAiService } from './live-coding-ai.service';
import { LiveCodingScoringService } from './live-coding-scoring.service';
import { LiveCodingSession } from './entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from './entities/live-coding-session-problem.entity';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemTemplate } from '../problems/entities/problem-template.entity';
import { TestCase } from '../test-cases/entities/test-case.entity';
import { JudgeModule } from '../judge/judge.module';
import { AiModule } from '../ai/ai.module';
import { DSA_DEBRIEF_QUEUE } from '../jobs/jobs.constants';
import { RoundOrchestratorService } from '../interview/round-orchestrator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiveCodingSession,
      LiveCodingSessionProblem,
      InterviewSession,
      Problem,
      ProblemTemplate,
      TestCase,
    ]),
    BullModule.registerQueueAsync({ name: DSA_DEBRIEF_QUEUE }),
    JudgeModule,
    AiModule,
  ],
  controllers: [LiveCodingController],
  providers: [
    LiveCodingService,
    LiveCodingAiService,
    LiveCodingScoringService,
    RoundOrchestratorService,
  ],
  exports: [LiveCodingService],
})
export class LiveCodingModule {}
