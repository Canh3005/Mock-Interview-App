import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../../router/routes'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Clock, LogOut, AlertTriangle } from 'lucide-react'
import {
  createSessionRequest,
  tickTimer,
  resetBehavioral,
} from '../../store/slices/behavioralSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import StageProgressPanel from './StageProgressPanel'
import ChatInterface from './ChatInterface'

function _formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function _LevelBadge({ level }) {
  const colors = {
    senior: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    mid: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    junior: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  }
  const labels = { senior: 'Senior', mid: 'Mid-level', junior: 'Junior' }
  if (!level) return null
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${colors[level] ?? colors.junior}`}>
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
        className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base mb-1">{t('behavioralRoom.exitModal.title')}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t('behavioralRoom.exitModal.description')}{' '}
              <span className="text-red-400 font-medium">{t('behavioralRoom.exitModal.descriptionHighlight')}</span>
              {t('behavioralRoom.exitModal.descriptionSuffix')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
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
  const { status, interviewState, stageProgress, isStreaming, elapsedSeconds, error } =
    useSelector((s) => s.behavioral)

  const [showExitModal, setShowExitModal] = useState(false)
  const timerRef = useRef(null)

  const _handleConfirmExit = () => {
    dispatch(resetBehavioral())
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD)
  }

  // Khởi tạo session khi mount
  useEffect(() => {
    if (interviewSessionId) {
      dispatch(createSessionRequest(interviewSessionId))
    }
    return () => clearInterval(timerRef.current)
  }, [dispatch, interviewSessionId])

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

  if (status === 'idle' || status === 'starting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="text-slate-400 text-sm">{t('behavioralRoom.loading')}</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-red-400 font-semibold">{t('behavioralRoom.error.init')}</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
          >
            {t('behavioralRoom.error.backHome')}
          </button>
        </div>
      </div>
    )
  }

  const currentStageIndex = stageProgress.findIndex((s) => s.status === 'active')

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExitModal(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 border border-slate-700 hover:border-red-500/50 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('behavioralRoom.header.exit')}
          </button>
          <span className="text-sm font-semibold text-white">{t('behavioralRoom.header.title')}</span>
          {currentStageIndex >= 0 && stageProgress[currentStageIndex] && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-sm text-slate-400">
                {t(`behavioralRoom.stage.names.${stageProgress[currentStageIndex].stage}`)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{_formatTime(elapsedSeconds)}</span>
          </div>
          <_LevelBadge level={candidateLevel} />
        </div>
      </header>

      {/* 2-column layout (StarGuidePanel đã bỏ) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Stage Progress */}
        <aside className="w-52 flex-shrink-0 border-r border-slate-800 overflow-y-auto px-2 hidden md:block">
          <StageProgressPanel stageProgress={stageProgress} candidateLevel={candidateLevel} />
        </aside>

        {/* Center: Chat */}
        <main className="flex-1 min-w-0 flex flex-col relative">
          <ChatInterface />
          <div className="border-t border-slate-800 px-4 py-2 flex-shrink-0">
            <p className="text-xs text-slate-600">
              {isStreaming
                ? t('behavioralRoom.chat.responding')
                : interviewState === 'COMPLETED'
                ? t('behavioralRoom.stage.status.completed')
                : t('behavioralRoom.chat.placeholder')}
            </p>
          </div>
        </main>
      </div>

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
