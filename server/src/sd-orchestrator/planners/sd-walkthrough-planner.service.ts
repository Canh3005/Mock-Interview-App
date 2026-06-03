import { Injectable } from '@nestjs/common';
import type {
  SDWalkthroughIntent,
  SDWalkthroughPlannerInput,
  SDGraphNode,
  SDGraphEdge,
} from '../types/sd-orchestrator.types';
import {
  ENTRY_POINT_TYPES,
  SOURCE_ACTOR_TYPES,
} from '../constants/sd-walkthrough.constants';

@Injectable()
export class SDWalkthroughPlannerService {
  planNextIntent(input: SDWalkthroughPlannerInput): SDWalkthroughIntent {
    const { graph, flowPaths, tracker, context } = input;
    const { language } = context;
    const { progress } = tracker;

    // Rule 1: required paths not covered — check exception first
    const uncoveredRequiredPath = flowPaths
      .filter((p) => p.required && !progress.coveredPathIds.includes(p.id))
      .sort((a, b) => a.priority - b.priority)[0];

    if (uncoveredRequiredPath) {
      // Exception: if path has unexplained nodes, probe those first
      const blockingNodeId = uncoveredRequiredPath.expectedNodeSequence.find(
        (nid) => progress.unexplainedNodeIds.includes(nid),
      );
      if (blockingNodeId) {
        return this._buildComponentProbe(
          graph,
          blockingNodeId,
          uncoveredRequiredPath.id,
          language,
          progress.unexplainedNodeIds,
        );
      }
      // No blocking node — probe the path itself
      const nodeChain = uncoveredRequiredPath.expectedNodeSequence
        .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? id)
        .join(' → ');
      return {
        stage: 'DESIGN_WALKTHROUGH',
        type: 'FLOW_PROBE',
        promptTemplate: `Path "${uncoveredRequiredPath.name}" has not been explained. Ask candidate to walk through: ${uncoveredRequiredPath.description}. Known nodes: ${nodeChain}.`,
        forbiddenHints: this._buildForbiddenHints(
          graph,
          progress.unexplainedNodeIds,
          uncoveredRequiredPath.id,
          uncoveredRequiredPath.expectedNodeSequence,
        ),
        maxSentences: 2,
        language,
        target: { targetPathId: uncoveredRequiredPath.id },
      };
    }

    // Rule 2: database/queue node unexplained
    const dbOrQueueNode = progress.unexplainedNodeIds
      .map((id) => graph.nodes.find((n) => n.id === id))
      .filter(
        (n): n is SDGraphNode =>
          n !== undefined &&
          ['database', 'queue', 'cache', 'storage'].includes(n.type ?? ''),
      )[0];
    if (dbOrQueueNode) {
      return this._buildComponentProbe(
        graph,
        dbOrQueueNode.id,
        undefined,
        language,
        progress.unexplainedNodeIds,
      );
    }

    // Rule 3: async/pub-sub edge unexplained
    const asyncEdge = progress.unexplainedEdgeIds
      .map((id) => graph.edges.find((e) => e.id === id))
      .filter((e): e is SDGraphEdge => e !== undefined)[0];
    if (asyncEdge) {
      const src =
        graph.nodes.find((n) => n.id === asyncEdge.sourceId)?.label ??
        asyncEdge.sourceId;
      const tgt =
        graph.nodes.find((n) => n.id === asyncEdge.targetId)?.label ??
        asyncEdge.targetId;
      return {
        stage: 'DESIGN_WALKTHROUGH',
        type: 'EDGE_PROBE',
        promptTemplate: `The connection between "${src}" and "${tgt}" has not been explained. Ask about protocol, sync/async, data format.`,
        forbiddenHints: this._buildForbiddenHints(
          graph,
          progress.unexplainedNodeIds,
          null,
        ),
        maxSentences: 2,
        language,
        target: { targetEdgeId: asyncEdge.id },
      };
    }

    // Rule 4: any remaining unexplained node
    const nextNodeId = this._pickNextNodeByPriority(
      graph,
      progress.unexplainedNodeIds,
    );
    if (nextNodeId) {
      return this._buildComponentProbe(
        graph,
        nextNodeId,
        undefined,
        language,
        progress.unexplainedNodeIds,
      );
    }

