import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDGraphState,
  SDFlowPath,
  SDClarificationLeftoverJson,
} from '../types/sd-orchestrator.types';
import { SD_ASSESSOR_GROQ_MODEL } from '../constants/sd-assessment.constants';
import type { LLMGraphAnalysisOutput } from '../types/sd-assessment-llm.types';

const FALLBACK: LLMGraphAnalysisOutput = {
  flowCoverage: [],
  componentGaps: [],
  structuralGapNodeTypes: [],
  probePriorities: [],
};

@Injectable()
export class SDGraphAnalysisService {
  private readonly logger = new Logger(SDGraphAnalysisService.name);

  constructor(private readonly groq: GroqService) {}

  async analyze(
    graph: SDGraphState,
    flowPaths: SDFlowPath[],
    expectedComponents: string[],
    clarificationLeftover: SDClarificationLeftoverJson,
  ): Promise<LLMGraphAnalysisOutput> {
    const systemPrompt = this._buildSystemPrompt(
      graph,
      flowPaths,
      expectedComponents,
      clarificationLeftover,
    );
    const userPrompt =
      'Analyze the candidate graph against the reference flow paths. Respond with JSON only.';

    try {
      const raw = await this.groq.generateJsonContent({
        model: SD_ASSESSOR_GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 600 },
      });
      const parsed = JSON.parse(raw) as Partial<LLMGraphAnalysisOutput>;
      return this._mapToOutput(parsed);
    } catch (err) {
      this.logger.warn(`Graph analysis error: ${(err as Error).message}`);
      return FALLBACK;
    }
  }

  private _buildSystemPrompt(
    graph: SDGraphState,
    flowPaths: SDFlowPath[],
    expectedComponents: string[],
    leftover: SDClarificationLeftoverJson,
  ): string {
    const nodesContext = graph.nodes
      .map((n) => `  - id="${n.id}" type="${n.type}" label="${n.label}"`)
      .join('\n');
    const edgesContext = graph.edges
      .map(
        (e) =>
          `  - from="${e.sourceId}" to="${e.targetId}"${e.label ? ` label="${e.label}"` : ''}`,
      )
      .join('\n');

    const pathsContext = flowPaths
      .map((p) => {
        const edgeList = p.expectedEdges
          ? p.expectedEdges.map((e) => `${e.from}→${e.to}`).join(', ')
          : 'not specified';
        return (
          `  - id="${p.id}" name="${p.name}" required=${p.required}\n` +
          `    sequence=[${p.expectedNodeSequence.join(',')}]\n` +
          `    edges=[${edgeList}]`
        );
      })
      .join('\n');

    const clarifiedFacts = leftover.requirementContract.disclosedFacts
      .map((f) => `${f.key}: ${f.value}`)
      .join('; ');

    return `You are analyzing a system design candidate's architecture graph against reference flow paths.

# Candidate graph nodes (use label as primary matching signal, type as secondary — do NOT use IDs to match roles)
${nodesContext || '  (empty)'}

# Candidate graph edges (declared connections only — do NOT infer unlisted connections)
${edgesContext || '  (empty)'}

# Reference flow paths
${pathsContext || '  (none)'}

# Expected component types
${expectedComponents.join(', ') || 'not specified'}

# Clarified requirements
${clarifiedFacts || 'none'}

# Instructions
Analyze whether the candidate graph supports each reference flow path.

Matching rules:
- Match candidate nodes to reference roles using NODE LABEL semantics (e.g., "Redis Counter Store" matches "redis_cluster", "Message Queue" matches "mq").
- A flow path is "covered" if the candidate graph contains nodes that semantically correspond to the required roles AND the declared edges show connectivity consistent with the flow direction.
- Only reason from declared edges. Do NOT infer connections that are not listed.
- A path can be covered even if extra intermediate nodes are present (e.g., load balancer before api_gateway).
- A path is NOT covered if a critical role in the flow has no matching node or the required connectivity is absent.

Output JSON with exactly these fields:
{
  "flowCoverage": [
    { "pathId": "<id>", "covered": <bool>, "missingRoles": ["<role>", ...] }
  ],
  "componentGaps": ["<role>", ...],
  "structuralGapNodeTypes": ["<role>", ...],
  "probePriorities": ["<dimension>", ...]
}

Field rules:
- "flowCoverage": one entry per reference flow path.
- "missingRoles": role strings from expectedNodeSequence that have no matching node OR no required edge in the candidate graph.
- "componentGaps": all reference roles missing from the candidate graph (union across all paths and expectedComponents).
- "structuralGapNodeTypes": subset of missingRoles that appear in at least one required=true flow path. These are the most critical gaps the interviewer must probe first.
- "probePriorities": ordered list of probe dimensions based on gaps found. Use only these values: data_model, scalability, consistency, reliability, latency, cost, security, operability. Order by urgency: required flows not covered → reliability or operability first; scale path weak → scalability; storage gaps → data_model; rule propagation weak → consistency. Do NOT include dimensions that have no evidence of weakness.

Respond with raw JSON only. No markdown.`;
  }

  private _mapToOutput(
    parsed: Partial<LLMGraphAnalysisOutput>,
  ): LLMGraphAnalysisOutput {
    return {
      flowCoverage: Array.isArray(parsed.flowCoverage)
        ? parsed.flowCoverage.map((fc) => ({
            pathId: String(fc.pathId ?? ''),
            covered: Boolean(fc.covered),
            missingRoles: Array.isArray(fc.missingRoles)
              ? fc.missingRoles.map(String)
              : [],
          }))
        : [],
      componentGaps: Array.isArray(parsed.componentGaps)
        ? parsed.componentGaps.map(String)
        : [],
      structuralGapNodeTypes: Array.isArray(parsed.structuralGapNodeTypes)
        ? parsed.structuralGapNodeTypes.map(String)
        : [],
      probePriorities: Array.isArray(parsed.probePriorities)
        ? parsed.probePriorities.map(String)
        : [],
    };
  }
}
