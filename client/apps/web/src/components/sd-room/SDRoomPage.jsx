import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router/routes'
import { Loader2, AlertTriangle, CheckCircle2, Clock, AlertCircle, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { loadRequest, resetSDSession } from '../../store/slices/sdSessionSlice'
import { resetInterviewer } from '../../store/slices/sdInterviewerSlice'
import { evaluationReset } from '../../store/slices/sdEvaluatorSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import { resetBehavioral } from '../../store/slices/behavioralSlice'
import { resetDSASession } from '../../store/slices/dsaSessionSlice'
import { useCombatSession } from '../../hooks/useCombatSession'
import SDCanvas from './SDCanvas'
import NodeLibrary from './NodeLibrary'
import RightPanel from './RightPanel'
import ResizeDivider from '../shared/ui/ResizeDivider'
import EvaluationLoadingOverlay from './EvaluationLoadingOverlay'

const RIGHT_PANEL_MIN = 240
const RIGHT_PANEL_MAX = 560
const RIGHT_PANEL_DEFAULT = 320

const PHASES = ['CLARIFICATION', 'DESIGN_DRAWING', 'DESIGN_WALKTHROUGH', 'DEEP_DIVE', 'WRAP_UP']

function AutoSaveIndicator({ status }) {
  const { t } = useTranslation()
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="w-3 h-3 animate-spin" />
        {t('sdRoom.autoSaveStatus.saving')}
      </span>
    )
  if (status === 'saved')
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        {t('sdRoom.autoSaveStatus.saved')}
      </span>
    )
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <AlertCircle className="w-3 h-3" />
        {t('sdRoom.autoSaveStatus.error')}
      </span>
    )
  return null
}

function PhaseProgressBar({ phase, phases }) {
  const { t } = useTranslation()
  const activeIdx = phases.indexOf(phase)

  return (
    <div className="flex items-center gap-1">
      {phases.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
              i < activeIdx
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : i === activeIdx
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {t(`sdRoom.phase.${p}`)}
          </div>
          {i < phases.length - 1 && <div className="w-3 h-px bg-slate-700" />}
        </div>
      ))}
    </div>
  )
}

function ExitConfirmModal({ onCancel, onConfirm }) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="dash-card w-full max-w-sm rounded-[20px] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-500">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="dash-text text-base font-bold">{t('dashboard.focus.exitModal.title')}</h2>
            <p className="dash-subtle mt-1 text-sm leading-relaxed">
              {t('dashboard.focus.exitModal.description')}{' '}
              <span className="font-semibold text-red-500">{t('dashboard.focus.exitModal.descriptionHighlight')}</span>
              {t('dashboard.focus.exitModal.descriptionSuffix')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="dash-control flex-1 rounded-[14px] border px-4 py-2.5 text-sm font-semibold"
          >
            {t('dashboard.focus.exitModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            {t('dashboard.focus.exitModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SDRoomPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const sdSessionId = useSelector((s) => s.interviewSetup.session?.sdSessionId)
  const { loading, error, phase, autoSaveStatus, enableCurveball } = useSelector((s) => s.sdSession)
  const sessionPhases = enableCurveball ? PHASES : PHASES.filter((p) => p !== 'WRAP_UP')
  const drawingComplete = useSelector((s) => s.sdInterviewer.drawingComplete)
  const mode = useSelector((s) => s.interviewSetup.session?.mode)
  const interviewSessionId = useSelector((s) => s.interviewSetup.session?.sessionId)
  const language = useSelector((s) => s.interviewSetup.session?.language)
  const candidateLevel = useSelector((s) => s.interviewSetup.session?.candidateLevel)
  const chatHistory = useSelector((s) => s.sdInterviewer.chatHistory)
  const [rightWidth, setRightWidth] = useState(RIGHT_PANEL_DEFAULT)
  const [showExitModal, setShowExitModal] = useState(false)
  const videoRef = useRef(null)
  const aiConversation = useMemo(
    () =>
      chatHistory
        .filter((m) => m.role !== 'hint')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'ai', content: m.content })),
    [chatHistory],
  )
  const ttsOptions = useMemo(
    () => ({ language: language ?? 'vi', level: candidateLevel }),
    [language, candidateLevel],
  )
  const { mediaStream } = useCombatSession({
    mode,
    interviewSessionId,
    videoRef,
    aiConversation,
    ttsOptions,
  })

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightWidth

    const onMouseMove = (mv) => {
      const next = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, startWidth + startX - mv.clientX))
      setRightWidth(next)
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [rightWidth])

  useEffect(() => {
    if (sdSessionId) dispatch(loadRequest(sdSessionId))
    return () => { dispatch(resetSDSession()) }
  }, [sdSessionId, dispatch])

  const handleConfirmExit = () => {
    dispatch(resetBehavioral())
    dispatch(resetDSASession())
    dispatch(resetSDSession())
    dispatch(resetInterviewer())
    dispatch(evaluationReset())
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD)
  }

  const isCanvasLocked = phase === 'CLARIFICATION'
  const isCanvasViewOnly = !isCanvasLocked && (phase !== 'DESIGN_DRAWING' || drawingComplete)
  if (loading)
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex flex-col items-center gap-3 rounded-[20px] p-8">
          <Loader2 className="w-8 h-8 text-cta animate-spin" />
          <p className="dash-subtle text-sm">{t('sdRoom.loading')}</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex max-w-sm flex-col items-center gap-4 rounded-[20px] p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="dash-subtle text-sm">{error}</p>
          <button
            onClick={() => dispatch(loadRequest(sdSessionId))}
            className="dash-control rounded-[14px] border px-5 py-2 text-sm font-semibold transition-colors"
          >
            {t('sdRoom.retry')}
          </button>
        </div>
      </div>
    )

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2 text-[var(--dash-text)] sm:gap-3 sm:p-3">
      <nav className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 rounded-[18px] border border-slate-800/60 bg-slate-900 px-3 py-2 shadow-shell">
        <PhaseProgressBar phase={phase} phases={sessionPhases} />
        <div className="flex shrink-0 items-center gap-4">
          <AutoSaveIndicator status={autoSaveStatus} />
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('sdRoom.exit')}
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 overflow-hidden gap-0">
        <NodeLibrary />
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-800/60 ml-1.5">
          <SDCanvas isLocked={isCanvasLocked} isViewOnly={isCanvasViewOnly} />
        </div>
        <ResizeDivider onMouseDown={handleResizeStart} />
        <RightPanel width={rightWidth} mediaStream={mediaStream} />
      </div>
      <EvaluationLoadingOverlay />
      {mode === 'combat' && <video ref={videoRef} muted playsInline style={{ display: 'none' }} />}
      {showExitModal && (
        <ExitConfirmModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleConfirmExit}
        />
      )}
    </div>
  )
}
