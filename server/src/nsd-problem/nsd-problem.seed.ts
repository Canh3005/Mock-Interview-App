import { DataSource } from 'typeorm';
import { NSDProblem } from './entities/nsd-problem.entity';
import type {
  NSDPhase1Data,
  NSDPhase2Data,
  NSDPhase3Data,
  NSDPhase4Data,
  NSDPhase5Data,
} from '../nsd-orchestrator/types/nsd.types';

// ── TikTok Phase 1 ────────────────────────────────────────────────────────────
const TIKTOK_PHASE1: NSDPhase1Data = {
  opening: {
    question:
      'Hôm nay chúng ta sẽ cùng nhau thiết kế TikTok. Trước khi thiết kế, bạn đã sẵn sàng đi vào làm rõ các yêu cầu chưa?',
    system_facts:
      'TikTok là ứng dụng chia sẻ video ngắn. Các tính năng chính: upload video, xem feed, và user activity (follow người dùng, like/comment video).',
    expected_result: 'Candidate xác nhận sẵn sàng',
  },
  features: [
    {
      name: 'upload_video',
      question:
        'Bạn hãy làm rõ thêm về các yêu cầu của tính năng upload video nhé.',
      expected_result:
        'Candidate hỏi/làm rõ: giới hạn thời gian video (30s–1 phút), loại metadata đi kèm (caption/text), format được hỗ trợ',
      expected_constraints: [
        {
          key: 'video_duration',
          red_flag: 'chưa làm rõ giới hạn thời gian video',
          followup_question:
            'Bạn nghĩ video upload lên có giới hạn thời gian không?',
          fill_answer: 'Video tối đa 1 phút',
          skill_tag: 'fr_clarification',
        },
        {
          key: 'video_metadata',
          red_flag: 'chưa làm rõ video kèm metadata gì',
          followup_question:
            'Bạn nghĩ khi upload video thì có thể có metadata nào đi kèm?',
          fill_answer: 'Video có thể kèm caption/text',
          skill_tag: 'fr_clarification',
        },
      ],
    },
    {
      name: 'view_feed',
      question:
        'Bạn hãy làm rõ thêm về các yêu cầu của tính năng xem feed nhé.',
      expected_result:
        'Candidate hỏi/làm rõ: feed lấy từ đâu (followed users hay recommendations), số lượng video preload mỗi lần load, và thứ tự hiển thị video trong feed',
      expected_constraints: [
        {
          key: 'feed_source',
          red_flag: 'chưa làm rõ feed lấy từ nguồn nào',
          followup_question:
            'Feed video được lấy từ đâu — chỉ người dùng đang follow hay còn nguồn nào khác?',
          fill_answer:
            'Feed từ followed users, có thể thêm trending/recommendation',
          skill_tag: 'fr_clarification',
        },
        {
          key: 'feed_preload_count',
          red_flag: 'chưa làm rõ số lượng video preload mỗi lần load feed',
          followup_question:
            'Mỗi lần load feed, hệ thống nên trả về/preload bao nhiêu video?',
          fill_answer:
            'Preload khoảng 5-10 video mỗi lần, load thêm khi người dùng cuộn gần hết',
          skill_tag: 'fr_clarification',
        },
        {
          key: 'feed_ordering',
          red_flag: 'chưa làm rõ thứ tự hiển thị video trong feed',
          followup_question:
            'Video trong feed nên được sắp xếp/hiển thị theo thứ tự nào?',
          fill_answer:
            'Sắp xếp theo thuật toán recommendation hoặc thời gian đăng (mới nhất trước), không cần đảm bảo thứ tự real-time tuyệt đối',
          skill_tag: 'fr_clarification',
        },
      ],
    },
    {
      name: 'user_activity',
      question:
        'Bạn hãy làm rõ thêm về các yêu cầu của tính năng follow và tương tác (like, comment) nhé.',
      expected_result:
        'Candidate hỏi/làm rõ: hệ thống cần hỗ trợ những loại tương tác nào (follow, like, comment), và dữ liệu tương tác này có được dùng để phục vụ feed hay không',
      expected_constraints: [
        {
          key: 'activity_types',
          red_flag: 'chưa làm rõ những loại tương tác nào được hỗ trợ',
          followup_question:
            'Bạn nghĩ hệ thống cần hỗ trợ những loại tương tác nào giữa user với nhau và với video?',
          fill_answer: 'Follow user, like video, comment video',
          skill_tag: 'fr_clarification',
        },
        {
          key: 'activity_usage',
          red_flag: 'chưa làm rõ dữ liệu tương tác được dùng để làm gì',
          followup_question:
            'Dữ liệu follow/like/comment này có được dùng cho mục đích nào khác ngoài lưu trữ không?',
          fill_answer:
            'Dữ liệu follow được dùng để build feed cho người dùng (xem video của người mình follow)',
          skill_tag: 'fr_clarification',
        },
      ],
    },
  ],
  closing: {
    question: 'Hãy tổng kết lại các yêu cầu chức năng mà bạn vừa làm rõ nhé.',
    expected_result:
      'Candidate tổng kết đủ các tính năng: đăng video (tối đa 1 phút, có caption), xem feed (từ người đang follow, có thể thêm đề xuất), follow và tương tác người dùng (like, comment), các hoạt động người dùng có thể dùng để cá nhân hóa, build feed — mỗi tính năng kèm ràng buộc chính đã làm rõ',
    red_flags: [
      {
        key: 'missing_feature',
        red_flag: 'bỏ sót feature quan trọng trong tổng kết',
        followup_question:
          'Bạn có nhớ chúng ta còn đề cập đến tính năng nào khác không?',
        fill_answer:
          'Các tính năng đã xác định: đăng video, xem feed, follow và tương tác người dùng (like, comment)',
        skill_tag: 'synthesis',
      },
    ],
  },
};

