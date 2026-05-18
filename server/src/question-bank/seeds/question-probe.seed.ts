import { DataSource, Repository } from 'typeorm';
import {
  QuestionProbeCompetency,
  QuestionProbeFollowUpTrigger,
  QuestionProbeLevel,
  QuestionProbeRoleFamily,
  QuestionProbeStage,
  QuestionProbeType,
} from '../constants/question-bank-taxonomy.constants';
import {
  QuestionProbe,
  QuestionProbeFollowUp,
  QuestionProbeLocalizedContent,
  QuestionProbeLocalizedContentMap,
  QuestionProbeScoringHint,
  QuestionProbeSourceReference,
} from '../entities/question-probe.entity';

interface RoleMeta {
  label: string;
  code: string;
}

interface ProbeBlueprint {
  level: QuestionProbeLevel;
  type: QuestionProbeType;
  stage: QuestionProbeStage;
  content: QuestionProbeLocalizedContentMap;
  competencies: QuestionProbeCompetency[];
  techTags: string[];
  followUpTriggers: QuestionProbeFollowUpTrigger[];
}

export type QuestionProbeSeed = Omit<
  Partial<QuestionProbe>,
  'id' | 'createdAt' | 'updatedAt'
> & {
  code: string;
  stages: QuestionProbeStage[];
  roleFamilies: QuestionProbeRoleFamily[];
  levels: QuestionProbeLevel[];
  type: QuestionProbeType;
  competencies: QuestionProbeCompetency[];
  techTags: string[];
  difficulty: number;
  intent: string;
  primaryQuestion: string;
  expectedSignals: string[];
  redFlags: string[];
  scoringHints: QuestionProbeScoringHint[];
  followUps: QuestionProbeFollowUp[];
  localizedContent: QuestionProbeLocalizedContentMap;
  sourceReferences: QuestionProbeSourceReference[];
};

const ROLE_META: Record<QuestionProbeRoleFamily, RoleMeta> = {
  backend: { label: 'Backend', code: 'BE' },
  frontend: { label: 'Frontend', code: 'FE' },
  fullstack: { label: 'Fullstack', code: 'FS' },
  devops: { label: 'DevOps/SRE', code: 'DO' },
  data: { label: 'Data', code: 'DA' },
  qa: { label: 'QA', code: 'QA' },
  security: { label: 'Security', code: 'SE' },
};

const LEVEL_DIFFICULTY: Record<QuestionProbeLevel, number> = {
  junior: 2,
  mid: 3,
  senior: 4,
};

const LEVEL_CODE: Record<QuestionProbeLevel, string> = {
  junior: 'JR',
  mid: 'MID',
  senior: 'SR',
};

const LEVEL_LABEL: Record<QuestionProbeLevel, string> = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
};

const TYPE_CODE: Record<QuestionProbeType, string> = {
  behavioral: 'BEHAV',
  technical_depth: 'TECH',
  trade_off: 'TRADE',
  debugging: 'DEBUG',
  cv_claim_verification: 'CV',
  situational: 'SIT',
};

function lc({
  en,
  vi,
  ja,
}: {
  en: Pick<
    QuestionProbeLocalizedContent,
    'title' | 'displayQuestion' | 'displayIntent'
  >;
  vi: Pick<
    QuestionProbeLocalizedContent,
    'title' | 'displayQuestion' | 'displayIntent'
  >;
  ja: Pick<
    QuestionProbeLocalizedContent,
    'title' | 'displayQuestion' | 'displayIntent'
  >;
}): QuestionProbeLocalizedContentMap {
  return {
    en: {
      ...en,
      guidance: [
        'Use a concrete example, not only a textbook explanation.',
        'State your role, constraints, decision, and result.',
        'Include evidence such as metrics, logs, tests, rollout results, or stakeholder impact.',
      ],
      commonMistakes: [
        'Answering with generic best practices only.',
        'Skipping personal contribution or decision ownership.',
        'Claiming success without a measurable or observable outcome.',
      ],
      labels: {},
    },
    vi: {
      ...vi,
      guidance: [
        'Dùng một ví dụ cụ thể, không chỉ trả lời theo lý thuyết.',
        'Nêu rõ vai trò cá nhân, ràng buộc, quyết định và kết quả.',
        'Bổ sung bằng chứng như metric, log, test, kết quả rollout hoặc tác động tới stakeholder.',
      ],
      commonMistakes: [
        'Chỉ nói best practice chung chung.',
        'Không nêu rõ phần đóng góp hoặc quyết định của bản thân.',
        'Nói có cải thiện nhưng không có baseline hoặc dấu hiệu đo được.',
      ],
      labels: {},
    },
    ja: {
      ...ja,
      guidance: [
        '教科書的な説明だけでなく、具体的な例を使う。',
        '自分の役割、制約、判断、結果を明確にする。',
        'メトリクス、ログ、テスト、ロールアウト結果、またはステークホルダーへの影響を含める。',
      ],
      commonMistakes: [
        '一般的なベストプラクティスだけで答える。',
        '自分の貢献や判断の範囲を説明しない。',
        'ベースラインや測定可能な根拠なしに改善を主張する。',
      ],
      labels: {},
    },
  };
}

