import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Layers, Zap } from 'lucide-react'
import { setBehavioralConfig } from '../../../store/slices/interviewSetupSlice'

const DEPTH_OPTIONS = [
  {
    value: 'broad',
    labelKey: 'interviewSetup.behavioralConfig.broad',
    icon: Layers,
    hintKey: 'interviewSetup.behavioralConfig.broadHint',
  },
  {
    value: 'deep',
    labelKey: 'interviewSetup.behavioralConfig.deep',
    icon: Zap,
    hintKey: 'interviewSetup.behavioralConfig.deepHint',
  },
]

const DURATION_OPTIONS = [30, 45, 60, 75, 90]

export default function BehavioralConfigPanel() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { depth, durationMinutes } = useSelector((s) => s.interviewSetup.behavioralConfig)

  return (
    <div className="dash-muted-panel ml-0 mt-3 space-y-4 rounded-[16px] border p-4 sm:ml-12">
      <div>
        <p className="dash-subtle mb-2 text-xs font-semibold uppercase tracking-[0.08em]">
          {t('interviewSetup.behavioralConfig.strategy')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DEPTH_OPTIONS.map(({ value, labelKey, icon: Icon, hintKey }) => {
            const active = depth === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => dispatch(setBehavioralConfig({ depth: value }))}
                title={t(hintKey)}
                className={[
                  'inline-flex h-9 items-center gap-1.5 rounded-[12px] border px-3 text-xs font-bold transition-colors',
                  active ? 'dash-nav-active' : 'dash-nav-muted',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="dash-subtle mb-2 text-xs font-semibold uppercase tracking-[0.08em]">
          {t('interviewSetup.behavioralConfig.duration')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((minutes) => {
            const active = durationMinutes === minutes
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => dispatch(setBehavioralConfig({ durationMinutes: minutes }))}
                className={[
                  'h-9 rounded-[12px] border px-3 text-xs font-bold transition-colors',
                  active ? 'dash-nav-active' : 'dash-nav-muted',
                ].join(' ')}
              >
                {t('interviewSetup.behavioralConfig.minutes', { minutes })}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
