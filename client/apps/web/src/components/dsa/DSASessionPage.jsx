import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../../router/routes'
import {
  Play,
  Send,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Code2,
  MessageSquare,
  ArrowLeft,
  RotateCcw,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  submitProblem,
  approachSubmitted,
  switchProblem,
  nextProblemPending,
  changeLanguage,
  unlockHint,
  resetDSASession,
} from '../../store/slices/dsaSessionSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import { resetBehavioral } from '../../store/slices/behavioralSlice'
import { markSolved } from '../../store/slices/practiceDSASlice'
import { dsaApi } from '../../api/dsa.api'
import { practiceApi } from '../../api/practice.api'
import HintsPanel from './HintsPanel'
import ApproachBox from './ApproachBox'
import CodeEditor from './CodeEditor'
import RunResultPanel from './RunResultPanel'
import AIChat from './AIChat'
import SessionTimer from './SessionTimer'
import EmbeddedCameraFeed from '../shared/ui/EmbeddedCameraFeed'
import { useCombatSession } from '../../hooks/useCombatSession'

const DIFF_COLOR = { EASY: 'text-emerald-400', MEDIUM: 'text-yellow-400', HARD: 'text-red-400' }
const DIFF_BG = {
  EASY: 'bg-emerald-500/10 border-emerald-500/20',
  MEDIUM: 'bg-yellow-500/10 border-yellow-500/20',
  HARD: 'bg-red-500/10 border-red-500/20',
}
const DIFF_LABEL_KEY = {
  EASY: 'dsaRoom.difficulty.easy',
  MEDIUM: 'dsaRoom.difficulty.medium',
  HARD: 'dsaRoom.difficulty.hard',
}

const MIN_LEFT = 240
const MIN_RIGHT = 320
const MIN_CONSOLE = 36
const MAX_CONSOLE = 480
const DEFAULT_LEFT = 420

function useIsWideLayout() {
  const [isWide, setIsWide] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 1024px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(min-width: 1024px)')
    const handleChange = () => setIsWide(media.matches)
    handleChange()
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [])

  return isWide
}

