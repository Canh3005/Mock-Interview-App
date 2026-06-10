import { Injectable } from '@nestjs/common';
import type {
  SDWalkthroughIntent,
  SDWalkthroughPlannerInput,
  SDGraphNode,
  SDGraphEdge,
} from '../types/sd-orchestrator.types';
import { SOURCE_ACTOR_TYPES } from '../constants/sd-walkthrough.constants';

@Injectable()
export class SDWalkthroughPlannerService {
  planNextIntent(input: SDWalkthroughPlannerInput): SDWalkthroughIntent {
    const { graph, flowPaths, tracker, context } = input;
    const { language } = context;
    const { progress } = tracker;

    // 1. Cover required paths first.
    const uncoveredRequiredPath = flowPaths
      .filter((p) => p.required && !progress.coveredPathIds.includes(p.id))
      .sort((a, b) => a.priority - b.priority)[0];
    if (uncoveredRequiredPath) {
      return this._buildFlowProbe(
        graph,
        uncoveredRequiredPath,
        language,
        progress.unexplainedNodeIds,
      );
    }

    // 2. Then cover remaining unexplained nodes tracked from the candidate graph.
    const nextNodeId = progress.unexplainedNodeIds.find((id) =>
      graph.nodes.some((n) => n.id === id),
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

    // 3. Finally cover remaining unexplained edges tracked from the candidate graph.
    const nextEdge = progress.unexplainedEdgeIds
      .map((id) => graph.edges.find((e) => e.id === id))
      .find((edge): edge is SDGraphEdge => edge !== undefined);
    if (nextEdge) {
      return this._buildEdgeProbe(
        graph,
        nextEdge,
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

  private _buildFlowProbe(
    graph: { nodes: SDGraphNode[] },
    path: { id: string; name: string; description: string },
    language: 'vi' | 'en' | 'ja',
    unexplainedNodeIds: string[],
  ): SDWalkthroughIntent {
    return {
      stage: 'DESIGN_WALKTHROUGH',
      type: 'FLOW_PROBE',
      promptTemplate: `The "${path.name}" flow has not been explained yet. Ask the candidate to walk through it step by step: ${path.description}.`,
      forbiddenHints: this._buildForbiddenHints(graph, unexplainedNodeIds),
      maxSentences: 2,
      language,
      target: { targetPathId: path.id },
    };
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
        targetNodeId,
      ),
      maxSentences: 2,
      language,
      target: { targetNodeId, targetPathId },
    };
  }

  private _buildEdgeProbe(
    graph: { nodes: SDGraphNode[] },
    edge: SDGraphEdge,
    language: 'vi' | 'en' | 'ja',
    unexplainedNodeIds: string[],
  ): SDWalkthroughIntent {
    const src =
      graph.nodes.find((n) => n.id === edge.sourceId)?.label ?? edge.sourceId;
    const tgt =
      graph.nodes.find((n) => n.id === edge.targetId)?.label ?? edge.targetId;
    return {
      stage: 'DESIGN_WALKTHROUGH',
      type: 'EDGE_PROBE',
      promptTemplate: `The connection between "${src}" and "${tgt}" has not been explained. Ask about protocol, sync/async, data format.`,
      forbiddenHints: this._buildForbiddenHints(graph, unexplainedNodeIds),
      maxSentences: 2,
      language,
      target: { targetEdgeId: edge.id },
    };
  }

  private _buildForbiddenHints(
    graph: { nodes: SDGraphNode[] },
    unexplainedNodeIds: string[],
    excludeNodeId?: string,
  ): string[] {
    // forbiddenHints = labels of unexplained nodes, excluding the current target.
    return unexplainedNodeIds
      .filter((id) => id !== excludeNodeId)
      .map((id) => graph.nodes.find((n) => n.id === id)?.label ?? '')
      .filter((label) => label.length > 0);
  }
}
