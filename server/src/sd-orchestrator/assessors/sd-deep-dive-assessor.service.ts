import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDDeepDiveAssessment,
  SDDeepDiveIntentContext,
  SDGraphState,
  SDProbe,
  SDClarificationLeftoverJson,
  SDCandidateIntent,
} from '../types/sd-orchestrator.types';
import { SD_ASSESSOR_GROQ_MODEL } from '../constants/sd-assessment.constants';
import type { LLMDeepDiveOutput } from '../types/sd-assessment-llm.types';

@Injectable()
export class SDDeepDiveAssessorService {
  private readonly logger = new Logger(SDDeepDiveAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  async assess(
    candidateText: string,
    graph: SDGraphState,
    activeProbe: SDProbe,
    cumulativeCoveredSignals: string[],
    clarificationLeftover: SDClarificationLeftoverJson,
    intentContext?: SDDeepDiveIntentContext,
  ): Promise<SDDeepDiveAssessment> {
    const systemPrompt = this._buildSystemPrompt(
      graph,
      activeProbe,
      cumulativeCoveredSignals,
      clarificationLeftover,
      intentContext,
    );
    const userPrompt = `Candidate said: "${candidateText}"\n\nRespond with JSON only.`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: SD_ASSESSOR_GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 700 },
      });
      const parsed = JSON.parse(raw) as LLMDeepDiveOutput;
      return this._mapToAssessment(parsed);
    } catch (err) {
      this.logger.warn(`Deep dive assessor error: ${(err as Error).message}`);
      return this._fallbackAssessment();
    }
  }

  private _buildSystemPrompt(
    graph: SDGraphState,
    probe: SDProbe,
    cumulativeCoveredSignals: string[],
    leftover: SDClarificationLeftoverJson,
    intentContext?: SDDeepDiveIntentContext,
  ): string {
    const nodesContext = graph.nodes
      .map((n) => `  - id="${n.id}" type="${n.type}" label="${n.label}"`)
      .join('\n');
    const uncoveredSignals = probe.expectedSignals.filter(
      (s) => !cumulativeCoveredSignals.includes(s),
    );
    const clarifiedFacts = leftover.requirementContract.disclosedFacts
      .map((f) => `${f.key}: ${f.value}`)
      .join(', ');

    const intentContextSection = intentContext
      ? this._buildIntentContextSection(intentContext)
      : '';

    return `You are an AI assessor for a technical deep-dive in a system design interview.
${intentContextSection}
# Probe being assessed
- Dimension: ${probe.dimension}
- Primary question: ${probe.primaryQuestionTemplate}
- Expected signals (natural phrases to listen for): ${probe.expectedSignals.join(', ')}
- Signals already covered (cumulative): ${cumulativeCoveredSignals.join(', ') || 'none'}
- Signals still pending: ${uncoveredSignals.join(', ') || 'all covered'}
- Red flags to watch for: ${probe.redFlags.join(', ')}

# Graph nodes (for context)
${nodesContext}

# Clarified requirements (for constraintLinked detection)
${clarifiedFacts || 'None'}

# Instructions
Analyze the candidate response and output JSON:
- candidateIntent: one of ['direct_answer', 'clarification_question', 'dont_know', 'off_topic']
- expectedSignalsCovered: array of signal strings (from the expectedSignals list) that the candidate demonstrated IN THIS TURN. Use natural phrase matching — "cache strategy" matches text like "using Redis for caching", "add a cache layer", etc.
- tradeoffMentioned: candidate explicitly discussed a trade-off (e.g., consistency vs availability, latency vs throughput).
- metricsMentioned: candidate mentioned specific numbers or metrics (e.g., "95% hit rate", "5K reads/sec", "99.9% uptime").
- failureModeMentioned: candidate explicitly discussed what happens when this component fails, error handling, fallback behavior, or recovery strategy.
- constraintLinked: candidate referenced a specific clarified requirement (e.g., mentioned the exact DAU or latency figure from requirements).
- technicalDepth: 0.0-1.0 — depth and accuracy of technical explanation.
- tradeoffArticulation: 0.0-1.0 — quality of trade-off reasoning.
- bottleneckReasoning: 0.0-1.0 — does candidate identify and quantify bottlenecks?
- componentOwnership: 0.0-1.0 — does candidate demonstrate understanding of each component's responsibility?
- operationalAwareness: 0.0-1.0 — does candidate think about operations (failure, observability, maintenance)?
- redFlags: array of specific red flag strings triggered.

Respond with raw JSON only. No markdown.`;
  }

  private _buildIntentContextSection({
    intentType,
    followUpTrigger,
  }: SDDeepDiveIntentContext): string {
    if (intentType === 'PROBE_CHALLENGE' && followUpTrigger) {
      return (
        `\n# Current turn context\n` +
        `This turn is a CHALLENGE for red flag: "${followUpTrigger}".\n` +
        `Focus assessment on whether the candidate adequately addresses this specific concern.\n` +
        `Set redFlags to empty only if the candidate clearly resolves it.\n`
      );
    }
    if (intentType === 'PROBE_FOLLOW_UP' && followUpTrigger) {
      let hint: string;
      if (followUpTrigger === 'missing_tradeoff') {
        hint = 'Pay particular attention to tradeoffMentioned.';
      } else if (followUpTrigger === 'missing_metric') {
        hint = 'Pay particular attention to metricsMentioned.';
      } else if (followUpTrigger === 'vague_answer') {
        hint =
          'Assess whether the candidate gave a concrete, specific answer this turn.';
      } else {
        hint = `Follow-up trigger: ${followUpTrigger}.`;
      }
      return (
        `\n# Current turn context\n` +
        `This turn is a FOLLOW-UP (trigger: ${followUpTrigger}).\n` +
        `${hint}\n`
      );
    }
    return '';
  }

  private _mapToAssessment(parsed: LLMDeepDiveOutput): SDDeepDiveAssessment {
    const candidateIntent = this._toCandidateIntent(
      parsed.candidateIntent,
      'direct_answer',
    );
    return {
      candidateIntent,
      signals: {
        expectedSignalsCovered: Array.isArray(parsed.expectedSignalsCovered)
          ? parsed.expectedSignalsCovered
          : [],
        tradeoffMentioned: Boolean(parsed.tradeoffMentioned),
        metricsMentioned: Boolean(parsed.metricsMentioned),
        failureModeMentioned: Boolean(parsed.failureModeMentioned),
        constraintLinked: Boolean(parsed.constraintLinked),
      },
      scoreDelta: {
        technicalDepth: Math.max(0, Math.min(1, parsed.technicalDepth ?? 0.3)),
        tradeoffArticulation: Math.max(
          0,
          Math.min(1, parsed.tradeoffArticulation ?? 0),
        ),
        bottleneckReasoning: Math.max(
          0,
          Math.min(1, parsed.bottleneckReasoning ?? 0),
        ),
        componentOwnership: Math.max(
          0,
          Math.min(1, parsed.componentOwnership ?? 0.3),
        ),
        operationalAwareness: Math.max(
          0,
          Math.min(1, parsed.operationalAwareness ?? 0),
        ),
      },
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    };
  }

  private _toCandidateIntent(
    value: string,
    fallback: SDCandidateIntent,
  ): SDCandidateIntent {
    const validIntents: SDCandidateIntent[] = [
      'clarification_question',
      'requirement_summary',
      'architecture_walkthrough',
      'direct_answer',
      'dont_know',
      'off_topic',
      'ready_to_continue',
      'solution_leap',
    ];
    return validIntents.includes(value as SDCandidateIntent)
      ? (value as SDCandidateIntent)
      : fallback;
  }

  private _fallbackAssessment(): SDDeepDiveAssessment {
    return {
      candidateIntent: 'direct_answer',
      signals: {
        expectedSignalsCovered: [],
        tradeoffMentioned: false,
        metricsMentioned: false,
        failureModeMentioned: false,
        constraintLinked: false,
      },
      scoreDelta: {
        technicalDepth: 0,
        tradeoffArticulation: 0,
        bottleneckReasoning: 0,
        componentOwnership: 0,
        operationalAwareness: 0,
      },
      redFlags: [],
    };
  }
}
