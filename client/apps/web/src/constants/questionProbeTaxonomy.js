export const QUESTION_PROBE_COMPETENCIES = [
  'ownership',
  'conflict_handling',
  'learning_agility',
  'technical_fundamentals',
  'trade_off_analysis',
  'system_thinking',
  'problem_solving',
  'communication',
  'collaboration',
  'impact_measurement',
];

const HUMANIZED_COMPETENCY_LABELS = Object.fromEntries(
  QUESTION_PROBE_COMPETENCIES.map((competency) => [
    competency,
    competency
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  ]),
);

export function getQuestionProbeCompetencyLabel(t, competency) {
  if (!competency) return '';

  return t(`questionBank.taxonomy.competencies.${competency}`, {
    defaultValue: HUMANIZED_COMPETENCY_LABELS[competency] ?? competency.replace(/_/g, ' '),
  });
}

export function getQuestionProbeCompetencyOptions(t) {
  return QUESTION_PROBE_COMPETENCIES.map((competency) => ({
    key: competency,
    label: getQuestionProbeCompetencyLabel(t, competency),
  }));
}
