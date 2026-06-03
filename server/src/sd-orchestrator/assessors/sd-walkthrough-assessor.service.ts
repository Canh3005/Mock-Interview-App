import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../ai/groq.service';
import type {
  SDWalkthroughAssessment,
  SDGraphState,
  SDFlowPath,
  SDWalkthroughTracker,
  SDClarificationLeftoverJson,
  SDCandidateIntent,
} from '../types/sd-orchestrator.types';
import { SD_ASSESSOR_GROQ_MODEL } from '../constants/sd-assessment.constants';
import type { LLMWalkthroughOutput } from '../types/sd-assessment-llm.types';

@Injectable()
export class SDWalkthroughAssessorService {
  private readonly logger = new Logger(SDWalkthroughAssessorService.name);

  constructor(private readonly groq: GroqService) {}

  async assess(
    candidateText: string,
    graph: SDGraphState,
    flowPaths: SDFlowPath[],
    tracker: SDWalkthroughTracker,
    clarificationLeftover: SDClarificationLeftoverJson,
    isFirstTurn: boolean,
  ): Promise<SDWalkthroughAssessment> {
    const systemPrompt = this._buildSystemPrompt(
      graph,
      flowPaths,
      tracker,
      clarificationLeftover,
      isFirstTurn,
    );
    const userPrompt = `Candidate said: "${candidateText}"\n\nRespond with JSON only.`;

    try {
      const raw = await this.groq.generateJsonContent({
        model: SD_ASSESSOR_GROQ_MODEL,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: 800 },
      });
      const parsed = JSON.parse(raw) as LLMWalkthroughOutput;
      return this._mapToAssessment(parsed, graph, tracker, isFirstTurn);
    } catch (err) {
      this.logger.warn(`Walkthrough assessor error: ${(err as Error).message}`);
      return this._fallbackAssessment(isFirstTurn);
    }
  }

  private _buildSystemPrompt(
    graph: SDGraphState,
    flowPaths: SDFlowPath[],
    tracker: SDWalkthroughTracker,
    leftover: SDClarificationLeftoverJson,
    isFirstTurn: boolean,
  ): string {
    const nodesContext = graph.nodes
      .map((n) => `  - id="${n.id}" type="${n.type}" label="${n.label}"`)
      .join('\n');
    const edgesContext = graph.edges
      .map(
        (e) =>
          `  - id="${e.id}" from="${e.sourceId}" to="${e.targetId}" label="${e.label ?? ''}"`,
      )
      .join('\n');
    const pathsContext = flowPaths
      .map(
        (p) =>
          `  - id="${p.id}" name="${p.name}" required=${p.required} sequence=[${p.expectedNodeSequence.join(',')}]`,
      )
      .join('\n');
    const cumulativeExplained = tracker.progress;
    const clarifiedFacts = leftover.requirementContract.disclosedFacts
      .map((f) => `${f.key}: ${f.value}`)
      .join(', ');

    return `You are an AI assessor for a system design architecture walkthrough interview.

# Graph nodes (IDs are canonical — use these exact IDs in your output)
${nodesContext}

# Graph edges (IDs are canonical)
${edgesContext}

# Flow paths to cover
${pathsContext}

# Cumulative tracker state (already explained in previous turns)
- Explained nodes: [${cumulativeExplained.unexplainedNodeIds.join(', ')} are UNEXPLAINED] (all others explained)
- Covered paths: [${cumulativeExplained.coveredPathIds.join(', ')}]

# Clarified requirements (for constraintLinked detection)
${clarifiedFacts || 'None yet'}

# Is first turn: ${isFirstTurn}

# Instructions
Analyze the candidate text and output JSON:
- candidateIntent: one of ['architecture_walkthrough', 'direct_answer', 'clarification_question', 'dont_know', 'off_topic']
- explainedNodeIds: array of graph node IDs the candidate mentioned or explained IN THIS TURN (per-turn, not cumulative). Only include IDs that exist in the graph.
- explainedEdgeIds: array of graph edge IDs explained in this turn. Only include IDs that exist in the graph.
- coveredPathIds: paths that become fully covered when merging cumulative state with this turn's explainedNodeIds. Check: does the union of cumulative explained nodes + this turn's explainedNodeIds contain all expectedNodeSequence nodes for a path?
- dataOwnershipMentioned: candidate discussed who owns/stores what data.
- syncAsyncBoundaryMentioned: candidate discussed sync vs async, eventual consistency, etc.
- constraintLinked: candidate referenced a clarified requirement fact (e.g., mentioned the DAU figure, p99 latency from requirements).
- scopeViolation: candidate mentioned components outside the clarified scope/requirements.
- contradictionDetected: candidate said something that contradicts the graph structure.
- contradictionDetail: if contradictionDetected=true, describe the specific contradiction.
${
  isFirstTurn
    ? `- requirementSynthesis: candidate's opening statement shows they synthesized the requirements (mentions scope, functional goal) — true/false
- scaleReasoning: candidate mentions scale implications in their first explanation — true/false
- scopeControl: candidate stays within clarified scope in their first statement — true/false`
    : ''
}
- walkthroughCompleteness: 0.0-1.0 — fraction of graph explained so far.
- flowClarity: 0.0-1.0 — how clear and logical the explanation of flows is.
- graphVerbalAlignment: 0.0-1.0 — alignment between what candidate says and what is in the graph.
- communicationStructure: 0.0-1.0 — how structured and organized the explanation is.
- redFlags: array of red flag strings if any (e.g., "explained component not in graph", "claimed path contradicts edges").

Respond with raw JSON only. No markdown.`;
  }

  private _mapToAssessment(
    parsed: LLMWalkthroughOutput,
    graph: SDGraphState,
    tracker: SDWalkthroughTracker,
    isFirstTurn: boolean,
  ): SDWalkthroughAssessment {
    // Validate IDs — only keep IDs that exist in graph
    const validNodeIds = new Set(graph.nodes.map((n) => n.id));
    const validEdgeIds = new Set(graph.edges.map((e) => e.id));
    const explainedNodeIds = (parsed.explainedNodeIds ?? []).filter((id) =>
      validNodeIds.has(id),
    );
    const explainedEdgeIds = (parsed.explainedEdgeIds ?? []).filter((id) =>
      validEdgeIds.has(id),
    );

    const assessment: SDWalkthroughAssessment = {
      candidateIntent: this._toCandidateIntent(
        parsed.candidateIntent,
        'architecture_walkthrough',
      ),
      signals: {
        coveredPathIds: Array.isArray(parsed.coveredPathIds)
          ? parsed.coveredPathIds
          : [],
        dataOwnershipMentioned: Boolean(parsed.dataOwnershipMentioned),
        syncAsyncBoundaryMentioned: Boolean(parsed.syncAsyncBoundaryMentioned),
        constraintLinked: Boolean(parsed.constraintLinked),
        scopeViolation: Boolean(parsed.scopeViolation),
        contradictionDetected: Boolean(parsed.contradictionDetected),
      },
      scoreDelta: {
        walkthroughCompleteness: Math.max(
          0,
          Math.min(1, parsed.walkthroughCompleteness ?? 0.3),
        ),
        flowClarity: Math.max(0, Math.min(1, parsed.flowClarity ?? 0.3)),
        graphVerbalAlignment: Math.max(
          0,
          Math.min(1, parsed.graphVerbalAlignment ?? 0.3),
        ),
        communicationStructure: Math.max(
          0,
          Math.min(1, parsed.communicationStructure ?? 0.3),
        ),
        requirementSynthesis: isFirstTurn
          ? parsed.requirementSynthesis
            ? 1
            : 0
          : 0,
        scaleReasoning: isFirstTurn ? (parsed.scaleReasoning ? 1 : 0) : 0,
        scopeControl: isFirstTurn ? (parsed.scopeControl ? 1 : 0) : 0,
      },
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      extra: {
        explainedNodeIds,
        explainedEdgeIds,
        contradictionDetail: parsed.contradictionDetected
          ? parsed.contradictionDetail
          : undefined,
        synthesisFirstTurn: isFirstTurn
          ? {
              requirementSynthesis: Boolean(parsed.requirementSynthesis),
              scaleReasoning: Boolean(parsed.scaleReasoning),
              scopeControl: Boolean(parsed.scopeControl),
            }
          : undefined,
      },
    };

    return assessment;
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

  private _fallbackAssessment(isFirstTurn: boolean): SDWalkthroughAssessment {
    return {
      candidateIntent: 'architecture_walkthrough',
      signals: {
        coveredPathIds: [],
        dataOwnershipMentioned: false,
        syncAsyncBoundaryMentioned: false,
        constraintLinked: false,
        scopeViolation: false,
        contradictionDetected: false,
      },
      scoreDelta: {
        walkthroughCompleteness: 0.3,
        flowClarity: 0.3,
        graphVerbalAlignment: 0.3,
        communicationStructure: 0.3,
        requirementSynthesis: 0,
        scaleReasoning: 0,
        scopeControl: 0,
      },
      redFlags: [],
      extra: {
        explainedNodeIds: [],
        explainedEdgeIds: [],
        synthesisFirstTurn: isFirstTurn
          ? {
              requirementSynthesis: false,
              scaleReasoning: false,
              scopeControl: false,
            }
          : undefined,
      },
    };
  }
}