const PROBE_BLUEPRINTS: Record<QuestionProbeRoleFamily, ProbeBlueprint[]> = {
  backend: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Request validation for a NestJS endpoint',
          displayQuestion:
            'Walk through how you would validate and reject a malformed request before it reaches business logic in a NestJS API.',
          displayIntent:
            'Check whether the candidate understands request validation boundaries, DTOs, error responses, and why validation belongs before domain logic.',
        },
        vi: {
          title: 'Validate request cho endpoint NestJS',
          displayQuestion:
            'Hãy trình bày cách bạn validate và từ chối một request sai định dạng trước khi nó đi vào business logic trong API NestJS.',
          displayIntent:
            'Kiểm tra ứng viên có hiểu ranh giới validation, DTO, error response và lý do validation nên nằm trước domain logic hay không.',
        },
        ja: {
          title: 'NestJS エンドポイントのリクエスト検証',
          displayQuestion:
            'NestJS API で不正なリクエストがビジネスロジックに入る前に、どのように検証して拒否するか説明してください。',
          displayIntent:
            'validation の境界、DTO、エラーレスポンス、domain logic の前で検証する理由を理解しているか確認する。',
        },
      }),
      ['nodejs', 'nestjs', 'rest'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Debugging a failed database insert',
          displayQuestion:
            'A PostgreSQL insert fails in one API path but succeeds in another. How would you reproduce the issue and narrow down whether the problem is DTO mapping, transaction handling, or schema constraints?',
          displayIntent:
            'Evaluate practical debugging steps for a simple backend persistence failure.',
        },
        vi: {
          title: 'Debug lỗi insert database thất bại',
          displayQuestion:
            'Một lệnh insert PostgreSQL lỗi ở một API path nhưng chạy được ở path khác. Bạn sẽ reproduce và khoanh vùng lỗi giữa DTO mapping, transaction handling hoặc schema constraint như thế nào?',
          displayIntent:
            'Đánh giá các bước debug thực tế cho lỗi persistence đơn giản ở backend.',
        },
        ja: {
          title: 'データベース insert 失敗のデバッグ',
          displayQuestion:
            'PostgreSQL の insert がある API パスでは失敗し、別のパスでは成功します。DTO mapping、transaction handling、schema constraint のどこに問題があるか、どう再現して切り分けますか。',
          displayIntent:
            'backend の基本的な persistence 障害に対する実践的なデバッグ手順を評価する。',
        },
      }),
      ['postgresql', 'schema_design', 'transaction'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from a code review comment',
          displayQuestion:
            'Tell me about a code review comment that changed how you write backend code now.',
          displayIntent:
            'Assess whether feedback led to a concrete engineering habit, not just agreement with the reviewer.',
        },
        vi: {
          title: 'Học từ một comment code review',
          displayQuestion:
            'Hãy kể về một comment code review đã thay đổi cách bạn viết backend code hiện tại.',
          displayIntent:
            'Đánh giá feedback có tạo ra thói quen kỹ thuật cụ thể hay chỉ dừng ở việc đồng ý với reviewer.',
        },
        ja: {
          title: 'コードレビューコメントからの学び',
          displayQuestion:
            '現在の backend code の書き方を変えたコードレビューコメントについて話してください。',
          displayIntent:
            'レビューへの同意だけでなく、具体的なエンジニアリング習慣につながったかを評価する。',
        },
      }),
      ['nodejs', 'nestjs'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Blocked by an unclear API contract',
          displayQuestion:
            'You are assigned an endpoint but the request and response contract is ambiguous. What do you clarify before coding, and how do you avoid blocking the team?',
          displayIntent:
            'Assess how the candidate handles ambiguity and communicates API contract questions early.',
        },
        vi: {
          title: 'Bị chặn vì API contract chưa rõ',
          displayQuestion:
            'Bạn được giao một endpoint nhưng request và response contract còn mơ hồ. Bạn sẽ làm rõ gì trước khi code và tránh làm team bị chặn như thế nào?',
          displayIntent:
            'Đánh giá cách ứng viên xử lý mơ hồ và giao tiếp sớm về API contract.',
        },
        ja: {
          title: '不明確な API contract で詰まった場合',
          displayQuestion:
            '担当した endpoint の request/response contract が曖昧です。実装前に何を確認し、チームを止めないためにどう動きますか。',
          displayIntent:
            '曖昧さへの対応と、API contract の疑問を早く伝える力を評価する。',
        },
      }),
      ['rest', 'graphql'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Transaction boundaries in an order checkout flow',
          displayQuestion:
            'Explain where you would put transaction boundaries in a checkout flow that creates an order, reserves inventory, and records payment state.',
          displayIntent:
            'Assess production reasoning about transactions, consistency, and partial failure in a backend flow.',
        },
        vi: {
          title: 'Transaction boundary trong luồng checkout',
          displayQuestion:
            'Hãy giải thích bạn sẽ đặt transaction boundary ở đâu trong luồng checkout tạo order, giữ inventory và ghi nhận trạng thái thanh toán.',
          displayIntent:
            'Đánh giá tư duy production về transaction, consistency và partial failure trong một backend flow.',
        },
        ja: {
          title: 'checkout flow の transaction boundary',
          displayQuestion:
            'order 作成、inventory 予約、payment state 記録を行う checkout flow で、transaction boundary をどこに置くか説明してください。',
          displayIntent:
            'backend flow における transaction、consistency、partial failure への production reasoning を評価する。',
        },
      }),
      ['postgresql', 'transaction', 'consistency'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Cache trade-offs for a read-heavy API',
          displayQuestion:
            'For a read-heavy product API backed by PostgreSQL, when would you add Redis caching, and what risks would you need to manage?',
          displayIntent:
            'Evaluate cache trade-off reasoning around freshness, invalidation, hit rate, latency, and operational cost.',
        },
        vi: {
          title: 'Trade-off cache cho API đọc nhiều',
          displayQuestion:
            'Với một product API đọc nhiều và dùng PostgreSQL phía sau, khi nào bạn thêm Redis cache và cần quản lý những rủi ro nào?',
          displayIntent:
            'Đánh giá tư duy trade-off về cache freshness, invalidation, hit rate, latency và chi phí vận hành.',
        },
        ja: {
          title: 'read-heavy API の cache trade-off',
          displayQuestion:
            'PostgreSQL を backend にした read-heavy な product API で、いつ Redis cache を追加し、どんなリスクを管理しますか。',
          displayIntent:
            'freshness、invalidation、hit rate、latency、運用コストに関する cache trade-off を評価する。',
        },
      }),
      ['postgresql', 'redis', 'rest'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Latency spike after a queue worker release',
          displayQuestion:
            'A BullMQ worker release caused p95 latency to rise and queue depth to grow. What would you inspect first, and how would you decide whether to roll back?',
          displayIntent:
            'Assess incident diagnosis using queue metrics, logs, deploy diff, and rollback judgment.',
        },
        vi: {
          title: 'Latency tăng sau khi release queue worker',
          displayQuestion:
            'Một bản release BullMQ worker làm p95 latency tăng và queue depth lớn dần. Bạn kiểm tra gì trước và quyết định rollback như thế nào?',
          displayIntent:
            'Đánh giá chẩn đoán incident bằng queue metric, log, deploy diff và judgment về rollback.',
        },
        ja: {
          title: 'queue worker release 後の latency spike',
          displayQuestion:
            'BullMQ worker の release 後に p95 latency が上がり、queue depth も増えています。最初に何を確認し、rollback の判断をどう行いますか。',
          displayIntent:
            'queue metrics、logs、deploy diff、rollback 判断を使った incident diagnosis を評価する。',
        },
      }),
      ['bullmq', 'redis', 'logging'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying a 40 percent latency reduction claim',
          displayQuestion:
            'Your CV says you reduced API latency by 40 percent. What was the baseline, what changed technically, and how did you verify the result?',
          displayIntent:
            'Verify whether a performance claim has personal contribution, measurement method, and durable evidence.',
        },
        vi: {
          title: 'Xác minh claim giảm latency 40 phần trăm',
          displayQuestion:
            'CV của bạn nói bạn giảm API latency 40 phần trăm. Baseline là gì, bạn thay đổi kỹ thuật gì và xác minh kết quả như thế nào?',
          displayIntent:
            'Xác minh claim performance có đóng góp cá nhân, phương pháp đo và bằng chứng bền vững hay không.',
        },
        ja: {
          title: 'latency 40% 削減 claim の検証',
          displayQuestion:
            'CV に API latency を 40% 削減したとあります。baseline は何で、技術的に何を変え、結果をどう検証しましたか。',
          displayIntent:
            'performance claim に個人の貢献、測定方法、継続的な証拠があるかを検証する。',
        },
      }),
      ['nodejs', 'postgresql', 'redis', 'opentelemetry'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Choosing sync or async processing for payment events',
          displayQuestion:
            'Describe a decision where you chose between synchronous processing and async messaging for a payment-related flow. What risk did you accept?',
          displayIntent:
            'Assess senior trade-off reasoning for consistency, user experience, retries, idempotency, and auditability.',
        },
        vi: {
          title: 'Chọn sync hay async cho payment event',
          displayQuestion:
            'Hãy mô tả một quyết định bạn chọn giữa xử lý đồng bộ và async messaging cho luồng liên quan thanh toán. Bạn đã chấp nhận rủi ro nào?',
          displayIntent:
            'Đánh giá trade-off senior về consistency, user experience, retry, idempotency và auditability.',
        },
        ja: {
          title: 'payment event の sync/async 選択',
          displayQuestion:
            'payment 関連 flow で synchronous processing と async messaging のどちらかを選んだ判断を説明してください。どんなリスクを受け入れましたか。',
          displayIntent:
            'consistency、user experience、retry、idempotency、auditability に関する senior trade-off を評価する。',
        },
      }),
      ['kafka', 'idempotency', 'outbox_pattern', 'transaction'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Finding root cause across API, queue, and database layers',
          displayQuestion:
            'Tell me about a production failure where symptoms appeared in one layer but root cause was elsewhere. How did you prove the root cause?',
          displayIntent:
            'Evaluate cross-system debugging, evidence discipline, and prevention of repeated incidents.',
        },
        vi: {
          title: 'Tìm root cause qua API, queue và database',
          displayQuestion:
            'Hãy kể về một production failure mà triệu chứng xuất hiện ở một layer nhưng root cause nằm ở nơi khác. Bạn chứng minh root cause như thế nào?',
          displayIntent:
            'Đánh giá debugging cross-system, kỷ luật bằng chứng và phòng ngừa incident lặp lại.',
        },
        ja: {
          title: 'API・queue・database をまたぐ root cause 特定',
          displayQuestion:
            '症状はある layer に出ていたが root cause は別の場所にあった production failure について話してください。root cause をどう証明しましたか。',
          displayIntent:
            'cross-system debugging、evidence discipline、再発防止を評価する。',
        },
      }),
      ['nestjs', 'postgresql', 'kafka', 'opentelemetry'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a backend redesign',
          displayQuestion:
            'You mention leading a backend redesign. Which architectural decisions were yours, what did the team own, and what evidence shows the redesign worked?',
          displayIntent:
            'Verify senior ownership claims and separate architectural judgment from team execution.',
        },
        vi: {
          title: 'Xác minh ownership trong backend redesign',
          displayQuestion:
            'Bạn nói mình dẫn dắt một backend redesign. Những quyết định kiến trúc nào là của bạn, phần nào team sở hữu và bằng chứng nào cho thấy redesign hiệu quả?',
          displayIntent:
            'Xác minh claim ownership senior và tách architectural judgment khỏi phần thực thi của team.',
        },
        ja: {
          title: 'backend redesign の ownership 検証',
          displayQuestion:
            'backend redesign をリードしたとあります。どの architectural decision があなたのもので、team は何を担当し、redesign が有効だった証拠は何ですか。',
          displayIntent:
            'senior ownership claim を検証し、architectural judgment と team execution を切り分ける。',
        },
      }),
      ['nodejs', 'postgresql', 'redis', 'event_driven_architecture'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Resolving disagreement about service boundaries',
          displayQuestion:
            'Tell me about a serious disagreement over service boundaries or data ownership. How did you reach alignment?',
          displayIntent:
            'Assess conflict handling, communication, and system ownership in senior backend work.',
        },
        vi: {
          title: 'Giải quyết bất đồng về service boundary',
          displayQuestion:
            'Hãy kể về một bất đồng nghiêm túc liên quan service boundary hoặc data ownership. Bạn đã đạt được alignment như thế nào?',
          displayIntent:
            'Đánh giá conflict handling, communication và system ownership trong backend senior.',
        },
        ja: {
          title: 'service boundary をめぐる意見対立の解決',
          displayQuestion:
            'service boundary や data ownership をめぐる大きな意見対立について話してください。どのように alignment を取りましたか。',
          displayIntent:
            'senior backend work における conflict handling、communication、system ownership を評価する。',
        },
      }),
      ['schema_design', 'event_driven_architecture'],
    ),
  ],
  frontend: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Controlled form state in React',
          displayQuestion:
            'Explain how you would build a form with validation in React and keep input state predictable.',
          displayIntent:
            'Check whether the candidate understands controlled inputs, validation timing, and user-facing errors.',
        },
        vi: {
          title: 'Controlled form state trong React',
          displayQuestion:
            'Hãy giải thích cách bạn xây form có validation trong React và giữ input state dễ dự đoán.',
          displayIntent:
            'Kiểm tra ứng viên có hiểu controlled input, thời điểm validation và lỗi hiển thị cho user hay không.',
        },
        ja: {
          title: 'React の controlled form state',
          displayQuestion:
            'React で validation 付き form を作り、input state を予測可能に保つ方法を説明してください。',
          displayIntent:
            'controlled inputs、validation timing、user-facing errors を理解しているか確認する。',
        },
      }),
      ['react', 'typescript'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Tracking down a broken click handler',
          displayQuestion:
            'A button looks enabled but clicking it does nothing. How would you inspect the component, event handler, and browser console to find the cause?',
          displayIntent:
            'Evaluate basic UI debugging workflow and evidence gathering.',
        },
        vi: {
          title: 'Tìm lỗi click handler không chạy',
          displayQuestion:
            'Một button nhìn có vẻ enabled nhưng bấm không có gì xảy ra. Bạn sẽ kiểm tra component, event handler và browser console như thế nào để tìm nguyên nhân?',
          displayIntent:
            'Đánh giá workflow debug UI cơ bản và cách thu thập bằng chứng.',
        },
        ja: {
          title: '壊れた click handler の切り分け',
          displayQuestion:
            'button は enabled に見えるのにクリックしても何も起きません。component、event handler、browser console をどう確認して原因を探しますか。',
          displayIntent:
            '基本的な UI debugging workflow と evidence gathering を評価する。',
        },
      }),
      ['react', 'typescript'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Using design feedback to improve a screen',
          displayQuestion:
            'Tell me about a time design or product feedback changed the UI you built.',
          displayIntent:
            'Assess learning agility and collaboration with design or product feedback.',
        },
        vi: {
          title: 'Dùng feedback thiết kế để cải thiện màn hình',
          displayQuestion:
            'Hãy kể về một lần feedback từ design hoặc product làm thay đổi UI bạn đã xây.',
          displayIntent:
            'Đánh giá learning agility và khả năng phối hợp với design/product feedback.',
        },
        ja: {
          title: 'design feedback による画面改善',
          displayQuestion:
            'design または product feedback によって、あなたが作った UI が変わった経験を話してください。',
          displayIntent:
            'design/product feedback との collaboration と learning agility を評価する。',
        },
      }),
      ['react', 'accessibility'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Unclear acceptance criteria for a UI task',
          displayQuestion:
            'You receive a UI task with missing empty, loading, and error states. What do you clarify before implementation?',
          displayIntent:
            'Assess whether the candidate spots missing UI states and communicates before building.',
        },
        vi: {
          title: 'Acceptance criteria UI chưa rõ',
          displayQuestion:
            'Bạn nhận một UI task nhưng thiếu empty, loading và error states. Bạn sẽ làm rõ gì trước khi implement?',
          displayIntent:
            'Đánh giá ứng viên có nhận ra các UI state còn thiếu và giao tiếp trước khi build hay không.',
        },
        ja: {
          title: 'UI task の acceptance criteria が不明確',
          displayQuestion:
            'empty、loading、error states が抜けている UI task を受け取りました。実装前に何を確認しますか。',
          displayIntent:
            '不足している UI states に気づき、実装前に伝えられるかを評価する。',
        },
      }),
      ['react', 'typescript'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Preventing unnecessary React re-renders',
          displayQuestion:
            'Explain a case where a React screen re-rendered more than expected. How did you find the cause and what change fixed it?',
          displayIntent:
            'Assess technical depth in React rendering, state ownership, memoization, and measurement.',
        },
        vi: {
          title: 'Giảm re-render không cần thiết trong React',
          displayQuestion:
            'Hãy giải thích một case màn hình React re-render nhiều hơn mong đợi. Bạn tìm nguyên nhân và sửa bằng thay đổi nào?',
          displayIntent:
            'Đánh giá độ sâu kỹ thuật về React rendering, ownership của state, memoization và đo lường.',
        },
        ja: {
          title: 'React の不要な re-render を防ぐ',
          displayQuestion:
            'React screen が想定より多く re-render したケースを説明してください。原因をどう見つけ、何を変更して直しましたか。',
          displayIntent:
            'React rendering、state ownership、memoization、measurement の技術的深さを評価する。',
        },
      }),
      ['react', 'typescript', 'browser_performance'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Redux versus local state for a complex workflow',
          displayQuestion:
            'When would you keep state local in a React component, and when would you move it into Redux for a multi-step workflow?',
          displayIntent:
            'Evaluate state management trade-offs around ownership, persistence, testability, and complexity.',
        },
        vi: {
          title: 'Redux hay local state cho workflow phức tạp',
          displayQuestion:
            'Khi nào bạn giữ state local trong React component, và khi nào đưa nó vào Redux cho một workflow nhiều bước?',
          displayIntent:
            'Đánh giá trade-off state management về ownership, persistence, testability và complexity.',
        },
        ja: {
          title: '複雑な workflow における Redux と local state',
          displayQuestion:
            'React component 内に state を local に保つのはいつで、multi-step workflow のために Redux へ移すのはいつですか。',
          displayIntent:
            'ownership、persistence、testability、complexity に関する state management trade-off を評価する。',
        },
      }),
      ['react', 'redux', 'typescript'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating a slow search results page',
          displayQuestion:
            'A search results page became slow after a release. What browser and application signals would you inspect before changing code?',
          displayIntent:
            'Assess frontend performance debugging using profiling, network waterfalls, bundle size, and rendering evidence.',
        },
        vi: {
          title: 'Điều tra trang search results bị chậm',
          displayQuestion:
            'Trang search results trở nên chậm sau một release. Bạn sẽ kiểm tra signal nào từ browser và application trước khi sửa code?',
          displayIntent:
            'Đánh giá debug performance frontend bằng profiling, network waterfall, bundle size và bằng chứng rendering.',
        },
        ja: {
          title: '遅い search results page の調査',
          displayQuestion:
            'release 後に search results page が遅くなりました。コードを変更する前に browser と application のどんな signal を確認しますか。',
          displayIntent:
            'profiling、network waterfall、bundle size、rendering evidence による frontend performance debugging を評価する。',
        },
      }),
      ['browser_performance', 'vite', 'react'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying an accessibility improvement claim',
          displayQuestion:
            'Your CV says you improved accessibility. Which issue did you fix, how did you test it, and what changed for users?',
          displayIntent:
            'Verify whether an accessibility claim is concrete, tested, and tied to user impact.',
        },
        vi: {
          title: 'Xác minh claim cải thiện accessibility',
          displayQuestion:
            'CV của bạn nói bạn cải thiện accessibility. Bạn đã sửa vấn đề nào, test ra sao và điều gì thay đổi với user?',
          displayIntent:
            'Xác minh claim accessibility có cụ thể, được test và gắn với tác động user hay không.',
        },
        ja: {
          title: 'accessibility 改善 claim の検証',
          displayQuestion:
            'CV に accessibility を改善したとあります。どの問題を直し、どうテストし、user に何が変わりましたか。',
          displayIntent:
            'accessibility claim が具体的で、test され、user impact と結びついているかを検証する。',
        },
      }),
      ['accessibility', 'react', 'playwright'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Client-side rendering versus server-side rendering',
          displayQuestion:
            'Describe a decision where you chose client-side rendering, server-side rendering, or static rendering. What constraints drove the choice?',
          displayIntent:
            'Assess senior trade-off reasoning across SEO, performance, complexity, caching, and team capability.',
        },
        vi: {
          title: 'Client-side rendering hay server-side rendering',
          displayQuestion:
            'Hãy mô tả một quyết định bạn chọn client-side rendering, server-side rendering hoặc static rendering. Ràng buộc nào dẫn tới lựa chọn đó?',
          displayIntent:
            'Đánh giá trade-off senior về SEO, performance, complexity, caching và năng lực team.',
        },
        ja: {
          title: 'client-side rendering と server-side rendering',
          displayQuestion:
            'client-side rendering、server-side rendering、static rendering のいずれかを選んだ判断を説明してください。どんな制約が選択を決めましたか。',
          displayIntent:
            'SEO、performance、complexity、caching、team capability に関する senior trade-off を評価する。',
        },
      }),
      ['react', 'nextjs', 'browser_performance'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Root-causing a flaky end-to-end test',
          displayQuestion:
            'Tell me about a flaky Playwright or Cypress test that pointed to a real product or timing issue. How did you separate test flake from product bug?',
          displayIntent:
            'Evaluate senior debugging across test reliability, async UI behavior, and release confidence.',
        },
        vi: {
          title: 'Tìm root cause của E2E test flaky',
          displayQuestion:
            'Hãy kể về một Playwright hoặc Cypress test flaky nhưng chỉ ra vấn đề thật về product hoặc timing. Bạn tách test flake khỏi product bug như thế nào?',
          displayIntent:
            'Đánh giá debugging senior về test reliability, async UI behavior và release confidence.',
        },
        ja: {
          title: 'flaky E2E test の root cause',
          displayQuestion:
            'Playwright または Cypress の flaky test が実際の product/timing issue を示していた経験を話してください。test flake と product bug をどう切り分けましたか。',
          displayIntent:
            'test reliability、async UI behavior、release confidence にまたがる senior debugging を評価する。',
        },
      }),
      ['playwright', 'cypress', 'react'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a frontend architecture migration',
          displayQuestion:
            'You mention leading a frontend migration. What decisions were yours, how did you manage rollout risk, and how did you measure success?',
          displayIntent:
            'Verify senior frontend leadership claims using decision ownership, rollout evidence, and measured impact.',
        },
        vi: {
          title: 'Xác minh ownership trong migration frontend',
          displayQuestion:
            'Bạn nói mình dẫn dắt một frontend migration. Những quyết định nào là của bạn, bạn quản lý rủi ro rollout ra sao và đo success thế nào?',
          displayIntent:
            'Xác minh claim leadership frontend bằng decision ownership, rollout evidence và impact đo được.',
        },
        ja: {
          title: 'frontend architecture migration の ownership 検証',
          displayQuestion:
            'frontend migration をリードしたとあります。どの判断があなたのもので、rollout risk をどう管理し、success をどう測定しましたか。',
          displayIntent:
            'decision ownership、rollout evidence、measured impact によって senior frontend leadership claim を検証する。',
        },
      }),
      ['react', 'typescript', 'vite', 'github_actions'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Handling disagreement over UX and engineering cost',
          displayQuestion:
            'Tell me about a disagreement between UX quality and engineering cost. How did you align design, product, and engineering?',
          displayIntent:
            'Assess senior collaboration and conflict handling across product boundaries.',
        },
        vi: {
          title: 'Xử lý bất đồng giữa UX và chi phí kỹ thuật',
          displayQuestion:
            'Hãy kể về một bất đồng giữa chất lượng UX và chi phí engineering. Bạn đã align design, product và engineering như thế nào?',
          displayIntent:
            'Đánh giá collaboration và conflict handling senior qua ranh giới product.',
        },
        ja: {
          title: 'UX と engineering cost の意見対立',
          displayQuestion:
            'UX quality と engineering cost の間で意見が分かれた経験を話してください。design、product、engineering をどう align しましたか。',
          displayIntent:
            'product boundary をまたぐ senior collaboration と conflict handling を評価する。',
        },
      }),
      ['react', 'accessibility'],
    ),
  ],
  fullstack: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Connecting a React form to a REST endpoint',
          displayQuestion:
            'Walk through how you would submit a React form to a REST endpoint and handle validation errors from the server.',
          displayIntent:
            'Check end-to-end understanding of client-server contracts, validation, and user feedback.',
        },
        vi: {
          title: 'Kết nối React form với REST endpoint',
          displayQuestion:
            'Hãy trình bày cách bạn submit một React form tới REST endpoint và xử lý validation error từ server.',
          displayIntent:
            'Kiểm tra hiểu biết end-to-end về client-server contract, validation và feedback cho user.',
        },
        ja: {
          title: 'React form と REST endpoint の接続',
          displayQuestion:
            'React form を REST endpoint に submit し、server からの validation error を扱う流れを説明してください。',
          displayIntent:
            'client-server contract、validation、user feedback の end-to-end 理解を確認する。',
        },
      }),
      ['react', 'typescript', 'rest', 'nodejs'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Fixing a mismatch between UI and API response shape',
          displayQuestion:
            'The UI expects one response shape but the API returns another. How would you confirm the mismatch and fix it without hiding the error?',
          displayIntent:
            'Evaluate basic fullstack debugging across API contracts and UI state.',
        },
        vi: {
          title: 'Sửa mismatch giữa UI và API response',
          displayQuestion:
            'UI mong đợi một response shape nhưng API trả về shape khác. Bạn xác nhận mismatch và sửa mà không che lỗi như thế nào?',
          displayIntent:
            'Đánh giá debug fullstack cơ bản qua API contract và UI state.',
        },
        ja: {
          title: 'UI と API response shape の不一致修正',
          displayQuestion:
            'UI が期待する response shape と API が返す shape が違います。エラーを隠さずに不一致を確認し、どう修正しますか。',
          displayIntent:
            'API contract と UI state をまたぐ基本的な fullstack debugging を評価する。',
        },
      }),
      ['react', 'rest', 'typescript'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from a handoff mistake',
          displayQuestion:
            'Tell me about a time a frontend-backend handoff went wrong and what you changed afterward.',
          displayIntent:
            'Assess ownership and learning from cross-layer coordination mistakes.',
        },
        vi: {
          title: 'Học từ lỗi handoff frontend-backend',
          displayQuestion:
            'Hãy kể về một lần handoff giữa frontend và backend bị lỗi và bạn đã thay đổi điều gì sau đó.',
          displayIntent:
            'Đánh giá ownership và khả năng học từ lỗi phối hợp cross-layer.',
        },
        ja: {
          title: 'frontend-backend handoff の失敗からの学び',
          displayQuestion:
            'frontend-backend handoff がうまくいかなかった経験と、その後に何を変えたかを話してください。',
          displayIntent:
            'cross-layer coordination の失敗からの ownership と learning を評価する。',
        },
      }),
      ['react', 'rest'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Clarifying a fullstack feature before coding',
          displayQuestion:
            'Before building a small feature across UI and API, what contract, state, and error cases do you clarify?',
          displayIntent:
            'Assess practical planning for end-to-end feature work.',
        },
        vi: {
          title: 'Làm rõ feature fullstack trước khi code',
          displayQuestion:
            'Trước khi xây một feature nhỏ qua UI và API, bạn làm rõ contract, state và error case nào?',
          displayIntent:
            'Đánh giá khả năng planning thực tế cho công việc end-to-end.',
        },
        ja: {
          title: '実装前に fullstack feature を明確化する',
          displayQuestion:
            'UI と API にまたがる小さな feature を作る前に、どんな contract、state、error case を確認しますか。',
          displayIntent:
            'end-to-end feature work の実践的な planning を評価する。',
        },
      }),
      ['react', 'nodejs', 'rest'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Designing optimistic UI with server reconciliation',
          displayQuestion:
            'Explain how you would implement optimistic UI for an update that can later fail on the server.',
          displayIntent:
            'Assess technical depth across frontend state, backend validation, reconciliation, and user trust.',
        },
        vi: {
          title: 'Thiết kế optimistic UI có reconcile với server',
          displayQuestion:
            'Hãy giải thích cách bạn implement optimistic UI cho một update có thể thất bại ở server sau đó.',
          displayIntent:
            'Đánh giá độ sâu kỹ thuật về frontend state, backend validation, reconciliation và niềm tin của user.',
        },
        ja: {
          title: 'server reconciliation を伴う optimistic UI',
          displayQuestion:
            '後で server 側で失敗する可能性がある update に対して optimistic UI をどう実装しますか。',
          displayIntent:
            'frontend state、backend validation、reconciliation、user trust にまたがる技術的深さを評価する。',
        },
      }),
      ['react', 'redux', 'rest', 'postgresql'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Filtering on the client versus querying on the server',
          displayQuestion:
            'For a data-heavy admin table, when would you filter and sort on the client, and when would you push that work to the backend?',
          displayIntent:
            'Evaluate fullstack trade-offs around latency, data size, consistency, pagination, and API complexity.',
        },
        vi: {
          title: 'Filter ở client hay query ở server',
          displayQuestion:
            'Với một admin table nhiều dữ liệu, khi nào bạn filter/sort ở client và khi nào đẩy việc đó xuống backend?',
          displayIntent:
            'Đánh giá trade-off fullstack về latency, data size, consistency, pagination và API complexity.',
        },
        ja: {
          title: 'client filtering と server query の判断',
          displayQuestion:
            'data-heavy な admin table で、client 側で filter/sort するのはいつで、backend に任せるのはいつですか。',
          displayIntent:
            'latency、data size、consistency、pagination、API complexity に関する fullstack trade-off を評価する。',
        },
      }),
      ['react', 'postgresql', 'indexing', 'rest'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating duplicate submissions from a UI flow',
          displayQuestion:
            'Users report duplicate records after clicking submit once. How would you investigate the UI, API, and database layers?',
          displayIntent:
            'Assess debugging of idempotency and double-submit problems across the stack.',
        },
        vi: {
          title: 'Điều tra duplicate submit từ UI flow',
          displayQuestion:
            'User báo có record bị tạo trùng dù chỉ bấm submit một lần. Bạn điều tra UI, API và database layer như thế nào?',
          displayIntent:
            'Đánh giá debug vấn đề idempotency và double-submit trên toàn stack.',
        },
        ja: {
          title: 'UI flow からの duplicate submission 調査',
          displayQuestion:
            'user が submit を一度押しただけなのに duplicate records が作られたと報告しています。UI、API、database layer をどう調査しますか。',
          displayIntent:
            'stack 全体の idempotency と double-submit 問題の debugging を評価する。',
        },
      }),
      ['react', 'rest', 'idempotency', 'postgresql'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying an end-to-end feature delivery claim',
          displayQuestion:
            'Your CV says you delivered a fullstack feature end to end. What did you own in the UI, API, data model, and rollout?',
          displayIntent:
            'Verify personal contribution and measurable impact across fullstack ownership.',
        },
        vi: {
          title: 'Xác minh claim delivery fullstack end-to-end',
          displayQuestion:
            'CV của bạn nói bạn deliver một fullstack feature end-to-end. Bạn sở hữu phần nào ở UI, API, data model và rollout?',
          displayIntent:
            'Xác minh đóng góp cá nhân và impact đo được trong ownership fullstack.',
        },
        ja: {
          title: 'end-to-end feature delivery claim の検証',
          displayQuestion:
            'CV に fullstack feature を end-to-end で delivered したとあります。UI、API、data model、rollout のどこを担当しましたか。',
          displayIntent:
            'fullstack ownership における個人貢献と measurable impact を検証する。',
        },
      }),
      ['react', 'nodejs', 'postgresql', 'github_actions'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Choosing where business rules should live',
          displayQuestion:
            'Describe a decision about whether business rules belonged in the frontend, backend, or shared logic. What made the boundary correct?',
          displayIntent:
            'Assess senior boundary judgment across maintainability, correctness, UX, and reuse.',
        },
        vi: {
          title: 'Chọn nơi đặt business rule',
          displayQuestion:
            'Hãy mô tả một quyết định về việc business rule nên nằm ở frontend, backend hay shared logic. Điều gì làm boundary đó đúng?',
          displayIntent:
            'Đánh giá judgment senior về boundary qua maintainability, correctness, UX và reuse.',
        },
        ja: {
          title: 'business rule を置く場所の判断',
          displayQuestion:
            'business rule を frontend、backend、shared logic のどこに置くべきか判断した経験を説明してください。その boundary が正しい理由は何でしたか。',
          displayIntent:
            'maintainability、correctness、UX、reuse に基づく senior boundary judgment を評価する。',
        },
      }),
      ['react', 'nodejs', 'typescript'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Root-causing inconsistent state across web and API',
          displayQuestion:
            'Tell me about a bug where the web UI and backend state disagreed. How did you identify the source of truth and prevent recurrence?',
          displayIntent:
            'Evaluate cross-layer debugging and source-of-truth reasoning.',
        },
        vi: {
          title: 'Tìm root cause state lệch giữa web và API',
          displayQuestion:
            'Hãy kể về một bug khi UI web và backend state không khớp. Bạn xác định source of truth và ngăn tái diễn như thế nào?',
          displayIntent:
            'Đánh giá debugging cross-layer và reasoning về source of truth.',
        },
        ja: {
          title: 'web と API の state 不整合の root cause',
          displayQuestion:
            'web UI と backend state が一致しない bug について話してください。source of truth をどう特定し、再発を防ぎましたか。',
          displayIntent:
            'cross-layer debugging と source-of-truth reasoning を評価する。',
        },
      }),
      ['react', 'postgresql', 'rest', 'opentelemetry'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a product workflow redesign',
          displayQuestion:
            'You mention leading a workflow redesign. What technical and product decisions were yours, and what evidence showed the workflow improved?',
          displayIntent:
            'Verify senior fullstack leadership with measured product and technical outcomes.',
        },
        vi: {
          title: 'Xác minh ownership trong redesign workflow',
          displayQuestion:
            'Bạn nói mình dẫn dắt redesign một workflow. Quyết định kỹ thuật và product nào là của bạn, và bằng chứng nào cho thấy workflow tốt hơn?',
          displayIntent:
            'Xác minh leadership fullstack senior bằng outcome đo được về product và kỹ thuật.',
        },
        ja: {
          title: 'product workflow redesign の ownership 検証',
          displayQuestion:
            'workflow redesign をリードしたとあります。どの technical/product decision があなたのもので、workflow が改善した証拠は何ですか。',
          displayIntent:
            'measured product and technical outcomes により senior fullstack leadership を検証する。',
        },
      }),
      ['react', 'nodejs', 'postgresql', 'browser_performance'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Aligning product scope with technical risk',
          displayQuestion:
            'Tell me about a time you pushed back on product scope because of technical risk. How did you keep the conversation constructive?',
          displayIntent:
            'Assess senior communication, conflict handling, and delivery judgment.',
        },
        vi: {
          title: 'Align scope product với rủi ro kỹ thuật',
          displayQuestion:
            'Hãy kể về một lần bạn push back product scope vì rủi ro kỹ thuật. Bạn giữ cuộc trao đổi constructive như thế nào?',
          displayIntent:
            'Đánh giá communication senior, conflict handling và delivery judgment.',
        },
        ja: {
          title: 'product scope と technical risk の調整',
          displayQuestion:
            'technical risk を理由に product scope に push back した経験を話してください。会話を constructive に保つために何をしましたか。',
          displayIntent:
            'senior communication、conflict handling、delivery judgment を評価する。',
        },
      }),
      ['react', 'nodejs'],
    ),
  ],
  devops: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Reading a failing CI pipeline',
          displayQuestion:
            'A GitHub Actions pipeline fails after a dependency update. How would you read the logs and decide what changed?',
          displayIntent:
            'Check basic CI troubleshooting and evidence-based diagnosis.',
        },
        vi: {
          title: 'Đọc CI pipeline bị fail',
          displayQuestion:
            'Một pipeline GitHub Actions fail sau khi update dependency. Bạn đọc log và xác định thay đổi nào gây lỗi như thế nào?',
          displayIntent:
            'Kiểm tra khả năng troubleshoot CI cơ bản và chẩn đoán dựa trên bằng chứng.',
        },
        ja: {
          title: '失敗した CI pipeline を読む',
          displayQuestion:
            'dependency update 後に GitHub Actions pipeline が失敗しました。logs をどう読み、何が変わったかをどう判断しますか。',
          displayIntent:
            '基本的な CI troubleshooting と evidence-based diagnosis を確認する。',
        },
      }),
      ['github_actions', 'docker'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Debugging a container that exits immediately',
          displayQuestion:
            'A Docker container exits right after startup. What would you inspect in the image, command, logs, and environment variables?',
          displayIntent: 'Evaluate practical container debugging workflow.',
        },
        vi: {
          title: 'Debug container thoát ngay sau khi start',
          displayQuestion:
            'Một Docker container thoát ngay sau khi startup. Bạn kiểm tra image, command, log và biến môi trường như thế nào?',
          displayIntent: 'Đánh giá workflow debug container thực tế.',
        },
        ja: {
          title: 'すぐ終了する container のデバッグ',
          displayQuestion:
            'Docker container が起動直後に終了します。image、command、logs、environment variables の何を確認しますか。',
          displayIntent: '実践的な container debugging workflow を評価する。',
        },
      }),
      ['docker', 'logging'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from an operations handoff',
          displayQuestion:
            'Tell me about feedback you received from an operations or deployment handoff and what you changed.',
          displayIntent:
            'Assess learning agility and ownership in operational work.',
        },
        vi: {
          title: 'Học từ handoff vận hành',
          displayQuestion:
            'Hãy kể về feedback bạn nhận được từ một handoff vận hành hoặc deployment và bạn đã thay đổi gì.',
          displayIntent:
            'Đánh giá learning agility và ownership trong công việc vận hành.',
        },
        ja: {
          title: 'operations handoff からの学び',
          displayQuestion:
            'operations または deployment handoff で受けた feedback と、その後に変えたことを話してください。',
          displayIntent:
            'operational work における learning agility と ownership を評価する。',
        },
      }),
      ['github_actions', 'docker'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Escalating a deployment blocker',
          displayQuestion:
            'A deployment is blocked and you are not sure whether the issue is application config or infrastructure. What do you check before escalating?',
          displayIntent:
            'Assess structured escalation and basic environment debugging.',
        },
        vi: {
          title: 'Escalate khi deployment bị chặn',
          displayQuestion:
            'Một deployment bị chặn và bạn chưa rõ lỗi do app config hay infrastructure. Bạn kiểm tra gì trước khi escalate?',
          displayIntent:
            'Đánh giá escalation có cấu trúc và debug môi trường cơ bản.',
        },
        ja: {
          title: 'deployment blocker の escalation',
          displayQuestion:
            'deployment が止まり、application config と infrastructure のどちらが原因かわかりません。escalate する前に何を確認しますか。',
          displayIntent:
            'structured escalation と basic environment debugging を評価する。',
        },
      }),
      ['docker', 'github_actions'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Kubernetes readiness and liveness probes',
          displayQuestion:
            'Explain how readiness and liveness probes should behave for an API that depends on a database and a queue.',
          displayIntent:
            'Assess Kubernetes health-check depth and failure-mode reasoning.',
        },
        vi: {
          title: 'Readiness và liveness probe trong Kubernetes',
          displayQuestion:
            'Hãy giải thích readiness và liveness probe nên hoạt động thế nào cho một API phụ thuộc database và queue.',
          displayIntent:
            'Đánh giá độ sâu về health-check Kubernetes và reasoning về failure mode.',
        },
        ja: {
          title: 'Kubernetes readiness/liveness probes',
          displayQuestion:
            'database と queue に依存する API で readiness probe と liveness probe はどう振る舞うべきか説明してください。',
          displayIntent:
            'Kubernetes health-check の深さと failure-mode reasoning を評価する。',
        },
      }),
      ['kubernetes', 'docker', 'logging'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Blue-green versus rolling deployments',
          displayQuestion:
            'When would you choose blue-green deployment over rolling deployment, and what cost or operational trade-off would you accept?',
          displayIntent:
            'Evaluate deployment strategy trade-offs around rollback, capacity, risk, and user impact.',
        },
        vi: {
          title: 'Blue-green hay rolling deployment',
          displayQuestion:
            'Khi nào bạn chọn blue-green deployment thay vì rolling deployment, và bạn chấp nhận trade-off nào về chi phí hoặc vận hành?',
          displayIntent:
            'Đánh giá trade-off deployment strategy về rollback, capacity, risk và user impact.',
        },
        ja: {
          title: 'blue-green と rolling deployment',
          displayQuestion:
            'rolling deployment ではなく blue-green deployment を選ぶのはいつですか。どんな cost/operational trade-off を受け入れますか。',
          displayIntent:
            'rollback、capacity、risk、user impact に関する deployment strategy trade-off を評価する。',
        },
      }),
      ['kubernetes', 'rollback', 'github_actions'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating a Kubernetes crash loop',
          displayQuestion:
            'A pod enters CrashLoopBackOff after a config change. What signals would you inspect before changing the deployment?',
          displayIntent:
            'Assess Kubernetes debugging using events, logs, config, probes, and recent changes.',
        },
        vi: {
          title: 'Điều tra CrashLoopBackOff trong Kubernetes',
          displayQuestion:
            'Một pod vào CrashLoopBackOff sau thay đổi config. Bạn kiểm tra signal nào trước khi sửa deployment?',
          displayIntent:
            'Đánh giá debug Kubernetes bằng event, log, config, probe và thay đổi gần nhất.',
        },
        ja: {
          title: 'Kubernetes crash loop の調査',
          displayQuestion:
            'config change 後に pod が CrashLoopBackOff になりました。deployment を変更する前にどんな signal を確認しますか。',
          displayIntent:
            'events、logs、config、probes、recent changes を使った Kubernetes debugging を評価する。',
        },
      }),
      ['kubernetes', 'logging', 'prometheus'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying a deployment reliability claim',
          displayQuestion:
            'Your CV says you improved deployment reliability. What failed before, what changed, and how did you measure reliability after?',
          displayIntent:
            'Verify deployment reliability claims with baseline, contribution, and measured outcome.',
        },
        vi: {
          title: 'Xác minh claim cải thiện reliability deployment',
          displayQuestion:
            'CV của bạn nói bạn cải thiện deployment reliability. Trước đó lỗi gì, bạn thay đổi gì và đo reliability sau đó như thế nào?',
          displayIntent:
            'Xác minh claim deployment reliability bằng baseline, đóng góp và outcome đo được.',
        },
        ja: {
          title: 'deployment reliability claim の検証',
          displayQuestion:
            'CV に deployment reliability を改善したとあります。以前は何が失敗し、何を変え、その後 reliability をどう測定しましたか。',
          displayIntent:
            'baseline、contribution、measured outcome によって deployment reliability claim を検証する。',
        },
      }),
      ['github_actions', 'rollback', 'prometheus'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Build versus buy for observability tooling',
          displayQuestion:
            'Describe a time you chose between managed observability tooling and self-hosted monitoring. What trade-offs mattered?',
          displayIntent:
            'Assess senior cost, reliability, operability, and team-capability trade-offs.',
        },
        vi: {
          title: 'Build hay buy observability tooling',
          displayQuestion:
            'Hãy mô tả một lần bạn chọn giữa managed observability tooling và self-hosted monitoring. Những trade-off nào quan trọng?',
          displayIntent:
            'Đánh giá trade-off senior về cost, reliability, operability và năng lực team.',
        },
        ja: {
          title: 'observability tooling の build vs buy',
          displayQuestion:
            'managed observability tooling と self-hosted monitoring のどちらかを選んだ経験を説明してください。重要だった trade-off は何ですか。',
          displayIntent:
            'cost、reliability、operability、team capability に関する senior trade-off を評価する。',
        },
      }),
      ['prometheus', 'grafana', 'opentelemetry'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Leading a multi-service incident response',
          displayQuestion:
            'Tell me about an incident involving multiple services. How did you coordinate diagnosis, mitigation, communication, and follow-up?',
          displayIntent:
            'Evaluate senior incident leadership and cross-team system thinking.',
        },
        vi: {
          title: 'Dẫn dắt incident response nhiều service',
          displayQuestion:
            'Hãy kể về một incident liên quan nhiều service. Bạn điều phối chẩn đoán, mitigation, communication và follow-up như thế nào?',
          displayIntent:
            'Đánh giá incident leadership senior và system thinking cross-team.',
        },
        ja: {
          title: 'multi-service incident response のリード',
          displayQuestion:
            '複数 service に関わる incident について話してください。diagnosis、mitigation、communication、follow-up をどう調整しましたか。',
          displayIntent:
            'senior incident leadership と cross-team system thinking を評価する。',
        },
      }),
      ['kubernetes', 'prometheus', 'alerting', 'rollback'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of an infrastructure migration',
          displayQuestion:
            'You mention leading an infrastructure migration. What decisions were yours, what risks did you mitigate, and what evidence showed the migration was successful?',
          displayIntent:
            'Verify senior infrastructure ownership with decision trace and measurable reliability evidence.',
        },
        vi: {
          title: 'Xác minh ownership trong migration hạ tầng',
          displayQuestion:
            'Bạn nói mình dẫn dắt một infrastructure migration. Quyết định nào là của bạn, bạn mitigate rủi ro nào và bằng chứng nào cho thấy migration thành công?',
          displayIntent:
            'Xác minh ownership hạ tầng senior bằng decision trace và bằng chứng reliability đo được.',
        },
        ja: {
          title: 'infrastructure migration の ownership 検証',
          displayQuestion:
            'infrastructure migration をリードしたとあります。どの判断があなたのもので、どんなリスクを mitigated し、成功の証拠は何でしたか。',
          displayIntent:
            'decision trace と measurable reliability evidence により senior infrastructure ownership を検証する。',
        },
      }),
      ['terraform', 'kubernetes', 'prometheus'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Handling disagreement about release risk',
          displayQuestion:
            'Tell me about a disagreement over whether to release or roll back. How did you align engineering and business stakeholders?',
          displayIntent:
            'Assess senior conflict handling under operational risk.',
        },
        vi: {
          title: 'Xử lý bất đồng về rủi ro release',
          displayQuestion:
            'Hãy kể về một bất đồng nên release hay rollback. Bạn align engineering và business stakeholder như thế nào?',
          displayIntent:
            'Đánh giá conflict handling senior trong bối cảnh rủi ro vận hành.',
        },
        ja: {
          title: 'release risk をめぐる意見対立',
          displayQuestion:
            'release するか rollback するかで意見が分かれた経験を話してください。engineering と business stakeholders をどう align しましたか。',
          displayIntent:
            'operational risk 下での senior conflict handling を評価する。',
        },
      }),
      ['rollback', 'alerting'],
    ),
  ],
  data: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Checking freshness in an Airflow DAG',
          displayQuestion:
            'How would you check whether an Airflow DAG produced fresh data for a downstream dashboard?',
          displayIntent:
            'Check basic data pipeline understanding around scheduling, freshness, and downstream impact.',
        },
        vi: {
          title: 'Kiểm tra freshness trong Airflow DAG',
          displayQuestion:
            'Bạn kiểm tra một Airflow DAG đã tạo dữ liệu fresh cho dashboard downstream hay chưa như thế nào?',
          displayIntent:
            'Kiểm tra hiểu biết cơ bản về data pipeline, scheduling, freshness và tác động downstream.',
        },
        ja: {
          title: 'Airflow DAG の freshness 確認',
          displayQuestion:
            'Airflow DAG が downstream dashboard 向けに fresh data を生成したかどうか、どう確認しますか。',
          displayIntent:
            'scheduling、freshness、downstream impact に関する基本的な data pipeline 理解を確認する。',
        },
      }),
      ['airflow', 'bigquery'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Debugging a failed dbt model run',
          displayQuestion:
            'A dbt model fails after a schema change. How would you find the failing dependency and confirm the fix?',
          displayIntent:
            'Evaluate practical debugging of data transformation failures.',
        },
        vi: {
          title: 'Debug dbt model run bị fail',
          displayQuestion:
            'Một dbt model fail sau schema change. Bạn tìm dependency bị lỗi và xác nhận fix như thế nào?',
          displayIntent:
            'Đánh giá debugging thực tế cho lỗi data transformation.',
        },
        ja: {
          title: '失敗した dbt model run のデバッグ',
          displayQuestion:
            'schema change 後に dbt model が失敗します。失敗した dependency をどう見つけ、fix をどう確認しますか。',
          displayIntent:
            'data transformation failure の実践的な debugging を評価する。',
        },
      }),
      ['dbt', 'snowflake'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from a data quality review',
          displayQuestion:
            'Tell me about feedback you received on a data quality issue and what changed in your workflow afterward.',
          displayIntent:
            'Assess learning agility and ownership around data correctness.',
        },
        vi: {
          title: 'Học từ review data quality',
          displayQuestion:
            'Hãy kể về feedback bạn nhận được về một vấn đề data quality và workflow của bạn thay đổi gì sau đó.',
          displayIntent:
            'Đánh giá learning agility và ownership quanh tính đúng đắn của dữ liệu.',
        },
        ja: {
          title: 'data quality review からの学び',
          displayQuestion:
            'data quality issue に関して受けた feedback と、その後 workflow がどう変わったかを話してください。',
          displayIntent:
            'data correctness に関する learning agility と ownership を評価する。',
        },
      }),
      ['dbt', 'data_quality'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Clarifying an ambiguous metric request',
          displayQuestion:
            'A stakeholder asks for active users but does not define active. What questions do you ask before building the metric?',
          displayIntent:
            'Assess communication and metric-definition discipline.',
        },
        vi: {
          title: 'Làm rõ request metric mơ hồ',
          displayQuestion:
            'Stakeholder yêu cầu metric active users nhưng không định nghĩa active. Bạn hỏi gì trước khi xây metric?',
          displayIntent: 'Đánh giá communication và kỷ luật định nghĩa metric.',
        },
        ja: {
          title: '曖昧な metric request の明確化',
          displayQuestion:
            'stakeholder が active users を求めていますが active の定義がありません。metric を作る前に何を質問しますか。',
          displayIntent:
            'communication と metric-definition discipline を評価する。',
        },
      }),
      ['bigquery', 'dbt'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Partitioning a large event table',
          displayQuestion:
            'Explain how you would partition and cluster a large event table used by daily analytics queries.',
          displayIntent:
            'Assess technical depth in analytical storage, query cost, and access patterns.',
        },
        vi: {
          title: 'Partition bảng event lớn',
          displayQuestion:
            'Hãy giải thích cách bạn partition và cluster một bảng event lớn dùng cho các truy vấn analytics hằng ngày.',
          displayIntent:
            'Đánh giá độ sâu kỹ thuật về analytical storage, query cost và access pattern.',
        },
        ja: {
          title: '大きな event table の partitioning',
          displayQuestion:
            'daily analytics queries に使われる大きな event table をどう partition/cluster するか説明してください。',
          displayIntent:
            'analytical storage、query cost、access patterns の技術的深さを評価する。',
        },
      }),
      ['bigquery', 'partitioning', 'spark'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Batch versus streaming for near-real-time metrics',
          displayQuestion:
            'When would you keep a metric pipeline batch-based, and when would you move it to streaming?',
          displayIntent:
            'Evaluate trade-offs around freshness, complexity, correctness, cost, and operational burden.',
        },
        vi: {
          title: 'Batch hay streaming cho metric gần realtime',
          displayQuestion:
            'Khi nào bạn giữ metric pipeline dạng batch, và khi nào chuyển sang streaming?',
          displayIntent:
            'Đánh giá trade-off về freshness, complexity, correctness, cost và gánh nặng vận hành.',
        },
        ja: {
          title: 'near-real-time metrics の batch vs streaming',
          displayQuestion:
            'metric pipeline を batch-based のままにするのはいつで、streaming に移すのはいつですか。',
          displayIntent:
            'freshness、complexity、correctness、cost、operational burden の trade-off を評価する。',
        },
      }),
      ['kafka', 'spark', 'airflow'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating a sudden dashboard metric drop',
          displayQuestion:
            'A dashboard metric drops 30 percent overnight. How would you determine whether it is a real business change or a pipeline issue?',
          displayIntent:
            'Assess data debugging with lineage, freshness, source changes, and validation checks.',
        },
        vi: {
          title: 'Điều tra metric dashboard giảm đột ngột',
          displayQuestion:
            'Một metric dashboard giảm 30 phần trăm qua đêm. Bạn xác định đó là thay đổi business thật hay lỗi pipeline như thế nào?',
          displayIntent:
            'Đánh giá data debugging bằng lineage, freshness, thay đổi source và validation check.',
        },
        ja: {
          title: 'dashboard metric の急落調査',
          displayQuestion:
            'dashboard metric が一晩で 30% 低下しました。real business change か pipeline issue かをどう判断しますか。',
          displayIntent:
            'lineage、freshness、source changes、validation checks を使った data debugging を評価する。',
        },
      }),
      ['dbt', 'bigquery', 'data_quality'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying a data quality improvement claim',
          displayQuestion:
            'Your CV says you improved data quality. What issue did you find, what rule or process changed, and how did you measure improvement?',
          displayIntent:
            'Verify data quality claims with baseline, ownership, and measurable impact.',
        },
        vi: {
          title: 'Xác minh claim cải thiện data quality',
          displayQuestion:
            'CV của bạn nói bạn cải thiện data quality. Bạn tìm ra issue nào, rule/process nào thay đổi và đo cải thiện như thế nào?',
          displayIntent:
            'Xác minh claim data quality bằng baseline, ownership và impact đo được.',
        },
        ja: {
          title: 'data quality 改善 claim の検証',
          displayQuestion:
            'CV に data quality を改善したとあります。どんな issue を見つけ、どの rule/process を変え、改善をどう測定しましたか。',
          displayIntent:
            'baseline、ownership、measurable impact によって data quality claim を検証する。',
        },
      }),
      ['dbt', 'airflow', 'data_quality'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Data warehouse versus lakehouse trade-offs',
          displayQuestion:
            'Describe a decision between warehouse-first and lakehouse-style architecture. What constraints made the choice right?',
          displayIntent:
            'Assess senior architecture trade-offs in data modeling, cost, governance, latency, and team capability.',
        },
        vi: {
          title: 'Trade-off data warehouse và lakehouse',
          displayQuestion:
            'Hãy mô tả quyết định giữa kiến trúc warehouse-first và lakehouse-style. Ràng buộc nào làm lựa chọn đó đúng?',
          displayIntent:
            'Đánh giá trade-off architecture senior về data modeling, cost, governance, latency và năng lực team.',
        },
        ja: {
          title: 'data warehouse と lakehouse の trade-off',
          displayQuestion:
            'warehouse-first architecture と lakehouse-style architecture の間で判断した経験を説明してください。どんな制約が選択を正しくしましたか。',
          displayIntent:
            'data modeling、cost、governance、latency、team capability に関する senior architecture trade-off を評価する。',
        },
      }),
      ['snowflake', 'bigquery', 'spark'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Root-causing inconsistent metrics across teams',
          displayQuestion:
            'Tell me about a time two teams reported different numbers for the same metric. How did you resolve the source of truth?',
          displayIntent:
            'Evaluate senior data governance, lineage, and stakeholder alignment.',
        },
        vi: {
          title: 'Tìm root cause metric không nhất quán giữa team',
          displayQuestion:
            'Hãy kể về một lần hai team báo số khác nhau cho cùng một metric. Bạn giải quyết source of truth như thế nào?',
          displayIntent:
            'Đánh giá data governance senior, lineage và stakeholder alignment.',
        },
        ja: {
          title: 'team 間で不一致な metric の root cause',
          displayQuestion:
            '同じ metric について二つの team が異なる数値を報告した経験を話してください。source of truth をどう解決しましたか。',
          displayIntent:
            'senior data governance、lineage、stakeholder alignment を評価する。',
        },
      }),
      ['dbt', 'bigquery', 'lineage'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a platform data migration',
          displayQuestion:
            'You mention leading a data platform migration. What decisions were yours, what broke during migration, and what evidence showed success?',
          displayIntent:
            'Verify senior ownership and durable impact of a data platform migration.',
        },
        vi: {
          title: 'Xác minh ownership trong migration data platform',
          displayQuestion:
            'Bạn nói mình dẫn dắt data platform migration. Quyết định nào là của bạn, điều gì bị lỗi trong migration và bằng chứng nào cho thấy thành công?',
          displayIntent:
            'Xác minh ownership senior và impact bền vững của data platform migration.',
        },
        ja: {
          title: 'data platform migration の ownership 検証',
          displayQuestion:
            'data platform migration をリードしたとあります。どの判断があなたのもので、migration 中に何が壊れ、成功の証拠は何でしたか。',
          displayIntent:
            'data platform migration の senior ownership と durable impact を検証する。',
        },
      }),
      ['airflow', 'spark', 'snowflake', 'dbt'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Pushing back on a misleading metric',
          displayQuestion:
            'Tell me about a time you pushed back on a metric because it could mislead stakeholders. How did you handle the conversation?',
          displayIntent:
            'Assess communication, ethics, and stakeholder management in data work.',
        },
        vi: {
          title: 'Push back một metric dễ gây hiểu nhầm',
          displayQuestion:
            'Hãy kể về một lần bạn push back một metric vì nó có thể làm stakeholder hiểu sai. Bạn xử lý cuộc trao đổi như thế nào?',
          displayIntent:
            'Đánh giá communication, ethics và stakeholder management trong data work.',
        },
        ja: {
          title: 'misleading metric への pushback',
          displayQuestion:
            'stakeholder を誤解させる可能性がある metric に push back した経験を話してください。会話をどう進めましたか。',
          displayIntent:
            'data work における communication、ethics、stakeholder management を評価する。',
        },
      }),
      ['bigquery', 'impact_measurement'],
    ),
  ],
  qa: [
    tech(
      'junior',
      lc({
        en: {
          title: 'Writing meaningful assertions for an API test',
          displayQuestion:
            'How would you write an API test that checks more than just status code 200?',
          displayIntent:
            'Check basic testing depth around assertions, response shape, error cases, and setup data.',
        },
        vi: {
          title: 'Viết assertion có ý nghĩa cho API test',
          displayQuestion:
            'Bạn sẽ viết API test như thế nào để kiểm tra nhiều hơn status code 200?',
          displayIntent:
            'Kiểm tra độ sâu testing cơ bản về assertion, response shape, error case và setup data.',
        },
        ja: {
          title: 'API test に意味のある assertion を書く',
          displayQuestion:
            'status code 200 だけでなく、何を確認する API test をどう書きますか。',
          displayIntent:
            'assertions、response shape、error cases、setup data に関する基本的な testing depth を確認する。',
        },
      }),
      ['jest', 'postman', 'contract_testing'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Reproducing a bug from a vague report',
          displayQuestion:
            'A user reports that checkout sometimes fails, but there are no steps. How would you reproduce and narrow the issue?',
          displayIntent:
            'Evaluate practical bug triage and reproduction discipline.',
        },
        vi: {
          title: 'Reproduce bug từ report mơ hồ',
          displayQuestion:
            'User báo checkout đôi khi fail nhưng không có step. Bạn reproduce và khoanh vùng issue như thế nào?',
          displayIntent:
            'Đánh giá bug triage thực tế và kỷ luật reproduce lỗi.',
        },
        ja: {
          title: '曖昧な report から bug を再現する',
          displayQuestion:
            'user が checkout が時々失敗すると報告していますが手順がありません。どう再現し、issue を切り分けますか。',
          displayIntent:
            '実践的な bug triage と reproduction discipline を評価する。',
        },
      }),
      ['playwright', 'logging'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from a missed regression',
          displayQuestion:
            'Tell me about a regression you missed and what you changed in your testing approach afterward.',
          displayIntent: 'Assess ownership and learning from quality gaps.',
        },
        vi: {
          title: 'Học từ regression bị bỏ sót',
          displayQuestion:
            'Hãy kể về một regression bạn đã bỏ sót và sau đó bạn thay đổi cách test như thế nào.',
          displayIntent:
            'Đánh giá ownership và học hỏi từ khoảng trống chất lượng.',
        },
        ja: {
          title: '見逃した regression からの学び',
          displayQuestion:
            '見逃した regression と、その後 testing approach をどう変えたかを話してください。',
          displayIntent:
            'quality gaps からの ownership と learning を評価する。',
        },
      }),
      ['jest', 'playwright'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Choosing what to test before a small release',
          displayQuestion:
            'You have limited time before a small release. How do you decide what to test manually and what to automate later?',
          displayIntent:
            'Assess risk-based prioritization and communication under time constraints.',
        },
        vi: {
          title: 'Chọn phần cần test trước release nhỏ',
          displayQuestion:
            'Bạn có ít thời gian trước một release nhỏ. Bạn quyết định test thủ công phần nào và automate phần nào sau đó như thế nào?',
          displayIntent:
            'Đánh giá ưu tiên theo rủi ro và communication khi bị giới hạn thời gian.',
        },
        ja: {
          title: '小さな release 前に何を test するか選ぶ',
          displayQuestion:
            '小さな release 前で時間が限られています。何を manual test し、何を後で automate するかをどう決めますか。',
          displayIntent:
            'time constraints 下での risk-based prioritization と communication を評価する。',
        },
      }),
      ['playwright', 'test_strategy'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Contract testing between frontend and backend',
          displayQuestion:
            'Explain how contract tests can prevent frontend-backend integration bugs. What should the contract include?',
          displayIntent:
            'Assess technical depth in API contracts, test boundaries, and regression prevention.',
        },
        vi: {
          title: 'Contract testing giữa frontend và backend',
          displayQuestion:
            'Hãy giải thích contract test giúp ngăn bug integration frontend-backend như thế nào. Contract nên bao gồm gì?',
          displayIntent:
            'Đánh giá độ sâu kỹ thuật về API contract, test boundary và phòng ngừa regression.',
        },
        ja: {
          title: 'frontend-backend 間の contract testing',
          displayQuestion:
            'contract tests が frontend-backend integration bugs をどう防ぐか説明してください。contract には何を含めるべきですか。',
          displayIntent:
            'API contracts、test boundaries、regression prevention の技術的深さを評価する。',
        },
      }),
      ['contract_testing', 'jest', 'rest'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'UI automation versus API automation',
          displayQuestion:
            'When would you cover a workflow with UI automation, and when would API-level tests be a better choice?',
          displayIntent:
            'Evaluate trade-offs in speed, reliability, coverage, and maintenance cost.',
        },
        vi: {
          title: 'UI automation hay API automation',
          displayQuestion:
            'Khi nào bạn cover một workflow bằng UI automation, và khi nào API-level test là lựa chọn tốt hơn?',
          displayIntent:
            'Đánh giá trade-off về tốc độ, reliability, coverage và chi phí bảo trì.',
        },
        ja: {
          title: 'UI automation と API automation',
          displayQuestion:
            'workflow を UI automation で cover するのはいつで、API-level tests の方が良いのはいつですか。',
          displayIntent:
            'speed、reliability、coverage、maintenance cost の trade-off を評価する。',
        },
      }),
      ['playwright', 'cypress', 'postman'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating flaky Playwright tests',
          displayQuestion:
            'A Playwright test fails only in CI. How would you determine whether the issue is test timing, environment, or product behavior?',
          displayIntent:
            'Assess flaky test diagnosis and evidence-based stabilization.',
        },
        vi: {
          title: 'Điều tra Playwright test flaky',
          displayQuestion:
            'Một Playwright test chỉ fail trên CI. Bạn xác định nguyên nhân là timing của test, environment hay behavior của product như thế nào?',
          displayIntent:
            'Đánh giá chẩn đoán flaky test và ổn định test dựa trên bằng chứng.',
        },
        ja: {
          title: 'flaky Playwright tests の調査',
          displayQuestion:
            'Playwright test が CI でだけ失敗します。test timing、environment、product behavior のどれが原因かをどう判断しますか。',
          displayIntent:
            'flaky test diagnosis と evidence-based stabilization を評価する。',
        },
      }),
      ['playwright', 'github_actions', 'browser_performance'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying an automation coverage claim',
          displayQuestion:
            'Your CV says you increased automation coverage. What risk area did you cover, what changed in release confidence, and how was it measured?',
          displayIntent:
            'Verify QA impact claims with risk coverage, contribution, and measurable release signal.',
        },
        vi: {
          title: 'Xác minh claim tăng automation coverage',
          displayQuestion:
            'CV của bạn nói bạn tăng automation coverage. Bạn cover risk area nào, release confidence thay đổi gì và đo như thế nào?',
          displayIntent:
            'Xác minh claim impact QA bằng risk coverage, đóng góp và release signal đo được.',
        },
        ja: {
          title: 'automation coverage claim の検証',
          displayQuestion:
            'CV に automation coverage を増やしたとあります。どの risk area を cover し、release confidence はどう変わり、どう測定しましたか。',
          displayIntent:
            'risk coverage、contribution、measurable release signal により QA impact claim を検証する。',
        },
      }),
      ['playwright', 'cypress', 'test_strategy'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Designing a test strategy for a risky release',
          displayQuestion:
            'Describe a release where you had to balance automation, manual exploratory testing, and production monitoring.',
          displayIntent:
            'Assess senior QA strategy across risk, coverage, delivery pressure, and observability.',
        },
        vi: {
          title: 'Thiết kế test strategy cho release rủi ro',
          displayQuestion:
            'Hãy mô tả một release mà bạn phải cân bằng automation, manual exploratory testing và production monitoring.',
          displayIntent:
            'Đánh giá QA strategy senior qua risk, coverage, delivery pressure và observability.',
        },
        ja: {
          title: 'risky release の test strategy 設計',
          displayQuestion:
            'automation、manual exploratory testing、production monitoring のバランスを取る必要があった release について説明してください。',
          displayIntent:
            'risk、coverage、delivery pressure、observability にまたがる senior QA strategy を評価する。',
        },
      }),
      ['playwright', 'contract_testing', 'alerting'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Root-causing a production defect that tests missed',
          displayQuestion:
            'Tell me about a production defect that escaped tests. How did you trace the gap in the test strategy?',
          displayIntent:
            'Evaluate senior quality analysis and prevention of repeat defects.',
        },
        vi: {
          title: 'Tìm root cause defect production lọt test',
          displayQuestion:
            'Hãy kể về một production defect lọt qua test. Bạn trace khoảng trống trong test strategy như thế nào?',
          displayIntent:
            'Đánh giá phân tích chất lượng senior và ngăn defect lặp lại.',
        },
        ja: {
          title: 'test をすり抜けた production defect の root cause',
          displayQuestion:
            'tests を逃れた production defect について話してください。test strategy の gap をどう trace しましたか。',
          displayIntent:
            'senior quality analysis と repeat defects の prevention を評価する。',
        },
      }),
      ['test_strategy', 'playwright', 'contract_testing'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a QA process change',
          displayQuestion:
            'You mention improving the QA process. What decision did you own, what behavior changed in the team, and what evidence showed better quality?',
          displayIntent:
            'Verify senior QA ownership and measurable process impact.',
        },
        vi: {
          title: 'Xác minh ownership khi đổi QA process',
          displayQuestion:
            'Bạn nói mình cải thiện QA process. Quyết định nào là của bạn, behavior nào trong team thay đổi và bằng chứng nào cho thấy chất lượng tốt hơn?',
          displayIntent:
            'Xác minh ownership QA senior và impact process đo được.',
        },
        ja: {
          title: 'QA process change の ownership 検証',
          displayQuestion:
            'QA process を改善したとあります。どの判断をあなたが持ち、team の behavior は何が変わり、quality 改善の証拠は何でしたか。',
          displayIntent:
            'senior QA ownership と measurable process impact を検証する。',
        },
      }),
      ['test_strategy', 'github_actions', 'playwright'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Challenging a release with unresolved quality risk',
          displayQuestion:
            'Tell me about a time you challenged a release because of quality risk. How did you communicate the risk without creating unnecessary friction?',
          displayIntent:
            'Assess senior communication and conflict handling around release quality.',
        },
        vi: {
          title: 'Challenge release còn rủi ro chất lượng',
          displayQuestion:
            'Hãy kể về một lần bạn challenge một release vì rủi ro chất lượng. Bạn communicate rủi ro mà không tạo friction không cần thiết như thế nào?',
          displayIntent:
            'Đánh giá communication senior và conflict handling quanh release quality.',
        },
        ja: {
          title: '未解決の quality risk がある release への challenge',
          displayQuestion:
            'quality risk を理由に release に challenge した経験を話してください。不要な friction を生まずに risk をどう伝えましたか。',
          displayIntent:
            'release quality に関する senior communication と conflict handling を評価する。',
        },
      }),
      ['test_strategy', 'rollback'],
    ),
  ],
  security: [
    tech(
      'junior',
      lc({
        en: {
          title: 'JWT validation in an authenticated endpoint',
          displayQuestion:
            'What checks should an API perform before trusting a JWT on an authenticated endpoint?',
          displayIntent:
            'Check basic authentication understanding: signature, expiry, issuer, audience, and user lookup.',
        },
        vi: {
          title: 'Validate JWT trong endpoint cần auth',
          displayQuestion:
            'Một API cần kiểm tra gì trước khi tin một JWT ở authenticated endpoint?',
          displayIntent:
            'Kiểm tra hiểu biết auth cơ bản: signature, expiry, issuer, audience và user lookup.',
        },
        ja: {
          title: 'authenticated endpoint での JWT validation',
          displayQuestion:
            'authenticated endpoint で JWT を信頼する前に、API は何を確認すべきですか。',
          displayIntent:
            'signature、expiry、issuer、audience、user lookup など基本的な authentication 理解を確認する。',
        },
      }),
      ['jwt', 'oauth2'],
    ),
    debug(
      'junior',
      lc({
        en: {
          title: 'Investigating a missing authorization check',
          displayQuestion:
            'A user can access a record they should not see. How would you confirm whether the bug is authentication, authorization, or data filtering?',
          displayIntent:
            'Evaluate basic security debugging and access-control reasoning.',
        },
        vi: {
          title: 'Điều tra thiếu authorization check',
          displayQuestion:
            'Một user truy cập được record họ không nên thấy. Bạn xác nhận bug nằm ở authentication, authorization hay data filtering như thế nào?',
          displayIntent:
            'Đánh giá debug security cơ bản và reasoning về access control.',
        },
        ja: {
          title: 'authorization check 不足の調査',
          displayQuestion:
            'user が見るべきでない record にアクセスできます。bug が authentication、authorization、data filtering のどれかをどう確認しますか。',
          displayIntent:
            'basic security debugging と access-control reasoning を評価する。',
        },
      }),
      ['jwt', 'authorization', 'owasp'],
    ),
    behavioral(
      'junior',
      lc({
        en: {
          title: 'Learning from a security review finding',
          displayQuestion:
            'Tell me about feedback from a security review and what you changed in your implementation habits.',
          displayIntent:
            'Assess learning agility and ownership after security feedback.',
        },
        vi: {
          title: 'Học từ finding trong security review',
          displayQuestion:
            'Hãy kể về feedback từ một security review và bạn đã thay đổi thói quen implement như thế nào.',
          displayIntent:
            'Đánh giá learning agility và ownership sau feedback security.',
        },
        ja: {
          title: 'security review finding からの学び',
          displayQuestion:
            'security review からの feedback と、その後 implementation habits をどう変えたかを話してください。',
          displayIntent:
            'security feedback 後の learning agility と ownership を評価する。',
        },
      }),
      ['owasp', 'jwt'],
    ),
    situational(
      'junior',
      lc({
        en: {
          title: 'Handling a suspected leaked secret',
          displayQuestion:
            'You suspect an API key was committed to a branch. What steps do you take before and after notifying the team?',
          displayIntent:
            'Assess practical incident response for secret exposure.',
        },
        vi: {
          title: 'Xử lý nghi ngờ lộ secret',
          displayQuestion:
            'Bạn nghi ngờ một API key đã bị commit lên branch. Bạn làm gì trước và sau khi báo team?',
          displayIntent:
            'Đánh giá incident response thực tế cho secret exposure.',
        },
        ja: {
          title: 'leaked secret の疑いへの対応',
          displayQuestion:
            'API key が branch に commit された疑いがあります。team に通知する前後でどんな手順を取りますか。',
          displayIntent:
            'secret exposure に対する practical incident response を評価する。',
        },
      }),
      ['secrets_management', 'github_actions'],
    ),
    tech(
      'mid',
      lc({
        en: {
          title: 'Preventing broken object level authorization',
          displayQuestion:
            'Explain how you would prevent broken object level authorization in an API that reads customer-owned records.',
          displayIntent:
            'Assess technical depth in authorization checks, data scoping, and test coverage.',
        },
        vi: {
          title: 'Ngăn broken object level authorization',
          displayQuestion:
            'Hãy giải thích cách bạn ngăn broken object level authorization trong API đọc record thuộc về customer.',
          displayIntent:
            'Đánh giá độ sâu kỹ thuật về authorization check, data scoping và test coverage.',
        },
        ja: {
          title: 'broken object level authorization の防止',
          displayQuestion:
            'customer-owned records を読む API で broken object level authorization をどう防ぎますか。',
          displayIntent:
            'authorization checks、data scoping、test coverage の技術的深さを評価する。',
        },
      }),
      ['owasp', 'jwt', 'authorization'],
    ),
    trade(
      'mid',
      lc({
        en: {
          title: 'Session cookies versus bearer tokens',
          displayQuestion:
            'When would you choose secure session cookies instead of bearer tokens for a web application?',
          displayIntent:
            'Evaluate auth trade-offs around browser security, CSRF, XSS, storage, and operational complexity.',
        },
        vi: {
          title: 'Session cookie hay bearer token',
          displayQuestion:
            'Khi nào bạn chọn secure session cookie thay vì bearer token cho web application?',
          displayIntent:
            'Đánh giá trade-off auth về browser security, CSRF, XSS, storage và operational complexity.',
        },
        ja: {
          title: 'session cookies と bearer tokens',
          displayQuestion:
            'web application で bearer token ではなく secure session cookies を選ぶのはいつですか。',
          displayIntent:
            'browser security、CSRF、XSS、storage、operational complexity に関する auth trade-off を評価する。',
        },
      }),
      ['oauth2', 'jwt', 'csrf', 'xss'],
    ),
    debug(
      'mid',
      lc({
        en: {
          title: 'Investigating a suspected XSS report',
          displayQuestion:
            'A tester reports possible XSS in a comment field. How would you verify exploitability and decide the right fix?',
          displayIntent:
            'Assess security debugging around reproduction, encoding, sanitization, and impact.',
        },
        vi: {
          title: 'Điều tra report nghi ngờ XSS',
          displayQuestion:
            'Tester báo có thể có XSS ở comment field. Bạn xác minh exploitability và chọn fix đúng như thế nào?',
          displayIntent:
            'Đánh giá security debugging về reproduction, encoding, sanitization và impact.',
        },
        ja: {
          title: 'XSS 疑い report の調査',
          displayQuestion:
            'tester が comment field に XSS の可能性を報告しました。exploitability をどう検証し、適切な fix をどう決めますか。',
          displayIntent:
            'reproduction、encoding、sanitization、impact に関する security debugging を評価する。',
        },
      }),
      ['xss', 'owasp'],
    ),
    cv(
      'mid',
      lc({
        en: {
          title: 'Verifying a security hardening claim',
          displayQuestion:
            'Your CV says you hardened authentication. What weakness existed, what changed, and how did you verify the risk was reduced?',
          displayIntent:
            'Verify security claims with threat, personal contribution, and evidence of risk reduction.',
        },
        vi: {
          title: 'Xác minh claim hardening authentication',
          displayQuestion:
            'CV của bạn nói bạn hardened authentication. Điểm yếu trước đó là gì, bạn thay đổi gì và xác minh rủi ro giảm như thế nào?',
          displayIntent:
            'Xác minh claim security bằng threat, đóng góp cá nhân và bằng chứng giảm rủi ro.',
        },
        ja: {
          title: 'security hardening claim の検証',
          displayQuestion:
            'CV に authentication を hardened したとあります。どんな弱点があり、何を変え、risk reduction をどう検証しましたか。',
          displayIntent:
            'threat、personal contribution、risk reduction evidence によって security claim を検証する。',
        },
      }),
      ['oauth2', 'jwt', 'owasp'],
    ),
    trade(
      'senior',
      lc({
        en: {
          title: 'Balancing security controls with developer velocity',
          displayQuestion:
            'Describe a security control you introduced that added friction. How did you decide the friction was worth it?',
          displayIntent:
            'Assess senior security judgment across risk, usability, adoption, and enforcement.',
        },
        vi: {
          title: 'Cân bằng security control và developer velocity',
          displayQuestion:
            'Hãy mô tả một security control bạn đưa vào làm tăng friction. Bạn quyết định friction đó đáng chấp nhận như thế nào?',
          displayIntent:
            'Đánh giá judgment security senior về risk, usability, adoption và enforcement.',
        },
        ja: {
          title: 'security control と developer velocity のバランス',
          displayQuestion:
            'friction を増やした security control を導入した経験を説明してください。その friction が妥当だとどう判断しましたか。',
          displayIntent:
            'risk、usability、adoption、enforcement に関する senior security judgment を評価する。',
        },
      }),
      ['owasp', 'iam', 'audit_logging'],
    ),
    debug(
      'senior',
      lc({
        en: {
          title: 'Coordinating a cross-team access control incident',
          displayQuestion:
            'Tell me about an access control incident involving multiple services or teams. How did you contain, investigate, and prevent recurrence?',
          displayIntent:
            'Evaluate senior incident response and cross-team security ownership.',
        },
        vi: {
          title: 'Điều phối incident access control cross-team',
          displayQuestion:
            'Hãy kể về một incident access control liên quan nhiều service hoặc team. Bạn contain, investigate và ngăn tái diễn như thế nào?',
          displayIntent:
            'Đánh giá incident response senior và security ownership cross-team.',
        },
        ja: {
          title: 'cross-team access control incident の調整',
          displayQuestion:
            '複数 services または teams に関わる access control incident について話してください。contain、investigate、recurrence prevention をどう行いましたか。',
          displayIntent:
            'senior incident response と cross-team security ownership を評価する。',
        },
      }),
      ['authorization', 'audit_logging', 'owasp'],
    ),
    cv(
      'senior',
      lc({
        en: {
          title: 'Verifying ownership of a threat modeling program',
          displayQuestion:
            'You mention leading threat modeling. What decisions were yours, how did teams adopt it, and what evidence showed better security outcomes?',
          displayIntent:
            'Verify senior security leadership with adoption evidence and measurable risk reduction.',
        },
        vi: {
          title: 'Xác minh ownership chương trình threat modeling',
          displayQuestion:
            'Bạn nói mình dẫn dắt threat modeling. Quyết định nào là của bạn, các team adopt ra sao và bằng chứng nào cho thấy security outcome tốt hơn?',
          displayIntent:
            'Xác minh security leadership senior bằng adoption evidence và risk reduction đo được.',
        },
        ja: {
          title: 'threat modeling program の ownership 検証',
          displayQuestion:
            'threat modeling をリードしたとあります。どの判断があなたのもので、teams はどう adopt し、better security outcomes の証拠は何でしたか。',
          displayIntent:
            'adoption evidence と measurable risk reduction により senior security leadership を検証する。',
        },
      }),
      ['threat_modeling', 'owasp', 'audit_logging'],
    ),
    behavioral(
      'senior',
      lc({
        en: {
          title: 'Pushing back on a risky shortcut',
          displayQuestion:
            'Tell me about a time you pushed back on a shortcut that increased security risk. How did you keep the team moving?',
          displayIntent:
            'Assess conflict handling and communication when security conflicts with delivery pressure.',
        },
        vi: {
          title: 'Push back shortcut làm tăng security risk',
          displayQuestion:
            'Hãy kể về một lần bạn push back một shortcut làm tăng security risk. Bạn giữ team tiếp tục tiến lên như thế nào?',
          displayIntent:
            'Đánh giá conflict handling và communication khi security xung đột với áp lực delivery.',
        },
        ja: {
          title: 'security risk を増やす shortcut への pushback',
          displayQuestion:
            'security risk を高める shortcut に push back した経験を話してください。team を前に進めるために何をしましたか。',
          displayIntent:
            'security と delivery pressure が衝突する場面での conflict handling と communication を評価する。',
        },
      }),
      ['owasp', 'secrets_management'],
    ),
  ],
};

