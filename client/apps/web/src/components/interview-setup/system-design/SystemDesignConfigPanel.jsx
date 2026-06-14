import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Globe, Zap } from 'lucide-react'
import { setSystemDesignConfig } from '../../../store/slices/interviewSetupSlice'
import ToggleSwitch from '../../shared/ui/ToggleSwitch'

const DURATION_OPTIONS = [45, 60]

const LANGUAGE_KEYS = {
  vi: 'interviewSetup.languages.vi',
  en: 'interviewSetup.languages.en',
  ja: 'interviewSetup.languages.ja',
}

export default function SystemDesignConfigPanel() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { durationMinutes, enableCurveball } = useSelector((state) => state.interviewSetup.systemDesignConfig)
  const selectedLanguage = useSelector((state) => state.interviewSetup.selectedLanguage)

  return (
    <div className="dash-muted-panel ml-0 mt-3 space-y-4 rounded-[16px] border p-4 sm:ml-12">
      <div>
        <p className="dash-subtle mb-2 text-xs font-semibold uppercase tracking-[0.08em]">
          {t('interviewSetup.systemDesignConfig.duration')}
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((minutes) => {
            const active = durationMinutes === minutes
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => dispatch(setSystemDesignConfig({ durationMinutes: minutes }))}
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="dash-text text-sm font-semibold">{t('interviewSetup.systemDesignConfig.curveball')}</span>
        </div>
        <ToggleSwitch
          checked={enableCurveball}
          onChange={(value) => dispatch(setSystemDesignConfig({ enableCurveball: value }))}
        />
      </div>

      <div className="dash-muted flex items-center gap-2 text-xs">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        {t('interviewSetup.systemDesignConfig.language', {
          language: t(LANGUAGE_KEYS[selectedLanguage] ?? LANGUAGE_KEYS.vi),
        })}
      </div>
    </div>
  )
}
