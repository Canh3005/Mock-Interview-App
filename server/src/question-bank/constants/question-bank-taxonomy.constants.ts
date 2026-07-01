export const QUESTION_PROBE_STAGES = [
  'stage_1_culture_fit',
  'stage_2_tech_stack',
  'stage_3_domain_knowledge',
  'stage_4_cv_deep_dive',
  'stage_5_soft_skills',
] as const;

export const QUESTION_PROBE_ROLE_FAMILIES = [
  'backend',
  'frontend',
  'fullstack',
  'devops',
  'data',
  'qa',
  'security',
] as const;

export const QUESTION_PROBE_LEVELS = ['junior', 'mid', 'senior'] as const;

export const QUESTION_PROBE_TYPES = [
  'behavioral',
  'technical_depth',
  'trade_off',
  'debugging',
  'cv_claim_verification',
  'situational',
] as const;

export const QUESTION_PROBE_COMPETENCIES = [
  'ownership', // Chịu trách nhiệm về kết quả công việc, có khả năng dẫn dắt và chịu trách nhiệm về các quyết định quan trọng.
  'conflict_handling', // Khả năng xử lý xung đột, giải quyết mâu thuẫn trong nhóm hoặc với các bên liên quan.
  'learning_agility', // Khả năng học hỏi nhanh chóng, thích nghi với các tình huống mới và áp dụng kiến thức vào thực tế.
  'technical_fundamentals', // Kiến thức cơ bản về kỹ thuật, hiểu biết về các nguyên tắc và công nghệ cơ bản trong lĩnh vực của mình.
  'trade_off_analysis', // Khả năng phân tích và đưa ra quyết định dựa trên việc cân nhắc các lựa chọn khác nhau, hiểu rõ các ưu nhược điểm của từng phương án.
  'system_thinking', // Khả năng nhìn nhận vấn đề một cách tổng thể, hiểu mối quan hệ giữa các thành phần trong hệ thống và tác động của chúng đến nhau.
  'problem_solving', // Khả năng giải quyết vấn đề một cách hiệu quả, tìm ra nguyên nhân gốc rễ và đưa ra các giải pháp khả thi.
  'communication', // Khả năng giao tiếp hiệu quả, truyền đạt ý tưởng một cách rõ ràng và lắng nghe phản hồi từ người khác.
  'collaboration', // Khả năng làm việc nhóm, chia sẻ kiến thức và hỗ trợ lẫn nhau trong quá trình thực hiện công việc.
  'impact_measurement', // Khả năng xác định và đo lường tác động của các hoạt động hoặc quyết định đối với kết quả mong muốn.
  'leadership', // Khả năng dẫn dắt, mentor và phát triển người khác; ảnh hưởng kỹ thuật vượt ra ngoài phạm vi cá nhân.
] as const;

export const QUESTION_PROBE_LANGUAGES = ['vi', 'en', 'ja'] as const;

export const QUESTION_PROBE_STATUSES = [
  'draft',
  'in_review',
  'active',
  'retired',
  'needs_revision',
] as const;

export const QUESTION_PROBE_FOLLOW_UP_TRIGGERS = [
  'missing_metric',
  'missing_context',
  'missing_tradeoff',
  'vague_answer',
  'missing_personal_contribution',
  'missing_consequence',
  'missing_reflection',
] as const;

export type QuestionProbeStage = (typeof QUESTION_PROBE_STAGES)[number];
export type QuestionProbeRoleFamily =
  (typeof QUESTION_PROBE_ROLE_FAMILIES)[number];
export type QuestionProbeLevel = (typeof QUESTION_PROBE_LEVELS)[number];
export type QuestionProbeType = (typeof QUESTION_PROBE_TYPES)[number];
export type QuestionProbeCompetency =
  (typeof QUESTION_PROBE_COMPETENCIES)[number];
export type QuestionProbeLanguage = (typeof QUESTION_PROBE_LANGUAGES)[number];
export type QuestionProbeStatus = (typeof QUESTION_PROBE_STATUSES)[number];
export type QuestionProbeFollowUpTrigger =
  (typeof QUESTION_PROBE_FOLLOW_UP_TRIGGERS)[number];

export interface TaxonomyOption {
  key: string;
  label: string;
  description?: string;
  group?: string;
}

export interface TechTagGroup {
  group: string;
  tags: string[];
}

export interface QuestionBankTaxonomy {
  stages: TaxonomyOption[];
  roleFamilies: TaxonomyOption[];
  levels: TaxonomyOption[];
  types: TaxonomyOption[];
  competencies: TaxonomyOption[];
  languages: TaxonomyOption[];
  statuses: TaxonomyOption[];
  followUpTriggers: TaxonomyOption[];
  techTagGroups: TechTagGroup[];
}