export const QUESTION_PROBE_SEEDS: QuestionProbeSeed[] =
  buildQuestionProbeSeeds();

export async function seedQuestionProbes(
  dataSource: DataSource,
): Promise<void> {
  const repo: Repository<QuestionProbe> =
    dataSource.getRepository(QuestionProbe);
  let updated = 0;
  let created = 0;

  for (const seed of QUESTION_PROBE_SEEDS) {
    const existing: QuestionProbe | null = await repo.findOne({
      where: { code: seed.code },
    });
    if (existing) {
      await repo.save(
        repo.create({
          ...existing,
          ...seed,
          updatedBy: 'seed',
        }),
      );
      updated += 1;
    } else {
      await repo.save(
        repo.create({
          ...seed,
          status: 'active',
          createdBy: 'seed',
          updatedBy: 'seed',
          reviewedBy: 'seed',
          publishedAt: new Date(),
          revision: 1,
        }),
      );
      created += 1;
    }
  }

  console.log(
    `[seed] Question probes: ${updated} updated, ${created} created.`,
  );
}

function buildQuestionProbeSeeds(): QuestionProbeSeed[] {
  return Object.entries(PROBE_BLUEPRINTS).flatMap(
    ([roleFamily, blueprints]: [string, ProbeBlueprint[]]) =>
      blueprints.map((blueprint: ProbeBlueprint) => {
        const levelIndex: number = blueprints
          .filter((item: ProbeBlueprint) => item.level === blueprint.level)
          .indexOf(blueprint);
        return toSeed({
          roleFamily: roleFamily as QuestionProbeRoleFamily,
          blueprint,
          levelIndex,
        });
      }),
  );
}

