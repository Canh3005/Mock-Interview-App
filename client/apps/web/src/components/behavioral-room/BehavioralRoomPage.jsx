import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  startSessionRequest,
  nextStageRequest,
  completeSessionRequest,
  tickTimer,
  resetBehavioral,
} from '../../store/slices/behavioralSlice'
import StageProgressPanel from './StageProgressPanel'
import ChatInterface from './ChatInterface'
import StarGuidePanel from './StarGuidePanel'
import ScorecardDisplay from './ScorecardDisplay'

// ─── Timer display ────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Stage transition overlay ─────────────────────────────────────────────────
function StageTransitionOverlay({ stageName }) {
  return (
    <motion.div
      key="stage-transition"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm"
    >
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-2">Bắt đầu giai đoạn mới</p>
        <h2 className="text-2xl font-heading font-bold text-white">{stageName}</h2>
      </div>
    </motion.div>
  )
}

// ─── Main BehavioralRoomPage ──────────────────────────────────────────────────
export default function BehavioralRoomPage({ navigate, interviewSessionId }) {
  const dispatch = useDispatch()
  const {
    status,
    sessionId,
    currentStage,
    stageName,
    candidateLevel,
    isStreaming,
    isTransitioning,
    isScoring,
    scoreData,
    starStatus,
    elapsedSeconds,
    error,
  } = useSelector((s) => s.behavioral)

  const [showTransition, setShowTransition] = useState(false)
  const timerRef = useRef(null)

  // Start session on mount
  useEffect(() => {
    if (interviewSessionId) {
      dispatch(startSessionRequest(interviewSessionId))
    }
    return () => {
      clearInterval(timerRef.current)
    }
  }, [dispatch, interviewSessionId])

  // Start timer when in_progress
  useEffect(() => {
    if (status === 'in_progress') {
      timerRef.current = setInterval(() => dispatch(tickTimer()), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status, dispatch])

  // Show transition animation when stage changes
  const prevStageRef = useRef(currentStage)
  useEffect(() => {
    if (prevStageRef.current !== currentStage && currentStage > 1) {
      setShowTransition(true)
      toast.success(`Bắt đầu Giai đoạn ${currentStage}: ${stageName}`)
      const t = setTimeout(() => setShowTransition(false), 2000)
      prevStageRef.current = currentStage
      return () => clearTimeout(t)
    }
    prevStageRef.current = currentStage
  }, [currentStage, stageName])

  // ─── Loading / error states ─────────────────────────────────────────────
  if (status === 'idle' || status === 'starting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="text-slate-400 text-sm">Đang khởi tạo phòng phỏng vấn...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <p className="text-red-400 font-semibold">Không thể khởi tạo phiên phỏng vấn</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button
            onClick={() => navigate('dashboard')}
            className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }

  // ─── Scoring screen ─────────────────────────────────────────────────────
  if (status === 'completing' || (status === 'completed' && !scoreData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="text-slate-400 text-sm">AI đang phân tích buổi phỏng vấn của bạn...</p>
          <p className="text-slate-600 text-xs">Quá trình này mất khoảng 15-30 giây</p>
        </div>
      </div>
    )
  }

  // ─── Scorecard ──────────────────────────────────────────────────────────
  if (status === 'completed' && scoreData) {
    return (
      <div className="min-h-screen bg-background overflow-y-auto">
        <ScorecardDisplay scoreData={scoreData} navigate={navigate} />
      </div>
    )
  }

  // ─── Main interview room ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">HR & Behavioral</span>
          <span className="text-slate-600">·</span>
          <span className="text-sm text-slate-400">
            Giai đoạn {currentStage}/6 – {stageName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Level badge */}
          {candidateLevel && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                candidateLevel === 'senior'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : candidateLevel === 'mid'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {candidateLevel === 'senior' ? 'Senior' : candidateLevel === 'mid' ? 'Mid-level' : 'Junior'}
            </span>
          )}
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Stage Progress */}
        <aside className="w-52 flex-shrink-0 border-r border-slate-800 overflow-y-auto px-2 hidden md:block">
          <StageProgressPanel currentStage={currentStage} candidateLevel={candidateLevel} />
        </aside>

        {/* Center: Chat */}
        <main className="flex-1 min-w-0 flex flex-col relative">
          <AnimatePresence>
            {showTransition && (
              <StageTransitionOverlay stageName={stageName} />
            )}
          </AnimatePresence>

          <ChatInterface />

          {/* Stage actions footer */}
          <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-slate-600">
              {isStreaming ? 'AI đang trả lời...' : 'Nhập câu trả lời của bạn'}
            </p>
            <div className="flex items-center gap-2">
              {currentStage < 6 ? (
                <button
                  onClick={() => dispatch(nextStageRequest())}
                  disabled={isStreaming || isTransitioning}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTransitioning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Giai đoạn tiếp theo
                </button>
              ) : (
                <button
                  onClick={() => dispatch(completeSessionRequest())}
                  disabled={isStreaming || isScoring}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Kết thúc & Chấm điểm
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right: STAR Guide */}
        <aside className="w-48 flex-shrink-0 border-l border-slate-800 overflow-y-auto px-2 hidden lg:block">
          <StarGuidePanel starStatus={starStatus} practiceMode />
        </aside>
      </div>
    </div>
  )
}
