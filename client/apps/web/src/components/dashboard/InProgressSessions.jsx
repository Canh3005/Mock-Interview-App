/**
 * InProgressSessions — Lịch sử phỏng vấn (in-progress + completed).
 * Dashboard: fetch limit=5. Modal: fetch 10 mỗi lần, infinite scroll.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import {
  Play,
  Clock,
  ChevronRight,
  X,
  Swords,
  BookOpen,
  CheckCircle,
  Loader2,
  BarChart2,
} from 'lucide-react'
import { interviewApi } from '../../api/interview.api'
import { resumeSession } from '../../store/slices/interviewSetupSlice'

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_COLOR = {
  junior: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  mid: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  senior: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
}
const LEVEL_LABEL = { junior: 'Junior', mid: 'Mid-level', senior: 'Senior' }
const MODE_META = {
  combat: { label: 'Combat Interview', Icon: Swords },
  practice: { label: 'Practice Interview', Icon: BookOpen },
}
const MODAL_PAGE_SIZE = 10
const DASHBOARD_LIMIT = 6

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-slate-700/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 bg-slate-700/60 rounded" />
        <div className="h-2.5 w-52 bg-slate-700/40 rounded" />
      </div>
      <div className="hidden sm:block w-20 h-4 bg-slate-700/40 rounded" />
      <div className="w-20 h-7 bg-slate-700/40 rounded-full" />
    </div>
  )
}

function SkeletonList({ count = 6 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ session, onResume }) {
  const isCompleted = session.behavioralSession?.status === 'COMPLETED'
  const stage = session.behavioralSession?.currentStage ?? 1
  const stageName = session.behavioralSession?.stageName ?? 'Giai đoạn 1'
  const { label: modeLabel, Icon: ModeIcon } = MODE_META[session.mode] ?? MODE_META.practice
  const levelColor = LEVEL_COLOR[session.candidateLevel] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/30'

  return (
    <div className="group flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200">
      {/* Mode icon + stage */}
      <div className={[
        'shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border',
        isCompleted
          ? 'bg-cta/10 border-cta/30'
          : 'bg-amber-500/10 border-amber-500/30',
      ].join(' ')}>
        <ModeIcon size={14} className={isCompleted ? 'text-cta mb-0.5' : 'text-amber-400 mb-0.5'} />
        <span className={['font-heading text-[10px] font-bold leading-none', isCompleted ? 'text-cta' : 'text-amber-400'].join(' ')}>
          {isCompleted ? '✓' : `${stage}/6`}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-white truncate">{modeLabel}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`font-body text-[10px] font-medium px-2 py-0.5 rounded border ${levelColor}`}>
            {LEVEL_LABEL[session.candidateLevel] ?? session.candidateLevel}
          </span>
          {!isCompleted && (
            <span className="font-body text-xs text-slate-400 truncate">{stageName}</span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 font-body text-xs text-cta">
              <CheckCircle size={10} />
              Đã hoàn thành
            </span>
          )}
          <span className="flex items-center gap-1 font-body text-xs text-slate-500">
            <Clock size={10} />
            {formatRelativeTime(session.startedAt)}
          </span>
        </div>
      </div>

      {/* Progress bar — only for in-progress */}
      {!isCompleted && (
        <div className="hidden sm:flex flex-col gap-1 w-20 shrink-0">
          <div className="w-full h-1.5 rounded-full bg-slate-700/60">
            <div
              className="h-full rounded-full bg-amber-500/70 transition-all duration-300"
              style={{ width: `${Math.round((stage / 6) * 100)}%` }}
            />
          </div>
          <span className="font-body text-[10px] text-slate-500 text-right">
            {Math.round((stage / 6) * 100)}%
          </span>
        </div>
      )}

      {/* Action button */}
      {isCompleted ? (
        <button className="shrink-0 flex items-center gap-1.5 font-body text-xs font-medium text-slate-400 bg-slate-700/40 border border-slate-600/40 hover:bg-slate-700/60 transition-colors duration-200 cursor-pointer px-3 py-1.5 rounded-full">
          <BarChart2 size={11} />
          Kết quả
        </button>
      ) : (
        <button
          onClick={() => onResume(session)}
          className="shrink-0 flex items-center gap-1.5 font-body text-xs font-medium text-cta bg-cta/10 border border-cta/30 hover:bg-cta/20 transition-colors duration-200 cursor-pointer px-3 py-1.5 rounded-full"
        >
          <Play size={11} />
          Tiếp tục
        </button>
      )}
    </div>
  )
}