function toSeed({
  roleFamily,
  blueprint,
  levelIndex,
}: {
  roleFamily: QuestionProbeRoleFamily;
  blueprint: ProbeBlueprint;
  levelIndex: number;
}): QuestionProbeSeed {
  const role: RoleMeta = ROLE_META[roleFamily];

  return {
    code: `QB_${role.code}_${LEVEL_CODE[blueprint.level]}_${TYPE_CODE[blueprint.type]}_${String(levelIndex + 1).padStart(2, '0')}`,
    stages: [blueprint.stage],
    roleFamilies: [roleFamily],
    levels: [blueprint.level],
    type: blueprint.type,
    competencies: blueprint.competencies,
    techTags: blueprint.techTags,
    difficulty: LEVEL_DIFFICULTY[blueprint.level],
    intent: requiredContent(blueprint, 'en').displayIntent,
    primaryQuestion: requiredContent(blueprint, 'en').displayQuestion,
    expectedSignals: expectedSignals(blueprint),
    redFlags: redFlags(blueprint.type),
    scoringHints: scoringHints(blueprint.type),
    followUps: followUps(blueprint.followUpTriggers),
    localizedContent: localizedContent({ role, blueprint }),
    sourceReferences: sourceReferences(roleFamily, blueprint.type),
    status: 'active',
  };
}

