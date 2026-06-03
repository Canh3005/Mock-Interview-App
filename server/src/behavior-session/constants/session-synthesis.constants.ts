import type {
  QuestionProbeLanguage,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';

export const STAGE_LABELS: Record<
  QuestionProbeStage,
  Record<QuestionProbeLanguage, string>
> = {
  stage_1_culture_fit: {
    vi: 'Văn hoá & Định hướng',
    en: 'Culture Fit',
    ja: 'カルチャーフィット',
  },
  stage_2_tech_stack: {
    vi: 'Tech Stack chuyên sâu',
    en: 'Tech Stack Deep-Dive',
    ja: 'テックスタック',
  },
  stage_3_domain_knowledge: {
    vi: 'Kiến thức Domain',
    en: 'Domain Knowledge',
    ja: 'ドメイン知識',
  },
  stage_4_cv_deep_dive: {
    vi: 'Thực chiến CV',
    en: 'CV Deep-Dive',
    ja: 'CV詳細確認',
  },
  stage_5_soft_skills: {
    vi: 'Kỹ năng mềm',
    en: 'Soft Skills',
    ja: 'ソフトスキル',
  },
  stage_6_reverse_interview: {
    vi: 'Phỏng vấn ngược',
    en: 'Reverse Interview',
    ja: 'リバースインタビュー',
  },
};

export const COMPETENCY_LABELS: Record<string, string> = {
  ownership: 'Ownership',
  conflict_handling: 'Conflict Handling',
  learning_agility: 'Learning Agility',
  technical_fundamentals: 'Technical Fundamentals',
  trade_off_analysis: 'Trade-off Analysis',
  system_thinking: 'System Thinking',
  problem_solving: 'Problem Solving',
  communication: 'Communication',
  collaboration: 'Collaboration',
  impact_measurement: 'Impact Measurement',
};
