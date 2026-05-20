import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { SessionPlan } from '../session-planning/entities/session-plan.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { AiModule } from '../ai/ai.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { BehaviorSessionController } from './behavior-session.controller';
import { BehaviorSessionService } from './behavior-session.service';
import { BehaviorSessionFlowService } from './behavior-session-flow.service';
import { PolicyEngineService } from './policy-engine.service';
import { ProbeRendererService } from './probe-renderer.service';
import { SessionSynthesisService } from './session-synthesis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehavioralSession,
      BehavioralStageLog,
      SessionPlan,
      QuestionProbe,
    ]),
    AiModule,
    QuestionBankModule,
  ],
  controllers: [BehaviorSessionController],
  providers: [
    BehaviorSessionService,
    BehaviorSessionFlowService,
    PolicyEngineService,
    ProbeRendererService,
    SessionSynthesisService,
  ],
})
export class BehaviorSessionModule {}
