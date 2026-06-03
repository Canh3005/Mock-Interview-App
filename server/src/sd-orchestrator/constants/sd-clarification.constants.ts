import type { SDClarificationTransitionCriteria } from '../types/sd-orchestrator.types';

// Architecture/implementation terms forbidden in all Clarification responses
export const FORBIDDEN_ARCHITECTURE_TERMS = [
  'cache',
  'sharding',
  'load balancer',
  'database design',
  'database partition',
  'consistent hashing',
  'replication',
  'microservice',
  'monolith',
  'api gateway design',
  'cdn',
  'queue',
  'kafka',
  'redis',
  'elasticsearch',
  'index',
  'horizontal scaling',
  'vertical scaling',
  'leader election',
  'raft',
  'paxos',
  'two-phase commit',
];

// Per-dimension coverage signals (hints for assessor, also used for nudge selection)
export const DIMENSION_COVERAGE_SIGNALS: Record<string, string[]> = {
  scope: [
    'use case',
    'feature',
    'functionality',
    'what',
    'user can',
    'support',
    'include',
    'exclude',
    'out of scope',
    'core',
  ],
  scale: [
    'user',
    'dau',
    'mau',
    'qps',
    'rps',
    'traffic',
    'request per',
    'million',
    'billion',
    'how many',
    'volume',
    'throughput',
  ],
  nfr: [
    'latency',
    'availability',
    'sla',
    'slo',
    'p99',
    'uptime',
    'reliability',
    'consistency',
    'durability',
    'performance',
  ],
  data: [
    'data size',
    'storage',
    'retention',
    'how long',
    'data model',
    'schema',
    'type of data',
    'format',
  ],
  constraints: [
    'budget',
    'team size',
    'timeline',
    'technology constraint',
    'existing infrastructure',
    'compliance',
    'regulation',
  ],
  non_goal: [
    'out of scope',
    'not building',
    'exclude',
    'skip',
    'ignore',
    'no need',
    'not required',
    "won't",
  ],
};

// Transition criteria per candidate level
export const CLARIFICATION_CRITERIA: Record<
  string,
  SDClarificationTransitionCriteria
> = {
  junior: {
    requiredDimensions: ['scope', 'scale'],
    minCandidateTurns: 2,
    minDurationSeconds: 60,
    maxDurationSeconds: 600,
  },
  mid: {
    requiredDimensions: ['scope', 'scale', 'nfr'],
    minCandidateTurns: 2,
    minDurationSeconds: 90,
    maxDurationSeconds: 600,
  },
  senior: {
    requiredDimensions: ['scope', 'scale', 'nfr'],
    minCandidateTurns: 3,
    minDurationSeconds: 120,
    maxDurationSeconds: 720,
  },
  staff: {
    requiredDimensions: ['scope', 'scale', 'nfr', 'data'],
    minCandidateTurns: 3,
    minDurationSeconds: 120,
    maxDurationSeconds: 720,
  },
};
