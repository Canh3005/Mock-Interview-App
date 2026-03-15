type LocaleSignals = Record<string, string[]>;

const flattenSignals = (signalsByLocale: LocaleSignals): string[] =>
  Array.from(new Set(Object.values(signalsByLocale).flat()));

export const CV_SIGNALS_BY_LOCALE: LocaleSignals = {
  en: [
    'resume',
    'curriculum vitae',
    'work experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'linkedin',
  ],
  vi: [
    'sơ yếu lý lịch',
    'hồ sơ xin việc',
    'kinh nghiệm làm việc',
    'học vấn',
    'kỹ năng',
    'dự án',
    'chứng chỉ',
    'so yeu ly lich',
    'ho so xin viec',
    'kinh nghiem lam viec',
    'hoc van',
    'ky nang',
    'du an',
    'chung chi',
  ],
  es: [
    'curriculum',
    'experiencia laboral',
    'formacion academica',
    'habilidades',
  ],
  fr: ['cv', 'experience professionnelle', 'formation', 'competences'],
  de: ['lebenslauf', 'berufserfahrung', 'ausbildung', 'fahigkeiten'],
};

export const JD_SIGNALS_BY_LOCALE: LocaleSignals = {
  en: [
    'job description',
    'responsibilities',
    'requirements',
    'qualifications',
    'candidate',
    'hiring',
    'role overview',
    'nice to have',
  ],
  vi: [
    'mô tả công việc',
    'trách nhiệm',
    'yêu cầu',
    'tuyển dụng',
    'ứng viên',
    'quyền lợi',
    'mo ta cong viec',
    'trach nhiem',
    'yeu cau',
    'tuyen dung',
    'ung vien',
    'quyen loi',
  ],
  es: [
    'descripcion del puesto',
    'responsabilidades',
    'requisitos',
    'perfil del candidato',
  ],
  fr: ['description du poste', 'missions', 'exigences', 'profil du candidat'],
  de: ['stellenbeschreibung', 'aufgaben', 'anforderungen', 'kandidatenprofil'],
};

export const CV_SIGNALS: string[] = flattenSignals(CV_SIGNALS_BY_LOCALE);
export const JD_SIGNALS: string[] = flattenSignals(JD_SIGNALS_BY_LOCALE);