// ── TikTok Phase 2 ────────────────────────────────────────────────────────────
const TIKTOK_PHASE2: NSDPhase2Data = {
  opening: {
    question:
      'Chúng ta đã có functional requirements. Bây giờ hãy cùng xác định các yêu cầu phi chức năng của hệ thống nhé.',
    system_nfr_list:
      'Với hệ thống này, chúng ta sẽ xem xét: availability, latency, consistency, durability.',
    expected_result: 'Candidate xác nhận sẵn sàng, hiểu sẽ cần xác định NFR',
  },
  nfr_dimensions: [
    {
      key: 'availability',
      question:
        'Bạn nghĩ availability của hệ thống này sẽ ở mức độ như thế nào, tại sao?',
      expected_result:
        'Candidate nêu hệ thống cần high availability (≥99.9%) + giải thích lý do: Tiktok (hệ thống) có chức chính là xem feed nên nếu user không xem được video thì sẽ ảnh hưởng trực tiếp đến trải nghiệm người dùng',
      expected_reasoning: [
        {
          key: 'justify_high_availability',
          red_flag: 'nêu high availability nhưng không giải thích tại sao',
          followup_question:
            'Tại sao hệ thống video sharing cần high availability?',
          fill_answer:
            'Hệ thống video serving — nếu down thì user không xem được video, ảnh hưởng trực tiếp UX và doanh thu',
          skill_tag: 'nfr_reasoning',
        },
      ],
    },
    {
      key: 'consistency',
      question: 'Bạn nghĩ sao về yêu cầu của consistency trong hệ thống này?',
      expected_result:
        'Candidate chọn eventual consistency (không cần đồng bộ ngay lập tức) + giải thích trade-off: video on-demand có thể chấp nhận delay vài phút (không cần real-time), ưu tiên availability theo CAP theorem',
      expected_reasoning: [
        {
          key: 'availability_vs_consistency_tradeoff',
          red_flag: 'chưa đề cập trade-off availability vs consistency',
          followup_question:
            'Bạn sẽ ưu tiên availability hay consistency — tại sao?',
          fill_answer:
            'Ưu tiên availability. Theo CAP theorem, chọn AP — chấp nhận một độ trễ vài phút cho video on-demand là acceptable',
          skill_tag: 'tradeoff_awareness',
        },
        {
          key: 'eventual_consistency_justification',
          red_flag: 'chọn eventual consistency nhưng không justify use case',
          followup_question:
            'Delay bao lâu là acceptable với người dùng của hệ thống này?',
          fill_answer:
            'Video on-demand: delay vài phút là acceptable vì user không kỳ vọng video xuất hiện ngay trong feed người khác. Khác với live stream/chat phải real-time',
          skill_tag: 'tradeoff_awareness',
        },
      ],
    },
    {
      key: 'latency',
      question: 'Bạn nghĩ về latency của hệ thống này như thế nào?',
      expected_result:
        'Candidate phân biệt read latency (thấp — xem video phải mượt, không buffer) vs write latency (cao hơn được — upload có thể mất vài giây)',
      expected_reasoning: [
        {
          key: 'read_vs_write_latency',
          red_flag: 'nói latency chung chung, không phân biệt read vs write',
          followup_question:
            'Latency khi xem video và khi upload có yêu cầu khác nhau không?',
          fill_answer:
            'Read (xem video): cần rất thấp, không buffer. Write (upload): vài giây là acceptable',
          skill_tag: 'nfr_reasoning',
        },
      ],
    },
    {
      key: 'durability',
      question: 'Bạn nghĩ về durability dữ liệu của hệ thống này như thế nào?',
      expected_result:
        'Candidate nêu cần high durability cho video đã upload + giải thích: mất video của creator là mất content vĩnh viễn, ảnh hưởng niềm tin của user',
      expected_reasoning: [
        {
          key: 'data_loss_impact',
          red_flag: 'chưa đề cập hậu quả của việc mất dữ liệu',
          followup_question: 'Điều gì xảy ra nếu một video đã upload bị mất?',
          fill_answer:
            'Mất video của creator là mất content vĩnh viễn, ảnh hưởng nghiêm trọng đến niềm tin của user vào nền tảng',
          skill_tag: 'nfr_reasoning',
        },
      ],
    },
  ],
  closing: {
    question:
      'Hãy tổng kết lại các yêu cầu phi chức năng và trade-off quan trọng của hệ thống nhé.',
    expected_result:
      'Candidate tổng kết đủ: availability cao + lý do, eventual consistency + trade-off với availability, read latency thấp vs write latency cao hơn, durability cao + lý do',
    red_flags: [
      {
        key: 'missing_tradeoff',
        red_flag: 'tổng kết NFR nhưng không nhắc trade-off',
        followup_question:
          'Với các yêu cầu này, có trade-off nào quan trọng mà bạn muốn nhắc lại không?',
        fill_answer:
          'Trade-off chính: availability vs consistency — chọn AP trong CAP theorem',
        skill_tag: 'tradeoff_awareness',
      },
      {
        key: 'missing_nfr_dimension',
        red_flag: 'bỏ sót dimension quan trọng trong tổng kết',
        followup_question:
          'Bạn có nhớ chúng ta còn đề cập đến yêu cầu nào khác không?',
        fill_answer:
          'Các NFR đã xác định: availability (high), latency (read thấp/write cao hơn), consistency (eventual), durability (high)',
        skill_tag: 'synthesis',
      },
    ],
  },
};

