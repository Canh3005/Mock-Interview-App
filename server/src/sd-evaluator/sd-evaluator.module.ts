import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SDSession } from '../sd-session/entities/sd-session.entity';
import { SDEvaluatorController } from './sd-evaluator.controller';
import { SDEvaluatorService } from './sd-evaluator.service';
import { SD_EVALUATION_QUEUE } from '../jobs/jobs.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([SDSession]),
    BullModule.registerQueueAsync({ name: SD_EVALUATION_QUEUE }),
  ],
  controllers: [SDEvaluatorController],
  providers: [SDEvaluatorService],
  exports: [SDEvaluatorService],
})
export class SDEvaluatorModule {}
