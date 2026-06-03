import { useTranslation } from 'react-i18next';

const BREAKDOWN_ITEMS = [
  ['mustHaveSkillCoverage', 'mustHaveSkillCoverage'],
  ['roleResponsibilityFit', 'roleResponsibilityFit'],
  ['experienceLevelFit', 'experienceLevelFit'],
  ['evidenceQuality', 'evidenceQuality'],
  ['transferableExperience', 'transferableExperience'],
  ['niceToHaveCoverage', 'niceToHaveCoverage'],
  ['domainFit', 'domainFit'],
];

const GAP_GROUPS = [
  ['missingRequiredSkills', 'missingRequiredSkills'],
  ['weakEvidence', 'weakEvidence'],
  ['levelMismatch', 'levelMismatch'],
  ['transferableButNotDirect', 'transferableButNotDirect'],
];

function MiniBar({ value }) {
  const score = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-cta" style={{ width: `${score}%` }} />
      </div>
      <span className="w-9 text-right text-[11px] text-slate-400">{score}%</span>
    </div>
  );
}

function GapList({ title, gaps }) {
  if (!gaps?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-300 mb-1">{title}</p>
      <ul className="space-y-1">
        {gaps.map((gap, index) => (
          <li key={`${gap.label}-${index}`} className="text-xs text-slate-400">
            <span className="text-slate-200">{gap.label}</span>
            {gap.practiceSuggestion || gap.explanation ? (
              <span> - {gap.practiceSuggestion || gap.explanation}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FitAssessmentSummary({ summary }) {
  const { t } = useTranslation();

  if (!summary) return null;

  const groupedGaps = summary.groupedGaps ?? {};
  const hasAnyGap = GAP_GROUPS.some(([key]) => groupedGaps[key]?.length > 0);

  return (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-200">{t('profile.fit.title')}</h4>
        {summary.confidence && (
          <span className="text-[11px] px-2 py-0.5 rounded border border-slate-700 text-slate-400">
            {t('profile.fit.confidence', { value: summary.confidence })}
          </span>
        )}
      </div>

      {summary.headline && <p className="text-xs text-slate-400">{summary.headline}</p>}

      <div className="grid gap-2">
        {BREAKDOWN_ITEMS.map(([key, labelKey]) => (
          <div key={key} className="grid grid-cols-[130px_1fr] items-center gap-2">
            <span className="text-xs text-slate-400">{t(`profile.fit.breakdown.${labelKey}`)}</span>
            <MiniBar value={summary.scoreBreakdown?.[key]} />
          </div>
        ))}
        {summary.scoreBreakdown?.riskPenalty > 0 && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[130px_1fr] items-center gap-2">
              <span className="text-xs text-red-400">{t('profile.fit.riskDeductions')}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${Math.min(100, (summary.scoreBreakdown.riskPenalty / 30) * 100)}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] text-red-400">
                  -{summary.scoreBreakdown.riskPenalty}
                </span>
              </div>
            </div>
            {summary.riskFlags?.length > 0 && (
              <ul className="pl-[138px] space-y-1">
                {summary.riskFlags.map((flag, i) => (
                  <li key={i} className="text-[11px] text-red-400/80 leading-relaxed">
                    <span className={`font-semibold mr-1 ${flag.severity === 'high' ? 'text-red-400' : flag.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'}`}>
                      [{t(`profile.fit.severity.${flag.severity}`, flag.severity)}]
                    </span>
                    {flag.explanation}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {hasAnyGap ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">{t('profile.fit.whatToImprove')}</p>
          {GAP_GROUPS.map(([key, labelKey]) => (
            <GapList key={key} title={t(`profile.fit.gaps.${labelKey}`)} gaps={groupedGaps[key]} />
          ))}
        </div>
      ) : (
        summary.strengths?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-1">{t('profile.fit.strengths')}</p>
            <ul className="list-disc pl-4 space-y-1">
              {summary.strengths.map((strength, index) => (
                <li key={index} className="text-xs text-slate-400">
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      <p className="text-[11px] text-slate-500">
        {t('profile.fit.note')}
      </p>
    </div>
  );
}
