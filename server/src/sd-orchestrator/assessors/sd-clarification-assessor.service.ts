import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDClarificationAssessment,
  SDClarificationData,
  SDClarificationTracker,
} from '../types/sd-orchestrator.types';
import { DIMENSION_COVERAGE_SIGNALS } from '../planners/sd-clarification-planner.service';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface LLMClarificationOutput {
  candidateIntent: string;
  dimensionCovered: string[];
  matchedFactKey: string | null;
  solutionLeapDetected: boolean;
  requirementCoverage: number;
  questionSpecificity: number;
  assumptionDiscipline: number;
  prioritization: number;
}

@Injectable()
export class SDClarificationAssessorService {
  private readonly logger = new Logger(SDClarificationAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  async assess(
    candidateText: string,
    data: SDClarificationData,
    tracker: SDClarificationTracker,
    context: { language: string; level: string },
  ): Promise<SDClarificationAssessment> {
    const systemPrompt = this._buildSystemPrompt(data, tracker, context);
    const userPrompt = `Candidate said: "${candidateText}"\n\nRespond with JSON only.`;
    try {
      const raw = await this.groq.generateJsonContent({
        model: GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 600 },
      });
      const parsed = JSON.parse(raw) as LLMClarificationOutput;
      return this._mapToAssessment(parsed);
    } catch (err) {
      this.logger.warn(
        `Clarification assessor error: ${(err as Error).message}`,
      );
      return this._fallbackAssessment();
    }
  }

  private _buildSystemPrompt(
    data: SDClarificationData,
    tracker: SDClarificationTracker,
    context: { language: string; level: string },
  ): string {
    const factsContext = data.facts
      .map(
        (f) =>
          `- ${f.key} (${f.dimension}): disclose_when=[${f.discloseWhen.join(', ')}]`,
      )
      .join('\n');

    const coverageSignals = Object.entries(DIMENSION_COVERAGE_SIGNALS)
      .map(([dim, signals]) => `- ${dim}: [${signals.slice(0, 5).join(', ')}]`)
      .join('\n');

    const alreadyCovered =
      tracker.progress.coveredDimensions.join(', ') || 'none';
    const alreadyDisclosed =
      tracker.progress.disclosedFactKeys.join(', ') || 'none';

    return `You are an AI assessor for a system design interview. Analyze the candidate's statement and output structured JSON.

# Context
- Candidate level: ${context.level}
- Language: ${context.language}
- Dimensions already covered: ${alreadyCovered}
- Facts already disclosed: ${alreadyDisclosed}

# Available Facts (for matchedFactKey detection)
${factsContext}

# Dimension Coverage Signals (use these as semantic hints — not the only signals)
${coverageSignals}

# Instructions
Analyze the candidate text and produce JSON with:
- candidateIntent: one of ['clarification_question', 'requirement_summary', 'direct_answer', 'solution_leap', 'ready_to_continue', 'off_topic', 'dont_know']
- dimensionCovered: array of dimensions this candidate text addresses. Use these only: scope, scale, nfr, data, constraints, non_goal. Conservative — only include if clearly present.
- matchedFactKey: the factKey (from Available Facts) that matches what the candidate asked about. Use discloseWhen keywords as semantic hints. null if no clear match.
- solutionLeapDetected: true if candidate starts talking about implementation/architecture before gathering enough requirements.
- requirementCoverage: 0.0-1.0 — how much this question contributes to requirement coverage.
- questionSpecificity: 0.0-1.0 — how specific and targeted the question is (vs generic).
- assumptionDiscipline: 0.0-1.0 — does candidate ask before assuming? (1.0 = great discipline).
- prioritization: 0.0-1.0 — does candidate ask in a logical, priority-ordered manner?

Respond with raw JSON only. No markdown, no explanation.`;
  }

  private _mapToAssessment(
    parsed: LLMClarificationOutput,
  ): SDClarificationAssessment {
    const validIntents = [
      'clarification_question',
      'requirement_summary',
      'direct_answer',
      'solution_leap',
      'ready_to_continue',
      'off_topic',
      'dont_know',
    ];
    const candidateIntent = validIntents.includes(parsed.candidateIntent)
      ? (parsed.candidateIntent as any)
      : 'clarification_question';

    return {
      candidateIntent,
      signals: {
        dimensionCovered: Array.isArray(parsed.dimensionCovered)
          ? parsed.dimensionCovered
          : [],
        factDisclosed: parsed.matchedFactKey !== null,
        matchedFactKey: parsed.matchedFactKey ?? null,
        solutionLeapDetected: Boolean(parsed.solutionLeapDetected),
      },
      scoreDelta: {
        requirementCoverage: Math.max(
          0,
          Math.min(1, parsed.requirementCoverage ?? 0),
        ),
        questionSpecificity: Math.max(
          0,
          Math.min(1, parsed.questionSpecificity ?? 0),
        ),
        assumptionDiscipline: Math.max(
          0,
          Math.min(1, parsed.assumptionDiscipline ?? 0),
        ),
        prioritization: Math.max(0, Math.min(1, parsed.prioritization ?? 0)),
      },
      redFlags: [],
    };
  }

  private _fallbackAssessment(): SDClarificationAssessment {
    return {
      candidateIntent: 'clarification_question',
      signals: {
        dimensionCovered: [],
        factDisclosed: false,
        matchedFactKey: null,
        solutionLeapDetected: false,
      },
      scoreDelta: {
        requirementCoverage: 0,
        questionSpecificity: 0.3,
        assumptionDiscipline: 0.5,
        prioritization: 0.3,
      },
      redFlags: [],
    };
  }
}
