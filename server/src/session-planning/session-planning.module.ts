import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionPlan } from './entities/session-plan.entity';
import { SessionPlanningService } from './session-planning.service';
import { SessionPlanningController } from './session-planning.controller';
import { ProbeSelectorService } from './probe-selector.service';
import { BehaviorCalibrationProfile } from '../documents/entities/behavior-calibration-profile.entity';
import { CandidateClaim } from '../documents/entities/candidate-claim.entity';
import { RiskHypothesis } from '../documents/entities/risk-hypothesis.entity';
import { QuestionProbe } from '../question-bank/entities/question-probe.entity';
import { AiModule } from '../ai/ai.module';
import { QuestionProbeEmbedding } from './rag/question-probe-embedding.entity';
import { ProbeEmbeddingTextService } from './rag/probe-embedding-text.service';
import { SessionPlanningRagService } from './rag/session-planning-rag.service';

@Module({
  imports: [
    AiModule,
    TypeOrmModule.forFeature([
      SessionPlan,
      BehaviorCalibrationProfile,
      CandidateClaim,
      RiskHypothesis,
      QuestionProbe,
      QuestionProbeEmbedding,
    ]),
  ],
  controllers: [SessionPlanningController],
  providers: [
    SessionPlanningService,
    ProbeSelectorService,
    ProbeEmbeddingTextService,
    SessionPlanningRagService,
  ],
  exports: [SessionPlanningService],
})
export class SessionPlanningModule {}
