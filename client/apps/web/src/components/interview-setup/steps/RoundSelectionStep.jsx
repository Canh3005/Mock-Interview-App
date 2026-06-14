import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CheckSquare,
  Clock,
  Globe,
  Lock,
  Network,
  ShieldCheck,
  Square,
  Swords,
  Target,
  Terminal,
  Users,
} from 'lucide-react'
import {
  selectLanguage,
  selectMode,
  toggleRound,
} from '../../../store/slices/interviewSetupSlice'
import DSAConfigPanel from '../dsa/DSAConfigPanel'
import SystemDesignConfigPanel from '../system-design/SystemDesignConfigPanel'
import BehavioralConfigPanel from '../behavioral/BehavioralConfigPanel'

const LANGUAGES = [
  { key: 'vi', badge: 'VI', labelKey: 'interviewSetup.languages.vi' },
  { key: 'en', badge: 'EN', labelKey: 'interviewSetup.languages.en' },
  { key: 'ja', badge: 'JA', labelKey: 'interviewSetup.languages.ja' },
]

const MODES = [
  {
    key: 'practice',
    Icon: Target,
    titleKey: 'interviewSetup.modes.practice.title',
    descriptionKey: 'interviewSetup.modes.practice.description',
    badgeKeys: ['interviewSetup.modes.practice.badge1', 'interviewSetup.modes.practice.badge2'],
    colorClass: 'text-sky-500',
  },
  {
    key: 'combat',
    Icon: Swords,
    titleKey: 'interviewSetup.modes.combat.title',
    descriptionKey: 'interviewSetup.modes.combat.description',
    badgeKeys: ['interviewSetup.modes.combat.badge1', 'interviewSetup.modes.combat.badge2'],
    warningKey: 'interviewSetup.modes.combat.warning',
    colorClass: 'text-orange-500',
  },
]

const ROUNDS = [
  {
    key: 'hr_behavioral',
    labelKey: 'interviewSetup.rounds.behavioral.label',
    descriptionKey: 'interviewSetup.rounds.behavioral.description',
    duration: 20,
    available: true,
    Icon: Users,
    colorClass: 'text-emerald-500',
  },
  {
    key: 'dsa',
    labelKey: 'interviewSetup.rounds.dsa.label',
    descriptionKey: 'interviewSetup.rounds.dsa.description',
    duration: 30,
    available: true,
    Icon: Terminal,
    colorClass: 'text-blue-500',
  },
  {
    key: 'ai_prompting',
    labelKey: 'interviewSetup.rounds.aiPrompting.label',
    descriptionKey: 'interviewSetup.rounds.aiPrompting.description',
    duration: 20,
    available: false,
    hidden: true,
    Icon: Bot,
    colorClass: 'text-green-500',
  },
  {
    key: 'system_design',
    labelKey: 'interviewSetup.rounds.systemDesign.label',
    descriptionKey: 'interviewSetup.rounds.systemDesign.description',
    duration: 45,
    available: true,
    Icon: Network,
    colorClass: 'text-amber-500',
  },
]

function getRoundDuration(round, dsaConfig, behavioralConfig, systemDesignConfig) {
  if (round.key === 'dsa') return dsaConfig.problemCount * round.duration
  if (round.key === 'hr_behavioral') return behavioralConfig.durationMinutes
  if (round.key === 'system_design') return systemDesignConfig.durationMinutes
  return round.duration
}

function ModeCard({ mode, selected, onSelect, t }) {
  const Icon = mode.Icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'dash-muted-panel w-full rounded-[18px] border p-4 text-left transition-all duration-200',
        selected
          ? 'border-cta bg-[var(--dash-surface-raised)] shadow-[var(--dash-shadow-control)] ring-2 ring-cta/20'
          : 'hover:border-[var(--dash-border-strong)] hover:bg-[var(--dash-surface-raised)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span className="dash-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border">
          <Icon className={`h-5 w-5 ${mode.colorClass}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <span className="dash-text text-sm font-bold">{t(mode.titleKey)}</span>
            {mode.badgeKeys.map((badgeKey) => (
              <span key={badgeKey} className="dash-badge rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                {t(badgeKey)}
              </span>
            ))}
          </span>
          <span className="dash-muted block text-xs leading-relaxed">{t(mode.descriptionKey)}</span>
          {selected && mode.warningKey && (
            <span className="mt-3 flex items-start gap-2 rounded-[14px] border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-relaxed text-orange-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t(mode.warningKey)}
            </span>
          )}
        </span>
        <span
          className={[
            'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-cta bg-cta text-[var(--dash-accent-contrast)]' : 'border-[var(--dash-border-strong)]',
          ].join(' ')}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
        </span>
      </div>
    </button>
  )
}

function RoundCard({ round, selected, disabled, displayDuration, onToggle, t }) {
  const Icon = round.Icon

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={[
          'dash-muted-panel w-full rounded-[18px] border p-4 text-left transition-all duration-200',
          disabled
            ? 'cursor-not-allowed opacity-55'
            : selected
              ? 'border-cta bg-[var(--dash-surface-raised)] shadow-[var(--dash-shadow-control)] ring-1 ring-cta/30'
              : 'hover:border-[var(--dash-border-strong)] hover:bg-[var(--dash-surface-raised)]',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <span className="dash-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border">
            <Icon className={`h-5 w-5 ${round.colorClass}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex flex-wrap items-center gap-2">
              <span className="dash-text text-sm font-bold">{t(round.labelKey)}</span>
              <span className="dash-subtle inline-flex items-center gap-1 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {t('interviewSetup.config.minutes', { minutes: displayDuration })}
              </span>
              {!round.available && (
                <span className="dash-badge inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                  <Lock className="h-3 w-3" />
                  {t('interviewSetup.config.comingSoon')}
                </span>
              )}
            </span>
            <span className="dash-muted block text-xs leading-relaxed">{t(round.descriptionKey)}</span>
          </span>
          <span className="mt-1 shrink-0">
            {disabled ? (
              <Square className="h-4 w-4 text-[var(--dash-subtle)]" />
            ) : selected ? (
              <CheckSquare className="h-4 w-4 text-cta" />
            ) : (
              <Square className="h-4 w-4 text-[var(--dash-muted)]" />
            )}
          </span>
        </div>
      </button>

      {round.key === 'hr_behavioral' && selected && <BehavioralConfigPanel />}
      {round.key === 'dsa' && selected && <DSAConfigPanel />}
      {round.key === 'system_design' && selected && <SystemDesignConfigPanel />}
    </div>
  )
}

