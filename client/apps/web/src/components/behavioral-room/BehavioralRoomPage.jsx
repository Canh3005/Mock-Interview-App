import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ChevronRight, CheckCircle2, Clock, LogOut, AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  startSessionRequest,
  nextStageRequest,
  completeSessionRequest,
  tickTimer,
  resetBehavioral,
} from '../../store/slices/behavioralSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import StageProgressPanel from './StageProgressPanel'
import ChatInterface from './ChatInterface'
import StarGuidePanel from './StarGuidePanel'

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
    currentStage,
    stageName,
    candidateLevel,
    isStreaming,
    isTransitioning,
    isScoring,
    starStatus,
    elapsedSeconds,
    error,
  } = useSelector((s) => s.behavioral)

  const [showTransition, setShowTransition] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
  const timerRef = useRef(null)

  const handleExitClick = () => setShowExitModal(true)
  const handleConfirmExit = () => {
    dispatch(resetBehavioral())
    dispatch(resetSetup())
    navigate('dashboard')
  }

  const handleFinishClick = () => {
    if (currentStage < 6) {
      setShowFinishModal(true)
    } else {
      dispatch(completeSessionRequest())
    }
  }
  const handleConfirmFinish = () => {
    setShowFinishModal(false)
    dispatch(completeSessionRequest())
  }

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

  // ─── Navigate to scoring page when completing/completed ─────────────────
  if (status === 'completing' || status === 'completed') {
    navigate('scoring')
    return null
  }

  // ─── Main interview room ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitClick}
            className="flex items-center gap-1.5 text-xs text-slate-400 border border-slate-700 hover:border-red-500/50 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Thoát phỏng vấn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Thoát
          </button>
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

          {/* Finish button */}
          <button
            onClick={handleFinishClick}
            disabled={isStreaming || isScoring}
            className={`flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              currentStage >= 6
                ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                : 'text-red-400 border-red-500/40 hover:bg-red-500/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kết thúc & Chấm điểm
          </button>
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

        {/* Right: STAR Guide or Context Panel */}
        <aside className="w-48 flex-shrink-0 border-l border-slate-800 overflow-y-auto px-2 hidden lg:block">
          {[2, 3].includes(currentStage) ? (
            <div className="flex flex-col gap-2 py-4 px-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Gợi nhớ</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hãy giải thích <span className="text-amber-400 font-semibold">trade-offs</span>, không chỉ dừng ở cách dùng.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Dẫn ví dụ từ <span className="text-blue-400 font-semibold">thực tế dự án</span> của bạn khi có thể.
              </p>
            </div>
          ) : currentStage === 6 ? (
            <div className="flex flex-col gap-2 py-4 px-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Gợi nhớ</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Câu hỏi tốt thể hiện bạn đã <span className="text-emerald-400 font-semibold">research về công ty</span>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Ưu tiên hỏi về <span className="text-blue-400 font-semibold">roadmap kỹ thuật</span>, technical debt, hoặc cách team đưa ra quyết định.
              </p>
            </div>
          ) : (
            <StarGuidePanel starStatus={starStatus} practiceMode />
          )}
        </aside>
      </div>

      {/* ── Exit Modal ── */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setShowExitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base mb-1">Thoát phỏng vấn?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Phiên phỏng vấn sẽ bị hủy và{' '}
                    <span className="text-red-400 font-medium">không được chấm điểm</span>.
                    Tiến trình và câu trả lời hiện tại sẽ mất hoàn toàn.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Tiếp tục thi
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                >
                  Thoát
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Early Finish Modal ── */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setShowFinishModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-1">Kết thúc sớm?</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Bạn mới hoàn thành{' '}
                      <span className="text-red-400 font-medium">{currentStage}/6 giai đoạn</span>.
                      Kết thúc sớm sẽ ảnh hưởng đến điểm số — các giai đoạn chưa hoàn thành sẽ không được tính.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Tiếp tục thi
                </button>
                <button
                  onClick={handleConfirmFinish}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                >
                  Vẫn kết thúc
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
