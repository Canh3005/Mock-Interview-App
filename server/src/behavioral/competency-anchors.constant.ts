import { CandidateLevel } from './entities/behavioral-session.entity';

export enum EvaluationMode {
  STAR_BEHAVIORAL = 'star_behavioral',
  TECHNICAL_DEPTH = 'technical_depth',
  REVERSE_INTERVIEW = 'reverse_interview',
}

export const STAGE_EVALUATION_MODE: Record<number, EvaluationMode> = {
  1: EvaluationMode.STAR_BEHAVIORAL,
  2: EvaluationMode.TECHNICAL_DEPTH,
  3: EvaluationMode.TECHNICAL_DEPTH,
  4: EvaluationMode.STAR_BEHAVIORAL,
  5: EvaluationMode.STAR_BEHAVIORAL,
  6: EvaluationMode.REVERSE_INTERVIEW,
};

export interface CompetencyAnchor {
  id: string;
  competency: string;
  intent: string;
  scope: string;
  exampleQuestion: string;
  applicableLevels: CandidateLevel[];
  evaluationMode: EvaluationMode;
}

export const COMPETENCY_ANCHORS: Record<number, CompetencyAnchor[]> = {
  1: [
    {
      id: 'CULT_LEARNING',
      competency: 'Learning Agility',
      intent:
        'Đánh giá khả năng học công nghệ/kỹ năng mới dưới áp lực thời gian',
      scope: 'Hỏi về cách tiếp cận học, nguồn tài nguyên, kết quả đạt được',
      exampleQuestion:
        'Kể về lần bạn phải học công nghệ mới trong thời gian ngắn',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_CONFLICT',
      competency: 'Conflict & Disagreement Handling',
      intent:
        'Đánh giá cách xử lý bất đồng quan điểm kỹ thuật hoặc công việc với team',
      scope: 'Hỏi về cách lắng nghe, thuyết phục, tìm điểm chung, outcome',
      exampleQuestion:
        'Khi không đồng ý với quyết định kỹ thuật của team, bạn xử lý thế nào?',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_FAILURE',
      competency: 'Self-Awareness & Growth Mindset',
      intent:
        'Đánh giá khả năng nhận lỗi, rút kinh nghiệm, và trưởng thành từ thất bại',
      scope: 'Tập trung vào lesson learned và hành động thay đổi sau đó',
      exampleQuestion: 'Kể về một lần bạn thất bại và bạn học được gì từ đó',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_AUTONOMY',
      competency: 'Autonomy & Ownership',
      intent:
        'Đánh giá mức độ tự chủ, chủ động nhận ownership thay vì chờ được giao',
      scope: 'Hỏi về initiative cụ thể, quyết định độc lập, kết quả',
      exampleQuestion: 'Kể về lần bạn chủ động làm điều gì đó không ai yêu cầu',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CULT_CULTURE_SHAPE',
      competency: 'Culture Leadership',
      intent: 'Đánh giá khả năng định hình và cải thiện văn hoá team',
      scope:
        'Hỏi về thay đổi cụ thể đã tạo ra, cách thuyết phục người khác, tác động lâu dài',
      exampleQuestion:
        'Bạn đã từng thay đổi văn hoá làm việc của một team chưa?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  2: [
    {
      id: 'TECH_UNDERSTANDING',
      competency: 'Technical Fundamentals',
      intent: 'Kiểm tra hiểu biết bản chất (why), không chỉ cách dùng (how)',
      scope:
        'Đào sâu vào cơ chế bên trong, trade-offs, khi nào nên/không nên dùng',
      exampleQuestion:
        'Giải thích sự khác biệt giữa useEffect và useMemo — không chỉ syntax mà cơ chế',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'TECH_TRADEOFF',
      competency: 'Trade-off Analysis',
      intent: 'Đánh giá khả năng nhận ra trade-off khi chọn solution kỹ thuật',
      scope:
        'Hỏi về performance, maintainability, scalability trade-offs trong quyết định đã làm',
      exampleQuestion: 'Khi nào bạn chọn Redis thay vì database? Và ngược lại?',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'TECH_ARCHITECTURE',
      competency: 'System Architecture Thinking',
      intent: 'Đánh giá tư duy kiến trúc, khả năng thiết kế hệ thống ở mức cao',
      scope:
        'Hỏi về distributed systems, scalability patterns, kiến trúc tổng thể',
      exampleQuestion:
        'Hãy phân tích trade-off khi kết hợp NestJS OOP backend với React functional frontend',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
  ],
  3: [
    {
      id: 'DOM_FEATURE_DESIGN',
      competency: 'Feature Design',
      intent: 'Đánh giá tư duy thiết kế tính năng từ đầu đến cuối',
      scope: 'Schema, API, edge cases, failure handling',
      exampleQuestion:
        'Thiết kế collection MongoDB để lưu câu trả lời ứng viên, có pagination',
      applicableLevels: ['junior', 'mid'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'DOM_OPTIMIZATION',
      competency: 'Performance & Optimization',
      intent: 'Đánh giá khả năng nhận diện bottleneck và tối ưu luồng dữ liệu',
      scope: 'Caching strategy, DB query optimization, batching',
      exampleQuestion:
        'Làm thế nào dùng Redis để giảm tải write operations cho chat log?',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
    {
      id: 'DOM_SCALABILITY',
      competency: 'Scalability Design',
      intent: 'Đánh giá tư duy scale hệ thống, event-driven architecture',
      scope: 'Message queue, async processing, horizontal scaling',
      exampleQuestion:
        'Thiết kế kiến trúc event-driven với RabbitMQ cho LLM async response',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.TECHNICAL_DEPTH,
    },
  ],
  4: [
    {
      id: 'CV_EXECUTION',
      competency: 'Task Execution',
      intent:
        'Đào sâu vào cách candidate implement một tính năng cụ thể trong CV',
      scope: 'Chi tiết kỹ thuật, quyết định thiết kế, khó khăn gặp phải',
      exampleQuestion:
        'Bạn implement [feature từ CV] như thế nào? Cho biết chi tiết kỹ thuật.',
      applicableLevels: ['junior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CV_TROUBLESHOOTING',
      competency: 'Debugging & Problem Solving',
      intent:
        'Đào sâu vào một bug/issue khó mà candidate đã giải quyết trong CV',
      scope: 'Root cause analysis, debugging approach, prevention',
      exampleQuestion:
        'Kể về bug khó nhất bạn phải debug trong dự án [từ CV]. Bạn tìm ra root cause thế nào?',
      applicableLevels: ['mid'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'CV_IMPACT',
      competency: 'System Impact & Technical Leadership',
      intent: 'Đánh giá quyết định kỹ thuật lớn và tác động đến hệ thống/team',
      scope: 'Quyết định architecture, trade-offs, kết quả đo được',
      exampleQuestion:
        'Quyết định kỹ thuật quan trọng nhất bạn đưa ra trong dự án [từ CV] là gì?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  5: [
    {
      id: 'SOFT_FEEDBACK',
      competency: 'Receiving & Acting on Feedback',
      intent: 'Đánh giá phản ứng với feedback tiêu cực, khả năng cải thiện',
      scope: 'Cảm xúc ban đầu, hành động cụ thể, kết quả sau đó',
      exampleQuestion:
        'Kể về lần nhận feedback tiêu cực từ senior mà bạn ban đầu không đồng ý',
      applicableLevels: ['junior', 'mid'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'SOFT_CROSS_FUNCTIONAL',
      competency: 'Cross-Functional Communication',
      intent:
        'Đánh giá khả năng giao tiếp kỹ thuật với non-technical stakeholder',
      scope: 'Cách giải thích technical debt/risk cho PM/PO, kết quả đạt được',
      exampleQuestion:
        'Kể về lần bạn phải thuyết phục PO/PM ưu tiên technical debt hơn feature mới',
      applicableLevels: ['mid', 'senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
    {
      id: 'SOFT_MENTORSHIP',
      competency: 'Mentorship & Team Development',
      intent: 'Đánh giá khả năng dẫn dắt, phát triển người khác',
      scope:
        'Approach mentoring, handling performance issues, long-term development',
      exampleQuestion:
        'Nếu junior trong team liên tục commit code lỗi lên production, bạn xử lý thế nào?',
      applicableLevels: ['senior'],
      evaluationMode: EvaluationMode.STAR_BEHAVIORAL,
    },
  ],
  6: [
    {
      id: 'REV_INVITE',
      competency: 'Question Quality',
      intent: 'Mời candidate hỏi về công ty/team, đánh giá chiều sâu câu hỏi',
      scope:
        'Trả lời câu hỏi của candidate như interviewer thực tế, đánh giá ngầm chất lượng',
      exampleQuestion: 'Bạn có câu hỏi nào cho tôi về team hoặc công ty không?',
      applicableLevels: ['junior', 'mid', 'senior'],
      evaluationMode: EvaluationMode.REVERSE_INTERVIEW,
    },
  ],
};

export const COVERAGE_RULES: Record<number, Record<CandidateLevel, number>> = {
  1: { junior: 2, mid: 3, senior: 3 },
  2: { junior: 1, mid: 2, senior: 2 },
  3: { junior: 1, mid: 2, senior: 2 },
  4: { junior: 1, mid: 1, senior: 1 },
  5: { junior: 1, mid: 2, senior: 2 },
  6: { junior: 1, mid: 1, senior: 1 },
};