export default function RoundSelectionStep({ onStart }) {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const {
    selectedRounds,
    selectedMode,
    selectedLanguage,
    dsaConfig,
    systemDesignConfig,
    behavioralConfig,
  } = useSelector((s) => s.interviewSetup)

  const effectiveMode = selectedMode || 'practice'
  const visibleRounds = ROUNDS.filter((round) => !round.hidden)
  const estimatedTotal = selectedRounds.reduce((sum, key) => {
    const round = ROUNDS.find((item) => item.key === key)
    if (!round) return sum
    return sum + getRoundDuration(round, dsaConfig, behavioralConfig, systemDesignConfig)
  }, 0)
  const canStart = selectedRounds.length > 0

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.5fr)]">
      <section className="space-y-5">
        <div className="dash-card rounded-[22px] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">
                {t('interviewSetup.config.modeStep')}
              </p>
              <h2 className="dash-card-title mt-1">{t('interviewSetup.config.modeTitle')}</h2>
              <p className="dash-muted mt-1 text-sm">
                {t('interviewSetup.config.modeDescription')}
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-cta" />
          </div>

          <div className="space-y-3">
            {MODES.map((mode) => (
              <ModeCard
                key={mode.key}
                mode={mode}
                selected={effectiveMode === mode.key}
                onSelect={() => dispatch(selectMode(mode.key))}
                t={t}
              />
            ))}
          </div>
        </div>

        <div className="dash-card rounded-[22px] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-cta" />
            <h3 className="dash-text text-sm font-bold">{t('interviewSetup.config.languageTitle')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((language) => {
              const active = selectedLanguage === language.key
              return (
                <button
                  key={language.key}
                  type="button"
                  onClick={() => dispatch(selectLanguage(language.key))}
                  className={[
                    'rounded-[14px] border px-3 py-2 text-sm font-semibold transition-colors',
                    active ? 'dash-nav-active' : 'dash-nav-muted',
                  ].join(' ')}
                >
                  <span className="mr-1.5 text-[11px]">{language.badge}</span>
                  {t(language.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="dash-card flex min-h-0 flex-col rounded-[22px] p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">
              {t('interviewSetup.config.roundStep')}
            </p>
            <h2 className="dash-card-title mt-1">{t('interviewSetup.config.roundTitle')}</h2>
            <p className="dash-muted mt-1 text-sm">
              {t('interviewSetup.config.roundDescription')}
            </p>
          </div>
          <span
            className={[
              'dash-badge inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
              effectiveMode === 'combat' ? 'text-orange-500' : 'text-sky-500',
            ].join(' ')}
          >
            {effectiveMode === 'combat' ? <Swords className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
            {t(`interviewSetup.modes.${effectiveMode}.title`)}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-3">
          {visibleRounds.map((round) => {
            const selected = selectedRounds.includes(round.key)
            const disabled = !round.available
            const displayDuration = getRoundDuration(round, dsaConfig, behavioralConfig, systemDesignConfig)

            return (
              <RoundCard
                key={round.key}
                round={round}
                selected={selected}
                disabled={disabled}
                displayDuration={displayDuration}
                onToggle={() => !disabled && dispatch(toggleRound(round.key))}
                t={t}
              />
            )
          })}
        </div>

        <div className="dash-surface mt-5 flex flex-col gap-3 rounded-[18px] border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">
              {t('interviewSetup.config.totalTime')}
            </p>
            <p className="dash-text text-lg font-bold">
              {estimatedTotal > 0
                ? t('interviewSetup.config.estimatedMinutes', { minutes: estimatedTotal })
                : t('interviewSetup.config.noRounds')}
            </p>
          </div>
          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {effectiveMode === 'combat'
              ? t('interviewSetup.config.checkDevices')
              : t('interviewSetup.config.start')}
          </button>
        </div>
      </section>
    </div>
  )
}
