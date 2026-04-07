import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatSessionAggregate } from './entities/combat-session-aggregate.entity';
import { CombatMetricsService } from './combat-metrics.service';
import { CombatTransitionService } from './combat-transition.service';
import { MultimodalHintService } from './multimodal-hint.service';
import { MultimodalScoringService } from './multimodal-scoring.service';
import { CombatController } from './combat.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([CombatSessionAggregate]), AiModule],
  controllers: [CombatController],
  providers: [
    CombatMetricsService,
    CombatTransitionService,
    MultimodalHintService,
    MultimodalScoringService,
  ],
  exports: [
    CombatTransitionService,
    MultimodalHintService,
    MultimodalScoringService,
  ],
})
export class CombatModule {}
