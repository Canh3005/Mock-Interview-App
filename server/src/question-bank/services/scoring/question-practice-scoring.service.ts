import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { GroqService } from '../../../ai/groq.service';
import {
  QuestionPracticeAttempt,
  QuestionPracticeProbeSnapshot,
} from '../../entities/question-practice-attempt.entity';
import {
  CatalogItem,
  QuestionPracticeScoringResultService,
} from './question-practice-scoring-result.service';
import {
  CandidateIntent,
  LlmScoringExtraction,
  LlmScoringExtractionSchema,
  ProbeScoringResult,
} from '../../types/question-practice-scoring.types';
import type { QuestionProbe } from '../../entities/question-probe.entity';
import type { QuestionProbeLanguage } from '../../constants/question-bank-taxonomy.constants';

const MIN_EVALUABLE_CHARS = 80;
const LONG_ANSWER_CHARS = 8000;
const MAX_CONTEXT_CHARS = 16000;

const NarrativeSchema = z.object({
  summary: z.string().min(1),
  improvementSuggestions: z.array(z.string().min(1)).min(1).max(5),
});

@Injectable()
export class QuestionPracticeScoringService {
  private readonly logger = new Logger(QuestionPracticeScoringService.name);
  private readonly model: string;
  private readonly narrativeModel: string;

  constructor(
    @InjectRepository(QuestionPracticeAttempt)
    private readonly attemptRepository: Repository<QuestionPracticeAttempt>,
    private readonly groqService: GroqService,
    private readonly configService: ConfigService,
    private readonly resultService: QuestionPracticeScoringResultService,
  ) {
    this.model =
      this.configService.get<string>('QUESTION_PRACTICE_SCORING_MODEL') ??
      'llama-3.3-70b-versatile';
    this.narrativeModel =
      this.configService.get<string>('QUESTION_PRACTICE_NARRATIVE_MODEL') ??
      this.model;
  }

  /**
   * Score câu trả lời trực tiếp từ QuestionProbe mà không cần persist attempt.
   * Dùng cho F032 probe-based runtime — gọi synchronously, không queue BullMQ.
   *
   * @param questionProbe - Probe đang được hỏi
   * @param answerText - Toàn bộ candidate text tích lũy trong probe (tất cả turns)
   * @param language - Ngôn ngữ phỏng vấn, dùng cho feedback locale
   * @param cvClaims - Claims từ CV candidate (optional) để cross-check
   * @returns ProbeScoringResult với signals, redFlags, overallBand
   * @throws Error nếu LLM extraction fail sau retry
   */
  async scoreForRuntime({
    questionProbe,
    answerText,
    language,
  }: {
    questionProbe: QuestionProbe;
    answerText: string;
    language: QuestionProbeLanguage;
  }): Promise<ProbeScoringResult> {
    const signalCatalog: CatalogItem[] = questionProbe.expectedSignals.map(
      (label: string, index: number) => ({ key: `signal_${index + 1}`, label }),
    );
    const redFlagCatalog: CatalogItem[] = questionProbe.redFlags.map(
      (label: string, index: number) => ({
        key: `red_flag_${index + 1}`,
        label,
      }),
    );

    const detectedIntent: CandidateIntent = this._detectIntent(answerText);
    if (detectedIntent !== 'answer') {
      return this.resultService.insufficientEvidenceResultFromRaw({
        signalCatalog,
        redFlagCatalog,
        language,
        candidateIntent: detectedIntent,
      });
    }

    if (!this._isEvaluable(answerText)) {
      return this.resultService.insufficientEvidenceResultFromRaw({
        signalCatalog,
        redFlagCatalog,
        language,
        candidateIntent: 'answer',
      });
    }

    const context: string = this._contextForExtraction({
      answerText,
      signalCatalog,
    });
    const extraction: LlmScoringExtraction = await this._extractWithRetryRaw({
      intent: questionProbe.intent ?? '',
      type: questionProbe.type ?? '',
      language,
      context,
      signalCatalog,
      redFlagCatalog,
      scoringHints: questionProbe.scoringHints,
    });
    const baseResult: ProbeScoringResult =
      this.resultService.buildResultFromRaw({
        extraction,
        signalCatalog,
        redFlagCatalog,
        answerText,
        language,
      });
    return this._withNarrativeRaw({ result: baseResult, language });
  }

