import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Play,
  Upload,
} from 'lucide-react'
import { ROUTES } from '../../router/routes'
import {
  clearCreditError,
  initSessionRequest,
  preflightRequest,
  proceedFromRoundSelect,
  resetSetup,
  saveContextRequest,
} from '../../store/slices/interviewSetupSlice'
import { resetBehavioral } from '../../store/slices/behavioralSlice'
import { resetDSASession, startDSARound } from '../../store/slices/dsaSessionSlice'
import { resetSDSession } from '../../store/slices/sdSessionSlice'
import { resetInterviewer } from '../../store/slices/sdInterviewerSlice'
import CombatPermissionGate from './steps/CombatPermissionGate'
import RoundSelectionStep from './steps/RoundSelectionStep'
import InsufficientCreditModal from './InsufficientCreditModal'

const inputClass =
  'dash-input w-full rounded-[14px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cta/30'
const labelClass = 'dash-subtle mb-1 block text-xs font-semibold uppercase tracking-[0.06em]'

function splitTrim(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function LoadingScreen({ message }) {
  return (
    <div className="dash-card flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[22px] p-8 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-cta" />
      <p className="dash-muted text-sm">{message}</p>
    </div>
  )
}

function SkeletonBlock({ className = '' }) {
  return (
    <span
      className={[
        'block rounded-full bg-[var(--dash-border)]/80 motion-safe:animate-pulse',
        className,
      ].join(' ')}
    />
  )
}

function ContextSkeletonCard({ icon: Icon, title, rows = 4 }) {
  return (
    <section className="dash-card overflow-hidden rounded-[22px]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="flex min-w-0 items-center gap-3">
          <span className="dash-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border">
            <Icon className="h-5 w-5 text-cta" />
          </span>
          <span className="min-w-0">
            <SkeletonBlock className="mb-2 h-2.5 w-28" />
            <span className="dash-text block truncate text-base font-bold">{title}</span>
          </span>
        </span>
        <SkeletonBlock className="h-5 w-5 rounded-md" />
      </div>
      <div className="dash-border space-y-4 border-t p-5" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className={index % 2 === 0 ? 'h-2.5 w-24' : 'h-2.5 w-36'} />
            <SkeletonBlock className="h-10 w-full rounded-[14px]" />
          </div>
        ))}
      </div>
    </section>
  )
}

function PreflightSkeleton({ message }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5" aria-busy="true">
      <div className="dash-surface rounded-[22px] border p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="dash-text text-xl font-bold">{t('interviewSetup.context.title')}</h2>
            <p className="dash-muted mt-2 max-w-3xl text-sm leading-relaxed">{message}</p>
          </div>
          <SkeletonBlock className="h-10 w-32 rounded-[14px]" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ContextSkeletonCard icon={FileText} title={t('interviewSetup.context.cvTitle')} rows={5} />
        <ContextSkeletonCard icon={Briefcase} title={t('interviewSetup.context.jdTitle')} rows={4} />
      </div>

      <div className="dash-surface flex flex-col gap-3 rounded-[22px] border p-4 shadow-shell sm:flex-row sm:items-center sm:justify-between">
        <SkeletonBlock className="h-3 w-full max-w-lg" />
        <SkeletonBlock className="h-11 w-32 shrink-0 rounded-[14px]" />
      </div>
    </div>
  )
}

function ErrorPanel({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="dash-card flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[22px] p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-red-500/30 bg-red-500/10 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h2 className="dash-text text-lg font-bold">{t('interviewSetup.preflightError.title')}</h2>
        <p className="dash-muted mt-2 max-w-md text-sm leading-relaxed">
          {message || t('interviewSetup.preflightError.fallback')}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-sm font-bold"
      >
        {t('interviewSetup.preflightError.retry')}
      </button>
    </div>
  )
}