// ─── All Sessions Modal (infinite scroll) ─────────────────────────────────────

function AllSessionsModal({ onResume, onClose }) {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  // Initial fetch
  useEffect(() => {
    interviewApi
      .getInterviewHistory({ limit: MODAL_PAGE_SIZE, offset: 0 })
      .then((res) => {
        setSessions(Array.isArray(res?.data) ? res.data : [])
        setTotal(res?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load next page
  const loadMore = useCallback(() => {
    if (loadingMore || sessions.length >= total) return
    setLoadingMore(true)
    interviewApi
      .getInterviewHistory({ limit: MODAL_PAGE_SIZE, offset: sessions.length })
      .then((res) => {
        setSessions((prev) => [...prev, ...(Array.isArray(res?.data) ? res.data : [])])
        setTotal(res?.total ?? total)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, sessions.length, total])

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-primary border border-slate-700/60 rounded-[12px] shadow-2xl w-full max-w-2xl flex flex-col h-[650px] max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div>
            <h2 className="font-heading text-base font-semibold text-white tracking-tight">
              Lịch sử phỏng vấn
            </h2>
            <p className="font-body text-xs text-slate-400 mt-0.5">
              {loading ? '...' : `${total} phiên`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors duration-150 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <SkeletonList count={10} />
          ) : sessions.length === 0 ? (
            <p className="font-body text-sm text-slate-500 text-center py-8">Chưa có phiên phỏng vấn nào.</p>
          ) : (
            <>
              {sessions.map((session) => (
                <SessionRow
                  key={session.sessionId}
                  session={session}
                  onResume={(s) => { onResume(s); onClose() }}
                />
              ))}
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-4 flex items-center justify-center">
                {loadingMore && <Loader2 size={16} className="text-slate-500 animate-spin" />}
                {!loadingMore && sessions.length >= total && sessions.length > 0 && (
                  <span className="font-body text-xs text-slate-600">Đã hiển thị tất cả</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InProgressSessions({ navigate }) {
  const dispatch = useDispatch()
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    interviewApi
      .getInterviewHistory({ limit: DASHBOARD_LIMIT, offset: 0 })
      .then((res) => {
        setSessions(Array.isArray(res?.data) ? res.data : [])
        setTotal(res?.total ?? 0)
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  function handleResume(session) {
    dispatch(resumeSession({ sessionId: session.sessionId, candidateLevel: session.candidateLevel }))
    navigate(session.mode === 'combat' ? 'combat-room' : 'behavioral-room')
  }

  if (loading) {
    return (
      <div className="bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-3 w-28 bg-slate-700/40 rounded animate-pulse" />
          </div>
        </div>
        <SkeletonList count={6} />
      </div>
    )
  }

  if (sessions.length === 0 && total === 0) return null

  return (
    <>
      <div className="bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading text-base font-semibold text-white tracking-tight">
              Lịch sử phỏng vấn
            </h2>
            <p className="font-body text-xs text-slate-400 mt-0.5">
              {total} phiên
            </p>
          </div>
          {total > DASHBOARD_LIMIT && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 font-body text-xs font-medium text-cta bg-cta/10 border border-cta/30 hover:bg-cta/20 transition-colors duration-200 cursor-pointer px-3 py-1.5 rounded-full"
            >
              Xem tất cả
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* Session list — max DASHBOARD_LIMIT */}
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionRow key={session.sessionId} session={session} onResume={handleResume} />
          ))}
        </div>
      </div>

      {showModal && (
        <AllSessionsModal
          onResume={handleResume}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
