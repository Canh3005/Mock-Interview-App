import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDStageSummary } from '../sd-orchestrator/entities/sd-stage-summary.entity';
import { SDGraphSnapshotEntity } from '../sd-orchestrator/entities/sd-graph-snapshot.entity';
import { SDEvaluatorController } from './sd-evaluator.controller';
import { SDEvaluatorService } from './sd-evaluator.service';
import { SD_EVALUATION_QUEUE } from '../jobs/jobs.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SDSession,
      SDStageSummary,
      SDGraphSnapshotEntity,
    ]),
    BullModule.registerQueueAsync({ name: SD_EVALUATION_QUEUE }),
  ],
  controllers: [SDEvaluatorController],
  providers: [SDEvaluatorService],
  exports: [SDEvaluatorService],
})
export class SDEvaluatorModule {}