function MissingContextPanel({ missing, onGoUpload, onCancel }) {
  const { t } = useTranslation()
  const labels = { cv_context: 'CV', jd_context: 'JD' }
  const missingText = missing.map((key) => labels[key] ?? key).join(` ${t('common.and')} `)

  return (
    <div className="dash-card rounded-[22px] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-amber-500/30 bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h2 className="dash-text text-xl font-bold">{t('interviewSetup.missingContext.title')}</h2>
          <p className="dash-muted mt-2 max-w-2xl text-sm leading-relaxed">
            {t('interviewSetup.missingContext.body', { missing: missingText })}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="dash-control inline-flex h-11 items-center justify-center rounded-[14px] border px-5 text-sm font-bold"
        >
          {t('interviewSetup.missingContext.backDashboard')}
        </button>
        <button
          type="button"
          onClick={onGoUpload}
          className="dash-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-bold"
        >
          <Upload className="h-4 w-4" />
          {t('interviewSetup.missingContext.upload')}
        </button>
      </div>
    </div>
  )
}

function ContextSection({ icon: Icon, title, expanded, onToggle, children }) {
  return (
    <section className="dash-card overflow-hidden rounded-[22px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--dash-surface-muted)]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="dash-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border">
            <Icon className="h-5 w-5 text-cta" />
          </span>
          <span className="min-w-0">
            <span className="dash-text block truncate text-base font-bold">{title}</span>
          </span>
        </span>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0 dash-muted" /> : <ChevronDown className="h-5 w-5 shrink-0 dash-muted" />}
      </button>
      {expanded && <div className="dash-border border-t p-5">{children}</div>}
    </section>
  )
}

