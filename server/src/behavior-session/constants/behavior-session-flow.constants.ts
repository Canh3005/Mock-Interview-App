import type {
  QuestionProbeLanguage,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';

export const STAGE_DISPLAY_NAMES: Record<
  QuestionProbeStage,
  Record<QuestionProbeLanguage, string>
> = {
  stage_1_culture_fit: {
    vi: 'Văn hoá & Định hướng',
    en: 'Culture Fit & Alignment',
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