// ── TikTok Phase 3 ────────────────────────────────────────────────────────────
const TIKTOK_PHASE3: NSDPhase3Data = {
  opening: {
    question:
      'Chúng ta đã có requirements. Bây giờ hãy cùng ước tính quy mô của hệ thống nhé.',
    provided_number: 'Hệ thống cần hỗ trợ 1 triệu DAU.',
    expected_result:
      'Candidate xác nhận sẵn sàng, tốt nhất là chủ động hỏi scale number trước khi interviewer cung cấp',
  },
  scale_dimensions: [
    {
      key: 'user_breakdown',
      question:
        'Từ 1 triệu DAU, bạn derive ra những có thể ước tính tỷ lệ nào giữa upload users và view users để làm cơ sở tính toán ?',
      expected_result:
        'Candidate đưa ra một tỉ lệ giả định hợp lý giữa upload users và view users (view users chiếm đa số), từ đó tính ra absolute number uploads/ngày — dùng đó làm base cho storage và ratio',
      expected_elements: [
        {
          key: 'distinguish_upload_vs_view',
          red_flag: 'không phân biệt tỉ lệ upload vs view users trong 1M DAU',
          followup_question:
            'Trong 1 triệu người dùng mỗi ngày, bao nhiêu phần trăm là người upload video và giả định xem sẽ có bao nhiêu lượt upload/ngày?',
          fill_answer:
            'Đưa ra một tỉ lệ giả định hợp lý cho upload users (phần thiểu số, ví dụ 5-15%), tính ra absolute number uploads/ngày tương ứng',
          skill_tag: 'scale_estimation',
        },
      ],
    },
    {
      key: 'storage_estimation',
      question:
        'Bạn ước tính dung lượng lưu trữ cần thiết như thế nào và có thể đưa ra phương án lưu trữ không?',
      expected_result:
        'Candidate show bước tính dựa trên assumptions đã đưa ra (số uploads/ngày × avg video size) ra được con số ở scale TB/ngày → kết luận cần object storage, không thể dùng DB thông thường',
      expected_elements: [
        {
          key: 'show_calculation_steps',
          red_flag: 'đưa ra con số mà không show bước tính',
          followup_question: 'Bạn tính ra con số đó dựa trên assumptions nào?',
          fill_answer:
            'Nhân số uploads/ngày (đã giả định ở phần trước) với avg video size (ví dụ vài chục MB/video) → ra con số storage ở scale TB/ngày, nhân 365 → scale PB/năm',
          skill_tag: 'scale_estimation',
        },
        {
          key: 'connect_to_architecture',
          red_flag: 'tính được nhưng không kết nối với architecture',
          followup_question:
            'Con số storage đó ảnh hưởng thế nào đến cách lưu trữ?',
          fill_answer:
            'Với scale TB/ngày → phải dùng object storage (S3/GCS), không thể dùng block storage hoặc lưu thẳng vào DB',
          skill_tag: 'architecture_connection',
        },
      ],
    },
    {
      key: 'read_write_ratio',
      question: 'Bạn nghĩ tỉ lệ read/write của hệ thống này như thế nào?',
      expected_result:
        'Candidate xác định read-heavy (~10:1 hoặc cao hơn) + kết luận cần read replicas và CDN để scale read path',
      expected_elements: [
        {
          key: 'identify_ratio',
          red_flag: 'không xác định read-heavy hay write-heavy',
          followup_question:
            'Hệ thống này có nhiều người xem hay nhiều người upload hơn?',
          fill_answer:
            'View users chiếm đa số so với upload users (theo tỉ lệ đã giả định ở phần trước) → read-heavy, ratio đọc/viết lớn (ví dụ 10:1 hoặc cao hơn)',
          skill_tag: 'scale_estimation',
        },
        {
          key: 'use_ratio_to_justify',
          red_flag: 'xác định ratio nhưng không dùng để justify design',
          followup_question:
            'Tỉ lệ đó ảnh hưởng thế nào đến kiến trúc bạn sẽ chọn?',
          fill_answer:
            'Read-heavy → cần read replicas cho DB, CDN cho video delivery, cache cho metadata',
          skill_tag: 'architecture_connection',
        },
      ],
    },
  ],
  closing: {
    question:
      'Dựa vào các con số vừa ước tính, điều đó cho bạn thấy gì về hướng thiết kế của hệ thống?',
    expected_result:
      'Candidate tổng kết đủ implications: storage lớn → object storage; read-heavy → CDN + cache + read replicas',
    red_flags: [
      {
        key: 'missing_storage_implication',
        red_flag: 'không rút ra implication về storage từ con số đã tính',
        followup_question:
          'Con số storage/ngày bạn vừa tính cho thấy điều gì về cách lưu trữ video?',
        fill_answer:
          'Với scale TB/ngày đã ước tính → phải dùng object storage, không thể lưu trên server thông thường',
        skill_tag: 'architecture_connection',
      },
      {
        key: 'missing_read_heavy_implication',
        red_flag: 'không kết nối read-heavy ratio với architecture',
        followup_question:
          'Với phần lớn users chỉ xem video (read-heavy), hệ thống cần tối ưu gì?',
        fill_answer:
          'Read-heavy → CDN để serve video gần user, cache để giảm DB load, read replicas để scale query',
        skill_tag: 'architecture_connection',
      },
    ],
  },
};

