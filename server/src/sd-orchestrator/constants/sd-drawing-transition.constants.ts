import type { SDDrawingTransitionCriteria } from '../types/sd-orchestrator.types';

// Aliases accepted for each canonical component type
export const COMPONENT_ALIASES: Record<string, string[]> = {
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

export const DEFAULT_CRITERIA: SDDrawingTransitionCriteria = {
  emptyThreshold: 0,
  sparseThreshold: 3,
  requiredNodeTypes: ['client', 'database'],
};
