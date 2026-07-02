import { Injectable, Logger } from '@nestjs/common';
import { QuestionPracticeAttempt } from '../../entities/question-practice-attempt.entity';
import {
  CandidateIntent,
  LlmRequirementExtraction,
  LlmScoringExtraction,
  LlmSignalExtraction,
  OverallBand,
  ProbeCvClaimResult,
  ProbeScoringResult,
  ProbeSignalRequirementResult,
  ProbeSignalResult,
  SignalStatus,
  ScoringConfidence,
} from '../../types/question-practice-scoring.types';
import { QUESTION_PRACTICE_SCORING_VERSION } from '../../constants/question-practice-scoring.constants';
import type {
  CatalogItem,
  CatalogItemRequirement,
} from '../../types/question-practice-scoring.types';

@Injectable()
export class QuestionPracticeScoringResultService {
  private readonly logger = new Logger(
    QuestionPracticeScoringResultService.name,
  );
  buildResult({
    attempt,
    extraction,
  }: {
    attempt: QuestionPracticeAttempt;
    extraction: LlmScoringExtraction;
  }): ProbeScoringResult {
    const signals: ProbeSignalResult[] = this._validatedSignals({
      extraction,
      signalCatalog: this.signalCatalog(attempt),
      answerText: attempt.answerText,
    });
    const cvClaimResults: ProbeCvClaimResult[] = this._validatedCvClaims({
      extraction,
      answerText: attempt.answerText,
    });
    const overallBand: OverallBand = this._overallBand(signals);
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand,
      confidence: this._confidence({ extraction, signals }),
      summary: this.fallbackSummary({ attempt, overallBand }),
      signalResults: signals,
      cvClaimResults,
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent: extraction.candidateIntent ?? 'answer',
    };
  }

  insufficientEvidenceResult(
    attempt: QuestionPracticeAttempt,
    candidateIntent: CandidateIntent = 'answer',
  ): ProbeScoringResult {
    const signals: ProbeSignalResult[] = this.signalCatalog(attempt).map(
      (item: CatalogItem) => this._missingSignal(item),
    );
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand: 'insufficient_evidence',
      confidence: 'low',
      summary: this.fallbackSummary({
        attempt,
        overallBand: 'insufficient_evidence',
      }),
      signalResults: signals,
      cvClaimResults: [],
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent,
    };
  }

  signalCatalog(attempt: QuestionPracticeAttempt): CatalogItem[] {
    return attempt.probeSnapshot.rubric.expectedSignals.map(
      (signal, index: number) => ({
        key: `signal_${index + 1}`,
        label: signal.label,
        relatedTrigger: signal.relatedTrigger,
        requirements: signal.requirements as
          | CatalogItemRequirement[]
          | undefined,
      }),
    );
  }

  /**
   * Build ProbeScoringResult từ raw params, không cần QuestionPracticeAttempt.
   * Dùng cho scoreForRuntime (F032 probe-based flow).
   *
   * @param extraction - Kết quả extraction từ LLM
   * @param signalCatalog - Danh sách signal keys + labels của probe
   * @param answerText - Toàn bộ candidate text trong probe (cumulative)
   * @param language - Ngôn ngữ phỏng vấn để hiển thị fallback summary
   * @returns ProbeScoringResult đã build và validate
   */
  buildResultFromRaw({
    extraction,
    signalCatalog,
    answerText,
    language,
    cvClaimCatalog = [],
  }: {
    extraction: LlmScoringExtraction;
    signalCatalog: CatalogItem[];
    answerText: string;
    language: string;
    cvClaimCatalog?: { key: string; claim: string }[];
  }): ProbeScoringResult {
    const signals: ProbeSignalResult[] = this._validatedSignals({
      extraction,
      signalCatalog,
      answerText,
    });
    const cvClaimResults: ProbeCvClaimResult[] = this._validatedCvClaims({
      extraction,
      answerText,
      cvClaimCatalog,
    });
    const overallBand: OverallBand = this._overallBand(signals);
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand,
      confidence: this._confidence({ extraction, signals }),
      summary: `Feedback is based on the probe answered in ${language}.`,
      signalResults: signals,
      cvClaimResults,
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent: extraction.candidateIntent ?? 'answer',
    };
  }

  /**
   * Build insufficient evidence result từ raw catalogs, không cần attempt.
   *
   * @param signalCatalog - Signal catalog của probe
   * @param language - Ngôn ngữ phỏng vấn
   * @param candidateIntent - Intent phát hiện được (default: 'answer')
   * @returns ProbeScoringResult với overallBand = 'insufficient_evidence'
   */
  insufficientEvidenceResultFromRaw({
    signalCatalog,
    language,
    candidateIntent = 'answer',
  }: {
    signalCatalog: CatalogItem[];
    language: string;
    candidateIntent?: CandidateIntent;
  }): ProbeScoringResult {
    const signals: ProbeSignalResult[] = signalCatalog.map(
      (item: CatalogItem) => this._missingSignal(item),
    );
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand: 'insufficient_evidence',
      confidence: 'low',
      summary: `There is not enough evidence in the answer to evaluate fully. (${language})`,
      signalResults: signals,
      cvClaimResults: [],
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent,
    };
  }

  fallbackSuggestions({ signals }: { signals: ProbeSignalResult[] }): string[] {
    const missing: ProbeSignalResult[] = signals.filter(
      (signal: ProbeSignalResult) => signal.status !== 'covered',
    );
    if (missing.length === 0)
      return ['Keep using concrete evidence and metrics.'];
    return missing.slice(0, 3).map(() => {
      return 'Add a more concrete example, your personal action, and measurable outcome.';
    });
  }

  fallbackSummary({
    attempt,
    overallBand,
  }: {
    attempt: QuestionPracticeAttempt;
    overallBand: OverallBand;
  }): string {
    if (overallBand === 'insufficient_evidence') {
      return 'There is not enough evidence in the answer to evaluate fully.';
    }
    return `Feedback is based on the probe answered in ${attempt.feedbackLocale}.`;
  }

  private _validatedSignals({
    extraction,
    signalCatalog,
    answerText,
  }: {
    extraction: LlmScoringExtraction;
    signalCatalog: CatalogItem[];
    answerText: string;
  }): ProbeSignalResult[] {
    return signalCatalog.map((item: CatalogItem) => {
      const found: LlmSignalExtraction | undefined = extraction.signals.find(
        (signal: LlmSignalExtraction) => signal.key === item.key,
      );
      if (!found) {
        // B3: model omitted this signal entirely — distinct from model saying 'missing'
        this.logger.warn(
          `Signal omitted by model: ${item.key} (${item.label})`,
        );
        return this._missingSignal(item);
      }

      // S3: requirement path — code deterministically computes status from evidence
      if (item.requirements?.length) {
        return this._signalFromRequirements(item, found, answerText);
      }

      // Legacy path (transition until probe data enriched with requirements)
      // B2b: preserve model's status/feedback even when quotes fail normalization
      const quotes: string[] = this._validQuotes({
        quotes: found.evidenceQuotes,
        answerText,
      });
      return {
        key: item.key,
        status: found.status,
        evidenceQuotes: quotes,
        feedback: found.feedback || item.label,
        relatedTrigger: item.relatedTrigger ?? null,
      };
    });
  }

  // S3: requirement-path helpers

  private _signalFromRequirements(
    item: CatalogItem,
    found: LlmSignalExtraction,
    answerText: string,
  ): ProbeSignalResult {
    const requirements: CatalogItemRequirement[] = item.requirements!;
    const requirementResults: ProbeSignalRequirementResult[] =
      this._validatedRequirementResults(
        requirements,
        found.requirementResults ?? [],
        answerText,
      );
    const status: SignalStatus =
      this._statusFromRequirementResults(requirementResults);
    const evidenceQuotes: string[] =
      this._uniqueRequirementQuotes(requirementResults);
    const feedback: string = this._feedbackFromRequirements(
      requirementResults,
      status,
      found.feedback,
    );
    return {
      key: item.key,
      status,
      evidenceQuotes,
      feedback,
      relatedTrigger: item.relatedTrigger ?? null,
      requirementResults,
    };
  }

  private _validatedRequirementResults(
    requirements: CatalogItemRequirement[],
    extracted: LlmRequirementExtraction[],
    answerText: string,
  ): ProbeSignalRequirementResult[] {
    return requirements.map((req) => {
      const found = extracted.find((r) => r.key === req.key);
      if (!found || !found.supported) {
        return {
          key: req.key,
          description: req.description,
          supported: false as const,
          evidenceQuotes: [] as string[],
          feedback: found?.feedback ?? '',
        };
      }
      const quotes: string[] = this._validQuotes({
        quotes: found.evidenceQuotes,
        answerText,
      });
      if (quotes.length === 0) {
        return {
          key: req.key,
          description: req.description,
          supported: false as const,
          evidenceQuotes: [] as string[],
          feedback: found.feedback,
        };
      }
      return {
        key: req.key,
        description: req.description,
        supported: true as const,
        evidenceQuotes: quotes,
        feedback: found.feedback,
      };
    });
  }

  private _statusFromRequirementResults(
    results: ProbeSignalRequirementResult[],
  ): SignalStatus {
    const supportedCount: number = results.filter((r) => r.supported).length;
    if (supportedCount === 0) return 'missing';
    if (supportedCount === results.length) return 'covered';
    return 'unclear';
  }

  private _uniqueRequirementQuotes(
    results: ProbeSignalRequirementResult[],
  ): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const r of results) {
      for (const q of r.evidenceQuotes) {
        if (!seen.has(q)) {
          seen.add(q);
          unique.push(q);
        }
      }
    }
    return unique;
  }

  private _feedbackFromRequirements(
    results: ProbeSignalRequirementResult[],
    status: SignalStatus,
    modelFeedback: string,
  ): string {
    if (status === 'covered') return modelFeedback || 'All requirements met.';
    const missing: string[] = results
      .filter((r) => !r.supported)
      .map((r) => r.description);
    if (missing.length > 0) return `Missing: ${missing.join('; ')}.`;
    return modelFeedback || '';
  }

  private _validatedCvClaims({
    extraction,
    answerText,
    cvClaimCatalog = [],
  }: {
    extraction: LlmScoringExtraction;
    answerText: string;
    cvClaimCatalog?: { key: string; claim: string }[];
  }): ProbeCvClaimResult[] {
    const results: ProbeCvClaimResult[] = [];
    for (const entry of extraction.cvClaims) {
      const catalogEntry =
        cvClaimCatalog.find((c) => c.key === entry.key) ??
        (entry.claim
          ? cvClaimCatalog.find((c) => c.claim === entry.claim)
          : undefined);
      if (cvClaimCatalog.length > 0 && !catalogEntry) continue;
      const claimText: string = catalogEntry?.claim ?? entry.claim ?? '';
      const quotes: string[] = this._validQuotes({
        quotes: entry.evidenceQuotes,
        answerText,
      });
      const needsQuote =
        entry.verification === 'verified' ||
        entry.verification === 'inflated_risk';
      results.push({
        key: entry.key,
        claim: claimText,
        verification:
          needsQuote && quotes.length === 0
            ? 'not_verified'
            : entry.verification,
        evidenceQuotes: quotes,
        feedback: entry.feedback,
      });
    }
    return results;
  }

  private _overallBand(signals: ProbeSignalResult[]): OverallBand {
    if (signals.length === 0) return 'insufficient_evidence';
    const score: number = signals.reduce(
      (sum: number, signal: ProbeSignalResult) =>
        sum +
        (signal.status === 'covered' ? 2 : signal.status === 'unclear' ? 1 : 0),
      0,
    );
    const maxScore: number = signals.length * 2;
    const ratio: number = score / maxScore;
    // B4: near-empty answers that slipped past MIN_EVALUABLE_CHARS gate still get redirected
    if (ratio < 0.2) return 'insufficient_evidence';
    if (ratio >= 0.8) return 'strong';
    if (ratio >= 0.55) return 'solid';
    return 'needs_work';
  }

  private _confidence({
    extraction,
    signals,
  }: {
    extraction: LlmScoringExtraction;
    signals: ProbeSignalResult[];
  }): ScoringConfidence {
    const hasUnclear: boolean = signals.some(
      (signal: ProbeSignalResult) => signal.status === 'unclear',
    );
    if (extraction.confidence === 'high' && hasUnclear) return 'medium';
    return extraction.confidence;
  }

  private _validQuotes({
    quotes,
    answerText,
  }: {
    quotes: string[];
    answerText: string;
  }): string[] {
    const normalizedAnswer: string = this._normalize(answerText);
    return quotes
      .map((quote: string) => quote.trim())
      .filter((quote: string) => quote.length > 0)
      .filter((quote: string) =>
        normalizedAnswer.includes(this._normalize(quote)),
      );
  }

  /** B2a: strip diacritical marks + normalize punctuation to reduce Vietnamese quote drift. */
  private _normalize(value: string): string {
    return (
      value
        .normalize('NFC')
        .normalize('NFD')
        // strip combining diacritical marks (handles Vietnamese diacritic drift from LLM)
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[""''`]/g, '"')
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  private _missingSignal(item: CatalogItem): ProbeSignalResult {
    return {
      key: item.key,
      status: 'missing',
      evidenceQuotes: [],
      feedback: 'No clear evidence was found for this signal.',
      relatedTrigger: item.relatedTrigger ?? null,
    };
  }
}
