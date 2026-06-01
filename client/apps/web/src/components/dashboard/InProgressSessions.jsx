import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../router/routes'
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
import { resetBehavioral } from '../../store/slices/behavioralSlice'

const LEVEL_COLOR = {
  junior: 'text-sky-600 bg-sky-50 border-sky-200',
  mid: 'text-amber-600 bg-amber-50 border-amber-200',
  senior: 'text-rose-600 bg-rose-50 border-rose-200',
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
  if (Number.isNaN(diff)) return 'Vừa xong'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${Math.max(1, mins)} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

function SkeletonRow() {
  return (
    <div className="dash-muted-panel flex animate-pulse items-center gap-4 rounded-[16px] border p-4">
      <div className="dash-progress-track h-12 w-12 shrink-0 rounded-[14px]" />
      <div className="flex-1 space-y-2">
        <div className="dash-progress-track h-3.5 w-36 rounded" />
        <div className="dash-progress-track h-2.5 w-52 rounded opacity-70" />
      </div>
      <div className="dash-progress-track hidden h-4 w-20 rounded opacity-70 sm:block" />
      <div className="dash-progress-track h-7 w-20 rounded-full opacity-70" />
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

function SessionRow({ session, onResume, onViewResult }) {
  const isCompleted = session.behavioralSession?.status === 'COMPLETED'
  const stage = session.behavioralSession?.currentStage ?? 1
  const stageName = session.behavioralSession?.stageName ?? 'Giai đoạn 1'
  const { label: modeLabel, Icon: ModeIcon } = MODE_META[session.mode] ?? MODE_META.practice
  const levelColor = LEVEL_COLOR[session.candidateLevel] ?? 'text-gray-400 bg-gray-100 border-gray-200'
  const progress = Math.round((stage / 6) * 100)

  return (
    <div className="dash-muted-panel group flex items-center gap-4 rounded-[16px] border p-3.5 transition-colors duration-200 hover:bg-[var(--dash-surface-raised)] sm:p-4">
      <div className={[
        'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] border shadow-[var(--dash-shadow-control)]',
        isCompleted
          ? 'bg-cta/10 border-cta/30'
          : 'bg-amber-500/10 border-amber-500/30',
      ].join(' ')}
      >
        <ModeIcon size={14} className={isCompleted ? 'mb-0.5 text-cta' : 'mb-0.5 text-amber-500'} />
        <span className={['text-[10px] font-bold leading-none', isCompleted ? 'text-cta' : 'text-amber-500'].join(' ')}>
          {isCompleted ? '✓' : `${stage}/6`}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="dash-text truncate text-sm font-semibold">{modeLabel}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${levelColor}`}>
            {LEVEL_LABEL[session.candidateLevel] ?? session.candidateLevel}
          </span>
          {!isCompleted && (
            <span className="dash-subtle truncate text-xs">{stageName}</span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs font-medium text-cta">
              <CheckCircle size={10} />
              Đã hoàn thành
            </span>
          )}
          <span className="dash-subtle flex items-center gap-1 text-xs">
            <Clock size={10} />
            {formatRelativeTime(session.startedAt)}
          </span>
        </div>
      </div>

      {!isCompleted && (
        <div className="hidden w-20 shrink-0 flex-col gap-1 sm:flex">
          <div className="dash-progress-track h-1.5 w-full rounded-full">
            <div
              className="h-full rounded-full bg-amber-500/75 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="dash-subtle text-right text-[10px]">
            {progress}%
          </span>
        </div>
      )}

      {isCompleted ? (
        <button
          onClick={() => onViewResult(session)}
          className="dash-badge flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 hover:bg-[var(--dash-surface-raised)]"
        >
          <BarChart2 size={11} />
          Kết quả
        </button>
      ) : (
        <button
          onClick={() => onResume(session)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-cta/30 bg-cta/10 px-3 py-1.5 text-xs font-semibold text-cta transition-colors duration-200 hover:bg-cta/20"
        >
          <Play size={11} />
          Tiếp tục
        </button>
      )}
    </div>
  )
}

function AllSessionsModal({ onResume, onViewResult, onClose }) {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dash-card flex h-[650px] max-h-[92vh] w-full max-w-2xl flex-col rounded-[20px] border shadow-2xl">
        <div className="dash-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="dash-card-title">Lịch sử phỏng vấn</h2>
            <p className="dash-subtle mt-0.5 text-xs">
              {loading ? '...' : `${total} phiên`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="dash-icon-button flex h-9 w-9 items-center justify-center rounded-xl"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {loading ? (
            <SkeletonList count={10} />
          ) : sessions.length === 0 ? (
            <p className="dash-subtle py-8 text-center text-sm">Chưa có phiên phỏng vấn nào.</p>
          ) : (
            <>
              {sessions.map((session) => (
                <SessionRow
                  key={session.sessionId}
                  session={session}
                  onResume={(s) => { onResume(s); onClose() }}
                  onViewResult={(s) => { onViewResult(s); onClose() }}
                />
              ))}
              <div ref={sentinelRef} className="flex h-4 items-center justify-center">
                {loadingMore && <Loader2 size={16} className="dash-subtle animate-spin" />}
                {!loadingMore && sessions.length >= total && sessions.length > 0 && (
                  <span className="dash-subtle text-xs">Đã hiển thị tất cả</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InProgressSessions() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
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
    dispatch(resumeSession({
      sessionId: session.sessionId,
      candidateLevel: session.candidateLevel,
      mode: session.mode,
      behavioralSessionId: session.behavioralSession?.sessionId,
    }))
    dispatch(resetBehavioral())
    navigate(ROUTES.BEHAVIORAL_ROOM)
  }

  function handleViewResult(session) {
    dispatch(resetBehavioral())
    dispatch(resumeSession({
      sessionId: session.sessionId,
      candidateLevel: session.candidateLevel,
      mode: session.mode,
      behavioralSessionId: session.behavioralSession?.sessionId,
    }))
    navigate(ROUTES.SCORING)
  }

  if (loading) {
    return (
      <div className="dash-card rounded-[20px] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="dash-progress-track h-4 w-40 animate-pulse rounded" />
            <div className="dash-progress-track h-3 w-28 animate-pulse rounded opacity-70" />
          </div>
        </div>
        <SkeletonList count={6} />
      </div>
    )
  }

  if (sessions.length === 0 && total === 0) return null

  return (
    <>
      <div className="dash-card rounded-[20px] p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="dash-card-title">Lịch sử phỏng vấn</h2>
            <p className="dash-subtle mt-1 text-xs font-medium">
              {total} phiên gần nhất
            </p>
          </div>
          {total > DASHBOARD_LIMIT && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-cta/30 bg-cta/10 px-3 py-1.5 text-xs font-semibold text-cta transition-colors duration-200 hover:bg-cta/20"
            >
              Xem tất cả
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionRow key={session.sessionId} session={session} onResume={handleResume} onViewResult={handleViewResult} />
          ))}
        </div>
      </div>

      {showModal && (
        <AllSessionsModal
          onResume={handleResume}
          onViewResult={handleViewResult}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