// ── TikTok Phase 4 ────────────────────────────────────────────────────────────
const TIKTOK_PHASE4: NSDPhase4Data = {
  feature_design: [
    // ─── Feature 1: upload_video ──────────────────────────────────────────────
    {
      feature: 'upload_video',
      question:
        'Hãy thiết kế tính năng upload video bằng cách vẽ graph mô tả thiết kế ở canvas và giải thích chi tiết các thành phần cùng luồng hoạt động của chúng nhé.',
      reference_graph: {
        naive: {
          nodes: [
            { id: 'client', type: 'Client' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            { id: 'video_table', type: 'DatabaseSQL' },
            { id: 'object_storage', type: 'ObjectStorage' },
          ],
          edges: [
            {
              from: 'client',
              to: 'api_server',
              label: 'POST /uploadVideo {video, user_id, metadata}',
            },
            {
              from: 'api_server',
              to: 'object_storage',
              label: 'upload video binary → get URL',
            },
            {
              from: 'api_server',
              to: 'video_table',
              label: 'INSERT {user_id, video_link (url), meta (text)}',
            },
            { from: 'api_server', to: 'client', label: '200 OK' },
          ],
        },
        optimized: {
          nodes: [
            { id: 'client', type: 'Client' },
            { id: 'cdn', type: 'CDN' },
            { id: 'load_balancer', type: 'LoadBalancer' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            { id: 'video_table', type: 'DatabaseSQL' },
            { id: 'object_storage', type: 'ObjectStorage' },
          ],
          edges: [
            { from: 'client', to: 'cdn', label: 'request' },
            { from: 'cdn', to: 'load_balancer', label: 'route' },
            { from: 'load_balancer', to: 'api_server', label: 'forward' },
            {
              from: 'api_server',
              to: 'object_storage',
              label: 'upload video binary → get URL',
            },
            {
              from: 'api_server',
              to: 'video_table',
              label: 'INSERT {user_id, video_link (url), meta (text)}',
            },
            { from: 'api_server', to: 'client', label: '200 OK' },
          ],
        },
      },
      reference_walkthrough: [
        {
          step: 1,
          text: 'Client gửi POST /uploadVideo kèm video binary + metadata (caption, user_id)',
        },
        {
          step: 2,
          text: 'API server upload video binary lên object storage (S3/BLOB) → nhận về URL',
        },
        {
          step: 3,
          text: 'API server INSERT vào video_table: {user_id, uuid, video_link (URL), meta (text)}',
        },
        { step: 4, text: 'API trả 200 OK về client' },
        {
          step: 5,
          text: '(optimized) CDN + LB đứng trước API để handle scale và high availability',
        },
      ],
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'object_storage',
            optional: false,
            expected_type: 'ObjectStorage',
            check:
              'candidate dùng object storage (S3/GCS/BLOB) cho video binary — không lưu thẳng vào DB',
            red_flag:
              'không đề cập object storage — lưu video vào DB hoặc local disk',
            followup_question:
              'Video binary file có thể lưu vào relational database được không — tại sao?',
            fill_answer:
              'Video binary phải lưu vào object storage: binary data quá lớn cho DB row, object storage scale đến PB, chi phí thấp hơn nhiều, CDN integration dễ dàng',
            skill_tag: 'storage_design',
          },
          {
            key: 'video_table',
            optional: false,
            expected_type: 'DatabaseSQL',
            match_labels: ['video', 'video_table', 'media', 'clip'],
            check:
              'candidate có bảng riêng cho video metadata với schema hợp lý',
            red_flag:
              'không tách biệt metadata và binary, hoặc không nêu schema của video table',
            followup_question: 'Video table sẽ lưu những field nào?',
            fill_answer:
              'video_table: user_id (uuid), video_id (uuid), video_link (url → object storage), meta (text/caption)',
            skill_tag: 'storage_design',
          },
          // Optional — candidate có thể thêm ở Phase 4 hoặc để đến Phase 5 — cả hai đều hợp lệ
          {
            key: 'cdn',
            optional: true,
            expected_type: 'CDN',
            check: 'candidate thêm CDN vào design',
            red_flag: 'chưa có CDN trên canvas',
            followup_question:
              'Video sẽ được phân phối đến users ở nhiều vùng địa lý như thế nào?',
            fill_answer: '', // không fill — sẽ được xử lý ở Phase 5 nếu thiếu
            skill_tag: 'caching_strategy',
          },
          {
            key: 'load_balancer',
            optional: true,
            expected_type: 'LoadBalancer',
            check: 'candidate thêm load balancer trước API server',
            red_flag: 'chưa có load balancer',
            followup_question:
              'Nếu API server bị quá tải hoặc cần deploy không downtime, bạn xử lý thế nào?',
            fill_answer: '', // không fill
            skill_tag: 'scaling_patterns',
          },
        ],
        required_explanations: [
          {
            key: 'db_type_justification',
            optional: false,
            check:
              'candidate giải thích tại sao dùng relational DB cho video metadata',
            red_flag:
              'chọn relational DB nhưng không explain tại sao không dùng NoSQL',
            followup_question:
              'Tại sao bạn chọn relational database — NoSQL có phù hợp không?',
            fill_answer:
              'Relational DB phù hợp vì: data có structure rõ ràng, cần JOIN (user → video), query cụ thể và hiệu quả hơn NoSQL với data có schema cố định',
            skill_tag: 'db_selection',
          },
          {
            key: 'naive_before_optimized',
            optional: false,
            check:
              'candidate trình bày naive flow (client → api → db + storage) trước khi thêm CDN/LB',
            red_flag: 'nhảy thẳng vào CDN + LB mà không nêu naive flow trước',
            followup_question:
              'Nếu chỉ có 100 users, flow đơn giản nhất trông như thế nào?',
            fill_answer:
              'Naive: client → API server → object_storage + video_table. Sau đó thêm CDN + LB khi scale',
            skill_tag: 'naive_first_thinking',
          },
          {
            key: 'url_stored_not_binary',
            optional: false,
            check:
              'candidate hiểu rằng DB chỉ lưu URL/link đến object storage, không lưu binary',
            red_flag: 'không rõ DB lưu gì — binary hay URL',
            followup_question:
              'Bảng video_table lưu bản thân video hay lưu gì về video?',
            fill_answer:
              'DB chỉ lưu video_link (URL trỏ đến object storage). Binary thực sự nằm ở object storage',
            skill_tag: 'storage_design',
          },
        ],
      },
      known_extra_nodes: [
        {
          key: 'message_queue',
          type: 'MessageQueue',
          valid_context:
            'Async transcoding pipeline — candidate muốn tách upload khỏi video processing',
          probe_question: 'Bạn thêm queue vào đây để làm gì?',
        },
        {
          key: 'transcoding_service',
          type: 'Worker',
          valid_context:
            'Video processing service — convert sang nhiều format/resolution trước khi lưu',
          probe_question:
            'Service này xử lý video như thế nào trước khi lưu vào object storage?',
        },
        {
          key: 'notification_service',
          type: 'Worker',
          valid_context: 'Notify followers sau khi upload xong',
          probe_question:
            'Bạn dùng notification service này để làm gì trong upload flow?',
        },
      ],
    },

    // ─── Feature 2: view_feed ─────────────────────────────────────────────────
    {
      feature: 'view_feed',
      question: 'Hãy thiết kế tính năng xem feed nhé.',
      reference_graph: {
        naive: {
          nodes: [
            { id: 'client', type: 'Client' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            {
              id: 'video_table_primary',
              type: 'DatabaseSQL',
              acceptable_types: ['DatabaseSQL'],
            },
            {
              id: 'object_storage',
              type: 'ObjectStorage',
              acceptable_types: ['ObjectStorage'],
            },
          ],
          edges: [
            {
              from: 'client',
              to: 'api_server',
              label: 'GET /viewFeed {user_id}',
            },
            {
              from: 'api_server',
              to: 'video_table_primary',
              label: 'query video list for user',
            },
            { from: 'api_server', to: 'client', label: 'return video URLs' },
            {
              from: 'client',
              to: 'object_storage',
              label: 'fetch video binaries',
            },
          ],
        },
        optimized: {
          nodes: [
            { id: 'client', type: 'Client' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            { id: 'redis_cache', type: 'Cache', acceptable_types: ['Cache'] },
            {
              id: 'pre_cache_service',
              type: 'Worker',
              acceptable_types: ['Worker'],
            },
            {
              id: 'video_table_primary',
              type: 'DatabaseSQL',
              acceptable_types: ['DatabaseSQL'],
            },
            {
              id: 'video_table_readonly',
              type: 'DatabaseSQL',
              acceptable_types: ['DatabaseSQL'],
            },
            {
              id: 'object_storage',
              type: 'ObjectStorage',
              acceptable_types: ['ObjectStorage'],
            },
          ],
          edges: [
            {
              from: 'video_table_primary',
              to: 'video_table_readonly',
              label: 'replication (read replica)',
            },
            {
              from: 'video_table_readonly',
              to: 'pre_cache_service',
              label: 'pull following list + video metadata',
            },
            {
              from: 'pre_cache_service',
              to: 'redis_cache',
              label: 'build + populate feed per user_id',
            },
            {
              from: 'api_server',
              to: 'redis_cache',
              label: 'lookup feed for user_id (replaces direct DB query)',
            },
            {
              from: 'redis_cache',
              to: 'client',
              label: 'return pre-built list of video URLs',
            },
          ],
        },
      },
      reference_walkthrough: [
        { step: 1, text: 'Client gửi GET /viewFeed với user_id' },
        {
          step: 2,
          text: 'API server lookup Redis cache theo user_id → nhận danh sách ~10 video URL được pre-build sẵn',
        },
        {
          step: 3,
          text: 'Client dùng các URL đó để fetch video binary trực tiếp từ object storage',
        },
        {
          step: 4,
          text: 'pre_cache_service chạy trong background: đọc từ read-only DB replica (following list + video metadata của những người user đang follow) → biên soạn playlist → ghi vào Redis cache theo user_id',
        },
        {
          step: 5,
          text: 'Read replica tách riêng khỏi primary write DB để tránh read load đè lên write path',
        },
      ],
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'redis_cache',
            optional: false,
            expected_type: 'Cache',
            acceptable_types: ['DatabaseNoSQL'],
            match_labels: [
              'redis',
              'feed cache',
              'materialized feed',
              'timeline cache',
            ],
            check:
              'candidate có cache layer (Redis hoặc tương đương) lưu pre-built feed per user',
            red_flag:
              'không có cache — GET /viewFeed query thẳng vào DB mỗi lần',
            followup_question:
              'Nếu 1 triệu user cùng lúc gọi viewFeed, mỗi lần đều query DB thì điều gì xảy ra?',
            fill_answer:
              'DB sẽ quá tải. Giải pháp: Redis cache lưu pre-built feed per user_id → read từ memory, không hit DB',
            skill_tag: 'caching_strategy',
          },
          {
            key: 'pre_cache_service',
            optional: false,
            expected_type: 'Worker',
            match_labels: [
              'feed builder',
              'precompute',
              'ranking',
              'recommendation',
              'fanout',
            ],
            check:
              'candidate có service chạy background để build cache trước — không build tại thời điểm request',
            red_flag:
              'cache được build on-demand (khi user request) thay vì pre-built trước',
            followup_question:
              'Cache được build lúc nào — khi user mở app hay trước đó?',
            fill_answer:
              'pre_cache_service chạy background theo schedule hoặc trigger → build cache trước khi user request → latency gần như 0',
            skill_tag: 'caching_strategy',
          },
          {
            key: 'read_replica',
            optional: true,
            expected_type: 'DatabaseSQL',
            check: 'candidate tách read-only replica khỏi primary write DB',
            red_flag: 'pre_cache_service đọc thẳng từ primary write DB',
            followup_question:
              'pre_cache_service đọc data từ đâu — cùng DB với write không?',
            fill_answer:
              'pre_cache_service đọc từ read-only replica để không tạo read load lên primary write DB',
            skill_tag: 'read_write_optimization',
          },
        ],
        required_explanations: [
          {
            key: 'read_heavy_insight',
            optional: false,
            check:
              'candidate nhận ra hệ thống read-heavy và dùng đó để justify cache + read replica',
            red_flag:
              'có cache nhưng không giải thích tại sao — không link với read-heavy characteristic',
            followup_question:
              'Tại sao view_feed lại cần cache trong khi upload_video không cần?',
            fill_answer:
              'View users chiếm đa số so với upload users (theo tỉ lệ đã ước tính ở Phase 3). Read-heavy → cache là critical, không phải optional',
            skill_tag: 'architecture_connection',
          },
          {
            key: 'cache_update_strategy',
            optional: true,
            check: 'candidate đề cập khi nào cache được refresh/invalidate',
            red_flag:
              'có cache nhưng không nói cache được update khi nào hoặc TTL bao lâu',
            followup_question:
              'Nếu user upload video mới, cache của người follow họ được update như thế nào?',
            fill_answer: '', // không fill — design decision, không có đáp án duy nhất đúng
            skill_tag: 'caching_strategy',
          },
        ],
      },
      known_extra_nodes: [
        {
          key: 'message_queue_feed',
          type: 'MessageQueue',
          valid_context:
            'candidate muốn trigger pre_cache_service qua event khi có video mới thay vì schedule cố định',
          probe_question:
            'Message queue này kết nối component nào với nhau trong feed pipeline?',
        },
      ],
    },

    // ─── Feature 3: user_activity ─────────────────────────────────────────────
    {
      feature: 'user_activity',
      question:
        'Hãy thiết kế tính năng user activity (follow, like, comment) nhé.',
      reference_graph: {
        naive: {
          nodes: [
            { id: 'client', type: 'Client' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            {
              id: 'user_activity_table',
              type: 'DatabaseSQL',
              acceptable_types: ['DatabaseSQL'],
            },
          ],
          edges: [
            {
              from: 'client',
              to: 'api_server',
              label: 'POST /userActivity {action, actor_id, target_id}',
            },
            {
              from: 'api_server',
              to: 'user_activity_table',
              label: 'INSERT activity record',
            },
          ],
        },
        optimized: {
          nodes: [
            { id: 'client', type: 'Client' },
            {
              id: 'api_server',
              type: 'WebServer',
              acceptable_types: ['WebServer', 'APIGateway'],
            },
            {
              id: 'user_activity_table',
              type: 'DatabaseSQL',
              acceptable_types: ['DatabaseSQL'],
            },
            { id: 'pre_cache_service', type: 'Worker' }, // reused from view_feed
          ],
          edges: [
            {
              from: 'client',
              to: 'api_server',
              label: 'POST /userActivity {action, actor_id, target_id}',
            },
            {
              from: 'api_server',
              to: 'user_activity_table',
              label: 'INSERT activity record',
            },
            {
              from: 'user_activity_table',
              to: 'pre_cache_service',
              label: 'activity data feeds recommendation algorithm',
            },
          ],
        },
      },
      reference_walkthrough: [
        {
          step: 1,
          text: "Client gửi POST /userActivity: {action: 'follow'/'like'/'comment', actor_id, target_id}",
        },
        {
          step: 2,
          text: 'API server INSERT vào user_activity_table: ghi lại ai làm gì với ai/video nào',
        },
        {
          step: 3,
          text: 'Data trong user_activity_table được pre_cache_service đọc để build personalized feed (following list → fetch video của những người đó)',
        },
      ],
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'user_activity_table',
            optional: false,
            expected_type: 'DatabaseSQL',
            match_labels: [
              'activity',
              'like',
              'follow',
              'comment',
              'interaction',
            ],
            check:
              'candidate có bảng riêng cho activity (follow/like) — không trộn vào video_table',
            red_flag: 'không có bảng riêng cho user activity',
            followup_question: 'Dữ liệu follow và like sẽ được lưu ở đâu?',
            fill_answer:
              'user_activity_table riêng biệt với foreign keys: following → users, likes → videos',
            skill_tag: 'storage_design',
          },
        ],
        required_explanations: [
          {
            key: 'foreign_key_structure',
            optional: false,
            check:
              'candidate nêu foreign key relationships: following FK → users, likes FK → videos',
            red_flag:
              'có bảng nhưng không rõ schema hoặc relationship với bảng khác',
            followup_question:
              'Bảng activity cần liên kết với những bảng nào và như thế nào?',
            fill_answer:
              'following: FK → users (many-to-many); likes: FK → videos (many-to-many)',
            skill_tag: 'db_selection',
          },
          {
            key: 'feeds_precache',
            optional: false,
            check:
              'candidate connect user_activity data với pre_cache_service (activity là input để build feed)',
            red_flag:
              'thiết kế user_activity như endpoint độc lập, không liên kết với view_feed design',
            followup_question:
              'Data từ user_activity được dùng ở đâu trong hệ thống?',
            fill_answer:
              'pre_cache_service đọc following list từ user_activity để biết user X cần thấy video của ai → build cache',
            skill_tag: 'cross_feature_coherence',
          },
        ],
      },
      known_extra_nodes: [],
      integration_checks: [
        {
          key: 'upload_to_feed_connection',
          check:
            'candidate giải thích video sau khi upload được index vào video_table và pre_cache_service dùng data đó để build feed',
          red_flag:
            'upload flow và feed flow hoàn toàn tách biệt — không có liên kết nào từ video_table sang pre_cache_service',
          followup_question:
            'Sau khi user upload video, video đó xuất hiện trong feed của follower qua cơ chế nào?',
          fill_answer:
            'video_link lưu vào video_table → pre_cache_service đọc video_table để biết video mới → build cache feed cho follower',
          skill_tag: 'cross_feature_coherence',
        },
        {
          key: 'activity_to_feed_connection',
          check:
            'candidate giải thích following data từ user_activity_table là input cho pre_cache_service khi build feed',
          red_flag:
            'user_activity được mô tả như endpoint riêng lẻ, không connect với view_feed pipeline',
          followup_question:
            'pre_cache_service biết user X cần thấy video của ai — dữ liệu đó lấy từ đâu?',
          fill_answer:
            'pre_cache_service đọc following list từ user_activity_table → biết X follow ai → fetch video của những người đó từ video_table',
          skill_tag: 'cross_feature_coherence',
        },
        {
          key: 'shared_infra_consistency',
          check:
            'candidate xác nhận pre_cache_service và read_replica được dùng chung giữa view_feed và user_activity — không phải hai instance riêng',
          red_flag:
            'không nhắc đến việc shared components (pre_cache_service, read_replica) được reuse — candidate có thể nghĩ mỗi feature có infra riêng',
          followup_question:
            'pre_cache_service trong user_activity và view_feed là cùng một service hay hai service khác nhau?',
          fill_answer:
            'Cùng một pre_cache_service: đọc từ user_activity_table (following) và video_table (video list) → build cache. Không cần duplicate infra',
          skill_tag: 'cross_feature_coherence',
        },
        {
          key: 'read_write_path_separation',
          check:
            'candidate mô tả rõ write path (upload, activity) đi vào primary DB, không đi qua read replica',
          red_flag:
            'không phân biệt write vào primary và read từ replica — có thể dẫn đến replication lag không được xét đến',
          followup_question:
            'Upload video và record activity đi vào primary DB hay replica?',
          fill_answer:
            'Write (upload, activity) → primary DB; read (pre_cache_service build feed) → read replica. Không bao giờ write vào replica',
          skill_tag: 'cross_feature_coherence',
        },
      ],
    },
  ],
};