    // All explained — return a generic follow-up (transition will happen via policy)
    return {
      stage: 'DESIGN_WALKTHROUGH',
      type: 'WALKTHROUGH_OPEN',
      promptTemplate: `Ask candidate if there are any other aspects of their design they want to explain or clarify.`,
      forbiddenHints: [],
      maxSentences: 1,
      language,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  buildNodeChain(graph: {
    nodes: SDGraphNode[];
    edges: SDGraphEdge[];
  }): string {
    return this._buildNodeChain(graph);
  }

  private _buildNodeChain(graph: {
    nodes: SDGraphNode[];
    edges: SDGraphEdge[];
  }): string {
    if (graph.nodes.length === 0) return '';
    // Find source node (client/browser/mobile)
    const source =
      graph.nodes.find((n) =>
        SOURCE_ACTOR_TYPES.some(
          (t) =>
            (n.type ?? '').toLowerCase().includes(t) ||
            n.label.toLowerCase().includes(t),
        ),
      ) ?? graph.nodes[0];
    // BFS from source
    const visited: string[] = [];
    const queue = [source.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.includes(current)) continue;
      visited.push(current);
      const outgoing = graph.edges
        .filter((e) => e.sourceId === current && !visited.includes(e.targetId))
        .map((e) => e.targetId);
      queue.push(...outgoing);
    }
    // Also add nodes not reachable from source
    for (const n of graph.nodes) {
      if (!visited.includes(n.id)) visited.push(n.id);
    }
    return visited
      .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? id)
      .join(' → ');
  }

  private _buildComponentProbe(
    graph: { nodes: SDGraphNode[]; edges: SDGraphEdge[] },
    targetNodeId: string,
    targetPathId: string | undefined,
    language: 'vi' | 'en' | 'ja',
    unexplainedNodeIds: string[],
  ): SDWalkthroughIntent {
    const node = graph.nodes.find((n) => n.id === targetNodeId);
    const label = node?.label ?? targetNodeId;
    const pathContext = targetPathId ? ` in the flow` : '';
    return {
      stage: 'DESIGN_WALKTHROUGH',
      type: 'COMPONENT_PROBE',
      promptTemplate: `Node "${label}" appears in the graph but was not explained. Ask the candidate what role it plays${pathContext}.`,
      forbiddenHints: this._buildForbiddenHints(
        graph,
        unexplainedNodeIds,
        null,
        undefined,
        targetNodeId,
      ),
      maxSentences: 2,
      language,
      target: { targetNodeId, targetPathId },
    };
  }

  private _buildForbiddenHints(
    graph: { nodes: SDGraphNode[] },
    unexplainedNodeIds: string[],
    _targetPathId: string | null,
    excludeSequence?: string[],
    excludeNodeId?: string,
  ): string[] {
    // forbiddenHints = labels of unexplained nodes, excluding targetNodeId and path sequence nodes
    return unexplainedNodeIds
      .filter(
        (id) => id !== excludeNodeId && !(excludeSequence ?? []).includes(id),
      )
      .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? '')
      .filter((label) => label.length > 0);
  }

  private _pickNextNodeByPriority(
    graph: { nodes: SDGraphNode[] },
    unexplainedNodeIds: string[],
  ): string | undefined {
    // Entry-point infrastructure first, then source actors last
    const nodes = unexplainedNodeIds
      .map((id) => graph.nodes.find((n) => n.id === id))
      .filter((n): n is SDGraphNode => n !== undefined);

    const entryPoint = nodes.find((n) =>
      ENTRY_POINT_TYPES.some((t) => (n.type ?? '').toLowerCase().includes(t)),
    );
    if (entryPoint) return entryPoint.id;

    const nonActor = nodes.find(
      (n) =>
        !SOURCE_ACTOR_TYPES.some(
          (t) =>
            (n.type ?? '').toLowerCase().includes(t) ||
            n.label.toLowerCase().includes(t),
        ),
    );
    if (nonActor) return nonActor.id;

    return nodes[0]?.id;
  }

  buildRedirectIntent(
    lang: 'vi' | 'en' | 'ja',
    reason: 'scope_violation' | 'dont_know',
  ): SDWalkthroughIntent {
    const templates: Record<'scope_violation' | 'dont_know', string> = {
      scope_violation:
        'Candidate mentioned components outside the agreed scope. Redirect them to stay within clarified requirements without naming missing components.',
      dont_know:
        "Candidate said they don't know or went off-topic. Acknowledge briefly and redirect to another part of the diagram they haven't explained yet.",
    };
    return {
      stage: 'DESIGN_WALKTHROUGH',
      type: 'WALKTHROUGH_REDIRECT',
      promptTemplate: templates[reason],
      forbiddenHints: [],
      maxSentences: 2,
      language: lang,
    };
  }
}
