import { Injectable, Logger } from '@nestjs/common';
import {
  QUESTION_PROBE_COMPETENCIES,
  QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
  QUESTION_PROBE_LANGUAGES,
  QUESTION_PROBE_LEVELS,
  QUESTION_PROBE_ROLE_FAMILIES,
  QUESTION_PROBE_STAGES,
  QUESTION_PROBE_TYPES,
} from '../../constants/question-bank-taxonomy.constants';
import {
  ProbeValidationIssue,
  ProbeValidationResult,
} from '../../types/question-probe-validation.types';

@Injectable()
export class QuestionProbeValidationService {
  private readonly logger = new Logger(QuestionProbeValidationService.name);

  validate(input: unknown): ProbeValidationResult {
    const issues: ProbeValidationIssue[] = [];
    if (!this._isRecord(input)) {
      return {
        valid: false,
        issues: [{ field: 'root', message: 'Probe payload must be an object' }],
      };
    }

    this._validateCoreTaxonomy({ input, issues });
    this._validateGuidanceFields({ input, issues });
    this._validateScoringHints(input.scoringHints, issues);
    this._validateFollowUps(input.followUps, issues);
    this._validateLocalizedContent(input.localizedContent, issues);

    if (issues.length > 0) {
      this.logger.warn(`QuestionProbe validation failed: ${issues.length}`);
    }

    return { valid: issues.length === 0, issues };
  }

  private _validateCoreTaxonomy({
    input,
    issues,
  }: {
    input: Record<string, unknown>;
    issues: ProbeValidationIssue[];
  }): void {
    this._validateEnumArray({
      field: 'stages',
      values: input.stages,
      allowed: QUESTION_PROBE_STAGES,
      issues,
    });
    this._validateEnumArray({
      field: 'roleFamilies',
      values: input.roleFamilies,
      allowed: QUESTION_PROBE_ROLE_FAMILIES,
      issues,
    });
    this._validateEnumArray({
      field: 'levels',
      values: input.levels,
      allowed: QUESTION_PROBE_LEVELS,
      issues,
    });
    this._validateEnumValue({
      field: 'type',
      value: input.type,
      allowed: QUESTION_PROBE_TYPES,
      issues,
    });
    this._validateEnumArray({
      field: 'competencies',
      values: input.competencies,
      allowed: QUESTION_PROBE_COMPETENCIES,
      issues,
    });
    this._validateDifficulty(input.difficulty, issues);
  }

  private _validateGuidanceFields({
    input,
    issues,
  }: {
    input: Record<string, unknown>;
    issues: ProbeValidationIssue[];
  }): void {
    this._validateNonEmptyText({
      field: 'intent',
      value: input.intent,
      issues,
    });
    this._validateNonEmptyText({
      field: 'primaryQuestion',
      value: input.primaryQuestion,
      issues,
    });
    this._validateExpectedSignals(input.expectedSignals, issues);
  }

  private _validateEnumArray({
    field,
    values,
    allowed,
    issues,
  }: {
    field: string;
    values: unknown;
    allowed: readonly string[];
    issues: ProbeValidationIssue[];
  }): void {
    if (!Array.isArray(values) || values.length === 0) {
      issues.push({ field, message: `${field} must be a non-empty array` });
      return;
    }

    const hasInvalid: boolean = values.some(
      (value: unknown) => typeof value !== 'string' || !allowed.includes(value),
    );
    if (hasInvalid) {
      issues.push({ field, message: `${field} contains invalid values` });
    }
  }

  private _validateEnumValue({
    field,
    value,
    allowed,
    issues,
  }: {
    field: string;
    value: unknown;
    allowed: readonly string[];
    issues: ProbeValidationIssue[];
  }): void {
    if (typeof value === 'string' && allowed.includes(value)) return;
    issues.push({ field, message: `${field} must be a valid taxonomy value` });
  }

