import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../../router/routes'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Clock, LogOut, AlertTriangle } from 'lucide-react'
import {
  createSessionRequest,
  hydrateSessionSuccess,
  tickTimer,
  resetBehavioral,
} from '../../store/slices/behavioralSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import { behavioralApi } from '../../api/behavioral.api'
import { useCombatSession } from '../../hooks/useCombatSession'
import EmbeddedCameraFeed from '../shared/ui/EmbeddedCameraFeed'
import StageProgressPanel from './StageProgressPanel'
import ChatInterface from './ChatInterface'

function _formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function _LevelBadge({ level }) {
  const colors = {
    senior: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
    mid: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
    junior: 'dash-chip',
  }
  const labels = { senior: 'Senior', mid: 'Mid-level', junior: 'Junior' }
  if (!level) return null
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[level] ?? colors.junior}`}>
      {labels[level] ?? level}
    </span>
  )
}

function _ExitModal({ onCancel, onConfirm }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}
        className="dash-card w-full max-w-sm rounded-[20px] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="dash-text mb-1 text-base font-semibold">{t('behavioralRoom.exitModal.title')}</h3>
            <p className="dash-subtle text-sm leading-relaxed">
              {t('behavioralRoom.exitModal.description')}{' '}
              <span className="text-red-400 font-medium">{t('behavioralRoom.exitModal.descriptionHighlight')}</span>
              {t('behavioralRoom.exitModal.descriptionSuffix')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="dash-control flex-1 rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-colors">
            {t('behavioralRoom.exitModal.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors">
            {t('behavioralRoom.exitModal.confirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function BehavioralRoomPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const interviewSessionId = useSelector((s) => s.interviewSetup.session?.sessionId)
  const candidateLevel = useSelector((s) => s.interviewSetup.session?.candidateLevel)
  const mode = useSelector((s) => s.interviewSetup.session?.mode)
  const language = useSelector((s) => s.interviewSetup.session?.language)
  const resumeBehavioralSessionId = useSelector((s) => s.interviewSetup.session?.behavioralSessionId)
  const { sessionId, status, interviewState, stageProgress, turns, isStreaming, isEvaluating, elapsedSeconds, error } =
    useSelector((s) => s.behavioral)

  const [showExitModal, setShowExitModal] = useState(false)
  const [isHydratingSession, setIsHydratingSession] = useState(false)
  const timerRef = useRef(null)
  const roomRef = useRef(null)
  const videoRef = useRef(null)

  // Combat engine: webcam + multimodal + proctoring + TTS. No-op khi mode !== 'combat'.
  const aiConversation = useMemo(
    () => turns.map((tn) => ({ role: tn.role === 'interviewer' ? 'ai' : 'user', content: tn.content })),
    [turns],
  )
  const ttsOptions = useMemo(() => ({ language: language ?? 'vi', level: candidateLevel }), [language, candidateLevel])
  // Chỉ kích hoạt engine khi phòng đã active — lúc này <video> đã mount nên
  // multimodalEngine.start() nhận được videoRef hợp lệ (eye/expression cần video frame).
  const combatActive = mode === 'combat' && status === 'active'
  const { mediaStream } = useCombatSession({
    mode: combatActive ? 'combat' : 'practice',
    interviewSessionId,
    videoRef,
    aiConversation,
    ttsOptions,
  })

  const _handleConfirmExit = () => {
    dispatch(resetBehavioral())
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD)
  }

  // Khởi tạo session khi mount
  useEffect(() => {
    if (!interviewSessionId || status === 'starting' || isHydratingSession) return undefined
    if (sessionId && status !== 'idle' && status !== 'error') return undefined

    let cancelled = false

    if (resumeBehavioralSessionId) {
      setIsHydratingSession(true)
      behavioralApi
        .getSession(resumeBehavioralSessionId)
        .then((data) => {
          if (cancelled) return
          dispatch(hydrateSessionSuccess({
            sessionId: resumeBehavioralSessionId,
            state: data.state,
            turnHistory: data.turnHistory,
            stageProgress: data.stageProgress,
          }))
        })
        .catch(() => {
          if (!cancelled) dispatch(createSessionRequest(interviewSessionId))
        })
        .finally(() => {
          if (!cancelled) setIsHydratingSession(false)
        })
      return () => {
        cancelled = true
        clearInterval(timerRef.current)
      }
    }

    dispatch(createSessionRequest(interviewSessionId))
    return () => clearInterval(timerRef.current)
  }, [
    dispatch,
    interviewSessionId,
    resumeBehavioralSessionId,
    sessionId,
    status,
  ])

  // Bắt đầu timer khi session active
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => dispatch(tickTimer()), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status, dispatch])

  // Navigate to scoring khi completed
  useEffect(() => {
    if (status === 'completed') {
      navigate(ROUTES.SCORING)
    }
  }, [status, navigate])

  if (status === 'idle' || status === 'starting' || isHydratingSession) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex flex-col items-center gap-3 rounded-[20px] p-8">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="dash-subtle text-sm">{t('behavioralRoom.loading')}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center">
        <div className="dash-card flex max-w-sm flex-col items-center gap-4 rounded-[20px] p-8 text-center">
          <p className="text-red-400 font-semibold">{t('behavioralRoom.error.init')}</p>
          <p className="dash-subtle text-sm">{error}</p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="dash-control rounded-[14px] border px-5 py-2 text-sm font-semibold transition-colors"
          >
            {t('behavioralRoom.error.backHome')}
          </button>
        </div>
      </div>
    )
  }

  const currentStageIndex = stageProgress.findIndex((s) => s.status === 'active')

  return (
    <div ref={roomRef} className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden p-2 sm:p-3">
      {/* Header */}
      <header className="dash-surface flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[22px] border px-4 py-3 shadow-shell">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setShowExitModal(true)}
            className="dash-control flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:text-red-500"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('behavioralRoom.header.exit')}
          </button>
          <span className="dash-text truncate text-sm font-semibold">{t('behavioralRoom.header.title')}</span>
          {currentStageIndex >= 0 && stageProgress[currentStageIndex] && (
            <>
              <span className="text-slate-600">·</span>
              <span className="dash-subtle truncate text-sm">
                {t(`behavioralRoom.stage.names.${stageProgress[currentStageIndex].stage}`)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="dash-muted-panel flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{_formatTime(elapsedSeconds)}</span>
          </div>
          <_LevelBadge level={candidateLevel} />
        </div>
      </header>

      {/* 2-column layout (StarGuidePanel đã bỏ) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Left: Stage Progress */}
        <aside className="dash-card hidden min-h-0 flex-col overflow-hidden rounded-[22px] lg:flex">
          {mode === 'combat' && <EmbeddedCameraFeed mediaStream={mediaStream} />}
          <div className="flex-1 overflow-y-auto p-2">
            <StageProgressPanel stageProgress={stageProgress} candidateLevel={candidateLevel} />
          </div>
        </aside>

        {/* Center: Chat */}
        <main className="dash-card relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px]">
          <ChatInterface combat={mode === 'combat'} />
          <div className="dash-border shrink-0 border-t px-4 py-2">
            <p className="dash-subtle text-xs">
              {isStreaming
                ? t('behavioralRoom.chat.responding')
                : interviewState === 'COMPLETED'
                ? t('behavioralRoom.stage.status.completed')
                : t('behavioralRoom.chat.placeholder')}
            </p>
          </div>
        </main>
      </div>

      {mode === 'combat' && <video ref={videoRef} muted playsInline style={{ display: 'none' }} />}

      <AnimatePresence>
        {showExitModal && (
          <_ExitModal
            onCancel={() => setShowExitModal(false)}
            onConfirm={_handleConfirmExit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
