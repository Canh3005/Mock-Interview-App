import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DSA_DEBRIEF_QUEUE, DsaDebriefJobName } from '../jobs.constants';
import { LiveCodingService } from '../../live-coding/live-coding.service';

export interface DsaDebriefJobData {
  sessionId: string;
}

@Processor(DSA_DEBRIEF_QUEUE)
export class DsaDebriefWorker extends WorkerHost {
  private readonly logger = new Logger(DsaDebriefWorker.name);

  constructor(private readonly liveCodingService: LiveCodingService) {
    super();
  }

  async process(
    job: Job<DsaDebriefJobData, unknown, string>,
  ): Promise<unknown> {
    this.logger.log(
      `Processing debrief job ${job.id} for session ${job.data.sessionId}`,
    );

    switch (job.name) {
      case DsaDebriefJobName.DEBRIEF_SESSION:
        return this.liveCodingService.processDebrief(job.data.sessionId);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
