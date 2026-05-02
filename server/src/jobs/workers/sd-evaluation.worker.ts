import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SD_EVALUATION_QUEUE, SdEvaluationJobName } from '../jobs.constants';
import { SDEvaluatorService } from '../../sd-evaluator/sd-evaluator.service';

export interface SdEvaluationJobData {
  sessionId: string;
}

@Processor(SD_EVALUATION_QUEUE)
export class SdEvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(SdEvaluationWorker.name);

  constructor(private readonly sdEvaluatorService: SDEvaluatorService) {
    super();
  }

  async process(job: Job<SdEvaluationJobData>): Promise<void> {
    this.logger.log(
      `Processing evaluation job ${job.id} for session ${job.data.sessionId}`,
    );
    switch (job.name) {
      case SdEvaluationJobName.EVALUATE_SESSION:
        return this.sdEvaluatorService.processEvaluation(
          job.data.sessionId,
          job,
        );
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
