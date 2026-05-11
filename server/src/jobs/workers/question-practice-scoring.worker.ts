import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUESTION_PRACTICE_SCORING_QUEUE,
  QuestionPracticeScoringJobName,
} from '../jobs.constants';
import { QuestionPracticeScoringService } from '../../question-bank/services/scoring/question-practice-scoring.service';

export interface QuestionPracticeScoringJobData {
  attemptId: string;
}

@Processor(QUESTION_PRACTICE_SCORING_QUEUE)
export class QuestionPracticeScoringWorker extends WorkerHost {
  private readonly logger = new Logger(QuestionPracticeScoringWorker.name);

  constructor(private readonly scoringService: QuestionPracticeScoringService) {
    super();
  }

  async process(
    job: Job<QuestionPracticeScoringJobData, unknown, string>,
  ): Promise<unknown> {
    this.logger.log(
      `Processing question practice scoring job ${job.id} for attempt ${job.data.attemptId}`,
    );

    switch (job.name) {
      case QuestionPracticeScoringJobName.SCORE_ATTEMPT:
        await this.scoringService.processAttempt({
          attemptId: job.data.attemptId,
        });
        return { ok: true };
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