function tech(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'technical_depth',
    stage: 'stage_2_tech_stack',
    content,
    competencies: ['technical_fundamentals', 'system_thinking'],
    techTags,
    followUpTriggers: ['missing_context', 'vague_answer'],
  };
}

function debug(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'debugging',
    stage:
      level === 'junior' ? 'stage_2_tech_stack' : 'stage_3_domain_knowledge',
    content,
    competencies: ['problem_solving', 'system_thinking', 'ownership'],
    techTags,
    followUpTriggers: ['missing_context', 'missing_metric', 'red_flag'],
  };
}

function trade(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'trade_off',
    stage: 'stage_2_tech_stack',
    content,
    competencies: [
      'trade_off_analysis',
      'system_thinking',
      'impact_measurement',
    ],
    techTags,
    followUpTriggers: ['missing_tradeoff', 'missing_metric'],
  };
}

function cv(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'cv_claim_verification',
    stage: 'stage_4_cv_deep_dive',
    content,
    competencies: ['ownership', 'impact_measurement', 'technical_fundamentals'],
    techTags,
    followUpTriggers: ['missing_metric', 'missing_context', 'red_flag'],
  };
}

function behavioral(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'behavioral',
    stage: 'stage_5_soft_skills',
    content,
    competencies: ['ownership', 'communication', 'learning_agility'],
    techTags,
    followUpTriggers: ['missing_context', 'vague_answer'],
  };
}

