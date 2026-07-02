import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QUESTION_PROBE_LANGUAGES,
  QuestionProbeLanguage,
} from '../../constants/question-bank-taxonomy.constants';
import {
  QuestionPracticeAnswerInputType,
  QuestionPracticeAttempt,
  QuestionPracticeProbeSnapshot,
} from '../../entities/question-practice-attempt.entity';
import { QuestionProbe } from '../../entities/question-probe.entity';
import { QuestionBankPublicProjectionService } from '../public/question-bank-public-projection.service';
import {
  SubmitQuestionPracticeAttemptRequest,
  SubmitQuestionPracticeAttemptResponse,
} from '../../types/question-bank-public.types';
import { QuestionPracticeFeedbackService } from './question-practice-feedback.service';

@Injectable()
export class QuestionPracticeAttemptService {
  constructor(
    @InjectRepository(QuestionProbe)
    private readonly probeRepository: Repository<QuestionProbe>,
    @InjectRepository(QuestionPracticeAttempt)
    private readonly attemptRepository: Repository<QuestionPracticeAttempt>,
    private readonly projectionService: QuestionBankPublicProjectionService,
    private readonly feedbackService: QuestionPracticeFeedbackService,
  ) {}

  async submitPracticeAttempt({
    candidateId,
    probeId,
    request,
  }: {
    candidateId: string;
    probeId: string;
    request: SubmitQuestionPracticeAttemptRequest;
  }): Promise<SubmitQuestionPracticeAttemptResponse> {
    const clientSubmissionId: string | undefined = this._cleanText(
      request.clientSubmissionId,
    );
    if (!clientSubmissionId) {
      throw new BadRequestException('clientSubmissionId is required');
    }

    const existingAttempt: QuestionPracticeAttempt | null =
      await this.attemptRepository.findOne({
        where: { candidateId, clientSubmissionId },
      });
    if (existingAttempt) return this._toAttemptResponse(existingAttempt);

    const answerInputType: QuestionPracticeAnswerInputType =
      this._answerInputType(request.answerInputType);
    const answerText: string | undefined = this._cleanText(request.answerText);
    if (!answerText) throw new BadRequestException('answerText is required');

    const displayLocale: QuestionProbeLanguage = this._language({
      value: request.displayLocale,
      field: 'displayLocale',
      required: false,
    });
    const feedbackLocale: QuestionProbeLanguage = this._language({
      value: request.feedbackLocale,
      field: 'feedbackLocale',
      required: false,
    });
    const probe: QuestionProbe | null = await this.probeRepository.findOne({
      where: { id: probeId },
    });
    if (!probe) throw new NotFoundException('Question probe not found');
    if (probe.status !== 'active') {
      throw new ConflictException('Question probe is no longer active');
    }

    const supportedLanguages: QuestionProbeLanguage[] =
      this.projectionService.supportedLanguages(probe);
    const resolvedQuestionLocale: QuestionProbeLanguage =
      this.projectionService.resolvedLocale({
        probe,
        locale: displayLocale,
        supportedLanguages,
      });
    const attempt: QuestionPracticeAttempt = this.attemptRepository.create({
      candidateId,
      probeId,
      clientSubmissionId,
      answerInputType,
      answerText,
      displayLocale,
      resolvedQuestionLocale,
      feedbackLocale,
      status: 'pending_feedback',
      submittedAt: new Date(),
      probeSnapshot: this._probeSnapshot({
        probe,
        resolvedQuestionLocale,
      }),
    });
    const savedAttempt: QuestionPracticeAttempt =
      await this.attemptRepository.save(attempt);
    await this.feedbackService.enqueueScoring(savedAttempt);
    return this._toAttemptResponse(savedAttempt);
  }

  private _probeSnapshot({
    probe,
    resolvedQuestionLocale,
  }: {
    probe: QuestionProbe;
    resolvedQuestionLocale: QuestionProbeLanguage;
  }): QuestionPracticeProbeSnapshot {
    return {
      probeId: probe.id,
      probeCode: probe.code,
      probeRevision: probe.revision,
      resolvedQuestionLocale,
      publicContent: this.projectionService.contentForLocale({
        probe,
        locale: resolvedQuestionLocale,
      }),
      canonical: {
        intent: probe.intent,
        primaryQuestion: probe.primaryQuestion,
        roleFamilies: probe.roleFamilies,
        levels: probe.levels,
        type: probe.type,
        competencies: probe.competencies,
        techTags: probe.techTags,
        topicTags: probe.topicTags ?? [],
        difficulty: probe.difficulty,
      },
      rubric: {
        expectedSignals: probe.expectedSignals,
        scoringHints: probe.scoringHints,
      },
    };
  }

  private _toAttemptResponse(
    attempt: QuestionPracticeAttempt,
  ): SubmitQuestionPracticeAttemptResponse {
    return {
      attemptId: attempt.id,
      probeId: attempt.probeId,
      status: attempt.status,
      answerInputType: attempt.answerInputType,
      displayLocale: attempt.displayLocale,
      resolvedQuestionLocale: attempt.resolvedQuestionLocale,
      feedbackLocale: attempt.feedbackLocale,
      submittedAt: attempt.submittedAt.toISOString(),
      next: 'feedback_processing',
    };
  }

  private _language({
    value,
    field,
    required,
  }: {
    value?: string;
    field: string;
    required: boolean;
  }): QuestionProbeLanguage {
    if (!value && !required) return 'vi';
    if (!value) throw new BadRequestException(`Invalid ${field}`);
    if (QUESTION_PROBE_LANGUAGES.includes(value as QuestionProbeLanguage)) {
      return value as QuestionProbeLanguage;
    }
    throw new BadRequestException(`Invalid ${field}`);
  }

  private _answerInputType(value?: string): QuestionPracticeAnswerInputType {
    if (!value || value === 'text') return 'text';
    if (value === 'voice') return 'voice';
    throw new BadRequestException('Invalid answerInputType');
  }

  private _cleanText(value?: string): string | undefined {
    const cleanValue: string | undefined = value?.trim();
    return cleanValue && cleanValue.length > 0 ? cleanValue : undefined;
  }
}
