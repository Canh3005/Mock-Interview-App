/**
 * SkillBreakdown — Individual skill progress bars
 */
import { useTranslation } from 'react-i18next'

function ScoreBar({ score, color }) {
  return (
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

export default function SkillBreakdown({ colSpan = '' }) {
  const { t } = useTranslation()
  
  const SKILLS = [
    { name: t('dashboard.skillBreakdown.skills.communication'),     score: 78, category: t('dashboard.skillBreakdown.categories.softSkill'),   color: 'bg-sky-400'    },
    { name: t('dashboard.skillBreakdown.skills.algorithms'),    score: 85, category: t('dashboard.skillBreakdown.categories.technical'),    color: 'bg-cta'        },
    { name: t('dashboard.skillBreakdown.skills.systemDesign'), score: 62, category: t('dashboard.skillBreakdown.categories.technical'),    color: 'bg-violet-400' },
    { name: t('dashboard.skillBreakdown.skills.problemSolving'), score: 90, category: t('dashboard.skillBreakdown.categories.technical'),  color: 'bg-cta'        },
    { name: t('dashboard.skillBreakdown.skills.behavioral'),    score: 70, category: t('dashboard.skillBreakdown.categories.softSkill'),   color: 'bg-amber-400'  },
    { name: t('dashboard.skillBreakdown.skills.codeQuality'),  score: 74, category: t('dashboard.skillBreakdown.categories.technical'),    color: 'bg-sky-400'    },
  ]
  
  return (
    <div className={[colSpan, 'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md'].join(' ')}>
      <div className="mb-5">
        <h2 className="font-heading text-base font-semibold text-white tracking-tight">{t('dashboard.skillBreakdown.title')}</h2>
        <p className="font-body text-xs text-slate-400 mt-0.5">{t('dashboard.skillBreakdown.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4">
        {SKILLS.map((skill) => (
          <div
            key={skill.name}
            className="group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-body text-sm font-medium text-slate-200 group-hover:text-white transition-colors duration-200">
                  {skill.name}
                </span>
                <span className="font-body text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                  {skill.category}
                </span>
              </div>
              <span className={`font-heading text-sm font-bold tabular-nums ${skill.score >= 80 ? 'text-cta' : skill.score >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                {skill.score}%
              </span>
            </div>
            <ScoreBar score={skill.score} color={skill.color} />
          </div>
        ))}
      </div>

      {/* Summary note */}
      <div className="mt-5 pt-4 border-t border-slate-700/60">
        <p className="font-body text-xs text-slate-500">
          {t('dashboard.skillBreakdown.basedOn')} <span className="text-slate-300 font-medium">12 {t('dashboard.skillBreakdown.sessions')}</span> {t('dashboard.skillBreakdown.in30Days')}
        </p>
      </div>
    </div>
  )
}
