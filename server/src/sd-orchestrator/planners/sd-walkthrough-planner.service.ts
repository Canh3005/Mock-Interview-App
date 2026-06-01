import { Injectable } from '@nestjs/common';
import type {
  SDWalkthroughIntent,
  SDWalkthroughPlannerInput,
  SDWalkthroughTransitionCriteria,
  SDGraphNode,
  SDGraphEdge,
} from '../types/sd-orchestrator.types';

export const WALKTHROUGH_CRITERIA: SDWalkthroughTransitionCriteria = {
  minTurns: 2,
  maxTurns: 8,
  mustCoverCriticalPath: true,
  maxUnexplainedAllowed: 2,
  contradictionMustBeResolved: true,
  maxContradictionChallenges: 2,
};

// Entry-point infrastructure types — probe before source actors
const ENTRY_POINT_TYPES = ['lb', 'gateway', 'service'];
const SOURCE_ACTOR_TYPES = ['client', 'browser', 'mobile', 'user'];

@Injectable()
export class SDWalkthroughPlannerService {
  planNextIntent(input: SDWalkthroughPlannerInput): SDWalkthroughIntent {
    const {
      graph,
      flowPaths,
      tracker,
      clarificationLeftover,
      graphMetrics,
      context,
      isFirstTurn,
    } = input;
    const { language } = context;
    const { progress } = tracker;

    // Turn 1 — opening intent
    if (isFirstTurn) {
      const isSparse =
        graphMetrics.componentCoverage < 0.4 || graphMetrics.nodeCount < 3;
      if (isSparse) {
        const gap = this._findCriticalGap(
          graph,
          graphMetrics,
          clarificationLeftover,
        );
        return {
          stage: 'DESIGN_WALKTHROUGH',
          type: 'WALKTHROUGH_OPEN_GAP',
          promptTemplate: `Graph is missing ${gap.componentType}. Ask candidate about: ${gap.description}.`,
          forbiddenHints: this._buildForbiddenHints(
            graph,
            progress.unexplainedNodeIds,
            null,
          ),
          maxSentences: 2,
          language,
        };
      }
      const nodeChain = this._buildNodeChain(graph);
      const pathList = flowPaths
        .filter((p) => p.required)
        .map((p, i) => `(${i + 1}) ${p.name}`)
        .join(', ');
      return {
        stage: 'DESIGN_WALKTHROUGH',
        type: 'WALKTHROUGH_OPEN',
        promptTemplate: `Ask candidate to explain their design end-to-end. Graph: ${nodeChain}. Paths to cover: ${pathList}.`,
        forbiddenHints: this._buildForbiddenHints(
          graph,
          progress.unexplainedNodeIds,
          null,
        ),
        maxSentences: 2,
        language,
      };
    }

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

  private _findCriticalGap(
    graph: { nodes: SDGraphNode[] },
    graphMetrics: { componentCoverage: number },
    _leftover: unknown,
  ): { componentType: string; description: string } {
    const hasDatabase = graph.nodes.some((n) =>
      ['database', 'cache', 'storage'].some(
        (t) =>
          (n.type ?? '').toLowerCase().includes(t) ||
          n.label.toLowerCase().includes(t),
      ),
    );
    if (!hasDatabase) {
      return {
        componentType: 'storage layer',
        description: 'where data is stored and how it is accessed',
      };
    }
    return {
      componentType: 'entry point or service layer',
      description: 'how requests enter the system and are routed',
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
}