  private _validateDifficulty(
    value: unknown,
    issues: ProbeValidationIssue[],
  ): void {
    if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5) {
      return;
    }
    issues.push({ field: 'difficulty', message: 'difficulty must be 1-5' });
  }

  private _validateNonEmptyText({
    field,
    value,
    issues,
  }: {
    field: string;
    value: unknown;
    issues: ProbeValidationIssue[];
  }): void {
    if (typeof value === 'string' && value.trim().length > 0) return;
    issues.push({ field, message: `${field} must be a non-empty string` });
  }

  private _validateNonEmptyTextArray({
    field,
    value,
    issues,
  }: {
    field: string;
    value: unknown;
    issues: ProbeValidationIssue[];
  }): void {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({ field, message: `${field} must be a non-empty array` });
      return;
    }

    const hasInvalid: boolean = value.some(
      (item: unknown) => typeof item !== 'string' || item.trim().length === 0,
    );
    if (hasInvalid) {
      issues.push({ field, message: `${field} must contain only text items` });
    }
  }

  private _validateScoringHints(
    value: unknown,
    issues: ProbeValidationIssue[],
  ): void {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({
        field: 'scoringHints',
        message: 'scoringHints must be a non-empty array',
      });
      return;
    }

    value.forEach((item: unknown, index: number): void => {
      if (!this._isRecord(item)) {
        issues.push(this._nestedIssue('scoringHints', index));
        return;
      }
      this._validateNonEmptyText({
        field: `scoringHints.${index}.scoreBand`,
        value: item.scoreBand,
        issues,
      });
      this._validateNonEmptyText({
        field: `scoringHints.${index}.description`,
        value: item.description,
        issues,
      });
    });
  }

  private _validateExpectedSignals(
    value: unknown,
    issues: ProbeValidationIssue[],
  ): void {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({
        field: 'expectedSignals',
        message: 'expectedSignals must be a non-empty array',
      });
      return;
    }

    value.forEach((item: unknown, index: number): void => {
      if (!this._isRecord(item)) {
        issues.push(this._nestedIssue('expectedSignals', index));
        return;
      }
      this._validateNonEmptyText({
        field: `expectedSignals.${index}.label`,
        value: item.label,
        issues,
      });
      if (item.relatedTrigger !== null && item.relatedTrigger !== undefined) {
        this._validateEnumValue({
          field: `expectedSignals.${index}.relatedTrigger`,
          value: item.relatedTrigger,
          allowed: QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
          issues,
        });
      }
      if (Array.isArray(item.requirements)) {
        const seenKeys = new Set<string>();
        item.requirements.forEach((req: unknown, reqIdx: number): void => {
          if (!this._isRecord(req)) {
            issues.push(this._nestedIssue(`expectedSignals.${index}.requirements`, reqIdx));
            return;
          }
          this._validateNonEmptyText({
            field: `expectedSignals.${index}.requirements.${reqIdx}.key`,
            value: req.key,
            issues,
          });
          this._validateNonEmptyText({
            field: `expectedSignals.${index}.requirements.${reqIdx}.description`,
            value: req.description,
            issues,
          });
          if (typeof req.key === 'string' && req.key.trim()) {
            const k = req.key.trim();
            if (seenKeys.has(k)) {
              issues.push({
                field: `expectedSignals.${index}.requirements.${reqIdx}.key`,
                message: `Duplicate requirement key "${k}" within signal ${index}`,
              });
            }
            seenKeys.add(k);
          }
        });
      }
    });
  }

  private _validateFollowUps(
    value: unknown,
    issues: ProbeValidationIssue[],
  ): void {
    if (!Array.isArray(value) || value.length === 0) {
      issues.push({
        field: 'followUps',
        message: 'followUps must be a non-empty array',
      });
      return;
    }

    value.forEach((item: unknown, index: number): void => {
      if (!this._isRecord(item)) {
        issues.push(this._nestedIssue('followUps', index));
        return;
      }
      this._validateEnumValue({
        field: `followUps.${index}.trigger`,
        value: item.trigger,
        allowed: QUESTION_PROBE_FOLLOW_UP_TRIGGERS,
        issues,
      });
      this._validateNonEmptyText({
        field: `followUps.${index}.question`,
        value: item.question,
        issues,
      });
      this._validateNonEmptyText({
        field: `followUps.${index}.purpose`,
        value: item.purpose,
        issues,
      });
    });
  }

  private _validateLocalizedContent(
    value: unknown,
    issues: ProbeValidationIssue[],
  ): void {
    if (!this._isRecord(value)) {
      issues.push({
        field: 'localizedContent',
        message: 'localizedContent must be an object keyed by locale',
      });
      return;
    }

    QUESTION_PROBE_LANGUAGES.forEach((language: string): void => {
      this._validateLocaleContent({
        language,
        content: value[language],
        issues,
      });
    });
  }

  private _validateLocaleContent({
    language,
    content,
    issues,
  }: {
    language: string;
    content: unknown;
    issues: ProbeValidationIssue[];
  }): void {
    if (!this._isRecord(content)) {
      issues.push({
        field: `localizedContent.${language}`,
        message: `localizedContent.${language} is required`,
      });
      return;
    }

    ['title', 'displayQuestion', 'displayIntent'].forEach(
      (fieldName: string): void => {
        this._validateNonEmptyText({
          field: `localizedContent.${language}.${fieldName}`,
          value: content[fieldName],
          issues,
        });
      },
    );
    this._validateNonEmptyTextArray({
      field: `localizedContent.${language}.guidance`,
      value: content.guidance,
      issues,
    });
    this._validateNonEmptyTextArray({
      field: `localizedContent.${language}.commonMistakes`,
      value: content.commonMistakes,
      issues,
    });
  }

  private _nestedIssue(field: string, index: number): ProbeValidationIssue {
    return {
      field: `${field}.${index}`,
      message: `${field}.${index} must be an object`,
    };
  }

  private _isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
