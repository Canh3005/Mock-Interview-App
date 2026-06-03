import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  QUESTION_PRACTICE_SCORING_QUEUE,
  QuestionPracticeScoringJobName,
} from '../../../jobs/jobs.constants';
import { QuestionPracticeAttempt } from '../../entities/question-practice-attempt.entity';
import {
  QuestionPracticeAttemptFeedbackResponse,
  QuestionPracticeFailureCode,
} from '../../types/question-practice-scoring.types';
import { PROCESSING_STALE_MS } from '../../constants/question-practice.constants';

@Injectable()
export class QuestionPracticeFeedbackService {
  private readonly logger = new Logger(QuestionPracticeFeedbackService.name);

  constructor(
    @InjectRepository(QuestionPracticeAttempt)
    private readonly attemptRepository: Repository<QuestionPracticeAttempt>,
    @InjectQueue(QUESTION_PRACTICE_SCORING_QUEUE)
    private readonly scoringQueue: Queue,
  ) {}

  async getAttemptFeedback({
    candidateId,
    attemptId,
  }: {
    candidateId: string;
    attemptId: string;
  }): Promise<QuestionPracticeAttemptFeedbackResponse> {
    const attempt: QuestionPracticeAttempt = await this._ownedAttempt({
      candidateId,
      attemptId,
    });
    return this.toFeedbackResponse(attempt);
  }

  async retryFeedback({
    candidateId,
    attemptId,
  }: {
    candidateId: string;
    attemptId: string;
  }): Promise<QuestionPracticeAttemptFeedbackResponse> {
    const attempt: QuestionPracticeAttempt = await this._ownedAttempt({
      candidateId,
      attemptId,
    });
    if (attempt.status === 'feedback_ready') {
      throw new ConflictException('Feedback is already ready');
    }
    if (attempt.status === 'processing' && !this._processingIsStale(attempt)) {
      throw new ConflictException('Feedback is still processing');
    }
    attempt.status = 'pending_feedback';
    attempt.failureCode = null;
    attempt.feedbackFailedAt = null;
    attempt.retryCount += 1;
    const saved: QuestionPracticeAttempt =
      await this.attemptRepository.save(attempt);
    await this.enqueueScoring(saved);
    return this.toFeedbackResponse(saved);
  }

  async enqueueScoring(attempt: QuestionPracticeAttempt): Promise<void> {
    try {
      await this.scoringQueue.add(
        QuestionPracticeScoringJobName.SCORE_ATTEMPT,
        { attemptId: attempt.id },
        {
          jobId: attempt.id,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue question practice scoring ${attempt.id}: ${this._errorMessage(error)}`,
      );
      await this.markQueueFailed({ attempt });
    }
  }

  async markQueueFailed({
    attempt,
  }: {
    attempt: QuestionPracticeAttempt;
  }): Promise<void> {
    attempt.status = 'feedback_failed';
    attempt.failureCode = 'queue_failed';
    attempt.feedbackFailedAt = new Date();
    await this.attemptRepository.save(attempt);
  }

  toFeedbackResponse(
    attempt: QuestionPracticeAttempt,
  ): QuestionPracticeAttemptFeedbackResponse {
    const failureCode: QuestionPracticeFailureCode | null =
      attempt.failureCode ?? null;
    return {
      attemptId: attempt.id,
      probeId: attempt.probeId,
      status: attempt.status,
      answerInputType: attempt.answerInputType,
      displayLocale: attempt.displayLocale,
      resolvedQuestionLocale: attempt.resolvedQuestionLocale,
      feedbackLocale: attempt.feedbackLocale,
      submittedAt: attempt.submittedAt.toISOString(),
      processingStartedAt: attempt.processingStartedAt?.toISOString() ?? null,
      feedbackReadyAt: attempt.feedbackReadyAt?.toISOString() ?? null,
      failureCode,
      retryable:
        attempt.status === 'feedback_failed' ||
        (attempt.status === 'processing' && this._processingIsStale(attempt)),
      result:
        attempt.status === 'feedback_ready'
          ? (attempt.feedbackResult ?? null)
          : null,
    };
  }

  private async _ownedAttempt({
    candidateId,
    attemptId,
  }: {
    candidateId: string;
    attemptId: string;
  }): Promise<QuestionPracticeAttempt> {
    const attempt: QuestionPracticeAttempt | null =
      await this.attemptRepository.findOne({
        where: { id: attemptId, candidateId },
      });
    if (!attempt) throw new NotFoundException('Practice attempt not found');
    return attempt;
  }

  private _processingIsStale(attempt: QuestionPracticeAttempt): boolean {
    if (!attempt.processingStartedAt) return false;
    const ageMs: number = Date.now() - attempt.processingStartedAt.getTime();
    return ageMs > PROCESSING_STALE_MS;
  }

  private _errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
