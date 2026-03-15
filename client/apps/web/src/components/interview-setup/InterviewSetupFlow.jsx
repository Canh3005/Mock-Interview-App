import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, X } from 'lucide-react'
import {
  preflightRequest,
  confirmContext,
  resetSetup,
  initSessionRequest,
} from '../../store/slices/interviewSetupSlice'
import ModeSelectionStep from './steps/ModeSelectionStep'
import CombatPermissionGate from './steps/CombatPermissionGate'
import RoundSelectionStep from './steps/RoundSelectionStep'

// ─── Missing context modal ────────────────────────────────────────────────────
function MissingContextModal({ missing, onGoUpload, onCancel }) {
  const labels = { cv_context: 'CV', jd_context: 'JD' }
  const missingText = missing.map((k) => labels[k] ?? k).join(' và ')

  return (
    <div className="flex flex-col items-center text-center gap-6 py-2">
      <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center">
        <span className="text-3xl">⚠️</span>
      </div>
      <div>
        <h2 className="text-xl font-heading font-bold text-white mb-2">
          Thiếu ngữ cảnh phỏng vấn
        </h2>
        <p className="text-slate-400 leading-relaxed max-w-sm">
          Bạn chưa upload <span className="text-amber-400 font-medium">{missingText}</span>.
          Hãy hoàn thiện hồ sơ trước để AI có thể cá nhân hóa đúng trình độ và vị trí của bạn.
        </p>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm font-medium"
        >
          Huỷ
        </button>
        <button
          onClick={onGoUpload}
          className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
        >
          Đi đến trang Upload
        </button>
      </div>
    </div>
  )
}

// ─── Context confirm modal ────────────────────────────────────────────────────
function ContextConfirmModal({ summary, onConfirm, onGoUpload }) {
  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">
          Ngữ cảnh phỏng vấn của bạn
        </h2>
        <p className="text-slate-400 text-sm">
          AI sẽ cá nhân hóa buổi phỏng vấn dựa trên thông tin này.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">CV</p>
          <p className="text-slate-200 text-sm">{summary?.cvSnippet}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">JD</p>
          <p className="text-slate-200 text-sm">{summary?.jdSnippet}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Thông tin chưa chính xác?{' '}
        <button onClick={onGoUpload} className="text-cta underline hover:text-cta/80 transition-colors">
          Upload lại CV/JD
        </button>
      </p>

      <button
        onClick={onConfirm}
        className="w-full px-4 py-3 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold transition-colors"
      >
        Tiếp tục
      </button>
    </div>
  )
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="w-10 h-10 text-cta animate-spin" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export default function InterviewSetupFlow({ navigate }) {
  const dispatch = useDispatch()
  const { step, missing, summary, loading, session } = useSelector(
    (s) => s.interviewSetup,
  )

  // Trigger preflight on mount
  useEffect(() => {
    dispatch(preflightRequest())
    return () => {
      // Keep session in store on done so interview room can read it
    }
  }, [dispatch])

  // Navigate to interview room when session is created
  useEffect(() => {
    if (step === 'done' && session) {
      navigate('interview-room')
    }
  }, [step, session, navigate])

  const handleClose = () => {
    dispatch(resetSetup())
    navigate('dashboard')
  }

  const handleGoUpload = () => {
    dispatch(resetSetup())
    navigate('dashboard-profile')
  }

  const handleStartSession = () => {
    dispatch(initSessionRequest())
  }

  // ─── Render step content ─────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 'idle':
      case 'preflight_loading':
        return <LoadingScreen message="Đang kiểm tra ngữ cảnh phỏng vấn..." />

      case 'context_missing':
        return (
          <MissingContextModal
            missing={missing}
            onGoUpload={handleGoUpload}
            onCancel={handleClose}
          />
        )

      case 'context_confirm':
        return (
          <ContextConfirmModal
            summary={summary}
            onConfirm={() => dispatch(confirmContext())}
            onGoUpload={handleGoUpload}
          />
        )

      case 'mode_select':
        return <ModeSelectionStep />

      case 'combat_permission':
        return <CombatPermissionGate />

      case 'round_select':
        return <RoundSelectionStep onStart={handleStartSession} />

      case 'initializing':
        return <LoadingScreen message="Đang khởi tạo phiên phỏng vấn..." />

      default:
        return null
    }
  }

  // Steps that should show a close button
  const showClose = !['preflight_loading', 'idle', 'initializing'].includes(step)

  return (
    // Fullscreen backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 sm:p-8">
        {showClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {loading && !['preflight_loading', 'initializing'].includes(step) && (
          <div className="absolute inset-0 rounded-2xl bg-slate-900/70 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-cta animate-spin" />
          </div>
        )}

        {renderStep()}
      </div>
    </div>
  )
}
