import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type {
  QuestionProbeLanguage,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';
import type {
  QuestionProbe,
  QuestionProbeLocalizedContent,
} from '../../question-bank/entities/question-probe.entity';

export interface ProbeEmbeddingText {
  language: QuestionProbeLanguage;
  canonicalText: string;
  contentHash: string;
}

@Injectable()
export class ProbeEmbeddingTextService {
  build({
    probe,
    language,
  }: {
    probe: QuestionProbe;
    language: QuestionProbeLanguage;
  }): ProbeEmbeddingText | null {
    const localized = probe.localizedContent?.[language];
    if (!localized) return null;

    const canonicalText = this._compactLines([
      this._line('Title', localized.title),
      this._line('Code', probe.code),
      this._line('Primary question', probe.primaryQuestion),
      this._line('Localized question', localized.displayQuestion),
      this._line('Intent', probe.intent),
      this._line('Localized intent', localized.displayIntent),
      this._line('Guidance', localized.guidance),
      this._line('Common mistakes', localized.commonMistakes),
      this._line('Expected signals', this._formatExpectedSignals(probe)),
      this._line('Scoring hints', this._formatScoringHints(probe)),
      this._line('Follow ups', this._formatFollowUps(probe)),
      this._line('Type', probe.type),
      this._line('Conversation depth', probe.conversationDepth),
      this._line('Difficulty', probe.difficulty),
      this._line('Competencies', probe.competencies),
      this._line('Tech tags', probe.techTags),
      this._line('Suitable stages', probe.stages),
      this._line('Suitable levels', probe.levels),
      this._line('Suitable role families', probe.roleFamilies),
      this._line('Labels', this._stableStringify(localized.labels)),
      this._line('Source references', this._formatSourceReferences(probe)),
    ]);

    return {
      language,
      canonicalText,
      contentHash: createHash('sha256').update(canonicalText).digest('hex'),
    };
  }

  languagesForProbe(probe: QuestionProbe): QuestionProbeLanguage[] {
    return Object.keys(probe.localizedContent ?? {}).filter(
      (language): language is QuestionProbeLanguage =>
        ['vi', 'en', 'ja'].includes(language),
    );
  }

  private _formatScoringHints(probe: QuestionProbe): string[] {
    return probe.scoringHints.map(
      (hint) => `${hint.scoreBand}: ${hint.description}`,
    );
  }

  private _formatExpectedSignals(probe: QuestionProbe): string[] {
    return probe.expectedSignals.map((signal) => signal.label);
  }

  private _formatFollowUps(probe: QuestionProbe): string[] {
    return probe.followUps.map(
      (followUp) =>
        `${followUp.trigger}: ${followUp.question} (${followUp.purpose})`,
    );
  }

  private _formatSourceReferences(probe: QuestionProbe): string[] {
    return probe.sourceReferences.map((ref) =>
      [ref.label, ref.note, ref.url].filter(Boolean).join(' | '),
    );
  }

  private _line(
    label: string,
    value:
      | string
      | number
      | null
      | undefined
      | string[]
      | QuestionProbeStage[]
      | QuestionProbeLevel[]
      | QuestionProbeRoleFamily[],
  ): string | null {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return `${label}: ${value.join(', ')}`;
    }
    const text = String(value).trim();
    if (!text) return null;
    return `${label}: ${text}`;
  }

  private _stableStringify(value: QuestionProbeLocalizedContent['labels']) {
    const sortedEntries = Object.entries(value ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    if (sortedEntries.length === 0) return null;
    return sortedEntries.map(([key, text]) => `${key}: ${text}`).join(', ');
  }

  private _compactLines(lines: Array<string | null>): string {
    return lines.filter((line): line is string => Boolean(line)).join('\n');
  }
}
