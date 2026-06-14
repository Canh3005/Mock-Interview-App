import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NSD_EVALUATION_QUEUE } from '../jobs.constants';
import { NSDEvaluatorService } from '../../nsd-evaluator/nsd-evaluator.service';

export interface NsdEvaluationJobData {
  sessionId: string;
}

@Processor(NSD_EVALUATION_QUEUE)
export class NsdEvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(NsdEvaluationWorker.name);

  constructor(private readonly evaluatorService: NSDEvaluatorService) {
    super();
  }

  async process(job: Job<NsdEvaluationJobData>): Promise<void> {
    this.logger.log(
      `Processing NSD evaluation job ${job.id} for session ${job.data.sessionId}`,
    );
    return this.evaluatorService.processEvaluation(job.data.sessionId);
  }
}
