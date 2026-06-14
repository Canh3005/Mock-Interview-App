import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type { NSDEvalLevel, NSDCheckItem } from '../types/nsd.types';
import type { InterviewLanguage } from '../../interview/entities/interview-session.entity';

const NSD_ASSESSOR_MODEL = 'llama-3.3-70b-versatile';

const FOLLOWUP_EVALUATION_COMMENT: Record<
  InterviewLanguage,
  { resolved: string; unresolved: string }
> = {
  vi: {
    resolved: 'Trả lời chính xác.',
    unresolved: 'Trả lời chưa chính xác.',
  },
  en: {
    resolved: 'That is correct.',
    unresolved: 'That is not correct yet.',
  },
  ja: {
    resolved: '正しい回答です。',
    unresolved: 'まだ正しくありません。',
  },
};

@Injectable()
export class NSDAssessorService {
  private readonly logger = new Logger(NSDAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  // ── Phase 1/2/3: holistic initial assessment ──────────────────────────────

  /**
   * Turn 1 for a feature/dimension/closing group.
   * Evaluates ALL required items at once against the candidate's first answer.
   * Returns: keys of items NOT adequately addressed.
   */
  async classifyInitial(
    candidateAnswer: string,
    groupQuestion: string,
    expectedResult: string,
    requiredItems: NSDCheckItem[],
  ): Promise<{ unresolvedKeys: string[] }> {
    const itemList = requiredItems
      .map((i) => `- key: "${i.key}" | red_flag: "${i.red_flag}"`)
      .join('\n');

    const systemPrompt = `You are an AI system design interviewer evaluating a candidate's response.

## Question asked to the candidate
"${groupQuestion}"

## What a complete answer should cover
${expectedResult}

## Check items (possible gaps)
${itemList}

Your task: list the keys of items that are NOT adequately addressed by the candidate's answer.

Respond ONLY with JSON: {"unresolved": ["key1", "key2"]}
If all items are adequately addressed, return an empty array for "unresolved".`;

    const userPrompt = `Candidate response: "${candidateAnswer}"`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: NSD_ASSESSOR_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
          temperature: 0,
        },
      });
      console.log('prompt', systemPrompt);
      console.log('Raw LLM output for classifyInitial:', raw);
      const parsed = JSON.parse(raw) as { unresolved: string[] };
      const validKeys = new Set(requiredItems.map((i) => i.key));
      const unresolvedKeys = (parsed.unresolved ?? []).filter((k) =>
        validKeys.has(k),
      );
      return { unresolvedKeys };
    } catch (err) {
      this.logger.warn(`NSD classifyInitial error: ${(err as Error).message}`);
      return {
        unresolvedKeys: requiredItems.map((i) => i.key),
      };
    }
  }

  // ── Phase 4/5: holistic initial assessment for required_explanations ─────

  /**
   * Turn 1 of a Phase 4 feature (or an integration review): one holistic LLM call
   * evaluates ALL required_explanations/integration_checks at once against the
   * candidate's first answer for this feature. Same shape as classifyInitial, but
   * uses `check` (positive pass condition) instead of `red_flag` — required_explanations
   * and integration_checks always carry `check`.
   */
  async classifyInitialPhase4(
    candidateAnswer: string,
    groupQuestion: string,
    items: Array<NSDCheckItem & { check: string }>,
  ): Promise<{ unresolvedKeys: string[] }> {
    if (items.length === 0) {
      return { unresolvedKeys: [] };
    }

    const itemList = items
      .map((i) => `- key: "${i.key}" | expected: "${i.check}"`)
      .join('\n');

    const systemPrompt = `You are an AI system design interviewer evaluating a candidate's response.

## Question asked to the candidate
"${groupQuestion}"

## Check items (what a complete answer should cover)
${itemList}

Your task: list the keys of items that are NOT adequately addressed by the candidate's answer.

Respond ONLY with JSON: {"unresolved": ["key1", "key2"]}
If all items are adequately addressed, return an empty array for "unresolved".`;

    const userPrompt = `Candidate response: "${candidateAnswer}"`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: NSD_ASSESSOR_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
          temperature: 0,
        },
      });
      const parsed = JSON.parse(raw) as { unresolved: string[] };
      const validKeys = new Set(items.map((i) => i.key));
      const unresolvedKeys = (parsed.unresolved ?? []).filter((k) =>
        validKeys.has(k),
      );
      return { unresolvedKeys };
    } catch (err) {
      this.logger.warn(
        `NSD classifyInitialPhase4 error: ${(err as Error).message}`,
      );
      return { unresolvedKeys: items.map((i) => i.key) };
    }
  }

  // ── Phase 1/2/3: followup assessment ─────────────────────────────────────

  /**
   * Followup turns — evaluates a single item's followup response.
   * Uses fill_answer as the model answer for comparison.
   * Returns: correctness-only comment + whether the item is now resolved.
   */
  async classifyFollowup(
    candidateAnswer: string,
    item: NSDCheckItem,
    language: InterviewLanguage,
  ): Promise<{ comment: string; resolved: boolean }> {
    const systemPrompt = `You are an AI system design interviewer evaluating a candidate's followup response.

## Question asked
"${item.followup_question}"

## What a satisfactory answer should cover
${item.fill_answer}

Your task:
Determine if the response adequately covers the expected content.
Do not include hints, corrections, explanations, or the expected answer in your output.

Respond ONLY with JSON: {"resolved": true|false}`;

    const userPrompt = `Candidate response: "${candidateAnswer}"`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: NSD_ASSESSOR_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 200,
          temperature: 0,
        },
      });
      const parsed = JSON.parse(raw) as { resolved: boolean };
      const resolved = parsed.resolved === true;
      return {
        comment: this._buildFollowupEvaluationComment(language, resolved),
        resolved,
      };
    } catch (err) {
      this.logger.warn(`NSD classifyFollowup error: ${(err as Error).message}`);
      return {
        comment: this._buildFollowupEvaluationComment(language, false),
        resolved: false,
      };
    }
  }

  // ── Phase 4/5: per-item counter-based assessment ──────────────────────────

  /**
   * Canvas-phase assessment — one item at a time with 4-level output.
   * Used by Phase 4 (HLD) and Phase 5 (Deep Dive).
   */
  async classify(
    candidateAnswer: string,
    item: NSDCheckItem & { check?: string; expected_result?: string },
    context: {
      phase: string;
      questionKey: string;
      questionAsked?: string;
      overallExpectedResult?: string;
    },
  ): Promise<NSDEvalLevel> {
    const systemPrompt = this._buildClassifyPrompt(item, context);
    const userPrompt = `Candidate response: "${candidateAnswer}"\n\nRespond with JSON only: {"level": "good"|"incomplete"|"weak"|"irrelevant"}`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: NSD_ASSESSOR_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 100,
          temperature: 0,
        },
      });
      const parsed = JSON.parse(raw) as { level: NSDEvalLevel };
      const validLevels: NSDEvalLevel[] = [
        'good',
        'incomplete',
        'weak',
        'irrelevant',
      ];
      if (validLevels.includes(parsed.level)) {
        return parsed.level;
      }
      this.logger.warn(`Unexpected eval level from LLM: ${parsed.level}`);
      return 'incomplete';
    } catch (err) {
      this.logger.warn(`NSD assessor error: ${(err as Error).message}`);
      return 'incomplete';
    }
  }

  private _buildClassifyPrompt(
    item: NSDCheckItem & { check?: string; expected_result?: string },
    context: {
      phase: string;
      questionKey: string;
      questionAsked?: string;
      overallExpectedResult?: string;
    },
  ): string {
    const checkCondition =
      item.check ?? item.expected_result ?? item.fill_answer;

    const questionLine = context.questionAsked
      ? `\n\n## Question asked to the candidate\n"${context.questionAsked}"`
      : '';

    const overallLine = context.overallExpectedResult
      ? `\n\n## What a complete answer to this question should cover\n${context.overallExpectedResult}`
      : '';

    return `You are an AI assessor for a system design interview (phase: ${context.phase}, topic: ${context.questionKey}).

Evaluate whether the candidate's response adequately addresses the check item below.${questionLine}${overallLine}

## Check item
- Key: ${item.key}
- What a correct response looks like: ${checkCondition}
- Red flag (what failure looks like): ${item.red_flag}

## Classification levels
- good: Response clearly satisfies the check condition. No significant gaps.
- incomplete: Response is on the right track but missing key details. A followup could help.
- weak: Response shows shallow understanding or major gaps. May benefit from a prompt.
- irrelevant: Response does not address this topic at all, or is completely off-track.

Respond ONLY with JSON: {"level": "good"|"incomplete"|"weak"|"irrelevant"}`;
  }

  private _buildFollowupEvaluationComment(
    language: InterviewLanguage,
    resolved: boolean,
  ): string {
    const comments =
      FOLLOWUP_EVALUATION_COMMENT[language] ?? FOLLOWUP_EVALUATION_COMMENT.en;
    return resolved ? comments.resolved : comments.unresolved;
  }
}