function situational(
  level: QuestionProbeLevel,
  content: QuestionProbeLocalizedContentMap,
  techTags: string[],
): ProbeBlueprint {
  return {
    level,
    type: 'situational',
    stage: 'stage_5_soft_skills',
    content,
    competencies: ['communication', 'collaboration', 'ownership'],
    techTags,
    followUpTriggers: ['missing_context', 'missing_tradeoff'],
  };
}

function expectedSignals(blueprint: ProbeBlueprint): string[] {
  const common: string[] = [
    'Uses a concrete scenario tied to the question topic.',
    'Clarifies the candidate personal contribution and decision ownership.',
    'Provides evidence such as metrics, logs, tests, rollout results, or stakeholder impact.',
  ];

  const byType: Record<QuestionProbeType, string[]> = {
    behavioral: [
      'Describes situation, action, outcome, and lesson learned.',
      'Shows professional communication without blaming others.',
      'Mentions what changed after the event.',
    ],
    technical_depth: [
      'Explains the underlying mechanism, not only the tool name.',
      'Names limits, edge cases, or failure modes.',
      'Connects the design to reliability, performance, maintainability, or security.',
    ],
    trade_off: [
      'Compares at least two realistic options.',
      'States the chosen option and why it fit the constraints.',
      'Names risks accepted and mitigations or follow-up signals.',
    ],
    debugging: [
      'Starts with impact, reproduction, scope, and recent changes.',
      'Uses observable evidence before concluding root cause.',
      'Explains fix verification and prevention of recurrence.',
    ],
    cv_claim_verification: [
      'Separates personal contribution from team contribution.',
      'Provides baseline, measurement method, and final outcome.',
      'Gives enough technical detail to make the claim verifiable.',
    ],
    situational: [
      'States assumptions and missing information.',
      'Balances delivery pressure with user, business, quality, or security risk.',
      'Defines communication, escalation, and follow-up path.',
    ],
  };

  return [...common, ...byType[blueprint.type]];
}