function DifficultyBadge({ difficulty }) {
  const { t } = useTranslation()
  if (!difficulty) return null

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${DIFF_BG[difficulty] ?? ''} ${DIFF_COLOR[difficulty] ?? ''}`}>
      {t(DIFF_LABEL_KEY[difficulty] ?? 'dsaRoom.difficulty.unknown', { defaultValue: difficulty })}
    </span>
  )
}

function CodeBlock({ children }) {
  return (
    <pre className="dsa-code-block mt-1 rounded-lg px-3 py-2 font-mono text-xs whitespace-pre-wrap break-all">
      {children}
    </pre>
  )
}

function TestcasePanel({ testCases }) {
  const { t } = useTranslation()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const safeIdx = Math.min(selectedIdx, Math.max(0, testCases.length - 1))
  const selected = testCases[safeIdx] ?? null

  if (!testCases.length) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-[var(--dash-subtle)]">
        {t('dsaRoom.problem.publicTestsEmpty')}
      </div>
    )
  }

  return (
    <div className="space-y-3 py-1">
      <div className="flex flex-wrap gap-1.5">
        {testCases.map((tc, i) => (
          <button
            key={tc.id}
            onClick={() => setSelectedIdx(i)}
            className={[
              'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              safeIdx === i
                ? 'border-cta bg-cta/15 text-cta'
                : 'dash-control text-[var(--dash-muted)]',
            ].join(' ')}
          >
            {t('dsaRoom.problem.caseLabel', { index: i + 1 })}
          </button>
        ))}
      </div>

      {selected && (
        <div>
          <p className="mb-1 text-xs font-medium text-[var(--dash-subtle)]">{t('dsaRoom.problem.input')}</p>
          <CodeBlock>{selected.inputData}</CodeBlock>
        </div>
      )}
    </div>
  )
}

function ProblemSummary({ problem }) {
  if (!problem) return null

  return (
    <div className="space-y-2">
      <h1 className="font-heading text-base font-bold leading-snug text-[var(--dash-text)]">
        {problem.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        {problem.tags?.map((tag) => (
          <span key={tag} className="dash-chip rounded-full border px-2 py-0.5 text-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function ProblemMarkdown({ problem }) {
  const { t } = useTranslation()

  if (!problem) return null

  return (
    <>
      <div className="dsa-problem-markdown prose prose-sm max-w-none leading-relaxed text-[var(--dash-muted)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {problem.description}
        </ReactMarkdown>
      </div>

      {problem.constraints?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dash-subtle)]">
            {t('dsaRoom.problem.constraints')}
          </p>
          <ul className="space-y-1">
            {problem.constraints.map((constraint, index) => (
              <li key={index} className="flex gap-2 font-mono text-xs text-[var(--dash-muted)]">
                <span className="shrink-0 text-[var(--dash-subtle)]">•</span>
                {constraint}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function ExitConfirmModal({ onCancel, onConfirm }) {
  const { t } = useTranslation()

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="dash-card w-full max-w-sm rounded-[20px] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-500">
            <LogOut size={18} />
          </div>
          <div>
            <h2 className="dash-text text-base font-bold">{t('dsaRoom.exitModal.title')}</h2>
            <p className="dash-subtle mt-1 text-sm leading-relaxed">{t('dsaRoom.exitModal.description')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="dash-control flex-1 rounded-[14px] border px-4 py-2.5 text-sm font-semibold"
          >
            {t('dsaRoom.exitModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            {t('dsaRoom.exitModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CenterOverlay({ children }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {children}
    </div>
  )
}

export default function DSASessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const {
    sessionId,
    problems,
    sessionProblems,
    activeProblemId,
    problemProgress,
    aiConversation,
    lastRunResults,
    scoringStatus,
    mode,
    templates,
    editorCode,
    testCases: allTestCases,
    unlockedHints,
    pendingNextProblemId,
  } = useSelector((s) => s.dsaSession)

  const interviewSessionId = useSelector((s) => s.interviewSetup.session?.sessionId)
  const isWideLayout = useIsWideLayout()
  const roomRef = useRef(null)
  const videoRef = useRef(null)
  const { mediaStream } = useCombatSession({ mode, interviewSessionId, videoRef, aiConversation })

  const activeSessionProblem = sessionProblems.find((sp) => sp.problemId === activeProblemId)
  const currentLanguage = activeSessionProblem?.language ?? 'python'
  const availableLanguages = [...new Set(
    Object.values(templates ?? {}).flat().map((template) => template.languageId),
  )]
  const currentStarterCode =
    (templates?.[activeProblemId] ?? []).find((template) => template.languageId === currentLanguage)?.starterCode ?? ''

  const [leftTab, setLeftTab] = useState('problem')
  const [mobilePanel, setMobilePanel] = useState('problem')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleTab, setConsoleTab] = useState('testcase')
  const [runLoading, setRunLoading] = useState(false)
  const [practiceSubmitDone, setPracticeSubmitDone] = useState(false)
  const [showHiddenResults, setShowHiddenResults] = useState({})
  const [transitionCountdown, setTransitionCountdown] = useState(null)
  const [showExitModal, setShowExitModal] = useState(false)

  const containerRef = useRef(null)
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT)
  const [consoleHeight, setConsoleHeight] = useState(180)

  const draggingH = useRef(false)
  const draggingV = useRef(false)
  const dragStartX = useRef(0)
  const dragStartLeft = useRef(0)
  const dragStartY = useRef(0)
  const dragStartConsole = useRef(0)

  const activeProblem = problems.find((problem) => problem.id === activeProblemId) ?? null
  const activePhase = problemProgress[activeProblemId]?.phase ?? 'READ'
  const runResults = lastRunResults[activeProblemId] ?? null
  const publicTestCases = allTestCases[activeProblemId] ?? []
  const showHidden = showHiddenResults[activeProblemId] ?? false
  const visibleResults = showHidden
    ? (runResults?.results ?? [])
    : (runResults?.results?.filter((result) => !result.isHidden) ?? [])
  const passed = visibleResults.filter((result) => result.status === 'AC').length
  const total = visibleResults.length
  const aiCount = aiConversation.filter((message) => message.problemId === activeProblemId).length
  const isSoloMode = mode === 'solo' || location.pathname === ROUTES.DSA_ROOM_SOLO

  useEffect(() => {
    if (activePhase === 'CODE' || activePhase === 'DONE') setMobilePanel('workspace')
    else setMobilePanel('problem')
  }, [activePhase, activeProblemId])

  const onMouseMoveGlobal = useCallback((event) => {
    if (draggingH.current && containerRef.current && isWideLayout) {
      const containerW = containerRef.current.offsetWidth
      const delta = event.clientX - dragStartX.current
      const next = dragStartLeft.current + delta
      const clamped = Math.min(Math.max(next, MIN_LEFT), containerW - MIN_RIGHT - 6)
      setLeftWidth(clamped)
    }
    if (draggingV.current) {
      const delta = dragStartY.current - event.clientY
      const next = dragStartConsole.current + delta
      const clamped = Math.min(Math.max(next, MIN_CONSOLE + 1), MAX_CONSOLE)
      setConsoleHeight(clamped)
      if (clamped > MIN_CONSOLE) setConsoleOpen(true)
    }
  }, [isWideLayout])

  const onMouseUpGlobal = useCallback(() => {
    if (draggingH.current || draggingV.current) {
      draggingH.current = false
      draggingV.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMoveGlobal)
    window.addEventListener('mouseup', onMouseUpGlobal)
    return () => {
      window.removeEventListener('mousemove', onMouseMoveGlobal)
      window.removeEventListener('mouseup', onMouseUpGlobal)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [onMouseMoveGlobal, onMouseUpGlobal])

  useEffect(() => {
    if (runResults) {
      setConsoleOpen(true)
      setConsoleTab('result')
      setMobilePanel('workspace')
    }
  }, [runResults])

  useEffect(() => {
    if (scoringStatus === 'completed') navigate(ROUTES.SCORING)
  }, [scoringStatus, navigate])

  useEffect(() => {
    if (!pendingNextProblemId) {
      setTransitionCountdown(null)
      return undefined
    }
    setTransitionCountdown(3)
    const id = setInterval(() =>
      setTransitionCountdown((count) => (count !== null && count > 1 ? count - 1 : null)),
    1000)
    return () => clearInterval(id)
  }, [pendingNextProblemId])

  const startDragH = (event) => {
    if (!isWideLayout) return
    event.preventDefault()
    draggingH.current = true
    dragStartX.current = event.clientX
    dragStartLeft.current = leftWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const startDragV = (event) => {
    event.preventDefault()
    draggingV.current = true
    dragStartY.current = event.clientY
    dragStartConsole.current = consoleOpen ? consoleHeight : MIN_CONSOLE
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  const handleReadyForApproach = () => {
    dispatch(approachSubmitted({
      problemId: activeProblemId,
      approachText: '',
      updatedProgress: { phase: isSoloMode ? 'CODE' : 'APPROACH' },
    }))
    if (isSoloMode) setMobilePanel('workspace')
  }

  const handleApproachSubmit = async (problemId, approachText) => {
    try {
      const updated = await dsaApi.submitApproach(sessionId, problemId, approachText)
      dispatch(approachSubmitted({
        problemId,
        approachText,
        updatedProgress: updated.problemProgress?.[problemId] ?? { phase: 'CODE' },
      }))
      setMobilePanel('workspace')
    } catch {
      toast.error(t('dsaRoom.toast.approachFailed'))
    }
  }

  const handleRun = async () => {
    if (!activeProblemId || runLoading) return
    setRunLoading(true)
    try {
      const code = editorCode[activeProblemId]?.[currentLanguage] ?? ''
      const result = isSoloMode
        ? await practiceApi.runCode(activeProblemId, code, currentLanguage)
        : await dsaApi.runCode(sessionId, activeProblemId, code, currentLanguage)
      dispatch({ type: 'dsaSession/runCompleted', payload: { problemId: activeProblemId, ...result } })
      setShowHiddenResults((prev) => ({ ...prev, [activeProblemId]: false }))
    } catch {
      toast.error(t('dsaRoom.toast.runFailed'))
    } finally {
      setRunLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!activeProblemId) return
    if (isSoloMode) {
      try {
        const code = editorCode[activeProblemId]?.[currentLanguage] ?? ''
        const runResult = await practiceApi.runCode(activeProblemId, code, currentLanguage)
        dispatch({ type: 'dsaSession/runCompleted', payload: { problemId: activeProblemId, ...runResult } })
        setShowHiddenResults((prev) => ({ ...prev, [activeProblemId]: true }))
        await practiceApi.submitProblem(activeProblemId, code, currentLanguage, unlockedHints[activeProblemId] ?? [])
        dispatch(submitProblem({ problemId: activeProblemId }))
        dispatch(markSolved(activeProblemId))
        setPracticeSubmitDone(true)
      } catch {
        toast.error(t('dsaRoom.toast.submitFailed'))
      }
    } else {
      dispatch(submitProblem({ problemId: activeProblemId }))
    }
  }

  const handleTimerExpire = () => {
    problems.forEach((problem) => {
      if (!problemProgress[problem.id]?.submittedAt) dispatch(submitProblem({ problemId: problem.id }))
    })
  }

  const handleConfirmExit = () => {
    dispatch(resetBehavioral())
    dispatch(resetDSASession())
    dispatch(resetSetup())
    navigate(ROUTES.DASHBOARD)
  }

  const rootClassName = [
    'relative flex flex-col overflow-hidden',
    'h-full min-h-0 gap-2 p-2 text-[var(--dash-text)] sm:gap-3 sm:p-3',
  ].join(' ')

  if ((mode !== 'solo' && !sessionId) || !activeProblemId || !problems.length) {
    return (
      <div ref={roomRef} className={rootClassName}>
        <div className="flex h-full min-h-0 items-center justify-center">
          <div className="dash-card flex flex-col items-center gap-3 rounded-[20px] p-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--dash-border-strong)] border-t-cta" />
            <span className="text-sm font-medium text-[var(--dash-muted)]">{t('dsaRoom.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  const resolvedLeft = leftWidth
  const headerClassName = 'dash-card flex min-h-12 shrink-0 flex-wrap items-center gap-2 rounded-[18px] px-3 py-2 shadow-shell'
  const panelClassName = 'dash-card flex flex-col overflow-hidden rounded-[18px]'

  return (
    <div ref={roomRef} className={rootClassName}>
      <nav className={headerClassName}>
        <div className="order-3 flex w-full min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {problems.map((problem, index) => {
            const isDone = !!problemProgress[problem.id]?.submittedAt
            const isActive = problem.id === activeProblemId
            return (
              <button
                key={problem.id}
                onClick={() => dispatch(switchProblem(problem.id))}
                className={[
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-[12px] border px-3 text-xs font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-cta bg-cta/15 text-cta'
                    : 'dash-control text-[var(--dash-muted)] hover:text-[var(--dash-text)]',
                ].join(' ')}
              >
                {isDone
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  : <span className={`shrink-0 text-[10px] font-bold ${DIFF_COLOR[problem.difficulty] ?? 'text-[var(--dash-subtle)]'}`}>{index + 1}</span>}
                <span className="max-w-[140px] truncate">{problem.title ?? t('dsaRoom.header.problemFallback', { index: index + 1 })}</span>
              </button>
            )
          })}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {availableLanguages.length > 1 ? (
            <select
              value={currentLanguage}
              onChange={(event) => dispatch(changeLanguage({ problemId: activeProblemId, language: event.target.value }))}
              className="dash-input h-8 rounded-[12px] px-2 text-xs font-semibold"
            >
              {availableLanguages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          ) : (
            <span className="dash-chip rounded-[12px] border px-2.5 py-1 text-xs font-semibold">
              {currentLanguage}
            </span>
          )}

          <SessionTimer
            mode={mode}
            difficulty={activeProblem?.difficulty ?? 'MEDIUM'}
            onExpire={handleTimerExpire}
          />

          {activePhase === 'CODE' && (
            <>
              <button
                disabled={runLoading}
                onClick={handleRun}
                className="dash-control flex h-8 items-center gap-1.5 rounded-[12px] border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                {runLoading ? t('dsaRoom.actions.running') : t('dsaRoom.actions.run')}
              </button>
              <button
                disabled={!!problemProgress[activeProblemId]?.submittedAt}
                onClick={handleSubmit}
                className="dash-primary-button flex h-8 items-center gap-1.5 rounded-[12px] px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-3.5 w-3.5" />
                {t('dsaRoom.actions.submit')}
              </button>
            </>
          )}

          {!isSoloMode && (
            <button
              onClick={() => setShowExitModal(true)}
              className="dash-control flex h-8 items-center gap-1.5 rounded-[12px] border px-3 text-xs font-semibold transition-colors hover:text-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('dsaRoom.header.exit')}
            </button>
          )}

          {isSoloMode && (
            <button
              onClick={() => navigate(ROUTES.PRACTICE_PROBLEMS)}
              className="dash-control flex h-8 items-center gap-1.5 rounded-[12px] border px-3 text-xs font-semibold transition-colors hover:text-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('dsaRoom.header.exit')}
            </button>
          )}
        </div>
      </nav>

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <button
          onClick={() => setMobilePanel('problem')}
          className={[
            'flex h-10 items-center justify-center gap-2 rounded-[14px] border text-sm font-semibold',
            mobilePanel === 'problem' ? 'dash-nav-active' : 'dash-control',
          ].join(' ')}
        >
          <Code2 className="h-4 w-4" />
          {t('dsaRoom.tabs.problem')}
        </button>
        <button
          onClick={() => setMobilePanel('workspace')}
          className={[
            'flex h-10 items-center justify-center gap-2 rounded-[14px] border text-sm font-semibold',
            mobilePanel === 'workspace' ? 'dash-nav-active' : 'dash-control',
          ].join(' ')}
        >
          <Play className="h-4 w-4" />
          {t('dsaRoom.tabs.workspace')}
        </button>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden lg:flex-row lg:gap-1.5">
        <div
          className={[
            panelClassName,
            'min-h-0 w-full lg:shrink-0',
            mobilePanel === 'problem' ? 'flex' : 'hidden lg:flex',
          ].join(' ')}
          style={isWideLayout ? { width: resolvedLeft } : undefined}
        >
          {!isSoloMode && <EmbeddedCameraFeed mediaStream={mediaStream} />}
          <div className="flex shrink-0 items-center overflow-hidden border-b border-[var(--dash-border)]">
            {[
              { key: 'problem', label: t('dsaRoom.tabs.problem'), Icon: Code2 },
              ...(isSoloMode ? [] : [{ key: 'ai', label: t('dsaRoom.tabs.ai'), Icon: MessageSquare }]),
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setLeftTab(key)}
                className={[
                  'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
                  leftTab === key
                    ? 'border-cta text-cta'
                    : 'border-transparent text-[var(--dash-subtle)] hover:text-[var(--dash-text)]',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === 'ai' && aiCount > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cta text-[9px] font-bold leading-none text-[var(--dash-accent-contrast)]">
                    {aiCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {leftTab === 'problem' && activeProblem && (
              <div className="space-y-5 p-5">
                <ProblemSummary problem={activeProblem} />
                <ProblemMarkdown problem={activeProblem} />

                {activePhase === 'READ' && (
                  <div className="border-t border-[var(--dash-border)] pt-3">
                    <p className="mb-3 text-xs text-[var(--dash-subtle)]">
                      {t('dsaRoom.problem.readInstruction')}
                    </p>
                    <button
                      onClick={handleReadyForApproach}
                      className="dash-control w-full rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition-colors"
                    >
                      {isSoloMode ? t('dsaRoom.actions.startCode') : t('dsaRoom.actions.readyApproach')}
                    </button>
                  </div>
                )}

                {activePhase === 'APPROACH' && (
                  <ApproachBox problemId={activeProblemId} onSubmit={handleApproachSubmit} />
                )}

                {activeProblem.hints?.length > 0 && activePhase !== 'READ' && activePhase !== 'DONE' && (
                  <div className="border-t border-[var(--dash-border)] pt-4">
                    <HintsPanel
                      hints={activeProblem.hints}
                      unlockedIndices={unlockedHints[activeProblemId] ?? []}
                      onUnlock={(hintIndex) => dispatch(unlockHint({ problemId: activeProblemId, hintIndex }))}
                    />
                  </div>
                )}

                {activePhase === 'DONE' && (
                  <div className="flex items-center gap-2 rounded-[14px] border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">{t('dsaRoom.problem.submitted')}</span>
                  </div>
                )}
              </div>
            )}

            {leftTab === 'ai' && (
              <div className="p-3">
                <AIChat messages={aiConversation} problemId={activeProblemId} />
              </div>
            )}
          </div>
        </div>

        <div
          className="hidden w-1.5 shrink-0 cursor-col-resize select-none items-center justify-center rounded-full lg:flex"
          onMouseDown={startDragH}
        >
          <div className="h-12 w-1 rounded-full bg-[var(--dash-border-strong)] transition-colors group-hover:bg-[var(--dash-muted)]" />
        </div>

        <div
          className={[
            'min-h-0 min-w-0 flex-1 flex-col gap-1.5',
            mobilePanel === 'workspace' ? 'flex' : 'hidden lg:flex',
          ].join(' ')}
        >
          <div className="dsa-code-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-800 px-3">
              <Code2 className="h-4 w-4 text-slate-400" />
              <span className="font-mono text-xs font-semibold uppercase text-slate-400">
                {currentLanguage}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-1.5">
              {(activePhase === 'CODE' || activePhase === 'DONE') ? (
                <CodeEditor
                  problemId={activeProblemId}
                  starterCode={currentStarterCode}
                  disabled={activePhase === 'DONE' || scoringStatus === 'scoring'}
                />
              ) : (
                <div className="flex h-full select-none flex-col items-center justify-center gap-3 text-center">
                  <Code2 className="h-10 w-10 text-slate-700" />
                  <p className="px-4 text-sm text-slate-500">
                    {activePhase === 'READ'
                      ? t('dsaRoom.problem.readPlaceholder')
                      : t('dsaRoom.problem.approachPlaceholder')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className="flex h-1.5 shrink-0 cursor-row-resize select-none items-center justify-center rounded-full"
            onMouseDown={startDragV}
          >
            <div className="h-1 w-12 rounded-full bg-[var(--dash-border-strong)] transition-colors" />
          </div>

          <div
            className="dsa-code-surface flex shrink-0 flex-col overflow-hidden rounded-[18px] border"
            style={{ height: consoleOpen ? consoleHeight : 40 }}
          >
            <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-slate-800 px-1">
              <button
                onClick={() => setConsoleOpen((value) => !value)}
                className="shrink-0 p-1.5 text-slate-500 transition-colors hover:text-slate-300"
                aria-label={consoleOpen ? t('dsaRoom.console.collapse') : t('dsaRoom.console.expand')}
              >
                {consoleOpen
                  ? <ChevronDown className="h-3.5 w-3.5" />
                  : <ChevronUp className="h-3.5 w-3.5" />}
              </button>

              {[
                { key: 'testcase', label: t('dsaRoom.tabs.testcase') },
                { key: 'result', label: t('dsaRoom.tabs.result') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setConsoleTab(tab.key)
                    if (!consoleOpen) setConsoleOpen(true)
                  }}
                  className={[
                    'h-full border-b-2 px-3 text-xs font-semibold transition-colors',
                    consoleTab === tab.key
                      ? 'border-cta text-cta'
                      : 'border-transparent text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}

              {runResults && consoleTab === 'result' && (
                <span className={`ml-auto mr-2 text-xs font-semibold tabular-nums ${passed === total && total > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t('dsaRoom.results.passedCount', { passed, total })}
                </span>
              )}
            </div>

            {consoleOpen && (
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {consoleTab === 'testcase' ? (
                  <TestcasePanel testCases={publicTestCases} />
                ) : (
                  <RunResultPanel results={runResults?.results ?? null} showHidden={showHidden} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mode !== 'solo' && scoringStatus === 'scoring' && (
        <CenterOverlay>
          <div className="dash-card max-w-sm rounded-[20px] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-cta border-t-transparent" />
            <p className="dash-text font-semibold">{t('dsaRoom.overlay.scoringTitle')}</p>
            <p className="dash-subtle mt-1 text-sm">{t('dsaRoom.overlay.scoringBody')}</p>
          </div>
        </CenterOverlay>
      )}

      {mode !== 'solo' && pendingNextProblemId && (
        <CenterOverlay>
          <div className="dash-card w-full max-w-xs rounded-[20px] p-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="dash-text mt-3 font-semibold">{t('dsaRoom.overlay.nextTitle')}</p>
            <p className="dash-subtle mt-1 text-sm">
              {t('dsaRoom.overlay.nextBody', { seconds: transitionCountdown ?? 0 })}
            </p>
            <button
              onClick={() => {
                dispatch(nextProblemPending(null))
                dispatch(switchProblem(pendingNextProblemId))
              }}
              className="dash-primary-button mt-4 w-full rounded-[14px] px-4 py-2.5 text-sm font-bold"
            >
              {t('dsaRoom.actions.openNow')}
            </button>
          </div>
        </CenterOverlay>
      )}

      <video ref={videoRef} muted playsInline style={{ display: 'none' }} />

      {mode === 'solo' && practiceSubmitDone && (
        <CenterOverlay>
          <div className="dash-card w-full max-w-sm rounded-[20px] border border-emerald-500/30 p-8 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="dash-text mt-4 text-lg font-semibold">{t('dsaRoom.overlay.practiceSuccessTitle')}</h2>
            <p className="dash-subtle mt-1 text-sm">{t('dsaRoom.overlay.practiceSuccessBody')}</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => navigate(ROUTES.PRACTICE_PROBLEMS)}
                className="dash-control flex flex-1 items-center justify-center gap-2 rounded-[14px] border px-3 py-2.5 text-sm font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('dsaRoom.actions.tryAnother')}
              </button>
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="dash-primary-button flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-sm font-bold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('dsaRoom.actions.dashboard')}
              </button>
            </div>
          </div>
        </CenterOverlay>
      )}

      {showExitModal && (
        <ExitConfirmModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleConfirmExit}
        />
      )}
    </div>
  )
}
