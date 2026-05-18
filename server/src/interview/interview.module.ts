import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { RoundOrchestratorService } from './round-orchestrator.service';
import { InterviewSession } from './entities/interview-session.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { LiveCodingSession } from '../live-coding/entities/live-coding-session.entity';
import { LiveCodingSessionProblem } from '../live-coding/entities/live-coding-session-problem.entity';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { WalletModule } from '../wallet/wallet.module';
import { DocumentsModule } from '../documents/documents.module';
import { SessionPlanningModule } from '../session-planning/session-planning.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterviewSession,
      BehavioralSession,
      LiveCodingSession,
      LiveCodingSessionProblem,
      SDSession,
    ]),
    WalletModule,
    DocumentsModule,
    SessionPlanningModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService, RoundOrchestratorService],
  exports: [InterviewService, RoundOrchestratorService],
})
export class InterviewModule {}
