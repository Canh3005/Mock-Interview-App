import { useEffect, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Loader2, X, Zap } from 'lucide-react'
import {
  fetchDocumentContextRequest,
  runCompatibilityFailure,
  runCompatibilityStart,
  runCompatibilitySuccess,
} from '../../../store/slices/profileSlice'
import StaticProfileForm from './StaticProfileForm'
import ProfileRadarChart from './ProfileRadarChart'
import DocumentUploadZone from './DocumentUploadZone'
import AssessmentHistory from './AssessmentHistory'
import JdInfoTab from './JdInfoTab'
import FitAssessmentSummary from './FitAssessmentSummary'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function CompatibilityAssessmentPanel({
  hasCv,
  hasJd,
  loading,
  result,
  error,
  onAssess,
}) {
  const { t } = useTranslation()
  const canAssess = hasCv && hasJd
  const hint = !hasCv && !hasJd
    ? t('profile.upload.assessmentNeedsDocuments')
    : !hasCv
    ? t('profile.upload.jdNeedsCv')
    : !hasJd
      ? t('profile.upload.cvNeedsJd')
      : result
        ? t('profile.upload.assessmentCompleteHint')
        : t('profile.upload.assessmentReady')

  return (
    <div className={`rounded-xl border p-4 ${
      canAssess
        ? 'border-cta/30 bg-cta/10'
        : 'border-slate-700 bg-slate-900/40'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-lg p-2 ${
            canAssess ? 'bg-cta text-white' : 'bg-slate-800 text-slate-500'
          }`}>
            <Zap size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t('profile.upload.assessCompatibility')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAssess}
          disabled={!canAssess || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cta text-white text-sm font-semibold hover:bg-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {loading ? t('profile.upload.assessing') : t('profile.upload.assessCompatibility')}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={13} />
          {error}
        </p>
      )}
    </div>
  )
}

