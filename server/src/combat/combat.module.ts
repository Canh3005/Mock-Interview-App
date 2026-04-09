import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { ProctoringSession } from './entities/proctoring-session.entity';
import { ProctoringEvent } from './entities/proctoring-event.entity';
import { CombatMetricsService } from './combat-metrics.service';
import { CombatTransitionService } from './combat-transition.service';
import { MultimodalHintService } from './multimodal-hint.service';
import { MultimodalScoringService } from './multimodal-scoring.service';
import { CorrelationQueryService } from './correlation-query.service';
import { IntegrityCalculatorService } from './integrity-calculator.service';
import { CombatController } from './combat.controller';
import { AiModule } from '../ai/ai.module';
import { BehavioralStageLog } from '../behavioral/entities/behavioral-stage-log.entity';
import { BehavioralSession } from '../behavioral/entities/behavioral-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CombatSessionAggregate,
      ProctoringSession,
      ProctoringEvent,
      BehavioralStageLog,
      BehavioralSession,
    ]),
    AiModule,
  ],
  controllers: [CombatController],
  providers: [
    CombatMetricsService,
    CombatTransitionService,
    MultimodalHintService,
    MultimodalScoringService,
    CorrelationQueryService,
    IntegrityCalculatorService,
  ],
  exports: [
    CombatTransitionService,
    MultimodalHintService,
    MultimodalScoringService,
    IntegrityCalculatorService,
  ],
})
export class CombatModule {}
