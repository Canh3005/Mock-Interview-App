import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { RoundOrchestratorService } from './round-orchestrator.service';
import { InterviewSession } from './entities/interview-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewSession, BehavioralSession, LiveCodingSession, LiveCodingSessionProblem])],
  controllers: [InterviewController],
  providers: [InterviewService, RoundOrchestratorService],
  exports: [InterviewService, RoundOrchestratorService],
})
export class InterviewModule {}
