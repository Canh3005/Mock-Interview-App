import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NSD_EVALUATION_QUEUE } from '../jobs/jobs.constants';
import { NSDEvaluatorService } from './nsd-evaluator.service';
import { NSDEvaluatorController } from './nsd-evaluator.controller';
import { NSDSessionModule } from '../nsd-session/nsd-session.module';
import { NSDOrchestratorModule } from '../nsd-orchestrator/nsd-orchestrator.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: NSD_EVALUATION_QUEUE }),
    NSDSessionModule,
    NSDOrchestratorModule,
  ],
  controllers: [NSDEvaluatorController],
  providers: [NSDEvaluatorService],
  exports: [NSDEvaluatorService],
})
export class NSDEvaluatorModule {}
