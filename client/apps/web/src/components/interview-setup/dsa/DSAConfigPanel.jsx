import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Shuffle } from 'lucide-react'
import { setDsaProblemCount } from '../../../store/slices/interviewSetupSlice'

const COUNT_OPTIONS = [1, 2, 3]

export default function DSAConfigPanel() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { problemCount } = useSelector((s) => s.interviewSetup.dsaConfig)

  return (
    <div className="dash-muted-panel ml-0 mt-3 space-y-3 rounded-[16px] border p-4 sm:ml-12">
      <div>
        <p className="dash-subtle mb-2 text-xs font-semibold uppercase tracking-[0.08em]">
          {t('interviewSetup.dsaConfig.problemCount')}
        </p>
        <div className="flex flex-wrap gap-2">
          {COUNT_OPTIONS.map((count) => {
            const active = problemCount === count
            return (
              <button
                key={count}
                type="button"
                onClick={() => dispatch(setDsaProblemCount(count))}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-[12px] border text-sm font-bold transition-colors',
                  active ? 'dash-nav-active' : 'dash-nav-muted',
                ].join(' ')}
              >
                {count}
              </button>
            )
          })}
        </div>
      </div>

      <div className="dash-muted flex items-start gap-2 text-xs leading-relaxed">
        <Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('interviewSetup.dsaConfig.autoPick')}
      </div>
    </div>
  )
}
