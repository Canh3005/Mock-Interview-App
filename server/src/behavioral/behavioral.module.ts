import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BehavioralSession } from './entities/behavioral-session.entity';
import { BehavioralStageLog } from './entities/behavioral-stage-log.entity';
import { BehavioralSessionService } from './behavioral-session.service';
import { BehavioralController } from './behavioral.controller';
import { PromptBuilderService } from './prompt-builder.service';
import { AIFacilitatorService } from './ai-facilitator.service';
import { MessageQualityService } from './message-quality.service';
import { ScoringService } from './scoring.service';
import { QuestionOrchestratorService } from './question-orchestrator.service';
import { InterviewSession } from '../interview/entities/interview-session.entity';
import { CombatModule } from '../combat/combat.module';
import { BEHAVIORAL_SCORING_QUEUE } from '../jobs/jobs.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehavioralSession,
      BehavioralStageLog,
      InterviewSession,
    ]),
    BullModule.registerQueueAsync({ name: BEHAVIORAL_SCORING_QUEUE }),
    CombatModule,
  ],
  controllers: [BehavioralController],
  providers: [
    BehavioralSessionService,
    PromptBuilderService,
    AIFacilitatorService,
    MessageQualityService,
    ScoringService,
    QuestionOrchestratorService,
  ],
  exports: [BehavioralSessionService],
})
export class BehavioralModule {}
