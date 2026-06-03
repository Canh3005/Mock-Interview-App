export const STAGE_NAMES: Record<number, string> = {
  1: 'Culture Fit',
  2: 'Tech Stack Deep-Dive',
  3: 'Domain Knowledge',
  4: 'CV-based Q&A',
  5: 'Soft Skills',
  6: 'Reverse Interview',
};

export const ROUND_DURATIONS: Record<string, number> = {
  hr_behavioral: 20,
  dsa: 30,
  ai_prompting: 20,
  system_design: 30,
};

// TODO: re-enable when credit gate is active
// const ROUND_CREDIT_COST: Record<string, number> = {
//   hr_behavioral: 4,
//   dsa: 3,
//   system_design: 8,
//   ai_prompting: 2,
// };

export const LOW_BALANCE_THRESHOLD = 5;
