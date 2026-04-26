import { DataSource } from 'typeorm';
import { SDProblem } from './entities/sd-problem.entity';

export const SD_PROBLEM_SEEDS: Partial<SDProblem>[] = [
  // ─── 1. URL Shortener (Pastebin / Bit.ly) ───────────────────────────────────
  {
    title: 'Design a URL Shortener (Pastebin / Bit.ly)',
    domain: 'url-shortener',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 400,
      dau: 1_000_000,
      readWriteRatio: '10:1',
      storageTarget: '450 GB / 3 years',
      p99Latency: '< 200ms reads',
    },
    expectedComponents: [
      'Client',
      'DNS',
      'Load Balancer',
      'Web Server',
      'Write API',
      'Read API',
      'SQL Database',
      'Object Storage',
      'Cache',
      'CDN',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'dns', type: 'external-service', label: 'DNS' },
        { id: 'cdn', type: 'cdn', label: 'CDN' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'write_api', type: 'web-server', label: 'Write API' },
        { id: 'read_api', type: 'web-server', label: 'Read API' },
        { id: 'cache', type: 'cache', label: 'Memory Cache (Redis)' },
        { id: 'sql_master', type: 'database', label: 'SQL Master (Write)' },
        { id: 'sql_replica', type: 'database', label: 'SQL Replicas (Read)' },
        {
          id: 'object_store',
          type: 'object-storage',
          label: 'Object Store (S3)',
        },
        {
          id: 'analytics_db',
          type: 'database',
          label: 'Analytics DB (Redshift)',
        },
        { id: 'mapreduce', type: 'worker', label: 'MapReduce Worker' },
      ],
      edges: [
        { from: 'client', to: 'dns', label: 'DNS lookup' },
        { from: 'client', to: 'cdn', label: 'Static assets' },
        { from: 'client', to: 'lb', label: 'HTTP' },
        { from: 'lb', to: 'write_api', label: 'Write requests' },
        { from: 'lb', to: 'read_api', label: 'Read requests' },
        { from: 'write_api', to: 'sql_master', label: 'Write' },
        { from: 'write_api', to: 'object_store', label: 'Store paste content' },
        { from: 'read_api', to: 'cache', label: 'Cache lookup' },
        { from: 'read_api', to: 'sql_replica', label: 'Cache miss → DB read' },
        { from: 'sql_master', to: 'sql_replica', label: 'Replication' },
        { from: 'mapreduce', to: 'analytics_db', label: 'Aggregate analytics' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Một paste viral được share 500,000 lần trong 10 phút. Cache hit ratio đột ngột drop về 20%. Bạn xử lý thundering herd thế nào?',
        expectedAdaptation:
          'Thêm cache warming / request coalescing; hoặc dùng distributed lock để chỉ 1 request populate cache khi miss',
      },
      {
        trigger: 'componentCoverage >= 80% AND phase == DEEP_DIVE',
        prompt:
          'Yêu cầu mới: hỗ trợ custom alias (người dùng tự đặt slug). Collision handling của bạn thay đổi gì?',
        expectedAdaptation:
          'Cần unique constraint trên slug column; retry logic khi collision; rate-limit custom aliases để tránh namespace squatting',
      },
    ],
    tags: ['url-shortener', 'caching', 'read-heavy', 'hashing', 'mid-level'],
  },

  // ─── 2. Twitter Timeline & Search ──────────────────────────────────────────
  {
    title: 'Design Twitter Timeline & Search',
    domain: 'social-feed',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 100_000,
      dau: 100_000_000,
      readWriteRatio: '1000:1',
      storageTarget: '5.4 PB / 3 years',
      p99Latency: '< 500ms timeline read',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Write API',
      'Read API',
      'Fan-out Service',
      'User Graph Service',
      'Timeline Service',
      'Search Service',
      'Message Queue',
      'Cache (Redis)',
      'SQL Database',
      'Object Storage',
      'CDN',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'cdn', type: 'cdn', label: 'CDN' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        {
          id: 'web_server',
          type: 'web-server',
          label: 'Web Server (Reverse Proxy)',
        },
        { id: 'write_api', type: 'web-server', label: 'Write API' },
        { id: 'read_api', type: 'web-server', label: 'Read API' },
        { id: 'search_api', type: 'web-server', label: 'Search API' },
        { id: 'fanout_service', type: 'worker', label: 'Fan-out Service' },
        { id: 'user_graph', type: 'web-server', label: 'User Graph Service' },
        {
          id: 'search_cluster',
          type: 'web-server',
          label: 'Search Cluster (Lucene)',
        },
        {
          id: 'timeline_cache',
          type: 'cache',
          label: 'Timeline Cache (Redis)',
        },
        { id: 'tweet_cache', type: 'cache', label: 'Tweet/User Info Cache' },
        { id: 'mq', type: 'message-queue', label: 'Message Queue' },
        { id: 'sql_db', type: 'database', label: 'SQL Database' },
        {
          id: 'object_store',
          type: 'object-storage',
          label: 'Object Store (Media)',
        },
        {
          id: 'notification_service',
          type: 'worker',
          label: 'Notification Service',
        },
      ],
      edges: [
        { from: 'client', to: 'cdn', label: 'Static / media' },
        { from: 'client', to: 'lb', label: 'HTTP' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'write_api', label: 'Tweet POST' },
        { from: 'web_server', to: 'read_api', label: 'Timeline GET' },
        { from: 'web_server', to: 'search_api', label: 'Search query' },
        { from: 'write_api', to: 'sql_db', label: 'Persist tweet' },
        { from: 'write_api', to: 'object_store', label: 'Upload media' },
        { from: 'write_api', to: 'fanout_service', label: 'Async fanout' },
        { from: 'fanout_service', to: 'user_graph', label: 'Get followers' },
        {
          from: 'fanout_service',
          to: 'timeline_cache',
          label: 'Push to follower timelines',
        },
        { from: 'fanout_service', to: 'mq', label: 'Notify / search index' },
        {
          from: 'read_api',
          to: 'timeline_cache',
          label: 'Home timeline read (O(1))',
        },
        { from: 'read_api', to: 'tweet_cache', label: 'Hydrate tweet data' },
        { from: 'read_api', to: 'sql_db', label: 'User timeline (cache miss)' },
        {
          from: 'search_api',
          to: 'search_cluster',
          label: 'Scatter-gather query',
        },
        { from: 'mq', to: 'notification_service', label: 'Push notifications' },
        { from: 'mq', to: 'search_cluster', label: 'Index new tweets' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Một celebrity với 50 triệu followers vừa post tweet. Fan-out service của bạn sẽ mất bao lâu? Bạn xử lý "hotkey" này thế nào?',
        expectedAdaptation:
          'Hybrid fanout: push cho followers active, pull cho accounts có nhiều followers (hotkey bypass); hoặc lazy fanout kết hợp celebrity tweet được preloaded riêng',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Trending topic cần được update realtime (< 30s). Kiến trúc hiện tại của bạn hỗ trợ điều này không? Nếu không, thêm gì?',
        expectedAdaptation:
          'Cần stream processing (Kafka + Flink/Storm) để count tweet volume theo keyword trong sliding window; separate trending service với write-through cache',
      },
    ],
    tags: [
      'social-feed',
      'fan-out',
      'caching',
      'search',
      'write-heavy',
      'senior-level',
    ],
  },

  // ─── 3. Web Crawler ─────────────────────────────────────────────────────────
  {
    title: 'Design a Web Crawler',
    domain: 'web-crawler',
    targetRole: ['backend', 'data-eng'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 1_600,
      dau: undefined,
      readWriteRatio: '25:1',
      storageTarget: '72 PB / 3 years',
      p99Latency: '< 100ms search queries',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Crawler Service',
      'Reverse Index Service',
      'Document Service',
      'Query API',
      'NoSQL Database',
      'Cache (Redis)',
      'Message Queue',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'web_server', type: 'web-server', label: 'Web Server' },
        { id: 'query_api', type: 'web-server', label: 'Query API Server' },
        { id: 'crawler', type: 'worker', label: 'Crawler Service' },
        {
          id: 'reverse_index',
          type: 'web-server',
          label: 'Reverse Index Service',
        },
        { id: 'doc_service', type: 'web-server', label: 'Document Service' },
        { id: 'cache', type: 'cache', label: 'Cache (Redis/Memcached)' },
        { id: 'nosql', type: 'database', label: 'NoSQL DB (crawled links)' },
        {
          id: 'redis_queue',
          type: 'cache',
          label: 'Redis Sorted Set (priority queue)',
        },
        { id: 'mq', type: 'message-queue', label: 'Task Queue' },
      ],
      edges: [
        { from: 'client', to: 'lb', label: 'Search query' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'query_api', label: '' },
        { from: 'query_api', to: 'cache', label: 'Popular query cache' },
        {
          from: 'query_api',
          to: 'reverse_index',
          label: 'Cache miss → index lookup',
        },
        { from: 'query_api', to: 'doc_service', label: 'Get title/snippet' },
        {
          from: 'crawler',
          to: 'redis_queue',
          label: 'Pop highest priority URL',
        },
        { from: 'crawler', to: 'nosql', label: 'Check & store page signature' },
        { from: 'crawler', to: 'mq', label: 'Queue indexing job' },
        { from: 'mq', to: 'reverse_index', label: 'Build index' },
        { from: 'mq', to: 'doc_service', label: 'Generate snippet' },
        { from: 'reverse_index', to: 'nosql', label: 'Persist index' },
        { from: 'doc_service', to: 'nosql', label: 'Persist documents' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Website A liên tục tạo dynamic URLs vô hạn (crawler trap). Hệ thống của bạn có bị stuck trong vòng lặp vô tận không? Xử lý thế nào?',
        expectedAdaptation:
          'URL normalization; max depth per domain; detect & blacklist domains với quá nhiều unique URLs; robots.txt compliance; page signature để detect duplicate content',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Breaking news xuất hiện — cần index trang mới trong < 5 phút thay vì queue weekly crawl. Thêm gì?',
        expectedAdaptation:
          'Separate high-priority crawl queue; sitemap ping / PubSubHubbub subscription; priority boost cho URLs được nhiều site link đến trong 24h qua',
      },
    ],
    tags: [
      'crawler',
      'indexing',
      'distributed',
      'queue',
      'data-pipeline',
      'senior-level',
    ],
  },

  // ─── 4. Personal Finance Manager (Mint.com) ─────────────────────────────────
  {
    title: 'Design a Personal Finance Manager (Mint.com)',
    domain: 'fintech',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 2_000,
      dau: 10_000_000,
      readWriteRatio: '1:10',
      storageTarget: '9 TB / 3 years',
      p99Latency: '< 500ms dashboard load',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Accounts API',
      'Transaction Extraction Service',
      'Category Service',
      'Budget Service',
      'Notification Service',
      'SQL Database',
      'Object Storage',
      'Message Queue',
      'Cache',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'web_server', type: 'web-server', label: 'Web Server' },
        { id: 'accounts_api', type: 'web-server', label: 'Accounts API' },
        { id: 'read_api', type: 'web-server', label: 'Read API' },
        { id: 'mq', type: 'message-queue', label: 'Message Queue (SQS)' },
        {
          id: 'extract_service',
          type: 'worker',
          label: 'Transaction Extraction Service',
        },
        { id: 'category_service', type: 'worker', label: 'Category Service' },
        { id: 'budget_service', type: 'worker', label: 'Budget Service' },
        {
          id: 'notification_service',
          type: 'worker',
          label: 'Notification Service',
        },
        { id: 'cache', type: 'cache', label: 'Cache (Redis)' },
        { id: 'sql_master', type: 'database', label: 'SQL Master' },
        { id: 'sql_replica', type: 'database', label: 'SQL Replicas' },
        {
          id: 'object_store',
          type: 'object-storage',
          label: 'Object Store (raw logs)',
        },
        {
          id: 'analytics_db',
          type: 'database',
          label: 'Analytics DB (Redshift)',
        },
      ],
      edges: [
        { from: 'client', to: 'lb', label: 'HTTP' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'accounts_api', label: 'Link account' },
        {
          from: 'web_server',
          to: 'read_api',
          label: 'Dashboard / budget read',
        },
        { from: 'accounts_api', to: 'mq', label: 'Queue extraction job' },
        { from: 'accounts_api', to: 'sql_master', label: 'Save account' },
        { from: 'mq', to: 'extract_service', label: 'Extract transactions' },
        {
          from: 'extract_service',
          to: 'object_store',
          label: 'Archive raw logs',
        },
        {
          from: 'extract_service',
          to: 'category_service',
          label: 'Categorize',
        },
        {
          from: 'category_service',
          to: 'budget_service',
          label: 'Update budget',
        },
        {
          from: 'budget_service',
          to: 'sql_master',
          label: 'Write transactions',
        },
        {
          from: 'budget_service',
          to: 'notification_service',
          label: 'Trigger alert if over budget',
        },
        { from: 'read_api', to: 'cache', label: 'Session / aggregated stats' },
        { from: 'read_api', to: 'sql_replica', label: 'Cache miss' },
        { from: 'sql_master', to: 'sql_replica', label: 'Replication' },
        {
          from: 'analytics_db',
          to: 'analytics_db',
          label: 'MapReduce → spending aggregates',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Bank API của một đối tác trả về duplicate transactions trong 2 giờ liên tiếp do lỗi phía họ. Dashboard người dùng hiển thị số dư âm. Idempotency của bạn ở đâu?',
        expectedAdaptation:
          'Idempotency key (transaction_id từ bank + account_id) làm unique constraint; extraction service phải check trước khi insert; retry-safe message processing với deduplication window',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Yêu cầu mới: real-time spending alert — nếu chi tiêu trong 1 giờ vượt 20% tháng budget, notify ngay. Kiến trúc batch hiện tại có đáp ứng không?',
        expectedAdaptation:
          'Cần stream processing layer (Kafka + sliding window aggregate); budget_service phải stateful; hoặc dùng Redis counter increment per category + TTL-based threshold check',
      },
    ],
    tags: [
      'fintech',
      'etl',
      'async-processing',
      'notification',
      'write-heavy',
      'mid-level',
    ],
  },

  // ─── 5. Key-Value Cache / Query Cache ───────────────────────────────────────
  {
    title: 'Design a Distributed Key-Value Cache',
    domain: 'distributed-cache',
    targetRole: ['backend'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 4_000,
      dau: 10_000_000,
      readWriteRatio: '100:1',
      storageTarget: '2.7 TB if all queries cached',
      p99Latency: '< 10ms cache read',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Query API',
      'Cache Cluster (Redis/Memcached)',
      'Reverse Index Service',
      'Document Service',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'web_server', type: 'web-server', label: 'Web Server' },
        { id: 'query_api', type: 'web-server', label: 'Query API Server' },
        { id: 'cache_shard_1', type: 'cache', label: 'Cache Shard 1 (LRU)' },
        { id: 'cache_shard_2', type: 'cache', label: 'Cache Shard 2 (LRU)' },
        { id: 'cache_shard_3', type: 'cache', label: 'Cache Shard 3 (LRU)' },
        {
          id: 'reverse_index',
          type: 'web-server',
          label: 'Reverse Index Service',
        },
        { id: 'doc_service', type: 'web-server', label: 'Document Service' },
      ],
      edges: [
        { from: 'client', to: 'lb', label: 'Query' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'query_api', label: '' },
        {
          from: 'query_api',
          to: 'cache_shard_1',
          label: 'Consistent hash → shard lookup',
        },
        {
          from: 'query_api',
          to: 'cache_shard_2',
          label: 'Consistent hash → shard lookup',
        },
        {
          from: 'query_api',
          to: 'cache_shard_3',
          label: 'Consistent hash → shard lookup',
        },
        {
          from: 'query_api',
          to: 'reverse_index',
          label: 'Cache miss → backend',
        },
        { from: 'query_api', to: 'doc_service', label: 'Fetch title/snippet' },
        {
          from: 'reverse_index',
          to: 'query_api',
          label: 'Results → update cache',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Một cache node bị crash. Consistent hashing của bạn rehash traffic thế nào? Virtual nodes giải quyết gì?',
        expectedAdaptation:
          'Virtual nodes giảm data migration khi node down/up; cache miss tạm thời khi node crash là acceptable; cần monitor cache hit rate để detect hot spots',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Cache invalidation: khi search index update (page re-crawled), làm sao invalidate đúng cache entries mà không flush toàn bộ?',
        expectedAdaptation:
          'TTL-based expiry + event-driven invalidation; write-through cache với versioned keys; hoặc publish invalidation message đến cache cluster khi index update',
      },
    ],
    tags: [
      'cache',
      'lru',
      'consistent-hashing',
      'distributed',
      'read-heavy',
      'mid-level',
    ],
  },

  // ─── 6. Amazon Sales Rank ────────────────────────────────────────────────────
  {
    title: 'Design Amazon Sales Ranking by Category',
    domain: 'analytics-ranking',
    targetRole: ['backend', 'data-eng'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 40_000,
      dau: undefined,
      readWriteRatio: '100:1',
      storageTarget: '40 GB / month',
      p99Latency: '< 100ms rank reads',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Read API',
      'Sales API',
      'MapReduce Worker',
      'Object Storage',
      'SQL Database',
      'Analytics Database',
      'Cache',
      'CDN',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'cdn', type: 'cdn', label: 'CDN' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'web_server', type: 'web-server', label: 'Web Server' },
        { id: 'read_api', type: 'web-server', label: 'Read API' },
        { id: 'sales_api', type: 'web-server', label: 'Sales API' },
        { id: 'cache', type: 'cache', label: 'Cache (Redis)' },
        { id: 'sql_master', type: 'database', label: 'SQL Master' },
        { id: 'sql_replica', type: 'database', label: 'SQL Replicas' },
        {
          id: 'object_store',
          type: 'object-storage',
          label: 'Object Store (raw sales logs)',
        },
        { id: 'mapreduce', type: 'worker', label: 'MapReduce (hourly batch)' },
        {
          id: 'analytics_db',
          type: 'database',
          label: 'Analytics DB (Redshift)',
        },
      ],
      edges: [
        { from: 'client', to: 'cdn', label: 'Static content' },
        { from: 'client', to: 'lb', label: 'HTTP' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'read_api', label: 'GET rankings' },
        { from: 'web_server', to: 'sales_api', label: 'POST transaction' },
        { from: 'read_api', to: 'cache', label: 'Rankings cache' },
        { from: 'read_api', to: 'sql_replica', label: 'Cache miss' },
        { from: 'sales_api', to: 'object_store', label: 'Log raw transaction' },
        {
          from: 'object_store',
          to: 'mapreduce',
          label: 'Hourly batch trigger',
        },
        { from: 'mapreduce', to: 'analytics_db', label: 'Aggregate results' },
        {
          from: 'mapreduce',
          to: 'sql_master',
          label: 'Write sales_rank table',
        },
        { from: 'sql_master', to: 'sql_replica', label: 'Replication' },
        { from: 'sql_master', to: 'cache', label: 'Invalidate / update cache' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Prime Day: số transaction tăng 100× trong 2 giờ. MapReduce batch mỗi giờ không đủ nhanh — rankings lỗi thời 2 tiếng. Sửa thế nào?',
        expectedAdaptation:
          'Thêm stream processing layer (Kafka + Flink) để update ranking realtime hoặc near-realtime (< 5 phút); batch job vẫn giữ làm reconciliation',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Category có 1 sản phẩm dominant chiếm 90% sales (long-tail distribution). Top-K algorithm của bạn có vấn đề gì với hot partition không?',
        expectedAdaptation:
          'Sharding by product_id thay vì category; local aggregation trên mỗi shard trước khi merge; Redis sorted set (ZADD/ZRANGE) cho category leaderboard',
      },
    ],
    tags: [
      'analytics',
      'batch-processing',
      'ranking',
      'mapreduce',
      'read-heavy',
      'senior-level',
    ],
  },

  // ─── 7. Scaling to Millions of Users on AWS ─────────────────────────────────
  {
    title: 'Design a System That Scales to Millions of Users on AWS',
    domain: 'cloud-scaling',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 40_000,
      dau: 10_000_000,
      readWriteRatio: '100:1',
      storageTarget: '36 TB / 3 years',
      p99Latency: '< 200ms',
    },
    expectedComponents: [
      'Client',
      'DNS (Route 53)',
      'CDN (CloudFront)',
      'Load Balancer (ELB)',
      'Web / App Servers (EC2)',
      'Cache (ElastiCache)',
      'SQL Database (RDS + Read Replicas)',
      'Object Storage (S3)',
      'Message Queue (SQS)',
      'Worker (Lambda / EC2)',
      'Autoscaling Group',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'dns', type: 'external-service', label: 'DNS (Route 53)' },
        { id: 'cdn', type: 'cdn', label: 'CDN (CloudFront)' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer (ELB)' },
        {
          id: 'app_servers',
          type: 'web-server',
          label: 'App Servers (EC2 ASG)',
        },
        { id: 'cache', type: 'cache', label: 'Cache (ElastiCache)' },
        { id: 'rds_master', type: 'database', label: 'RDS Master (MySQL)' },
        { id: 'rds_replica', type: 'database', label: 'RDS Read Replicas' },
        { id: 's3', type: 'object-storage', label: 'S3 (static + cold data)' },
        { id: 'sqs', type: 'message-queue', label: 'SQS (async jobs)' },
        { id: 'worker', type: 'worker', label: 'Workers (Lambda / EC2)' },
        { id: 'redshift', type: 'database', label: 'Redshift (analytics)' },
      ],
      edges: [
        { from: 'client', to: 'dns', label: 'DNS lookup' },
        { from: 'client', to: 'cdn', label: 'Static assets' },
        { from: 'cdn', to: 's3', label: 'Origin fetch' },
        { from: 'client', to: 'lb', label: 'HTTP/HTTPS' },
        { from: 'lb', to: 'app_servers', label: 'Round-robin' },
        { from: 'app_servers', to: 'cache', label: 'Cache-aside read' },
        { from: 'app_servers', to: 'rds_master', label: 'Write' },
        { from: 'app_servers', to: 'rds_replica', label: 'Read' },
        { from: 'app_servers', to: 'sqs', label: 'Queue async job' },
        { from: 'rds_master', to: 'rds_replica', label: 'Replication' },
        { from: 'sqs', to: 'worker', label: 'Process job' },
        { from: 'worker', to: 's3', label: 'Archive cold data' },
        { from: 'worker', to: 'redshift', label: 'ETL → analytics' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'RDS Master disk I/O đạt 90% capacity. Read replicas không giải quyết được vì write load quá cao. Bước tiếp theo của bạn là gì?',
        expectedAdaptation:
          'Vertical scale RDS (tạm thời); sau đó: sharding theo user_id, hoặc migrate hot data sang DynamoDB, hoặc CQRS với separate write/read stores; connection pooling với PgBouncer/RDS Proxy',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Bạn cần zero-downtime deploy khi có 10 triệu users đang active. Blue-green hay rolling deploy? Trade-off là gì?',
        expectedAdaptation:
          'Blue-green: instant rollback nhưng tốn 2x infra cost; rolling: tiết kiệm hơn nhưng brief period chạy mixed version — cần backward-compatible API changes và DB migrations tách riêng',
      },
    ],
    tags: ['aws', 'cloud', 'scaling', 'autoscaling', 'sql', 'senior-level'],
  },

  // ─── 8. Social Graph (Shortest Path) ────────────────────────────────────────
  {
    title: 'Design a Social Graph — Find Shortest Connection Path',
    domain: 'social-graph',
    targetRole: ['backend', 'data-eng'],
    targetLevel: 'staff',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 400,
      dau: 100_000_000,
      readWriteRatio: '10:1',
      storageTarget: '5 billion relationships',
      p99Latency: '< 1s BFS query',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Web Server',
      'Search API',
      'User Graph Service',
      'Lookup Service',
      'Person Servers (Sharded)',
      'Cache',
      'NoSQL Database',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'web_server', type: 'web-server', label: 'Web Server' },
        { id: 'search_api', type: 'web-server', label: 'Search API' },
        {
          id: 'user_graph_svc',
          type: 'web-server',
          label: 'User Graph Service (BFS)',
        },
        {
          id: 'lookup_service',
          type: 'web-server',
          label: 'Lookup Service (user → shard)',
        },
        {
          id: 'person_shard_1',
          type: 'database',
          label: 'Person Server Shard 1',
        },
        {
          id: 'person_shard_2',
          type: 'database',
          label: 'Person Server Shard 2',
        },
        {
          id: 'person_shard_n',
          type: 'database',
          label: 'Person Server Shard N',
        },
        { id: 'cache', type: 'cache', label: 'Cache (hot paths)' },
        { id: 'nosql', type: 'database', label: 'NoSQL DB (user metadata)' },
      ],
      edges: [
        { from: 'client', to: 'lb', label: 'Search request' },
        { from: 'lb', to: 'web_server', label: '' },
        { from: 'web_server', to: 'search_api', label: '' },
        { from: 'search_api', to: 'cache', label: 'Check cached path' },
        { from: 'search_api', to: 'user_graph_svc', label: 'BFS request' },
        {
          from: 'user_graph_svc',
          to: 'lookup_service',
          label: 'Resolve user → shard',
        },
        {
          from: 'lookup_service',
          to: 'person_shard_1',
          label: 'Get friends list',
        },
        {
          from: 'lookup_service',
          to: 'person_shard_2',
          label: 'Get friends list',
        },
        {
          from: 'lookup_service',
          to: 'person_shard_n',
          label: 'Get friends list',
        },
        { from: 'user_graph_svc', to: 'cache', label: 'Cache discovered path' },
        { from: 'person_shard_1', to: 'nosql', label: 'Persist' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'BFS depth 6 trên 100M users có thể traverse hàng tỷ nodes. Latency thực tế sẽ là bao nhiêu? Làm thế nào để giữ < 1s?',
        expectedAdaptation:
          'Bidirectional BFS từ cả 2 phía; limit search depth (6 degrees là max theo nghiên cứu); offline precompute cho popular user pairs; cache kết quả BFS theo pair',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'User A có 50 triệu followers (celebrity). Khi traverse đến A trong BFS, fan-out là 50M nodes. Kiến trúc hiện tại chịu được không?',
        expectedAdaptation:
          'Skip celebrity nodes trong BFS hoặc treat họ như "super nodes" với truncated friend list; hoặc bipartite graph separation: celebrity-follower graph vs. mutual-friend graph',
      },
    ],
    tags: [
      'graph',
      'bfs',
      'sharding',
      'social-network',
      'distributed',
      'staff-level',
    ],
  },

  // ─── 9. Rate Limiter ─────────────────────────────────────────────────────────
  // Sources: Stripe engineering blog (stripe.com/blog/rate-limiters),
  //          System Design Interview Vol.1 (Alex Xu), cloud provider docs
  {
    title: 'Design an API Rate Limiter',
    domain: 'rate-limiter',
    targetRole: ['backend'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 100_000,
      dau: 10_000_000,
      readWriteRatio: '10:1',
      storageTarget: '< 1 GB (counter state in Redis)',
      p99Latency: '< 5ms overhead per request',
    },
    expectedComponents: [
      'Client',
      'API Gateway',
      'Rate Limiter Middleware',
      'Redis Cluster',
      'Rules Service',
      'Rules Cache',
      'Backend API Servers',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client' },
        { id: 'api_gateway', type: 'api-gateway', label: 'API Gateway' },
        {
          id: 'rate_limiter',
          type: 'web-server',
          label: 'Rate Limiter Middleware',
        },
        {
          id: 'redis_cluster',
          type: 'cache',
          label: 'Redis Cluster (counters)',
        },
        { id: 'rules_service', type: 'web-server', label: 'Rules Service' },
        { id: 'rules_cache', type: 'cache', label: 'Rules Cache (local)' },
        { id: 'rules_db', type: 'database', label: 'Rules DB' },
        { id: 'api_servers', type: 'web-server', label: 'Backend API Servers' },
        {
          id: 'mq',
          type: 'message-queue',
          label: 'Message Queue (rejected log)',
        },
      ],
      edges: [
        { from: 'client', to: 'api_gateway', label: 'HTTP request' },
        {
          from: 'api_gateway',
          to: 'rate_limiter',
          label: 'Forward with metadata',
        },
        {
          from: 'rate_limiter',
          to: 'rules_cache',
          label: 'Fetch rule (local cache)',
        },
        {
          from: 'rules_cache',
          to: 'rules_service',
          label: 'Cache miss → fetch rule',
        },
        { from: 'rules_service', to: 'rules_db', label: 'Load rules' },
        {
          from: 'rate_limiter',
          to: 'redis_cluster',
          label: 'INCR / check counter',
        },
        {
          from: 'rate_limiter',
          to: 'api_servers',
          label: 'Allowed → forward request',
        },
        { from: 'rate_limiter', to: 'mq', label: 'Throttled → log rejection' },
        {
          from: 'rate_limiter',
          to: 'client',
          label: '429 Too Many Requests (if throttled)',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Redis node chết giữa chừng. Rate limiter của bạn fail-open hay fail-closed? Lý do? Ảnh hưởng đến security và availability thế nào?',
        expectedAdaptation:
          'Fail-open (cho phép request đi qua): giữ availability, đúng cho production API; fail-closed: block hết request — chỉ hợp lý với critical auth endpoints. Stripe dùng fail-open với alert monitoring khi Redis down',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Sliding window counter chính xác hơn fixed window nhưng tốn gấp đôi memory. Với 10M users × 100 endpoints, memory footprint là bao nhiêu? Bạn có trade-off nào?',
        expectedAdaptation:
          'Fixed window: 1 counter/user/window = ~400MB; sliding window log: unbounded nếu burst; sliding window counter (hybrid): 2 counters = ~800MB — acceptable. Dùng TTL để auto-expire keys không active',
      },
    ],
    tags: [
      'rate-limiting',
      'redis',
      'api-gateway',
      'token-bucket',
      'sliding-window',
      'mid-level',
    ],
  },

  // ─── 10. Chat System (WhatsApp) ──────────────────────────────────────────────
  // Sources: highscalability.com/the-whatsapp-architecture-facebook-bought-for-19-billion
  //          newsletter.systemdesign.one/p/whatsapp-system-design
  // Real numbers: 500M DAU, 100B msgs/day (2023 Meta reports), 115k msg/s avg
  {
    title: 'Design a Real-time Chat System (WhatsApp)',
    domain: 'chat-system',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 500_000,
      dau: 500_000_000,
      readWriteRatio: '1:1',
      storageTarget: '3.6 PB / year (if retained)',
      p99Latency: '< 100ms message delivery',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'WebSocket Servers',
      'Connection Manager (Redis)',
      'Message Queue (Kafka)',
      'Chat Service',
      'NoSQL Database (Cassandra)',
      'Presence Service',
      'Push Notification Service (APNs/FCM)',
      'Media Storage (S3 + CDN)',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client (Mobile/Web)' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer (L4)' },
        { id: 'ws_servers', type: 'web-server', label: 'WebSocket Servers' },
        {
          id: 'conn_manager',
          type: 'cache',
          label: 'Connection Manager (Redis)',
        },
        { id: 'chat_service', type: 'web-server', label: 'Chat Service' },
        { id: 'mq', type: 'message-queue', label: 'Message Queue (Kafka)' },
        {
          id: 'cassandra',
          type: 'database',
          label: 'Message Store (Cassandra)',
        },
        {
          id: 'presence_service',
          type: 'web-server',
          label: 'Presence Service',
        },
        {
          id: 'presence_cache',
          type: 'cache',
          label: 'Presence Cache (Redis)',
        },
        {
          id: 'push_service',
          type: 'worker',
          label: 'Push Notification Service',
        },
        { id: 'apns_fcm', type: 'external-service', label: 'APNs / FCM' },
        {
          id: 'media_store',
          type: 'object-storage',
          label: 'Media Store (S3)',
        },
        { id: 'cdn', type: 'cdn', label: 'CDN (media delivery)' },
      ],
      edges: [
        { from: 'client', to: 'lb', label: 'WS upgrade / HTTP' },
        { from: 'lb', to: 'ws_servers', label: 'Persistent WebSocket' },
        {
          from: 'ws_servers',
          to: 'conn_manager',
          label: 'Register connection (userId → serverId)',
        },
        { from: 'ws_servers', to: 'chat_service', label: 'Send message event' },
        { from: 'chat_service', to: 'mq', label: 'Publish message' },
        { from: 'chat_service', to: 'cassandra', label: 'Persist message' },
        { from: 'mq', to: 'ws_servers', label: 'Route to receiver server' },
        {
          from: 'ws_servers',
          to: 'conn_manager',
          label: 'Lookup receiver server',
        },
        { from: 'ws_servers', to: 'client', label: 'Push message via WS' },
        { from: 'mq', to: 'push_service', label: 'Offline user → push notify' },
        {
          from: 'push_service',
          to: 'apns_fcm',
          label: 'Send push notification',
        },
        {
          from: 'client',
          to: 'media_store',
          label: 'Upload media (presigned URL)',
        },
        { from: 'cdn', to: 'media_store', label: 'Origin fetch' },
        { from: 'client', to: 'cdn', label: 'Download media' },
        {
          from: 'ws_servers',
          to: 'presence_service',
          label: 'Heartbeat (every 30s)',
        },
        {
          from: 'presence_service',
          to: 'presence_cache',
          label: 'Update online status',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Group chat có 1,000 thành viên. Khi 1 người gửi tin, bạn phải delivery đến 999 người. Fan-out strategy của bạn là gì? Push hay pull?',
        expectedAdaptation:
          'Hybrid: push đến members online (lookup qua Redis conn_manager); pull (inbox pattern) cho members offline — client sync khi reconnect. Không fan-out full 999 writes vì quá tốn; dùng group message pointer thay vì copy',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'User A gửi tin → offline → reconnect sau 2 giờ. Làm sao đảm bảo không mất tin nhắn và không duplicate khi sync?',
        expectedAdaptation:
          'Mỗi message có sequence_id (monotonic per conversation); client gửi last_seen_seq khi reconnect; server trả delta từ last_seen_seq; idempotency key trên client để tránh duplicate khi retry',
      },
    ],
    tags: [
      'chat',
      'websocket',
      'fan-out',
      'cassandra',
      'real-time',
      'senior-level',
    ],
  },

  // ─── 11. Ride-sharing (Uber) ─────────────────────────────────────────────────
  // Source: hellointerview.com/learn/system-design/problem-breakdowns/uber
  // Real numbers: 10M active drivers, 2M location updates/s, 100k surge requests
  {
    title: 'Design a Ride-sharing Service (Uber)',
    domain: 'ride-sharing',
    targetRole: ['backend'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 2_000_000,
      dau: 30_000_000,
      readWriteRatio: '1:10',
      storageTarget: '10 TB rides history / year',
      p99Latency: '< 500ms driver match',
    },
    expectedComponents: [
      'Client (Rider + Driver)',
      'API Gateway',
      'Ride Service',
      'Location Service',
      'Ride Matching Service',
      'Redis (Geospatial)',
      'Notification Service (APNs/FCM)',
      'Message Queue (Kafka)',
      'SQL Database (rides/users)',
      'Distributed Lock (Redis)',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'rider_client', type: 'client', label: 'Rider Client' },
        { id: 'driver_client', type: 'client', label: 'Driver Client' },
        { id: 'api_gateway', type: 'api-gateway', label: 'API Gateway' },
        { id: 'ride_service', type: 'web-server', label: 'Ride Service' },
        {
          id: 'location_service',
          type: 'web-server',
          label: 'Location Service',
        },
        {
          id: 'matching_service',
          type: 'web-server',
          label: 'Ride Matching Service',
        },
        { id: 'redis_geo', type: 'cache', label: 'Redis (GEOADD / GEOSEARCH)' },
        {
          id: 'redis_lock',
          type: 'cache',
          label: 'Redis (Distributed Lock, TTL 10s)',
        },
        { id: 'kafka', type: 'message-queue', label: 'Kafka (ride requests)' },
        {
          id: 'notification_service',
          type: 'worker',
          label: 'Notification Service',
        },
        { id: 'apns_fcm', type: 'external-service', label: 'APNs / FCM' },
        {
          id: 'sql_db',
          type: 'database',
          label: 'SQL DB (rides, riders, drivers)',
        },
      ],
      edges: [
        {
          from: 'rider_client',
          to: 'api_gateway',
          label: 'POST /rides (confirm ride)',
        },
        {
          from: 'driver_client',
          to: 'api_gateway',
          label: 'POST /location (every 5s)',
        },
        {
          from: 'api_gateway',
          to: 'location_service',
          label: 'Driver location update',
        },
        {
          from: 'location_service',
          to: 'redis_geo',
          label: 'GEOADD driver position',
        },
        { from: 'api_gateway', to: 'ride_service', label: 'Create ride' },
        { from: 'ride_service', to: 'sql_db', label: 'Persist ride record' },
        { from: 'ride_service', to: 'kafka', label: 'Publish ride request' },
        {
          from: 'kafka',
          to: 'matching_service',
          label: 'Consume ride request',
        },
        {
          from: 'matching_service',
          to: 'redis_geo',
          label: 'GEOSEARCH nearby drivers',
        },
        {
          from: 'matching_service',
          to: 'redis_lock',
          label: 'SETNX lock on driver (10s TTL)',
        },
        {
          from: 'matching_service',
          to: 'notification_service',
          label: 'Notify locked driver',
        },
        {
          from: 'notification_service',
          to: 'apns_fcm',
          label: 'Push ride request',
        },
        {
          from: 'driver_client',
          to: 'api_gateway',
          label: 'PATCH /rides/:id (accept/decline)',
        },
        {
          from: 'api_gateway',
          to: 'ride_service',
          label: 'Update ride status',
        },
        { from: 'ride_service', to: 'sql_db', label: 'Write accepted status' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Một sự kiện lớn vừa kết thúc: 100,000 riders cùng request ride tại cùng địa điểm trong 60 giây. Matching service của bạn bottleneck ở đâu?',
        expectedAdaptation:
          'Redis GEOSEARCH bị hit nặng từ cùng geohash → partition bằng geohash sharding; Kafka consumer group scale out; distributed lock contention cao → exponential backoff + jitter khi acquire lock',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Driver A được lock nhưng app crash trước khi accept/decline. Lock TTL 10s expire. Trong 10 giây đó rider chờ — acceptable không? Cải thiện thế nào?',
        expectedAdaptation:
          'Dùng delay queue (SQS/Kafka delayed message) để tự động advance đến next driver khi TTL expire mà không cần polling; durable workflow (Temporal/Step Functions) để persist state qua crash',
      },
    ],
    tags: [
      'geo',
      'real-time',
      'matching',
      'redis-geospatial',
      'distributed-lock',
      'senior-level',
    ],
  },

  // ─── 12. File Storage & Sync (Dropbox) ──────────────────────────────────────
  // Source: hellointerview.com/learn/system-design/problem-breakdowns/dropbox
  // Key facts: presigned S3 URL, multipart 5-10MB chunks, WebSocket + polling hybrid
  {
    title: 'Design a File Storage & Sync Service (Dropbox)',
    domain: 'file-storage',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 10_000,
      dau: 50_000_000,
      readWriteRatio: '5:1',
      storageTarget: '500 PB+ total (unlimited per user via S3)',
      p99Latency: '< 500ms metadata ops',
    },
    expectedComponents: [
      'Client (Sync Agent)',
      'Load Balancer',
      'API Gateway',
      'File Service',
      'File Metadata DB',
      'Object Storage (S3)',
      'CDN',
      'WebSocket Server (change push)',
      'Notification Queue',
      'Shared Files DB (ACL)',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client (Sync Agent)' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'api_gateway', type: 'api-gateway', label: 'API Gateway' },
        { id: 'file_service', type: 'web-server', label: 'File Service' },
        {
          id: 'metadata_db',
          type: 'database',
          label: 'File Metadata DB (DynamoDB)',
        },
        { id: 's3', type: 'object-storage', label: 'Object Storage (S3)' },
        { id: 'cdn', type: 'cdn', label: 'CDN (CloudFront)' },
        {
          id: 'ws_server',
          type: 'web-server',
          label: 'WebSocket Server (change push)',
        },
        {
          id: 'notify_queue',
          type: 'message-queue',
          label: 'Notification Queue (SQS)',
        },
        {
          id: 'shared_files_db',
          type: 'database',
          label: 'Shared Files DB (ACL)',
        },
      ],
      edges: [
        {
          from: 'client',
          to: 'api_gateway',
          label: 'POST /files (request presigned URL)',
        },
        { from: 'api_gateway', to: 'file_service', label: '' },
        {
          from: 'file_service',
          to: 'metadata_db',
          label: 'Save metadata (status: uploading)',
        },
        {
          from: 'file_service',
          to: 's3',
          label: 'Generate presigned multipart URL',
        },
        { from: 'file_service', to: 'client', label: 'Return presigned URL' },
        {
          from: 'client',
          to: 's3',
          label: 'PUT chunks directly (5-10MB, bypass API)',
        },
        { from: 's3', to: 'file_service', label: 'S3 event: upload complete' },
        {
          from: 'file_service',
          to: 'metadata_db',
          label: 'Update status: uploaded',
        },
        {
          from: 'file_service',
          to: 'notify_queue',
          label: 'Publish file change event',
        },
        {
          from: 'notify_queue',
          to: 'ws_server',
          label: 'Fan-out to connected devices',
        },
        { from: 'ws_server', to: 'client', label: 'Push change notification' },
        {
          from: 'client',
          to: 'api_gateway',
          label: 'GET /files/changes?since= (poll fallback)',
        },
        { from: 'client', to: 'cdn', label: 'Download file' },
        { from: 'cdn', to: 's3', label: 'Origin fetch' },
        {
          from: 'file_service',
          to: 'shared_files_db',
          label: 'Check/write ACL on share',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'User A và User B cùng edit cùng 1 file trên 2 thiết bị khác nhau khi offline, sau đó cùng sync lên. Conflict resolution của bạn là gì?',
        expectedAdaptation:
          'Last write wins (timestamp): đơn giản nhưng mất data; Dropbox thực tế tạo conflicted copy — giữ cả 2 bản và notify user; vector clock / CRDTs cho operational transform nếu cần real merge (Google Docs approach)',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'File 50GB. Upload presigned URL đứt kết nối ở 80%. Resumable upload hoạt động thế nào? S3 giữ partial upload bao lâu nếu không complete?',
        expectedAdaptation:
          'S3 Multipart Upload: mỗi chunk có ETag; client track uploaded chunks locally; resume = chỉ upload chunks thiếu ETag; S3 giữ incomplete multipart indefinitely (gây billing) → cần lifecycle rule "AbortIncompleteMultipartUpload after N days"',
      },
    ],
    tags: [
      'file-storage',
      'sync',
      'presigned-url',
      'multipart-upload',
      'websocket',
      'senior-level',
    ],
  },

  // ─── 13. Video Streaming (YouTube) ──────────────────────────────────────────
  // Source: newsletter.systemdesign.one/p/youtube-system-design
  // Real numbers: 500hrs/min uploaded, 100M DAU, 1B hrs watched/day (YouTube 2023)
  {
    title: 'Design a Video Streaming Platform (YouTube)',
    domain: 'video-streaming',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'senior',
    difficulty: 'hard',
    estimatedDuration: 60,
    scalingConstraints: {
      peakQPS: 1_000_000,
      dau: 100_000_000,
      readWriteRatio: '100:1',
      storageTarget: '1 exabyte+ (multi-resolution + global CDN)',
      p99Latency: '< 500ms first frame (streaming start)',
    },
    expectedComponents: [
      'Client',
      'API Gateway',
      'Upload Service',
      'Object Storage (S3)',
      'Transcoding Workers',
      'CDN',
      'Metadata DB',
      'Search Index',
      'Watch Progress DB',
      'Message Queue',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client (Browser/Mobile)' },
        { id: 'api_gateway', type: 'api-gateway', label: 'API Gateway' },
        { id: 'upload_service', type: 'web-server', label: 'Upload Service' },
        { id: 's3_raw', type: 'object-storage', label: 'S3 Raw Video' },
        { id: 'mq', type: 'message-queue', label: 'Kafka (transcode jobs)' },
        {
          id: 'transcode_workers',
          type: 'worker',
          label: 'Transcoding Workers (FFmpeg)',
        },
        {
          id: 's3_processed',
          type: 'object-storage',
          label: 'S3 Processed (HLS segments)',
        },
        { id: 'cdn', type: 'cdn', label: 'CDN (global edge)' },
        {
          id: 'metadata_db',
          type: 'database',
          label: 'Metadata DB (PostgreSQL)',
        },
        {
          id: 'search_index',
          type: 'web-server',
          label: 'Search Index (Elasticsearch)',
        },
        {
          id: 'progress_db',
          type: 'database',
          label: 'Watch Progress DB (DynamoDB)',
        },
      ],
      edges: [
        {
          from: 'client',
          to: 'api_gateway',
          label: 'POST /videos (request upload URL)',
        },
        { from: 'api_gateway', to: 'upload_service', label: '' },
        {
          from: 'upload_service',
          to: 'metadata_db',
          label: 'Reserve video_id (status: pending)',
        },
        {
          from: 'upload_service',
          to: 's3_raw',
          label: 'Generate presigned multipart URL',
        },
        {
          from: 'upload_service',
          to: 'client',
          label: 'Return presigned URL + video_id',
        },
        {
          from: 'client',
          to: 's3_raw',
          label: 'Upload chunks directly (bypass API servers)',
        },
        { from: 's3_raw', to: 'mq', label: 'S3 event → publish transcode job' },
        {
          from: 'mq',
          to: 'transcode_workers',
          label: 'Parallel transcode (240p→4K, HLS)',
        },
        {
          from: 'transcode_workers',
          to: 's3_processed',
          label: 'Store HLS segments',
        },
        {
          from: 'transcode_workers',
          to: 'metadata_db',
          label: 'Update status: ready + manifest URL',
        },
        {
          from: 'transcode_workers',
          to: 'search_index',
          label: 'Index title/description',
        },
        { from: 's3_processed', to: 'cdn', label: 'Cache at edge nodes' },
        {
          from: 'client',
          to: 'cdn',
          label: 'GET manifest → adaptive bitrate stream (ABR)',
        },
        {
          from: 'client',
          to: 'api_gateway',
          label: 'POST /progress (fire-and-forget)',
        },
        {
          from: 'api_gateway',
          to: 'progress_db',
          label: 'Write watch position async',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'Video viral: 10M người xem đồng thời. CDN cache miss rate 1% = 100k req/s hit origin S3. S3 có chịu được không? Bạn làm gì?',
        expectedAdaptation:
          'S3 tự scale nhưng cost cao; CDN origin shield (intermediate cache layer giữa CDN edge và S3 origin); pre-warm CDN khi video bắt đầu trending (detect bằng view velocity); cache HLS manifest lâu với cache-control immutable',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Transcode 4K video 2 giờ tốn 3 giờ xử lý. User muốn xem ngay sau upload. Làm sao giảm time-to-playable?',
        expectedAdaptation:
          'Progressive transcoding: 360p/480p trước → available trong 5 phút; 1080p/4K tiếp theo async; segment-level parallel transcoding (chia video thành 10-min chunks → N workers transcode song song); video available sau khi first segment ready',
      },
    ],
    tags: [
      'video',
      'streaming',
      'transcoding',
      'cdn',
      'hls',
      'adaptive-bitrate',
      'senior-level',
    ],
  },

  // ─── 14. Search Autocomplete / Typeahead ─────────────────────────────────────
  // Source: Alex Xu "System Design Interview Vol.1" ch.13
  // Real numbers: Google 8.5B searches/day → ~100k autocomplete QPS, p99 < 100ms requirement
  {
    title: 'Design Search Autocomplete (Typeahead)',
    domain: 'search-autocomplete',
    targetRole: ['backend', 'full-stack'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 100_000,
      dau: 100_000_000,
      readWriteRatio: '1000:1',
      storageTarget: '100 GB (trie compressed)',
      p99Latency: '< 100ms suggestion response',
    },
    expectedComponents: [
      'Client',
      'Load Balancer',
      'Suggestion API',
      'Trie Cache (Redis)',
      'Trie Service',
      'Trie DB (NoSQL)',
      'Query Log Collector',
      'Message Queue',
      'Aggregation Workers',
    ],
    referenceArchitecture: {
      nodes: [
        { id: 'client', type: 'client', label: 'Client (Browser/App)' },
        { id: 'lb', type: 'load-balancer', label: 'Load Balancer' },
        { id: 'suggestion_api', type: 'web-server', label: 'Suggestion API' },
        {
          id: 'trie_cache',
          type: 'cache',
          label: 'Trie Cache (Redis, top-K per prefix)',
        },
        { id: 'trie_service', type: 'web-server', label: 'Trie Service' },
        {
          id: 'trie_db',
          type: 'database',
          label: 'Trie Store (NoSQL snapshot)',
        },
        { id: 'log_collector', type: 'worker', label: 'Query Log Collector' },
        { id: 'mq', type: 'message-queue', label: 'Kafka (query stream)' },
        {
          id: 'agg_workers',
          type: 'worker',
          label: 'Aggregation Workers (hourly batch)',
        },
        { id: 'freq_db', type: 'database', label: 'Query Frequency DB' },
      ],
      edges: [
        {
          from: 'client',
          to: 'lb',
          label: 'GET /suggest?q=... (debounced 300ms)',
        },
        { from: 'lb', to: 'suggestion_api', label: '' },
        {
          from: 'suggestion_api',
          to: 'trie_cache',
          label: 'Lookup top-K for prefix',
        },
        {
          from: 'suggestion_api',
          to: 'trie_service',
          label: 'Cache miss → trie traversal',
        },
        { from: 'trie_service', to: 'trie_db', label: 'Load trie nodes' },
        { from: 'trie_service', to: 'trie_cache', label: 'Write back top-K' },
        {
          from: 'suggestion_api',
          to: 'client',
          label: 'Return top-5 suggestions',
        },
        {
          from: 'suggestion_api',
          to: 'log_collector',
          label: 'Async log query event',
        },
        { from: 'log_collector', to: 'mq', label: 'Stream query events' },
        {
          from: 'mq',
          to: 'agg_workers',
          label: 'Hourly/daily batch aggregate',
        },
        {
          from: 'agg_workers',
          to: 'freq_db',
          label: 'Update frequency counts',
        },
        {
          from: 'agg_workers',
          to: 'trie_service',
          label: 'Rebuild / update trie weights',
        },
        {
          from: 'trie_service',
          to: 'trie_db',
          label: 'Persist updated trie snapshot',
        },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          '"Covid" vừa trending — xuất hiện 0 lần trong trie, sau 1 giờ có 50M queries. Trie batch-rebuild mỗi giờ sẽ lag 1 giờ. Bạn xử lý trending term thế nào?',
        expectedAdaptation:
          'Stream processing layer song song: Redis sorted set ZINCRBY cho real-time top-K với sliding window (TTL 1h); blend real-time counter với batch trie khi serve suggestions; batch trie làm long-tail, stream làm trending override',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'Trie phân tán 10 nodes theo prefix range. Prefix "a" chiếm 26% alphabet → hotspot. Sharding strategy của bạn thay đổi thế nào?',
        expectedAdaptation:
          'Shard theo popularity, không theo alphabet; hot prefixes replicated ra nhiều nodes; Redis sorted set cho top prefixes (O(log N) ZRANGE) thay trie traversal — cache hit > 99% cho common prefixes giúp trie chỉ xử lý long-tail',
      },
    ],
    tags: [
      'autocomplete',
      'trie',
      'redis-sorted-set',
      'read-heavy',
      'search',
      'mid-level',
    ],
  },

  // ─── 15. Notification System ─────────────────────────────────────────────────
  // Sources: Meta push infra blog, Apple APNs tech docs, Google FCM docs
  // Real numbers: Meta 1B+ notifications/day; APNs 2M connections/server (2016 WWDC)
  {
    title: 'Design a Scalable Notification System',
    domain: 'notification-system',
    targetRole: ['backend'],
    targetLevel: 'mid',
    difficulty: 'medium',
    estimatedDuration: 45,
    scalingConstraints: {
      peakQPS: 50_000,
      dau: 100_000_000,
      readWriteRatio: '1:5',
      storageTarget: '1 TB / year (logs + templates)',
      p99Latency: '< 5s end-to-end delivery',
    },
    expectedComponents: [
      'API Server',
      'Message Queue (Kafka)',
      'Notification Router',
      'iOS Push Worker (APNs)',
      'Android Push Worker (FCM)',
      'Email Worker',
      'SMS Worker',
      'Device Token DB',
      'Notification Log DB',
      'User Preference DB',
      'Template Service',
    ],
    referenceArchitecture: {
      nodes: [
        {
          id: 'api_server',
          type: 'web-server',
          label: 'API Server (trigger endpoint)',
        },
        {
          id: 'kafka',
          type: 'message-queue',
          label: 'Kafka (notification events)',
        },
        { id: 'router', type: 'web-server', label: 'Notification Router' },
        { id: 'preference_db', type: 'database', label: 'User Preference DB' },
        {
          id: 'template_service',
          type: 'web-server',
          label: 'Template Service',
        },
        { id: 'ios_worker', type: 'worker', label: 'iOS Push Worker' },
        { id: 'android_worker', type: 'worker', label: 'Android Push Worker' },
        { id: 'email_worker', type: 'worker', label: 'Email Worker' },
        { id: 'sms_worker', type: 'worker', label: 'SMS Worker' },
        { id: 'apns', type: 'external-service', label: 'APNs (Apple)' },
        { id: 'fcm', type: 'external-service', label: 'FCN (Google)' },
        {
          id: 'email_gateway',
          type: 'external-service',
          label: 'Email Gateway (SES/SendGrid)',
        },
        {
          id: 'sms_gateway',
          type: 'external-service',
          label: 'SMS Gateway (Twilio)',
        },
        { id: 'device_token_db', type: 'database', label: 'Device Token DB' },
        { id: 'log_db', type: 'database', label: 'Notification Log DB' },
      ],
      edges: [
        {
          from: 'api_server',
          to: 'kafka',
          label: 'Publish notification event',
        },
        { from: 'kafka', to: 'router', label: 'Consume event' },
        {
          from: 'router',
          to: 'preference_db',
          label: 'Check opt-in / channel preference',
        },
        {
          from: 'router',
          to: 'template_service',
          label: 'Render message template',
        },
        {
          from: 'router',
          to: 'device_token_db',
          label: 'Lookup device tokens',
        },
        { from: 'router', to: 'ios_worker', label: 'Route to iOS queue' },
        {
          from: 'router',
          to: 'android_worker',
          label: 'Route to Android queue',
        },
        { from: 'router', to: 'email_worker', label: 'Route to email queue' },
        { from: 'router', to: 'sms_worker', label: 'Route to SMS queue' },
        { from: 'ios_worker', to: 'apns', label: 'HTTP/2 push' },
        { from: 'android_worker', to: 'fcm', label: 'HTTP/2 push' },
        { from: 'email_worker', to: 'email_gateway', label: 'SMTP / API' },
        { from: 'sms_worker', to: 'sms_gateway', label: 'REST API' },
        { from: 'ios_worker', to: 'log_db', label: 'Log delivery status' },
        { from: 'android_worker', to: 'log_db', label: 'Log delivery status' },
        { from: 'email_worker', to: 'log_db', label: 'Log delivery status' },
        { from: 'sms_worker', to: 'log_db', label: 'Log delivery status' },
      ],
    },
    curveBallScenarios: [
      {
        trigger: 'componentCoverage >= 80% AND phase >= HIGH_LEVEL',
        prompt:
          'APNs trả về 429 khi send batch notification cho 10M iOS users trong 5 phút. Retry strategy của bạn là gì mà không bị Apple blacklist?',
        expectedAdaptation:
          'Exponential backoff với jitter; priority queue — critical notifications (OTP, payment) retry aggressive hơn marketing; APNs HTTP/2 connection pooling (1500 concurrent streams/connection); rate-limit bản thân trước khi hit APNs',
      },
      {
        trigger: 'componentCoverage >= 75% AND phase == DEEP_DIVE',
        prompt:
          'User nhận được cùng 1 notification 3 lần (duplicate). Nguyên nhân và deduplication của bạn ở đâu trong pipeline?',
        expectedAdaptation:
          'Idempotency key (notification_id) stored trong Redis (TTL 24h); worker check trước khi call APNs/FCM; log_db upsert theo (notification_id, device_token) unique constraint; Kafka at-least-once → dedup tại consumer layer',
      },
    ],
    tags: [
      'notification',
      'push',
      'apns',
      'fcm',
      'kafka',
      'fan-out',
      'mid-level',
    ],
  },
];

export async function seedSDProblems(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(SDProblem);
  const existing = await repo.count();
  if (existing > 0) {
    console.log(
      `[seed] SD problems already seeded (${existing} records). Skipping.`,
    );
    return;
  }
  const entities = repo.create(SD_PROBLEM_SEEDS as SDProblem[]);
  await repo.save(entities);
  console.log(`[seed] Seeded ${entities.length} SD problems.`);
}