  async processAttempt({ attemptId }: { attemptId: string }): Promise<void> {
    const attempt: QuestionPracticeAttempt | null =
      await this.attemptRepository.findOne({ where: { id: attemptId } });
    if (!attempt) {
      this.logger.warn(`Question practice attempt not found: ${attemptId}`);
      return;
    }
    if (attempt.status === 'feedback_ready') return;

    const processingAttempt: QuestionPracticeAttempt =
      await this._markProcessing({ attempt });
    if (!this._isEvaluable(processingAttempt.answerText)) {
      await this._saveReady({
        attempt: processingAttempt,
        result:
          this.resultService.insufficientEvidenceResult(processingAttempt),
      });
      return;
    }

    try {
      const result: ProbeScoringResult = await this._scoreAttempt({
        attempt: processingAttempt,
      });
      await this._saveReady({ attempt: processingAttempt, result });
    } catch (error: unknown) {
      this.logger.error(
        `Question practice scoring failed for ${attemptId}: ${this._errorMessage(error)}`,
      );
      await this._saveFailed({
        attempt: processingAttempt,
        failureCode: 'invalid_ai_output',
      });
    }
  }

  private async _scoreAttempt({
    attempt,
  }: {
    attempt: QuestionPracticeAttempt;
  }): Promise<ProbeScoringResult> {
    const signalCatalog: CatalogItem[] =
      this.resultService.signalCatalog(attempt);
    const redFlagCatalog: CatalogItem[] =
      this.resultService.redFlagCatalog(attempt);
    const context: string = this._contextForExtraction({
      answerText: attempt.answerText,
      signalCatalog,
    });
    const extraction: LlmScoringExtraction = await this._extractWithRetry({
      attempt,
      context,
      signalCatalog,
      redFlagCatalog,
    });
    const baseResult: ProbeScoringResult = this.resultService.buildResult({
      attempt,
      extraction,
    });
    return this._withNarrative({ attempt, result: baseResult });
  }

