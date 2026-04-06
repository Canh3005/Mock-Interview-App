import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BEHAVIORAL_SCORING_QUEUE,
  BehavioralScoringJobName,
} from '../jobs.constants';
import { BehavioralSessionService } from '../../behavioral/behavioral-session.service';

export interface BehavioralScoringJobData {
  sessionId: string;
}

@Processor(BEHAVIORAL_SCORING_QUEUE)
export class BehavioralScoringWorker extends WorkerHost {
  private readonly logger = new Logger(BehavioralScoringWorker.name);

  constructor(
    private readonly behavioralSessionService: BehavioralSessionService,
  ) {
    super();
  }

  async process(
    job: Job<BehavioralScoringJobData, unknown, string>,
  ): Promise<unknown> {
    this.logger.log(
      `Processing scoring job ${job.id} for session ${job.data.sessionId}`,
    );

    switch (job.name) {
      case BehavioralScoringJobName.SCORE_SESSION:
        return this.behavioralSessionService.processScoring(job.data.sessionId);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