function redFlags(type: QuestionProbeType): string[] {
  const common: string[] = [
    'Answer stays generic and does not describe a concrete context.',
    'Candidate claims impact without evidence, baseline, or personal role.',
    'Candidate ignores risks, trade-offs, or failure modes relevant to the probe.',
  ];
  const byType: Record<QuestionProbeType, string[]> = {
    behavioral: [
      'Blames others or presents conflict as a personality issue only.',
    ],
    technical_depth: [
      'Only names tools or APIs without explaining how they work.',
    ],
    trade_off: [
      'Presents one option as obviously correct without comparing alternatives.',
    ],
    debugging: ['Jumps to a fix before reproducing or narrowing the failure.'],
    cv_claim_verification: [
      'Uses "we improved" language while avoiding personal contribution.',
    ],
    situational: [
      'Chooses speed or escalation without explaining user or business impact.',
    ],
  };
  return [...common, ...byType[type]];
}

function scoringHints(type: QuestionProbeType): QuestionProbeScoringHint[] {
  return [
    {
      scoreBand: 'strong',
      description: `Covers concrete context, evidence, personal ownership, and ${type} judgment with clear validation.`,
    },
    {
      scoreBand: 'solid',
      description:
        'Covers most expected signals but misses one dimension such as metric, failure mode, or follow-up validation.',
    },
    {
      scoreBand: 'needs_work',
      description:
        'Gives a plausible answer but lacks concrete evidence, personal contribution, or measurable outcome.',
    },
    {
      scoreBand: 'insufficient_evidence',
      description:
        'Answer is too short or generic to validate signal coverage from transcript evidence.',
    },
  ];
}