function FitAssessmentResultPanel({ result, error, onDismiss }) {
  const { t } = useTranslation()

  if (!result && !error) return null

  const score = result?.fitScore

  return (
    <div className="dash-card rounded-2xl p-5 space-y-4 border border-cta/20">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg p-2 bg-cta/15 text-cta border border-cta/30">
            <Zap size={16} />
          </div>
          <div>
            <h2 className="dash-text text-lg font-heading font-semibold">
              {t('profile.fit.title')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('profile.fit.note')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {typeof score === 'number' && (
            <span className="inline-flex items-center rounded-full bg-cta/10 border border-cta/30 px-3 py-1 text-sm font-semibold text-cta">
              {t('profile.upload.matchPercent', { score })}
            </span>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            title={t('common.close', { defaultValue: 'Close' })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:border-slate-500 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {typeof score === 'number' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-300">{t('profile.upload.fitScoreTitle')}</p>
            <p className="text-xs font-bold text-cta">
              {t('profile.upload.matchPercent', { score })}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cta transition-all duration-700"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {result && (
        <FitAssessmentSummary summary={result.fitAssessmentSummary} surface={false} />
      )}
    </div>
  )
}

export default function SkillPassportPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const {
    parseResult,
    documentContext,
    compatibilityLoading,
    compatibilityResult,
    compatibilityError,
  } = useSelector((state) => state.profile)
  const accessToken = useSelector((state) => state.auth.accessToken)
  const compatibilityStreamRef = useRef(null)

  const [activeTab, setActiveTab] = useState('cv')
  const [uploadType, setUploadType] = useState('CV')
  const [isFitAssessmentDismissed, setIsFitAssessmentDismissed] = useState(false)
  const hasCv = Boolean(documentContext?.cv)
  const hasJd = Boolean(documentContext?.jd)

  useEffect(() => {
    dispatch(fetchDocumentContextRequest())
  }, [dispatch])

  useEffect(() => () => {
    compatibilityStreamRef.current?.close()
  }, [])

  useEffect(() => {
    if (compatibilityResult || compatibilityError) {
      setIsFitAssessmentDismissed(false)
    }
  }, [compatibilityResult, compatibilityError])

  // Auto-switch tab when a parse completes
  useEffect(() => {
    if (parseResult?.type === 'CV') setActiveTab('cv')
    if (parseResult?.type === 'JD') setActiveTab('jd')
  }, [parseResult?.type])

  // Keep uploadType selector in sync with active tab
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setUploadType(tab === 'cv' ? 'CV' : 'JD')
  }

  const handleUploadTypeChange = (type) => {
    setUploadType(type)
    setActiveTab(type === 'CV' ? 'cv' : 'jd')
  }

  const startCompatibilityAssessment = () => {
    if (!accessToken || !hasCv || !hasJd) return

    compatibilityStreamRef.current?.close()
    dispatch(runCompatibilityStart())

    const es = new EventSource(
      `${API_BASE_URL}/documents/compatibility-assessment/stream?t=${accessToken}`,
    )
    compatibilityStreamRef.current = es
    let done = false

    const closeStream = () => {
      done = true
      es.close()
      if (compatibilityStreamRef.current === es) {
        compatibilityStreamRef.current = null
      }
    }

    es.onmessage = (event) => {
      if (done) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'fit_assessment') {
          dispatch(runCompatibilitySuccess(data))
        } else {
          const message = data.message || t('profile.toast.unknownError')
          dispatch(runCompatibilityFailure(message))
          toast.error(message)
        }
      } catch {
        dispatch(runCompatibilityFailure(t('profile.toast.unknownError')))
      } finally {
        closeStream()
      }
    }

    es.onerror = () => {
      if (done) return
      dispatch(runCompatibilityFailure(t('profile.toast.unknownError')))
      closeStream()
    }
  }

  const tabs = [
    { key: 'cv', label: t('profile.tabs.cv'), parsedType: 'CV' },
    { key: 'jd', label: t('profile.tabs.jd'), parsedType: 'JD' },
  ]

  return (
    <div className="dash-page-shell min-h-full pb-20">
      <main className="dash-page">
        <header className="dash-page-header">
          <div>
            <h1 className="dash-page-title">{t('profile.page.title')}</h1>
            <p className="dash-page-description">
              {t('profile.page.subtitle')}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Upload Card */}
            <div className="dash-card rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="dash-text text-xl font-heading font-semibold">
                  {t('profile.page.contextTitle')}
                </h2>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,1fr)] gap-4 items-start">
                <DocumentUploadZone
                  uploadType={uploadType}
                  onTypeChange={handleUploadTypeChange}
                />
                <CompatibilityAssessmentPanel
                  hasCv={hasCv}
                  hasJd={hasJd}
                  loading={compatibilityLoading}
                  result={compatibilityResult}
                  error={compatibilityError}
                  onAssess={startCompatibilityAssessment}
                />
              </div>
            </div>

            {!isFitAssessmentDismissed && (
              <FitAssessmentResultPanel
                result={compatibilityResult}
                error={compatibilityError}
                onDismiss={() => setIsFitAssessmentDismissed(true)}
              />
            )}

            {/* Tabbed Info Card */}
            <div className="dash-card rounded-2xl p-6">
              {/* Tab headers */}
              <div className="flex gap-1 mb-5 border-b border-slate-700/60">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key
                  const isParsed = parseResult?.type === tab.parsedType
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                        isActive
                          ? 'border-cta text-cta'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                      {isParsed && (
                        <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* CV Tab */}
              {activeTab === 'cv' && (
                <>
                  {parseResult?.type === 'CV' && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-green-400">
                      <CheckCircle2 size={13} />
                      <span>{t('profile.upload.analysisComplete')}</span>
                      {parseResult.cvData?.name && (
                        <span className="text-slate-500">· {parseResult.cvData.name}</span>
                      )}
                    </div>
                  )}
                  <StaticProfileForm />
                </>
              )}

              {/* JD Tab */}
              {activeTab === 'jd' && (
                <JdInfoTab onGoUpload={() => handleUploadTypeChange('JD')} />
              )}
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="dash-card rounded-2xl p-6">
              <h2 className="dash-text text-xl font-heading font-semibold mb-4 text-center">
                {t('profile.page.globalCapabilities')}
              </h2>
              <ProfileRadarChart />
            </div>
            <AssessmentHistory />
          </div>

        </div>
      </main>
    </div>
  )
}