export const QUESTION_BANK_TAXONOMY: QuestionBankTaxonomy = {
  stages: [
    { key: 'stage_1_culture_fit', label: 'Culture Fit' },
    { key: 'stage_2_tech_stack', label: 'Tech Stack Deep-Dive' },
    { key: 'stage_3_domain_knowledge', label: 'Domain Knowledge' },
    { key: 'stage_4_cv_deep_dive', label: 'CV Deep-Dive' },
    { key: 'stage_5_soft_skills', label: 'Soft Skills' },
  ],
  roleFamilies: [
    { key: 'backend', label: 'Backend' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'fullstack', label: 'Fullstack' },
    { key: 'devops', label: 'DevOps/SRE' },
    { key: 'data', label: 'Data' },
    { key: 'qa', label: 'QA' },
    { key: 'security', label: 'Security' },
  ],
  levels: [
    { key: 'junior', label: 'Junior' },
    { key: 'mid', label: 'Mid-level' },
    { key: 'senior', label: 'Senior' },
  ],
  types: [
    { key: 'behavioral', label: 'Behavioral' },
    { key: 'technical_depth', label: 'Technical Depth' },
    { key: 'trade_off', label: 'Trade-off' },
    { key: 'debugging', label: 'Debugging' },
    { key: 'cv_claim_verification', label: 'CV Claim Verification' },
    { key: 'situational', label: 'Situational' },
  ],
  competencies: [
    { key: 'ownership', label: 'Ownership' },
    { key: 'conflict_handling', label: 'Conflict Handling' },
    { key: 'learning_agility', label: 'Learning Agility' },
    { key: 'technical_fundamentals', label: 'Technical Fundamentals' },
    { key: 'trade_off_analysis', label: 'Trade-off Analysis' },
    { key: 'system_thinking', label: 'System Thinking' },
    { key: 'problem_solving', label: 'Problem Solving' },
    { key: 'communication', label: 'Communication' },
    { key: 'collaboration', label: 'Collaboration' },
    { key: 'impact_measurement', label: 'Impact Measurement' },
    { key: 'leadership', label: 'Leadership & Mentorship' },
  ],
  languages: [
    { key: 'vi', label: 'Vietnamese' },
    { key: 'en', label: 'English' },
    { key: 'ja', label: 'Japanese' },
  ],
  statuses: [
    { key: 'draft', label: 'Draft' },
    { key: 'in_review', label: 'In Review' },
    { key: 'active', label: 'Active' },
    { key: 'retired', label: 'Retired' },
    { key: 'needs_revision', label: 'Needs Revision' },
  ],
  followUpTriggers: [
    { key: 'missing_metric', label: 'Missing metric' },
    { key: 'missing_context', label: 'Missing context' },
    { key: 'missing_tradeoff', label: 'Missing trade-off' },
    { key: 'vague_answer', label: 'Vague answer' },
    {
      key: 'missing_personal_contribution',
      label: 'Missing personal contribution',
    },
    { key: 'missing_consequence', label: 'Missing consequence' },
    { key: 'missing_reflection', label: 'Missing reflection' },
  ],
  techTagGroups: [
    {
      group: 'frontend',
      tags: [
        'react',
        'vue',
        'angular',
        'nextjs',
        'javascript',
        'typescript',
        'redux',
        'tailwind',
        'accessibility',
        'browser_performance',
      ],
    },
    {
      group: 'backend',
      tags: [
        'nodejs',
        'nestjs',
        'express',
        'java',
        'spring_boot',
        'dotnet',
        'go',
        'python',
        'django',
        'fastapi',
        'rest',
        'graphql',
        'grpc',
      ],
    },
    {
      group: 'database_storage',
      tags: [
        'postgresql',
        'mysql',
        'mongodb',
        'redis',
        'elasticsearch',
        'schema_design',
        'indexing',
        'transaction',
        'consistency',
      ],
    },
    {
      group: 'messaging_async',
      tags: [
        'kafka',
        'rabbitmq',
        'bullmq',
        'sqs',
        'pubsub',
        'event_driven_architecture',
        'idempotency',
        'outbox_pattern',
      ],
    },
    {
      group: 'devops_sre',
      tags: [
        'docker',
        'kubernetes',
        'terraform',
        'github_actions',
        'prometheus',
        'grafana',
        'opentelemetry',
        'logging',
        'alerting',
        'rollback',
      ],
    },
    {
      group: 'cloud',
      tags: ['aws', 'gcp', 'azure', 'lambda', 'ecs', 'eks', 'iam', 'vpc'],
    },
    {
      group: 'data_ai',
      tags: [
        'airflow',
        'spark',
        'dbt',
        'bigquery',
        'snowflake',
        'pytorch',
        'tensorflow',
        'rag',
        'embeddings',
      ],
    },
    {
      group: 'qa_security',
      tags: [
        'jest',
        'vitest',
        'playwright',
        'cypress',
        'selenium',
        'contract_testing',
        'oauth2',
        'jwt',
        'owasp',
        'xss',
        'csrf',
        'sql_injection',
      ],
    },
  ],
};