// ── TikTok Phase 5 ────────────────────────────────────────────────────────────
const TIKTOK_PHASE5: NSDPhase5Data = {
  deep_dive_questions: [
    {
      type: 'scale',
      key: 'database_scale',
      question:
        'Database là bottleneck khi traffic tăng 10x — bạn sẽ xử lý thế nào?',
      expected_result:
        'Candidate đề xuất read replicas để scale read path + sharding strategy cụ thể (theo user_id hoặc video_id) với trade-off rõ ràng',
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'read_replica_scale',
            optional: false,
            expected_type: 'DatabaseSQL',
            reuse_from: ['read_replica'],
            check:
              'candidate thêm read replica node hoặc đã có từ Phase 4 + giải thích cơ chế scale',
            red_flag: 'không đề cập read replicas cho read-heavy system',
            followup_question:
              'Hệ thống này read-heavy — bạn có thể tách read và write không?',
            fill_answer:
              'Read replicas: write → primary; read → replicas. Giảm tải primary, scale read độc lập',
            skill_tag: 'read_write_optimization',
          },
        ],
        required_explanations: [
          {
            key: 'sharding_strategy',
            optional: false,
            check:
              'candidate đề xuất sharding với strategy cụ thể (user_id, video_id) và giải thích trade-off',
            red_flag: 'đề cập sharding nhưng không nêu strategy cụ thể',
            followup_question:
              'Bạn sẽ shard theo tiêu chí nào — user ID, region, hay cách khác?',
            fill_answer:
              'Shard theo user_id: user và video cùng shard → giảm cross-shard query khi load feed',
            skill_tag: 'scaling_patterns',
          },
        ],
      },
    },
    {
      type: 'edge_case',
      key: 'viral_video',
      question:
        'Một video viral được 10 triệu người xem cùng lúc — hệ thống của bạn xử lý thế nào?',
      expected_result:
        'Candidate đề xuất CDN để absorb hot content requests + cache strategy riêng cho hot content (longer TTL hoặc pre-warm)',
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'cdn_hotspot',
            optional: false,
            expected_type: 'CDN',
            check:
              'candidate có CDN node (carry-over từ Phase 4 hoặc thêm mới) + giải thích cơ chế absorb hotspot',
            red_flag: 'không đề cập CDN để xử lý hotspot',
            followup_question:
              'Nếu tất cả requests đến object storage trực tiếp, điều gì xảy ra?',
            fill_answer:
              'CDN cache video gần user → 10M requests hit CDN edge, không đến origin storage',
            skill_tag: 'caching_strategy',
          },
        ],
        required_explanations: [
          {
            key: 'cache_ttl_strategy',
            optional: false,
            check:
              'candidate đề xuất cache strategy riêng cho hot content: longer TTL hoặc pre-warm',
            red_flag: 'không đề cập strategy cache cho hot content',
            followup_question:
              'Video viral cần được cache như thế nào khác so với video thông thường?',
            fill_answer:
              'Hot content: longer TTL, pre-warm CDN nodes. Thông thường: standard TTL, evict khi ít view',
            skill_tag: 'caching_strategy',
          },
        ],
      },
    },
    {
      type: 'scale',
      key: 'multi_region',
      question:
        'Hệ thống cần phục vụ users ở nhiều region trên thế giới — bạn sẽ thay đổi gì?',
      expected_result:
        'Candidate đề xuất CDN global + data replication strategy + giải thích trade-off consistency khi geo-distributed',
      evaluation_checklist: {
        required_nodes: [
          {
            key: 'cdn_global',
            optional: false,
            expected_type: 'CDN',
            check:
              'candidate có CDN node + giải thích geo distribution context',
            red_flag:
              'không đề cập CDN hoặc edge nodes để giảm latency theo region',
            followup_question:
              'User ở Việt Nam access video từ server ở US — latency sẽ như thế nào?',
            fill_answer:
              'CDN với edge nodes toàn cầu → user lấy từ node gần nhất, không phải origin',
            skill_tag: 'scaling_patterns',
          },
        ],
        required_explanations: [
          {
            key: 'data_replication',
            optional: false,
            check:
              'candidate đề cập replication strategy giữa regions với trade-off consistency',
            red_flag: 'không đề cập replication metadata giữa regions',
            followup_question:
              'Nếu một region down, users ở region khác vẫn xem được không?',
            fill_answer:
              'Replicate data sang region gần user; video → CDN toàn cầu; metadata → eventual consistency giữa regions',
            skill_tag: 'scaling_patterns',
          },
        ],
      },
    },
  ],
};

// ── Seed data ─────────────────────────────────────────────────────────────────

export const NSD_PROBLEM_SEEDS: Partial<NSDProblem>[] = [
  {
    title: 'Design TikTok',
    domain: 'video-sharing',
    targetLevel: 'senior',
    estimatedDurationMinutes: 90,
    tags: ['video', 'streaming', 'scale', 'caching'],
    isActive: true,
    phase1Data: null, // no Phase 1 for this problem
    phase2Data: null, // no Phase 2 for this problem
    phase3Data: null, // no Phase 3 for this problem
    phase4Data: TIKTOK_PHASE4,
    phase5Data: TIKTOK_PHASE5,
  },
];

export async function seedNSDProblems(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(NSDProblem);
  let updated = 0;
  let created = 0;

  for (const seed of NSD_PROBLEM_SEEDS) {
    const existing = await repo.findOne({ where: { title: seed.title } });
    if (existing) {
      await repo.save(repo.merge(existing, seed as NSDProblem));
      updated++;
    } else {
      await repo.save(repo.create(seed as NSDProblem));
      created++;
    }
  }

  console.log(`[seed] NSD problems: ${updated} updated, ${created} created.`);
}
