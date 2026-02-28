/**
 * LearningPath — Roadmap showing learning steps with progress
 */
import { CheckCircle, Circle, PlayCircle, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STATUS_META = {
  done:    { Icon: CheckCircle, iconClass: 'text-cta',        trackClass: 'bg-cta'        },
  active:  { Icon: PlayCircle,  iconClass: 'text-amber-400',  trackClass: 'bg-amber-400'  },
  pending: { Icon: Circle,      iconClass: 'text-slate-500',  trackClass: 'bg-slate-600'  },
  locked:  { Icon: Lock,        iconClass: 'text-slate-600',  trackClass: 'bg-slate-700'  },
}

export default function LearningPath({ colSpan = '' }) {
  const { t } = useTranslation()
  
  const STEPS = [
    {
      id: 1,
      phase: t('dashboard.learningPath.phases.phase1'),
      title: t('dashboard.learningPath.phase1.title'),
      desc: t('dashboard.learningPath.phase1.desc'),
      status: 'done',
      progress: 100,
    },
    {
      id: 2,
      phase: t('dashboard.learningPath.phases.phase2'),
      title: t('dashboard.learningPath.phase2.title'),
      desc: t('dashboard.learningPath.phase2.desc'),
      status: 'active',
      progress: 58,
    },
    {
      id: 3,
      phase: t('dashboard.learningPath.phases.phase3'),
      title: t('dashboard.learningPath.phase3.title'),
      desc: t('dashboard.learningPath.phase3.desc'),
      status: 'pending',
      progress: 0,
    },
    {
      id: 4,
      phase: t('dashboard.learningPath.phases.phase4'),
      title: t('dashboard.learningPath.phase4.title'),
      desc: t('dashboard.learningPath.phase4.desc'),
      status: 'locked',
      progress: 0,
    },
  ]
  return (
    <div className={[colSpan, 'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md'].join(' ')}>
      <div className="mb-5">
        <h2 className="font-heading text-base font-semibold text-white tracking-tight">{t('dashboard.learningPath.title')}</h2>
        <p className="font-body text-xs text-slate-400 mt-0.5">2 / 4 {t('dashboard.learningPath.subtitle')}</p>
      </div>

      <div className="relative">
        {/* Vertical line connector */}
        <div className="absolute left-4 top-5 bottom-5 w-px bg-slate-700/60" aria-hidden="true" />

        <div className="flex flex-col gap-5">
          {STEPS.map((step) => {
            const { Icon, iconClass, trackClass } = STATUS_META[step.status]
            const isClickable = step.status === 'done' || step.status === 'active'

            return (
              <div
                key={step.id}
                className={[
                  'relative pl-12 group',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                {/* Icon bubble */}
                <span
                  className={[
                    'absolute left-0 top-0 flex items-center justify-center w-8 h-8 rounded-full',
                    'bg-slate-800 border border-slate-700 transition-colors duration-200',
                    isClickable ? 'group-hover:border-cta/50' : '',
                    iconClass,
                  ].join(' ')}
                >
                  <Icon size={16} />
                </span>

                {/* Content */}
                <div
                  className={[
                    'bg-slate-800/60 border border-slate-700/60 rounded-xl p-4',
                    'transition-all duration-200',
                    isClickable ? 'group-hover:border-slate-600 group-hover:bg-slate-800/80' : 'opacity-60',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="font-body text-[10px] text-slate-500 uppercase tracking-wider">{step.phase}</span>
                      <h3 className="font-heading text-sm font-semibold text-white">{step.title}</h3>
                    </div>
                    {step.progress > 0 && (
                      <span className={`font-heading text-xs font-bold ${step.status === 'done' ? 'text-cta' : 'text-amber-400'}`}>
                        {step.progress}%
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-slate-400 mb-3">{step.desc}</p>

                  {/* Progress bar */}
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${trackClass}`}
                      style={{ width: `${step.progress}%` }}
                    />
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
