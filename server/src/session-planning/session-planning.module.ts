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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionPlan,
      BehaviorCalibrationProfile,
      CandidateClaim,
      RiskHypothesis,
      QuestionProbe,
    ]),
  ],
  controllers: [SessionPlanningController],
  providers: [SessionPlanningService, ProbeSelectorService],
  exports: [SessionPlanningService],
})
export class SessionPlanningModule {}