function ContextConfirmPanel({ cv, jd, onConfirm, onGoUpload }) {
  const { t } = useTranslation()
  const [cvExpanded, setCvExpanded] = useState(true)
  const [jdExpanded, setJdExpanded] = useState(true)
  const [skills, setSkills] = useState((Array.isArray(cv?.skills) ? cv.skills : []).join(', '))
  const [experiences, setExperiences] = useState(
    (Array.isArray(cv?.experience) ? cv.experience : []).map((item) => ({
      title: item.title ?? '',
      company: item.company ?? '',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities : [],
    })),
  )
  const [jdForm, setJdForm] = useState({
    role: jd?.role ?? '',
    required_skills: (Array.isArray(jd?.required_skills) ? jd.required_skills : []).join(', '),
    minimum_experience_years: jd?.minimum_experience_years ?? '',
    key_responsibilities: (Array.isArray(jd?.key_responsibilities) ? jd.key_responsibilities : []).join('\n'),
  })

  const handleConfirm = () => {
    onConfirm(
      {
        ...cv,
        skills: splitTrim(skills),
        experience: experiences.map((item) => ({ ...item })),
      },
      {
        ...jd,
        role: jdForm.role,
        required_skills: splitTrim(jdForm.required_skills),
        minimum_experience_years: jdForm.minimum_experience_years
          ? Number(jdForm.minimum_experience_years)
          : undefined,
        key_responsibilities: jdForm.key_responsibilities
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="dash-surface rounded-[22px] border p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="dash-text text-xl font-bold">{t('interviewSetup.context.title')}</h2>
            <p className="dash-muted mt-2 max-w-3xl text-sm leading-relaxed">
              {t('interviewSetup.context.description')}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoUpload}
            className="dash-control inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-bold"
          >
            <Upload className="h-4 w-4" />
            {t('interviewSetup.context.uploadAgain')}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ContextSection
          icon={FileText}
          title={t('interviewSetup.context.cvTitle')}
          expanded={cvExpanded}
          onToggle={() => setCvExpanded((value) => !value)}
        >
          <div className="space-y-5">
            <div>
              <label className={labelClass}>{t('interviewSetup.context.skills')}</label>
              <input
                className={inputClass}
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                placeholder={t('interviewSetup.context.skillsPlaceholder')}
              />
            </div>

            <div>
              <p className="dash-subtle mb-3 text-xs font-semibold uppercase tracking-[0.08em]">
                {t('interviewSetup.context.experience')}
              </p>
              {experiences.length > 0 ? (
                <div className="space-y-3">
                  {experiences.map((experience, index) => (
                    <div key={`${experience.company}-${index}`} className="dash-muted-panel rounded-[16px] border p-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_96px_96px]">
                        <div>
                          <label className={labelClass}>{t('interviewSetup.context.position')}</label>
                          <input
                            className={inputClass}
                            value={experience.title}
                            onChange={(event) => {
                              const next = [...experiences]
                              next[index] = { ...next[index], title: event.target.value }
                              setExperiences(next)
                            }}
                            placeholder={t('interviewSetup.context.positionPlaceholder')}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{t('interviewSetup.context.company')}</label>
                          <input
                            className={inputClass}
                            value={experience.company}
                            onChange={(event) => {
                              const next = [...experiences]
                              next[index] = { ...next[index], company: event.target.value }
                              setExperiences(next)
                            }}
                            placeholder={t('interviewSetup.context.companyPlaceholder')}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{t('interviewSetup.context.from')}</label>
                          <input
                            className={inputClass}
                            value={experience.startDate}
                            onChange={(event) => {
                              const next = [...experiences]
                              next[index] = { ...next[index], startDate: event.target.value }
                              setExperiences(next)
                            }}
                            placeholder="2022-01"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{t('interviewSetup.context.to')}</label>
                          <input
                            className={inputClass}
                            value={experience.endDate}
                            onChange={(event) => {
                              const next = [...experiences]
                              next[index] = { ...next[index], endDate: event.target.value }
                              setExperiences(next)
                            }}
                            placeholder="2024-06"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dash-muted text-sm">{t('interviewSetup.context.emptyExperience')}</p>
              )}
            </div>
          </div>
        </ContextSection>

        <ContextSection
          icon={Briefcase}
          title={t('interviewSetup.context.jdTitle')}
          expanded={jdExpanded}
          onToggle={() => setJdExpanded((value) => !value)}
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{t('interviewSetup.context.role')}</label>
              <input
                className={inputClass}
                value={jdForm.role}
                onChange={(event) => setJdForm((form) => ({ ...form, role: event.target.value }))}
                placeholder={t('interviewSetup.context.rolePlaceholder')}
              />
            </div>
            <div>
              <label className={labelClass}>{t('interviewSetup.context.requiredSkills')}</label>
              <input
                className={inputClass}
                value={jdForm.required_skills}
                onChange={(event) => setJdForm((form) => ({ ...form, required_skills: event.target.value }))}
                placeholder={t('interviewSetup.context.requiredSkillsPlaceholder')}
              />
            </div>
            <div>
              <label className={labelClass}>{t('interviewSetup.context.minimumExperience')}</label>
              <input
                type="number"
                min="0"
                max="20"
                className={`${inputClass} max-w-32`}
                value={jdForm.minimum_experience_years}
                onChange={(event) => setJdForm((form) => ({ ...form, minimum_experience_years: event.target.value }))}
                placeholder="2"
              />
            </div>
            <div>
              <label className={labelClass}>{t('interviewSetup.context.responsibilities')}</label>
              <textarea
                rows={6}
                className={`${inputClass} resize-none`}
                value={jdForm.key_responsibilities}
                onChange={(event) => setJdForm((form) => ({ ...form, key_responsibilities: event.target.value }))}
                placeholder={t('interviewSetup.context.responsibilitiesPlaceholder')}
              />
            </div>
          </div>
        </ContextSection>
      </div>

      <div className="dash-surface sticky bottom-0 z-10 flex flex-col gap-3 rounded-[22px] border p-4 shadow-shell sm:flex-row sm:items-center sm:justify-between">
        <p className="dash-muted text-sm">
          {t('interviewSetup.context.note')}
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="dash-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-bold"
        >
          <Play className="h-4 w-4" />
          {t('interviewSetup.context.continue')}
        </button>
      </div>
    </div>
  )
}

export default function InterviewSetupFlow() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    step,
    missing,
    cv,
    jd,
    loading,
    error,
    session,
    selectedRounds,
    selectedMode,
    creditError,
  } = useSelector((state) => state.interviewSetup)

  useEffect(() => {
    dispatch(resetSetup())
    dispatch(preflightRequest())
  }, [dispatch])

  useEffect(() => {
    if (step !== 'done' || !session) return

    if (selectedRounds.includes('hr_behavioral')) {
      dispatch(resetBehavioral())
      navigate(ROUTES.BEHAVIORAL_ROOM)
      return
    }

    if (selectedRounds.includes('dsa')) {
      dispatch(resetDSASession())
      dispatch(startDSARound({ interviewSessionId: session.sessionId }))
      navigate(ROUTES.DSA_ROOM)
      return
    }

    if (selectedRounds.includes('system_design')) {
      dispatch(resetSDSession())
      dispatch(resetInterviewer())
      navigate(ROUTES.SD_ROOM)
      return
    }

    navigate(ROUTES.INTERVIEW_ROOM)
  }, [dispatch, navigate, selectedMode, selectedRounds, session, step])

  const handleClose = () => {
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD)
  }

  const handleGoUpload = () => {
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD_PROFILE)
  }

  const handleRetryPreflight = () => {
    dispatch(preflightRequest())
  }

  const handleClearCreditError = () => {
    dispatch(clearCreditError())
  }

  const handleTopUp = () => {
    const deficit = creditError?.deficit ?? 0
    dispatch(resetSetup())
    navigate(`${ROUTES.BUY_CREDITS}${deficit > 0 ? `?deficit=${deficit}` : ''}`)
  }

  const handleStartSession = () => {
    if (selectedMode === 'combat') {
      dispatch(proceedFromRoundSelect())
      return
    }
    dispatch(initSessionRequest())
  }

  const handleSaveContext = (updatedCv, updatedJd) => {
    dispatch(saveContextRequest({ cv: updatedCv, jd: updatedJd }))
  }

  const renderStep = () => {
    if (creditError) {
      return (
        <div className="dash-card mx-auto max-w-xl rounded-[22px] p-6 sm:p-8">
          <InsufficientCreditModal
            creditError={creditError}
            onClose={handleClearCreditError}
            onTopUp={handleTopUp}
          />
        </div>
      )
    }

    switch (step) {
      case 'idle':
        return error ? (
          <ErrorPanel message={error} onRetry={handleRetryPreflight} />
        ) : (
          <PreflightSkeleton message={t('interviewSetup.loading.preparingPreflight')} />
        )

      case 'preflight_loading':
        return <PreflightSkeleton message={t('interviewSetup.loading.checkingContext')} />

      case 'context_missing':
        return (
          <MissingContextPanel
            missing={missing}
            onGoUpload={handleGoUpload}
            onCancel={handleClose}
          />
        )

      case 'context_confirm':
        return (
          <ContextConfirmPanel
            cv={cv}
            jd={jd}
            onConfirm={handleSaveContext}
            onGoUpload={handleGoUpload}
          />
        )

      case 'mode_select':
      case 'round_select':
        return <RoundSelectionStep onStart={handleStartSession} />

      case 'combat_permission':
        return <CombatPermissionGate />

      case 'initializing':
        return <LoadingScreen message={t('interviewSetup.loading.initializing')} />

      default:
        return <ErrorPanel message={t('interviewSetup.preflightError.fallback')} onRetry={handleRetryPreflight} />
    }
  }

  const showSavingOverlay = loading && !['idle', 'preflight_loading', 'initializing'].includes(step)

  return (
    <div className="dash-page-shell min-h-full pb-10">
      <main className="dash-page">
        <header className="dash-page-header">
          <div>
            <h1 className="dash-page-title">{t('interviewSetup.page.title')}</h1>
            <p className="dash-page-description">
              {t('interviewSetup.page.description')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="dash-control inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('interviewSetup.page.backDashboard')}
          </button>
        </header>

        <section className="relative">
          {renderStep()}
          {showSavingOverlay && (
            <div className="absolute inset-0 z-20 flex min-h-[240px] items-center justify-center rounded-[24px] bg-[var(--dash-shell)]/70 backdrop-blur-sm">
              <div className="dash-card flex items-center gap-3 rounded-[18px] p-4 shadow-shell">
                <Loader2 className="h-5 w-5 animate-spin text-cta" />
                <span className="dash-text text-sm font-semibold">{t('interviewSetup.loading.saving')}</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
