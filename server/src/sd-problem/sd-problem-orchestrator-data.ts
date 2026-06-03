import type {
  SDClarificationData,
  SDFlowPath,
  SDCurveball,
  SDProbe,
} from '../sd-orchestrator/types/sd-orchestrator.types';

export interface SDProblemOrchestratorData {
  clarificationData: SDClarificationData;
  flowPaths: SDFlowPath[];
  curveballs: SDCurveball[];
  probeBank: SDProbe[];
}

// Keyed by problem title — merged into seed at runtime
export const SD_PROBLEM_ORCHESTRATOR_DATA: Record<
  string,
  SDProblemOrchestratorData
> = {
  // ─── 1. URL Shortener ──────────────────────────────────────────────────────
  'Design a URL Shortener (Pastebin / Bit.ly)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: 'We expect about 100 million daily active users.',
          discloseWhen: [
            'users',
            'dau',
            'daily active',
            'how many users',
            'traffic',
            'scale',
          ],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'Peak around 400 reads/sec and 40 writes/sec.',
          discloseWhen: ['qps', 'requests per second', 'throughput', 'rps'],
        },
        {
          dimension: 'scope',
          key: 'custom_alias',
          answer:
            'Yes, users can create custom short URLs in addition to auto-generated ones.',
          discloseWhen: ['custom', 'alias', 'vanity', 'choose slug'],
        },
        {
          dimension: 'scope',
          key: 'expiry',
          answer:
            'URLs do not expire by default, but users can set an optional expiration date.',
          discloseWhen: ['expiry', 'expire', 'ttl', 'delete', 'lifespan'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Redirect latency should be under 200ms at p99.',
          discloseWhen: [
            'latency',
            'response time',
            'p99',
            'fast',
            'performance',
          ],
        },
        {
          dimension: 'data',
          key: 'storage',
          answer: 'Approximately 450 GB of URL mapping data over 3 years.',
          discloseWhen: ['storage', 'data size', 'how much', 'capacity', 'gb'],
        },
        {
          dimension: 'non_goal',
          key: 'analytics',
          answer: 'Click analytics are out of scope for this system.',
          discloseWhen: [
            'analytics',
            'click tracking',
            'statistics',
            'metrics',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'redirect',
        name: 'URL redirect',
        description:
          'User clicks short URL → receives 302 redirect to original URL',
        expectedNodeSequence: [
          'client',
          'lb',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'url_creation',
        name: 'URL creation',
        description: 'User submits original URL → receives short URL back',
        expectedNodeSequence: ['client', 'lb', 'write_api', 'sql_master'],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_thundering_herd',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A paste goes viral — shared 500,000 times in 10 minutes. Cache hit ratio drops to 20%. How does your design handle this thundering herd?',
        expectedMitigations: [
          'cache warming',
          'request coalescing',
          'distributed lock',
        ],
        redFlags: [
          'no cache fallback',
          'stampede ignored',
          'single cache node',
        ],
      },
      {
        id: 'curve_custom_alias',
        type: 'constraint_change',
        scenarioTemplate:
          'New requirement: users can choose their own short slug. How does your collision handling change?',
        expectedMitigations: [
          'unique constraint',
          'retry on collision',
          'rate limit custom aliases',
        ],
        redFlags: ['no collision detection', 'no namespace protection'],
      },
    ],
    probeBank: [
      {
        id: 'probe_url_cache',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'Your read API queries PostgreSQL on every redirect at 400 reads/sec peak — walk me through your caching strategy.',
        expectedSignals: [
          'cache strategy',
          'cache hit rate',
          'database load reduction',
        ],
        redFlags: ['no cache', 'cache never expires'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What caching approach and hit rate would you target?',
          },
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What does that hit rate mean for remaining DB load at 400 reads/sec?',
          },
          {
            trigger: 'red_flag',
            questionTemplate:
              'If TTL never expires, what happens when a URL is deleted?',
          },
        ],
      },
      {
        id: 'probe_url_id_gen',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'How do you generate globally unique short keys without coordination overhead?',
        expectedSignals: [
          'base62 encoding',
          'collision handling',
          'counter vs random tradeoff',
        ],
        redFlags: ['global lock on ID generation', 'no collision detection'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk me through what happens when two users submit the same URL simultaneously.',
          },
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What is the trade-off between a counter and a random hash for ID generation?',
          },
        ],
      },
      {
        id: 'probe_url_consistency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['database'],
        primaryQuestionTemplate:
          'A user creates a short URL and immediately tries to resolve it — could they hit a stale replica?',
        expectedSignals: [
          'replication lag',
          'read-your-writes',
          'read from master after write',
        ],
        redFlags: ['ignores replication lag', 'no consistency strategy'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How long is typical replication lag, and what is the user impact?',
          },
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Trade-off between always reading from master vs accepting stale reads?',
          },
        ],
      },
    ],
  },

  // ─── 2. Twitter Timeline ───────────────────────────────────────────────────
  'Design Twitter Timeline & Search': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: '100 million daily active users.',
          discloseWhen: ['users', 'dau', 'daily active', 'how many', 'scale'],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'Peak 100,000 timeline read requests per second.',
          discloseWhen: ['qps', 'throughput', 'requests per second', 'reads'],
        },
        {
          dimension: 'scope',
          key: 'features',
          answer:
            'Home timeline (followed users tweets) and keyword search. No DMs, no notifications for this design.',
          discloseWhen: [
            'features',
            'scope',
            'what',
            'use cases',
            'functionality',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Timeline load under 500ms at p99.',
          discloseWhen: ['latency', 'p99', 'response time', 'fast'],
        },
        {
          dimension: 'data',
          key: 'retention',
          answer:
            'Tweets are stored indefinitely. Estimated 5.4 PB over 3 years.',
          discloseWhen: ['storage', 'retention', 'how long', 'data size'],
        },
        {
          dimension: 'non_goal',
          key: 'dms',
          answer: 'Direct messages are out of scope.',
          discloseWhen: ['dms', 'direct messages', 'private messages', 'chat'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'post_tweet',
        name: 'Post tweet (fan-out)',
        description:
          'User posts tweet → persisted and fanned out to followers timelines',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'write_api',
          'fanout_service',
          'timeline_cache',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'read_timeline',
        name: 'Read home timeline',
        description: 'User opens app → home timeline loaded from cache',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'read_api',
          'timeline_cache',
        ],
        required: true,
        priority: 2,
      },
      {
        id: 'search',
        name: 'Keyword search',
        description:
          'User searches keyword → scatter-gather over search cluster',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'search_api',
          'search_cluster',
        ],
        required: false,
        priority: 3,
      },
    ],
    curveballs: [
      {
        id: 'curve_celebrity_fanout',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A celebrity with 50 million followers just posted a tweet. Your fan-out service needs to write 50 million timeline entries. How long will this take, and how do you handle it?',
        expectedMitigations: [
          'hybrid fanout',
          'push for active users pull for others',
          'skip celebrity in fan-out',
        ],
        redFlags: [
          'synchronous fan-out to all followers',
          'no hotkey handling',
        ],
      },
      {
        id: 'curve_trending',
        type: 'constraint_change',
        scenarioTemplate:
          'New requirement: trending topics must update in real time (under 30 seconds). Your current batch processing has a 5-minute delay. What changes?',
        expectedMitigations: [
          'stream processing',
          'sliding window aggregate',
          'separate trending service',
        ],
        redFlags: ['batch-only approach', 'no stream layer'],
      },
    ],
    probeBank: [
      {
        id: 'probe_twitter_fanout',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'Walk me through your fan-out strategy — when a user with 1 million followers posts, how many writes happen and where?',
        expectedSignals: [
          'push vs pull tradeoff',
          'fan-out on write vs read',
          'hybrid for celebrities',
        ],
        redFlags: [
          'always push to all followers',
          'no differentiation for celebrity accounts',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What is the latency difference between fan-out on write and fan-out on read for a regular user?',
          },
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How does your strategy change for users with 50 million followers vs users with 100 followers?',
          },
        ],
      },
      {
        id: 'probe_twitter_consistency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'User A follows User B. User B posts. How quickly does User A see that tweet in their timeline, and what are the consistency guarantees?',
        expectedSignals: [
          'eventual consistency',
          'cache invalidation',
          'acceptable staleness window',
        ],
        redFlags: ['strong consistency at 100K QPS', 'no staleness budget'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What is the acceptable staleness window, and how do you communicate that to users?',
          },
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Trade-off between consistency and throughput at 100K QPS?',
          },
        ],
      },
    ],
  },

  // ─── 3. Web Crawler ────────────────────────────────────────────────────────
  'Design a Web Crawler': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'pages',
          answer: 'We expect to crawl about 1 billion pages per month.',
          discloseWhen: ['pages', 'scale', 'how many', 'volume', 'crawl rate'],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'About 1,600 fetches per second at peak.',
          discloseWhen: [
            'qps',
            'throughput',
            'fetch rate',
            'requests per second',
          ],
        },
        {
          dimension: 'scope',
          key: 'content_type',
          answer: 'HTML pages only — no images, videos, or binary files.',
          discloseWhen: [
            'content type',
            'file type',
            'images',
            'binary',
            'scope',
          ],
        },
        {
          dimension: 'nfr',
          key: 'freshness',
          answer:
            'Popular pages should be recrawled every few days; rare pages every few weeks.',
          discloseWhen: [
            'freshness',
            'recrawl',
            'update frequency',
            'staleness',
          ],
        },
        {
          dimension: 'data',
          key: 'storage',
          answer: 'About 72 PB of raw crawled data over 3 years.',
          discloseWhen: ['storage', 'data size', 'how much', 'petabyte'],
        },
        {
          dimension: 'non_goal',
          key: 'rendering',
          answer: 'JavaScript rendering is out of scope — static HTML only.',
          discloseWhen: ['javascript', 'rendering', 'spa', 'dynamic', 'js'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'crawl_page',
        name: 'Crawl and index a page',
        description:
          'Crawler pops URL from queue → fetches page → deduplicates → queues for indexing',
        expectedNodeSequence: [
          'crawler',
          'redis_queue',
          'nosql',
          'mq',
          'reverse_index',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'search_query',
        name: 'Search query',
        description:
          'User sends query → cache check → index lookup → document fetch',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'query_api',
          'cache',
          'reverse_index',
          'doc_service',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_crawler_trap',
        type: 'failure',
        scenarioTemplate:
          'Website A keeps generating infinite unique URLs (crawler trap). Your crawler is stuck fetching the same domain infinitely. How do you detect and handle this?',
        expectedMitigations: [
          'URL normalization',
          'max depth per domain',
          'page signature deduplication',
          'robots.txt',
        ],
        redFlags: ['no duplicate detection', 'no domain rate limiting'],
      },
      {
        id: 'curve_breaking_news',
        type: 'constraint_change',
        scenarioTemplate:
          'Breaking news just appeared — the team wants it indexed within 5 minutes instead of the weekly crawl schedule. What changes to your architecture?',
        expectedMitigations: [
          'priority queue',
          'sitemap ping subscription',
          'high priority crawl lane',
        ],
        redFlags: ['single FIFO queue only', 'no priority mechanism'],
      },
    ],
    probeBank: [
      {
        id: 'probe_crawler_dedup',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'How do you detect and skip duplicate pages — same content, different URLs?',
        expectedSignals: [
          'content hash',
          'simhash for near-duplicates',
          'URL normalization',
        ],
        redFlags: ['URL-only deduplication', 'no content-level dedup'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What is the trade-off between exact hash matching and simhash for near-duplicates?',
          },
          {
            trigger: 'missing_metric',
            questionTemplate:
              'At 72 PB of data, how much storage does your deduplication index require?',
          },
        ],
      },
      {
        id: 'probe_crawler_politeness',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'How do you ensure your crawler does not overload a single website, and respects robots.txt?',
        expectedSignals: [
          'per-domain rate limiting',
          'robots.txt compliance',
          'crawl delay',
        ],
        redFlags: ['no rate limiting per domain', 'ignores robots.txt'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How do you enforce a crawl delay of 1 second per domain across distributed crawler workers?',
          },
        ],
      },
    ],
  },

  // ─── 4. Personal Finance Manager ──────────────────────────────────────────
  'Design a Personal Finance Manager (Mint.com)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: '10 million daily active users.',
          discloseWhen: ['users', 'dau', 'scale', 'how many'],
        },
        {
          dimension: 'scope',
          key: 'features',
          answer:
            'Link bank accounts, auto-categorize transactions, track budgets, send alerts when approaching limits.',
          discloseWhen: ['features', 'scope', 'use cases', 'what'],
        },
        {
          dimension: 'scale',
          key: 'transactions',
          answer:
            'About 2,000 transaction write operations per second at peak.',
          discloseWhen: ['transactions', 'writes', 'qps', 'throughput'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Dashboard load under 500ms at p99.',
          discloseWhen: ['latency', 'dashboard load', 'p99', 'response time'],
        },
        {
          dimension: 'data',
          key: 'retention',
          answer:
            'Transaction history retained for 7 years (regulatory requirement).',
          discloseWhen: [
            'retention',
            'history',
            'how long',
            'regulation',
            'storage',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'payments',
          answer: 'We do not process payments — read-only bank data sync only.',
          discloseWhen: ['payment', 'transfer', 'send money', 'write to bank'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'transaction_sync',
        name: 'Transaction sync',
        description:
          'Bank API triggers extraction → categorization → budget update',
        expectedNodeSequence: [
          'accounts_api',
          'mq',
          'extract_service',
          'category_service',
          'budget_service',
          'sql_master',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'dashboard_read',
        name: 'Dashboard read',
        description:
          'User opens dashboard → cache hit or DB read → render summary',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_duplicate_transactions',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'A bank partner API sends duplicate transactions for 2 hours due to their bug. Users see negative balances on their dashboard. Where is your idempotency?',
        expectedMitigations: [
          'idempotency key',
          'unique constraint on transaction id',
          'deduplication window',
        ],
        redFlags: ['no idempotency', 'insert without checking'],
      },
      {
        id: 'curve_realtime_alert',
        type: 'constraint_change',
        scenarioTemplate:
          'New requirement: real-time spending alerts — if spending in the last hour exceeds 20% of monthly budget, notify immediately. Your batch processing has a 5-minute delay. What changes?',
        expectedMitigations: [
          'stream processing',
          'sliding window',
          'Redis counter',
        ],
        redFlags: ['batch-only', 'no real-time layer'],
      },
    ],
    probeBank: [
      {
        id: 'probe_mint_idempotency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Your system fetches transactions from external bank APIs. How do you guarantee at-most-once processing if the same transaction arrives twice?',
        expectedSignals: [
          'idempotency key',
          'unique constraint',
          'deduplication check before insert',
        ],
        redFlags: ['blind insert', 'no idempotency mechanism'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk me through exactly what happens when the same transaction_id arrives a second time.',
          },
        ],
      },
      {
        id: 'probe_mint_scalability',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database', 'queue'],
        primaryQuestionTemplate:
          "At month-end, all 10M users' bank accounts sync simultaneously. How does your extraction service handle this burst?",
        expectedSignals: [
          'queue buffering',
          'horizontal scaling',
          'backpressure',
        ],
        redFlags: [
          'synchronous bank API calls',
          'no queue between accounts API and workers',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How does the message queue provide backpressure when workers cannot keep up?',
          },
        ],
      },
    ],
  },

  // ─── 5. Key-Value Cache ────────────────────────────────────────────────────
  'Design a Distributed Key-Value Cache': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer:
            '10 million daily active users, 4,000 cache reads per second peak.',
          discloseWhen: [
            'users',
            'scale',
            'qps',
            'requests per second',
            'throughput',
          ],
        },
        {
          dimension: 'scope',
          key: 'operations',
          answer:
            'GET, SET, DELETE. No complex queries — pure key-value access.',
          discloseWhen: [
            'operations',
            'api',
            'commands',
            'what operations',
            'scope',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Under 10ms read latency at p99.',
          discloseWhen: [
            'latency',
            'p99',
            'response time',
            'fast',
            'milliseconds',
          ],
        },
        {
          dimension: 'data',
          key: 'storage',
          answer: 'Up to 2.7 TB if all queries are cached. In-memory per node.',
          discloseWhen: ['storage', 'memory', 'data size', 'how much'],
        },
        {
          dimension: 'nfr',
          key: 'eviction',
          answer: 'LRU eviction policy when memory is full.',
          discloseWhen: ['eviction', 'lru', 'full', 'memory limit', 'policy'],
        },
        {
          dimension: 'non_goal',
          key: 'persistence',
          answer:
            'Persistence to disk is optional — cache misses fall back to the database.',
          discloseWhen: [
            'persistence',
            'disk',
            'durability',
            'survive restart',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'cache_hit',
        name: 'Cache read hit',
        description:
          'Client queries cache → shard found via consistent hash → key returned',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'query_api',
          'cache_shard_1',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'cache_miss',
        name: 'Cache miss → backend',
        description:
          'Client queries cache → miss → backend lookup → write back to cache',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'query_api',
          'reverse_index',
          'query_api',
          'cache_shard_1',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_node_failure',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'One of your three cache shards crashes. How does consistent hashing redistribute traffic, and what is the user impact during the transition?',
        expectedMitigations: [
          'consistent hashing',
          'virtual nodes',
          'graceful miss handling',
        ],
        redFlags: ['full cache flush on node failure', 'no virtual nodes'],
      },
      {
        id: 'curve_invalidation',
        type: 'constraint_change',
        scenarioTemplate:
          'When the search index updates a page that was crawled, you need to invalidate the specific cache entries for that page — not flush the entire cache. How?',
        expectedMitigations: [
          'event-driven invalidation',
          'versioned keys',
          'TTL-based expiry',
        ],
        redFlags: ['flush entire cache', 'no targeted invalidation'],
      },
    ],
    probeBank: [
      {
        id: 'probe_cache_partitioning',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'Walk me through how you partition keys across cache nodes — and what happens to key distribution when you add or remove a node.',
        expectedSignals: [
          'consistent hashing',
          'virtual nodes',
          'minimal remapping',
        ],
        redFlags: ['modulo hashing', 'full rehash on node change'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'With modulo hashing and 3 nodes, what fraction of keys must be remapped when you add a 4th node?',
          },
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How many virtual nodes per physical node, and what is the trade-off?',
          },
        ],
      },
      {
        id: 'probe_cache_eviction',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'Your cache node is at 95% memory. What eviction policy do you use, and how do you handle a sudden spike in writes?',
        expectedSignals: [
          'LRU policy',
          'eviction threshold',
          'memory pressure handling',
        ],
        redFlags: ['no eviction policy', 'reject all writes when full'],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'LRU vs LFU — which is better for your access pattern and why?',
          },
        ],
      },
    ],
  },

  // ─── 6. Amazon Sales Rank ─────────────────────────────────────────────────
  'Design Amazon Sales Ranking by Category': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'qps',
          answer:
            'About 40,000 rank reads per second and a few hundred transaction writes per second.',
          discloseWhen: ['qps', 'reads', 'throughput', 'scale'],
        },
        {
          dimension: 'scope',
          key: 'ranking',
          answer:
            'Sales rank per product per category, updated based on recent purchase velocity.',
          discloseWhen: [
            'ranking',
            'scope',
            'how',
            'what',
            'category',
            'product',
          ],
        },
        {
          dimension: 'nfr',
          key: 'freshness',
          answer:
            'Rankings can be up to 1 hour stale — batch update is acceptable.',
          discloseWhen: [
            'freshness',
            'staleness',
            'how often',
            'update frequency',
            'real-time',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Rank reads under 100ms at p99.',
          discloseWhen: ['latency', 'response time', 'p99', 'fast'],
        },
        {
          dimension: 'data',
          key: 'storage',
          answer: 'About 40 GB of rank data per month — relatively small.',
          discloseWhen: ['storage', 'data size', 'how much', 'gb'],
        },
        {
          dimension: 'non_goal',
          key: 'recommendation',
          answer:
            'Product recommendations and personalization are out of scope.',
          discloseWhen: [
            'recommendation',
            'personalization',
            'ml',
            'machine learning',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'rank_read',
        name: 'Read product rank',
        description: 'User views product → read rank from cache',
        expectedNodeSequence: [
          'client',
          'cdn',
          'lb',
          'web_server',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'rank_compute',
        name: 'Compute rankings (batch)',
        description:
          'Hourly batch reads raw sales → aggregates → writes rank table',
        expectedNodeSequence: [
          'object_store',
          'mapreduce',
          'analytics_db',
          'sql_master',
          'cache',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_prime_day',
        type: 'scale_spike',
        scenarioTemplate:
          'Prime Day: transaction volume spikes 100× in 2 hours. Hourly batch rankings become 2 hours stale. What do you change?',
        expectedMitigations: [
          'stream processing',
          'near-real-time ranking',
          'Kafka plus Flink',
        ],
        redFlags: ['batch-only stays', 'no stream processing layer'],
      },
      {
        id: 'curve_hot_partition',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'One category has a single product with 90% of sales. Your sharding by category creates a hot partition. How do you fix this?',
        expectedMitigations: [
          'shard by product id',
          'local aggregation then merge',
          'Redis sorted set per category',
        ],
        redFlags: ['single shard for category', 'no hot key handling'],
      },
    ],
    probeBank: [
      {
        id: 'probe_sales_batch',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['worker', 'database'],
        primaryQuestionTemplate:
          'Walk me through how your MapReduce computes top-K products per category across millions of products.',
        expectedSignals: [
          'local aggregation per shard',
          'global merge',
          'top-K algorithm',
        ],
        redFlags: ['sort all data globally first', 'no local pre-aggregation'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How do you avoid shuffling all product data to a single reducer?',
          },
        ],
      },
      {
        id: 'probe_sales_cache',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'Rankings are served 100× more reads than writes. How do you keep cache hit rate high while keeping rankings fresh after each hourly batch?',
        expectedSignals: [
          'write-through cache',
          'TTL aligned to batch interval',
          'cache invalidation on batch complete',
        ],
        redFlags: ['no cache layer', 'full cache flush every hour'],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If you set TTL to 1 hour, what happens to reads right after a batch completes but before TTL expires?',
          },
        ],
      },
    ],
  },

  // ─── 7. Scaling to Millions on AWS ────────────────────────────────────────
  'Design a System That Scales to Millions of Users on AWS': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: '10 million daily active users, targeting 40,000 peak QPS.',
          discloseWhen: ['users', 'dau', 'scale', 'how many', 'traffic'],
        },
        {
          dimension: 'scope',
          key: 'starting_point',
          answer:
            'We start with a single server and single database — the task is to evolve the architecture step by step.',
          discloseWhen: [
            'starting',
            'current',
            'existing',
            'scope',
            'starting point',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer: 'Target 99.99% uptime — four nines.',
          discloseWhen: ['availability', 'uptime', 'sla', 'downtime', 'nines'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Under 200ms at p99.',
          discloseWhen: ['latency', 'response time', 'p99', 'fast'],
        },
        {
          dimension: 'data',
          key: 'storage',
          answer: 'About 36 TB of data over 3 years.',
          discloseWhen: ['storage', 'data size', 'how much', 'tb'],
        },
        {
          dimension: 'non_goal',
          key: 'ml',
          answer: 'No ML or AI features required.',
          discloseWhen: ['ml', 'machine learning', 'ai', 'recommendation'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'user_request',
        name: 'User web request',
        description:
          'User sends HTTP request → DNS → CDN → LB → App → Cache/DB',
        expectedNodeSequence: [
          'client',
          'dns',
          'cdn',
          'lb',
          'app_servers',
          'cache',
          'rds_replica',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'async_job',
        name: 'Async background job',
        description: 'App queues work → SQS → Worker → S3 / Redshift',
        expectedNodeSequence: ['app_servers', 'sqs', 'worker', 's3'],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_rds_io',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'RDS Master disk I/O reaches 90% capacity. Read replicas do not help because write load is too high. What is your next step?',
        expectedMitigations: [
          'vertical scaling',
          'sharding by user id',
          'CQRS',
          'connection pooling',
        ],
        redFlags: ['add more read replicas only', 'no write scaling strategy'],
      },
      {
        id: 'curve_zero_downtime',
        type: 'constraint_change',
        scenarioTemplate:
          'You need a zero-downtime deploy with 10 million active users. Blue-green or rolling deploy — which, and what are the trade-offs?',
        expectedMitigations: [
          'blue-green instant rollback',
          'rolling saves cost',
          'backward compatible API',
        ],
        redFlags: ['downtime accepted', 'no rollback plan'],
      },
    ],
    probeBank: [
      {
        id: 'probe_aws_rds_scaling',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database'],
        primaryQuestionTemplate:
          'You have RDS with read replicas. At what point do read replicas stop helping, and what is your next move when writes also scale?',
        expectedSignals: [
          'read replicas for read scaling',
          'sharding for write scaling',
          'connection pooling',
        ],
        redFlags: [
          'infinite read replicas solve everything',
          'no write scaling plan',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If write QPS doubles every 6 months, when does vertical scaling stop being viable?',
          },
        ],
      },
      {
        id: 'probe_aws_autoscaling',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service'],
        primaryQuestionTemplate:
          'Your autoscaling group adds EC2 instances when CPU > 70%. What is the warm-up time, and what happens to traffic during that window?',
        expectedSignals: [
          'warm-up time',
          'connection draining',
          'health check grace period',
        ],
        redFlags: [
          'no warm-up consideration',
          'traffic to unhealthy instances',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If warm-up takes 3 minutes and a spike lasts 5 minutes, how many requests fail?',
          },
        ],
      },
    ],
  },

  // ─── 8. Social Graph ──────────────────────────────────────────────────────
  'Design a Social Graph — Find Shortest Connection Path': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'users',
          answer: '100 million users, 5 billion relationships.',
          discloseWhen: ['users', 'scale', 'relationships', 'how many'],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'About 400 BFS queries per second.',
          discloseWhen: ['qps', 'queries per second', 'throughput'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'BFS query should complete in under 1 second.',
          discloseWhen: ['latency', 'response time', '1 second', 'fast', 'p99'],
        },
        {
          dimension: 'scope',
          key: 'max_depth',
          answer: 'Maximum 6 degrees of separation — we do not search deeper.',
          discloseWhen: ['depth', 'degrees', 'levels', 'max', 'how deep'],
        },
        {
          dimension: 'data',
          key: 'graph_storage',
          answer:
            '5 billion relationships — approximately 120 GB if stored as edge list.',
          discloseWhen: ['storage', 'edges', 'relationships', 'how much'],
        },
        {
          dimension: 'non_goal',
          key: 'directed',
          answer:
            'All connections are mutual (undirected graph) — no follower/following distinction.',
          discloseWhen: ['directed', 'follower', 'asymmetric', 'one-way'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'bfs_query',
        name: 'Shortest path BFS query',
        description:
          'User queries shortest path → check cache → BFS via lookup service across shards',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'search_api',
          'cache',
          'user_graph_svc',
          'lookup_service',
          'person_shard_1',
        ],
        required: true,
        priority: 1,
      },
    ],
    curveballs: [
      {
        id: 'curve_bfs_depth',
        type: 'scale_spike',
        scenarioTemplate:
          'A BFS at depth 6 on 100M users could traverse billions of nodes. In practice, what is your actual latency, and how do you keep it under 1 second?',
        expectedMitigations: [
          'bidirectional BFS',
          'depth limit',
          'precomputed popular pairs',
          'cached results',
        ],
        redFlags: [
          'unbounded BFS',
          'no depth limit',
          'no bidirectional optimization',
        ],
      },
      {
        id: 'curve_celebrity_node',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'A user with 50 million followers appears in your BFS traversal. Fetching their full friend list creates a fan-out of 50M nodes. How does your architecture handle this super-node?',
        expectedMitigations: [
          'skip celebrity nodes',
          'truncated friend list',
          'separate celebrity graph',
        ],
        redFlags: ['full fan-out on celebrity', 'no super-node handling'],
      },
    ],
    probeBank: [
      {
        id: 'probe_graph_bfs',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Walk me through the BFS algorithm across your sharded person servers — how many network hops does a depth-3 query require?',
        expectedSignals: [
          'bidirectional BFS reduces hops',
          'parallel shard queries',
          'lookup service to resolve shards',
        ],
        redFlags: ['sequential shard lookups', 'no parallelism'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'At depth 3 with branching factor 200, how many shard lookups does a unidirectional BFS require?',
          },
        ],
      },
      {
        id: 'probe_graph_sharding',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database'],
        primaryQuestionTemplate:
          'You shard the graph by user ID. User A on shard 1 is connected to User B on shard 7 — how do you handle cross-shard edge traversal efficiently?',
        expectedSignals: [
          'lookup service resolves shard',
          'edges stored on both shards',
          'consistent hashing',
        ],
        redFlags: [
          'cross-shard join on every query',
          'no edge locality optimization',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If you store edges on both endpoint shards, what is the storage overhead?',
          },
        ],
      },
    ],
  },

  // ─── 9. Rate Limiter ──────────────────────────────────────────────────────
  'Design an API Rate Limiter': {
    clarificationData: {
      facts: [
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Build a middleware that checks every API request against configured limits and either forwards it or returns HTTP 429 Too Many Requests.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'what should it do',
            'scope',
            'requirement',
            'tính năng',
            'tính năng chính',
            'chức năng',
            'chức năng chính',
            'hệ thống làm gì',
            'phạm vi',
            'yêu cầu',
          ],
        },
        {
          dimension: 'scope',
          key: 'response_contract',
          answer:
            'Allowed requests continue to the backend. Rejected requests return HTTP 429 with a Retry-After header and a small error body.',
          discloseWhen: [
            '429',
            'too many requests',
            'retry-after',
            'rejected',
            'throttled',
            'block',
            'reject',
            'response',
            'client behavior',
            'bị chặn',
            'từ chối',
            'trả về gì',
            'quá giới hạn',
          ],
        },
        {
          dimension: 'scope',
          key: 'dynamic_rules',
          answer:
            'Rules should be configurable without redeploying the API servers; updates may take up to 60 seconds to propagate.',
          discloseWhen: [
            'configure',
            'configurable',
            'dynamic rule',
            'rule update',
            'change limits',
            'admin',
            'propagation',
            'cấu hình',
            'thay đổi limit',
            'cập nhật rule',
            'cập nhật quy tắc',
            'không redeploy',
          ],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'Up to 100,000 API requests per second to rate-check.',
          discloseWhen: [
            'qps',
            'rps',
            'throughput',
            'traffic',
            'requests per second',
            'scale',
            'peak',
            'volume',
            'bao nhiêu request',
            'lưu lượng',
            'quy mô',
            'tải cao điểm',
            'request mỗi giây',
          ],
        },
        {
          dimension: 'scope',
          key: 'granularity',
          answer:
            'Limits must support per-customer or API-key rules, per-endpoint rules, and optional global fallback rules.',
          discloseWhen: [
            'granularity',
            'per user',
            'per customer',
            'api key',
            'per endpoint',
            'route',
            'global limit',
            'rules',
            'scope',
            'limit theo',
            'theo user',
            'theo khách hàng',
            'theo api key',
            'theo endpoint',
            'theo route',
            'quy tắc',
          ],
        },
        {
          dimension: 'scale',
          key: 'tenant_scale',
          answer:
            'Assume 10 million daily active API clients, with a small percentage responsible for most traffic.',
          discloseWhen: [
            'users',
            'clients',
            'customers',
            'tenants',
            'dau',
            'active users',
            'how many users',
            'how many clients',
            'hot customers',
            'số user',
            'số khách hàng',
            'bao nhiêu user',
            'bao nhiêu client',
            'khách hàng lớn',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer:
            'Rate limiting check must add under 5ms overhead per request.',
          discloseWhen: [
            'latency',
            'overhead',
            'delay',
            'p99',
            'fast',
            'performance',
            'response time',
            'trễ',
            'độ trễ',
            'thêm bao nhiêu ms',
            'nhanh',
            'hiệu năng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'The rate limiter should prefer availability for normal APIs: if the counter store is unavailable, fail-open briefly with alerts and local emergency limits.',
          discloseWhen: [
            'availability',
            'fail open',
            'fail-open',
            'fail closed',
            'fail-closed',
            'redis down',
            'counter store down',
            'dependency down',
            'outage',
            'sự cố',
            'redis chết',
            'redis lỗi',
            'khả dụng',
            'phụ thuộc lỗi',
          ],
        },
        {
          dimension: 'nfr',
          key: 'accuracy',
          answer:
            'Some over-counting is acceptable — eventual consistency for counters is fine.',
          discloseWhen: [
            'accuracy',
            'exact',
            'precise',
            'consistency',
            'exact count',
            'race',
            'over allow',
            'over block',
            'eventual consistency',
            'chính xác',
            'đếm chính xác',
            'nhất quán',
            'race condition',
            'cho phép quá',
            'chặn nhầm',
          ],
        },
        {
          dimension: 'nfr',
          key: 'abuse_priority',
          answer:
            'For security-sensitive endpoints such as login or payment creation, stricter fail-closed behavior is acceptable; for general read APIs, fail-open is preferred.',
          discloseWhen: [
            'security',
            'abuse',
            'login',
            'payment',
            'critical endpoint',
            'sensitive endpoint',
            'auth',
            'fraud',
            'bảo mật',
            'lạm dụng',
            'đăng nhập',
            'thanh toán',
            'endpoint nhạy cảm',
          ],
        },
        {
          dimension: 'data',
          key: 'state',
          answer:
            'Counter state is stored in Redis with TTLs. The expected active counter footprint should stay under 1 GB.',
          discloseWhen: [
            'storage',
            'state',
            'counter state',
            'where stored',
            'redis',
            'memory',
            'ttl',
            'expire',
            'lưu ở đâu',
            'lưu counter',
            'bộ nhớ',
            'hết hạn',
            'dữ liệu',
          ],
        },
        {
          dimension: 'data',
          key: 'logs',
          answer:
            'Rejected request logs are kept asynchronously for monitoring and debugging for 30 days; allowed requests do not need per-request durable logs.',
          discloseWhen: [
            'logs',
            'logging',
            'audit',
            'analytics',
            'monitoring',
            'rejected logs',
            'retention',
            'lưu log',
            'log bị chặn',
            'theo dõi',
            'giám sát',
            'giữ bao lâu',
          ],
        },
        {
          dimension: 'constraints',
          key: 'rules_source',
          answer:
            'Rules are owned by an internal admin/control-plane service and read by the rate limiter through a local cache.',
          discloseWhen: [
            'rules source',
            'control plane',
            'admin service',
            'rules database',
            'local cache',
            'who manages rules',
            'nguồn rule',
            'ai cấu hình',
            'admin',
            'cache rule',
          ],
        },
        {
          dimension: 'constraints',
          key: 'deployment',
          answer:
            'The first version is single-region active-active inside one region. Multi-region global limits are a follow-up requirement, not mandatory for v1.',
          discloseWhen: [
            'multi region',
            'global',
            'regions',
            'data center',
            'deployment',
            'geo',
            'single region',
            'nhiều region',
            'toàn cầu',
            'đa vùng',
            'triển khai',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'billing',
          answer:
            'Billing, paid quotas, and usage-based charging are out of scope; this system only enforces request limits.',
          discloseWhen: [
            'billing',
            'payment',
            'quota billing',
            'paid plan',
            'metering',
            'usage billing',
            'tính phí',
            'thanh toán',
            'gói trả phí',
            'quota trả tiền',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'waf',
          answer:
            'Bot detection, WAF rules, authentication, and request payload validation are separate systems and are out of scope.',
          discloseWhen: [
            'bot',
            'waf',
            'firewall',
            'authentication',
            'auth',
            'payload validation',
            'captcha',
            'fraud detection',
            'chống bot',
            'tường lửa',
            'xác thực',
            'validate payload',
            'captcha',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'allowed_request',
        name: 'Allowed request flow',
        description:
          'Request arrives → rate limiter checks rules → counter incremented → forwarded to backend',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'rate_limiter',
          'rules_cache',
          'redis_cluster',
          'api_servers',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'throttled_request',
        name: 'Throttled request flow',
        description:
          'Request arrives → counter exceeds limit → 429 returned → rejection logged',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'rate_limiter',
          'redis_cluster',
          'mq',
        ],
        required: true,
        priority: 2,
      },
      {
        id: 'rule_update_flow',
        name: 'Rule update propagation flow',
        description:
          'Admin changes a limit -> rules service persists it -> local rules cache refreshes -> rate limiter applies new rule',
        expectedNodeSequence: [
          'rules_service',
          'rules_db',
          'rules_cache',
          'rate_limiter',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'counter_store_degraded_flow',
        name: 'Counter store degraded flow',
        description:
          'Counter store is unavailable -> rate limiter uses local emergency limits -> request may pass fail-open -> alert or rejection event is logged',
        expectedNodeSequence: [
          'rate_limiter',
          'redis_cluster',
          'api_servers',
          'mq',
        ],
        required: false,
        priority: 4,
      },
    ],
    curveballs: [
      {
        id: 'curve_redis_down',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Your Redis cluster crashes mid-traffic. Your rate limiter cannot check counters. Do you fail-open (allow all) or fail-closed (block all)? Why?',
        expectedMitigations: [
          'fail-open for availability',
          'alert monitoring',
          'local fallback counter',
        ],
        redFlags: [
          'fail-closed blocks legitimate users',
          'no monitoring on Redis failure',
        ],
      },
      {
        id: 'curve_hot_key_customer',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'One large customer suddenly sends 40% of all traffic through a single API key. How does your Redis key design and sharding strategy avoid a hot key bottleneck?',
        expectedMitigations: [
          'split hot counters by time bucket or sub-key',
          'detect hot API keys and apply stricter local pre-limit',
          'isolate large customers to dedicated shards when needed',
        ],
        redFlags: [
          'single counter key receives all writes',
          'no hot key detection',
          'no customer isolation strategy',
        ],
      },
      {
        id: 'curve_memory_footprint',
        type: 'constraint_change',
        scenarioTemplate:
          'You decide to switch from fixed window to sliding window counter for accuracy. With 10M users × 100 endpoints, what is the memory footprint and can Redis handle it?',
        expectedMitigations: [
          '2 counters per user per window',
          'TTL auto-expire',
          'calculated memory estimate',
        ],
        redFlags: ['no memory calculation', 'sliding window log unbounded'],
      },
      {
        id: 'curve_multi_region_limit',
        type: 'constraint_change',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Product now asks for one global limit across three regions. A customer sends traffic to all regions at once. How do you keep limits reasonably accurate without adding high cross-region latency?',
        expectedMitigations: [
          'regional quota allocation',
          'eventual global reconciliation',
          'accept bounded over-allowing',
          'avoid synchronous cross-region counter checks on every request',
        ],
        redFlags: [
          'cross-region synchronous write on every request',
          'claims exact global limit with no latency cost',
          'no over-allowing bound',
        ],
      },
      {
        id: 'curve_rules_cache_stale',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'The rules service is down for 10 minutes, but API traffic continues. Existing limits must keep working and emergency blocks must still be possible. What does your control-plane/data-plane design do?',
        expectedMitigations: [
          'local rules cache with TTL and last-known-good config',
          'separate control plane from request path',
          'emergency static deny/allow list',
          'alert on stale rules age',
        ],
        redFlags: [
          'rules service called synchronously on every request',
          'no last-known-good config',
          'no stale config monitoring',
        ],
      },
      {
        id: 'curve_redis_cost_pressure',
        type: 'cost_pressure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Redis cost doubles because counter cardinality is much higher than expected. Which counters can you approximate, aggregate, or evict without weakening important limits?',
        expectedMitigations: [
          'TTL every counter aggressively',
          'avoid per-endpoint counters for low-risk endpoints',
          'use approximate or local pre-limit for noisy low-value traffic',
          'keep exact counters for security-sensitive endpoints',
        ],
        redFlags: [
          'keeps all counters forever',
          'no differentiation by endpoint risk',
          'no memory cardinality estimate',
        ],
      },
    ],
    probeBank: [
      {
        id: 'probe_rate_algorithm',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Compare fixed window vs sliding window counter — what are the edge cases at window boundaries?',
        expectedSignals: [
          'fixed window boundary burst',
          'sliding window smooths burst',
          'hybrid counter approach',
        ],
        redFlags: [
          'no mention of boundary burst',
          'fixed window presented as accurate',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If limit is 10 req/min and user sends 10 at 00:59 and 10 at 01:01, what does fixed window allow?',
          },
        ],
      },
      {
        id: 'probe_token_bucket_burst',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'If an endpoint allows 100 req/minute but should allow short bursts, how would token bucket behavior differ from a sliding window counter?',
        expectedSignals: [
          'token bucket has refill rate and bucket capacity',
          'burst size is bounded by bucket capacity',
          'steady-state rate stays near configured limit',
          'sliding window smooths count but does not model refill credits the same way',
        ],
        redFlags: [
          'unbounded bursts',
          'confuses refill rate with total quota',
          'no explanation of burst capacity',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What two numbers would you configure for a token bucket to express average rate and max burst?',
          },
        ],
      },
      {
        id: 'probe_rate_distributed',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'You have 10 rate limiter nodes sharing one Redis cluster. What happens to counter accuracy when two nodes process requests for the same user simultaneously?',
        expectedSignals: [
          'Redis atomic INCR',
          'race condition minimal with atomic ops',
          'acceptable slight over-counting',
        ],
        redFlags: [
          'counters inconsistent without atomic ops',
          'no distributed counter strategy',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Trade-off between a single Redis node (accurate) and a Redis cluster (scalable but eventually consistent)?',
          },
        ],
      },
      {
        id: 'probe_atomic_counter_ttl',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'In Redis, how do you ensure incrementing a counter and setting its TTL are atomic for a new rate-limit window?',
        expectedSignals: [
          'use Lua script or Redis transaction',
          'INCR and EXPIRE must not be separated unsafely',
          'set TTL only when counter is first created',
          'handle retries idempotently enough for rate limiting',
        ],
        redFlags: [
          'INCR then EXPIRE with crash gap',
          'counter can live forever',
          'no atomicity story',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the process crashes after INCR but before EXPIRE?',
          },
        ],
      },
      {
        id: 'probe_rules_control_plane',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'database', 'cache'],
        primaryQuestionTemplate:
          'Rules can change while traffic is flowing. How do you separate the rules control plane from the hot request path?',
        expectedSignals: [
          'local rules cache on rate limiter nodes',
          'rules service/database outside critical request path',
          'versioned rules or cache invalidation',
          'last-known-good config and stale-age monitoring',
        ],
        redFlags: [
          'database lookup for every request',
          'no rule versioning',
          'no behavior when rules service is down',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How stale can rules be before it becomes unsafe, and how would you alert on that?',
          },
        ],
      },
      {
        id: 'probe_fail_open_closed',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'When Redis is unavailable, which endpoints should fail-open and which should fail-closed? What is the user and security impact?',
        expectedSignals: [
          'general APIs usually fail-open to preserve availability',
          'security-sensitive endpoints may fail-closed or use strict local limits',
          'alerting and degraded-mode metrics',
          'bounded local emergency limiter',
        ],
        redFlags: [
          'same behavior for every endpoint',
          'blocks all traffic during cache outage',
          'no degraded-mode monitoring',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How would your answer change for login attempts versus read-only product catalog APIs?',
          },
        ],
      },
      {
        id: 'probe_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'cache', 'queue'],
        primaryQuestionTemplate:
          'What metrics and logs would you expose to know the rate limiter is protecting the backend without harming good clients?',
        expectedSignals: [
          'allowed vs rejected request rate by key and endpoint',
          'Redis latency/error rate',
          'rule cache hit rate and stale age',
          'top throttled customers/endpoints',
          'false positive or customer support signal',
        ],
        redFlags: [
          'only logs rejected requests',
          'no per-customer visibility',
          'no dependency latency metrics',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which single dashboard would you check first if a major customer reports unexpected 429s?',
          },
        ],
      },
      {
        id: 'probe_multi_region_quota',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'If traffic is served from three regions, how would you enforce a global customer limit without synchronously writing one global counter on every request?',
        expectedSignals: [
          'regional quota allocation or leasing',
          'asynchronous reconciliation',
          'bounded over-allowing',
          'avoid cross-region latency in hot path',
        ],
        redFlags: [
          'global synchronous counter for every request',
          'ignores cross-region latency',
          'claims exact global enforcement with no tradeoff',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What is the maximum over-allowing you would tolerate before tightening regional quotas?',
          },
        ],
      },
    ],
  },

  // ─── 10. Chat System ──────────────────────────────────────────────────────
  'Design a Real-time Chat System (WhatsApp)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: '500 million daily active users.',
          discloseWhen: ['users', 'dau', 'scale', 'how many'],
        },
        {
          dimension: 'scale',
          key: 'messages',
          answer:
            'About 100 billion messages per day — roughly 1 million per second average.',
          discloseWhen: ['messages', 'volume', 'per day', 'throughput', 'qps'],
        },
        {
          dimension: 'scope',
          key: 'features',
          answer:
            '1-to-1 messaging, group chats (up to 1,000 members), online presence, read receipts, media sharing.',
          discloseWhen: ['features', 'scope', 'group', 'what', 'use cases'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Message delivery under 100ms for online users.',
          discloseWhen: ['latency', 'delivery', 'p99', 'fast', 'real-time'],
        },
        {
          dimension: 'nfr',
          key: 'durability',
          answer:
            'Messages must not be lost — at-least-once delivery required.',
          discloseWhen: [
            'lost',
            'durability',
            'reliability',
            'at least once',
            'guarantee',
          ],
        },
        {
          dimension: 'data',
          key: 'retention',
          answer: 'Messages stored for 7 years. Media stored for 3 years.',
          discloseWhen: ['retention', 'how long', 'history', 'storage'],
        },
        {
          dimension: 'non_goal',
          key: 'e2e_encryption',
          answer:
            'End-to-end encryption design is out of scope for this session.',
          discloseWhen: ['encryption', 'security', 'e2e', 'end to end'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'send_message_online',
        name: 'Send message to online user',
        description:
          'Sender sends message → chat service → Kafka → WebSocket server → recipient client',
        expectedNodeSequence: [
          'client',
          'lb',
          'ws_servers',
          'chat_service',
          'mq',
          'cassandra',
          'ws_servers',
          'client',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'send_message_offline',
        name: 'Send message to offline user',
        description:
          'Sender sends message → stored → push notification sent to offline user',
        expectedNodeSequence: [
          'client',
          'lb',
          'ws_servers',
          'chat_service',
          'cassandra',
          'mq',
          'push_service',
          'apns_fcm',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_group_fanout',
        type: 'scale_spike',
        scenarioTemplate:
          'A group chat has 1,000 members. When one person sends a message, you must deliver it to 999 recipients. What is your fan-out strategy — push or pull?',
        expectedMitigations: [
          'push to online members',
          'pull inbox pattern for offline',
          'group message pointer not copy',
        ],
        redFlags: [
          '999 writes per message',
          'no distinction online vs offline',
        ],
      },
      {
        id: 'curve_offline_sync',
        type: 'failure',
        scenarioTemplate:
          'User A sends a message, goes offline, reconnects 2 hours later. How do you guarantee no messages are lost and no duplicates appear when syncing?',
        expectedMitigations: [
          'sequence id per conversation',
          'client sends last seen seq',
          'delta sync on reconnect',
        ],
        redFlags: ['no sequence tracking', 'no idempotency on sync'],
      },
    ],
    probeBank: [
      {
        id: 'probe_chat_delivery',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'Kafka guarantees at-least-once delivery. How do you ensure messages are not duplicated on the client when a consumer retries?',
        expectedSignals: [
          'idempotency key',
          'message deduplication on client',
          'dedup window',
        ],
        redFlags: ['no deduplication', 'duplicates shown to user'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk me through the exact deduplication mechanism from Kafka consumer to the client app.',
          },
        ],
      },
      {
        id: 'probe_chat_presence',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'With 500M users, your presence service receives a heartbeat every 30 seconds. That is roughly 17 million heartbeats per second. How does it scale?',
        expectedSignals: [
          'Redis TTL for presence',
          'gossip protocol',
          'sharded presence service',
        ],
        redFlags: ['central presence DB', 'no TTL-based expiry'],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'At 17M heartbeats/sec, how many Redis writes per second does this generate, and can one cluster handle it?',
          },
        ],
      },
    ],
  },

  // ─── 11. Ride-sharing ─────────────────────────────────────────────────────
  'Design a Ride-sharing Service (Uber)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer:
            '30 million daily active users — riders and drivers combined.',
          discloseWhen: ['users', 'dau', 'scale', 'how many'],
        },
        {
          dimension: 'scale',
          key: 'location_updates',
          answer: 'Up to 2 million driver location updates per second.',
          discloseWhen: [
            'location',
            'updates',
            'throughput',
            'gps',
            'frequency',
          ],
        },
        {
          dimension: 'scope',
          key: 'features',
          answer:
            'Ride request, driver matching, live GPS tracking, ride lifecycle management.',
          discloseWhen: ['features', 'scope', 'use cases', 'what'],
        },
        {
          dimension: 'nfr',
          key: 'match_latency',
          answer: 'Driver match must complete in under 500ms.',
          discloseWhen: ['latency', 'match time', 'p99', 'fast', 'response'],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer: '99.99% uptime — a failure during peak hours is very costly.',
          discloseWhen: ['availability', 'uptime', 'reliability', 'sla'],
        },
        {
          dimension: 'non_goal',
          key: 'surge_pricing',
          answer: 'Surge pricing calculation is out of scope.',
          discloseWhen: ['pricing', 'surge', 'dynamic pricing', 'fare'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'ride_request',
        name: 'Rider requests ride',
        description:
          'Rider requests → Kafka queues ride request → matching service finds nearby drivers → locks driver → notifies',
        expectedNodeSequence: [
          'rider_client',
          'api_gateway',
          'ride_service',
          'kafka',
          'matching_service',
          'redis_geo',
          'redis_lock',
          'notification_service',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'driver_location',
        name: 'Driver location update',
        description:
          'Driver app sends GPS every 5 seconds → location service → Redis GEOADD',
        expectedNodeSequence: [
          'driver_client',
          'api_gateway',
          'location_service',
          'redis_geo',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_event_spike',
        type: 'scale_spike',
        scenarioTemplate:
          'A major event just ended — 100,000 riders simultaneously request rides from the same location in 60 seconds. Where does your matching service bottleneck?',
        expectedMitigations: [
          'Redis GEOSEARCH sharding by geohash',
          'horizontal Kafka consumer scaling',
          'exponential backoff on lock contention',
        ],
        redFlags: [
          'single Redis node for geospatial',
          'no lock contention handling',
        ],
      },
      {
        id: 'curve_driver_crash',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'Driver A is locked for a ride request but their app crashes before accepting or declining. The TTL lock expires in 10 seconds. Rider waits — is this acceptable, and how do you improve it?',
        expectedMitigations: [
          'delay queue to advance to next driver on TTL expiry',
          'durable workflow for state persistence',
        ],
        redFlags: [
          'rider waits indefinitely',
          'no automatic advancement on timeout',
        ],
      },
    ],
    probeBank: [
      {
        id: 'probe_uber_matching',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Walk me through the exact sequence of steps from ride request to driver notification — how do you achieve under 500ms end-to-end?',
        expectedSignals: [
          'geospatial query in Redis',
          'distributed lock for driver',
          'async notification',
        ],
        redFlags: [
          'synchronous DB query for nearby drivers',
          'polling instead of push notification',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'At which step do you do the geospatial query, and how does Redis GEOSEARCH perform at 2M location updates/sec?',
          },
        ],
      },
      {
        id: 'probe_uber_consistency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'You use a distributed Redis lock for driver assignment. What happens if the lock expires between the matching service acquiring it and updating the ride status in SQL?',
        expectedSignals: [
          'lock TTL longer than operation',
          'idempotent status update',
          'compensating transaction',
        ],
        redFlags: ['no TTL strategy', 'no idempotency on status update'],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How long should the lock TTL be, given matching + notification + driver acceptance can take up to 10 seconds?',
          },
        ],
      },
    ],
  },

  // ─── 12. File Storage & Sync ──────────────────────────────────────────────
  'Design a File Storage & Sync Service (Dropbox)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer: '50 million daily active users.',
          discloseWhen: ['users', 'dau', 'scale', 'how many'],
        },
        {
          dimension: 'scale',
          key: 'qps',
          answer: 'About 10,000 metadata operations per second.',
          discloseWhen: ['qps', 'throughput', 'operations', 'requests'],
        },
        {
          dimension: 'scope',
          key: 'file_size',
          answer: 'Files up to 1 GB. Videos and large files are supported.',
          discloseWhen: ['file size', 'max size', 'large files', 'limit'],
        },
        {
          dimension: 'nfr',
          key: 'sync_latency',
          answer:
            'File changes should appear on all devices within 30 seconds.',
          discloseWhen: ['sync', 'latency', 'how fast', 'propagation', 'delay'],
        },
        {
          dimension: 'nfr',
          key: 'durability',
          answer: '99.99999999% durability — files must never be lost.',
          discloseWhen: ['durability', 'lost', 'reliability', 'backup'],
        },
        {
          dimension: 'non_goal',
          key: 'realtime_collab',
          answer: 'Real-time collaborative editing is out of scope.',
          discloseWhen: [
            'collaborative',
            'real-time editing',
            'google docs',
            'simultaneous edit',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'file_upload',
        name: 'File upload',
        description:
          'Client requests presigned URL → uploads chunks directly to S3 → S3 notifies service → metadata updated',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'file_service',
          's3',
          'metadata_db',
          'notify_queue',
          'ws_server',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'file_download',
        name: 'File download',
        description: 'Client requests file → served from CDN',
        expectedNodeSequence: ['client', 'cdn', 's3'],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_conflict',
        type: 'constraint_change',
        scenarioTemplate:
          'User A and User B both edit the same file offline on different devices, then both sync. How does your conflict resolution work?',
        expectedMitigations: [
          'last write wins',
          'conflicted copy creation',
          'notify user of conflict',
        ],
        redFlags: ['silently overwrites', 'no conflict detection'],
      },
      {
        id: 'curve_resumable',
        type: 'failure',
        scenarioTemplate:
          'A 50 GB upload disconnects at 80% completion. How does resumable upload work, and what happens to the partial upload in S3 if it is never completed?',
        expectedMitigations: [
          'S3 multipart upload ETags',
          'client tracks uploaded chunks',
          'lifecycle rule abort incomplete',
        ],
        redFlags: [
          'restart from zero',
          'no lifecycle rule on incomplete multipart',
        ],
      },
    ],
    probeBank: [
      {
        id: 'probe_dropbox_sync',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'A user has 3 devices. When they upload a file on device A, how do devices B and C learn about the change and sync within 30 seconds?',
        expectedSignals: [
          'WebSocket push to connected devices',
          'polling fallback',
          'notification queue fan-out',
        ],
        redFlags: ['polling only', 'no push mechanism'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If device B has no WebSocket connection, how does it find out about the file change?',
          },
        ],
      },
      {
        id: 'probe_dropbox_chunking',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['storage', 'service'],
        primaryQuestionTemplate:
          'You split files into chunks for multipart upload. What is the optimal chunk size, and how does chunking improve resumability?',
        expectedSignals: [
          '5-10 MB chunk size',
          'only re-upload failed chunks',
          'parallel chunk upload',
        ],
        redFlags: ['single stream upload', 'no parallel chunks'],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'For a 50 GB file with 10 MB chunks, how many parallel uploads can you run, and what is the theoretical upload time?',
          },
        ],
      },
    ],
  },

  // ─── 13. Video Streaming ──────────────────────────────────────────────────
  'Design a Video Streaming Platform (YouTube)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer:
            '100 million daily active users, 1 million peak streaming QPS.',
          discloseWhen: ['users', 'dau', 'scale', 'how many', 'viewers'],
        },
        {
          dimension: 'scale',
          key: 'uploads',
          answer: '500 hours of video uploaded every minute.',
          discloseWhen: [
            'uploads',
            'upload rate',
            'content',
            'per minute',
            'ingestion',
          ],
        },
        {
          dimension: 'scope',
          key: 'resolutions',
          answer:
            'Multiple resolutions: 240p through 4K. Adaptive bitrate streaming.',
          discloseWhen: [
            'resolution',
            'quality',
            'bitrate',
            'adaptive',
            '4k',
            '1080p',
          ],
        },
        {
          dimension: 'nfr',
          key: 'time_to_play',
          answer:
            'Video should be available to stream within 5 minutes of upload.',
          discloseWhen: [
            'available',
            'process',
            'time to',
            'how fast',
            'playable',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'First frame under 500ms from play button click.',
          discloseWhen: [
            'start',
            'first frame',
            'playback latency',
            'buffering',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'live_streaming',
          answer: 'Live streaming is out of scope — recorded video only.',
          discloseWhen: ['live', 'real-time streaming', 'live stream'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'video_upload',
        name: 'Video upload and transcoding',
        description:
          'Creator uploads raw video → S3 → Kafka job → transcoding workers → HLS segments → CDN',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'upload_service',
          's3_raw',
          'mq',
          'transcode_workers',
          's3_processed',
          'cdn',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'video_playback',
        name: 'Video playback',
        description:
          'Viewer clicks play → CDN serves HLS manifest → adaptive streaming',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'metadata_db',
          'cdn',
          's3_processed',
        ],
        required: true,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_viral_video',
        type: 'scale_spike',
        targetNodeType: 'cdn',
        scenarioTemplate:
          'A video goes viral — 10 million simultaneous viewers. CDN cache miss rate is 1%, hitting S3 origin with 100K req/sec. Can S3 handle it?',
        expectedMitigations: [
          'CDN origin shield',
          'pre-warm CDN',
          'S3 auto-scales but cost spikes',
        ],
        redFlags: ['no origin shield', 'no pre-warm strategy'],
      },
      {
        id: 'curve_slow_transcode',
        type: 'constraint_change',
        scenarioTemplate:
          'Transcoding a 2-hour 4K video takes 3 hours. Creators want the video playable within 5 minutes. How do you reduce time-to-playable?',
        expectedMitigations: [
          'progressive transcoding lower quality first',
          'parallel segment transcoding',
          'available after first segment ready',
        ],
        redFlags: [
          'wait for all resolutions before publishing',
          'single sequential transcode',
        ],
      },
    ],
    probeBank: [
      {
        id: 'probe_video_transcode',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['worker', 'queue'],
        primaryQuestionTemplate:
          'At 500 hours of video uploaded per minute, how many transcoding workers do you need, and how do you scale the pipeline?',
        expectedSignals: [
          'parallel workers',
          'autoscaling',
          'segment-level parallelism',
        ],
        redFlags: ['single transcoding queue', 'no autoscaling'],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If 1 worker transcodes 1 minute of 1080p video in 30 seconds, how many workers for 500 hours/minute?',
          },
        ],
      },
      {
        id: 'probe_video_cdn',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cdn', 'storage'],
        primaryQuestionTemplate:
          'How does adaptive bitrate (ABR) streaming work, and how does your CDN handle a viewer switching from WiFi to mobile mid-stream?',
        expectedSignals: [
          'HLS manifest',
          'multiple bitrate segments',
          'player chooses quality based on bandwidth',
        ],
        redFlags: ['single bitrate stream', 'no adaptive streaming'],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk me through the HLS manifest structure and how the player decides which segment to download next.',
          },
        ],
      },
    ],
  },

  // ─── 14. Search Autocomplete ──────────────────────────────────────────────
  'Design Search Autocomplete (Typeahead)': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'dau',
          answer:
            '100 million daily active users, 100,000 autocomplete queries per second.',
          discloseWhen: ['users', 'dau', 'scale', 'qps', 'how many'],
        },
        {
          dimension: 'scope',
          key: 'suggestions',
          answer:
            'Return top-5 suggestions for any prefix, ranked by query frequency.',
          discloseWhen: [
            'how many',
            'suggestions',
            'top k',
            'ranking',
            'results',
          ],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer: 'Suggestions must appear in under 100ms.',
          discloseWhen: ['latency', 'response time', 'p99', 'fast', '100ms'],
        },
        {
          dimension: 'nfr',
          key: 'freshness',
          answer:
            'Trending queries should appear in suggestions within a few hours.',
          discloseWhen: [
            'trending',
            'fresh',
            'new queries',
            'update frequency',
            'how often',
          ],
        },
        {
          dimension: 'data',
          key: 'trie_size',
          answer:
            'Top 1 billion queries stored — approximately 100 GB compressed trie.',
          discloseWhen: ['storage', 'trie size', 'how much', 'gb'],
        },
        {
          dimension: 'non_goal',
          key: 'personalization',
          answer:
            'Personalized suggestions are out of scope — global frequency only.',
          discloseWhen: [
            'personalization',
            'user-specific',
            'history',
            'personalized',
          ],
        },
      ],
    },
    flowPaths: [
      {
        id: 'suggestion_request',
        name: 'Autocomplete suggestion request',
        description:
          'User types → debounced GET → cache lookup → trie traversal if miss → return top-5',
        expectedNodeSequence: [
          'client',
          'lb',
          'suggestion_api',
          'trie_cache',
          'trie_service',
          'trie_db',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'trie_update',
        name: 'Trie update (batch)',
        description:
          'Search logs → Kafka → aggregation workers → update frequency DB → rebuild trie',
        expectedNodeSequence: [
          'log_collector',
          'mq',
          'agg_workers',
          'freq_db',
          'trie_service',
          'trie_db',
        ],
        required: false,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_trending_term',
        type: 'scale_spike',
        scenarioTemplate:
          '"Covid" appears for the first time — it goes from 0 to 50 million queries in 1 hour. Your batch trie rebuild takes 1 hour. How do you surface trending terms in real time?',
        expectedMitigations: [
          'stream processing alongside batch',
          'Redis sorted set for real-time top-K',
          'blend real-time and batch results',
        ],
        redFlags: [
          'batch-only no real-time path',
          'wait for next batch rebuild',
        ],
      },
      {
        id: 'curve_hotspot_prefix',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'Your trie is sharded by prefix range. The prefix "a" serves 26% of all queries, creating a hotspot on shard 1. How do you fix this?',
        expectedMitigations: [
          'shard by popularity not alphabet',
          'replicate hot prefixes',
          'Redis sorted set for top prefixes',
        ],
        redFlags: ['no rebalancing strategy', 'keep alphabetical sharding'],
      },
    ],
    probeBank: [
      {
        id: 'probe_autocomplete_trie',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'Walk me through the trie data structure — how do you store top-K suggestions per prefix node to achieve O(1) lookup?',
        expectedSignals: [
          'precomputed top-K at each prefix node',
          'cache complete result not just trie node',
          'Redis sorted set alternative',
        ],
        redFlags: [
          'traverse to all leaf nodes at query time',
          'no precomputed top-K',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Without precomputed top-K, how many nodes must you visit for prefix "ap" with branching factor 26?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_scale',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'At 100K QPS with 100GB trie, how do you serve suggestions with under 100ms latency?',
        expectedSignals: [
          'trie in Redis',
          'cache complete prefix results',
          '99% cache hit rate for common prefixes',
        ],
        redFlags: ['no caching', 'trie on disk only'],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What cache hit rate do you expect for prefixes of length 1-3, and why?',
          },
        ],
      },
    ],
  },

  // ─── 15. Notification System ──────────────────────────────────────────────
  'Design a Scalable Notification System': {
    clarificationData: {
      facts: [
        {
          dimension: 'scale',
          key: 'volume',
          answer:
            'Over 1 billion notifications per day — about 50,000 per second at peak.',
          discloseWhen: ['volume', 'scale', 'per day', 'how many', 'qps'],
        },
        {
          dimension: 'scope',
          key: 'channels',
          answer:
            'iOS push (APNs), Android push (FCM), email (SES), SMS (Twilio).',
          discloseWhen: ['channels', 'types', 'push', 'email', 'sms', 'scope'],
        },
        {
          dimension: 'nfr',
          key: 'latency',
          answer:
            'End-to-end delivery under 5 seconds for critical notifications (e.g., OTPs).',
          discloseWhen: [
            'latency',
            'delivery time',
            'how fast',
            'p99',
            'critical',
          ],
        },
        {
          dimension: 'nfr',
          key: 'durability',
          answer:
            'Notifications must be delivered at least once — no silent drops.',
          discloseWhen: [
            'lost',
            'at least once',
            'reliability',
            'durability',
            'guarantee',
          ],
        },
        {
          dimension: 'data',
          key: 'retention',
          answer: 'Notification logs kept for 90 days for audit and debugging.',
          discloseWhen: ['logs', 'audit', 'history', 'retention', 'storage'],
        },
        {
          dimension: 'non_goal',
          key: 'two_way',
          answer:
            'Reply or two-way messaging via notification is out of scope.',
          discloseWhen: ['reply', 'two-way', 'response', 'interactive'],
        },
      ],
    },
    flowPaths: [
      {
        id: 'notification_delivery',
        name: 'Notification delivery (push)',
        description:
          'Trigger event → Kafka → router checks preferences → workers deliver via APNs/FCM → log result',
        expectedNodeSequence: [
          'api_server',
          'kafka',
          'router',
          'preference_db',
          'device_token_db',
          'ios_worker',
          'apns',
          'log_db',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'email_delivery',
        name: 'Email notification',
        description: 'Router routes email event → email worker → email gateway',
        expectedNodeSequence: [
          'kafka',
          'router',
          'template_service',
          'email_worker',
          'email_gateway',
        ],
        required: false,
        priority: 2,
      },
    ],
    curveballs: [
      {
        id: 'curve_apns_ratelimit',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'APNs returns 429 when you batch-send to 10M iOS users in 5 minutes. How do you retry without getting blacklisted by Apple?',
        expectedMitigations: [
          'exponential backoff with jitter',
          'priority queue for critical notifications',
          'APNs HTTP/2 connection pooling',
          'rate limit before hitting APNs',
        ],
        redFlags: ['immediate full retry', 'no backoff', 'single connection'],
      },
      {
        id: 'curve_duplicate_notify',
        type: 'failure',
        scenarioTemplate:
          'A user receives the same notification 3 times. Trace the root cause through your pipeline and explain where deduplication must live.',
        expectedMitigations: [
          'idempotency key in Redis',
          'unique constraint on notification_id + device_token',
          'Kafka at-least-once dedup at consumer',
        ],
        redFlags: [
          'no deduplication layer',
          'Kafka assumed exactly-once without explicit dedup',
        ],
      },
    ],
    probeBank: [
      {
        id: 'probe_notification_priority',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'A marketing blast and an OTP notification arrive simultaneously. How do you guarantee the OTP is delivered first?',
        expectedSignals: [
          'priority queue or separate queues',
          'OTP on high-priority lane',
          'marketing on low-priority lane',
        ],
        redFlags: [
          'single FIFO queue for all types',
          'no priority differentiation',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How do you prevent marketing bursts from starving OTP notifications in a shared queue?',
          },
        ],
      },
      {
        id: 'probe_notification_idempotency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Kafka guarantees at-least-once delivery. How do you prevent a notification from being sent twice to APNs when your consumer retries?',
        expectedSignals: [
          'idempotency key stored in Redis with TTL',
          'check before send',
          'log_db dedup on write',
        ],
        redFlags: ['no idempotency check', 'send and hope APNs deduplicates'],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What is the TTL on your idempotency key in Redis, and what happens after it expires?',
          },
        ],
      },
    ],
  },
};
