import { Injectable } from '@nestjs/common';
import { QuestionPracticeAttempt } from '../../entities/question-practice-attempt.entity';
import {
  CandidateIntent,
  LlmRedFlagExtraction,
  LlmScoringExtraction,
  LlmSignalExtraction,
  OverallBand,
  ProbeCvClaimResult,
  ProbeRedFlagResult,
  ProbeScoringResult,
  ProbeSignalResult,
  ScoringConfidence,
} from '../../types/question-practice-scoring.types';
import { QUESTION_PRACTICE_SCORING_VERSION } from '../../constants/question-practice-scoring.constants';
import type { CatalogItem } from '../../types/question-practice-scoring.types';

@Injectable()
export class QuestionPracticeScoringResultService {
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
    const redFlags: ProbeRedFlagResult[] = this._validatedRedFlags({
      extraction,
      redFlagCatalog: this.redFlagCatalog(attempt),
      answerText: attempt.answerText,
    });
    const cvClaimResults: ProbeCvClaimResult[] = this._validatedCvClaims({
      extraction,
      answerText: attempt.answerText,
    });
    const overallBand: OverallBand = this._overallBand({ signals, redFlags });
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand,
      confidence: this._confidence({ extraction, signals }),
      summary: this.fallbackSummary({ attempt, overallBand }),
      signalResults: signals,
      redFlags,
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
      redFlags: this.redFlagCatalog(attempt).map((item: CatalogItem) =>
        this._absentRedFlag(item),
      ),
      cvClaimResults: [],
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent,
    };
  }

  signalCatalog(attempt: QuestionPracticeAttempt): CatalogItem[] {
    return attempt.probeSnapshot.rubric.expectedSignals.map(
      (label: string, index: number) => ({
        key: `signal_${index + 1}`,
        label,
      }),
    );
  }

  redFlagCatalog(attempt: QuestionPracticeAttempt): CatalogItem[] {
    return attempt.probeSnapshot.rubric.redFlags.map(
      (label: string, index: number) => ({
        key: `red_flag_${index + 1}`,
        label,
      }),
    );
  }

  /**
   * Build ProbeScoringResult từ raw params, không cần QuestionPracticeAttempt.
   * Dùng cho scoreForRuntime (F032 probe-based flow).
   *
   * @param extraction - Kết quả extraction từ LLM
   * @param signalCatalog - Danh sách signal keys + labels của probe
   * @param redFlagCatalog - Danh sách red flag keys + labels của probe
   * @param answerText - Toàn bộ candidate text trong probe (cumulative)
   * @param language - Ngôn ngữ phỏng vấn để hiển thị fallback summary
   * @returns ProbeScoringResult đã build và validate
   */
  buildResultFromRaw({
    extraction,
    signalCatalog,
    redFlagCatalog,
    answerText,
    language,
  }: {
    extraction: LlmScoringExtraction;
    signalCatalog: CatalogItem[];
    redFlagCatalog: CatalogItem[];
    answerText: string;
    language: string;
  }): ProbeScoringResult {
    const signals: ProbeSignalResult[] = this._validatedSignals({
      extraction,
      signalCatalog,
      answerText,
    });
    const redFlags: ProbeRedFlagResult[] = this._validatedRedFlags({
      extraction,
      redFlagCatalog,
      answerText,
    });
    const cvClaimResults: ProbeCvClaimResult[] = this._validatedCvClaims({
      extraction,
      answerText,
    });
    const overallBand: OverallBand = this._overallBand({ signals, redFlags });
    return {
      scoringVersion: QUESTION_PRACTICE_SCORING_VERSION,
      overallBand,
      confidence: this._confidence({ extraction, signals }),
      summary: `Feedback is based on the probe answered in ${language}.`,
      signalResults: signals,
      redFlags,
      cvClaimResults,
      improvementSuggestions: this.fallbackSuggestions({ signals }),
      candidateIntent: extraction.candidateIntent ?? 'answer',
    };
  }

  /**
   * Build insufficient evidence result từ raw catalogs, không cần attempt.
   *
   * @param signalCatalog - Signal catalog của probe
   * @param redFlagCatalog - Red flag catalog của probe
   * @param language - Ngôn ngữ phỏng vấn
   * @param candidateIntent - Intent phát hiện được (default: 'answer')
   * @returns ProbeScoringResult với overallBand = 'insufficient_evidence'
   */
  insufficientEvidenceResultFromRaw({
    signalCatalog,
    redFlagCatalog,
    language,
    candidateIntent = 'answer',
  }: {
    signalCatalog: CatalogItem[];
    redFlagCatalog: CatalogItem[];
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
      redFlags: redFlagCatalog.map((item: CatalogItem) =>
        this._absentRedFlag(item),
      ),
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
      if (!found) return this._missingSignal(item);
      const quotes: string[] = this._validQuotes({
        quotes: found.evidenceQuotes,
        answerText,
      });
      if (found.status !== 'missing' && quotes.length === 0) {
        return this._missingSignal(item);
      }
      return {
        key: item.key,
        label: item.label,
        status: found.status,
        evidenceQuotes: quotes,
        feedback: found.feedback || item.label,
      };
    });
  }

  private _validatedRedFlags({
    extraction,
    redFlagCatalog,
    answerText,
  }: {
    extraction: LlmScoringExtraction;
    redFlagCatalog: CatalogItem[];
    answerText: string;
  }): ProbeRedFlagResult[] {
    return redFlagCatalog.map((item: CatalogItem) => {
      const found: LlmRedFlagExtraction | undefined = extraction.redFlags.find(
        (redFlag: LlmRedFlagExtraction) => redFlag.key === item.key,
      );
      if (!found) return this._absentRedFlag(item);
      const quotes: string[] = this._validQuotes({
        quotes: found.evidenceQuotes,
        answerText,
      });
      if (found.present && quotes.length === 0)
        return this._absentRedFlag(item);
      return {
        key: item.key,
        label: item.label,
        present: found.present,
        evidenceQuotes: quotes,
        feedback: found.feedback || item.label,
      };
    });
  }

  private _validatedCvClaims({
    extraction,
    answerText,
  }: {
    extraction: LlmScoringExtraction;
    answerText: string;
  }): ProbeCvClaimResult[] {
    return extraction.cvClaims.map((claim) => {
      const quotes: string[] = this._validQuotes({
        quotes: claim.evidenceQuotes,
        answerText,
      });
      return {
        claim: claim.claim,
        verification:
          claim.verification === 'verified' && quotes.length === 0
            ? 'not_verified'
            : claim.verification,
        evidenceQuotes: quotes,
        feedback: claim.feedback,
      };
    });
  }

  private _overallBand({
    signals,
    redFlags,
  }: {
    signals: ProbeSignalResult[];
    redFlags: ProbeRedFlagResult[];
  }): OverallBand {
    if (signals.length === 0) return 'insufficient_evidence';
    const score: number = signals.reduce(
      (sum: number, signal: ProbeSignalResult) =>
        sum +
        (signal.status === 'covered' ? 2 : signal.status === 'unclear' ? 1 : 0),
      0,
    );
    const maxScore: number = signals.length * 2;
    const redPenalty: number = redFlags.filter(
      (redFlag: ProbeRedFlagResult) => redFlag.present,
    ).length;
    const ratio: number = Math.max(0, score / maxScore - redPenalty * 0.15);
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

  private _normalize(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private _missingSignal(item: CatalogItem): ProbeSignalResult {
    return {
      key: item.key,
      label: item.label,
      status: 'missing',
      evidenceQuotes: [],
      feedback: 'No clear evidence was found for this signal.',
    };
  }

  private _absentRedFlag(item: CatalogItem): ProbeRedFlagResult {
    return {
      key: item.key,
      label: item.label,
      present: false,
      evidenceQuotes: [],
      feedback: 'No clear red flag evidence was found.',
    };
  }
}