  private async _extractWithRetry({
    attempt,
    context,
    signalCatalog,
    redFlagCatalog,
  }: {
    attempt: QuestionPracticeAttempt;
    context: string;
    signalCatalog: CatalogItem[];
    redFlagCatalog: CatalogItem[];
  }): Promise<LlmScoringExtraction> {
    let attempts = 0;
    let lastError = '';
    while (attempts < 2) {
      attempts += 1;
      try {
        const raw: string = await this.groqService.generateJsonContent({
          model: this.model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: this._extractionPrompt({
                    attempt,
                    context,
                    signalCatalog,
                    redFlagCatalog,
                    lastError,
                  }),
                },
              ],
            },
          ],
          config: { maxOutputTokens: 2500 },
        });
        const parsed: unknown = JSON.parse(raw);
        return LlmScoringExtractionSchema.parse(parsed);
      } catch (error: unknown) {
        lastError = this._errorMessage(error);
      }
    }
    throw new Error(lastError || 'Invalid AI output');
  }

  private _extractionPrompt({
    attempt,
    context,
    signalCatalog,
    redFlagCatalog,
    lastError,
  }: {
    attempt: QuestionPracticeAttempt;
    context: string;
    signalCatalog: CatalogItem[];
    redFlagCatalog: CatalogItem[];
    lastError: string;
  }): string {
    const snapshot: QuestionPracticeProbeSnapshot = attempt.probeSnapshot;
    const retryNote: string = lastError
      ? `Previous output was invalid: ${lastError}. Return valid JSON only.`
      : '';
    return `Evaluate a candidate answer against a specific interview probe.
Return JSON only. Do not invent evidence quotes.

Probe intent: ${snapshot.canonical.intent ?? ''}
Probe type: ${snapshot.canonical.type ?? ''}
Expected signals: ${JSON.stringify(signalCatalog)}
Red flags: ${JSON.stringify(redFlagCatalog)}
Scoring hints: ${JSON.stringify(snapshot.rubric.scoringHints)}
Feedback language: ${attempt.feedbackLocale}

Candidate answer:
${context}

Schema:
{
  "candidateIntent": "answer|dont_know|clarification_request",
  "signals": [{"key": "signal_1", "label": "...", "status": "covered|unclear|missing", "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "redFlags": [{"key": "red_flag_1", "label": "...", "present": true, "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "cvClaims": [{"claim": "...", "verification": "verified|not_verified|inflated_risk", "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "confidence": "high|medium|low"
}

Rules:
- candidateIntent: "dont_know" if candidate explicitly admits they don't know; "clarification_request" if candidate asks for clarification; otherwise "answer".
- covered and unclear require exact evidenceQuotes from the answer.
- missing uses an empty evidenceQuotes array.
- similarity or topic mention alone is not enough for covered.
- do not expose raw scoring hints in feedback.
${retryNote}`;
  }

  private async _withNarrative({
    attempt,
    result,
  }: {
    attempt: QuestionPracticeAttempt;
    result: ProbeScoringResult;
  }): Promise<ProbeScoringResult> {
    try {
      const raw: string = await this.groqService.generateJsonContent({
        model: this.narrativeModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: this._narrativePrompt({ attempt, result }) }],
          },
        ],
        config: { maxOutputTokens: 700 },
      });
      const parsed: unknown = JSON.parse(raw);
      const narrative: z.infer<typeof NarrativeSchema> =
        NarrativeSchema.parse(parsed);
      return {
        ...result,
        summary: narrative.summary,
        improvementSuggestions: narrative.improvementSuggestions,
      };
    } catch (error: unknown) {
      this.logger.warn(`Narrative fallback used: ${this._errorMessage(error)}`);
      return result;
    }
  }

  /**
   * Extraction với retry dùng raw probe params thay vì QuestionPracticeAttempt.
   * Dùng cho scoreForRuntime.
   */
  private async _extractWithRetryRaw({
    intent,
    type,
    language,
    context,
    signalCatalog,
    redFlagCatalog,
    scoringHints,
  }: {
    intent: string;
    type: string;
    language: string;
    context: string;
    signalCatalog: CatalogItem[];
    redFlagCatalog: CatalogItem[];
    scoringHints: { scoreBand: string; description: string }[];
  }): Promise<LlmScoringExtraction> {
    let attempts = 0;
    let lastError = '';
    while (attempts < 2) {
      attempts += 1;
      try {
        const retryNote: string = lastError
          ? `Previous output was invalid: ${lastError}. Return valid JSON only.`
          : '';
        const prompt: string = `Evaluate a candidate answer against a specific interview probe.
Return JSON only. Do not invent evidence quotes.

Probe intent: ${intent}
Probe type: ${type}
Expected signals: ${JSON.stringify(signalCatalog)}
Red flags: ${JSON.stringify(redFlagCatalog)}
Scoring hints: ${JSON.stringify(scoringHints)}
Feedback language: ${language}

Candidate answer:
${context}

Schema:
{
  "candidateIntent": "answer|dont_know|clarification_request",
  "signals": [{"key": "signal_1", "label": "...", "status": "covered|unclear|missing", "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "redFlags": [{"key": "red_flag_1", "label": "...", "present": true, "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "cvClaims": [{"claim": "...", "verification": "verified|not_verified|inflated_risk", "evidenceQuotes": ["exact quote from answer"], "feedback": "..."}],
  "confidence": "high|medium|low"
}

Rules:
- candidateIntent: "dont_know" if candidate explicitly admits they don't know; "clarification_request" if candidate asks for clarification; otherwise "answer".
- covered and unclear require exact evidenceQuotes from the answer.
- missing uses an empty evidenceQuotes array.
- similarity or topic mention alone is not enough for covered.
- do not expose raw scoring hints in feedback.
${retryNote}`;
        const raw: string = await this.groqService.generateJsonContent({
          model: this.model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 2500 },
        });
        const parsed: unknown = JSON.parse(raw);
        return LlmScoringExtractionSchema.parse(parsed);
      } catch (error: unknown) {
        lastError = this._errorMessage(error);
      }
    }
    throw new Error(lastError || 'Invalid AI output');
  }

  /**
   * Narrative generation dùng raw language thay vì attempt.feedbackLocale.
   * Fallback trả result gốc nếu LLM fail.
   */
  private async _withNarrativeRaw({
    result,
    language,
  }: {
    result: ProbeScoringResult;
    language: string;
  }): Promise<ProbeScoringResult> {
    try {
      const prompt: string = `Write candidate-facing feedback in locale ${language}.
Use only this structured result. Do not add new facts or quotes.
Return JSON only: {"summary":"...","improvementSuggestions":["..."]}.
Structured result: ${JSON.stringify(result)}`;
      const raw: string = await this.groqService.generateJsonContent({
        model: this.narrativeModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 700 },
      });
      const parsed: unknown = JSON.parse(raw);
      const narrative: z.infer<typeof NarrativeSchema> =
        NarrativeSchema.parse(parsed);
      return {
        ...result,
        summary: narrative.summary,
        improvementSuggestions: narrative.improvementSuggestions,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Narrative fallback used for runtime scoring: ${this._errorMessage(error)}`,
      );
      return result;
    }
  }

  private _narrativePrompt({
    attempt,
    result,
  }: {
    attempt: QuestionPracticeAttempt;
    result: ProbeScoringResult;
  }): string {
    return `Write candidate-facing feedback in locale ${attempt.feedbackLocale}.
Use only this structured result. Do not add new facts or quotes.
Return JSON only: {"summary":"...","improvementSuggestions":["..."]}.
Structured result: ${JSON.stringify(result)}`;
  }

  private _contextForExtraction({
    answerText,
    signalCatalog,
  }: {
    answerText: string;
    signalCatalog: CatalogItem[];
  }): string {
    if (answerText.length <= LONG_ANSWER_CHARS) return answerText;
    const chunks: string[] = this._semanticChunks(answerText);
    const selectedIndexes: Set<number> = new Set<number>();
    signalCatalog.forEach((signal: CatalogItem) => {
      this._topChunkIndexes({ chunks, signal }).forEach((index: number) => {
        selectedIndexes.add(index);
        if (index > 0) selectedIndexes.add(index - 1);
        if (index < chunks.length - 1) selectedIndexes.add(index + 1);
      });
    });
    const selected: string = Array.from(selectedIndexes)
      .sort((left: number, right: number) => left - right)
      .map((index: number) => chunks[index])
      .join('\n\n');
    if (selected.trim().length < 1000)
      return answerText.slice(0, MAX_CONTEXT_CHARS);
    return selected.slice(0, MAX_CONTEXT_CHARS);
  }

  private _semanticChunks(answerText: string): string[] {
    const paragraphs: string[] = answerText
      .split(/\n{2,}/)
      .map((chunk: string) => chunk.trim())
      .filter((chunk: string) => chunk.length > 0);
    if (paragraphs.length > 1) return paragraphs;
    return answerText.match(/.{1,1400}(\s|$)/g) ?? [answerText];
  }

  private _topChunkIndexes({
    chunks,
    signal,
  }: {
    chunks: string[];
    signal: CatalogItem;
  }): number[] {
    const signalTerms: string[] = this._terms(signal.label);
    return chunks
      .map((chunk: string, index: number) => ({
        index,
        score: this._overlapScore({
          left: signalTerms,
          right: this._terms(chunk),
        }),
      }))
      .filter((item: { index: number; score: number }) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
      .map((item: { index: number; score: number }) => item.index);
  }

  private _overlapScore({
    left,
    right,
  }: {
    left: string[];
    right: string[];
  }): number {
    const rightSet: Set<string> = new Set<string>(right);
    return left.filter((term: string) => rightSet.has(term)).length;
  }

  private _terms(value: string): string[] {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((term: string) => term.length > 2);
  }

  private async _markProcessing({
    attempt,
  }: {
    attempt: QuestionPracticeAttempt;
  }): Promise<QuestionPracticeAttempt> {
    attempt.status = 'processing';
    attempt.processingStartedAt = new Date();
    attempt.failureCode = null;
    attempt.feedbackFailedAt = null;
    return this.attemptRepository.save(attempt);
  }

  private async _saveReady({
    attempt,
    result,
  }: {
    attempt: QuestionPracticeAttempt;
    result: ProbeScoringResult;
  }): Promise<void> {
    attempt.status = 'feedback_ready';
    attempt.feedbackResult = result;
    attempt.scoringVersion = result.scoringVersion;
    attempt.failureCode = null;
    attempt.feedbackReadyAt = new Date();
    await this.attemptRepository.save(attempt);
  }

  private async _saveFailed({
    attempt,
    failureCode,
  }: {
    attempt: QuestionPracticeAttempt;
    failureCode: 'invalid_ai_output' | 'system_error';
  }): Promise<void> {
    attempt.status = 'feedback_failed';
    attempt.failureCode = failureCode;
    attempt.feedbackFailedAt = new Date();
    await this.attemptRepository.save(attempt);
  }

  private _isEvaluable(answerText: string): boolean {
    return answerText.trim().length >= MIN_EVALUABLE_CHARS;
  }

  /**
   * Heuristic intent detection — chạy trước LLM, zero latency.
   * Chỉ detect các trường hợp rõ ràng (answer ngắn < 200 chars hoặc câu xin làm rõ).
   * Không detect: câu dài có "I'm not sure but..." → để LLM scoring xử lý.
   */
  private _detectIntent(answerText: string): CandidateIntent {
    const text = answerText.trim().toLowerCase();

    const dontKnowPatterns = [
      // Vietnamese
      'không biết',
      'chưa biết',
      'chưa rõ',
      'chưa từng',
      'chưa làm qua',
      'chưa có kinh nghiệm',
      'mình không biết',
      'tôi không biết',
      'em không biết',
      'em chưa biết',
      'chưa hiểu',
      'chưa nắm',
      // English
      "don't know",
      'do not know',
      "i'm not sure",
      'not sure about',
      'no idea',
      'never done',
      "haven't done",
      'not familiar with',
      'no experience with',
      // Japanese
      'わかりません',
      'わからない',
      '知りません',
      '経験がない',
    ];

    const clarificationPatterns = [
      // Vietnamese
      'ý bạn là',
      'bạn nói rõ hơn',
      'có thể nêu cụ thể hơn',
      'bạn có thể giải thích',
      'không hiểu câu hỏi',
      'câu hỏi này ý là',
      'bạn muốn hỏi gì',
      'ý là gì vậy',
      // English
      'can you clarify',
      'could you clarify',
      'what do you mean',
      'can you be more specific',
      'could you be more specific',
      'can you elaborate',
      "i don't understand the question",
      'could you rephrase',
      'can you rephrase',
      // Japanese
      'もう少し詳しく',
      '質問の意味',
      'どういう意味',
      '具体的に教えて',
    ];

    // Clarification: check regardless of length
    if (clarificationPatterns.some((p) => text.includes(p))) {
      return 'clarification_request';
    }

    // dont_know: only for short answers to avoid false positives
    if (text.length < 200 && dontKnowPatterns.some((p) => text.includes(p))) {
      return 'dont_know';
    }

    return 'answer';
  }

  private _errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
