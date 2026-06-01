import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SDGraphSnapshotEntity } from './entities/sd-graph-snapshot.entity';
import type {
  SDGraphState,
  SDGraphMetrics,
  SDDrawingTransitionCriteria,
} from './types/sd-orchestrator.types';
import type { SDProblem } from '../sd-problem/entities/sd-problem.entity';
import type { SDSession } from '../sd-session/entities/sd-session.entity';

// Aliases accepted for each canonical component type
const COMPONENT_ALIASES: Record<string, string[]> = {
  client: ['client', 'browser', 'mobile', 'user', 'app'],
  lb: ['load balancer', 'lb', 'nginx', 'haproxy', 'elb', 'alb'],
  gateway: ['api gateway', 'gateway', 'kong', 'api gw'],
  service: [
    'service',
    'app server',
    'appserver',
    'server',
    'backend',
    'worker',
  ],
  database: [
    'database',
    'db',
    'postgres',
    'postgresql',
    'mysql',
    'mongodb',
    'rds',
    'sql',
    'nosql',
  ],
  cache: ['cache', 'redis', 'memcached', 'elasticache'],
  queue: ['queue', 'kafka', 'rabbitmq', 'sqs', 'pubsub', 'message queue', 'mq'],
  cdn: ['cdn', 'cloudfront', 'cloudflare', 'akamai'],
  storage: ['storage', 's3', 'blob', 'gcs', 'object storage', 'file storage'],
};

const DEFAULT_CRITERIA: SDDrawingTransitionCriteria = {
  emptyThreshold: 0,
  sparseThreshold: 3,
  requiredNodeTypes: ['client', 'database'],
};

@Injectable()
export class SDDrawingTransitionService {
  private readonly logger = new Logger(SDDrawingTransitionService.name);

  constructor(
    @InjectRepository(SDGraphSnapshotEntity)
    private readonly snapshotRepo: Repository<SDGraphSnapshotEntity>,
  ) {}

  // ─── Main entry ─────────────────────────────────────────────────────────────

  async handleDoneDrawing(
    session: SDSession,
    graph: SDGraphState,
    problem: SDProblem,
    hasNudgedEmptyCanvas: boolean,
  ): Promise<{
    shouldTransition: boolean;
    isSparse: boolean;
    transitionText?: string;
    nudgeText?: string;
    snapshotId?: string;
  }> {
    const { nodes } = graph;

    if (nodes.length === 0 && !hasNudgedEmptyCanvas) {
      return { shouldTransition: false, isSparse: false };
    }

    const metrics = this.computeGraphMetrics(graph, problem);
    const isSparse = this.classifySparseness(
      nodes.length,
      metrics,
      DEFAULT_CRITERIA,
    );
    const snapshot = await this.saveGraphSnapshot(
      session.id,
      'DESIGN_DRAWING',
      graph,
      metrics,
    );

    return {
      shouldTransition: true,
      isSparse,
      snapshotId: snapshot.id,
    };
  }

  // ─── Graph metrics (deterministic) ──────────────────────────────────────────

  computeGraphMetrics(graph: SDGraphState, problem: SDProblem): SDGraphMetrics {
    const { nodes, edges } = graph;
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    // Component coverage: fraction of expectedComponents represented in graph
    const expectedComponents: string[] = (problem.expectedComponents ?? []).map(
      (c) => c.toLowerCase(),
    );
    let matchedComponents = 0;
    for (const expected of expectedComponents) {
      const matched = nodes.some((n) => {
        const label = n.label.toLowerCase();
        const type = (n.type ?? '').toLowerCase();
        return (
          label.includes(expected) ||
          type.includes(expected) ||
          this.matchAlias(label, type, expected)
        );
      });
      if (matched) matchedComponents++;
    }
    const componentCoverage =
      expectedComponents.length > 0
        ? matchedComponents / expectedComponents.length
        : 0.5;

    // Topology coverage: fraction of critical edge types present
    const hasEntryPoint = nodes.some((n) =>
      ['client', 'browser', 'mobile', 'user'].some(
        (a) =>
          n.label.toLowerCase().includes(a) ||
          (n.type ?? '').toLowerCase().includes(a),
      ),
    );
    const hasStorage = nodes.some((n) =>
      [
        'database',
        'db',
        'postgres',
        'mysql',
        'redis',
        'cache',
        'storage',
        's3',
      ].some(
        (a) =>
          n.label.toLowerCase().includes(a) ||
          (n.type ?? '').toLowerCase().includes(a),
      ),
    );
    const hasEdges = edgeCount > 0;
    const topologyScore =
      [hasEntryPoint, hasStorage, hasEdges].filter(Boolean).length / 3;

    // Data flow: rough approximation — does graph have at least one path from entry to storage?
    const dataFlowCompleteness =
      hasEntryPoint && hasStorage && edgeCount >= 2 ? 0.8 : 0.3;

    // Architecture simplicity: penalise excessive nodes (>10)
    const architectureSimplicity = Math.max(
      0,
      1 - Math.max(0, nodeCount - 10) * 0.05,
    );

    return {
      componentCoverage,
      topologyCoverage: topologyScore,
      dataFlowCompleteness,
      requirementAlignment: componentCoverage,
      architectureSimplicity,
      nodeCount,
      edgeCount,
    };
  }

  private matchAlias(label: string, type: string, expected: string): boolean {
    for (const [, aliases] of Object.entries(COMPONENT_ALIASES)) {
      if (
        aliases.includes(expected) &&
        (aliases.some((a) => label.includes(a)) ||
          aliases.some((a) => type.includes(a)))
      ) {
        return true;
      }
    }
    return false;
  }

  classifySparseness(
    nodeCount: number,
    metrics: SDGraphMetrics,
    criteria: SDDrawingTransitionCriteria,
  ): boolean {
    return (
      nodeCount < criteria.sparseThreshold || metrics.componentCoverage < 0.4
    );
  }

  // ─── Snapshot persistence ────────────────────────────────────────────────────

  async saveGraphSnapshot(
    sessionId: string,
    stage: 'DESIGN_DRAWING' | 'DESIGN_WALKTHROUGH' | 'DEEP_DIVE' | 'WRAP_UP',
    graph: SDGraphState,
    metrics: SDGraphMetrics,
  ): Promise<SDGraphSnapshotEntity> {
    const snapshot = this.snapshotRepo.create({
      sessionId,
      stage,
      graph,
      metrics,
    });
    return this.snapshotRepo.save(snapshot);
  }

  async findSnapshot(
    sessionId: string,
    stage: string,
  ): Promise<SDGraphSnapshotEntity | null> {
    return this.snapshotRepo.findOne({
      where: { sessionId, stage: stage as any },
    });
  }
}
