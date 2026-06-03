import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Target, Swords, AlertTriangle, Globe } from 'lucide-react'
import { selectMode, proceedFromMode, selectLanguage } from '../../../store/slices/interviewSetupSlice'

const LANGUAGES = [
  {
    key: 'vi',
    labelKey: 'interviewSetup.languages.vi',
    badge: 'VI',
    badgeColor: 'bg-red-500/15 text-red-400',
    borderActive: 'border-red-500',
    ringActive: 'ring-red-500/30',
  },
  {
    key: 'en',
    labelKey: 'interviewSetup.languages.en',
    badge: 'EN',
    badgeColor: 'bg-sky-500/15 text-sky-400',
    borderActive: 'border-sky-500',
    ringActive: 'ring-sky-500/30',
  },
  {
    key: 'ja',
    labelKey: 'interviewSetup.languages.ja',
    badge: 'JA',
    badgeColor: 'bg-pink-500/15 text-pink-400',
    borderActive: 'border-pink-500',
    ringActive: 'ring-pink-500/30',
  },
]

const MODES = [
  {
    key: 'practice',
    Icon: Target,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    titleKey: 'interviewSetup.modes.practice.title',
    descriptionKey: 'interviewSetup.modes.practice.description',
    badgeKeys: ['interviewSetup.modes.practice.badge1', 'interviewSetup.modes.practice.badge2'],
    badgeColor: 'bg-sky-500/15 text-sky-400',
    borderActive: 'border-sky-500',
    ringActive: 'ring-sky-500/30',
  },
  {
    key: 'combat',
    Icon: Swords,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    titleKey: 'interviewSetup.modes.combat.title',
    descriptionKey: 'interviewSetup.modes.combat.description',
    badgeKeys: ['interviewSetup.modes.combat.badge1', 'interviewSetup.modes.combat.badge2'],
    badgeColor: 'bg-orange-500/15 text-orange-400',
    borderActive: 'border-orange-500',
    ringActive: 'ring-orange-500/30',
    warningKey: 'interviewSetup.modes.combat.warning',
  },
]

export default function ModeSelectionStep() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const selectedMode = useSelector((s) => s.interviewSetup.selectedMode)
  const selectedLanguage = useSelector((s) => s.interviewSetup.selectedLanguage)

  const canProceed = !!selectedMode

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">{t('interviewSetup.config.modeTitle')}</h2>
        <p className="text-slate-400 text-sm">{t('interviewSetup.config.modeDescription')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {MODES.map((mode) => {
          const isSelected = selectedMode === mode.key
          return (
            <button
              key={mode.key}
              onClick={() => dispatch(selectMode(mode.key))}
              className={[
                'w-full text-left rounded-xl border p-4 transition-all duration-200',
                'bg-slate-800/60 hover:bg-slate-800',
                isSelected
                  ? `${mode.borderActive} ring-2 ${mode.ringActive}`
                  : 'border-slate-700',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mode.iconBg}`}>
                  <mode.Icon className={`w-5 h-5 ${mode.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-white text-sm">{t(mode.titleKey)}</span>
                    {mode.badgeKeys.map((badgeKey) => (
                      <span
                        key={badgeKey}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${mode.badgeColor}`}
                      >
                        {t(badgeKey)}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{t(mode.descriptionKey)}</p>

                  {/* Combat warning — show when selected */}
                  {isSelected && mode.warningKey && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 inline mr-1.5" />
                      {t(mode.warningKey)}
                    </div>
                  )}
                </div>

                {/* Radio indicator */}
                <div
                  className={[
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 transition-colors',
                    isSelected
                      ? `${mode.borderActive} bg-current`
                      : 'border-slate-600',
                  ].join(' ')}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Language selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Globe className="w-3.5 h-3.5" />
          <span>{t('interviewSetup.config.languageTitle')}</span>
        </div>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.key
            return (
              <button
                key={lang.key}
                onClick={() => dispatch(selectLanguage(lang.key))}
                className={[
                  'flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all duration-200',
                  'bg-slate-800/60 hover:bg-slate-800',
                  isSelected
                    ? `${lang.borderActive} ring-2 ${lang.ringActive} text-white`
                    : 'border-slate-700 text-slate-400',
                ].join(' ')}
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold mr-1.5 ${lang.badgeColor}`}>
                  {lang.badge}
                </span>
                {t(lang.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <button
        disabled={!canProceed}
        onClick={() => dispatch(proceedFromMode())}
        className="w-full px-4 py-3 rounded-xl bg-cta hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
      >
        {t('interviewSetup.context.continue')}
      </button>
    </div>
  )
}
