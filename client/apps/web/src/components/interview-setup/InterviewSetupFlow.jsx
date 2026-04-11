import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import {
  preflightRequest,
  saveContextRequest,
  resetSetup,
  initSessionRequest,
  proceedFromRoundSelect,
} from '../../store/slices/interviewSetupSlice'
import { resetBehavioral } from '../../store/slices/behavioralSlice'
import { resetCombatOrchestrator } from '../../store/slices/combatOrchestratorSlice'
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
        <AlertTriangle className="w-8 h-8 text-amber-400" />
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

// ─── Context confirm modal (editable) ────────────────────────────────────────
function ContextConfirmModal({ cv, jd, onConfirm, onGoUpload }) {
  const [cvExpanded, setCvExpanded] = useState(true)
  const [jdExpanded, setJdExpanded] = useState(true)

  const [skills, setSkills] = useState({
    languages: (cv?.skills?.languages ?? []).join(', '),
    frameworks: (cv?.skills?.frameworks ?? []).join(', '),
    tools: (cv?.skills?.tools ?? []).join(', '),
  })

  const [experiences, setExperiences] = useState(
    (cv?.experiences ?? []).map((e) => ({
      role: e.role ?? '',
      company: e.company ?? '',
      duration: e.duration ?? '',
      responsibilities: e.responsibilities ?? [],
    }))
  )

  const [jdForm, setJdForm] = useState({
    role: jd?.role ?? '',
    required_skills: (jd?.required_skills ?? []).join(', '),
    minimum_experience_years: jd?.minimum_experience_years ?? '',
    key_responsibilities: (jd?.key_responsibilities ?? []).join('\n'),
  })

  const handleConfirm = () => {
    const splitTrim = (str) =>
      str.split(',').map((s) => s.trim()).filter(Boolean)

    const updatedCv = {
      ...cv,
      skills: {
        languages: splitTrim(skills.languages),
        frameworks: splitTrim(skills.frameworks),
        tools: splitTrim(skills.tools),
      },
      experiences: experiences.map((e) => ({
        ...e,
      })),
    }

    const updatedJd = {
      ...jd,
      role: jdForm.role,
      required_skills: splitTrim(jdForm.required_skills),
      minimum_experience_years: jdForm.minimum_experience_years
        ? Number(jdForm.minimum_experience_years)
        : undefined,
      key_responsibilities: jdForm.key_responsibilities
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }

    onConfirm(updatedCv, updatedJd)
  }

  const inputCls =
    'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-cta transition-colors'
  const labelCls = 'block text-xs text-slate-500 mb-1 font-medium'

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">
          Ngữ cảnh phỏng vấn của bạn
        </h2>
        <p className="text-slate-400 text-sm">
          Kiểm tra và chỉnh sửa thông tin trước khi AI cá nhân hóa buổi phỏng vấn.
        </p>
      </div>

      {/* Form area */}
      <div className="flex flex-col gap-3">
        {/* CV Section */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setCvExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              CV của bạn
            </span>
            {cvExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {cvExpanded && (
            <div className="px-4 pb-4 flex flex-col gap-4 max-h-64 overflow-y-auto">
              {/* Skills */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Kỹ năng
                </p>
                <div>
                  <label className={labelCls}>Ngôn ngữ lập trình</label>
                  <input
                    className={inputCls}
                    value={skills.languages}
                    onChange={(e) =>
                      setSkills((s) => ({ ...s, languages: e.target.value }))
                    }
                    placeholder="JavaScript, TypeScript, Python..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Framework / Thư viện</label>
                  <input
                    className={inputCls}
                    value={skills.frameworks}
                    onChange={(e) =>
                      setSkills((s) => ({ ...s, frameworks: e.target.value }))
                    }
                    placeholder="React, NestJS, Spring Boot..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Công cụ / Hạ tầng</label>
                  <input
                    className={inputCls}
                    value={skills.tools}
                    onChange={(e) =>
                      setSkills((s) => ({ ...s, tools: e.target.value }))
                    }
                    placeholder="Docker, Git, PostgreSQL..."
                  />
                </div>
              </div>

              {/* Experiences */}
              {experiences.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Kinh nghiệm
                  </p>
                  {experiences.map((exp, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
                    >
                      <div>
                        {i === 0 && <label className={labelCls}>Vị trí</label>}
                        <input
                          className={inputCls}
                          value={exp.role}
                          onChange={(e) => {
                            const next = [...experiences]
                            next[i] = { ...next[i], role: e.target.value }
                            setExperiences(next)
                          }}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        {i === 0 && <label className={labelCls}>Công ty</label>}
                        <input
                          className={inputCls}
                          value={exp.company}
                          onChange={(e) => {
                            const next = [...experiences]
                            next[i] = { ...next[i], company: e.target.value }
                            setExperiences(next)
                          }}
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        {i === 0 && <label className={labelCls}>Thời gian</label>}
                        <input
                          className={inputCls + ' w-24'}
                          value={exp.duration}
                          onChange={(e) => {
                            const next = [...experiences]
                            next[i] = { ...next[i], duration: e.target.value }
                            setExperiences(next)
                          }}
                          placeholder="2 years"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* JD Section */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setJdExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              JD - Vị trí ứng tuyển
            </span>
            {jdExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {jdExpanded && (
            <div className="px-4 pb-4 flex flex-col gap-3 max-h-64 overflow-y-auto">
              <div>
                <label className={labelCls}>Vị trí tuyển dụng</label>
                <input
                  className={inputCls}
                  value={jdForm.role}
                  onChange={(e) =>
                    setJdForm((f) => ({ ...f, role: e.target.value }))
                  }
                  placeholder="Frontend Engineer"
                />
              </div>
              <div>
                <label className={labelCls}>Kỹ năng yêu cầu (phân cách bằng dấu phẩy)</label>
                <input
                  className={inputCls}
                  value={jdForm.required_skills}
                  onChange={(e) =>
                    setJdForm((f) => ({ ...f, required_skills: e.target.value }))
                  }
                  placeholder="React, TypeScript, REST API..."
                />
              </div>
              <div>
                <label className={labelCls}>Số năm kinh nghiệm tối thiểu</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  className={inputCls + ' w-24'}
                  value={jdForm.minimum_experience_years}
                  onChange={(e) =>
                    setJdForm((f) => ({
                      ...f,
                      minimum_experience_years: e.target.value,
                    }))
                  }
                  placeholder="2"
                />
              </div>
              <div>
                <label className={labelCls}>Trách nhiệm chính (mỗi dòng một mục)</label>
                <textarea
                  rows={3}
                  className={inputCls + ' resize-none'}
                  value={jdForm.key_responsibilities}
                  onChange={(e) =>
                    setJdForm((f) => ({
                      ...f,
                      key_responsibilities: e.target.value,
                    }))
                  }
                  placeholder="Phát triển tính năng frontend&#10;Review code và mentoring..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Thông tin không đúng?{' '}
        <button
          onClick={onGoUpload}
          className="text-cta underline hover:text-cta/80 transition-colors"
        >
          Upload lại CV/JD
        </button>
      </p>

      <button
        onClick={handleConfirm}
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
  const { step, missing, cv, jd, loading, session, selectedRounds } = useSelector(
    (s) => s.interviewSetup,
  )

  // Trigger preflight on mount
  useEffect(() => {
    dispatch(preflightRequest())
  }, [dispatch])

  const selectedMode = useSelector((s) => s.interviewSetup.selectedMode)

  // Navigate to the correct room when session is created
  useEffect(() => {
    if (step === 'done' && session) {
      if (selectedRounds.includes('hr_behavioral')) {
        // Clear stale state before entering the room so first render sees clean slate
        dispatch(resetBehavioral())
        if (selectedMode === 'combat') dispatch(resetCombatOrchestrator())
        navigate(selectedMode === 'combat' ? 'combat-room' : 'behavioral-room')
      } else {
        navigate('interview-room')
      }
    }
  }, [step, session, selectedRounds, selectedMode, navigate])

  const handleClose = () => {
    dispatch(resetSetup())
    navigate('dashboard')
  }

  const handleGoUpload = () => {
    dispatch(resetSetup())
    navigate('dashboard-profile')
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
            cv={cv}
            jd={jd}
            onConfirm={handleSaveContext}
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
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 sm:p-8">
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
