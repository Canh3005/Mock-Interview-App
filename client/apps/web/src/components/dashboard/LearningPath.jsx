import { CheckCircle, Circle, PlayCircle, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STATUS_META = {
  done: { Icon: CheckCircle, iconClass: 'text-cta', trackClass: 'bg-cta' },
  active: { Icon: PlayCircle, iconClass: 'text-amber-500', trackClass: 'bg-amber-400' },
  pending: { Icon: Circle, iconClass: 'text-gray-400', trackClass: 'bg-gray-300' },
  locked: { Icon: Lock, iconClass: 'text-gray-300', trackClass: 'bg-gray-200' },
}

export default function LearningPath({ colSpan = '' }) {
  const { t } = useTranslation()

  const steps = [
    { id: 1, phase: t('dashboard.learningPath.phases.phase1'), title: t('dashboard.learningPath.phase1.title'), desc: t('dashboard.learningPath.phase1.desc'), status: 'done', progress: 100 },
    { id: 2, phase: t('dashboard.learningPath.phases.phase2'), title: t('dashboard.learningPath.phase2.title'), desc: t('dashboard.learningPath.phase2.desc'), status: 'active', progress: 58 },
    { id: 3, phase: t('dashboard.learningPath.phases.phase3'), title: t('dashboard.learningPath.phase3.title'), desc: t('dashboard.learningPath.phase3.desc'), status: 'pending', progress: 0 },
    { id: 4, phase: t('dashboard.learningPath.phases.phase4'), title: t('dashboard.learningPath.phase4.title'), desc: t('dashboard.learningPath.phase4.desc'), status: 'locked', progress: 0 },
  ]

  return (
    <div className={[colSpan, 'dash-card rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div className="mb-5">
        <h2 className="dash-card-title">{t('dashboard.learningPath.title')}</h2>
        <p className="dash-subtle mt-1 text-xs font-medium">2 / 4 {t('dashboard.learningPath.subtitle')}</p>
      </div>

      <div className="relative">
        <div className="dash-divider absolute bottom-5 left-4 top-5 w-px" aria-hidden="true" />

        <div className="flex flex-col gap-4">
          {steps.map((step) => {
            const { Icon, iconClass, trackClass } = STATUS_META[step.status]
            const isClickable = step.status === 'done' || step.status === 'active'

            return (
              <div
                key={step.id}
                className={['group relative pl-12', isClickable ? 'cursor-pointer' : 'cursor-default'].join(' ')}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <span className={[
                  'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--dash-surface-raised)] shadow-[var(--dash-shadow-control)] transition-colors duration-200',
                  isClickable ? 'group-hover:border-cta/40' : '',
                  iconClass,
                ].join(' ')}
                >
                  <Icon size={16} />
                </span>

                <div className={[
                  'dash-muted-panel rounded-[16px] border p-3.5 transition-all duration-200',
                  isClickable ? 'group-hover:bg-[var(--dash-surface-raised)]' : 'opacity-55',
                ].join(' ')}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="dash-subtle text-[10px] font-bold uppercase tracking-wide">{step.phase}</span>
                      <h3 className="dash-text truncate text-sm font-semibold">{step.title}</h3>
                    </div>
                    {step.progress > 0 && (
                      <span className={`text-xs font-bold ${step.status === 'done' ? 'text-cta' : 'text-amber-500'}`}>
                        {step.progress}%
                      </span>
                    )}
                  </div>
                  <p className="dash-muted mb-3 text-xs leading-relaxed">{step.desc}</p>
                  <div className="dash-progress-track h-1.5 overflow-hidden rounded-full">
                    <div className={`h-full rounded-full transition-all duration-500 ${trackClass}`} style={{ width: `${step.progress}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