function followUps(
  triggers: QuestionProbeFollowUpTrigger[],
): QuestionProbeFollowUp[] {
  const bank: Record<QuestionProbeFollowUpTrigger, QuestionProbeFollowUp> = {
    missing_metric: {
      trigger: 'missing_metric',
      question:
        'What metric, baseline, or observable signal changed after your work?',
      purpose: 'Clarify impact measurement and avoid unsupported claims.',
    },
    missing_context: {
      trigger: 'missing_context',
      question:
        'What was the team, system, user impact, and constraint at the time?',
      purpose:
        'Recover the concrete context needed for evidence-based scoring.',
    },
    missing_tradeoff: {
      trigger: 'missing_tradeoff',
      question:
        'What alternatives did you reject, and what risk did you accept by choosing this path?',
      purpose: 'Test trade-off reasoning and decision calibration.',
    },
    vague_answer: {
      trigger: 'vague_answer',
      question: 'Can you walk through the exact steps you personally took?',
      purpose: 'Separate real experience from generic interview language.',
    },
    red_flag: {
      trigger: 'red_flag',
      question:
        'What evidence would convince someone skeptical that this answer is accurate?',
      purpose:
        'Verify claims that may be inflated, incomplete, or unsupported.',
    },
    missing_personal_contribution: {
      trigger: 'missing_personal_contribution',
      question:
        'What specifically did you personally own or decide, separate from the team?',
      purpose:
        'Distinguish individual ownership from collective team outcomes.',
    },
    missing_consequence: {
      trigger: 'missing_consequence',
      question:
        'What happened as a result — to users, the system, or the team?',
      purpose:
        'Surface downstream impact to validate the significance of the action.',
    },
    missing_reflection: {
      trigger: 'missing_reflection',
      question:
        'If you faced the same situation today, what would you do differently and why?',
      purpose:
        'Assess learning, self-awareness, and growth from the experience.',
    },
  };

  return triggers.map((trigger: QuestionProbeFollowUpTrigger) => bank[trigger]);
}

function localizedContent({
  role,
  blueprint,
}: {
  role: RoleMeta;
  blueprint: ProbeBlueprint;
}): QuestionProbeLocalizedContentMap {
  return {
    en: withLabels(requiredContent(blueprint, 'en'), role, blueprint),
    vi: withLabels(requiredContent(blueprint, 'vi'), role, blueprint),
    ja: withLabels(requiredContent(blueprint, 'ja'), role, blueprint),
  };
}

function requiredContent(
  blueprint: ProbeBlueprint,
  locale: 'en' | 'vi' | 'ja',
): QuestionProbeLocalizedContent {
  const content: QuestionProbeLocalizedContent | undefined =
    blueprint.content[locale];
  if (!content) {
    throw new Error(`Missing ${locale} content for probe seed`);
  }
  return content;
}

function withLabels(
  content: QuestionProbeLocalizedContent,
  role: RoleMeta,
  blueprint: ProbeBlueprint,
): QuestionProbeLocalizedContent {
  return {
    ...content,
    labels: labelMap(role.label, LEVEL_LABEL[blueprint.level], blueprint.type),
  };
}

function labelMap(
  roleLabel: string,
  levelLabel: string,
  type: QuestionProbeType,
): Record<string, string> {
  return {
    role: roleLabel,
    level: levelLabel,
    type,
  };
}

function sourceReferences(
  roleFamily: QuestionProbeRoleFamily,
  type: QuestionProbeType,
): QuestionProbeSourceReference[] {
  const structuredInterview: QuestionProbeSourceReference = {
    label: 'OPM Structured Interviews',
    url: 'https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/',
    note: 'Used for competency-based question and rubric calibration patterns.',
  };
  const behavioral: QuestionProbeSourceReference = {
    label: 'Microsoft 365 behavioral interview guidance',
    url: 'https://www.microsoft.com/en-us/microsoft-365-life-hacks/presentations/behavioral-interview-questions-answers',
    note: 'Used for behavioral category inspiration, rewritten as internal probes.',
  };
  const handbook: QuestionProbeSourceReference = {
    label: 'Tech Interview Handbook',
    url: 'https://github.com/yangshun/tech-interview-handbook',
    note: 'Used for interview topic breadth and preparation categories.',
  };
  const frontend: QuestionProbeSourceReference = {
    label: 'H5BP Front-end Developer Interview Questions',
    url: 'https://github.com/h5bp/Front-end-Developer-Interview-Questions',
    note: 'Used for frontend topic coverage inspiration.',
  };
  const systemDesign: QuestionProbeSourceReference = {
    label: 'System Design Primer',
    url: 'https://github.com/donnemartin/system-design-primer',
    note: 'Used for backend, distributed systems, and scalability topic coverage.',
  };
  const devops: QuestionProbeSourceReference = {
    label: 'DevOps Exercises',
    url: 'https://github.com/bregman-arie/devops-exercises',
    note: 'Used for DevOps, SRE, Kubernetes, CI/CD, and observability topic coverage.',
  };
  const owasp: QuestionProbeSourceReference = {
    label: 'OWASP Web Security Testing Guide',
    url: 'https://owasp.org/www-project-web-security-testing-guide/',
    note: 'Used for security testing and OWASP risk topic coverage.',
  };

  const references: QuestionProbeSourceReference[] = [structuredInterview];
  if (type === 'behavioral' || type === 'situational') {
    references.push(behavioral);
  }
  if (type !== 'behavioral' && type !== 'situational') {
    references.push(handbook);
  }
  if (roleFamily === 'frontend' || roleFamily === 'fullstack') {
    references.push(frontend);
  }
  if (
    roleFamily === 'backend' ||
    roleFamily === 'fullstack' ||
    roleFamily === 'data'
  ) {
    references.push(systemDesign);
  }
  if (roleFamily === 'devops') references.push(devops);
  if (roleFamily === 'security') references.push(owasp);
  return references;
}
