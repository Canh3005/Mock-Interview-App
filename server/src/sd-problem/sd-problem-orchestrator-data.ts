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
          answer: 'We expect about 1 million daily active users.',
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
          answer:
            'Real-time click analytics dashboards are out of scope for v1; redirect logs may be emitted asynchronously for debugging and abuse monitoring.',
          discloseWhen: [
            'analytics',
            'click tracking',
            'statistics',
            'metrics',
          ],
        },
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support creating short links, resolving short links to destination URLs, and optionally storing Pastebin-style text snippets behind generated IDs.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'what should it do',
            'scope',
            'pastebin',
            'bitly',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
            'phạm vi',
          ],
        },
        {
          dimension: 'scope',
          key: 'redirect_contract',
          answer:
            'A redirect response must include Location. Use 301 for immutable permanent links; use 302/307 when the target may change, experiments are needed, or method preservation matters.',
          discloseWhen: [
            '301',
            '302',
            '307',
            'redirect code',
            'http status',
            'location header',
            'permanent',
            'temporary',
            'mã redirect',
            'trả về gì',
            'chuyển hướng',
          ],
        },
        {
          dimension: 'scope',
          key: 'paste_content',
          answer:
            'Pastebin mode stores paste metadata in the database and larger text bodies in object storage; max paste size should be capped, for example 1 MB for v1.',
          discloseWhen: [
            'paste',
            'pastebin',
            'text snippet',
            'content',
            'object storage',
            'large text',
            'kích thước paste',
            'lưu nội dung',
          ],
        },
        {
          dimension: 'constraints',
          key: 'url_validation',
          answer:
            'Only http and https destination URLs are accepted. Normalize scheme/host case, remove fragments, validate malformed URLs, and avoid javascript/file/data schemes.',
          discloseWhen: [
            'validate',
            'normalization',
            'canonical',
            'malformed',
            'javascript',
            'scheme',
            'security',
            'chuẩn hóa url',
            'kiểm tra url',
            'bảo mật',
          ],
        },
        {
          dimension: 'constraints',
          key: 'id_generation',
          answer:
            'Generate a unique numeric ID from a DB sequence, KGS, or Snowflake-style generator and encode it as Base62. Seven Base62 characters provide about 3.5 trillion possible IDs.',
          discloseWhen: [
            'id generation',
            'short code',
            'base62',
            'snowflake',
            'key generation',
            'collision',
            'slug',
            'tạo id',
            'tạo mã',
            'trùng mã',
          ],
        },
        {
          dimension: 'constraints',
          key: 'custom_alias_policy',
          answer:
            'Custom aliases need a reserved-word list, case-sensitivity decision, unique constraint, ownership checks, and rate limits to prevent namespace squatting.',
          discloseWhen: [
            'custom alias',
            'vanity',
            'reserved',
            'namespace',
            'squatting',
            'case sensitive',
            'alias tự chọn',
            'slug tự chọn',
            'giữ tên',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Redirects are the critical read path and should remain available even if analytics, abuse scanning, or async logging is degraded.',
          discloseWhen: [
            'availability',
            'reliability',
            'outage',
            'dependency down',
            'degraded',
            'khả dụng',
            'sự cố',
            'phụ thuộc lỗi',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Create-then-immediate-redirect should be read-your-writes: either populate cache on write, read from primary briefly, or route the first lookup away from stale replicas.',
          discloseWhen: [
            'consistency',
            'replica lag',
            'read your writes',
            'immediate redirect',
            'stale',
            'nhất quán',
            'replica chậm',
            'vừa tạo xong',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core tables: short_code, destination_url or paste_object_key, creator_id, created_at, expires_at, status, redirect_type, and optional custom_alias_owner.',
          discloseWhen: [
            'schema',
            'data model',
            'table',
            'columns',
            'metadata',
            'mô hình dữ liệu',
            'bảng',
            'cột',
          ],
        },
        {
          dimension: 'data',
          key: 'capacity_math',
          answer:
            'At roughly 40 writes/sec, the system creates about 3.5 million new mappings/day and about 3.8 billion mappings over 3 years; 450 GB is plausible for compact metadata plus indexes.',
          discloseWhen: [
            'capacity',
            'storage math',
            'writes per day',
            'how many urls',
            'estimate',
            'tính dung lượng',
            'ước lượng',
            'bao nhiêu url',
          ],
        },
        {
          dimension: 'constraints',
          key: 'cache_policy',
          answer:
            'Cache hot short-code mappings with TTL, negative-cache missing slugs briefly, and actively evict cache entries when a link expires, is deleted, or changes destination.',
          discloseWhen: [
            'cache ttl',
            'negative cache',
            'cache invalidation',
            'delete',
            'expire',
            'hot url',
            'ttl',
            'xóa cache',
            'cache miss',
          ],
        },
        {
          dimension: 'constraints',
          key: 'deployment',
          answer:
            'V1 can be single-region with read replicas and cache; multi-region active-active redirects require either regional ID ranges or globally unique ID generation and async replication.',
          discloseWhen: [
            'multi region',
            'regions',
            'global',
            'data center',
            'replication',
            'đa vùng',
            'toàn cầu',
            'triển khai',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'private_acl',
          answer:
            'Private access-control, password-protected pastes, payments, and advanced malware classification are out of scope for v1.',
          discloseWhen: [
            'private',
            'password',
            'acl',
            'permission',
            'billing',
            'malware',
            'riêng tư',
            'mật khẩu',
            'phân quyền',
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
      {
        id: 'redirect_cache_hit',
        name: 'Redirect cache hit',
        description:
          'User opens short URL -> read API resolves mapping from cache -> returns redirect without hitting the database',
        expectedNodeSequence: ['client', 'dns', 'lb', 'read_api', 'cache'],
        required: false,
        priority: 3,
      },
      {
        id: 'redirect_cache_miss',
        name: 'Redirect cache miss',
        description:
          'Short URL is not cached -> read API loads from replica -> populates cache -> returns redirect',
        expectedNodeSequence: [
          'client',
          'dns',
          'lb',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'paste_creation',
        name: 'Paste creation',
        description:
          'User submits paste text -> large content stored in object storage -> metadata stored in SQL -> paste ID returned',
        expectedNodeSequence: [
          'client',
          'lb',
          'write_api',
          'object_store',
          'sql_master',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'expired_or_deleted_link',
        name: 'Expired or deleted link',
        description:
          'Read API detects expired/deleted mapping -> evicts cache -> returns 404 or 410 instead of redirecting',
        expectedNodeSequence: [
          'client',
          'lb',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'async_redirect_log',
        name: 'Async redirect log',
        description:
          'Redirect path emits lightweight click or abuse event asynchronously so logging cannot slow down redirects',
        expectedNodeSequence: ['read_api', 'mapreduce', 'analytics_db'],
        required: false,
        priority: 7,
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
      {
        id: 'curve_stale_redirect_cache',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A customer deletes or expires a short link, but a hot cache entry keeps redirecting users for another hour. How do you prevent stale or unsafe redirects?',
        expectedMitigations: [
          'short TTL with active invalidation',
          'status/version field checked on cache fill',
          'delete writes invalidate cache before acknowledging',
          'use 410 for known deleted links',
        ],
        redFlags: [
          'cache never expires',
          'delete only updates database',
          'no tombstone or status field',
        ],
      },
      {
        id: 'curve_slug_enumeration',
        type: 'scale_spike',
        targetNodeType: 'service',
        scenarioTemplate:
          'Attackers enumerate sequential short codes and scrape private-looking pastes. What changes in key generation and access policy reduce this risk?',
        expectedMitigations: [
          'non-sequential public slug or random suffix',
          'unguessable paste IDs for unlisted content',
          'rate limit enumeration by IP or API key',
          'abuse monitoring and takedown workflow',
        ],
        redFlags: [
          'sequential IDs exposed directly',
          'assumes unlisted means private',
          'no abuse detection',
        ],
      },
      {
        id: 'curve_id_generator_collision',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'Two ID generator workers produce the same short code during a deployment or clock rollback. Where is the final collision guard?',
        expectedMitigations: [
          'database unique constraint',
          'retry on duplicate key',
          'worker ID lease or sequence allocation',
          'clock rollback detection for time-based IDs',
        ],
        redFlags: [
          'trusts generator without DB constraint',
          'no retry path',
          'no clock rollback handling',
        ],
      },
      {
        id: 'curve_replica_lag_after_create',
        type: 'dependency_outage',
        targetNodeType: 'database',
        scenarioTemplate:
          'A user creates a link and immediately shares it, but read replicas are 3 seconds behind and followers see 404. How do you provide read-your-writes?',
        expectedMitigations: [
          'write-through cache on create',
          'read from primary for fresh links',
          'sticky routing or freshness token',
          'short negative-cache TTL',
        ],
        redFlags: [
          'negative-caches 404 for long TTL',
          'ignores replica lag',
          'requires synchronous replication for every read',
        ],
      },
      {
        id: 'curve_large_paste_cost',
        type: 'cost_pressure',
        targetNodeType: 'storage',
        scenarioTemplate:
          'Users start uploading maximum-size pastes and storage cost grows 10x. Which limits or storage-tier choices do you add without hurting normal short-link redirects?',
        expectedMitigations: [
          'hard max paste size',
          'compress text bodies',
          'store large bodies in object storage',
          'separate URL metadata from paste content',
          'retention or expiry policy for anonymous pastes',
        ],
        redFlags: [
          'stores large paste bodies inline in SQL rows',
          'no quota or expiry',
          'redirect path depends on object storage',
        ],
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
      {
        id: 'probe_url_redirect_status',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['service'],
        primaryQuestionTemplate:
          'Would your redirect endpoint return 301, 302, 307, or 308? Explain the browser caching and mutability trade-off.',
        expectedSignals: [
          '301/308 for permanent immutable redirect',
          '302/307 for temporary or mutable redirect',
          'Location header contract',
          'browser or intermediary caching impact',
        ],
        redFlags: [
          'does not know redirect status semantics',
          'uses permanent redirects for mutable links',
          'no Location header mentioned',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If customers can edit the destination URL later, why might a permanent redirect be dangerous?',
          },
        ],
      },
      {
        id: 'probe_url_data_model_expiry',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'Design the schema for short links and pastes, including expiry, deletion, redirect type, custom alias ownership, and cache invalidation.',
        expectedSignals: [
          'short_code unique key',
          'destination URL or object key separation',
          'expires_at and status/tombstone',
          'custom alias owner and reserved namespace',
        ],
        redFlags: [
          'no expiry/status field',
          'stores large paste text inline with hot redirect metadata',
          'no unique constraint on slug',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What exact row changes when a link expires, and how does the cache learn about it?',
          },
        ],
      },
      {
        id: 'probe_url_abuse_security',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'URL shorteners are often abused for phishing or enumeration. What protections belong in v1 without turning this into a full WAF?',
        expectedSignals: [
          'validate destination scheme',
          'rate limit creation and custom aliases',
          'abuse reports and async scanning',
          'unguessable IDs for unlisted pastes',
        ],
        redFlags: [
          'accepts any URL scheme',
          'sequential private-looking paste IDs',
          'no takedown path',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which checks must be synchronous before creation, and which can run asynchronously after the link exists?',
          },
        ],
      },
      {
        id: 'probe_url_cache_invalidation',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'A hot short link is deleted while still cached. Walk me through the invalidation, TTL, and stale-read behavior.',
        expectedSignals: [
          'delete updates durable status',
          'cache eviction or versioned cache entry',
          'bounded TTL',
          '404/410 negative cache with short TTL',
        ],
        redFlags: [
          'cache entries live forever',
          'delete only removes DB row',
          'long negative-cache TTL after creation race',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What could go wrong if a 404 is cached for 24 hours right after a successful create?',
          },
        ],
      },
      {
        id: 'probe_url_capacity_math',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'Given 40 writes/sec and 400 redirects/sec peak, estimate rows, storage, index size, and cache memory over 3 years.',
        expectedSignals: [
          'writes per day calculation',
          '3-year row estimate',
          'metadata vs content storage split',
          'cache only hot mappings',
        ],
        redFlags: [
          'no back-of-envelope math',
          'caches every historical link forever',
          'does not separate paste body storage',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If one mapping plus indexes averages 120 bytes, roughly how much storage do 3.8B mappings require?',
          },
        ],
      },
      {
        id: 'probe_url_multi_region',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['service', 'database', 'cache'],
        primaryQuestionTemplate:
          'If redirects must be served globally from multiple regions, how do ID generation, replication, cache warming, and stale deletes change?',
        expectedSignals: [
          'globally unique ID generation',
          'regional cache and read replicas',
          'async replication with bounded staleness',
          'tombstones for deletes across regions',
        ],
        redFlags: [
          'single primary region on every redirect',
          'no conflict strategy for custom aliases',
          'no delete propagation story',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Would you accept a few seconds of stale redirects globally, or pay cross-region latency for stronger consistency?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support posting tweets, reading a home timeline built from followed accounts, and searching public tweets by keyword in near real time.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'tweet',
            'timeline',
            'search',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'timeline_semantics',
          answer:
            'The base timeline is recent tweets from followed users, returned as tweet IDs plus hydrated tweet/user/media metadata. ML ranking is optional; reverse chronological is acceptable for v1.',
          discloseWhen: [
            'home timeline',
            'feed',
            'ranking',
            'chronological',
            'hydrate',
            'tweet ids',
            'news feed',
            'dòng thời gian',
            'xếp hạng',
            'thứ tự',
          ],
        },
        {
          dimension: 'scope',
          key: 'fanout_strategy',
          answer:
            'Use fan-out-on-write for normal users to precompute home timelines, but use hybrid fanout for celebrity accounts: push to active followers or pull/merge at read time.',
          discloseWhen: [
            'fanout',
            'fan-out',
            'push',
            'pull',
            'celebrity',
            'followers',
            'hot user',
            'người nổi tiếng',
            'đẩy feed',
            'kéo feed',
          ],
        },
        {
          dimension: 'scope',
          key: 'search_freshness',
          answer:
            'New tweets should become searchable within seconds; target under 10 seconds of indexing lag for normal traffic and under 30 seconds during spikes.',
          discloseWhen: [
            'search freshness',
            'indexing lag',
            'real time search',
            'search delay',
            'fresh',
            'tìm kiếm realtime',
            'độ trễ index',
            'bao lâu searchable',
          ],
        },
        {
          dimension: 'scale',
          key: 'tweet_write_rate',
          answer:
            'The prompt is read-heavy: assume timeline reads dominate tweet writes by orders of magnitude. Writes must still tolerate event bursts and celebrity fanout amplification.',
          discloseWhen: [
            'writes',
            'tweets per second',
            'post rate',
            'write qps',
            'read write ratio',
            'số tweet',
            'ghi bao nhiêu',
            'tỉ lệ đọc ghi',
          ],
        },
        {
          dimension: 'data',
          key: 'id_model',
          answer:
            'Tweet IDs should be unique and roughly time-sortable, such as Snowflake-style 64-bit IDs, so timelines and search indexes can order recent content efficiently.',
          discloseWhen: [
            'tweet id',
            'id generation',
            'snowflake',
            'ordering',
            'time sortable',
            'tạo id',
            'sắp xếp theo thời gian',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core data: tweets by tweet_id/user_id/time, follow edges, home timeline lists of tweet IDs, media object keys, search postings, and tombstones for deletes.',
          discloseWhen: [
            'schema',
            'data model',
            'tables',
            'tweet table',
            'follow graph',
            'mô hình dữ liệu',
            'bảng',
            'quan hệ follow',
          ],
        },
        {
          dimension: 'nfr',
          key: 'timeline_cache',
          answer:
            'Home timeline cache should store bounded recent tweet IDs, not full tweet bodies, then hydrate tweet/user/media metadata from cache or storage on read.',
          discloseWhen: [
            'timeline cache',
            'redis',
            'cache memory',
            'hydrate',
            'tweet cache',
            'bộ nhớ cache',
            'cache timeline',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Timelines are eventually consistent for followed users, but the author should see their own tweet immediately; deletes and protected-content changes should propagate quickly with tombstones.',
          discloseWhen: [
            'consistency',
            'eventual',
            'staleness',
            'delete',
            'own tweet',
            'unfollow',
            'nhất quán',
            'xóa tweet',
            'stale',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Timeline reads should degrade gracefully: serve cached timelines if fanout is delayed, omit ranking/search extras if needed, and avoid blocking reads on async fanout queues.',
          discloseWhen: [
            'availability',
            'degraded',
            'queue lag',
            'backpressure',
            'outage',
            'khả dụng',
            'sự cố',
            'hàng đợi chậm',
          ],
        },
        {
          dimension: 'constraints',
          key: 'search_architecture',
          answer:
            'Search should use an inverted index with a real-time write-friendly segment and optimized read-only segments; queries scatter-gather across shards and merge/rank results.',
          discloseWhen: [
            'inverted index',
            'lucene',
            'earlybird',
            'search cluster',
            'scatter gather',
            'rank',
            'reverse index',
            'chỉ mục đảo',
            'cụm search',
          ],
        },
        {
          dimension: 'constraints',
          key: 'queue_backpressure',
          answer:
            'Posting should persist the tweet first, then enqueue fanout/search-index jobs. Queue lag must be observable and bounded with retries, DLQs, and priority handling.',
          discloseWhen: [
            'queue',
            'kafka',
            'message queue',
            'backpressure',
            'retry',
            'dlq',
            'hàng đợi',
            'xử lý bất đồng bộ',
          ],
        },
        {
          dimension: 'constraints',
          key: 'media_handling',
          answer:
            'Media files are stored outside the tweet row in object storage and served through CDN; timeline/search paths carry media metadata or URLs only.',
          discloseWhen: [
            'media',
            'image',
            'video',
            'cdn',
            'object storage',
            'ảnh',
            'video',
            'lưu media',
          ],
        },
        {
          dimension: 'constraints',
          key: 'privacy_scope',
          answer:
            'Protected accounts, block/mute rules, and privacy filtering can be represented as filters, but a full privacy policy engine is out of scope for v1.',
          discloseWhen: [
            'privacy',
            'protected',
            'block',
            'mute',
            'private account',
            'riêng tư',
            'chặn',
            'ẩn',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'ml_ranking_ads',
          answer:
            'Advanced ML ranking, ads insertion, recommendations outside the follow graph, and push notifications are out of scope for this design.',
          discloseWhen: [
            'machine learning',
            'ml',
            'ranking model',
            'ads',
            'recommendation',
            'notifications',
            'quảng cáo',
            'gợi ý',
            'thông báo',
          ],
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
      {
        id: 'search_indexing',
        name: 'Search indexing',
        description:
          'Posted tweet is persisted -> indexing event enters queue -> search cluster updates real-time inverted index',
        expectedNodeSequence: ['write_api', 'sql_db', 'mq', 'search_cluster'],
        required: false,
        priority: 4,
      },
      {
        id: 'celebrity_timeline_read',
        name: 'Celebrity hybrid timeline read',
        description:
          'Read API loads precomputed home timeline IDs and merges recent celebrity tweets pulled at read time',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'read_api',
          'timeline_cache',
          'user_graph',
          'sql_db',
          'tweet_cache',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'timeline_hydration',
        name: 'Timeline hydration',
        description:
          'Timeline cache returns tweet IDs -> read API hydrates tweet, user, and media metadata before returning feed',
        expectedNodeSequence: [
          'read_api',
          'timeline_cache',
          'tweet_cache',
          'object_store',
          'cdn',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'tweet_delete',
        name: 'Tweet delete propagation',
        description:
          'Delete writes tombstone -> async jobs remove or hide tweet from timeline caches and search index',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'write_api',
          'sql_db',
          'mq',
          'timeline_cache',
          'search_cluster',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'follow_event_backfill',
        name: 'Follow event backfill',
        description:
          'User follows an account -> graph edge is updated -> recent tweets may be backfilled or lazily merged into the home timeline',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'write_api',
          'user_graph',
          'timeline_cache',
        ],
        required: false,
        priority: 8,
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
      {
        id: 'curve_fanout_queue_backlog',
        type: 'failure',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A major sports final causes 20x normal posting volume. Fanout queues are 15 minutes behind, but users still expect fresh timelines. What degrades and what stays correct?',
        expectedMitigations: [
          'persist tweet before fanout',
          'monitor fanout lag',
          'priority lanes for active users',
          'fallback pull/merge on read',
          'backpressure and autoscaling workers',
        ],
        redFlags: [
          'post API waits for all fanout writes',
          'no queue lag metric',
          'drops tweets silently',
        ],
      },
      {
        id: 'curve_delete_still_visible',
        type: 'constraint_change',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A user deletes a tweet, but it remains in millions of cached home timelines and search results. How do you make deletion visible quickly without rewriting every timeline synchronously?',
        expectedMitigations: [
          'tweet tombstone checked during hydration',
          'async cache cleanup',
          'search index delete/update event',
          'short TTL for hydrated tweet cache',
        ],
        redFlags: [
          'synchronously scans every follower timeline',
          'no tombstone',
          'search index never receives deletes',
        ],
      },
      {
        id: 'curve_search_index_lag',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'Search indexing is delayed by 2 minutes during breaking news. Timeline still works, but search freshness is bad. What is your recovery and user-facing behavior?',
        expectedMitigations: [
          'indexing lag SLO',
          'separate real-time indexing lane',
          'replayable queue',
          'partial results with freshness indicator',
          'backfill from durable tweet store',
        ],
        redFlags: [
          'search depends only on in-memory events',
          'no replay/backfill',
          'no freshness metric',
        ],
      },
      {
        id: 'curve_timeline_cache_memory',
        type: 'cost_pressure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Timeline cache memory cannot hold every inactive user timeline. Which timelines do you cache, evict, or rebuild on demand?',
        expectedMitigations: [
          'cache active users first',
          'store bounded recent tweet IDs',
          'rebuild inactive timelines lazily',
          'use TTL/LRU by activity',
          'separate tweet hydration cache',
        ],
        redFlags: [
          'stores full tweet bodies in every timeline',
          'keeps inactive timelines forever',
          'no rebuild path on cache miss',
        ],
      },
      {
        id: 'curve_hot_search_query',
        type: 'scale_spike',
        targetNodeType: 'service',
        scenarioTemplate:
          'A breaking hashtag receives 100x normal search traffic and all queries hit the same shard range. How do you avoid search hot spots?',
        expectedMitigations: [
          'query result caching for hot queries',
          'partition index by time and term',
          'replicate hot shards',
          'scatter-gather with timeout and partial merge',
          'rate limit abusive clients',
        ],
        redFlags: [
          'single shard owns every hot term',
          'no query cache',
          'search API blocks indefinitely waiting for all shards',
        ],
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
      {
        id: 'probe_twitter_data_model',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'What are the core records for tweets, follow edges, home timelines, search postings, media, and deletes?',
        expectedSignals: [
          'tweet_id/user_id/time indexed storage',
          'follow graph edges',
          'timeline stores tweet IDs not full bodies',
          'tombstone or status for deletes',
          'media object key separated from tweet row',
        ],
        redFlags: [
          'single relational join for every timeline read',
          'stores full tweets duplicated in every follower timeline',
          'no delete/tombstone model',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Show the exact data you would store in a home timeline cache entry.',
          },
        ],
      },
      {
        id: 'probe_twitter_timeline_cache',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'At 100K timeline reads/sec, how does the read API serve a home timeline under 500ms without joining tweets, users, media, and follows on every request?',
        expectedSignals: [
          'precomputed timeline IDs',
          'bounded cache size per active user',
          'hydration from tweet/user cache',
          'fallback rebuild on cache miss',
        ],
        redFlags: [
          'DB joins on every timeline read',
          'no cache miss rebuild path',
          'timeline cache stores unbounded full objects',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If you cache 800 tweet IDs per active user, roughly how much memory is that per million active cached users before overhead?',
          },
        ],
      },
      {
        id: 'probe_twitter_celebrity_hybrid',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'cache', 'service'],
        primaryQuestionTemplate:
          'Where is the threshold where you stop fan-out-on-write and switch a high-follower account to pull or hybrid fanout?',
        expectedSignals: [
          'fanout amplification math',
          'active follower prioritization',
          'pull/merge celebrity tweets on read',
          'queue lag and worker capacity considered',
        ],
        redFlags: [
          'one strategy for all users',
          'synchronous write to every follower timeline',
          'no threshold or capacity estimate',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If each fanout write takes one queue message, how many messages does a 50M-follower account create per tweet?',
          },
        ],
      },
      {
        id: 'probe_twitter_search_index',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'How does a newly posted tweet become searchable within seconds while search queries continue serving with low latency?',
        expectedSignals: [
          'durable tweet write before indexing event',
          'real-time inverted index segment',
          'scatter-gather query and merge',
          'indexing lag monitoring and replay',
        ],
        redFlags: [
          'search scans SQL tweets table',
          'no durable queue for indexing',
          'no lag metric or backfill path',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Why might search use both write-friendly active segments and optimized read-only segments?',
          },
        ],
      },
      {
        id: 'probe_twitter_delete_unfollow',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'database', 'service'],
        primaryQuestionTemplate:
          'A tweet is deleted or an account is unfollowed. What is the fastest correct way to stop showing that content without rewriting every cached timeline immediately?',
        expectedSignals: [
          'tombstone/status checked during hydration',
          'async cleanup of timeline caches',
          'search delete event',
          'privacy/follow filter at read time when necessary',
        ],
        redFlags: [
          'bulk synchronous timeline rewrite',
          'deleted content can be hydrated forever',
          'search index not updated',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the tweet ID remains in a cached timeline but the tweet row has a tombstone?',
          },
        ],
      },
      {
        id: 'probe_twitter_queue_backpressure',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'Posting persists successfully, but fanout workers fall behind. What metrics, retry policy, and degraded read behavior keep the product usable?',
        expectedSignals: [
          'fanout lag by priority',
          'replayable durable queue',
          'DLQ for poison jobs',
          'fallback pull/merge on read',
          'autoscaling/backpressure',
        ],
        redFlags: [
          'drops fanout jobs',
          'post request waits for all follower writes',
          'no alert on lag',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which lag threshold would page the team during a major event?',
          },
        ],
      },
      {
        id: 'probe_twitter_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'cache', 'queue'],
        primaryQuestionTemplate:
          'What dashboards prove timeline and search are fresh, fast, and not silently dropping content?',
        expectedSignals: [
          'timeline cache hit rate and latency',
          'fanout queue lag and failure rate',
          'search indexing lag',
          'top hot accounts/hashtags',
          'delete propagation latency',
        ],
        redFlags: [
          'only tracks API 500s',
          'no freshness metrics',
          'no per-hot-key visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If users say tweets are missing from home timeline, which metric do you inspect first?',
          },
        ],
      },
      {
        id: 'probe_twitter_cost',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'Where does this design spend the most money: fanout cache memory, tweet storage, media storage/CDN, or search index? How would you reduce cost safely?',
        expectedSignals: [
          'cache only active bounded timelines',
          'store media in object storage/CDN',
          'separate hot and cold tweet storage',
          'search retention/segment compaction',
        ],
        redFlags: [
          'keeps every user timeline in memory forever',
          'duplicates media per timeline',
          'no cold storage story',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which cost optimization could increase read latency, and how would you bound that impact?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Design the crawler pipeline that discovers URLs, fetches HTML, respects robots.txt, extracts links, deduplicates content, stores documents, and feeds an inverted index.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'crawl',
            'index',
            'discover',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'crawl_scope',
          answer:
            'Crawl publicly reachable HTTP/HTTPS HTML pages only. Authenticated pages, forms that mutate state, deep web content, images, videos, PDFs, and JavaScript rendering are out of scope.',
          discloseWhen: [
            'scope',
            'public web',
            'authenticated',
            'forms',
            'pdf',
            'images',
            'video',
            'html only',
            'phạm vi',
            'trang công khai',
          ],
        },
        {
          dimension: 'constraints',
          key: 'url_frontier',
          answer:
            'Use a distributed URL frontier with priority by freshness/importance and per-host scheduling so workers do not issue concurrent or too-frequent requests to the same host.',
          discloseWhen: [
            'frontier',
            'url queue',
            'priority queue',
            'scheduler',
            'per host',
            'host queue',
            'hàng đợi url',
            'ưu tiên',
            'lập lịch',
          ],
        },
        {
          dimension: 'constraints',
          key: 'robots_txt',
          answer:
            'Fetch /robots.txt at the site root before crawling a host, follow RFC 9309 rules, cache robots rules for at most about 24 hours, and apply them by user-agent and path.',
          discloseWhen: [
            'robots',
            'robots.txt',
            'robot exclusion',
            'disallow',
            'allow',
            'user-agent',
            'crawl permission',
            'quy tắc robots',
            'chặn crawl',
          ],
        },
        {
          dimension: 'constraints',
          key: 'politeness',
          answer:
            'Enforce host-level politeness with one outstanding fetch per host by default, adaptive crawl delay, timeouts, and circuit breakers for slow or overloaded sites.',
          discloseWhen: [
            'politeness',
            'crawl delay',
            'rate limit',
            'overload',
            'same host',
            'timeouts',
            'lịch sự',
            'giới hạn theo domain',
            'quá tải website',
          ],
        },
        {
          dimension: 'constraints',
          key: 'url_normalization',
          answer:
            'Normalize URLs before dedupe: lowercase scheme/host, remove fragments, normalize percent-encoding and dot segments, sort or drop known tracking query params carefully.',
          discloseWhen: [
            'normalization',
            'canonicalization',
            'duplicate urls',
            'query params',
            'fragment',
            'percent encoding',
            'chuẩn hóa url',
            'canonical',
            'trùng url',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Store URL records with normalized_url, canonical_url, host, crawl_status, next_crawl_at, last_fetch metadata, content_hash, simhash, document_id, and robots/cache metadata.',
          discloseWhen: [
            'schema',
            'data model',
            'url table',
            'metadata',
            'crawl status',
            'next crawl',
            'mô hình dữ liệu',
            'bảng url',
            'metadata crawl',
          ],
        },
        {
          dimension: 'data',
          key: 'deduplication',
          answer:
            'Use exact content hashes for identical pages and SimHash or shingling for near-duplicates; URL-only dedupe is not enough for mirrors, tracking params, and printer pages.',
          discloseWhen: [
            'dedup',
            'deduplicate',
            'duplicate content',
            'near duplicate',
            'simhash',
            'content hash',
            'trùng nội dung',
            'loại trùng',
          ],
        },
        {
          dimension: 'data',
          key: 'freshness_signals',
          answer:
            'Recrawl priority should combine page importance, observed change rate, HTTP validators, sitemap lastmod when trustworthy, backlinks, and previous fetch failures.',
          discloseWhen: [
            'freshness',
            'recrawl',
            'priority',
            'sitemap',
            'lastmod',
            'change rate',
            'độ mới',
            'crawl lại',
            'ưu tiên crawl',
          ],
        },
        {
          dimension: 'nfr',
          key: 'indexing_latency',
          answer:
            'Normal pages can be indexed eventually, but high-priority URLs such as breaking news should have a separate lane targeting under 5 minutes from discovery to searchable.',
          discloseWhen: [
            'indexing latency',
            'breaking news',
            'searchable',
            'fresh index',
            'priority lane',
            'tin nóng',
            'bao lâu index',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Crawler workers may fail and retry idempotently; the search query path should remain available even if crawling or indexing is delayed.',
          discloseWhen: [
            'availability',
            'failure',
            'retry',
            'idempotent',
            'crawler down',
            'indexer down',
            'khả dụng',
            'sự cố',
            'thử lại',
          ],
        },
        {
          dimension: 'constraints',
          key: 'fetch_limits',
          answer:
            'Each fetch should enforce DNS/connect/read timeouts, max response size, content-type checks, redirect limits, compression limits, and safe HTML parsing.',
          discloseWhen: [
            'timeout',
            'redirect',
            'max size',
            'content type',
            'compression',
            'html parse',
            'giới hạn fetch',
            'kích thước response',
          ],
        },
        {
          dimension: 'constraints',
          key: 'sitemap_usage',
          answer:
            'Sitemaps can seed or reprioritize URLs, especially when referenced from robots.txt, but unauthenticated sitemap ping should not be trusted blindly as a high-priority signal.',
          discloseWhen: [
            'sitemap',
            'lastmod',
            'ping',
            'discover urls',
            'seed urls',
            'sơ đồ site',
            'khám phá url',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'ranking_ads',
          answer:
            'Full search ranking, ads, personalization, spam classification, and legal takedown workflows are separate systems and out of scope for the crawler core.',
          discloseWhen: [
            'ranking',
            'ads',
            'personalization',
            'spam',
            'legal',
            'takedown',
            'xếp hạng',
            'quảng cáo',
            'cá nhân hóa',
          ],
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
      {
        id: 'robots_and_frontier',
        name: 'Robots and frontier scheduling',
        description:
          'Crawler selects a host-safe URL from the priority frontier -> checks cached robots rules and crawl delay -> fetches only when allowed',
        expectedNodeSequence: ['crawler', 'redis_queue', 'nosql'],
        required: false,
        priority: 3,
      },
      {
        id: 'recrawl_scheduling',
        name: 'Recrawl scheduling',
        description:
          'Stored URL metadata and freshness signals determine next_crawl_at -> URL is pushed back to priority queue',
        expectedNodeSequence: ['nosql', 'redis_queue', 'crawler'],
        required: false,
        priority: 4,
      },
      {
        id: 'dedupe_and_index_update',
        name: 'Dedupe and index update',
        description:
          'Fetched content is normalized and fingerprinted -> duplicate pages are skipped -> new or changed documents update index and snippets',
        expectedNodeSequence: [
          'crawler',
          'nosql',
          'mq',
          'reverse_index',
          'doc_service',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'query_cache_hit',
        name: 'Query cache hit',
        description:
          'Popular search query is served from cache without hitting the reverse index or document service',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'query_api',
          'cache',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'robots_blocked_url',
        name: 'Robots-blocked URL',
        description:
          'Crawler discovers a URL but robots rules disallow it -> URL metadata records blocked status without fetching page content',
        expectedNodeSequence: ['crawler', 'nosql'],
        required: false,
        priority: 7,
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
          'trusted sitemap lastmod signal',
          'high priority crawl lane',
        ],
        redFlags: ['single FIFO queue only', 'no priority mechanism'],
      },
      {
        id: 'curve_slow_host_backpressure',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'A large host becomes very slow: connections hang for 30 seconds and crawler workers pile up. How do you protect worker capacity and stay polite?',
        expectedMitigations: [
          'per-host timeout and circuit breaker',
          'one outstanding request per host',
          'adaptive crawl delay/backoff',
          'worker pool isolation',
          'retry with capped attempts',
        ],
        redFlags: [
          'unbounded concurrent fetches to same host',
          'no timeout',
          'global worker starvation',
        ],
      },
      {
        id: 'curve_robots_disallow_after_crawl',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'A site changes robots.txt to disallow a path you crawled yesterday. What happens to scheduled recrawls and already indexed content?',
        expectedMitigations: [
          'refresh robots cache within policy window',
          'stop future fetches for disallowed paths',
          'mark URL blocked in metadata',
          'separate crawl permission from index removal policy',
        ],
        redFlags: [
          'robots rules cached forever',
          'continues crawling disallowed paths',
          'confuses robots.txt with access control',
        ],
      },
      {
        id: 'curve_faceted_url_explosion',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'An e-commerce site generates millions of filter/sort URL combinations with near-identical content. How do you avoid wasting crawl budget?',
        expectedMitigations: [
          'URL normalization and parameter rules',
          'per-host crawl budget',
          'near-duplicate detection',
          'canonical link handling',
          'depth and pattern limits',
        ],
        redFlags: [
          'URL-only dedupe after fetch',
          'no per-host budget',
          'keeps every parameter combination',
        ],
      },
      {
        id: 'curve_priority_starvation',
        type: 'cost_pressure',
        targetNodeType: 'queue',
        scenarioTemplate:
          'Popular news domains constantly refill the high-priority queue and smaller sites never get crawled. How do you keep freshness without starvation?',
        expectedMitigations: [
          'fair scheduling by host/domain tier',
          'priority aging',
          'per-domain quota',
          'separate discovery and recrawl lanes',
          'crawl budget accounting',
        ],
        redFlags: [
          'single global priority queue only',
          'no fairness policy',
          'popular domains consume all capacity',
        ],
      },
      {
        id: 'curve_indexer_backlog',
        type: 'failure',
        targetNodeType: 'queue',
        scenarioTemplate:
          'Crawler fetches pages faster than the indexing pipeline can process them. The reverse index is hours behind. What do you slow down, buffer, or drop?',
        expectedMitigations: [
          'durable indexing queue',
          'backpressure from index lag to crawler frontier',
          'priority for changed/high-value pages',
          'DLQ for poison documents',
          'replay from raw document store',
        ],
        redFlags: [
          'crawler ignores index lag',
          'drops fetched content with no replay',
          'no poison document isolation',
        ],
      },
      {
        id: 'curve_duplicate_storage_cost',
        type: 'cost_pressure',
        targetNodeType: 'database',
        scenarioTemplate:
          'Raw crawled storage reaches 72 PB faster than expected because mirror sites and tracking parameters create duplicates. What do you dedupe before storing, after storing, and in the index?',
        expectedMitigations: [
          'normalize URL before frontier insert',
          'exact content hash',
          'SimHash or shingling for near-duplicates',
          'store canonical document once',
          'cold storage/lifecycle policy',
        ],
        redFlags: [
          'stores every fetched copy forever',
          'URL-only deduplication',
          'no canonical document mapping',
        ],
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
      {
        id: 'probe_crawler_frontier',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'service'],
        primaryQuestionTemplate:
          'Design the distributed URL frontier. How do you choose the next URL while respecting priority, per-host politeness, and worker concurrency?',
        expectedSignals: [
          'priority queue by next_crawl_at/importance',
          'per-host queues or locks',
          'no concurrent fetches to same host',
          'fair scheduling and priority aging',
        ],
        redFlags: [
          'single FIFO queue only',
          'workers can all hit same host',
          'no starvation prevention',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How do you balance crawling very important pages quickly against giving smaller domains some crawl budget?',
          },
        ],
      },
      {
        id: 'probe_crawler_robots_rfc',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'Walk me through robots.txt handling before the first fetch to a new host, including redirects, cache TTL, unavailable robots.txt, and parsing errors.',
        expectedSignals: [
          '/robots.txt fetched at site root',
          'rules cached but refreshed within policy window',
          'redirect handling',
          'use parseable rules and user-agent groups',
          'robots is not security/access control',
        ],
        redFlags: [
          'ignores robots.txt',
          'fetches robots.txt before every page',
          'caches robots rules forever',
          'treats robots as authentication',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if robots.txt is temporarily unreachable for a host you already crawled before?',
          },
        ],
      },
      {
        id: 'probe_crawler_url_normalization',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Which URL normalization rules are safe before frontier dedupe, and which query-parameter rewrites are risky?',
        expectedSignals: [
          'lowercase scheme and host',
          'remove fragments',
          'percent-encoding and dot-segment normalization',
          'careful treatment of query params',
          'canonical URL mapping',
        ],
        redFlags: [
          'treats every query string as unique forever',
          'drops all query params blindly',
          'no canonical URL concept',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Why can dropping all query parameters lose real pages, while keeping all of them creates crawler traps?',
          },
        ],
      },
      {
        id: 'probe_crawler_freshness',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'database'],
        primaryQuestionTemplate:
          'How do you decide whether a URL should be recrawled in hours, days, or weeks?',
        expectedSignals: [
          'observed change rate',
          'page importance/backlinks',
          'HTTP validators or last modified',
          'trusted sitemap lastmod',
          'failure/backoff history',
        ],
        redFlags: [
          'fixed recrawl interval for every page',
          'blindly trusts sitemap priority/changefreq',
          'no backoff after failures',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What freshness SLO would you set for top news pages versus low-value long-tail pages?',
          },
        ],
      },
      {
        id: 'probe_crawler_fetch_failure',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'What does a crawler worker do for DNS errors, 429/503, redirect loops, oversized responses, invalid content types, and parser crashes?',
        expectedSignals: [
          'bounded retries with exponential backoff',
          'respect Retry-After when available',
          'redirect limit',
          'max response size/content-type guard',
          'DLQ or quarantine for poison pages',
        ],
        redFlags: [
          'infinite retries',
          'no timeout or size limit',
          'parser crash loses worker process',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Which failures should reduce the host crawl rate versus only retrying one URL later?',
          },
        ],
      },
      {
        id: 'probe_crawler_index_pipeline',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['queue', 'database', 'service'],
        primaryQuestionTemplate:
          'After a page is fetched and parsed, how does it become searchable in the reverse index and document/snippet service?',
        expectedSignals: [
          'durable indexing job',
          'tokenization and inverted index update',
          'document metadata/snippet storage',
          'idempotent re-index by document_id/version',
          'backpressure from index lag',
        ],
        redFlags: [
          'query path scans raw documents',
          'index update is not replayable',
          'no versioning for changed pages',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What do you store in the document service that should not live in the reverse index postings list?',
          },
        ],
      },
      {
        id: 'probe_crawler_query_path',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'service', 'database'],
        primaryQuestionTemplate:
          'The seed expects search queries under 100ms. What happens on cache hit, cache miss, index lookup, ranking/merge, and snippet fetch?',
        expectedSignals: [
          'popular query cache',
          'reverse index lookup',
          'top-k merge/ranking',
          'document/snippet fetch',
          'timeouts and partial results',
        ],
        redFlags: [
          'linear scan over documents',
          'no query cache for hot searches',
          'waits forever for every shard',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which part of the query path owns the p99 latency budget?',
          },
        ],
      },
      {
        id: 'probe_crawler_storage_math',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['database'],
        primaryQuestionTemplate:
          'At 1B pages/month and 72 PB raw data over 3 years, what do you store raw, compressed, deduplicated, indexed, and moved to cold storage?',
        expectedSignals: [
          'raw HTML compression',
          'content hash/simhash index',
          'canonical document storage',
          'hot/cold retention tiers',
          'index size separated from raw content size',
        ],
        redFlags: [
          'stores every duplicate raw page forever',
          'no lifecycle policy',
          'mixes raw document store and index store',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which data can be recomputed from raw HTML, and which data must be served online for queries?',
          },
        ],
      },
      {
        id: 'probe_crawler_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'queue', 'database'],
        primaryQuestionTemplate:
          'What metrics tell you the crawler is fresh, polite, efficient, and not stuck in traps?',
        expectedSignals: [
          'fetch rate by host/status',
          'robots blocked count',
          'frontier age/lag by priority',
          'duplicate ratio',
          'indexing lag',
          'per-host error and timeout rate',
        ],
        redFlags: [
          'only tracks total pages crawled',
          'no per-host visibility',
          'no freshness/indexing lag metric',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric would reveal that one crawler trap is consuming most of your fetch capacity?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support read-only account linking, incremental transaction sync, transaction categorization, budget aggregation, dashboard reads, and spending alerts.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'mint',
            'personal finance',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'account_linking',
          answer:
            'Account linking stores institution/account metadata and encrypted access tokens from a bank aggregator. The app should request read-only transaction/account scopes and support consent revocation.',
          discloseWhen: [
            'link account',
            'bank account',
            'access token',
            'token',
            'consent',
            'read only',
            'oauth',
            'liên kết tài khoản',
            'token ngân hàng',
            'quyền truy cập',
          ],
        },
        {
          dimension: 'constraints',
          key: 'transactions_sync',
          answer:
            'Use incremental sync with a cursor per bank item/account. Apply added, modified, and removed transactions atomically, then persist the next cursor only after updates commit.',
          discloseWhen: [
            'sync',
            'cursor',
            'incremental',
            'webhook',
            'added',
            'modified',
            'removed',
            'đồng bộ',
            'cursor sync',
            'cập nhật giao dịch',
          ],
        },
        {
          dimension: 'constraints',
          key: 'pending_posted_reconciliation',
          answer:
            'Pending transactions can change amount, merchant, category, or disappear when posted. Reconcile pending_transaction_id or provider transaction IDs so pending and posted versions do not double-count budgets.',
          discloseWhen: [
            'pending',
            'posted',
            'settled',
            'duplicate',
            'pending transaction',
            'double count',
            'giao dịch pending',
            'giao dịch đã post',
            'đếm trùng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'freshness',
          answer:
            'Bank transaction data is not guaranteed real time. Normal updates can be webhook/poll driven a few times per day; manual refresh or real-time balance checks are separate, more expensive paths.',
          discloseWhen: [
            'freshness',
            'real time',
            'realtime',
            'poll',
            'webhook',
            'manual refresh',
            'độ mới',
            'thời gian thực',
            'bao lâu cập nhật',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core tables: users, linked_items, accounts, transactions, categories, user_category_overrides, budgets, monthly_budget_rollups, sync_cursors, and alert_events.',
          discloseWhen: [
            'schema',
            'data model',
            'tables',
            'transaction table',
            'budget table',
            'mô hình dữ liệu',
            'bảng',
            'schema giao dịch',
          ],
        },
        {
          dimension: 'scope',
          key: 'categorization',
          answer:
            'Categorization should combine provider category/enrichment, deterministic merchant rules, ML fallback, and user overrides. User overrides must be stable and should affect future similar transactions.',
          discloseWhen: [
            'category',
            'categorize',
            'merchant',
            'override',
            'rules',
            'ml',
            'phân loại',
            'merchant',
            'người dùng sửa category',
          ],
        },
        {
          dimension: 'data',
          key: 'budget_aggregates',
          answer:
            'Do not compute the full dashboard by scanning 7 years of transactions. Maintain monthly/category rollups and recent windows, then update them idempotently as transactions are added, modified, or removed.',
          discloseWhen: [
            'budget',
            'dashboard',
            'aggregate',
            'rollup',
            'summary',
            'monthly',
            'ngân sách',
            'tổng hợp',
            'dashboard nhanh',
          ],
        },
        {
          dimension: 'constraints',
          key: 'idempotency',
          answer:
            'Use a stable uniqueness key such as provider_item_id + account_id + transaction_id, plus a separate pending-to-posted mapping. Queue retries must be safe to replay.',
          discloseWhen: [
            'idempotency',
            'dedupe',
            'duplicate',
            'retry',
            'transaction id',
            'unique key',
            'chống trùng',
            'idempotent',
            'thử lại',
          ],
        },
        {
          dimension: 'nfr',
          key: 'security_privacy',
          answer:
            'Encrypt access tokens and sensitive financial data at rest, keep secrets out of logs, enforce least-privilege service access, and audit reads/writes to financial records.',
          discloseWhen: [
            'security',
            'privacy',
            'pii',
            'encrypt',
            'token',
            'audit',
            'secret',
            'bảo mật',
            'riêng tư',
            'mã hóa',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'The dashboard should keep serving cached or last-known-good data when a bank aggregator is slow or down, while clearly marking data freshness and retrying sync asynchronously.',
          discloseWhen: [
            'availability',
            'bank down',
            'provider down',
            'outage',
            'degraded',
            'last known',
            'khả dụng',
            'ngân hàng lỗi',
            'sự cố',
          ],
        },
        {
          dimension: 'constraints',
          key: 'rate_limits_backoff',
          answer:
            'External bank APIs must be called with rate limiting, exponential backoff, jitter, and circuit breakers. Month-end sync bursts should be smoothed through queues.',
          discloseWhen: [
            'rate limit',
            'backoff',
            'retry',
            'bank api',
            'circuit breaker',
            'month end',
            'giới hạn api',
            'retry ngân hàng',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'advanced_finance',
          answer:
            'Credit scoring, investment trading, tax filing, bill payment, loan underwriting, and fraud decisioning are out of scope.',
          discloseWhen: [
            'credit score',
            'investment',
            'trading',
            'tax',
            'loan',
            'fraud',
            'điểm tín dụng',
            'đầu tư',
            'thuế',
          ],
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
      {
        id: 'account_linking',
        name: 'Account linking',
        description:
          'User links bank account -> account token and metadata are saved -> initial sync job is queued',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'accounts_api',
          'sql_master',
          'mq',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'webhook_incremental_sync',
        name: 'Webhook incremental sync',
        description:
          'Bank aggregator webhook signals updates -> extraction worker reads from cursor -> applies added/modified/removed transactions',
        expectedNodeSequence: [
          'accounts_api',
          'mq',
          'extract_service',
          'budget_service',
          'sql_master',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'pending_to_posted_reconcile',
        name: 'Pending to posted reconciliation',
        description:
          'Pending transaction is replaced by posted transaction -> budget rollup subtracts old pending amount and applies final posted amount once',
        expectedNodeSequence: [
          'extract_service',
          'category_service',
          'budget_service',
          'sql_master',
          'cache',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'budget_alert_delivery',
        name: 'Budget alert delivery',
        description:
          'Budget threshold is crossed -> alert event is persisted -> notification worker sends alert exactly once',
        expectedNodeSequence: [
          'budget_service',
          'sql_master',
          'notification_service',
          'mq',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'dashboard_aggregate_refresh',
        name: 'Dashboard aggregate refresh',
        description:
          'Background aggregate job refreshes monthly summaries -> read API serves cached dashboard from rollups',
        expectedNodeSequence: [
          'analytics_db',
          'budget_service',
          'sql_master',
          'cache',
          'read_api',
        ],
        required: false,
        priority: 7,
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
      {
        id: 'curve_bank_provider_outage',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'A major bank aggregator is down for 6 hours. Users keep opening dashboards and some manually refresh accounts. What degrades, what keeps working, and how do you prevent retry storms?',
        expectedMitigations: [
          'serve last-known-good dashboard data',
          'show data freshness timestamp',
          'queue retries with exponential backoff and jitter',
          'circuit breaker per provider',
          'do not block dashboard reads on live bank calls',
        ],
        redFlags: [
          'dashboard synchronously calls bank API',
          'unbounded retries',
          'no freshness indicator',
        ],
      },
      {
        id: 'curve_cursor_replay',
        type: 'failure',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A worker commits transaction rows but crashes before saving the new sync cursor. The same cursor is replayed. How do you avoid duplicate transactions and corrupted budget rollups?',
        expectedMitigations: [
          'transactional cursor update after applying changes',
          'unique transaction key',
          'idempotent rollup updates',
          'replay-safe queue processing',
        ],
        redFlags: [
          'cursor saved before writes commit',
          'budget increments blindly',
          'no duplicate guard',
        ],
      },
      {
        id: 'curve_pending_double_count',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'A $200 pending restaurant charge posts as $176 two days later. The dashboard now shows both charges and budget alerts fire twice. How do you model pending-to-posted replacement?',
        expectedMitigations: [
          'pending transaction linkage',
          'reverse or adjust old rollup',
          'final posted transaction wins',
          'alert deduplication by budget window',
        ],
        redFlags: [
          'pending and posted treated as unrelated forever',
          'no rollup correction',
          'alerts not idempotent',
        ],
      },
      {
        id: 'curve_category_model_drift',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'A merchant changes descriptors and grocery purchases are suddenly categorized as entertainment for thousands of users. How do user overrides, rule rollbacks, and aggregate repair work?',
        expectedMitigations: [
          'user category overrides',
          'versioned categorization rules',
          'backfill affected transactions',
          'repair monthly rollups',
          'monitor category anomaly rate',
        ],
        redFlags: [
          'category is immutable forever',
          'no rule versioning',
          'no aggregate repair path',
        ],
      },
      {
        id: 'curve_token_leak',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'A log pipeline accidentally captures bank access tokens. What controls should have prevented this, and what is your incident response?',
        expectedMitigations: [
          'never log tokens or raw secrets',
          'token encryption and secret scanning',
          'least-privilege access',
          'token rotation/revocation',
          'audit affected access',
        ],
        redFlags: [
          'tokens stored plaintext',
          'tokens appear in application logs',
          'no revocation or audit process',
        ],
      },
      {
        id: 'curve_dashboard_stale_cache',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A user edits a transaction category, but the dashboard still shows the old budget totals for 30 minutes. How do cache invalidation and rollup recomputation work?',
        expectedMitigations: [
          'write-through or event-driven cache invalidation',
          'rollup adjustment for changed category',
          'versioned dashboard cache keys',
          'short TTL for user-visible aggregates',
        ],
        redFlags: [
          'dashboard cache only expires by long TTL',
          'category edit does not update rollups',
          'no versioning for aggregate cache',
        ],
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
      {
        id: 'probe_mint_sync_cursor',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database', 'queue'],
        primaryQuestionTemplate:
          'Explain your incremental transaction sync cursor. When do you persist the cursor relative to added, modified, and removed transaction writes?',
        expectedSignals: [
          'cursor per linked item/account',
          'apply added/modified/removed atomically',
          'persist cursor after successful commit',
          'replay-safe idempotency',
        ],
        redFlags: [
          'cursor saved before transaction writes',
          'full resync every time',
          'no handling of removed transactions',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the worker crashes after writing transactions but before saving the cursor?',
          },
        ],
      },
      {
        id: 'probe_mint_pending_posted',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'How do you represent pending transactions that later post with a different amount or merchant, without double-counting budgets?',
        expectedSignals: [
          'pending-to-posted linkage',
          'adjust previous rollup contribution',
          'final posted transaction wins',
          'alert dedupe across corrections',
        ],
        redFlags: [
          'pending and posted both counted forever',
          'no rollup correction',
          'alerts can fire twice for same purchase',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk me through a $200 pending charge that posts as $176 in a different category.',
          },
        ],
      },
      {
        id: 'probe_mint_dashboard_materialization',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'database', 'service'],
        primaryQuestionTemplate:
          'Dashboard p99 is 500ms with 7 years of transaction history. Which aggregates are materialized and how are they updated?',
        expectedSignals: [
          'monthly/category rollups',
          'recent window aggregates',
          'cache-aside or write-through dashboard cache',
          'rollup repair on modified/removed transactions',
        ],
        redFlags: [
          'scan all transactions on every dashboard load',
          'no aggregate invalidation',
          'cache stale after category edit',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'How many transaction rows might a 7-year dashboard scan touch for a heavy user?',
          },
        ],
      },
      {
        id: 'probe_mint_security_privacy',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Where do bank access tokens and sensitive transaction data live, and how do you prevent leaks through logs, analytics, and internal tools?',
        expectedSignals: [
          'encrypted tokens at rest',
          'secrets excluded from logs',
          'least privilege service access',
          'audit trails',
          'redaction in analytics exports',
        ],
        redFlags: [
          'plaintext tokens',
          'raw financial records in logs',
          'no audit for data access',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which data can analytics jobs use safely, and which fields must be redacted or tokenized?',
          },
        ],
      },
      {
        id: 'probe_mint_alerts',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'queue', 'cache'],
        primaryQuestionTemplate:
          'A budget threshold is crossed during a burst of transaction updates. How do you send the alert quickly but exactly once?',
        expectedSignals: [
          'idempotent alert event key',
          'threshold crossing detection',
          'queue-backed notification delivery',
          'dedupe by user/category/window',
          'retry without duplicate push/email',
        ],
        redFlags: [
          'notification sent inline before commit',
          'no dedupe key',
          'retries duplicate alerts',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Should alert delivery wait for the transaction commit, and why?',
          },
        ],
      },
      {
        id: 'probe_mint_categorization',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'How do provider categories, merchant rules, ML predictions, and user overrides combine into the final category?',
        expectedSignals: [
          'source priority order',
          'versioned categorization rules',
          'user overrides persist for similar merchants',
          'backfill and rollup repair after rule change',
        ],
        redFlags: [
          'provider category trusted blindly',
          'user correction not remembered',
          'category changes do not repair budgets',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If a user recategorizes all Starbucks transactions as Dining, how do future transactions behave?',
          },
        ],
      },
      {
        id: 'probe_mint_provider_outage',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'A bank provider times out for hours. What metrics, queues, backoff policy, and user-facing states do you need?',
        expectedSignals: [
          'provider-specific error rate',
          'sync lag by institution',
          'circuit breaker/backoff with jitter',
          'manual refresh throttling',
          'last-updated timestamp on dashboard',
        ],
        redFlags: [
          'global retry storm',
          'no per-provider visibility',
          'dashboard blocks on live provider calls',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells support that Bank A data is stale but the rest of the product is healthy?',
          },
        ],
      },
      {
        id: 'probe_mint_cost_retention',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['database', 'storage'],
        primaryQuestionTemplate:
          'Seven years of transaction history is retained. What stays in hot SQL, what moves to object storage/analytics, and what is encrypted or redacted?',
        expectedSignals: [
          'hot recent transactions in SQL',
          'cold archival/object storage for raw logs',
          'analytics aggregates separated from OLTP',
          'retention and deletion policy',
          'encryption/redaction for sensitive fields',
        ],
        redFlags: [
          'all raw logs stay in hot database forever',
          'no deletion/export path',
          'raw sensitive data copied to analytics freely',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which dashboard features require hot detail rows versus only monthly aggregates?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Build a distributed in-memory cache with GET, SET, DELETE, TTL expiration, sharding, eviction, and cache-aside miss handling to the backend service.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'cache',
            'key value',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'ttl_expiration',
          answer:
            'SET should support optional TTL. Expired keys should be removed lazily on access and actively sampled in the background so memory does not fill with expired entries.',
          discloseWhen: [
            'ttl',
            'expire',
            'expiration',
            'time to live',
            'expired key',
            'hết hạn',
            'thời gian sống',
          ],
        },
        {
          dimension: 'scope',
          key: 'value_limits',
          answer:
            'Assume small values optimized for query results or document snippets. Set a max value size, for example 1 MB, and reject or compress values above the limit.',
          discloseWhen: [
            'value size',
            'max size',
            'large value',
            'payload',
            'compression',
            'kích thước value',
            'giá trị lớn',
          ],
        },
        {
          dimension: 'constraints',
          key: 'partitioning',
          answer:
            'Partition keys by consistent hashing with virtual nodes, or a fixed hash-slot scheme like Redis Cluster. Adding/removing nodes should remap only a fraction of keys.',
          discloseWhen: [
            'partition',
            'shard',
            'consistent hash',
            'virtual node',
            'hash slot',
            'reshard',
            'chia shard',
            'phân vùng',
            'vnode',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'This is a cache, so eventual consistency and stale reads are acceptable within TTL or explicit invalidation windows. Durable source of truth remains the backend.',
          discloseWhen: [
            'consistency',
            'stale',
            'eventual',
            'source of truth',
            'freshness',
            'nhất quán',
            'dữ liệu cũ',
            'nguồn chuẩn',
          ],
        },
        {
          dimension: 'constraints',
          key: 'write_policy',
          answer:
            'Default is cache-aside: read miss loads backend and writes cache. Write-through/write-around can be chosen per use case; invalidation events should remove or version stale keys.',
          discloseWhen: [
            'cache aside',
            'write through',
            'write around',
            'write back',
            'miss',
            'invalidation',
            'cách ghi cache',
            'cache miss',
          ],
        },
        {
          dimension: 'scope',
          key: 'atomic_operations',
          answer:
            'For v1, GET/SET/DELETE are required. Optional CAS/gets-style compare-and-set and atomic increments help avoid lost updates for counters but are not mandatory.',
          discloseWhen: [
            'cas',
            'compare and set',
            'atomic',
            'increment',
            'counter',
            'lost update',
            'nguyên tử',
            'tăng counter',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Cache node loss should not take the product down. Clients should treat misses/timeouts as backend reads, while monitoring backend amplification and cache warmup.',
          discloseWhen: [
            'availability',
            'node down',
            'failure',
            'timeout',
            'backend fallback',
            'khả dụng',
            'node chết',
            'sự cố',
          ],
        },
        {
          dimension: 'constraints',
          key: 'replication',
          answer:
            'Replication is optional for a pure cache. If enabled, use asynchronous replicas for higher availability, accepting brief stale reads and extra memory/network cost.',
          discloseWhen: [
            'replication',
            'replica',
            'failover',
            'availability',
            'memory cost',
            'nhân bản',
            'replica cache',
          ],
        },
        {
          dimension: 'constraints',
          key: 'stampede_protection',
          answer:
            'Protect hot misses with request coalescing, single-flight locks, stale-while-revalidate, TTL jitter, and negative caching for missing backend records.',
          discloseWhen: [
            'stampede',
            'thundering herd',
            'hot miss',
            'coalescing',
            'single flight',
            'negative cache',
            'ttl jitter',
            'cache stampede',
          ],
        },
        {
          dimension: 'constraints',
          key: 'hot_key_strategy',
          answer:
            'Detect hot keys and mitigate with local client-side caching, replicas for read-heavy hot keys, key splitting for counters, or request coalescing at the query layer.',
          discloseWhen: [
            'hot key',
            'hotspot',
            'skew',
            'popular key',
            'large traffic',
            'điểm nóng',
            'key nóng',
          ],
        },
        {
          dimension: 'data',
          key: 'memory_accounting',
          answer:
            'Memory capacity must include key bytes, value bytes, metadata, allocator overhead, replication overhead, and fragmentation. Eviction should start before the process hits OOM.',
          discloseWhen: [
            'memory',
            'capacity',
            'overhead',
            'fragmentation',
            'oom',
            'eviction threshold',
            'bộ nhớ',
            'dung lượng',
          ],
        },
        {
          dimension: 'constraints',
          key: 'eviction_policy_detail',
          answer:
            'LRU is simple, LFU can perform better for skewed repeated access, and TTL-aware eviction prevents fresh-but-low-value keys from evicting durable hot entries blindly.',
          discloseWhen: [
            'lru',
            'lfu',
            'eviction',
            'policy',
            'ttl aware',
            'chính sách eviction',
            'loại bỏ key',
          ],
        },
        {
          dimension: 'nfr',
          key: 'observability',
          answer:
            'Track hit rate, miss rate, p99 latency, evictions, expired keys, hot keys, shard balance, memory fragmentation, backend amplification, and rebalancing progress.',
          discloseWhen: [
            'metrics',
            'monitoring',
            'observability',
            'hit rate',
            'miss rate',
            'eviction rate',
            'giám sát',
            'metric',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'database_semantics',
          answer:
            'Transactions, secondary indexes, cross-key queries, durable writes, and SQL-like query semantics are out of scope for this cache.',
          discloseWhen: [
            'transaction',
            'secondary index',
            'query',
            'sql',
            'durable',
            'database',
            'giao dịch',
            'truy vấn phức tạp',
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
      {
        id: 'set_with_ttl',
        name: 'Set with TTL',
        description:
          'Client writes key/value with optional TTL -> query API hashes key to owner shard -> cache stores value and expiration metadata',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'query_api',
          'cache_shard_2',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'targeted_invalidation',
        name: 'Targeted invalidation',
        description:
          'Backend data changes -> query API deletes or versions affected cache key -> future reads repopulate from backend',
        expectedNodeSequence: [
          'reverse_index',
          'query_api',
          'cache_shard_1',
          'doc_service',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'resharding_flow',
        name: 'Resharding flow',
        description:
          'New cache node is added -> hash ring/slot map changes -> only affected keys migrate while clients refresh routing metadata',
        expectedNodeSequence: ['query_api', 'cache_shard_1', 'cache_shard_2'],
        required: false,
        priority: 5,
      },
      {
        id: 'node_failure_fallback',
        name: 'Node failure fallback',
        description:
          'Cache shard times out -> query API treats it as a miss -> backend serves value -> cache warms on surviving owner',
        expectedNodeSequence: [
          'query_api',
          'cache_shard_3',
          'reverse_index',
          'query_api',
          'cache_shard_1',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'hot_key_read',
        name: 'Hot key read',
        description:
          'Popular key is detected -> local/client-side cache or replica path absorbs repeated reads before the owner shard melts',
        expectedNodeSequence: [
          'client',
          'query_api',
          'cache_shard_1',
          'cache_shard_2',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'stampede_protected_miss',
        name: 'Stampede-protected miss',
        description:
          'Many clients miss the same key -> one request loads backend while others wait, serve stale data, or receive negative cached result',
        expectedNodeSequence: [
          'client',
          'query_api',
          'cache_shard_1',
          'reverse_index',
          'cache_shard_1',
        ],
        required: false,
        priority: 8,
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
      {
        id: 'curve_cache_stampede',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A hot key expires and 20,000 clients request it in the same second. Every request misses and hits the backend. How do you stop the stampede?',
        expectedMitigations: [
          'request coalescing/single-flight',
          'stale-while-revalidate',
          'TTL jitter',
          'distributed lock with timeout',
          'negative caching when backend says not found',
        ],
        redFlags: [
          'every miss independently calls backend',
          'same TTL for all hot keys',
          'lock can deadlock indefinitely',
        ],
      },
      {
        id: 'curve_hot_key_skew',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'One key receives 35% of all traffic and its owner shard saturates while other shards are idle. How do you detect and mitigate the hot key?',
        expectedMitigations: [
          'hot key metrics',
          'client-side/local cache',
          'replicate read-heavy hot key',
          'request coalescing',
          'split key for write-heavy counters',
        ],
        redFlags: [
          'consistent hashing alone fixes hot key',
          'no per-key metrics',
          'adds shards but hot key remains single-owner',
        ],
      },
      {
        id: 'curve_eviction_storm',
        type: 'cost_pressure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Traffic shifts and write volume spikes. Cache nodes start evicting 100K keys/minute and hit rate collapses. What policy and admission controls do you add?',
        expectedMitigations: [
          'eviction/admission metrics',
          'LRU/LFU trade-off',
          'max value size',
          'write admission or sampling',
          'memory headroom before OOM',
        ],
        redFlags: [
          'reject all writes when full',
          'no admission policy',
          'no visibility into evicted key classes',
        ],
      },
      {
        id: 'curve_stale_overwrite',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A slow backend read returns an old value after a newer invalidation already happened, and writes stale data back into cache. How do versioned keys or CAS prevent this?',
        expectedMitigations: [
          'versioned cache keys',
          'compare-and-set/generation check',
          'write after read validates current version',
          'short TTL bounds stale exposure',
        ],
        redFlags: [
          'blind write-back after slow miss',
          'no version/generation',
          'long TTL for mutable records',
        ],
      },
      {
        id: 'curve_counter_lost_update',
        type: 'constraint_change',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Product now wants atomic counters in the cache. Two clients increment the same key concurrently. What API/locking semantics are needed to avoid lost updates?',
        expectedMitigations: [
          'atomic increment operation',
          'CAS token for read-modify-write',
          'single owner shard serializes updates',
          'clear non-durable counter caveat',
        ],
        redFlags: [
          'client read-modify-write with plain SET',
          'cross-shard counter update',
          'claims durable counter without persistence',
        ],
      },
      {
        id: 'curve_reshard_latency',
        type: 'constraint_change',
        targetNodeType: 'cache',
        scenarioTemplate:
          'You add three cache nodes during traffic peak. Rebalancing causes elevated latency and misses. How do clients route, migrate, and warm keys safely?',
        expectedMitigations: [
          'virtual nodes or hash slots',
          'gradual key migration',
          'client routing metadata version',
          'dual read/write during migration when needed',
          'monitor hit rate and migration progress',
        ],
        redFlags: [
          'full cluster flush',
          'all clients update routing manually',
          'moves every key at once',
        ],
      },
      {
        id: 'curve_split_brain_routing',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'Half of your query API instances use the old hash ring and half use the new one. Reads and writes for the same key go to different shards. How do you make routing metadata safe?',
        expectedMitigations: [
          'versioned routing map',
          'central metadata/config service',
          'graceful rollout with compatibility window',
          'forwarding/proxy for moved keys',
        ],
        redFlags: [
          'unversioned local config',
          'no moved-key forwarding',
          'accepts silent split-brain cache state',
        ],
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
      {
        id: 'probe_cache_ttl_expiration',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'How do you store TTL metadata and remove expired keys without scanning the entire keyspace on every request?',
        expectedSignals: [
          'expiration timestamp per entry',
          'lazy deletion on access',
          'active sampling/background expiry',
          'TTL jitter for hot keys',
        ],
        redFlags: [
          'full keyspace scan per request',
          'expired keys stay forever',
          'no TTL metadata',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What is the trade-off between aggressive background expiry and CPU overhead?',
          },
        ],
      },
      {
        id: 'probe_cache_stampede',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'A hot key expires under heavy traffic. Walk me through request coalescing, stale-while-revalidate, and lock timeout behavior.',
        expectedSignals: [
          'only one backend load',
          'other requests wait or serve stale',
          'lock has timeout/fencing',
          'negative cache for not found',
        ],
        redFlags: [
          'every miss hits backend',
          'lock can hang forever',
          'stale data served with no bound',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the process holding the cache-fill lock crashes?',
          },
        ],
      },
      {
        id: 'probe_cache_hot_keys',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Consistent hashing balances key ownership, but one key is 30% of traffic. Why does adding nodes not solve it, and what does?',
        expectedSignals: [
          'per-key traffic skew',
          'owner shard remains hot',
          'replicate read-heavy hot key',
          'local/client cache',
          'split write-heavy keys only when semantics allow',
        ],
        redFlags: [
          'adds nodes as only mitigation',
          'no hot key detection',
          'splits mutable key without consistency plan',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which per-key or per-shard metric would reveal this before the shard melts?',
          },
        ],
      },
      {
        id: 'probe_cache_invalidation_consistency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Backend data changes while a slow cache miss is in flight. How do you avoid writing stale data back into cache after invalidation?',
        expectedSignals: [
          'versioned keys or generations',
          'CAS compare before set',
          'invalidate after source-of-truth commit',
          'bounded stale TTL',
        ],
        redFlags: [
          'blind write-back',
          'invalidate before commit with no retry',
          'long TTL on mutable records',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'When is TTL-only invalidation acceptable, and when do you need event-driven invalidation?',
          },
        ],
      },
      {
        id: 'probe_cache_atomic_cas',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'If you add atomic counters or compare-and-set, what guarantees do you provide on one shard and across shards?',
        expectedSignals: [
          'single owner shard serializes key operations',
          'CAS token/generation',
          'atomic increment for one key',
          'no cross-key transaction guarantee',
        ],
        redFlags: [
          'client-side read-modify-write',
          'claims cross-shard transactions',
          'no CAS conflict behavior',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What response does SET with stale CAS token return, and what should the client do?',
          },
        ],
      },
      {
        id: 'probe_cache_resharding',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'How do clients discover shard ownership, and what happens during node add/remove or hash-slot migration?',
        expectedSignals: [
          'versioned routing metadata',
          'virtual nodes/hash slots',
          'minimal key remapping',
          'moved-key forwarding or retry',
          'gradual warmup/migration',
        ],
        redFlags: [
          'full cache flush on every resize',
          'unversioned routing config',
          'all keys migrate at once',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What migration metric tells you resharding is hurting production traffic?',
          },
        ],
      },
      {
        id: 'probe_cache_replication_failover',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'Should a pure cache replicate data? Compare no replication, async replicas, and synchronous replication for latency, memory, and availability.',
        expectedSignals: [
          'pure cache can tolerate misses',
          'async replication improves availability',
          'sync replication increases latency',
          'replication doubles memory/network cost',
          'backend remains source of truth',
        ],
        redFlags: [
          'replication required for correctness',
          'synchronous replication with no latency cost',
          'no backend fallback',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'When would you accept a cold cache after node failure instead of paying replication cost?',
          },
        ],
      },
      {
        id: 'probe_cache_memory_math',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['cache'],
        primaryQuestionTemplate:
          'For 2.7 TB of cached data, estimate physical memory after keys, values, metadata, allocator fragmentation, replication, and headroom.',
        expectedSignals: [
          'key/value byte estimate',
          'metadata overhead',
          'fragmentation/headroom',
          'replication factor',
          'maxmemory and admission control',
        ],
        redFlags: [
          '2.7 TB equals exactly 2.7 TB RAM',
          'no overhead calculation',
          'no memory headroom before OOM',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If replication factor is 2 and overhead is 30%, how much RAM do you need before safety headroom?',
          },
        ],
      },
      {
        id: 'probe_cache_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Which dashboards tell you the cache is helping rather than hiding backend overload or serving stale data?',
        expectedSignals: [
          'hit/miss rate by route and key class',
          'p99 cache latency',
          'eviction and expiration rates',
          'hot key distribution',
          'backend amplification on miss',
          'routing/resharding errors',
        ],
        redFlags: [
          'only tracks cache CPU',
          'no miss amplification metric',
          'no shard balance visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If backend load triples while traffic is flat, which cache metric do you inspect first?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Ingest sales transactions, aggregate purchase velocity, compute product ranks per category, publish rank snapshots, and serve rank reads under 100ms.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'sales rank',
            'best seller',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'ranking_semantics',
          answer:
            'Rank is category-specific and based on sales velocity with time decay. Recent purchases matter more than old purchases; v1 can publish hourly snapshots rather than exact real-time ranks.',
          discloseWhen: [
            'ranking',
            'rank formula',
            'sales velocity',
            'decay',
            'recent sales',
            'hourly',
            'công thức rank',
            'xếp hạng',
            'doanh số gần đây',
          ],
        },
        {
          dimension: 'data',
          key: 'sales_event_contract',
          answer:
            'Each sales event should include event_id/order_item_id, product_id, category_ids, quantity, event_time, ingestion_time, marketplace, and event_type such as purchase, return, or cancellation.',
          discloseWhen: [
            'event',
            'transaction',
            'sales event',
            'schema',
            'event id',
            'order item',
            'purchase',
            'return',
            'sự kiện bán hàng',
            'schema giao dịch',
          ],
        },
        {
          dimension: 'constraints',
          key: 'idempotency',
          answer:
            'Sales ingestion must dedupe by event_id/order_item_id and be replay-safe. Batch and stream jobs should produce the same rank snapshot if the same events are replayed.',
          discloseWhen: [
            'idempotency',
            'dedupe',
            'duplicate',
            'replay',
            'event id',
            'exactly once',
            'chống trùng',
            'idempotent',
            'replay event',
          ],
        },
        {
          dimension: 'data',
          key: 'category_membership',
          answer:
            'A product can belong to multiple categories. Maintain product-to-category mappings and decide whether ranks are computed for leaf categories only or also rolled up to ancestors.',
          discloseWhen: [
            'category',
            'multiple categories',
            'taxonomy',
            'leaf',
            'ancestor',
            'product category',
            'danh mục',
            'cây category',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core tables: sales_events, product_category_membership, category_rank_snapshot, product_rank_by_category, top_products_by_category, batch_run, and correction_events.',
          discloseWhen: [
            'schema',
            'data model',
            'tables',
            'rank table',
            'snapshot',
            'top k',
            'mô hình dữ liệu',
            'bảng rank',
          ],
        },
        {
          dimension: 'constraints',
          key: 'topk_storage',
          answer:
            'Store full per-product ranks in SQL/analytics tables, but serve top-K category leaderboards and product rank lookups from cache or precomputed snapshots.',
          discloseWhen: [
            'top k',
            'leaderboard',
            'sorted set',
            'rank lookup',
            'snapshot',
            'cache',
            'bảng xếp hạng',
            'top sản phẩm',
          ],
        },
        {
          dimension: 'constraints',
          key: 'batch_stream_hybrid',
          answer:
            'Hourly batch is acceptable for v1. During spikes, add a streaming hot path for recent deltas and keep the batch job as reconciliation/source-of-truth.',
          discloseWhen: [
            'batch',
            'stream',
            'near real time',
            'prime day',
            'reconciliation',
            'hourly',
            'xử lý batch',
            'xử lý stream',
          ],
        },
        {
          dimension: 'constraints',
          key: 'late_events_corrections',
          answer:
            'Returns, cancellations, payment failures, and late-arriving events must be modeled as correction events that can adjust historical windows and republish affected category snapshots.',
          discloseWhen: [
            'return',
            'refund',
            'cancellation',
            'late event',
            'correction',
            'backfill',
            'trả hàng',
            'hủy đơn',
            'event đến muộn',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Ranks are eventually consistent. Reads may show the previous snapshot until the next publish, but each snapshot should be internally consistent by category and versioned.',
          discloseWhen: [
            'consistency',
            'eventual',
            'snapshot',
            'stale',
            'version',
            'nhất quán',
            'snapshot cũ',
            'version rank',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Rank reads should continue serving the last good snapshot if the batch job, analytics database, or cache refresh fails. Failed ranking jobs must not publish partial snapshots.',
          discloseWhen: [
            'availability',
            'batch failure',
            'partial',
            'last good',
            'outage',
            'khả dụng',
            'batch lỗi',
            'snapshot tốt cuối',
          ],
        },
        {
          dimension: 'constraints',
          key: 'cache_publish',
          answer:
            'Publish rank snapshots with versioned keys or atomic cache swap. Avoid flushing all category ranks at once; update affected categories and keep old snapshot until new one is complete.',
          discloseWhen: [
            'cache',
            'publish',
            'invalidate',
            'atomic swap',
            'versioned key',
            'cache rank',
            'cập nhật cache',
            'xóa cache',
          ],
        },
        {
          dimension: 'data',
          key: 'storage_math',
          answer:
            'Rank data is small compared with raw transaction logs: millions of product-category rows per snapshot are manageable, while raw sales events should live in object storage/analytics for replay.',
          discloseWhen: [
            'storage',
            'capacity',
            'raw logs',
            'rank rows',
            'snapshot size',
            'dung lượng',
            'lưu event',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'fraud_inventory_pricing',
          answer:
            'Fraud detection, payment processing, inventory reservation, pricing, search relevance, and personalized recommendations are out of scope.',
          discloseWhen: [
            'fraud',
            'payment',
            'inventory',
            'pricing',
            'search relevance',
            'personalized',
            'gian lận',
            'thanh toán',
            'tồn kho',
            'giá',
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
      {
        id: 'sales_ingest',
        name: 'Sales event ingest',
        description:
          'Sales API receives purchase event -> raw event is archived -> durable rank source can be replayed by batch jobs',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'sales_api',
          'object_store',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'rank_cache_hit',
        name: 'Rank cache hit',
        description:
          'Product page requests rank -> read API returns category rank from cache without touching SQL',
        expectedNodeSequence: [
          'client',
          'cdn',
          'lb',
          'web_server',
          'read_api',
          'cache',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'snapshot_publish',
        name: 'Snapshot publish',
        description:
          'Batch job completes -> new rank snapshot is written -> cache is updated with versioned category keys',
        expectedNodeSequence: [
          'mapreduce',
          'analytics_db',
          'sql_master',
          'cache',
          'sql_replica',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'return_correction',
        name: 'Return or cancellation correction',
        description:
          'Return/cancellation event arrives -> affected sales windows are adjusted -> impacted category rank snapshot is republished',
        expectedNodeSequence: [
          'sales_api',
          'object_store',
          'mapreduce',
          'analytics_db',
          'sql_master',
          'cache',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'near_realtime_delta_overlay',
        name: 'Near-real-time delta overlay',
        description:
          'During traffic spikes, recent sales deltas are aggregated into hot category cache while hourly batch remains reconciliation source',
        expectedNodeSequence: [
          'sales_api',
          'object_store',
          'mapreduce',
          'analytics_db',
          'cache',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'category_topk_read',
        name: 'Category top-K read',
        description:
          'Category page requests best sellers -> read API serves precomputed top-K list for that category from cache or replica',
        expectedNodeSequence: [
          'client',
          'cdn',
          'lb',
          'web_server',
          'read_api',
          'cache',
          'sql_replica',
        ],
        required: false,
        priority: 8,
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
      {
        id: 'curve_late_returns',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'A batch of returns and cancellations arrives 3 days late for products that were top sellers. How do you correct historical windows and republish affected ranks?',
        expectedMitigations: [
          'model returns as correction events',
          'recompute affected time windows/categories',
          'versioned snapshot republish',
          'raw event replay from object storage',
        ],
        redFlags: [
          'sales events immutable with no correction path',
          'manual rank edits',
          'does not republish impacted categories',
        ],
      },
      {
        id: 'curve_category_reparenting',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'The category taxonomy changes and thousands of products move from one category subtree to another. How do you recompute ranks without breaking reads?',
        expectedMitigations: [
          'versioned product-category membership',
          'snapshot rebuild for affected categories',
          'atomic publish of new taxonomy/rank version',
          'old snapshot served until new one completes',
        ],
        redFlags: [
          'category membership overwritten with no history',
          'partial taxonomy visible to reads',
          'no backfill/recompute plan',
        ],
      },
      {
        id: 'curve_partial_snapshot_publish',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'Hourly MapReduce succeeds for 80% of categories and fails for the rest, but cache refresh starts anyway. How do you avoid serving mixed or partial rank snapshots?',
        expectedMitigations: [
          'batch run manifest',
          'snapshot versioning',
          'atomic publish after validation',
          'serve last good snapshot on failure',
        ],
        redFlags: [
          'cache updated category by category before validation',
          'no batch run status',
          'partial snapshot visible to users',
        ],
      },
      {
        id: 'curve_rank_cache_stampede',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'After the hourly rank publish, TTLs for popular category caches expire together and 40K reads/sec hit SQL replicas. How do you publish without a cache stampede?',
        expectedMitigations: [
          'versioned cache keys with atomic pointer swap',
          'prewarm hot category caches',
          'TTL jitter',
          'request coalescing',
          'do not flush all keys globally',
        ],
        redFlags: [
          'full cache flush every hour',
          'same TTL for every category',
          'read API falls through to SQL for all hot categories',
        ],
      },
      {
        id: 'curve_rank_gaming',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A seller appears to buy thousands of their own product to manipulate rank. Fraud detection is out of scope, but how should ranking ingestion stay replayable and allow downstream correction?',
        expectedMitigations: [
          'raw immutable event log',
          'event_type/correction support',
          'exclude flagged events through correction feed',
          'rank jobs replay from clean event set',
        ],
        redFlags: [
          'rank uses only mutable counters',
          'no audit trail for sales events',
          'cannot remove invalid events later',
        ],
      },
      {
        id: 'curve_hot_category_reads',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Electronics best-seller pages receive 100x normal traffic during a sale, while long-tail categories are quiet. How do cache/CDN and top-K storage handle this skew?',
        expectedMitigations: [
          'cache hot top-K category lists',
          'CDN cache public category pages when possible',
          'replicate hot cache keys',
          'precompute top-K snapshots',
          'rate limit abusive scraping',
        ],
        redFlags: [
          'database read for every category page',
          'no hot category detection',
          'same cache policy for hot and cold categories',
        ],
      },
      {
        id: 'curve_batch_cost_explosion',
        type: 'cost_pressure',
        targetNodeType: 'worker',
        scenarioTemplate:
          'Hourly batch recomputes every category from all historical sales and costs keep rising. How do you make computation incremental?',
        expectedMitigations: [
          'windowed aggregates',
          'incremental deltas by hour/category',
          'local top-K then merge',
          'only recompute affected categories',
          'cold raw event storage with compacted aggregates',
        ],
        redFlags: [
          'full historical scan every hour',
          'global sort of all products',
          'no aggregate checkpoints',
        ],
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
      {
        id: 'probe_sales_rank_formula',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['worker', 'database'],
        primaryQuestionTemplate:
          'What exactly is the rank score: raw units sold, revenue, recent velocity with decay, or a weighted blend? How do returns affect it?',
        expectedSignals: [
          'time-windowed sales velocity',
          'recent events weighted higher',
          'returns/cancellations subtract or correct score',
          'formula versioning',
        ],
        redFlags: [
          'lifetime sales only',
          'returns ignored',
          'formula changes without versioning',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Why might lifetime sales be a poor signal for a “best seller now” badge?',
          },
        ],
      },
      {
        id: 'probe_sales_event_idempotency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database', 'storage'],
        primaryQuestionTemplate:
          'A sales event is delivered twice and then a cancellation arrives late. How does ingestion stay replay-safe and correct?',
        expectedSignals: [
          'event_id/order_item_id uniqueness',
          'append raw immutable event',
          'correction event model',
          'idempotent aggregate updates',
          'replay from object storage',
        ],
        redFlags: [
          'blind counter increments',
          'no event identity',
          'cannot reverse invalid sales',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the same order item purchase event appears in two batch files?',
          },
        ],
      },
      {
        id: 'probe_sales_category_taxonomy',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'Products can belong to multiple categories and categories can be restructured. How do you version category membership and compute ranks for leaf and parent categories?',
        expectedSignals: [
          'product-category membership table',
          'taxonomy version',
          'leaf vs ancestor rollup decision',
          'affected category recompute',
          'atomic snapshot publish',
        ],
        redFlags: [
          'single category per product assumed',
          'taxonomy overwrite loses history',
          'partial category version served',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Would you rank a product independently in every category or derive parent category rank from children?',
          },
        ],
      },
      {
        id: 'probe_sales_snapshot_publish',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['database', 'cache', 'worker'],
        primaryQuestionTemplate:
          'How do you publish an hourly rank snapshot so users never see half old and half new ranks?',
        expectedSignals: [
          'batch run manifest/status',
          'snapshot version',
          'atomic pointer/cache swap',
          'validation before publish',
          'serve last good snapshot on failure',
        ],
        redFlags: [
          'updates visible rows in place while job runs',
          'no run validation',
          'global cache flush',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What exact key or table field tells the read API which snapshot version to serve?',
          },
        ],
      },
      {
        id: 'probe_sales_late_events',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['worker', 'database', 'storage'],
        primaryQuestionTemplate:
          'How do late-arriving purchases, returns, cancellations, and chargebacks update already-published rank windows?',
        expectedSignals: [
          'watermark or lateness policy',
          'correction events',
          'recompute affected windows/categories',
          'republish versioned snapshots',
          'audit trail',
        ],
        redFlags: [
          'late events dropped silently',
          'manual rank edits',
          'no affected-window recomputation',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How far back would you allow corrections before using a slower backfill path?',
          },
        ],
      },
      {
        id: 'probe_sales_stream_batch_hybrid',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['worker', 'cache', 'database'],
        primaryQuestionTemplate:
          'Prime Day requires fresher ranks than hourly batch. What does the streaming delta path compute, and how does batch reconcile it later?',
        expectedSignals: [
          'streaming recent deltas',
          'hot category overlay in cache',
          'batch as source-of-truth reconciliation',
          'bounded inaccuracy/staleness',
          'backpressure during spikes',
        ],
        redFlags: [
          'stream and batch produce incompatible results',
          'no reconciliation',
          'claims exact real-time global ranks cheaply',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What freshness/error bound would you expose internally during Prime Day?',
          },
        ],
      },
      {
        id: 'probe_sales_topk_algorithm',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['worker', 'database', 'cache'],
        primaryQuestionTemplate:
          'For millions of products and hundreds of categories, how do you compute top-K without sorting all product-category rows on one machine?',
        expectedSignals: [
          'local aggregation',
          'partition by product/category',
          'local top-K then global merge',
          'min-heap or sorted-set style merge',
          'avoid single reducer hot spot',
        ],
        redFlags: [
          'global sort on one reducer',
          'single category shard bottleneck',
          'no local pre-aggregation',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If each category has 10M products, how much data should each reducer see before emitting top 100?',
          },
        ],
      },
      {
        id: 'probe_sales_read_cache',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'database', 'service'],
        primaryQuestionTemplate:
          'At 40K rank reads/sec, what is cached for product pages versus category best-seller pages, and how do you update cache after publish?',
        expectedSignals: [
          'product rank lookup cache',
          'top-K category list cache',
          'versioned keys/atomic swap',
          'prewarm hot categories',
          'SQL replica fallback',
        ],
        redFlags: [
          'read SQL for every product page',
          'full cache flush hourly',
          'no hot category prewarm',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which cache entries can use CDN because they are public, and which should stay behind the read API?',
          },
        ],
      },
      {
        id: 'probe_sales_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['worker', 'cache', 'database'],
        primaryQuestionTemplate:
          'What dashboards prove rank computation is fresh, complete, correct, and cheap enough?',
        expectedSignals: [
          'batch duration and success by category',
          'snapshot age/version',
          'event ingestion lag',
          'late/correction event volume',
          'cache hit rate and hot categories',
          'rank churn/anomaly metrics',
        ],
        redFlags: [
          'only monitors read API latency',
          'no snapshot completeness metric',
          'no ingestion lag visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If sellers complain ranks are stale, which metric do you inspect first?',
          },
        ],
      },
      {
        id: 'probe_sales_cost_retention',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['storage', 'worker', 'database'],
        primaryQuestionTemplate:
          'How do you keep raw sales logs replayable for audits while avoiding a full historical scan every hour?',
        expectedSignals: [
          'raw immutable logs in object storage',
          'compacted hourly/category aggregates',
          'incremental recompute',
          'cold storage lifecycle',
          'batch checkpoints',
        ],
        redFlags: [
          'full history scan every hour',
          'raw logs deleted before reconciliation window',
          'no aggregate checkpointing',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which data must stay online for rank reads versus only available for offline replay?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Evolve a simple web app into an AWS architecture with CDN, load balancing, stateless app servers, cache, RDS, object storage, queues, workers, and analytics.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'aws',
            'scale',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'constraints',
          key: 'stateless_app_tier',
          answer:
            'App servers should be stateless: sessions live in cookies/cache, uploaded files go to S3, and each request can be served by any healthy instance behind the load balancer.',
          discloseWhen: [
            'stateless',
            'session',
            'sticky session',
            'app server',
            'load balancer',
            'phi trạng thái',
            'session',
            'máy chủ app',
          ],
        },
        {
          dimension: 'constraints',
          key: 'multi_az',
          answer:
            'For 99.99% availability, deploy app servers across multiple Availability Zones, use Multi-AZ RDS for failover, and avoid single-AZ dependencies in the hot path.',
          discloseWhen: [
            'multi az',
            'availability zone',
            'az',
            'failover',
            'ha',
            '99.99',
            'nhiều az',
            'vùng sẵn sàng',
            'chuyển đổi dự phòng',
          ],
        },
        {
          dimension: 'constraints',
          key: 'cdn_static',
          answer:
            'Static assets should be served from S3 through CloudFront with long cache TTLs and versioned filenames; dynamic personalized responses stay behind the app tier.',
          discloseWhen: [
            'cdn',
            'cloudfront',
            's3',
            'static',
            'asset',
            'ttl',
            'cache static',
            'tài nguyên tĩnh',
          ],
        },
        {
          dimension: 'constraints',
          key: 'cache_strategy',
          answer:
            'Use cache-aside for hot read-heavy data. Apply TTLs, targeted invalidation, request coalescing for hot misses, and monitor backend amplification when hit rate drops.',
          discloseWhen: [
            'cache',
            'elasticache',
            'redis',
            'cache aside',
            'hit rate',
            'invalidation',
            'cache miss',
            'bộ nhớ đệm',
          ],
        },
        {
          dimension: 'constraints',
          key: 'database_scaling_path',
          answer:
            'Scale SQL reads with replicas and indexes first; scale writes with schema/index cleanup, batching, vertical scaling, partitioning/sharding, CQRS, or moving hot access patterns to a purpose-built store.',
          discloseWhen: [
            'database scaling',
            'rds',
            'read replica',
            'write scaling',
            'sharding',
            'partition',
            'cqrs',
            'mở rộng database',
            'mở rộng ghi',
          ],
        },
        {
          dimension: 'constraints',
          key: 'connection_pooling',
          answer:
            'Use connection pooling/RDS Proxy so autoscaled app instances do not create unbounded database connections during traffic spikes or deploys.',
          discloseWhen: [
            'connection',
            'pool',
            'rds proxy',
            'db connection',
            'database connection',
            'kết nối db',
            'pool kết nối',
          ],
        },
        {
          dimension: 'scope',
          key: 'async_jobs',
          answer:
            'Non-critical work such as emails, image processing, reports, exports, and analytics ETL should go through SQS and workers with retries and DLQs.',
          discloseWhen: [
            'async',
            'queue',
            'sqs',
            'worker',
            'email',
            'report',
            'dlq',
            'bất đồng bộ',
            'hàng đợi',
          ],
        },
        {
          dimension: 'nfr',
          key: 'backpressure',
          answer:
            'Traffic spikes should be absorbed with autoscaling, queue buffering, rate limits, graceful degradation, and clear overload behavior rather than unlimited concurrency.',
          discloseWhen: [
            'backpressure',
            'overload',
            'traffic spike',
            'rate limit',
            'queue buffer',
            'quá tải',
            'tăng traffic',
            'giảm tải',
          ],
        },
        {
          dimension: 'constraints',
          key: 'deployments',
          answer:
            'Use rolling/canary/blue-green deployments with health checks, connection draining, automatic rollback, and backward-compatible app/API/database changes.',
          discloseWhen: [
            'deploy',
            'deployment',
            'blue green',
            'rolling',
            'canary',
            'rollback',
            'zero downtime',
            'triển khai',
            'không downtime',
          ],
        },
        {
          dimension: 'constraints',
          key: 'db_migrations',
          answer:
            'Database migrations must be expand-and-contract: add nullable columns/indexes first, deploy code that reads both formats, backfill safely, then remove old fields later.',
          discloseWhen: [
            'migration',
            'schema change',
            'database migration',
            'backfill',
            'expand contract',
            'thay đổi schema',
            'migration db',
          ],
        },
        {
          dimension: 'nfr',
          key: 'disaster_recovery',
          answer:
            'Define RPO/RTO explicitly. Backups, PITR, cross-AZ failover, and tested restore drills are required; multi-region active-active is a later, higher-cost step.',
          discloseWhen: [
            'rpo',
            'rto',
            'backup',
            'restore',
            'disaster recovery',
            'dr',
            'khôi phục',
            'sao lưu',
          ],
        },
        {
          dimension: 'nfr',
          key: 'observability',
          answer:
            'Expose request latency/error rate, ALB target health, autoscaling events, cache hit rate, RDS CPU/IO/connection count/replica lag, queue age, worker failures, and cost metrics.',
          discloseWhen: [
            'metrics',
            'monitoring',
            'observability',
            'cloudwatch',
            'logs',
            'alarm',
            'giám sát',
            'metric',
          ],
        },
        {
          dimension: 'data',
          key: 'data_lifecycle',
          answer:
            'Separate hot OLTP data in RDS, static/cold objects in S3 lifecycle tiers, and analytics data in Redshift or object storage. Do not run heavy analytics on the primary database.',
          discloseWhen: [
            'data lifecycle',
            'hot cold',
            'analytics',
            'redshift',
            'archive',
            'retention',
            'vòng đời dữ liệu',
            'lưu trữ lạnh',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'global_active_active',
          answer:
            'Global active-active, complex multi-region writes, and full microservice decomposition are out of scope for the first scalable version.',
          discloseWhen: [
            'multi region',
            'active active',
            'global',
            'microservices',
            'đa vùng',
            'toàn cầu',
            'microservice',
          ],
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
      {
        id: 'static_asset_request',
        name: 'Static asset request',
        description:
          'Browser requests static asset -> CloudFront serves from edge cache or fetches origin from S3',
        expectedNodeSequence: ['client', 'dns', 'cdn', 's3'],
        required: false,
        priority: 3,
      },
      {
        id: 'dynamic_read_cache_hit',
        name: 'Dynamic read cache hit',
        description:
          'User request reaches app server -> hot data found in ElastiCache -> response returns without RDS read',
        expectedNodeSequence: ['client', 'dns', 'lb', 'app_servers', 'cache'],
        required: false,
        priority: 4,
      },
      {
        id: 'dynamic_read_cache_miss',
        name: 'Dynamic read cache miss',
        description:
          'Cache miss -> app server reads RDS replica -> writes hot result back to cache',
        expectedNodeSequence: [
          'client',
          'lb',
          'app_servers',
          'cache',
          'rds_replica',
          'cache',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'write_request',
        name: 'Write request',
        description:
          'User write is validated by app server -> committed to RDS primary -> relevant cache entries are invalidated',
        expectedNodeSequence: [
          'client',
          'lb',
          'app_servers',
          'rds_master',
          'cache',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'rds_replication_failover',
        name: 'RDS replication and failover',
        description:
          'Primary writes replicate to read replicas; on primary/AZ failure, Multi-AZ failover promotes standby and app reconnects through pooled connections',
        expectedNodeSequence: [
          'rds_master',
          'rds_replica',
          'app_servers',
          'rds_master',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'autoscaling_flow',
        name: 'Autoscaling flow',
        description:
          'CloudWatch/target tracking observes load -> ASG adds app instances -> load balancer sends traffic after health checks and warmup',
        expectedNodeSequence: ['lb', 'app_servers', 'cache', 'rds_replica'],
        required: false,
        priority: 8,
      },
      {
        id: 'zero_downtime_deploy',
        name: 'Zero-downtime deploy',
        description:
          'New app version is rolled/canary/blue-green deployed -> health checks pass -> traffic shifts -> old version drains and can roll back',
        expectedNodeSequence: ['lb', 'app_servers', 'cache', 'rds_master'],
        required: false,
        priority: 9,
      },
      {
        id: 'analytics_etl',
        name: 'Analytics ETL',
        description:
          'Worker exports cold events/files to S3 -> analytics pipeline loads Redshift without touching OLTP read path',
        expectedNodeSequence: [
          'app_servers',
          'sqs',
          'worker',
          's3',
          'redshift',
        ],
        required: false,
        priority: 10,
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
      {
        id: 'curve_single_az_outage',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'One Availability Zone goes down during peak traffic. Which components fail over automatically, what capacity remains, and what user impact do you expect?',
        expectedMitigations: [
          'app servers distributed across AZs',
          'load balancer removes unhealthy targets',
          'RDS Multi-AZ failover',
          'N+1 capacity planning',
          'connection retry with backoff',
        ],
        redFlags: [
          'all app servers in one AZ',
          'RDS single-AZ primary only',
          'no capacity headroom after AZ loss',
        ],
      },
      {
        id: 'curve_cache_stampede_aws',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A deploy clears a hot ElastiCache namespace and 40K QPS suddenly hits RDS. How do you prevent cache stampede and database collapse?',
        expectedMitigations: [
          'avoid global cache flush',
          'request coalescing/single-flight',
          'TTL jitter and prewarming',
          'serve stale data briefly',
          'rate limit or shed low-priority traffic',
        ],
        redFlags: [
          'flush all cache on every deploy',
          'every miss queries RDS',
          'no backend protection',
        ],
      },
      {
        id: 'curve_connection_storm',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'Autoscaling adds 200 app instances in 3 minutes, and each opens 100 database connections. RDS hits max_connections. What changes?',
        expectedMitigations: [
          'connection pooling/RDS Proxy',
          'cap per-instance DB connections',
          'scale out gradually with warmup',
          'backpressure and queue writes',
          'separate read and write pools',
        ],
        redFlags: [
          'unbounded connection pools',
          'autoscaling ignores database capacity',
          'retry storm on connection failure',
        ],
      },
      {
        id: 'curve_sqs_backlog',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'SQS queue age grows to 45 minutes because workers cannot keep up with image processing and report jobs. What do you scale, prioritize, or shed?',
        expectedMitigations: [
          'scale workers by queue age',
          'separate queues by priority',
          'DLQ for poison jobs',
          'idempotent worker retries',
          'user-facing async status',
        ],
        redFlags: [
          'single queue for all workloads',
          'no DLQ',
          'user request blocks waiting for job completion',
        ],
      },
      {
        id: 'curve_bad_db_migration',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'A zero-downtime deploy includes a blocking ALTER TABLE on a hot table and locks writes for minutes. How should schema migrations be designed?',
        expectedMitigations: [
          'expand-and-contract migrations',
          'backfill in batches',
          'online index creation',
          'backward-compatible code',
          'separate migration rollout and app deploy',
        ],
        redFlags: [
          'blocking migration in request path',
          'app requires old and new schema switch atomically',
          'no rollback/forward plan',
        ],
      },
      {
        id: 'curve_restore_drill_fails',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'A production table is accidentally truncated. Backups exist, but the restore drill has never been tested. What are your RPO/RTO and recovery steps?',
        expectedMitigations: [
          'PITR backups',
          'tested restore runbook',
          'restore to new instance and validate',
          'audit and limit destructive privileges',
          'clear RPO/RTO',
        ],
        redFlags: [
          'backups assumed without restore test',
          'restore directly over production blindly',
          'no RPO/RTO defined',
        ],
      },
      {
        id: 'curve_cloud_cost_spike',
        type: 'cost_pressure',
        targetNodeType: 'service',
        scenarioTemplate:
          'AWS bill doubles after launch: oversized EC2, low cache hit rate, huge NAT/data transfer, and always-on workers. Where do you look first?',
        expectedMitigations: [
          'cost dashboards by service',
          'rightsizing and autoscaling policies',
          'CDN/cache hit rate tuning',
          'S3 lifecycle policies',
          'worker scale-to-zero or scheduled scaling',
        ],
        redFlags: [
          'no cost allocation tags',
          'only reduces instance count blindly',
          'ignores data transfer/NAT costs',
        ],
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
      {
        id: 'probe_aws_multi_az',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'For 99.99% availability, walk me through what happens when one Availability Zone fails.',
        expectedSignals: [
          'ALB removes unhealthy targets',
          'app servers in multiple AZs',
          'RDS Multi-AZ failover',
          'capacity headroom after AZ loss',
          'retry/backoff on reconnect',
        ],
        redFlags: [
          'single-AZ app tier',
          'manual failover only',
          'no capacity planning for AZ loss',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'How much spare capacity do you need if you run across three AZs and lose one?',
          },
        ],
      },
      {
        id: 'probe_aws_cache_strategy',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'Which data is cached, what is the invalidation strategy, and how do you prevent a cache miss storm from overloading RDS?',
        expectedSignals: [
          'cache-aside with TTL',
          'targeted invalidation',
          'request coalescing',
          'TTL jitter/prewarming',
          'backend amplification metric',
        ],
        redFlags: [
          'flushes whole cache',
          'every miss goes directly to RDS',
          'no hit-rate or miss-amplification monitoring',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'When would you serve stale cached data to protect availability?',
          },
        ],
      },
      {
        id: 'probe_aws_write_scaling',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'Read replicas solve read load. What is your staged plan when write QPS and RDS I/O are the bottleneck?',
        expectedSignals: [
          'remove expensive indexes/queries',
          'batch writes where safe',
          'vertical scaling as short-term',
          'partition/shard by stable key',
          'CQRS or purpose-built store for hot paths',
        ],
        redFlags: [
          'add read replicas for write bottleneck',
          'sharding with no key/transaction story',
          'no connection pool consideration',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What business transactions become harder once you shard by user_id?',
          },
        ],
      },
      {
        id: 'probe_aws_deploy_migrations',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Describe a zero-downtime deploy that includes a database schema change.',
        expectedSignals: [
          'backward-compatible app changes',
          'expand-and-contract migration',
          'batch backfill',
          'health checks and rollback',
          'connection draining',
        ],
        redFlags: [
          'blocking ALTER on hot table',
          'requires all services switch instantly',
          'rollback ignores schema compatibility',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What are the exact steps to rename a hot column without downtime?',
          },
        ],
      },
      {
        id: 'probe_aws_sqs_workers',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'worker'],
        primaryQuestionTemplate:
          'How do SQS and workers handle retries, duplicate messages, poison jobs, and priority workloads?',
        expectedSignals: [
          'idempotent jobs',
          'visibility timeout',
          'DLQ',
          'queue age based scaling',
          'separate queues by priority',
        ],
        redFlags: [
          'assumes exactly-once queue processing',
          'no DLQ',
          'one queue for all criticality levels',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you users will start noticing async job delays?',
          },
        ],
      },
      {
        id: 'probe_aws_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'cache', 'database', 'queue'],
        primaryQuestionTemplate:
          'What are the first dashboards and alarms you create before handling 40K QPS?',
        expectedSignals: [
          'request rate/error/latency',
          'ALB target health',
          'cache hit rate and latency',
          'RDS CPU/IO/connections/replica lag',
          'SQS queue age/DLQ count',
          'cost by service',
        ],
        redFlags: [
          'only watches CPU',
          'no user-visible SLOs',
          'no dependency metrics',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If p99 jumps from 200ms to 2s, how do you tell whether app, cache, DB, or queue is responsible?',
          },
        ],
      },
      {
        id: 'probe_aws_disaster_recovery',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['database', 'storage'],
        primaryQuestionTemplate:
          'Define RPO/RTO for this system and explain how backups, PITR, restore drills, and cross-AZ failover meet them.',
        expectedSignals: [
          'RPO/RTO stated explicitly',
          'PITR and regular backups',
          'restore to separate environment',
          'tested runbooks',
          'least-privilege destructive access',
        ],
        redFlags: [
          'backups never restored',
          'no recovery objective',
          'manual ad-hoc recovery',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What changes if the business requires 5-minute RTO instead of 1-hour RTO?',
          },
        ],
      },
      {
        id: 'probe_aws_cost_controls',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['service', 'cache', 'database', 'storage'],
        primaryQuestionTemplate:
          'At 10M DAU, where do AWS costs usually hide, and what controls keep cost from scaling faster than traffic?',
        expectedSignals: [
          'cost allocation tags/budgets',
          'rightsizing and autoscaling',
          'data transfer/NAT awareness',
          'CDN/cache hit rate',
          'S3 lifecycle policies',
          'worker scale policies',
        ],
        redFlags: [
          'no cost dashboard',
          'ignores network transfer',
          'keeps all cold data in hot stores',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which cost metric would reveal that CDN cache misses are causing expensive origin/data-transfer traffic?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Given two user IDs, find the shortest mutual-connection path up to 6 degrees using a sharded social graph and return the path if one exists.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'shortest path',
            'connection path',
            'tính năng',
            'chức năng',
            'đường đi ngắn nhất',
          ],
        },
        {
          dimension: 'constraints',
          key: 'algorithm',
          answer:
            'Use bidirectional BFS from source and target. Expand the smaller frontier each step, stop when frontiers meet, and cap search at depth 6.',
          discloseWhen: [
            'algorithm',
            'bfs',
            'bidirectional',
            'frontier',
            'meet',
            'depth',
            'thuật toán',
            'hai chiều',
            'frontier',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Store adjacency lists by user_id, with edge metadata such as created_at, status, privacy visibility, and version. For an undirected graph, store both directions or maintain a symmetric edge table with fast adjacency materialization.',
          discloseWhen: [
            'schema',
            'data model',
            'adjacency',
            'edge',
            'friend list',
            'graph table',
            'mô hình dữ liệu',
            'danh sách bạn',
            'cạnh graph',
          ],
        },
        {
          dimension: 'constraints',
          key: 'sharding',
          answer:
            'Shard adjacency lists by user_id with a lookup service. BFS must issue parallel batched neighbor fetches per shard rather than sequential cross-shard calls.',
          discloseWhen: [
            'shard',
            'partition',
            'lookup service',
            'cross shard',
            'neighbor fetch',
            'chia shard',
            'phân vùng',
            'lookup',
          ],
        },
        {
          dimension: 'constraints',
          key: 'supernodes',
          answer:
            'High-degree users must be bounded with degree caps, hub-aware expansion, precomputed hub indexes, or skip rules; expanding a 50M-degree node in online BFS is not acceptable.',
          discloseWhen: [
            'supernode',
            'celebrity',
            'high degree',
            'hub',
            'large friend list',
            'người nổi tiếng',
            'node lớn',
            'bậc cao',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Shortest path queries may use slightly stale graph snapshots. Friend add/remove should eventually update adjacency and caches; privacy/block removals should be reflected faster than ordinary edge freshness.',
          discloseWhen: [
            'consistency',
            'stale',
            'snapshot',
            'friend add',
            'friend remove',
            'privacy',
            'nhất quán',
            'graph cũ',
            'xóa bạn',
          ],
        },
        {
          dimension: 'constraints',
          key: 'visited_state',
          answer:
            'Each BFS request needs bounded visited sets and parent pointers for path reconstruction. Store them in request memory or short-lived distributed state with strict limits.',
          discloseWhen: [
            'visited',
            'parent',
            'path reconstruction',
            'memory',
            'state',
            'visited set',
            'truy vết đường đi',
            'bộ nhớ bfs',
          ],
        },
        {
          dimension: 'constraints',
          key: 'caching',
          answer:
            'Cache hot adjacency lists, negative results for short TTL, and popular pair/path results carefully. Invalidate or version caches when edges or privacy status change.',
          discloseWhen: [
            'cache',
            'hot path',
            'adjacency cache',
            'negative cache',
            'path cache',
            'cache graph',
            'cache đường đi',
          ],
        },
        {
          dimension: 'constraints',
          key: 'privacy_filters',
          answer:
            'Blocked users, private profiles, deleted accounts, and visibility rules must be checked before returning a path, even if the graph search found a structural path.',
          discloseWhen: [
            'privacy',
            'block',
            'private',
            'visibility',
            'deleted account',
            'acl',
            'riêng tư',
            'chặn',
            'ẩn hồ sơ',
          ],
        },
        {
          dimension: 'scope',
          key: 'path_response',
          answer:
            'Return one shortest path, not all possible paths. If no path is found within 6 degrees or within the latency budget, return no path or a partial/timeout-safe response.',
          discloseWhen: [
            'all paths',
            'one path',
            'response',
            'timeout',
            'no path',
            'kết quả',
            'một đường đi',
            'không có đường',
          ],
        },
        {
          dimension: 'scale',
          key: 'fanout_math',
          answer:
            'Naive BFS explodes quickly: with average degree 50, depth 4 already has millions of frontier candidates before dedupe. Bidirectional BFS and caps are mandatory.',
          discloseWhen: [
            'branching factor',
            'fanout',
            'degree',
            'complexity',
            'math',
            'bùng nổ bfs',
            'độ phức tạp',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'The graph query should degrade by returning cached paths, shallow search, timeout/no-path, or partial results instead of overloading graph shards.',
          discloseWhen: [
            'availability',
            'timeout',
            'degrade',
            'overload',
            'partial',
            'khả dụng',
            'quá tải',
            'timeout',
          ],
        },
        {
          dimension: 'data',
          key: 'precomputation',
          answer:
            'Precompute or cache landmark/hub paths, connected components, and high-degree neighbor summaries offline to accelerate common queries without storing every pair path.',
          discloseWhen: [
            'precompute',
            'offline',
            'landmark',
            'hub',
            'connected component',
            'tính trước',
            'tiền xử lý',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'recommendations',
          answer:
            'People-you-may-know recommendations, graph embeddings, feed ranking, and follower/following directed graph semantics are out of scope.',
          discloseWhen: [
            'recommendation',
            'people you may know',
            'embedding',
            'ranking',
            'feed',
            'gợi ý kết bạn',
            'xếp hạng',
          ],
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
      {
        id: 'path_cache_hit',
        name: 'Path cache hit',
        description:
          'Search API finds a fresh cached path or cached no-path result and returns without graph shard traversal',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'search_api',
          'cache',
        ],
        required: false,
        priority: 2,
      },
      {
        id: 'bidirectional_bfs',
        name: 'Bidirectional BFS',
        description:
          'Graph service expands the smaller frontier from source and target sides until frontiers meet or depth/time budget is exhausted',
        expectedNodeSequence: [
          'search_api',
          'user_graph_svc',
          'lookup_service',
          'person_shard_1',
          'person_shard_2',
          'person_shard_n',
          'cache',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'batched_neighbor_fetch',
        name: 'Batched neighbor fetch',
        description:
          'BFS frontier user IDs are grouped by owner shard -> shard requests run in parallel -> adjacency lists return to graph service',
        expectedNodeSequence: [
          'user_graph_svc',
          'lookup_service',
          'person_shard_1',
          'person_shard_2',
          'person_shard_n',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'edge_update',
        name: 'Friend edge update',
        description:
          'Mutual connection is added or removed -> both adjacency directions update -> affected adjacency/path caches are invalidated',
        expectedNodeSequence: [
          'client',
          'lb',
          'web_server',
          'user_graph_svc',
          'person_shard_1',
          'person_shard_2',
          'cache',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'privacy_filtered_path',
        name: 'Privacy-filtered path',
        description:
          'Graph search finds structural path -> service checks block/private/deleted visibility -> returns only allowed path',
        expectedNodeSequence: [
          'user_graph_svc',
          'lookup_service',
          'person_shard_1',
          'nosql',
          'search_api',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'offline_precompute',
        name: 'Offline precompute',
        description:
          'Background process summarizes hubs/components/popular paths -> cached hints speed up online BFS',
        expectedNodeSequence: [
          'person_shard_1',
          'person_shard_2',
          'person_shard_n',
          'nosql',
          'cache',
        ],
        required: false,
        priority: 7,
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
      {
        id: 'curve_privacy_blocked_path',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'BFS finds A -> B -> C -> Target, but B has blocked the requester and C has a private profile. How do you prevent leaking hidden relationships?',
        expectedMitigations: [
          'privacy filter before returning path',
          'block/private metadata lookup',
          'cache path keyed by viewer/version',
          'fast invalidation on privacy changes',
        ],
        redFlags: [
          'returns structural path without ACL checks',
          'global path cache ignores viewer',
          'privacy changes wait for long TTL',
        ],
      },
      {
        id: 'curve_shard_hotspot',
        type: 'scale_spike',
        targetNodeType: 'database',
        scenarioTemplate:
          'A shard owns many high-degree users and receives 10x more neighbor fetches than other shards during BFS. How do you rebalance or protect it?',
        expectedMitigations: [
          'virtual shards/consistent hashing',
          'replicate hot adjacency lists',
          'degree-aware partitioning',
          'frontier caps and timeout budget',
          'per-shard circuit breaker',
        ],
        redFlags: [
          'uniform user_id sharding assumed enough',
          'no per-shard metrics',
          'one slow shard blocks entire query',
        ],
      },
      {
        id: 'curve_cache_stale_after_unfriend',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Two users unfriend, but a cached path still shows them connected for an hour. How do you bound stale paths and invalidate affected cache entries?',
        expectedMitigations: [
          'edge version in path cache key',
          'short TTL for path caches',
          'invalidate adjacency cache on edge update',
          'privacy/delete checks at response time',
        ],
        redFlags: [
          'path cache has no version/TTL',
          'edge update does not invalidate cache',
          'stale private path is returned',
        ],
      },
      {
        id: 'curve_frontier_memory_blowup',
        type: 'scale_spike',
        targetNodeType: 'service',
        scenarioTemplate:
          'A query between two distant users creates a BFS frontier with tens of millions of candidates and the graph service runs out of memory. What limits do you enforce?',
        expectedMitigations: [
          'bidirectional BFS',
          'expand smaller frontier',
          'frontier size cap',
          'depth/time budget',
          'visited set memory limit',
          'return timeout/no path safely',
        ],
        redFlags: [
          'unbounded visited set',
          'keeps searching past latency budget',
          'no partial failure behavior',
        ],
      },
      {
        id: 'curve_disconnected_components',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'Most queries are between users in disconnected graph components. Can you answer no-path quickly without doing BFS every time?',
        expectedMitigations: [
          'connected component IDs',
          'negative cache with TTL/version',
          'offline component recomputation',
          'component check before BFS',
        ],
        redFlags: [
          'runs full BFS for obvious no-path',
          'negative cache never invalidated',
          'no component metadata',
        ],
      },
      {
        id: 'curve_edge_update_race',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'A mutual friend edge is stored on two endpoint shards. One shard update succeeds and the other fails. How do you avoid asymmetric graph state?',
        expectedMitigations: [
          'idempotent edge update workflow',
          'outbox/retry for second direction',
          'edge status/version',
          'repair job for asymmetric edges',
          'read-time consistency check when needed',
        ],
        redFlags: [
          'two-shard write assumed atomic',
          'no repair for half-written edges',
          'BFS sees asymmetric friendships forever',
        ],
      },
      {
        id: 'curve_graph_query_abuse',
        type: 'cost_pressure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A scraper issues expensive path queries to random high-degree users and consumes graph shard capacity. How do you protect the service?',
        expectedMitigations: [
          'per-user/IP rate limits',
          'query cost budget',
          'frontier expansion limits',
          'cache negative/hot results',
          'abuse detection and throttling',
        ],
        redFlags: [
          'every query gets unlimited BFS',
          'no cost-based throttling',
          'no abuse visibility',
        ],
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
      {
        id: 'probe_graph_bidirectional_bfs',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Why is bidirectional BFS the default here, and how do you decide which frontier to expand next?',
        expectedSignals: [
          'search from both source and target',
          'expand smaller frontier',
          'stop when frontiers intersect',
          'depth/time/frontier caps',
          'parent pointers for reconstruction',
        ],
        redFlags: [
          'unidirectional BFS to depth 6',
          'expands all neighbors blindly',
          'no path reconstruction state',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'With branching factor 100, compare rough node visits for depth 6 unidirectional versus bidirectional BFS.',
          },
        ],
      },
      {
        id: 'probe_graph_neighbor_fetch',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'A frontier contains 50,000 users across many shards. How do you batch, parallelize, timeout, and merge neighbor fetches?',
        expectedSignals: [
          'group user IDs by shard',
          'parallel batched RPCs',
          'per-shard timeout/budget',
          'dedupe visited users',
          'do not block forever on one shard',
        ],
        redFlags: [
          'one RPC per user',
          'sequential shard calls',
          'single slow shard stalls query indefinitely',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What do you return if one shard times out but the overall query latency budget is almost exhausted?',
          },
        ],
      },
      {
        id: 'probe_graph_supernodes',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'What is your explicit policy for users with millions of connections during BFS?',
        expectedSignals: [
          'degree cap or hub-aware expansion',
          'precomputed hub summaries',
          'skip/truncate high-degree nodes when safe',
          'explain accuracy trade-off',
        ],
        redFlags: [
          'fetches full 50M adjacency list',
          'no high-degree metric',
          'silently returns non-shortest path without caveat',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If you skip high-degree nodes, can you still guarantee the true shortest path?',
          },
        ],
      },
      {
        id: 'probe_graph_privacy_acl',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database', 'cache'],
        primaryQuestionTemplate:
          'How do block lists, private profiles, deleted users, and viewer-specific visibility affect BFS and cached paths?',
        expectedSignals: [
          'viewer-specific filtering',
          'privacy metadata lookup',
          'path cache keyed by viewer/visibility version',
          'fast invalidation for block/delete changes',
        ],
        redFlags: [
          'global path cache for everyone',
          'privacy checked only at write time',
          'blocked relationships leaked in paths',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if a user blocks someone after a path involving them is cached?',
          },
        ],
      },
      {
        id: 'probe_graph_cache_strategy',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'What exactly do you cache: adjacency lists, no-path results, full paths, connected components, or all of the above?',
        expectedSignals: [
          'hot adjacency cache',
          'short-lived path cache',
          'negative cache with graph version',
          'connected component/hub hints',
          'invalidate on edge/privacy changes',
        ],
        redFlags: [
          'cache every pair path indefinitely',
          'negative cache never expires',
          'cache ignores graph mutations',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which cache gives the best latency improvement per byte of memory?',
          },
        ],
      },
      {
        id: 'probe_graph_edge_updates',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'For an undirected edge stored on both endpoint shards, how do you handle add/remove idempotency, partial failure, and repair?',
        expectedSignals: [
          'edge status/version',
          'idempotent writes',
          'outbox/retry workflow',
          'repair job for asymmetric edges',
          'cache invalidation',
        ],
        redFlags: [
          'assumes cross-shard atomic transaction',
          'no reconciliation job',
          'delete can leave ghost edge',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Walk through a friend remove where shard A succeeds and shard B times out.',
          },
        ],
      },
      {
        id: 'probe_graph_components_precompute',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'cache'],
        primaryQuestionTemplate:
          'Can connected component IDs, landmarks, or hub summaries speed up no-path and common-path queries?',
        expectedSignals: [
          'component ID precheck',
          'landmark/hub indexes',
          'offline recomputation cadence',
          'cache versioning',
          'not storing every pair path',
        ],
        redFlags: [
          'precompute all-pairs shortest paths',
          'component IDs never update',
          'no offline/online separation',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What do you do with component IDs immediately after a new edge connects two previously separate components?',
          },
        ],
      },
      {
        id: 'probe_graph_memory_cost',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'Estimate memory for visited sets, parent pointers, adjacency cache, and path cache under 400 BFS queries/sec.',
        expectedSignals: [
          'bounded visited set per request',
          'parent pointer memory',
          'frontier cap',
          'cache admission policy',
          'request timeout protects memory',
        ],
        redFlags: [
          'unbounded per-request memory',
          'stores huge frontiers in global cache',
          'no admission policy for path cache',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If one query visits 1M users and stores parent pointers, what is the rough memory footprint?',
          },
        ],
      },
      {
        id: 'probe_graph_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'database', 'cache'],
        primaryQuestionTemplate:
          'Which metrics show graph search is fast, accurate enough, and not overloading shards?',
        expectedSignals: [
          'query latency by depth',
          'frontier size and visited count',
          'per-shard neighbor fetch latency/error',
          'supernode expansion count',
          'cache hit rate',
          'timeout/no-path rate',
        ],
        redFlags: [
          'only total QPS monitored',
          'no per-shard visibility',
          'no query complexity metrics',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you a small number of supernodes is dominating query cost?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support persistent connections, 1-to-1 and group messaging, durable message storage, online delivery, offline sync, presence, read receipts, and media upload/download.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'chat',
            'message',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'scope',
          key: 'connection_model',
          answer:
            'Clients maintain persistent WebSocket connections through L4 load balancers to WebSocket servers. Connection manager maps user/device IDs to currently connected server IDs with TTL heartbeats.',
          discloseWhen: [
            'websocket',
            'connection',
            'persistent',
            'load balancer',
            'connection manager',
            'heartbeat',
            'kết nối',
            'ws',
            'heartbeat',
          ],
        },
        {
          dimension: 'data',
          key: 'message_id_sequence',
          answer:
            'Each message needs a globally unique message_id plus a monotonic per-conversation sequence number for ordering, replay, receipts, and idempotent client retries.',
          discloseWhen: [
            'message id',
            'sequence',
            'ordering',
            'idempotency',
            'retry',
            'dedupe',
            'thứ tự tin nhắn',
            'seq',
            'chống trùng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'ordering',
          answer:
            'Guarantee ordering within a conversation, not globally across all chats. Partition or serialize writes by conversation_id where possible.',
          discloseWhen: [
            'ordering',
            'order',
            'per conversation',
            'global order',
            'partition',
            'thứ tự',
            'theo cuộc trò chuyện',
          ],
        },
        {
          dimension: 'constraints',
          key: 'delivery_semantics',
          answer:
            'Use at-least-once server delivery with idempotent message IDs and client/server dedupe. Receipts track sent, delivered, and read states separately.',
          discloseWhen: [
            'delivery',
            'at least once',
            'exactly once',
            'dedupe',
            'receipt',
            'delivered',
            'read',
            'giao tin',
            'đã nhận',
            'đã đọc',
          ],
        },
        {
          dimension: 'constraints',
          key: 'offline_sync',
          answer:
            'On reconnect, the client sends last_seen_seq per conversation or sync cursor. Server returns missing deltas from message store and receipts, bounded by pagination.',
          discloseWhen: [
            'offline',
            'sync',
            'reconnect',
            'last seen',
            'cursor',
            'delta',
            'mất mạng',
            'đồng bộ lại',
            'kết nối lại',
          ],
        },
        {
          dimension: 'scope',
          key: 'multi_device',
          answer:
            'A user may have multiple connected devices. The system should fan out to all online devices, track device-specific ack/read state, and sync missed messages per device.',
          discloseWhen: [
            'multi device',
            'multiple devices',
            'device',
            'phone',
            'web',
            'desktop',
            'nhiều thiết bị',
            'đa thiết bị',
          ],
        },
        {
          dimension: 'constraints',
          key: 'group_fanout',
          answer:
            'For groups up to 1,000 members, store one group message record and fan out delivery events/pointers. Push to online members; offline members pull deltas on reconnect or get push notifications.',
          discloseWhen: [
            'group',
            'fanout',
            '1000 members',
            'push',
            'pull',
            'group message',
            'nhóm',
            'fan-out',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core records: users/devices, conversations, conversation_members, messages keyed by conversation_id and sequence_id, delivery_receipts, presence, media metadata, and sync cursors.',
          discloseWhen: [
            'schema',
            'data model',
            'tables',
            'message table',
            'conversation',
            'receipt',
            'mô hình dữ liệu',
            'bảng tin nhắn',
          ],
        },
        {
          dimension: 'constraints',
          key: 'message_store_partitioning',
          answer:
            'Partition message storage by conversation_id or user inbox key to keep writes ordered and reads localized. Large/hot groups may need sub-partitions or append-log pointers.',
          discloseWhen: [
            'partition',
            'shard',
            'cassandra',
            'conversation id',
            'hot group',
            'message store',
            'chia shard',
            'phân vùng tin nhắn',
          ],
        },
        {
          dimension: 'constraints',
          key: 'presence',
          answer:
            'Presence is ephemeral and approximate. Store online status with TTL heartbeats, shard by user_id, and rate-limit fanout of presence updates to large contact lists.',
          discloseWhen: [
            'presence',
            'online',
            'heartbeat',
            'ttl',
            'status',
            'last seen',
            'trạng thái online',
            'có mặt',
          ],
        },
        {
          dimension: 'constraints',
          key: 'media_flow',
          answer:
            'Media is uploaded directly to object storage using presigned URLs, scanned/processed asynchronously, and sent in messages as metadata/object references served through CDN.',
          discloseWhen: [
            'media',
            'image',
            'video',
            'upload',
            's3',
            'cdn',
            'presigned',
            'ảnh',
            'video',
            'tệp',
          ],
        },
        {
          dimension: 'nfr',
          key: 'backpressure',
          answer:
            'Protect the system with per-user/conversation send limits, bounded queues, slow-consumer handling, WebSocket send buffers, and graceful degradation for typing/presence events.',
          discloseWhen: [
            'backpressure',
            'slow consumer',
            'queue lag',
            'rate limit',
            'send buffer',
            'quá tải',
            'client chậm',
            'hàng đợi chậm',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'If a WebSocket server dies, clients reconnect and resume from last_seen_seq. Stored messages remain durable; ephemeral presence/typing can be dropped.',
          discloseWhen: [
            'availability',
            'ws down',
            'server crash',
            'reconnect',
            'resume',
            'khả dụng',
            'server chết',
            'kết nối lại',
          ],
        },
        {
          dimension: 'constraints',
          key: 'push_notifications',
          answer:
            'Offline push notifications are best-effort and should not be the durable message delivery mechanism. Message state lives in the chat store, not APNs/FCM.',
          discloseWhen: [
            'push',
            'notification',
            'apns',
            'fcm',
            'offline notification',
            'thông báo',
            'push notification',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'advanced_features',
          answer:
            'Voice/video calls, payments, public channels, spam moderation, search across all messages, and full cryptographic protocol design are out of scope.',
          discloseWhen: [
            'voice',
            'video call',
            'payment',
            'channel',
            'moderation',
            'search messages',
            'gọi video',
            'thanh toán',
          ],
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
      {
        id: 'websocket_connect',
        name: 'WebSocket connect and register',
        description:
          'Client opens persistent connection -> WebSocket server registers user/device to server mapping with TTL',
        expectedNodeSequence: [
          'client',
          'lb',
          'ws_servers',
          'conn_manager',
          'presence_service',
          'presence_cache',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'message_ack_receipt',
        name: 'Message ack and receipt',
        description:
          'Recipient client acks message -> delivery/read receipt is persisted -> sender devices receive receipt update',
        expectedNodeSequence: [
          'client',
          'ws_servers',
          'chat_service',
          'cassandra',
          'mq',
          'ws_servers',
          'client',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'reconnect_delta_sync',
        name: 'Reconnect delta sync',
        description:
          'Client reconnects with last_seen_seq or sync cursor -> chat service reads missing messages -> client dedupes by message_id',
        expectedNodeSequence: [
          'client',
          'lb',
          'ws_servers',
          'chat_service',
          'cassandra',
          'client',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'send_group_message',
        name: 'Send group message',
        description:
          'Sender posts group message -> one durable group message is stored -> delivery events fan out to online members and offline members sync later',
        expectedNodeSequence: [
          'client',
          'ws_servers',
          'chat_service',
          'cassandra',
          'mq',
          'conn_manager',
          'ws_servers',
          'push_service',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'media_message_flow',
        name: 'Media message flow',
        description:
          'Client uploads media to object storage -> sends message with media reference -> recipients download through CDN',
        expectedNodeSequence: [
          'client',
          'media_store',
          'ws_servers',
          'chat_service',
          'cassandra',
          'cdn',
          'media_store',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'presence_heartbeat',
        name: 'Presence heartbeat',
        description:
          'Connected client sends heartbeat -> presence service refreshes TTL -> interested contacts receive rate-limited status updates',
        expectedNodeSequence: [
          'client',
          'ws_servers',
          'presence_service',
          'presence_cache',
          'mq',
          'ws_servers',
        ],
        required: false,
        priority: 8,
      },
      {
        id: 'websocket_server_failover',
        name: 'WebSocket server failover',
        description:
          'WebSocket server dies -> connection mapping expires -> clients reconnect -> delta sync resumes from durable message store',
        expectedNodeSequence: [
          'ws_servers',
          'conn_manager',
          'client',
          'lb',
          'ws_servers',
          'chat_service',
          'cassandra',
        ],
        required: false,
        priority: 9,
      },
      {
        id: 'multi_device_delivery',
        name: 'Multi-device delivery',
        description:
          'Message for a user is routed to all online devices and device-specific cursors track which devices still need sync',
        expectedNodeSequence: [
          'chat_service',
          'mq',
          'conn_manager',
          'ws_servers',
          'client',
          'cassandra',
        ],
        required: false,
        priority: 10,
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
      {
        id: 'curve_reconnect_storm',
        type: 'scale_spike',
        targetNodeType: 'service',
        scenarioTemplate:
          'A mobile carrier outage ends and 50 million clients reconnect within minutes. How do WebSocket servers, connection manager, and sync APIs avoid collapse?',
        expectedMitigations: [
          'exponential reconnect backoff with jitter',
          'connection admission control',
          'autoscale WebSocket servers',
          'throttle delta sync',
          'presence updates sampled/rate-limited',
        ],
        redFlags: [
          'clients reconnect in tight loop',
          'sync all history on reconnect',
          'presence broadcast to all contacts immediately',
        ],
      },
      {
        id: 'curve_kafka_lag',
        type: 'failure',
        targetNodeType: 'queue',
        scenarioTemplate:
          'Kafka consumer lag grows to 10 minutes. Online users see delayed messages even though writes are persisted. What degrades and what must remain correct?',
        expectedMitigations: [
          'partition by conversation/user key',
          'consumer autoscaling',
          'lag-based alerting',
          'replay from durable log',
          'clients can sync from message store',
        ],
        redFlags: [
          'message only exists in queue',
          'no consumer lag metric',
          'drops messages to catch up',
        ],
      },
      {
        id: 'curve_slow_consumer',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A recipient has a weak connection and cannot drain the WebSocket send buffer. How do you prevent one slow client from consuming server memory?',
        expectedMitigations: [
          'bounded per-connection send buffer',
          'drop ephemeral events first',
          'close/reconnect slow clients',
          'durable message sync on reconnect',
        ],
        redFlags: [
          'unbounded WebSocket buffer',
          'drops durable messages without sync path',
          'one client blocks event loop/thread',
        ],
      },
      {
        id: 'curve_hot_group_chat',
        type: 'scale_spike',
        targetNodeType: 'database',
        scenarioTemplate:
          'A 1,000-member group receives hundreds of messages per second and becomes a hot conversation partition. How do you preserve order and reduce hot-spot pressure?',
        expectedMitigations: [
          'partition by conversation with hot group mitigation',
          'append one group message pointer',
          'sub-partition or bucket hot groups carefully',
          'batch fanout events',
          'preserve per-conversation sequence order',
        ],
        redFlags: [
          '999 full message copies per send',
          'breaks ordering across sub-partitions',
          'no hot conversation detection',
        ],
      },
      {
        id: 'curve_out_of_order_duplicates',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A client retries a send after timeout. The server already persisted it, and now the user sees duplicate/out-of-order messages. What is the idempotency and ordering design?',
        expectedMitigations: [
          'client-generated idempotency key',
          'server message_id mapping',
          'monotonic per-conversation sequence',
          'client dedupe by message_id',
          'retry returns existing message result',
        ],
        redFlags: [
          'new message on every retry',
          'timestamp ordering only',
          'client cannot dedupe',
        ],
      },
      {
        id: 'curve_cassandra_hot_partition',
        type: 'scale_spike',
        targetNodeType: 'database',
        scenarioTemplate:
          'One conversation has years of history and massive traffic. Cassandra partition by conversation_id becomes huge and hot. How do you model message storage?',
        expectedMitigations: [
          'bucket partition by conversation_id and time/range',
          'sequence index for pagination',
          'compaction/TTL by retention policy',
          'hot conversation detection',
        ],
        redFlags: [
          'one unbounded partition per conversation',
          'scan full conversation for recent sync',
          'no retention/compaction plan',
        ],
      },
      {
        id: 'curve_media_abuse_cost',
        type: 'cost_pressure',
        targetNodeType: 'storage',
        scenarioTemplate:
          'Users start uploading large media files and CDN/storage costs spike. How do you control cost without slowing text message delivery?',
        expectedMitigations: [
          'direct media upload path separate from text path',
          'file size/type limits',
          'async malware/thumbnail processing',
          'CDN caching and lifecycle tiers',
          'quota/rate limits',
        ],
        redFlags: [
          'media uploaded through chat service hot path',
          'no file size limit',
          'text delivery waits for media processing',
        ],
      },
      {
        id: 'curve_push_provider_outage',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'APNs/FCM is unavailable for 30 minutes. Offline users cannot receive push notifications. What remains durable and how do users catch up?',
        expectedMitigations: [
          'message store remains source of truth',
          'retry push with backoff',
          'sync missed messages on reconnect',
          'push failure metrics',
          'do not mark delivered based on push accept alone',
        ],
        redFlags: [
          'push notification is the only delivery record',
          'message lost if push fails',
          'marks delivered before client ack',
        ],
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
      {
        id: 'probe_chat_message_model',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'Design the message schema for 1-to-1 and group chats, including message_id, conversation_id, sequence_id, sender, timestamps, media reference, and receipts.',
        expectedSignals: [
          'globally unique message_id',
          'monotonic per-conversation sequence',
          'conversation membership',
          'media metadata separate from blob',
          'delivery/read receipt records',
        ],
        redFlags: [
          'orders only by client timestamp',
          'stores media blob in message row',
          'no receipt state model',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Why do you need both message_id and per-conversation sequence_id?',
          },
        ],
      },
      {
        id: 'probe_chat_ordering_partitioning',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['queue', 'database'],
        primaryQuestionTemplate:
          'How do Kafka partitions and Cassandra partitions preserve ordering within a conversation while scaling across millions of conversations?',
        expectedSignals: [
          'partition by conversation_id or ordering key',
          'single sequencer/owner per conversation',
          'ordering scoped to conversation',
          'hot conversation mitigation',
          'consumer retry preserves idempotency',
        ],
        redFlags: [
          'global ordering requirement',
          'random partitioning per message breaks order',
          'no hot conversation plan',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What happens to ordering if you split a single hot group across multiple partitions?',
          },
        ],
      },
      {
        id: 'probe_chat_connection_routing',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['service', 'cache'],
        primaryQuestionTemplate:
          'How does the system route a message to the right WebSocket server for each online recipient device?',
        expectedSignals: [
          'user/device to server mapping',
          'connection TTL heartbeat',
          'lookup in connection manager',
          'multi-device fanout',
          'mapping expires on server death',
        ],
        redFlags: [
          'broadcast to all WebSocket servers',
          'central SQL connection table',
          'no handling of stale connection mapping',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the connection manager still points to a WebSocket server that crashed?',
          },
        ],
      },
      {
        id: 'probe_chat_offline_sync',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'A client is offline for two hours. On reconnect, how do you return exactly the missing messages and avoid duplicates?',
        expectedSignals: [
          'last_seen_seq or sync cursor',
          'delta query from durable message store',
          'pagination/backfill',
          'idempotent client dedupe by message_id',
          'receipt/cursor update after ack',
        ],
        redFlags: [
          'resends full history',
          'no cursor per conversation/device',
          'duplicates shown to user',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'How many messages can one reconnect sync return before you paginate or throttle?',
          },
        ],
      },
      {
        id: 'probe_chat_group_fanout',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'database', 'service'],
        primaryQuestionTemplate:
          'For a 1,000-member group, what exactly is written once, what is fanned out, and what is pulled later by offline members?',
        expectedSignals: [
          'single group message record',
          'membership snapshot/version',
          'online delivery fanout events',
          'offline members sync by cursor',
          'avoid 999 full message copies',
        ],
        redFlags: [
          'full message copied to every member inbox',
          'group membership changes ignored',
          'no distinction online vs offline',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'When would you choose per-user inbox materialization despite extra writes?',
          },
        ],
      },
      {
        id: 'probe_chat_storage_partition',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['database'],
        primaryQuestionTemplate:
          'How do you design Cassandra keys for message history so recent messages are fast and partitions do not grow unbounded?',
        expectedSignals: [
          'partition by conversation and time/range bucket',
          'clustering by sequence/time',
          'pagination from latest',
          'retention/compaction strategy',
          'hot partition monitoring',
        ],
        redFlags: [
          'one partition for entire conversation forever',
          'full scan to load recent messages',
          'no retention/compaction story',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What bucket size would you choose for a very active group versus a quiet 1-to-1 chat?',
          },
        ],
      },
      {
        id: 'probe_chat_backpressure',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'What happens when a WebSocket client is slow, Kafka lag grows, or a region receives a send spike?',
        expectedSignals: [
          'bounded send buffers',
          'drop ephemeral events first',
          'durable messages sync later',
          'queue lag alerts/autoscaling',
          'send rate limits per user/conversation',
        ],
        redFlags: [
          'unbounded buffers',
          'drops durable messages silently',
          'no queue lag monitoring',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which events can be dropped under load: messages, read receipts, typing indicators, or presence?',
          },
        ],
      },
      {
        id: 'probe_chat_receipts',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Define sent, delivered, read, and push-notified states. Which actor sets each state and how are retries idempotent?',
        expectedSignals: [
          'sent after durable persist',
          'delivered after client/device ack',
          'read after recipient action',
          'push notified is not delivery',
          'idempotent receipt updates',
        ],
        redFlags: [
          'marks delivered when push provider accepts',
          'receipt retries create duplicate state',
          'no multi-device receipt semantics',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If one recipient device receives the message and another is offline, what is the user-level delivered state?',
          },
        ],
      },
      {
        id: 'probe_chat_media',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['storage', 'cdn', 'service'],
        primaryQuestionTemplate:
          'How do media uploads avoid slowing text messages, and how do you control storage/CDN cost?',
        expectedSignals: [
          'presigned direct upload',
          'media metadata in message',
          'async processing/scanning',
          'CDN delivery',
          'size/type limits and lifecycle policy',
        ],
        redFlags: [
          'media proxied through chat service',
          'message send waits for thumbnail/scan completion',
          'no quota or lifecycle policy',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Should recipients see the media message before thumbnail processing finishes?',
          },
        ],
      },
      {
        id: 'probe_chat_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'queue', 'database', 'cache'],
        primaryQuestionTemplate:
          'What dashboards prove chat is real-time, durable, ordered, and not silently losing messages?',
        expectedSignals: [
          'send-to-delivered latency',
          'message persistence error rate',
          'Kafka lag by partition',
          'WebSocket connection count/reconnect rate',
          'offline sync lag',
          'duplicate/dropped receipt metrics',
          'presence heartbeat load',
        ],
        redFlags: [
          'only tracks API 500s',
          'no end-to-end delivery latency',
          'no queue lag or reconnect storm visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If users report delayed messages, which metric tells you whether the issue is WebSocket routing, queue lag, or storage?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support rider requests, nearby driver search, driver reservation/acceptance, ride lifecycle state transitions, live GPS tracking, and rider/driver notifications.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'ride request',
            'matching',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'constraints',
          key: 'geo_indexing',
          answer:
            'Index available drivers by geospatial cell such as geohash/H3 or Redis GEO. Search starts in the rider cell and expands to neighboring cells until enough candidates are found.',
          discloseWhen: [
            'geo',
            'geohash',
            'h3',
            'redis geo',
            'nearby',
            'cell',
            'spatial index',
            'vị trí',
            'gần nhất',
            'ô địa lý',
          ],
        },
        {
          dimension: 'constraints',
          key: 'driver_availability',
          answer:
            'Only online, available, recently heartbeated drivers are match candidates. Availability entries need TTLs so stale driver locations disappear automatically.',
          discloseWhen: [
            'available driver',
            'availability',
            'online',
            'heartbeat',
            'ttl',
            'stale location',
            'tài xế rảnh',
            'online',
            'vị trí cũ',
          ],
        },
        {
          dimension: 'data',
          key: 'ride_state_machine',
          answer:
            'Ride states should be explicit: requested, candidate_reserved, driver_notified, accepted, arrived, in_progress, completed, canceled, and timed_out.',
          discloseWhen: [
            'state',
            'state machine',
            'lifecycle',
            'status',
            'accepted',
            'completed',
            'canceled',
            'trạng thái chuyến',
            'vòng đời chuyến',
          ],
        },
        {
          dimension: 'constraints',
          key: 'driver_locking',
          answer:
            'Reserve a driver with a short lease/lock plus fencing token, not a permanent assignment. If the driver does not accept before TTL, the workflow advances to the next candidate.',
          discloseWhen: [
            'lock',
            'lease',
            'ttl',
            'fencing',
            'driver assignment',
            'double assign',
            'khóa tài xế',
            'giữ tài xế',
            'gán trùng',
          ],
        },
        {
          dimension: 'constraints',
          key: 'idempotency',
          answer:
            'Ride request submission, driver accept/decline, cancel, and payment-adjacent lifecycle updates need idempotency keys so client retries do not create duplicate rides or assignments.',
          discloseWhen: [
            'idempotency',
            'retry',
            'duplicate ride',
            'duplicate request',
            'accept twice',
            'chống trùng',
            'thử lại',
            'request trùng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'location_freshness',
          answer:
            'Driver locations are eventually consistent and should be considered stale after a short threshold, for example 10-15 seconds, depending on update frequency and city density.',
          discloseWhen: [
            'freshness',
            'location freshness',
            'stale',
            'gps age',
            'how old',
            'độ mới vị trí',
            'vị trí cũ',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core records: riders, drivers, driver_status, location_ping, ride_request, ride, ride_state_event, driver_reservation, notification_event, and trip_history.',
          discloseWhen: [
            'schema',
            'data model',
            'tables',
            'ride table',
            'driver table',
            'location table',
            'mô hình dữ liệu',
            'bảng chuyến',
          ],
        },
        {
          dimension: 'constraints',
          key: 'candidate_ranking',
          answer:
            'Rank candidates by ETA/distance, driver status, vehicle type, cancellation risk, freshness, and fairness. Avoid assigning the same driver to multiple riders concurrently.',
          discloseWhen: [
            'rank',
            'ranking',
            'eta',
            'distance',
            'fairness',
            'candidate',
            'xếp hạng',
            'eta',
            'ứng viên tài xế',
          ],
        },
        {
          dimension: 'constraints',
          key: 'notifications',
          answer:
            'Driver notifications are asynchronous and retryable. A push notification is not acceptance; the authoritative assignment changes only after driver accept is committed.',
          discloseWhen: [
            'notification',
            'push',
            'driver notify',
            'accept',
            'apns',
            'fcm',
            'thông báo',
            'tài xế nhận chuyến',
          ],
        },
        {
          dimension: 'nfr',
          key: 'backpressure',
          answer:
            'Event spikes should be handled with Kafka buffering, per-cell admission control, bounded candidate search, rider wait estimates, and graceful retry/backoff.',
          discloseWhen: [
            'backpressure',
            'event spike',
            'queue',
            'kafka',
            'admission control',
            'quá tải',
            'sự kiện lớn',
            'xếp hàng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Location reads can be eventually consistent, but ride state transitions and driver assignment must be strongly guarded with conditional writes or leases.',
          discloseWhen: [
            'consistency',
            'eventual',
            'strong',
            'state transition',
            'assignment',
            'nhất quán',
            'gán tài xế',
          ],
        },
        {
          dimension: 'nfr',
          key: 'privacy',
          answer:
            'Precise driver/rider locations should be retained for the minimum required period, protected by access controls, and separated from public-facing coarse location data.',
          discloseWhen: [
            'privacy',
            'location privacy',
            'gps retention',
            'access control',
            'riêng tư',
            'vị trí gps',
            'phân quyền',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'advanced_marketplace',
          answer:
            'Payments, fraud detection, surge price optimization, pooled rides, scheduled rides, and driver incentives are out of scope.',
          discloseWhen: [
            'payment',
            'fraud',
            'pool',
            'scheduled',
            'incentive',
            'pricing',
            'thanh toán',
            'gian lận',
            'đi chung',
          ],
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
      {
        id: 'candidate_search',
        name: 'Nearby candidate search',
        description:
          'Matching service searches rider cell and neighboring cells -> filters available fresh drivers -> ranks candidates by ETA',
        expectedNodeSequence: [
          'ride_service',
          'kafka',
          'matching_service',
          'redis_geo',
          'redis_lock',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'driver_accept',
        name: 'Driver accepts ride',
        description:
          'Driver accepts notification -> ride service validates reservation token -> ride state changes to accepted -> rider is notified',
        expectedNodeSequence: [
          'driver_client',
          'api_gateway',
          'ride_service',
          'sql_db',
          'notification_service',
          'rider_client',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'reservation_timeout',
        name: 'Driver reservation timeout',
        description:
          'Reserved driver does not accept before TTL -> delay/timeout event releases lock -> matching service tries next candidate',
        expectedNodeSequence: [
          'redis_lock',
          'kafka',
          'matching_service',
          'redis_geo',
          'notification_service',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'live_tracking',
        name: 'Live trip tracking',
        description:
          'Driver location updates during ride -> location service updates cache -> rider receives live position updates',
        expectedNodeSequence: [
          'driver_client',
          'api_gateway',
          'location_service',
          'redis_geo',
          'notification_service',
          'rider_client',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'ride_cancel',
        name: 'Ride cancellation',
        description:
          'Rider or driver cancels -> ride state transition is committed idempotently -> driver lock is released -> other party is notified',
        expectedNodeSequence: [
          'rider_client',
          'api_gateway',
          'ride_service',
          'sql_db',
          'redis_lock',
          'notification_service',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'no_driver_available',
        name: 'No driver available',
        description:
          'Candidate search exhausts radius or time budget -> rider gets wait/no-driver response and request can retry with backoff',
        expectedNodeSequence: [
          'ride_service',
          'matching_service',
          'redis_geo',
          'kafka',
          'notification_service',
        ],
        required: false,
        priority: 8,
      },
      {
        id: 'stale_location_expiry',
        name: 'Stale location expiry',
        description:
          'Driver stops heartbeating -> location TTL expires -> driver is removed from available candidate set',
        expectedNodeSequence: [
          'driver_client',
          'location_service',
          'redis_geo',
          'matching_service',
        ],
        required: false,
        priority: 9,
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
      {
        id: 'curve_geo_cell_hotspot',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'After a stadium event, one geospatial cell receives 100,000 rider requests and 20,000 driver updates in minutes. How do you avoid a single Redis GEO key becoming the bottleneck?',
        expectedMitigations: [
          'shard by geohash/H3 cell and city',
          'search neighboring cells progressively',
          'replicate hot read-only candidate sets',
          'bounded radius expansion',
          'admission control per cell',
        ],
        redFlags: [
          'single global Redis GEO index',
          'unbounded radius search',
          'no per-cell metrics',
        ],
      },
      {
        id: 'curve_double_assignment',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'Two matching workers reserve the same driver for two riders because lock expiry and retries overlap. How do leases, fencing tokens, and ride state transitions prevent double assignment?',
        expectedMitigations: [
          'SETNX/lease with TTL',
          'fencing token checked on accept',
          'conditional SQL state update',
          'idempotent driver accept',
          'release/repair stale reservations',
        ],
        redFlags: [
          'plain cache flag without fencing',
          'driver accept updates ride blindly',
          'lock TTL shorter than workflow without compensation',
        ],
      },
      {
        id: 'curve_stale_gps',
        type: 'failure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'A driver loses network but remains in Redis GEO for 2 minutes. Riders keep getting matched to a driver who is no longer nearby. How do freshness and TTL work?',
        expectedMitigations: [
          'location heartbeat TTL',
          'filter candidates by last_update timestamp',
          'remove unavailable drivers on missed heartbeat',
          'driver status separate from raw location',
        ],
        redFlags: [
          'location never expires',
          'matches by distance only',
          'no driver availability status',
        ],
      },
      {
        id: 'curve_driver_accept_race',
        type: 'constraint_change',
        targetNodeType: 'database',
        scenarioTemplate:
          'The rider cancels exactly when the driver accepts. Both requests arrive at different app servers. What state transition wins and why?',
        expectedMitigations: [
          'explicit ride state machine',
          'conditional compare-and-set update',
          'idempotency keys',
          'deterministic state transition rules',
          'notify both parties of final state',
        ],
        redFlags: [
          'last write wins blindly',
          'no terminal state protection',
          'rider and driver see different ride states',
        ],
      },
      {
        id: 'curve_push_provider_outage_ride',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'APNs/FCM is down for several minutes. Drivers do not receive push notifications for ride requests. How does matching recover without losing riders?',
        expectedMitigations: [
          'push failure detection',
          'in-app/WebSocket notification when connected',
          'timeout and advance to next driver',
          'do not treat push accepted as driver accepted',
          'rider wait status',
        ],
        redFlags: [
          'ride request depends only on push delivery',
          'driver stays locked indefinitely',
          'no fallback/timeout path',
        ],
      },
      {
        id: 'curve_location_write_overload',
        type: 'cost_pressure',
        targetNodeType: 'cache',
        scenarioTemplate:
          '2 million driver location updates/sec are too expensive for Redis writes and downstream analytics. Which updates can you sample, aggregate, or drop?',
        expectedMitigations: [
          'only active/available drivers in hot geo index',
          'coalesce small movements',
          'adaptive update frequency',
          'separate hot matching state from cold history',
          'sample analytics pings',
        ],
        redFlags: [
          'store every GPS ping forever in hot DB',
          'same update rate for idle and active drivers',
          'matching and analytics share one write path',
        ],
      },
      {
        id: 'curve_no_supply',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'Demand exceeds supply in a zone for 15 minutes. No nearby drivers are available. What does the rider see, and how do you avoid wasting matching capacity?',
        expectedMitigations: [
          'bounded search radius/time budget',
          'waitlist or retry with backoff',
          'clear no-driver ETA/status',
          'cell-level supply/demand signal',
          'do not loop indefinitely',
        ],
        redFlags: [
          'infinite search loop',
          'keeps sending same drivers requests',
          'no user-facing degraded state',
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
      {
        id: 'probe_uber_geo_indexing',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'How do you index and search nearby drivers at 2M location updates/sec without one city or geohash becoming a hot spot?',
        expectedSignals: [
          'geohash/H3 or Redis GEO cell index',
          'shard by city/cell',
          'neighbor cell expansion',
          'filter stale/unavailable drivers',
          'per-cell load metrics',
        ],
        redFlags: [
          'single global geo index',
          'SQL radius query on every match',
          'no freshness filter',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What cell size do you choose, and what happens if it is too small or too large?',
          },
        ],
      },
      {
        id: 'probe_uber_driver_reservation',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'Walk through reserving a driver, notifying them, accepting, and committing the ride state. Where are the fencing token and conditional write checked?',
        expectedSignals: [
          'short lease/lock',
          'fencing token',
          'conditional ride state update',
          'idempotent accept/decline',
          'timeout advances to next candidate',
        ],
        redFlags: [
          'cache lock alone is source of truth',
          'no fencing on accept',
          'driver can be assigned to two active rides',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the lock expires just before the driver taps Accept?',
          },
        ],
      },
      {
        id: 'probe_uber_state_machine',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Define the ride state machine and the allowed transitions for request, reserve, accept, cancel, start, complete, and timeout.',
        expectedSignals: [
          'explicit states',
          'terminal states protected',
          'compare-and-set transition',
          'state event log',
          'notify final state to both parties',
        ],
        redFlags: [
          'last write wins',
          'cancel and accept can both succeed',
          'no audit/event log',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Which transitions are allowed from driver_notified, and which are rejected?',
          },
        ],
      },
      {
        id: 'probe_uber_location_freshness',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'How old can a driver GPS point be before it is unsafe to match, and how do TTLs remove stale drivers?',
        expectedSignals: [
          'last_update timestamp',
          'TTL heartbeat expiry',
          'candidate freshness filter',
          'adaptive update frequency',
          'separate availability from location',
        ],
        redFlags: [
          'location never expires',
          'distance-only matching',
          'same update frequency for all driver states',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If drivers send location every 5 seconds, what stale threshold would you use for matching?',
          },
        ],
      },
      {
        id: 'probe_uber_spike_backpressure',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'service', 'cache'],
        primaryQuestionTemplate:
          'A stadium empties and 100K riders request rides in 60 seconds. How do Kafka, matching workers, per-cell queues, and rider UX handle overload?',
        expectedSignals: [
          'Kafka buffering by area/cell',
          'consumer autoscaling',
          'per-cell admission control',
          'bounded candidate search',
          'rider wait/no-driver status',
        ],
        redFlags: [
          'unbounded matching loop',
          'same drivers notified repeatedly',
          'no queue lag or per-cell metrics',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you one pickup zone is saturated while the rest of the city is healthy?',
          },
        ],
      },
      {
        id: 'probe_uber_idempotency',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database', 'queue'],
        primaryQuestionTemplate:
          'Which APIs require idempotency keys, and what duplicate side effects are you preventing?',
        expectedSignals: [
          'ride request idempotency',
          'driver accept/decline idempotency',
          'cancel idempotency',
          'notification dedupe',
          'queue replay safety',
        ],
        redFlags: [
          'client retry creates duplicate rides',
          'accept retry advances state twice',
          'Kafka assumed exactly once',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If the rider double-taps request during network timeout, what row/key prevents two rides?',
          },
        ],
      },
      {
        id: 'probe_uber_notification_semantics',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'What does it mean for a driver to be notified, and why is push delivery not the same as driver acceptance?',
        expectedSignals: [
          'notification event is retryable',
          'push/in-app delivery best effort',
          'driver accept is authoritative state change',
          'timeout when no response',
          'fallback to next candidate',
        ],
        redFlags: [
          'marks ride accepted after push send',
          'driver stays locked if push provider fails',
          'no delivery/accept distinction',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How long should a rider wait for a driver response before trying the next candidate?',
          },
        ],
      },
      {
        id: 'probe_uber_privacy_retention',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database', 'storage'],
        primaryQuestionTemplate:
          'Precise GPS data is sensitive. What do you retain, aggregate, redact, or delete for matching, support, analytics, and compliance?',
        expectedSignals: [
          'hot location TTL for matching',
          'trip history retention policy',
          'coarse/aggregated analytics',
          'access controls/audit',
          'separate hot state from cold logs',
        ],
        redFlags: [
          'raw GPS stored forever in hot database',
          'no access controls',
          'analytics sees precise live locations unnecessarily',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which location data does support need after a ride completes, and for how long?',
          },
        ],
      },
      {
        id: 'probe_uber_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'cache', 'queue', 'database'],
        primaryQuestionTemplate:
          'What dashboards tell you matching is fast, fair, accurate, and not double-assigning drivers?',
        expectedSignals: [
          'match latency p50/p99 by cell',
          'candidate search radius/depth',
          'driver lock contention/failure',
          'assignment conflict rate',
          'location freshness distribution',
          'Kafka lag by zone',
        ],
        redFlags: [
          'only API latency monitored',
          'no geo/cell-level visibility',
          'no double-assignment metric',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric would reveal stale GPS causing bad matches?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support file upload/download, metadata operations, cross-device sync, file versioning, conflict handling, sharing permissions, and notifications of changes.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'dropbox',
            'sync',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'constraints',
          key: 'chunking_multipart',
          answer:
            'Large files should use chunked/multipart upload with client-tracked part numbers and ETags. Failed uploads resume from missing chunks, not from byte zero.',
          discloseWhen: [
            'chunk',
            'multipart',
            'resumable',
            'etag',
            'part',
            'upload failed',
            'chia chunk',
            'upload tiếp tục',
          ],
        },
        {
          dimension: 'constraints',
          key: 'content_hashing',
          answer:
            'Each chunk/file should have a content hash for integrity checks and optional deduplication. Metadata commits should reference immutable blob/chunk IDs.',
          discloseWhen: [
            'hash',
            'checksum',
            'integrity',
            'dedupe',
            'content address',
            'sha',
            'kiểm tra toàn vẹn',
            'chống trùng',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core records: users, devices, namespaces/folders, file_metadata, file_version, block/blob references, upload_session, tombstone, share_acl, sync_cursor, and change_log.',
          discloseWhen: [
            'schema',
            'data model',
            'metadata',
            'version',
            'acl',
            'change log',
            'mô hình dữ liệu',
            'metadata file',
          ],
        },
        {
          dimension: 'constraints',
          key: 'metadata_commit',
          answer:
            'Upload blob data first, then atomically commit metadata/version row. A file is visible to sync clients only after metadata commit succeeds.',
          discloseWhen: [
            'commit',
            'metadata commit',
            'atomic',
            'visible',
            'upload complete',
            'metadata',
            'commit metadata',
            'hiển thị file',
          ],
        },
        {
          dimension: 'scope',
          key: 'versioning',
          answer:
            'Keep file version history and tombstones for deletes. Restoring an old version creates a new current version rather than mutating blob history in place.',
          discloseWhen: [
            'version',
            'history',
            'restore',
            'delete',
            'tombstone',
            'old version',
            'phiên bản',
            'khôi phục',
            'xóa file',
          ],
        },
        {
          dimension: 'constraints',
          key: 'sync_protocol',
          answer:
            'Devices sync by namespace cursor/change log. Server returns deltas since cursor, including creates, updates, deletes/tombstones, moves, shares, and permission changes.',
          discloseWhen: [
            'sync',
            'cursor',
            'delta',
            'change log',
            'polling',
            'websocket',
            'đồng bộ',
            'cursor sync',
            'thay đổi file',
          ],
        },
        {
          dimension: 'constraints',
          key: 'conflict_resolution',
          answer:
            'If a client edits from a stale base revision, do not silently overwrite. Create a conflicted copy or require explicit merge while preserving both versions.',
          discloseWhen: [
            'conflict',
            'offline edit',
            'same file',
            'merge',
            'last write wins',
            'stale revision',
            'xung đột',
            'sửa offline',
          ],
        },
        {
          dimension: 'scope',
          key: 'sharing_acl',
          answer:
            'File/folder sharing needs ACLs or shared namespace membership, permission checks on metadata and download URLs, and revocation that prevents future access.',
          discloseWhen: [
            'share',
            'sharing',
            'acl',
            'permission',
            'collaborator',
            'revoke',
            'chia sẻ',
            'quyền truy cập',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency',
          answer:
            'Metadata should provide read-your-writes for the uploading user. Cross-device sync can be eventually consistent within the 30-second target.',
          discloseWhen: [
            'consistency',
            'read your writes',
            'eventual',
            'sync delay',
            'replica',
            'nhất quán',
            'vừa upload',
          ],
        },
        {
          dimension: 'nfr',
          key: 'durability_detail',
          answer:
            'Use object storage durability plus metadata backups/PITR. Blob durability alone is not enough if metadata or version history is lost.',
          discloseWhen: [
            'durability',
            'backup',
            'metadata backup',
            'pitr',
            'lost metadata',
            'bền vững',
            'sao lưu metadata',
          ],
        },
        {
          dimension: 'constraints',
          key: 'incomplete_upload_cleanup',
          answer:
            'Incomplete multipart uploads and abandoned upload sessions must expire through lifecycle cleanup to avoid hidden storage cost.',
          discloseWhen: [
            'incomplete',
            'abort',
            'lifecycle',
            'partial upload',
            'cleanup',
            'storage cost',
            'upload dở',
            'dọn dẹp',
          ],
        },
        {
          dimension: 'nfr',
          key: 'security',
          answer:
            'Use scoped upload/download URLs, encryption at rest, TLS, malware scanning where required, ACL checks before issuing URLs, and audit logs for sharing/admin actions.',
          discloseWhen: [
            'security',
            'encryption',
            'presigned',
            'malware',
            'audit',
            'acl',
            'bảo mật',
            'mã hóa',
          ],
        },
        {
          dimension: 'data',
          key: 'storage_cost',
          answer:
            'Storage cost is dominated by blobs and versions, not metadata. Use dedupe where safe, lifecycle tiers for old versions, quotas, and garbage collection of unreferenced blobs.',
          discloseWhen: [
            'cost',
            'storage cost',
            'quota',
            'dedupe',
            'garbage collection',
            'old versions',
            'chi phí',
            'quota',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'advanced_docs',
          answer:
            'Real-time co-editing, document CRDT/OT, full-text search, ransomware recovery product features, and enterprise DLP are out of scope.',
          discloseWhen: [
            'crdt',
            'ot',
            'co-edit',
            'full text search',
            'ransomware',
            'dlp',
            'chỉnh sửa realtime',
            'tìm kiếm nội dung',
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
      {
        id: 'upload_session_init',
        name: 'Upload session init',
        description:
          'Client creates upload session -> file service returns presigned multipart URLs and records session metadata',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'file_service',
          'metadata_db',
          's3',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'chunk_upload_resume',
        name: 'Chunk upload resume',
        description:
          'Client uploads parts directly to S3 -> failed connection resumes by uploading only missing parts tracked by ETags',
        expectedNodeSequence: ['client', 's3', 'file_service', 'metadata_db'],
        required: false,
        priority: 4,
      },
      {
        id: 'metadata_commit',
        name: 'Metadata commit',
        description:
          'All chunks are present -> client commits file revision -> metadata DB points current file version at immutable blobs -> devices are notified',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'file_service',
          'metadata_db',
          'notify_queue',
          'ws_server',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'device_delta_sync',
        name: 'Device delta sync',
        description:
          'Device reconnects with sync cursor -> file service returns metadata changes, tombstones, and download links for missing revisions',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'file_service',
          'metadata_db',
          'cdn',
        ],
        required: false,
        priority: 6,
      },
      {
        id: 'conflict_copy',
        name: 'Conflict copy creation',
        description:
          'Client commits from stale base revision -> service preserves both versions by creating conflicted copy and notifying devices',
        expectedNodeSequence: [
          'client',
          'file_service',
          'metadata_db',
          'notify_queue',
          'ws_server',
        ],
        required: false,
        priority: 7,
      },
      {
        id: 'share_acl_update',
        name: 'Share ACL update',
        description:
          'Owner updates shared folder permissions -> metadata ACL changes -> affected users/devices receive sync change',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'file_service',
          'metadata_db',
          'notify_queue',
          'ws_server',
        ],
        required: false,
        priority: 8,
      },
      {
        id: 'delete_tombstone',
        name: 'Delete tombstone',
        description:
          'User deletes file -> metadata tombstone is committed -> devices sync deletion while old blobs remain restorable until retention expires',
        expectedNodeSequence: [
          'client',
          'file_service',
          'metadata_db',
          'notify_queue',
          'ws_server',
          's3',
        ],
        required: false,
        priority: 9,
      },
      {
        id: 'blob_gc',
        name: 'Unreferenced blob garbage collection',
        description:
          'Background job finds blobs no longer referenced by live versions or retention policy -> deletes or transitions them to cheaper storage',
        expectedNodeSequence: ['metadata_db', 's3'],
        required: false,
        priority: 10,
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
      {
        id: 'curve_metadata_commit_failure',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'All file chunks upload successfully to S3, but metadata commit fails. The user retries. How do you avoid orphaned blobs and duplicate visible files?',
        expectedMitigations: [
          'upload session state',
          'idempotent metadata commit key',
          'blob references immutable chunks',
          'garbage collect unreferenced blobs',
          'file visible only after metadata commit',
        ],
        redFlags: [
          'file appears before metadata commit',
          'retry creates duplicate file rows',
          'orphaned blobs never cleaned',
        ],
      },
      {
        id: 'curve_sync_storm',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A shared folder with 100,000 users receives 10,000 file changes. Notification fanout overloads queues and WebSocket servers. How do devices sync within 30 seconds?',
        expectedMitigations: [
          'namespace change log with cursors',
          'coalesced notifications',
          'pull delta after lightweight push',
          'rate limit low-value notifications',
          'pagination for large deltas',
        ],
        redFlags: [
          'one notification per file per device',
          'full folder rescan on every device',
          'no cursor/pagination',
        ],
      },
      {
        id: 'curve_acl_revoke_stale_url',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'A collaborator is removed from a shared folder, but they still have a cached download URL for a private file. How does revocation work?',
        expectedMitigations: [
          'short-lived scoped download URLs',
          'ACL check before issuing URL',
          'metadata permission version',
          'revoke future access immediately',
          'avoid permanent public object URLs',
        ],
        redFlags: [
          'long-lived public S3 URL',
          'CDN bypasses ACL forever',
          'download URL issued without permission check',
        ],
      },
      {
        id: 'curve_dedupe_security',
        type: 'constraint_change',
        targetNodeType: 'storage',
        scenarioTemplate:
          'You add content-hash deduplication. Could users infer whether another user owns a file with the same hash, and how do you avoid cross-tenant privacy leaks?',
        expectedMitigations: [
          'dedupe within safe trust boundary',
          'do not reveal existence by hash lookup',
          'server-side ownership checks',
          'encrypted per-tenant keys when needed',
          'reference counting with ACL separation',
        ],
        redFlags: [
          'client can query arbitrary hashes',
          'dedupe bypasses permissions',
          'hash existence leaks private file ownership',
        ],
      },
      {
        id: 'curve_delete_edit_race',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'Device A deletes a file while Device B edits it offline and syncs later. What does the user see and what metadata/version rules apply?',
        expectedMitigations: [
          'base revision check',
          'tombstone version',
          'conflicted copy or restore flow',
          'preserve both user intents',
          'clear sync notification',
        ],
        redFlags: [
          'offline edit silently resurrects deleted file',
          'delete silently discards edit',
          'no base revision check',
        ],
      },
      {
        id: 'curve_hot_metadata_folder',
        type: 'scale_spike',
        targetNodeType: 'database',
        scenarioTemplate:
          'A folder with millions of files is opened and listed by thousands of clients. Metadata DB becomes hot. How do you paginate, cache, and shard folder metadata?',
        expectedMitigations: [
          'paginated listing',
          'folder namespace sharding',
          'metadata cache for hot folders',
          'prefix/range partitioning',
          'change cursor instead of full listing',
        ],
        redFlags: [
          'loads full folder listing into memory',
          'single hot metadata partition',
          'every sync scans entire folder',
        ],
      },
      {
        id: 'curve_metadata_db_outage',
        type: 'dependency_outage',
        targetNodeType: 'database',
        scenarioTemplate:
          'S3 is healthy but the metadata DB is unavailable. Can users upload, download, or sync? What degrades safely?',
        expectedMitigations: [
          'existing public/cached downloads may continue',
          'new commits blocked or queued',
          'uploads can stage blobs but not make visible',
          'sync serves last-known cursor/cache if safe',
          'clear degraded state',
        ],
        redFlags: [
          'metadata-less upload becomes visible',
          'sync returns inconsistent namespace',
          'claims S3 health means product healthy',
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
      {
        id: 'probe_dropbox_metadata_commit',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['service', 'database', 'storage'],
        primaryQuestionTemplate:
          'Why do you upload file chunks before committing metadata, and what makes the commit idempotent?',
        expectedSignals: [
          'upload session ID',
          'immutable blob/chunk references',
          'atomic metadata version commit',
          'idempotency key',
          'file visible only after commit',
        ],
        redFlags: [
          'file visible while chunks incomplete',
          'retry creates duplicate versions',
          'metadata and blob state not reconciled',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if chunks are uploaded but metadata commit fails permanently?',
          },
        ],
      },
      {
        id: 'probe_dropbox_sync_cursor',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'database', 'queue'],
        primaryQuestionTemplate:
          'Design the sync protocol for a device that reconnects after being offline for a day.',
        expectedSignals: [
          'namespace cursor/change log',
          'delta events for create/update/delete/move/share',
          'pagination',
          'WebSocket notification plus polling fallback',
          'cursor advanced after successful client apply',
        ],
        redFlags: [
          'full tree scan on every sync',
          'polling only for 30s target',
          'no tombstones in sync result',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'How large can one delta response be before you paginate or ask the client to back off?',
          },
        ],
      },
      {
        id: 'probe_dropbox_conflict_resolution',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['database', 'service'],
        primaryQuestionTemplate:
          'Two devices edit the same file offline from the same base revision. What exact metadata/version outcome do you create?',
        expectedSignals: [
          'base revision comparison',
          'conflicted copy or explicit merge',
          'preserve both versions',
          'notify all devices',
          'no silent overwrite',
        ],
        redFlags: [
          'last write wins silently',
          'one user edit is lost',
          'no revision/base tracking',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What filename/version metadata would the conflicted copy have?',
          },
        ],
      },
      {
        id: 'probe_dropbox_acl_sharing',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database', 'cdn', 'storage'],
        primaryQuestionTemplate:
          'How do shared folder ACLs affect metadata sync, download URL generation, and revocation?',
        expectedSignals: [
          'ACL check before metadata/download',
          'short-lived scoped URLs',
          'permission version in sync',
          'revocation prevents future URL issuance',
          'audit share changes',
        ],
        redFlags: [
          'permanent public object URLs',
          'CDN bypasses permissions indefinitely',
          'sync ignores permission changes',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'If a collaborator is removed, what happens to already-issued download URLs?',
          },
        ],
      },
      {
        id: 'probe_dropbox_dedupe_integrity',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['storage', 'database'],
        primaryQuestionTemplate:
          'How do content hashes help integrity and deduplication, and what privacy risks do cross-user hash lookups introduce?',
        expectedSignals: [
          'chunk/file hash verification',
          'server-side reference counts',
          'dedupe scoped safely',
          'no arbitrary hash existence oracle',
          'garbage collection after reference removal',
        ],
        redFlags: [
          'client can learn if hash exists globally',
          'dedupe ignores ACL/ownership',
          'no integrity check on download',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Would you dedupe across all users or only inside an account/team namespace?',
          },
        ],
      },
      {
        id: 'probe_dropbox_hot_folder',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['database', 'cache', 'service'],
        primaryQuestionTemplate:
          'A folder contains millions of files and many clients list/sync it. How do you avoid a hot metadata partition?',
        expectedSignals: [
          'pagination',
          'folder namespace sharding',
          'range/prefix partitioning',
          'metadata cache',
          'change-log cursor instead of full listing',
        ],
        redFlags: [
          'returns full listing in one response',
          'single row/partition per huge folder',
          'sync scans all files each time',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you folder listing, not blob download, is your bottleneck?',
          },
        ],
      },
      {
        id: 'probe_dropbox_durability_dr',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['storage', 'database'],
        primaryQuestionTemplate:
          'Files must never be lost. What protects blob data, metadata, version history, and delete tombstones?',
        expectedSignals: [
          'object storage durability/versioning',
          'metadata backups/PITR',
          'restore drills',
          'tombstone/version retention',
          'cross-region backup if required',
        ],
        redFlags: [
          'only backs up blobs not metadata',
          'hard deletes immediately',
          'no restore test',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If metadata is lost but blobs remain, can users still recover their folder tree?',
          },
        ],
      },
      {
        id: 'probe_dropbox_gc_cost',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['storage', 'database'],
        primaryQuestionTemplate:
          'How do you control storage cost from old versions, incomplete uploads, duplicate chunks, and unreferenced blobs?',
        expectedSignals: [
          'AbortIncompleteMultipartUpload lifecycle',
          'version retention policy',
          'reference-counted blob GC',
          'quotas',
          'cold storage tiers',
        ],
        redFlags: [
          'incomplete multipart uploads live forever',
          'keeps every old version forever by default',
          'no unreferenced blob cleanup',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you hidden incomplete multipart uploads are driving S3 cost?',
          },
        ],
      },
      {
        id: 'probe_dropbox_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'queue', 'database', 'storage'],
        primaryQuestionTemplate:
          'What dashboards prove sync is timely, durable, and not corrupting metadata?',
        expectedSignals: [
          'sync lag by device/namespace',
          'upload session failure rate',
          'metadata commit errors',
          'notification queue lag',
          'conflict rate',
          'orphaned blob count',
          'download error/latency',
        ],
        redFlags: [
          'only tracks S3 errors',
          'no sync lag metric',
          'no metadata/blob consistency check',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If users say files are uploaded but not appearing on other devices, which metric do you inspect first?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'Support recorded video upload, durable raw storage, asynchronous transcoding, HLS/DASH packaging, metadata publishing, CDN playback, thumbnails, and playback telemetry.',
          discloseWhen: [
            'main feature',
            'core feature',
            'functionality',
            'scope',
            'what should it do',
            'youtube',
            'streaming',
            'tính năng',
            'chức năng',
            'hệ thống làm gì',
          ],
        },
        {
          dimension: 'constraints',
          key: 'upload_protocol',
          answer:
            'Use resumable/multipart uploads to object storage with upload sessions, checksums, and retries. Raw uploads are not immediately playable until metadata and at least one processed rendition exist.',
          discloseWhen: [
            'upload',
            'resumable',
            'multipart',
            'checksum',
            'raw video',
            'upload video',
            'upload tiếp tục',
          ],
        },
        {
          dimension: 'constraints',
          key: 'transcoding_ladder',
          answer:
            'Transcode into a bitrate ladder such as 240p, 360p, 480p, 720p, 1080p, and 4K when source allows. Audio, subtitles, thumbnails, and manifests are separate outputs.',
          discloseWhen: [
            'transcode',
            'bitrate ladder',
            'resolution',
            'rendition',
            '240p',
            '4k',
            'mã hóa video',
            'chất lượng',
          ],
        },
        {
          dimension: 'constraints',
          key: 'segment_parallelism',
          answer:
            'Split videos into segments and transcode renditions in parallel. Publish low resolutions first to meet time-to-play, then add higher resolutions as they complete.',
          discloseWhen: [
            'segment',
            'parallel',
            'time to play',
            'progressive',
            'low quality first',
            'xử lý song song',
            'phân đoạn',
          ],
        },
        {
          dimension: 'scope',
          key: 'abr_playback',
          answer:
            'Playback uses adaptive bitrate streaming: client fetches a manifest, chooses segments based on bandwidth/buffer/device, and switches renditions during playback.',
          discloseWhen: [
            'abr',
            'adaptive bitrate',
            'hls',
            'dash',
            'manifest',
            'switch quality',
            'adaptive',
            'tự đổi chất lượng',
          ],
        },
        {
          dimension: 'data',
          key: 'data_model',
          answer:
            'Core records: video_metadata, upload_session, raw_asset, transcode_job, rendition, segment, manifest, thumbnail, playback_stats, and moderation/status flags.',
          discloseWhen: [
            'schema',
            'data model',
            'metadata',
            'rendition',
            'segment',
            'manifest',
            'mô hình dữ liệu',
            'metadata video',
          ],
        },
        {
          dimension: 'constraints',
          key: 'publish_state',
          answer:
            'Video status should move through uploading, processing, partially_playable, playable, failed, blocked, and deleted. Do not expose broken manifests as playable.',
          discloseWhen: [
            'status',
            'state',
            'publish',
            'playable',
            'processing',
            'failed',
            'trạng thái',
            'đã xem được',
          ],
        },
        {
          dimension: 'constraints',
          key: 'cdn_strategy',
          answer:
            'CDN serves manifests and segments, with origin shield or regional origins to protect object storage during viral spikes. Hot videos should be prewarmed when possible.',
          discloseWhen: [
            'cdn',
            'origin',
            'origin shield',
            'cache',
            'viral',
            'prewarm',
            'cache video',
            'nguồn gốc',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Playback must remain available if upload/transcoding is delayed. Existing playable renditions continue serving from CDN/object storage even when processing workers are down.',
          discloseWhen: [
            'availability',
            'worker down',
            'transcode down',
            'playback available',
            'degraded',
            'khả dụng',
            'worker lỗi',
          ],
        },
        {
          dimension: 'constraints',
          key: 'processing_priority',
          answer:
            'Use separate queues/priorities for short videos, popular creators, retry jobs, thumbnails, and high-cost 4K outputs. Backpressure should not block all uploads.',
          discloseWhen: [
            'priority',
            'queue',
            'retry',
            '4k',
            'thumbnail',
            'backpressure',
            'ưu tiên',
            'hàng đợi',
          ],
        },
        {
          dimension: 'data',
          key: 'storage_cost',
          answer:
            'Storage grows across raw uploads, processed renditions, thumbnails, and manifests. Apply lifecycle rules for raw files, unpopular renditions, failed jobs, and deleted videos.',
          discloseWhen: [
            'storage',
            'cost',
            'raw',
            'processed',
            'rendition',
            'lifecycle',
            'chi phí',
            'dung lượng',
          ],
        },
        {
          dimension: 'nfr',
          key: 'security_moderation',
          answer:
            'Malware scanning, content policy checks, copyright workflows, signed upload URLs, and ACL/private video checks are needed, but recommendation/search ranking is separate.',
          discloseWhen: [
            'security',
            'moderation',
            'copyright',
            'private video',
            'acl',
            'signed url',
            'bản quyền',
            'riêng tư',
          ],
        },
        {
          dimension: 'constraints',
          key: 'playback_telemetry',
          answer:
            'Collect playback events such as startup time, rebuffering, bitrate switches, CDN errors, and watch progress asynchronously; telemetry must not block playback.',
          discloseWhen: [
            'telemetry',
            'analytics',
            'rebuffer',
            'startup time',
            'watch progress',
            'thống kê',
            'buffer',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'recommendation_search',
          answer:
            'Recommendations, personalized ranking, comments, ads, live streaming, and creator monetization are out of scope for this video delivery design.',
          discloseWhen: [
            'recommendation',
            'search',
            'comments',
            'ads',
            'monetization',
            'ranking',
            'gợi ý',
            'quảng cáo',
          ],
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
      {
        id: 'resumable_video_upload',
        name: 'Resumable video upload',
        description:
          'Creator starts upload session -> chunks are uploaded directly to raw storage -> upload service commits raw asset metadata',
        expectedNodeSequence: [
          'client',
          'api_gateway',
          'upload_service',
          's3_raw',
          'metadata_db',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'low_res_first_publish',
        name: 'Low-resolution first publish',
        description:
          'Transcoding workers process lower renditions first -> video becomes partially playable -> higher renditions publish later',
        expectedNodeSequence: [
          'mq',
          'transcode_workers',
          's3_processed',
          'metadata_db',
          'cdn',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'manifest_generation',
        name: 'Manifest generation',
        description:
          'Finished renditions produce HLS/DASH manifests and segment indexes -> metadata marks playable versions atomically',
        expectedNodeSequence: [
          'transcode_workers',
          's3_processed',
          'metadata_db',
          'cdn',
        ],
        required: false,
        priority: 5,
      },
      {
        id: 'playback_cdn_hit',
        name: 'Playback CDN hit',
        description:
          'Viewer requests manifest and segments -> CDN edge serves cached content without object storage origin hit',
        expectedNodeSequence: ['client', 'cdn'],
        required: false,
        priority: 6,
      },
      {
        id: 'playback_origin_miss',
        name: 'Playback origin miss',
        description:
          'CDN misses a segment -> origin fetches processed object from storage -> edge caches for future viewers',
        expectedNodeSequence: ['client', 'cdn', 's3_processed', 'cdn'],
        required: false,
        priority: 7,
      },
      {
        id: 'thumbnail_processing',
        name: 'Thumbnail processing',
        description:
          'Transcode pipeline extracts thumbnails/previews -> stores images -> metadata exposes thumbnails to clients',
        expectedNodeSequence: [
          's3_raw',
          'mq',
          'transcode_workers',
          's3_processed',
          'metadata_db',
          'cdn',
        ],
        required: false,
        priority: 8,
      },
      {
        id: 'failed_transcode_retry',
        name: 'Failed transcode retry',
        description:
          'Transcode job fails -> queue retries with backoff -> poison jobs are marked failed and video shows processing error',
        expectedNodeSequence: ['mq', 'transcode_workers', 'metadata_db'],
        required: false,
        priority: 9,
      },
      {
        id: 'video_delete_takedown',
        name: 'Video delete or takedown',
        description:
          'Owner/moderation deletes video -> metadata blocks playback -> CDN invalidates manifests -> storage lifecycle removes assets later',
        expectedNodeSequence: [
          'api_gateway',
          'metadata_db',
          'cdn',
          's3_processed',
          's3_raw',
        ],
        required: false,
        priority: 10,
      },
      {
        id: 'playback_telemetry',
        name: 'Playback telemetry',
        description:
          'Player emits startup/rebuffer/bitrate events asynchronously so analytics does not block playback',
        expectedNodeSequence: ['client', 'api_gateway', 'metadata_db'],
        required: false,
        priority: 11,
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
      {
        id: 'curve_transcode_backlog',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A creator event causes uploads to spike 20x. Transcode queue lag grows to 6 hours. Which jobs get priority and what user-facing state do creators/viewers see?',
        expectedMitigations: [
          'priority queues by video length/creator/popularity',
          'low resolution first',
          'autoscale transcode workers',
          'queue lag SLO',
          'batch high-cost 4K later',
        ],
        redFlags: [
          'single FIFO transcode queue',
          'all renditions block initial publish',
          'no processing status or ETA',
        ],
      },
      {
        id: 'curve_corrupt_input',
        type: 'failure',
        targetNodeType: 'worker',
        scenarioTemplate:
          'A malformed video crashes transcoding workers repeatedly and blocks the queue. How do you isolate poison files and keep the pipeline moving?',
        expectedMitigations: [
          'bounded retries',
          'DLQ/poison job quarantine',
          'worker sandboxing',
          'mark video failed with reason',
          'do not block queue partitions',
        ],
        redFlags: [
          'infinite retry loop',
          'worker process crash takes down fleet',
          'poison job blocks all uploads',
        ],
      },
      {
        id: 'curve_partial_manifest_publish',
        type: 'failure',
        targetNodeType: 'storage',
        scenarioTemplate:
          'Some segments are uploaded but the HLS manifest references segments that are not yet in storage. Viewers get playback 404s. How do you publish manifests atomically?',
        expectedMitigations: [
          'manifest generated after segment validation',
          'versioned manifest keys',
          'atomic metadata publish',
          'serve previous playable version',
          'health check segment availability',
        ],
        redFlags: [
          'manifest visible before segments are complete',
          'overwrites current manifest in place',
          'no segment validation',
        ],
      },
      {
        id: 'curve_cdn_stale_takedown',
        type: 'constraint_change',
        targetNodeType: 'cdn',
        scenarioTemplate:
          'A copyrighted video must be removed immediately, but CDN edges keep serving cached segments for hours. What is your takedown path?',
        expectedMitigations: [
          'metadata blocks playback immediately',
          'CDN invalidation for manifest/segments',
          'shorter TTL for manifests than segments',
          'signed URLs/tokens for private or blocked videos',
          'audit takedown event',
        ],
        redFlags: [
          'only deletes origin object',
          'CDN cached content remains playable indefinitely',
          'no metadata-level block',
        ],
      },
      {
        id: 'curve_hot_small_video',
        type: 'scale_spike',
        targetNodeType: 'cdn',
        scenarioTemplate:
          'A 20-second clip goes viral globally with 50 million viewers. Metadata API and manifest requests are now the bottleneck, not segment bandwidth. How do you cache and prewarm?',
        expectedMitigations: [
          'CDN cache manifests and thumbnails',
          'edge cache hot segments',
          'prewarm/origin shield',
          'metadata cache',
          'avoid per-play DB read',
        ],
        redFlags: [
          'metadata DB read on every play',
          'manifest not cacheable',
          'no origin shield/prewarm',
        ],
      },
      {
        id: 'curve_storage_cost_explosion',
        type: 'cost_pressure',
        targetNodeType: 'storage',
        scenarioTemplate:
          'Storage cost grows faster than views because every upload keeps raw 4K plus all renditions forever. Which assets can be tiered, deleted, or lazily regenerated?',
        expectedMitigations: [
          'lifecycle old raw uploads',
          'drop/regenerate unpopular renditions',
          'content-aware bitrate ladder',
          'delete failed/incomplete outputs',
          'archive cold videos',
        ],
        redFlags: [
          'keeps raw and every rendition forever',
          'no popularity-based lifecycle',
          'no cleanup for failed jobs',
        ],
      },
      {
        id: 'curve_playback_telemetry_overload',
        type: 'scale_spike',
        targetNodeType: 'service',
        scenarioTemplate:
          'Playback telemetry emits billions of events/day and overloads the metadata database. How do you collect quality metrics without hurting playback?',
        expectedMitigations: [
          'asynchronous telemetry pipeline',
          'sampling/aggregation',
          'separate analytics store',
          'client buffering and drop policy',
          'never block segment requests',
        ],
        redFlags: [
          'telemetry writes to metadata DB synchronously',
          'playback waits for analytics ack',
          'no sampling or backpressure',
        ],
      },
      {
        id: 'curve_region_origin_outage',
        type: 'dependency_outage',
        targetNodeType: 'storage',
        scenarioTemplate:
          'The processed-video origin in one region has elevated errors. CDN cache still serves some videos, but long-tail playback misses fail. What failover strategy do you use?',
        expectedMitigations: [
          'multi-origin failover',
          'replicate processed assets for popular videos',
          'CDN origin shield/secondary origin',
          'serve lower cached rendition if available',
          'origin error monitoring',
        ],
        redFlags: [
          'single origin for all playback',
          'no origin error alarms',
          'CDN miss means playback fails globally',
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
      {
        id: 'probe_video_upload_resume',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'storage'],
        primaryQuestionTemplate:
          'A creator uploads a 50 GB video and disconnects at 80%. How does the client resume and how do you verify integrity?',
        expectedSignals: [
          'upload session',
          'multipart/chunk tracking',
          'part ETags/checksums',
          'only missing chunks re-uploaded',
          'raw asset committed after complete upload',
        ],
        redFlags: [
          'restart from zero',
          'no checksum validation',
          'raw asset visible before upload completes',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What metric tells you incomplete uploads are wasting object storage?',
          },
        ],
      },
      {
        id: 'probe_video_transcode_ladder',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['worker', 'storage', 'database'],
        primaryQuestionTemplate:
          'What renditions, segment duration, codecs, thumbnails, and manifests do you produce from one raw upload?',
        expectedSignals: [
          'bitrate ladder',
          'HLS/DASH manifests',
          'segment files',
          'thumbnail/previews',
          'content-aware output decision',
          'metadata records for each rendition',
        ],
        redFlags: [
          'single encoded output',
          'no manifest/rendition metadata',
          'all videos get every expensive rendition regardless of source/popularity',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'When would you skip 4K output even if the source is 4K?',
          },
        ],
      },
      {
        id: 'probe_video_time_to_play',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['worker', 'queue', 'storage'],
        primaryQuestionTemplate:
          'How can a long 4K upload become playable within 5 minutes if full transcoding takes much longer?',
        expectedSignals: [
          'segment-level parallelism',
          'low resolution first',
          'publish partial playable state',
          'manifest updates as renditions complete',
          'priority queue for fast-start outputs',
        ],
        redFlags: [
          'wait for every rendition',
          'single sequential worker',
          'no partially_playable state',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which pipeline stage owns the 5-minute time-to-play SLO?',
          },
        ],
      },
      {
        id: 'probe_video_manifest_publish',
        stage: 'DEEP_DIVE',
        dimension: 'consistency',
        appliesToNodeTypes: ['storage', 'database', 'cdn'],
        primaryQuestionTemplate:
          'How do you publish HLS manifests and segments so viewers never request segments that do not exist?',
        expectedSignals: [
          'validate segment availability',
          'versioned manifest key',
          'atomic metadata status update',
          'CDN cache invalidation or versioned URLs',
          'serve previous manifest during update',
        ],
        redFlags: [
          'manifest visible before segments complete',
          'overwrite manifest in place without cache strategy',
          'no playback health checks',
        ],
        followUps: [
          {
            trigger: 'red_flag',
            questionTemplate:
              'What happens if the CDN caches a manifest that references missing segments?',
          },
        ],
      },
      {
        id: 'probe_video_cdn_origin',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cdn', 'storage'],
        primaryQuestionTemplate:
          'A viral video has 10M simultaneous viewers and 1% CDN miss rate. What protects the origin and how do you reduce misses?',
        expectedSignals: [
          'origin shield',
          'prewarm hot manifests/segments',
          'multi-region origin/failover',
          'cache headers/TTL by manifest vs segment',
          'CDN hit-rate monitoring',
        ],
        redFlags: [
          'origin handles every miss globally',
          'no CDN hit-rate metric',
          'same TTL for manifest and segments blindly',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'At 10M viewers, what does 1% miss rate mean in origin requests per second?',
          },
        ],
      },
      {
        id: 'probe_video_storage_lifecycle',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['storage', 'database'],
        primaryQuestionTemplate:
          'How do raw files, processed renditions, thumbnails, manifests, and failed outputs move through lifecycle tiers or deletion?',
        expectedSignals: [
          'raw asset retention policy',
          'processed rendition lifecycle',
          'popularity-based tiering',
          'failed/incomplete job cleanup',
          'metadata tracks references before delete',
        ],
        redFlags: [
          'keeps all raw and every rendition forever',
          'deletes assets still referenced by playable manifests',
          'no failed-output cleanup',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which is cheaper: store every rendition forever or regenerate rare renditions on demand?',
          },
        ],
      },
      {
        id: 'probe_video_retry_dlq',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['queue', 'worker'],
        primaryQuestionTemplate:
          'How do transcoding workers handle crashes, corrupted input, retries, poison videos, and duplicate jobs?',
        expectedSignals: [
          'idempotent job output keys',
          'bounded retries/backoff',
          'DLQ/quarantine',
          'worker sandboxing',
          'failed status visible to creator',
        ],
        redFlags: [
          'infinite retries',
          'duplicate outputs corrupt metadata',
          'poison file blocks the queue',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What key makes a transcode job idempotent if the queue delivers it twice?',
          },
        ],
      },
      {
        id: 'probe_video_takedown_privacy',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'cdn', 'storage'],
        primaryQuestionTemplate:
          'How do private videos, deleted videos, and copyright takedowns stop playback even when CDN edges have cached manifests and segments?',
        expectedSignals: [
          'metadata playback gate',
          'signed URLs/tokens for private content',
          'CDN invalidation for takedown',
          'short manifest TTL/versioned URLs',
          'audit takedown events',
        ],
        redFlags: [
          'only deletes origin files',
          'public CDN URL never expires',
          'private ACL checked only on upload',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Which asset should have shorter CDN TTL: manifest or video segment, and why?',
          },
        ],
      },
      {
        id: 'probe_video_telemetry',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'What playback telemetry do you collect, and how do you avoid telemetry overload hurting playback?',
        expectedSignals: [
          'startup time',
          'rebuffer ratio',
          'bitrate switches',
          'CDN error rate',
          'async analytics pipeline',
          'sampling/backpressure',
        ],
        redFlags: [
          'playback waits for analytics ack',
          'telemetry stored in metadata DB synchronously',
          'no rebuffer/startup metrics',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you first-frame latency is worse in one region or ISP?',
          },
        ],
      },
      {
        id: 'probe_video_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['queue', 'worker', 'cdn', 'storage'],
        primaryQuestionTemplate:
          'What dashboards prove upload, processing, and playback are healthy end to end?',
        expectedSignals: [
          'upload success/resume rate',
          'transcode queue lag by priority',
          'time-to-playable p99',
          'transcode failure/DLQ rate',
          'CDN hit rate/origin errors',
          'startup/rebuffer playback metrics',
        ],
        redFlags: [
          'only tracks API 500s',
          'no time-to-playable metric',
          'no CDN/origin visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'If creators complain videos are stuck processing, which metric do you inspect first?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'The system serves query-completion suggestions as the user types; it does not execute the final full-text search.',
          discloseWhen: [
            'scope',
            'autocomplete',
            'typeahead',
            'full search',
            'what does it do',
          ],
        },
        {
          dimension: 'scope',
          key: 'input_behavior',
          answer:
            'Client sends debounced prefix requests after roughly 200-300ms idle time and only after a minimum prefix length, typically 1-2 normalized characters.',
          discloseWhen: [
            'client',
            'debounce',
            'typing',
            'prefix length',
            'minimum chars',
          ],
        },
        {
          dimension: 'scope',
          key: 'ranking_semantics',
          answer:
            'Default ranking is global popularity score: long-term query frequency blended with a short sliding-window trending score, with exact-prefix matches first.',
          discloseWhen: [
            'ranking',
            'score',
            'frequency',
            'popular',
            'trending',
            'sort',
          ],
        },
        {
          dimension: 'data',
          key: 'suggestion_record',
          answer:
            'A suggestion record contains suggestion_id, raw_text, normalized_text, locale, score, long_term_count, recent_count, last_seen_at, and moderation_status.',
          discloseWhen: [
            'schema',
            'data model',
            'record',
            'fields',
            'metadata',
          ],
        },
        {
          dimension: 'data',
          key: 'normalization',
          answer:
            'Prefixes and suggestions are normalized consistently: lowercase/case-folding, Unicode normalization, whitespace collapse, language/locale tagging, and optional punctuation stripping.',
          discloseWhen: [
            'normalize',
            'case',
            'unicode',
            'locale',
            'language',
            'tokenization',
          ],
        },
        {
          dimension: 'data',
          key: 'trie_structure',
          answer:
            'The serving index is a compressed trie or weighted FST/DAWG snapshot where each prefix node stores a precomputed top-K list, not only child pointers.',
          discloseWhen: [
            'trie',
            'fst',
            'dawg',
            'compressed',
            'data structure',
            'top k node',
          ],
        },
        {
          dimension: 'data',
          key: 'top_k_materialization',
          answer:
            'For low latency, the system materializes top-5 or top-10 suggestions per hot prefix and caches complete response objects for very common prefixes.',
          discloseWhen: [
            'top k',
            'materialized',
            'precompute',
            'cache response',
            'hot prefix',
          ],
        },
        {
          dimension: 'data',
          key: 'frequency_pipeline',
          answer:
            'Query events are appended to Kafka, aggregated by normalized_text and locale, and periodically compacted into a frequency DB used to build the next trie snapshot.',
          discloseWhen: [
            'logs',
            'events',
            'kafka',
            'aggregation',
            'frequency',
            'pipeline',
          ],
        },
        {
          dimension: 'nfr',
          key: 'availability',
          answer:
            'Suggestion serving should stay available during rebuilds by serving the last known-good trie snapshot and cached hot prefixes.',
          discloseWhen: [
            'availability',
            'rebuild fail',
            'snapshot',
            'fallback',
            'last good',
          ],
        },
        {
          dimension: 'nfr',
          key: 'freshness_model',
          answer:
            'The base trie can refresh hourly or daily, while a streaming overlay updates hot/trending suggestions within minutes.',
          discloseWhen: [
            'freshness',
            'hourly',
            'stream',
            'batch',
            'overlay',
            'minutes',
          ],
        },
        {
          dimension: 'nfr',
          key: 'consistency_model',
          answer:
            'Autocomplete is eventually consistent; users may see old suggestions for a short window, but each response should come from one coherent snapshot version plus overlay.',
          discloseWhen: [
            'consistency',
            'eventual',
            'snapshot version',
            'stale',
            'atomic',
          ],
        },
        {
          dimension: 'constraints',
          key: 'hot_prefixes',
          answer:
            'One- and two-character prefixes are extremely hot; they need CDN/edge or Redis cache, request coalescing, and replicated shards.',
          discloseWhen: [
            'hot prefix',
            'a',
            'one character',
            'short prefix',
            'hotspot',
            'cache stampede',
          ],
        },
        {
          dimension: 'constraints',
          key: 'sharding_strategy',
          answer:
            'Do not rely only on alphabetical prefix ranges; use consistent hashing or range shards plus hot-prefix replication and per-locale partitioning.',
          discloseWhen: [
            'shard',
            'partition',
            'alphabet',
            'range',
            'consistent hash',
            'locale',
          ],
        },
        {
          dimension: 'constraints',
          key: 'abuse_and_moderation',
          answer:
            'Suggestions must filter spam, profanity, PII-like strings, illegal content, and adversarially boosted queries before publishing to the serving index.',
          discloseWhen: [
            'abuse',
            'spam',
            'profanity',
            'pii',
            'moderation',
            'safe suggestions',
          ],
        },
        {
          dimension: 'constraints',
          key: 'privacy',
          answer:
            'Raw query logs may contain sensitive data; store only needed fields, redact or hash user identifiers, enforce retention, and avoid exposing rare personal queries.',
          discloseWhen: [
            'privacy',
            'pii',
            'query logs',
            'retention',
            'sensitive',
            'rare query',
          ],
        },
        {
          dimension: 'nfr',
          key: 'observability',
          answer:
            'Track p50/p95/p99 latency by prefix length, cache hit rate, no-result rate, stale snapshot age, bad-suggestion reports, and aggregation lag.',
          discloseWhen: [
            'metrics',
            'observability',
            'monitoring',
            'latency',
            'cache hit',
            'lag',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'spell_correction',
          answer:
            'Full spell correction and semantic search are out of scope; optional one-edit-distance fuzzy suggestions can be a later extension.',
          discloseWhen: ['spell', 'typo', 'fuzzy', 'semantic', 'did you mean'],
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
      {
        id: 'cache_hit_suggestion',
        name: 'Hot-prefix cache hit',
        description:
          'Client prefix request -> API normalizes prefix -> Redis returns cached top-5 response -> API logs event asynchronously',
        expectedNodeSequence: [
          'client',
          'lb',
          'suggestion_api',
          'trie_cache',
          'log_collector',
          'mq',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'cache_miss_trie_lookup',
        name: 'Cache miss trie lookup',
        description:
          'API misses Redis -> trie service traverses compressed trie/FST snapshot -> writes complete top-K response back to cache',
        expectedNodeSequence: [
          'suggestion_api',
          'trie_cache',
          'trie_service',
          'trie_db',
          'trie_cache',
          'suggestion_api',
        ],
        required: true,
        priority: 2,
      },
      {
        id: 'query_log_ingestion',
        name: 'Query log ingestion',
        description:
          'Suggestion API emits anonymized prefix/query events -> collector batches -> Kafka stream feeds aggregators',
        expectedNodeSequence: [
          'suggestion_api',
          'log_collector',
          'mq',
          'agg_workers',
          'freq_db',
        ],
        required: true,
        priority: 3,
      },
      {
        id: 'trending_overlay_update',
        name: 'Real-time trending overlay',
        description:
          'Stream aggregators increment recent scores for hot queries -> Redis sorted sets serve trending overrides before the next trie rebuild',
        expectedNodeSequence: [
          'mq',
          'agg_workers',
          'freq_db',
          'trie_cache',
          'suggestion_api',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'snapshot_publish',
        name: 'Atomic trie snapshot publish',
        description:
          'Aggregation workers build a new trie snapshot from frequency DB -> trie service validates -> DB stores versioned snapshot -> API flips to new version atomically',
        expectedNodeSequence: [
          'agg_workers',
          'freq_db',
          'trie_service',
          'trie_db',
          'suggestion_api',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'bad_suggestion_filtering',
        name: 'Moderation before publish',
        description:
          'Aggregators apply deny lists, PII heuristics, and moderation status before a term can enter cache or trie snapshot',
        expectedNodeSequence: [
          'mq',
          'agg_workers',
          'freq_db',
          'trie_service',
          'trie_db',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'hot_prefix_replication',
        name: 'Hot-prefix replication',
        description:
          'System detects prefix hotspot -> replicates cached results and trie partitions for that prefix across multiple serving nodes',
        expectedNodeSequence: [
          'suggestion_api',
          'trie_cache',
          'trie_service',
          'trie_db',
        ],
        required: false,
        priority: 5,
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
      {
        id: 'curve_cache_stampede_short_prefix',
        type: 'scale_spike',
        targetNodeType: 'cache',
        scenarioTemplate:
          'The cached result for prefix "a" expires during peak traffic and 20K requests/second all miss at once. How do you prevent a cache stampede?',
        expectedMitigations: [
          'jittered TTLs',
          'request coalescing or single-flight rebuild',
          'serve stale while revalidating',
          'never expire extremely hot prefixes without a warm replacement',
        ],
        redFlags: [
          'let every request rebuild',
          'same TTL for all hot prefixes',
          'no stale cache strategy',
        ],
      },
      {
        id: 'curve_bad_suggestion',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A private phone number or offensive phrase becomes frequent enough to appear in top suggestions. Where do you block it, and how do you remove it quickly?',
        expectedMitigations: [
          'moderation pipeline before publish',
          'deny list and PII detector',
          'emergency invalidation of cache and snapshot entries',
          'audit trail for bad-suggestion reports',
        ],
        redFlags: [
          'trust raw popularity only',
          'manual database edit with no cache purge',
          'no abuse review path',
        ],
      },
      {
        id: 'curve_partial_snapshot_publish',
        type: 'failure',
        targetNodeType: 'database',
        scenarioTemplate:
          'A new trie snapshot is half-written when the builder crashes. Some servers load version N+1 and others still use version N. How do you keep responses coherent?',
        expectedMitigations: [
          'write immutable versioned snapshots',
          'validate manifest/checksum before publish',
          'atomic pointer flip',
          'rollback to last known-good snapshot',
        ],
        redFlags: [
          'overwrite live trie in place',
          'no snapshot versioning',
          'no validation before readers switch',
        ],
      },
      {
        id: 'curve_locale_hotspot',
        type: 'constraint_change',
        targetNodeType: 'service',
        scenarioTemplate:
          'The product expands to Japan and Korea. Normalization, tokenization, and prefix behavior no longer match English assumptions. What changes?',
        expectedMitigations: [
          'locale-specific analyzers and dictionaries',
          'partition cache/trie by locale',
          'Unicode normalization and case folding',
          'separate ranking statistics per locale',
        ],
        redFlags: [
          'ASCII-only prefix logic',
          'single global ranking for all locales',
          'ignore IME composition behavior',
        ],
      },
      {
        id: 'curve_query_log_lag',
        type: 'dependency_outage',
        targetNodeType: 'queue',
        scenarioTemplate:
          'Kafka ingestion is delayed by 45 minutes. Serving traffic is fine, but trending suggestions stop updating. What degrades and what alerts fire?',
        expectedMitigations: [
          'serve base trie snapshot while overlay is stale',
          'alert on stream lag and overlay age',
          'backfill missed windows',
          'separate serving SLO from freshness SLO',
        ],
        redFlags: [
          'serving depends synchronously on Kafka',
          'no freshness metric',
          'drop delayed logs permanently',
        ],
      },
      {
        id: 'curve_ranking_gaming',
        type: 'failure',
        targetNodeType: 'worker',
        scenarioTemplate:
          'A botnet issues millions of searches for a scam phrase to push it into autocomplete. How do you make ranking robust?',
        expectedMitigations: [
          'rate-limit or downweight suspicious sources',
          'unique-user and trust-weighted counts',
          'abuse classifier before publish',
          'manual review for fast-moving new terms',
        ],
        redFlags: [
          'rank by raw query count only',
          'no source-level anomaly detection',
          'no rollback/removal mechanism',
        ],
      },
      {
        id: 'curve_trie_memory_pressure',
        type: 'cost_pressure',
        targetNodeType: 'cache',
        scenarioTemplate:
          'The compressed trie grows from 100GB to 350GB after adding many locales and long-tail queries. How do you reduce memory without hurting latency?',
        expectedMitigations: [
          'store only top-K on internal nodes',
          'prune low-frequency long-tail terms',
          'separate hot in-memory index from cold snapshot',
          'use weighted FST/compression and per-locale shards',
        ],
        redFlags: [
          'keep every query forever in RAM',
          'move whole serving path to disk',
          'no retention/pruning policy',
        ],
      },
      {
        id: 'curve_trie_service_down',
        type: 'dependency_outage',
        targetNodeType: 'service',
        scenarioTemplate:
          'Trie service is down, but Redis still has hot prefixes. What should the Suggestion API do for hot and long-tail prefixes?',
        expectedMitigations: [
          'serve cached hot prefixes',
          'fail gracefully with empty/stale response for long-tail',
          'circuit breaker around trie service',
          'warm standby trie readers',
        ],
        redFlags: [
          'block every request on trie service',
          'return 500 for all prefixes',
          'no circuit breaker',
        ],
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
      {
        id: 'probe_autocomplete_ranking',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'worker'],
        primaryQuestionTemplate:
          'How is the suggestion score computed when a term is both historically popular and suddenly trending?',
        expectedSignals: [
          'blend long-term frequency with sliding-window recent counts',
          'per-locale score',
          'moderation gate before publishing',
          'tie-breakers such as exact prefix and recency',
        ],
        redFlags: [
          'raw count only',
          'no protection against spammed queries',
          'same ranking across every locale',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What weight would you give recent traffic versus historical frequency, and how would you tune it?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_update_pipeline',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['queue', 'worker', 'database'],
        primaryQuestionTemplate:
          'Describe the end-to-end path from a user query log to a new suggestion appearing in production.',
        expectedSignals: [
          'async log collection',
          'Kafka aggregation',
          'frequency DB',
          'versioned trie snapshot build',
          'atomic publish and cache warming',
        ],
        redFlags: [
          'write into serving trie synchronously per query',
          'no snapshot validation',
          'no backfill for delayed logs',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What exactly happens if the snapshot builder crashes halfway through writing the new trie?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_hot_prefix',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['cache', 'service'],
        primaryQuestionTemplate:
          'Prefix "a" and "s" dominate traffic. How do you shard and cache these prefixes without overloading one partition?',
        expectedSignals: [
          'hot-prefix replication',
          'request coalescing',
          'cache complete top-K response',
          'avoid pure alphabetical sharding',
        ],
        redFlags: [
          'single shard for each first letter',
          'no cache stampede prevention',
          'no per-prefix traffic metric',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you a prefix has become hot enough to replicate?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_freshness',
        stage: 'DEEP_DIVE',
        dimension: 'latency',
        appliesToNodeTypes: ['cache', 'worker'],
        primaryQuestionTemplate:
          'How do you make a new trending query appear within minutes if the main trie rebuild runs hourly?',
        expectedSignals: [
          'streaming overlay',
          'Redis sorted set or suggestion dictionary for recent top-K',
          'merge overlay with base trie results',
          'TTL/sliding window for recent scores',
        ],
        redFlags: [
          'wait for hourly rebuild only',
          'mutate the large trie for every query',
          'no way to expire old trends',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How do you prevent a short-lived trend from polluting suggestions for the next day?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_moderation',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['worker', 'service', 'cache'],
        primaryQuestionTemplate:
          'What prevents private, offensive, or legally unsafe text from being shown as an autocomplete suggestion?',
        expectedSignals: [
          'moderation status in suggestion record',
          'deny list and PII heuristics',
          'block before cache/trie publish',
          'emergency cache invalidation',
        ],
        redFlags: [
          'popularity alone decides visibility',
          'filter only on the client',
          'no rapid removal path',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'If a bad suggestion is already cached globally, how do you purge it within minutes?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_privacy',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'worker', 'database'],
        primaryQuestionTemplate:
          'Search queries can contain PII. What do you store in logs, and what do you deliberately not store?',
        expectedSignals: [
          'anonymize or hash user identifiers',
          'query retention policy',
          'rare-query suppression',
          'access controls for raw logs',
        ],
        redFlags: [
          'store raw user_id and full query forever',
          'make one-user queries suggestible',
          'no retention or deletion policy',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'How would you debug relevance regressions if raw query logs are aggressively redacted?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_locale',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'How does your design change for languages where character, token, and IME behavior differ from English?',
        expectedSignals: [
          'locale-specific normalization/analyzers',
          'per-locale trie/cache partitions',
          'Unicode normalization',
          'separate ranking statistics',
        ],
        redFlags: [
          'ASCII-only assumptions',
          'single global dictionary',
          'ignore composition events from mobile keyboards',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'Where is locale decided: client request, user profile, Accept-Language, or query classifier?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_cost',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['cache', 'database'],
        primaryQuestionTemplate:
          'If the trie grows beyond memory budget, what do you prune or move cold without increasing p99 latency for hot prefixes?',
        expectedSignals: [
          'prune low-frequency long-tail',
          'hot prefix cache stays in memory',
          'compressed FST/trie',
          'cold snapshot on cheaper storage',
        ],
        redFlags: [
          'put all prefixes on disk',
          'keep every observed query forever',
          'no memory budget by locale/prefix',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which metric tells you pruning has hurt suggestion quality?',
          },
        ],
      },
      {
        id: 'probe_autocomplete_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'cache', 'worker'],
        primaryQuestionTemplate:
          'What dashboards and alerts would catch latency, freshness, and bad-suggestion problems before users complain?',
        expectedSignals: [
          'p99 latency by prefix length',
          'cache hit rate',
          'aggregation lag',
          'snapshot age/version',
          'bad-suggestion report rate',
        ],
        redFlags: [
          'only monitor CPU',
          'no freshness metric',
          'no per-prefix visibility',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What SLO would you set for trending freshness separately from request latency?',
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
        {
          dimension: 'scope',
          key: 'core_functionality',
          answer:
            'The system accepts notification events, applies user preferences and policy, renders channel-specific payloads, delivers through push/email/SMS providers, and records delivery attempts.',
          discloseWhen: [
            'scope',
            'functionality',
            'what does it do',
            'delivery pipeline',
            'requirements',
          ],
        },
        {
          dimension: 'scope',
          key: 'notification_types',
          answer:
            'Support transactional and product notifications such as OTP, payment alerts, ride updates, social likes/comments, reminders, and marketing campaigns.',
          discloseWhen: [
            'types',
            'otp',
            'marketing',
            'transactional',
            'campaign',
            'examples',
          ],
        },
        {
          dimension: 'data',
          key: 'event_contract',
          answer:
            'A notification event contains notification_id, tenant/app_id, user_id, template_id, channel candidates, priority, dedupe_key, locale, payload variables, TTL, scheduled_at, and trace_id.',
          discloseWhen: [
            'schema',
            'event',
            'contract',
            'payload',
            'fields',
            'idempotency',
          ],
        },
        {
          dimension: 'data',
          key: 'delivery_attempt_record',
          answer:
            'Each delivery attempt records notification_id, channel, target token/address, provider_message_id, attempt_number, status, provider_error_code, sent_at, and next_retry_at.',
          discloseWhen: [
            'attempt',
            'log',
            'status',
            'provider response',
            'audit',
            'tracking',
          ],
        },
        {
          dimension: 'data',
          key: 'template_model',
          answer:
            'Templates are versioned per channel and locale, with variable allow-lists, preview tests, fallback locale, and approval status before production use.',
          discloseWhen: [
            'template',
            'localization',
            'locale',
            'variables',
            'version',
            'copy',
          ],
        },
        {
          dimension: 'data',
          key: 'preference_model',
          answer:
            'User preferences include channel opt-in, notification category, quiet hours, timezone, frequency caps, unsubscribes, and legal consent state.',
          discloseWhen: [
            'preference',
            'opt in',
            'unsubscribe',
            'quiet hours',
            'timezone',
            'consent',
          ],
        },
        {
          dimension: 'data',
          key: 'device_token_model',
          answer:
            'Device token records include user_id, platform, token, app_version, locale, environment, last_seen_at, validity_status, and provider feedback timestamp.',
          discloseWhen: [
            'device token',
            'token db',
            'apns',
            'fcm',
            'registration token',
            'invalid token',
          ],
        },
        {
          dimension: 'nfr',
          key: 'delivery_semantics',
          answer:
            'The internal pipeline is at-least-once; exactly-once provider delivery is not guaranteed, so idempotency and deduplication are required at the worker/log layer.',
          discloseWhen: [
            'delivery guarantee',
            'at least once',
            'exactly once',
            'duplicates',
            'semantics',
          ],
        },
        {
          dimension: 'nfr',
          key: 'priority_classes',
          answer:
            'Use separate priority lanes: critical/OTP and safety alerts, transactional updates, social engagement, reminders, and bulk marketing.',
          discloseWhen: [
            'priority',
            'otp',
            'critical',
            'marketing',
            'queue',
            'lane',
          ],
        },
        {
          dimension: 'nfr',
          key: 'ttl_and_expiry',
          answer:
            'Every notification has TTL/expiry; expired notifications are dropped or marked expired instead of being retried forever.',
          discloseWhen: [
            'ttl',
            'expiry',
            'expiration',
            'retry forever',
            'stale notification',
          ],
        },
        {
          dimension: 'nfr',
          key: 'retry_policy',
          answer:
            'Transient provider failures use bounded retries with exponential backoff and jitter; permanent errors such as invalid tokens are not retried.',
          discloseWhen: [
            'retry',
            'backoff',
            'jitter',
            'temporary failure',
            'permanent error',
          ],
        },
        {
          dimension: 'nfr',
          key: 'dead_letter_queue',
          answer:
            'After retry budget is exhausted, failed attempts move to a DLQ with reason, payload reference, provider response, and replay controls.',
          discloseWhen: [
            'dlq',
            'dead letter',
            'failed',
            'replay',
            'retry exhausted',
          ],
        },
        {
          dimension: 'constraints',
          key: 'provider_behavior',
          answer:
            'APNs and FCM accept messages for delivery but final device delivery depends on device state, TTL, priority, platform throttling, token validity, and provider availability.',
          discloseWhen: [
            'provider',
            'apns',
            'fcm',
            'accepted',
            'delivered',
            'device offline',
          ],
        },
        {
          dimension: 'constraints',
          key: 'provider_rate_limits',
          answer:
            'Workers must enforce per-provider, per-app, and per-token rate limits before hitting APNs, FCM, email, or SMS gateways.',
          discloseWhen: [
            'rate limit',
            '429',
            'quota',
            'throttle',
            'provider limit',
          ],
        },
        {
          dimension: 'constraints',
          key: 'fanout_strategy',
          answer:
            'Large campaigns are segmented, scheduled, and smoothed over time; do not enqueue a 10M-user blast into the same FIFO lane as OTP traffic.',
          discloseWhen: [
            'fanout',
            'campaign',
            'blast',
            '10m',
            'marketing',
            'spike',
          ],
        },
        {
          dimension: 'constraints',
          key: 'channel_fallback',
          answer:
            'Fallback channels are policy-driven, not automatic for every failure; for example OTP may fall back from push to SMS, while marketing should not bypass unsubscribe preferences.',
          discloseWhen: [
            'fallback',
            'sms fallback',
            'push failed',
            'email fallback',
            'policy',
          ],
        },
        {
          dimension: 'constraints',
          key: 'compliance',
          answer:
            'Email/SMS must honor unsubscribe, consent, quiet hours, frequency caps, and regional rules; transactional notices may have different rules from marketing.',
          discloseWhen: [
            'compliance',
            'unsubscribe',
            'consent',
            'quiet hours',
            'gdpr',
            'legal',
          ],
        },
        {
          dimension: 'constraints',
          key: 'security_privacy',
          answer:
            'Payloads should minimize PII, encrypt sensitive data at rest/in transit, avoid secrets in push payloads, and restrict template/payload access by role.',
          discloseWhen: [
            'security',
            'privacy',
            'pii',
            'secret',
            'encryption',
            'payload',
          ],
        },
        {
          dimension: 'nfr',
          key: 'operability',
          answer:
            'Operators need dashboards for queue lag by priority/channel, send success rate, provider error codes, retry volume, DLQ size, invalid-token rate, and delivery latency.',
          discloseWhen: [
            'metrics',
            'monitoring',
            'dashboard',
            'queue lag',
            'provider errors',
            'dlq',
          ],
        },
        {
          dimension: 'non_goal',
          key: 'in_app_inbox',
          answer:
            'A durable in-app notification inbox/feed is out of scope unless explicitly requested; this problem focuses on outbound delivery.',
          discloseWhen: [
            'inbox',
            'feed',
            'notification center',
            'read unread',
            'store notification',
          ],
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
      {
        id: 'android_push_delivery',
        name: 'Android push delivery',
        description:
          'Router renders payload and routes Android tokens to FCM worker, which logs provider response per token',
        expectedNodeSequence: [
          'kafka',
          'router',
          'preference_db',
          'template_service',
          'device_token_db',
          'android_worker',
          'fcm',
          'log_db',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'sms_delivery',
        name: 'SMS notification',
        description:
          'Router applies policy and sends SMS-eligible events to SMS worker and SMS provider with cost/rate controls',
        expectedNodeSequence: [
          'kafka',
          'router',
          'preference_db',
          'template_service',
          'sms_worker',
          'sms_gateway',
          'log_db',
        ],
        required: false,
        priority: 3,
      },
      {
        id: 'preference_suppression',
        name: 'Preference and compliance suppression',
        description:
          'Router checks opt-in, quiet hours, frequency caps, and legal consent before selecting a channel or suppressing the notification',
        expectedNodeSequence: ['kafka', 'router', 'preference_db', 'log_db'],
        required: true,
        priority: 2,
      },
      {
        id: 'template_rendering',
        name: 'Template rendering and localization',
        description:
          'Router fetches a versioned localized template, validates variables, renders channel-specific payload, and sends to the selected worker',
        expectedNodeSequence: [
          'router',
          'template_service',
          'ios_worker',
          'android_worker',
          'email_worker',
          'sms_worker',
        ],
        required: true,
        priority: 2,
      },
      {
        id: 'retry_and_dlq',
        name: 'Retry and DLQ handling',
        description:
          'Worker classifies provider error, retries transient failures with backoff/jitter, and writes exhausted failures to log/DLQ',
        expectedNodeSequence: [
          'ios_worker',
          'apns',
          'ios_worker',
          'kafka',
          'log_db',
        ],
        required: true,
        priority: 3,
      },
      {
        id: 'invalid_token_cleanup',
        name: 'Invalid token cleanup',
        description:
          'Provider returns invalid/unregistered token -> worker marks token invalid and suppresses future sends to that token',
        expectedNodeSequence: [
          'android_worker',
          'fcm',
          'android_worker',
          'device_token_db',
          'log_db',
        ],
        required: true,
        priority: 3,
      },
      {
        id: 'critical_priority_lane',
        name: 'Critical priority lane',
        description:
          'OTP/payment events use high-priority partitions and workers isolated from marketing campaign backlogs',
        expectedNodeSequence: [
          'api_server',
          'kafka',
          'router',
          'ios_worker',
          'apns',
          'log_db',
        ],
        required: true,
        priority: 1,
      },
      {
        id: 'scheduled_campaign_fanout',
        name: 'Scheduled campaign fanout',
        description:
          'Campaign events are segmented and smoothed over time, then routed through lower-priority workers with provider throttling',
        expectedNodeSequence: [
          'api_server',
          'kafka',
          'router',
          'preference_db',
          'email_worker',
          'email_gateway',
          'log_db',
        ],
        required: false,
        priority: 4,
      },
      {
        id: 'otp_channel_fallback',
        name: 'OTP channel fallback',
        description:
          'If push delivery is unavailable for an OTP, policy allows fallback to SMS while preserving idempotency and audit logging',
        expectedNodeSequence: [
          'kafka',
          'router',
          'device_token_db',
          'ios_worker',
          'apns',
          'sms_worker',
          'sms_gateway',
          'log_db',
        ],
        required: false,
        priority: 4,
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
      {
        id: 'curve_fcm_outage',
        type: 'dependency_outage',
        targetNodeType: 'external_service',
        scenarioTemplate:
          'FCM starts returning 5xx for 20 minutes. How does your system protect critical notifications, avoid retry amplification, and recover?',
        expectedMitigations: [
          'bounded exponential backoff with jitter',
          'circuit breaker per provider',
          'priority-specific retry budgets',
          'DLQ or delayed retry topic for exhausted attempts',
          'fallback only when product policy allows',
        ],
        redFlags: [
          'tight retry loop',
          'global outage blocks APNs/email/SMS',
          'fallback every failed push to SMS automatically',
        ],
      },
      {
        id: 'curve_invalid_token_storm',
        type: 'scale_spike',
        targetNodeType: 'database',
        scenarioTemplate:
          'After a mobile app reinstall wave, 30% of FCM tokens are invalid. What happens to throughput, cost, and the token database?',
        expectedMitigations: [
          'detect UNREGISTERED/invalid token responses',
          'mark tokens invalid asynchronously',
          'suppress future sends to invalid tokens',
          'periodic token refresh and stale token pruning',
        ],
        redFlags: [
          'retry invalid tokens',
          'delete token without checking payload validity',
          'no stale token cleanup job',
        ],
      },
      {
        id: 'curve_marketing_starves_otp',
        type: 'scale_spike',
        targetNodeType: 'queue',
        scenarioTemplate:
          'A 20M-user marketing campaign starts exactly when OTP traffic spikes. OTP p99 delivery jumps from 5s to 90s. How do you isolate critical traffic?',
        expectedMitigations: [
          'separate topics/partitions or queues by priority',
          'reserved worker capacity for critical lane',
          'rate-limit and smooth campaign fanout',
          'backpressure low-priority traffic first',
        ],
        redFlags: [
          'single FIFO queue for all notifications',
          'scale only marketing workers',
          'no per-priority SLO',
        ],
      },
      {
        id: 'curve_quiet_hours_violation',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'Users in multiple timezones receive a promotional SMS during quiet hours and some had unsubscribed. Where should this have been prevented?',
        expectedMitigations: [
          'preference and consent checks in router',
          'timezone-aware quiet hours',
          'category-specific rules for marketing vs transactional',
          'suppression logs for audit',
        ],
        redFlags: [
          'provider handles compliance for us',
          'client-side unsubscribe only',
          'no audit record for suppressed sends',
        ],
      },
      {
        id: 'curve_template_pii_bug',
        type: 'failure',
        targetNodeType: 'service',
        scenarioTemplate:
          'A template deploy accidentally includes an internal account ID and renders the wrong language for 2M users. How do you prevent, detect, and roll back?',
        expectedMitigations: [
          'versioned templates with approval workflow',
          'variable allow-list and preview tests',
          'locale fallback tests',
          'canary rollout and fast rollback',
        ],
        redFlags: [
          'templates edited directly in production',
          'no render validation',
          'no template version in logs',
        ],
      },
      {
        id: 'curve_retry_amplification',
        type: 'failure',
        targetNodeType: 'worker',
        scenarioTemplate:
          'A provider slowdown causes timeouts; every worker retries immediately and total outbound QPS triples. How do you stop the retry storm?',
        expectedMitigations: [
          'exponential backoff with jitter',
          'central retry scheduler or delayed topics',
          'provider-level circuit breaker',
          'retry budget and backpressure',
        ],
        redFlags: [
          'retry immediately on timeout',
          'unbounded worker concurrency',
          'no provider-level outbound limiter',
        ],
      },
      {
        id: 'curve_log_db_down',
        type: 'dependency_outage',
        targetNodeType: 'database',
        scenarioTemplate:
          'Notification Log DB is unavailable. Do you keep sending notifications, and how do you avoid silent drops or duplicate sends?',
        expectedMitigations: [
          'durable queue remains source of truth until acknowledged',
          'write attempt logs asynchronously with retry',
          'idempotency store independent from log DB',
          'pause or degrade channels if audit is mandatory',
        ],
        redFlags: [
          'ack Kafka before durable state exists',
          'drop logs silently',
          'use log DB as the only dedup mechanism',
        ],
      },
      {
        id: 'curve_sms_cost_spike',
        type: 'cost_pressure',
        targetNodeType: 'external_service',
        scenarioTemplate:
          'Push delivery is flaky and the fallback policy starts sending millions of SMS messages, blowing through the monthly budget. What guardrails exist?',
        expectedMitigations: [
          'fallback policy by notification category',
          'cost budgets and per-tenant caps',
          'approval gates for bulk SMS fallback',
          'prefer retry/delay for non-critical notifications',
        ],
        redFlags: [
          'automatic SMS fallback for all push failures',
          'no cost metrics by channel',
          'marketing allowed to bypass caps',
        ],
      },
      {
        id: 'curve_provider_accepted_not_delivered',
        type: 'constraint_change',
        targetNodeType: 'external_service',
        scenarioTemplate:
          'FCM returns a message ID, but users say they never saw the notification because devices were offline or messages expired. What does your SLA actually guarantee?',
        expectedMitigations: [
          'distinguish provider acceptance from device delivery',
          'track delivery receipts where providers expose them',
          'set TTL by notification type',
          'define SLO around accepted/sent and observed delivery separately',
        ],
        redFlags: [
          'treat provider 200 as user-visible delivery',
          'no TTL policy',
          'promise exact device delivery for push',
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
      {
        id: 'probe_notification_event_contract',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service', 'queue'],
        primaryQuestionTemplate:
          'Define the notification event schema you would put on Kafka. Which fields are mandatory for routing, rendering, retry, and deduplication?',
        expectedSignals: [
          'notification_id and dedupe_key',
          'user_id or audience reference',
          'template_id and payload variables',
          'priority, TTL, channels, locale',
          'trace_id for observability',
        ],
        redFlags: [
          'free-form payload only',
          'no stable notification_id',
          'missing TTL or priority',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'What fields belong in the Kafka event versus being looked up from databases at routing time?',
          },
        ],
      },
      {
        id: 'probe_notification_preferences',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database'],
        primaryQuestionTemplate:
          'Where do you enforce opt-in, unsubscribe, quiet hours, category preferences, and regional consent rules?',
        expectedSignals: [
          'router enforces server-side preferences',
          'category-specific policies',
          'timezone-aware quiet hours',
          'suppression log for audit',
        ],
        redFlags: [
          'client decides whether to send',
          'provider handles unsubscribe for every channel',
          'no audit of suppressed notifications',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How do you handle a transactional fraud alert during quiet hours versus a marketing SMS?',
          },
        ],
      },
      {
        id: 'probe_notification_provider_retries',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['worker', 'external_service'],
        primaryQuestionTemplate:
          'How does a worker classify APNs/FCM/email/SMS provider responses into success, permanent failure, retryable failure, and throttling?',
        expectedSignals: [
          'provider-specific error mapping',
          '429 and 5xx backoff with jitter',
          'invalid token marked permanent',
          'retry budget and DLQ',
        ],
        redFlags: [
          'retry every error',
          'treat provider responses identically',
          'ignore Retry-After or quota signals',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'Which provider error codes would page the on-call versus only trigger throttling?',
          },
        ],
      },
      {
        id: 'probe_notification_token_lifecycle',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['database', 'worker'],
        primaryQuestionTemplate:
          'How do APNs/FCM device tokens enter your system, get refreshed, and get removed when invalid or stale?',
        expectedSignals: [
          'client registers token with timestamp',
          'periodic token refresh',
          'provider invalid-token feedback cleanup',
          'stale token pruning',
        ],
        redFlags: [
          'tokens never expire',
          'retry invalid tokens forever',
          'no environment/platform distinction',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Do you hard-delete invalid tokens immediately or mark them invalid first, and why?',
          },
        ],
      },
      {
        id: 'probe_notification_template_localization',
        stage: 'DEEP_DIVE',
        dimension: 'data_model',
        appliesToNodeTypes: ['service'],
        primaryQuestionTemplate:
          'How do you design templates so that email, push, and SMS can be localized safely without leaking PII or breaking production?',
        expectedSignals: [
          'versioned templates',
          'locale fallback',
          'variable allow-list',
          'render preview/tests',
          'approval and rollback workflow',
        ],
        redFlags: [
          'edit templates directly in production',
          'unvalidated arbitrary variables',
          'no template version in delivery logs',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How would you roll back a bad template after 10% of a campaign has already been sent?',
          },
        ],
      },
      {
        id: 'probe_notification_dlq_replay',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['queue', 'worker'],
        primaryQuestionTemplate:
          'What goes into the DLQ, who can replay it, and how do you prevent replay from sending duplicate notifications?',
        expectedSignals: [
          'failure reason and provider response',
          'payload reference not raw secrets',
          'controlled replay with idempotency',
          'separate replay rate limits',
        ],
        redFlags: [
          'operators manually publish raw messages',
          'no replay audit',
          'replay bypasses dedupe checks',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'Would you replay an expired notification from the DLQ? Why or why not?',
          },
        ],
      },
      {
        id: 'probe_notification_channel_fallback',
        stage: 'DEEP_DIVE',
        dimension: 'reliability',
        appliesToNodeTypes: ['service', 'worker'],
        primaryQuestionTemplate:
          'When push fails, when should you fall back to email or SMS, and when should you not?',
        expectedSignals: [
          'policy by notification category',
          'respect consent/unsubscribe',
          'cost and rate-limit guardrails',
          'idempotency across channels',
        ],
        redFlags: [
          'fallback every push failure to SMS',
          'ignore marketing consent',
          'no cross-channel dedupe',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'How would fallback differ for OTP, ride arrival, social like, and marketing promo?',
          },
        ],
      },
      {
        id: 'probe_notification_priority_capacity',
        stage: 'DEEP_DIVE',
        dimension: 'scalability',
        appliesToNodeTypes: ['queue', 'worker'],
        primaryQuestionTemplate:
          'How do you allocate partitions, workers, and rate limits so critical traffic keeps its SLO during bulk campaign fanout?',
        expectedSignals: [
          'separate topics/queues by priority',
          'reserved critical worker capacity',
          'campaign smoothing',
          'backpressure low-priority traffic',
        ],
        redFlags: [
          'all traffic in one FIFO queue',
          'workers pull whatever arrives first',
          'no per-priority lag alert',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'What queue-lag SLO would you set for OTP versus marketing?',
          },
        ],
      },
      {
        id: 'probe_notification_observability',
        stage: 'DEEP_DIVE',
        dimension: 'operability',
        appliesToNodeTypes: ['service', 'worker', 'database'],
        primaryQuestionTemplate:
          'What would you put on the notification operations dashboard and what alerts would wake someone up?',
        expectedSignals: [
          'queue lag by channel/priority',
          'provider error rates',
          'p99 delivery latency',
          'retry and DLQ volume',
          'invalid token rate',
          'suppression counts',
        ],
        redFlags: [
          'only count submitted notifications',
          'no provider-specific visibility',
          'no trace from notification_id to provider attempt',
        ],
        followUps: [
          {
            trigger: 'missing_metric',
            questionTemplate:
              'How do you distinguish provider acceptance from actual user-visible delivery in your metrics?',
          },
        ],
      },
      {
        id: 'probe_notification_cost_controls',
        stage: 'DEEP_DIVE',
        dimension: 'cost',
        appliesToNodeTypes: ['service', 'external_service'],
        primaryQuestionTemplate:
          'SMS and email are not free. What cost controls prevent one bug or fallback policy from creating a huge bill?',
        expectedSignals: [
          'per-channel budgets',
          'per-tenant or campaign caps',
          'approval for bulk SMS',
          'fallback guardrails',
          'cost metrics and alerts',
        ],
        redFlags: [
          'no cost visibility by channel',
          'automatic SMS fallback for all failures',
          'marketing bypasses budget caps',
        ],
        followUps: [
          {
            trigger: 'missing_tradeoff',
            questionTemplate:
              'If a critical OTP SMS budget cap is hit, do you block sends or page an operator?',
          },
        ],
      },
      {
        id: 'probe_notification_security_privacy',
        stage: 'DEEP_DIVE',
        dimension: 'security',
        appliesToNodeTypes: ['service', 'database', 'external_service'],
        primaryQuestionTemplate:
          'What sensitive data appears in notification payloads, logs, templates, and provider calls, and how do you minimize exposure?',
        expectedSignals: [
          'avoid secrets/PII in push payloads',
          'encrypt sensitive data at rest and in transit',
          'least-privilege template access',
          'redacted logs',
          'audit access to payload variables',
        ],
        redFlags: [
          'send full sensitive content in push payload',
          'store raw payloads forever',
          'any marketer can edit transactional templates',
        ],
        followUps: [
          {
            trigger: 'vague_answer',
            questionTemplate:
              'What would you include in an OTP notification payload and what would you keep server-side only?',
          },
        ],
      },
    ],
  },
};
