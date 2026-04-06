import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatMetricsLog } from './entities/combat-metrics-log.entity';
import { CombatMetricsService } from './combat-metrics.service';
import { CombatTransitionService } from './combat-transition.service';
import { MultimodalHintService } from './multimodal-hint.service';
import { MultimodalScoringService } from './multimodal-scoring.service';
import { CombatController } from './combat.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([CombatMetricsLog]), AiModule],
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
