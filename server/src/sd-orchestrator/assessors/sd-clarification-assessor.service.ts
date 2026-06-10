import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDClarificationAssessment,
  SDClarificationData,
  SDClarificationTracker,
  SDCandidateIntent,
} from '../types/sd-orchestrator.types';
import { SD_ASSESSOR_GROQ_MODEL } from '../constants/sd-assessment.constants';
import { DIMENSION_COVERAGE_SIGNALS } from '../constants/sd-clarification.constants';
import type { LLMClarificationOutput } from '../types/sd-assessment-llm.types';

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
        model: SD_ASSESSOR_GROQ_MODEL,
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
- matchedFactKeys: array of factKeys (from Available Facts) that match what the candidate asked about, ranked by relevance (most relevant first). Use discloseWhen keywords as semantic hints. A broad question may match multiple facts in the same dimension. Empty array [] if no clear match.
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
    const validIntents: SDCandidateIntent[] = [
      'clarification_question',
      'requirement_summary',
      'direct_answer',
      'solution_leap',
      'ready_to_continue',
      'off_topic',
      'dont_know',
    ];
    const candidateIntent: SDCandidateIntent = validIntents.includes(
      parsed.candidateIntent as SDCandidateIntent,
    )
      ? (parsed.candidateIntent as SDCandidateIntent)
      : 'clarification_question';

    const matchedFactKeys = parsed.matchedFactKeys ?? [];

    return {
      candidateIntent,
      signals: {
        dimensionCovered: Array.isArray(parsed.dimensionCovered)
          ? parsed.dimensionCovered
          : [],
        factDisclosed: matchedFactKeys.length > 0,
        matchedFactKeys,
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
        matchedFactKeys: [],
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
