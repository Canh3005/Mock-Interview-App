import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDWrapUpAssessment,
  SDGraphState,
  SDCurveball,
  SDProbe,
  SDClarificationLeftoverJson,
} from '../types/sd-orchestrator.types';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface LLMWrapUpOutput {
  candidateIntent: string;
  blastRadiusRecognized: boolean;
  mitigationProposed: boolean;
  tradeoffMentioned: boolean;
  costOrLatencyImpactMentioned: boolean;
  consistencyWithOriginalDesign: boolean;
  graphAdaptationMade: boolean;
  failureReasoning: number;
  adaptationQuality: number;
  curveballHandling: number;
  riskPrioritization: number;
  consistencyScore: number;
  redFlags: string[];
}

@Injectable()
export class SDWrapUpAssessorService {
  private readonly logger = new Logger(SDWrapUpAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  async assess(
    candidateText: string,
    activeScenario: SDCurveball | SDProbe,
    currentGraph: SDGraphState,
    baseGraph: SDGraphState,
    clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<SDWrapUpAssessment> {
    const isCurveball = 'scenarioTemplate' in activeScenario;
    const graphAdaptationMade = this._detectGraphAdaptation(
      currentGraph,
      baseGraph,
    );

    const systemPrompt = this._buildSystemPrompt(
      activeScenario,
      isCurveball,
      clarificationLeftover,
      graphAdaptationMade,
    );
    const userPrompt = `Candidate said: "${candidateText}"\n\nRespond with JSON only.`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 600 },
      });
      const parsed = JSON.parse(raw) as LLMWrapUpOutput;
      return this._mapToAssessment(parsed, graphAdaptationMade);
    } catch (err) {
      this.logger.warn(`Wrap-up assessor error: ${(err as Error).message}`);
      return this._fallbackAssessment(graphAdaptationMade);
    }
  }

  detectGraphDelta(
    currentGraph: SDGraphState,
    baseGraph: SDGraphState,
  ): { nodesAdded: number; edgesAdded: number; changedLabels: number } {
    const baseNodeIds = new Set(baseGraph.nodes.map((n) => n.id));
    const baseEdgeIds = new Set(baseGraph.edges.map((e) => e.id));
    const nodesAdded = currentGraph.nodes.filter(
      (n) => !baseNodeIds.has(n.id),
    ).length;
    const edgesAdded = currentGraph.edges.filter(
      (e) => !baseEdgeIds.has(e.id),
    ).length;
    const changedLabels = currentGraph.nodes.filter((n) => {
      const base = baseGraph.nodes.find((b) => b.id === n.id);
      return base && base.label !== n.label;
    }).length;
    return { nodesAdded, edgesAdded, changedLabels };
  }

  private _detectGraphAdaptation(
    current: SDGraphState,
    base: SDGraphState,
  ): boolean {
    const delta = this.detectGraphDelta(current, base);
    return (
      delta.nodesAdded > 0 || delta.edgesAdded > 0 || delta.changedLabels > 0
    );
  }

  private _buildSystemPrompt(
    scenario: SDCurveball | SDProbe,
    isCurveball: boolean,
    leftover: SDClarificationLeftoverJson,
    graphAdaptationDetected: boolean,
  ): string {
    const expectedMitigations = isCurveball
      ? (scenario as SDCurveball).expectedMitigations
      : (scenario as SDProbe).expectedSignals;
    const redFlagsToWatch = isCurveball
      ? (scenario as SDCurveball).redFlags
      : (scenario as SDProbe).redFlags;
    const scenarioDesc = isCurveball
      ? (scenario as SDCurveball).scenarioTemplate
      : (scenario as SDProbe).primaryQuestionTemplate;
    const clarifiedFacts = leftover.requirementContract.disclosedFacts
      .map((f) => `${f.key}: ${f.value}`)
      .join(', ');

    return `You are an AI assessor for a system design wrap-up/curveball interview round.

# Scenario being assessed
${scenarioDesc}

# Expected mitigations (natural phrases to listen for)
${expectedMitigations.join(', ')}

# Red flags to watch for
${redFlagsToWatch.join(', ')}

# Graph adaptation: candidate has${graphAdaptationDetected ? '' : ' NOT'} updated the canvas in this turn.

# Clarified requirements (original design constraints)
${clarifiedFacts || 'None'}

# Instructions
Analyze the candidate response and output JSON:
- candidateIntent: one of ['direct_answer', 'clarification_question', 'dont_know', 'off_topic']
- blastRadiusRecognized: candidate acknowledged who/what is affected and for how long.
- mitigationProposed: candidate proposed a concrete mitigation or adaptation.
- tradeoffMentioned: candidate explicitly discussed trade-offs in their proposed mitigation.
- costOrLatencyImpactMentioned: candidate discussed cost, latency, or throughput impact.
- consistencyWithOriginalDesign: candidate's answer is consistent with their clarified requirements and original design decisions (does not introduce contradictions).
- graphAdaptationMade: set to ${graphAdaptationDetected} (detected from canvas diff — do NOT change this based on text alone).
- failureReasoning: 0.0-1.0 — quality of reasoning about failure modes.
- adaptationQuality: 0.0-1.0 — quality of proposed adaptations.
- curveballHandling: 0.0-1.0 — overall handling of the curveball.
- riskPrioritization: 0.0-1.0 — candidate prioritizes the right risks.
- consistencyScore: 0.0-1.0 — consistency with original design (1.0 = fully consistent).
- redFlags: array of red flag strings triggered.

Respond with raw JSON only. No markdown.`;
  }

  private _mapToAssessment(
    parsed: LLMWrapUpOutput,
    graphAdaptationMade: boolean,
  ): SDWrapUpAssessment {
    return {
      candidateIntent: (parsed.candidateIntent as any) ?? 'direct_answer',
      signals: {
        blastRadiusRecognized: Boolean(parsed.blastRadiusRecognized),
        mitigationProposed: Boolean(parsed.mitigationProposed),
        tradeoffMentioned: Boolean(parsed.tradeoffMentioned),
        costOrLatencyImpactMentioned: Boolean(
          parsed.costOrLatencyImpactMentioned,
        ),
        consistencyWithOriginalDesign: Boolean(
          parsed.consistencyWithOriginalDesign,
        ),
        graphAdaptationMade,
      },
      scoreDelta: {
        failureReasoning: Math.max(
          0,
          Math.min(1, parsed.failureReasoning ?? 0.3),
        ),
        adaptationQuality: Math.max(
          0,
          Math.min(1, parsed.adaptationQuality ?? 0.3),
        ),
        curveballHandling: Math.max(
          0,
          Math.min(1, parsed.curveballHandling ?? 0.3),
        ),
        riskPrioritization: Math.max(
          0,
          Math.min(1, parsed.riskPrioritization ?? 0.3),
        ),
        consistencyWithOriginalDesign: Math.max(
          0,
          Math.min(1, parsed.consistencyScore ?? 0.5),
        ),
      },
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    };
  }

  private _fallbackAssessment(
    graphAdaptationMade: boolean,
  ): SDWrapUpAssessment {
    return {
      candidateIntent: 'direct_answer',
      signals: {
        blastRadiusRecognized: false,
        mitigationProposed: false,
        tradeoffMentioned: false,
        costOrLatencyImpactMentioned: false,
        consistencyWithOriginalDesign: true,
        graphAdaptationMade,
      },
      scoreDelta: {
        failureReasoning: 0.3,
        adaptationQuality: 0.3,
        curveballHandling: 0.3,
        riskPrioritization: 0.3,
        consistencyWithOriginalDesign: 0.5,
      },
      redFlags: [],
    };
  }
}
