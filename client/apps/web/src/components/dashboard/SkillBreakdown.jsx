import { useTranslation } from 'react-i18next'

function ScoreBar({ score }) {
  return (
    <div className="dash-progress-track h-2 rounded-full">
      <div className="h-full rounded-full bg-cta transition-all duration-500" style={{ width: `${score}%` }} />
    </div>
  )
}

export default function SkillBreakdown({ colSpan = '', competencies = [], loading = false }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
        <div className="mb-7 space-y-2">
          <div className="dash-progress-track h-4 w-48 animate-pulse rounded" />
          <div className="dash-progress-track h-3 w-36 animate-pulse rounded opacity-70" />
        </div>
        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="flex justify-between">
                <div className="dash-progress-track h-3.5 w-32 animate-pulse rounded" />
                <div className="dash-progress-track h-3.5 w-10 animate-pulse rounded" />
              </div>
              <div className="dash-progress-track h-2 w-full animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (competencies.length === 0) {
    return (
      <div className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <h2 className="dash-card-title">{t('dashboard.skillAnalysis.title')}</h2>
            <p className="dash-subtle mt-1 text-xs font-medium">{t('dashboard.skillAnalysis.subtitle')}</p>
          </div>
        </div>
        <p className="dash-subtle text-sm">{t('dashboard.skillAnalysis.empty')}</p>
      </div>
    )
  }

  const skills = competencies.map((c) => ({ name: c.label, score: c.averageScore }))

  return (
    <div className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h2 className="dash-card-title">{t('dashboard.skillAnalysis.title')}</h2>
          <p className="dash-subtle mt-1 text-xs font-medium">{t('dashboard.skillAnalysis.subtitle')}</p>
        </div>
        <button className="dash-accent text-sm font-semibold transition-colors hover:opacity-80">
          {t('dashboard.skillAnalysis.viewAll')}
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {skills.map((skill) => (
          <div key={skill.name}>
            <div className="mb-2.5 flex items-end justify-between gap-4">
              <span className="dash-text text-sm font-semibold sm:text-base">
                {skill.name}
              </span>
              <span className="dash-text text-sm font-semibold tabular-nums">
                {skill.score}%
              </span>
            </div>
            <ScoreBar score={skill.score} />
          </div>
        ))}
      </div>
    </div>
  )
}
