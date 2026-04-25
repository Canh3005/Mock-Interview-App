import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Play, Send, ChevronUp, ChevronDown, CheckCircle2, Code2, MessageSquare, ArrowLeft, RotateCcw } from 'lucide-react'
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
} from '../../store/slices/dsaSessionSlice'
import { setScoringInitialTab } from '../../store/slices/interviewSetupSlice'
import { markSolved } from '../../store/slices/practiceDSASlice'
import { dsaApi } from '../../api/dsa.api'
import { practiceApi } from '../../api/practice.api'
import HintsPanel from './HintsPanel'
import ApproachBox from './ApproachBox'
import CodeEditor from './CodeEditor'
import RunResultPanel from './RunResultPanel'
import AIChat from './AIChat'
import SessionTimer from './SessionTimer'

const fmtMs = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const DIFF_COLOR  = { EASY: 'text-emerald-400', MEDIUM: 'text-yellow-400', HARD: 'text-red-400' }
const DIFF_BG     = { EASY: 'bg-emerald-500/10 border-emerald-500/20', MEDIUM: 'bg-yellow-500/10 border-yellow-500/20', HARD: 'bg-red-500/10 border-red-500/20' }
const DIFF_LABEL  = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

const MIN_LEFT    = 240
const MIN_RIGHT   = 320
const MIN_CONSOLE = 36
const MAX_CONSOLE = 480

function TestcasePanel({ testCases }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const safeIdx = Math.min(selectedIdx, Math.max(0, testCases.length - 1))
  const selected = testCases[safeIdx] ?? null

  if (!testCases.length) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-500 text-xs">
        Không có test case công khai
      </div>
    )
  }

  return (
    <div className="space-y-3 py-1">
      {/* Case tabs */}
      <div className="flex flex-wrap gap-1.5">
        {testCases.map((tc, i) => (
          <button
            key={tc.id}
            onClick={() => setSelectedIdx(i)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border',
              safeIdx === i
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-transparent',
            ].join(' ')}
          >
            Case {i + 1}
          </button>
        ))}
      </div>

      {/* Selected case input */}
      {selected && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Input</p>
          <pre className="px-3 py-2 rounded-lg bg-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all">
            {selected.inputData}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function DSASessionPage({ navigate }) {
  const dispatch = useDispatch()
  const {
    sessionId, problems, sessionProblems, activeProblemId, problemProgress,
    aiConversation, lastRunResults, scoringStatus, mode, templates, editorCode, testCases: allTestCases,
    unlockedHints, codePhaseStartedAt, pendingNextProblemId,
  } = useSelector((s) => s.dsaSession)

  const activeSessionProblem = sessionProblems.find((sp) => sp.problemId === activeProblemId)
  const currentLanguage = activeSessionProblem?.language ?? 'python'
  const availableLanguages = [...new Set(
    Object.values(templates ?? {}).flat().map((t) => t.languageId)
  )]
  const currentStarterCode =
    (templates?.[activeProblemId] ?? []).find((t) => t.languageId === currentLanguage)?.starterCode ?? ''

  const [leftTab, setLeftTab]               = useState('problem')
  const [consoleOpen, setConsoleOpen]       = useState(false)
  const [consoleTab, setConsoleTab]         = useState('testcase')
  const [runLoading, setRunLoading]         = useState(false)
  const [practiceSubmitDone, setPracticeSubmitDone] = useState(false)
  const [showHiddenResults, setShowHiddenResults] = useState({})
  const [problemElapsedMs, setProblemElapsedMs] = useState(0)
  const [transitionCountdown, setTransitionCountdown] = useState(null)

  // Resizable state
  const containerRef   = useRef(null)
  const [leftWidth, setLeftWidth]         = useState(null)   // null = use % fallback until measured
  const [consoleHeight, setConsoleHeight] = useState(180)

  const draggingH = useRef(false)   // horizontal divider
  const draggingV = useRef(false)   // vertical (console) divider
  const dragStartX = useRef(0)
  const dragStartLeft = useRef(0)
  const dragStartY = useRef(0)
  const dragStartConsole = useRef(0)

  // Init leftWidth from container after mount
  useEffect(() => {
    if (containerRef.current && leftWidth === null) {
      setLeftWidth(Math.round(containerRef.current.offsetWidth * 0.42))
    }
  }, [leftWidth])

  const onMouseMoveGlobal = useCallback((e) => {
    if (draggingH.current && containerRef.current) {
      const containerW = containerRef.current.offsetWidth
      const delta = e.clientX - dragStartX.current
      const next  = dragStartLeft.current + delta
      const clamped = Math.min(Math.max(next, MIN_LEFT), containerW - MIN_RIGHT - 6)
      setLeftWidth(clamped)
    }
    if (draggingV.current) {
      const delta = dragStartY.current - e.clientY   // drag up = bigger console
      const next  = dragStartConsole.current + delta
      const clamped = Math.min(Math.max(next, MIN_CONSOLE + 1), MAX_CONSOLE)
      setConsoleHeight(clamped)
      if (clamped > MIN_CONSOLE) setConsoleOpen(true)
    }
  }, [])

  const onMouseUpGlobal = useCallback(() => {
    if (draggingH.current || draggingV.current) {
      draggingH.current = false
      draggingV.current = false
      document.body.style.cursor   = ''
      document.body.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMoveGlobal)
    window.addEventListener('mouseup',   onMouseUpGlobal)
    return () => {
      window.removeEventListener('mousemove', onMouseMoveGlobal)
      window.removeEventListener('mouseup',   onMouseUpGlobal)
    }
  }, [onMouseMoveGlobal, onMouseUpGlobal])

  const startDragH = (e) => {
    e.preventDefault()
    draggingH.current = true
    dragStartX.current    = e.clientX
    dragStartLeft.current = leftWidth ?? MIN_LEFT
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const startDragV = (e) => {
    e.preventDefault()
    draggingV.current = true
    dragStartY.current      = e.clientY
    dragStartConsole.current = consoleOpen ? consoleHeight : MIN_CONSOLE
    document.body.style.cursor    = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  const activeProblem    = problems.find((p) => p.id === activeProblemId) ?? null
  const activePhase      = problemProgress[activeProblemId]?.phase ?? 'READ'
  const runResults       = lastRunResults[activeProblemId] ?? null
  const publicTestCases  = allTestCases[activeProblemId] ?? []
  const showHidden       = showHiddenResults[activeProblemId] ?? false
  const visibleResults   = showHidden
    ? (runResults?.results ?? [])
    : (runResults?.results?.filter((r) => !r.isHidden) ?? [])
  const passed           = visibleResults.filter((r) => r.status === 'AC').length
  const total            = visibleResults.length
  const aiCount          = aiConversation.filter((m) => m.problemId === activeProblemId).length

  useEffect(() => {
    if (runResults) {
      setConsoleOpen(true)
      setConsoleTab('result')
    }
  }, [runResults])
  useEffect(() => { if (scoringStatus === 'completed') navigate('scoring') }, [scoringStatus, navigate])

  // Per-problem elapsed timer (interview mode only, ticks every second during CODE phase)
  useEffect(() => {
    if (mode === 'solo') return
    const startedAt = codePhaseStartedAt[activeProblemId]
    if (!startedAt || activePhase === 'DONE') return
    const id = setInterval(() => setProblemElapsedMs(Date.now() - startedAt), 1000)
    return () => clearInterval(id)
  }, [mode, activeProblemId, codePhaseStartedAt, activePhase])

  // Transition countdown (interview mode: 3s overlay before switching to next problem)
  useEffect(() => {
    if (!pendingNextProblemId) { setTransitionCountdown(null); return }
    setTransitionCountdown(3)
    const id = setInterval(() =>
      setTransitionCountdown((c) => (c !== null && c > 1 ? c - 1 : null)),
    1000)
    return () => clearInterval(id)
  }, [pendingNextProblemId])

  const handleApproachSubmit = async (problemId, approachText) => {
    try {
      const updated = await dsaApi.submitApproach(sessionId, problemId, approachText)
      dispatch(approachSubmitted({
        problemId, approachText,
        updatedProgress: updated.problemProgress?.[problemId] ?? { phase: 'CODE' },
      }))
    } catch {
      toast.error('Không thể lưu approach.')
    }
  }

  const handleRun = async () => {
    if (!activeProblemId || runLoading) return
    setRunLoading(true)
    try {
      const language = 'cpp' //todo: allow choosing language in practice mode
      const code = editorCode[activeProblemId]?.[language] ?? ''
      const result = mode === 'solo'
        ? await practiceApi.runCode(activeProblemId, code, language)
        : await dsaApi.runCode(sessionId, activeProblemId, code, language)
      dispatch({ type: 'dsaSession/runCompleted', payload: { problemId: activeProblemId, ...result } })
      setShowHiddenResults((prev) => ({ ...prev, [activeProblemId]: false }))
    } catch {
      toast.error('Lỗi khi chạy code.')
    } finally {
      setRunLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!activeProblemId) return
    if (mode === 'solo') {
      try {
        const language = 'cpp' //todo: allow choosing language in practice mode
        const code = editorCode[activeProblemId]?.[language] ?? ''
        // Run first so results (including hidden) are visible after submit
        const runResult = await practiceApi.runCode(activeProblemId, code, language)
        dispatch({ type: 'dsaSession/runCompleted', payload: { problemId: activeProblemId, ...runResult } })
        setShowHiddenResults((prev) => ({ ...prev, [activeProblemId]: true }))
        await practiceApi.submitProblem(activeProblemId, code, language, unlockedHints[activeProblemId] ?? [])
        dispatch(submitProblem({ problemId: activeProblemId }))
        dispatch(markSolved(activeProblemId))
        setPracticeSubmitDone(true)
      } catch {
        toast.error('Không thể nộp bài.')
      }
    } else {
      dispatch(submitProblem({ problemId: activeProblemId }))
    }
  }

  const handleTimerExpire = () => {
    problems.forEach((p) => {
      if (!problemProgress[p.id]?.submittedAt) dispatch(submitProblem({ problemId: p.id }))
    })
  }

  if ((mode !== 'solo' && !sessionId) || !activeProblemId || !problems.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-cta rounded-full animate-spin" />
          <span className="text-sm">Đang khởi tạo vòng DSA...</span>
        </div>
      </div>
    )
  }

  const resolvedLeft = leftWidth ?? 420

  return (
    <div className="flex flex-col h-screen bg-[#0d0f14] text-white overflow-hidden">

      {/* ── Navbar ── */}
      <nav className="flex items-center h-11 px-3 border-b border-slate-800/60 bg-[#0d0f14] flex-shrink-0 gap-3">

        {/* Back button (practice mode only) */}
        {mode === 'solo' && (
          <button
            onClick={() => navigate('practice-problems')}
            className="flex items-center gap-1.5 px-2 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex-shrink-0 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Danh sách
          </button>
        )}

        {/* Problem tabs */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {problems.map((p, i) => {
            const isDone   = !!problemProgress[p.id]?.submittedAt
            const isActive = p.id === activeProblemId
            return (
              <button
                key={p.id}
                onClick={() => dispatch(switchProblem(p.id))}
                className={[
                  'flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
                ].join(' ')}
              >
                {isDone
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  : <span className={`text-[10px] font-bold flex-shrink-0 ${DIFF_COLOR[p.difficulty] ?? 'text-slate-500'}`}>{i + 1}</span>
                }
                <span className="max-w-[140px] truncate">{p.title ?? `Bài ${i + 1}`}</span>
                <span className={`text-[10px] flex-shrink-0 ${DIFF_COLOR[p.difficulty] ?? ''}`}>
                  {p.difficulty === 'EASY' ? 'E' : p.difficulty === 'HARD' ? 'H' : 'M'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* {mode !== 'solo' && activePhase === 'CODE' && codePhaseStartedAt[activeProblemId] && (
            <span className="text-xs text-slate-500 tabular-nums">
              Bài: {fmtMs(problemElapsedMs)}
            </span>
          )} */}
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
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 transition-colors"
              >
                <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                {runLoading ? 'Running...' : 'Run'}
              </button>
              <button
                disabled={!!problemProgress[activeProblemId]?.submittedAt}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-cta hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold transition-colors"
              >
                <Send className="w-3 h-3" />
                Submit
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Main area with gap padding ── */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden gap-1.5 p-1.5 pt-1"
      >

        {/* ── Left panel ── */}
        <div
          className="flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60 flex-shrink-0"
          style={{ width: resolvedLeft }}
        >
          {/* Left tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900 flex-shrink-0 rounded-t-xl overflow-hidden">
            {[
              { key: 'problem', label: 'Đề bài',  Icon: Code2 },
              ...(mode !== 'solo' ? [{ key: 'ai', label: 'AI Chat', Icon: MessageSquare }] : []),
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setLeftTab(key)}
                className={[
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                  leftTab === key
                    ? 'border-cta text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {key === 'ai' && aiCount > 0 && (
                  <span className="ml-0.5 w-4 h-4 bg-cta text-black text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {aiCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Left content */}
          <div className="flex-1 overflow-y-auto">

            {leftTab === 'problem' && (
              <>
                {activePhase === 'READ' && activeProblem && (
                  <div className="p-5 space-y-5">
                    <div className="space-y-2">
                      <h1 className="text-white font-heading font-bold text-base leading-snug">
                        {activeProblem.title}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFF_BG[activeProblem.difficulty] ?? ''} ${DIFF_COLOR[activeProblem.difficulty] ?? ''}`}>
                          {DIFF_LABEL[activeProblem.difficulty] ?? activeProblem.difficulty}
                        </span>
                        {activeProblem.tags?.map((tag) => (
                          <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed
                      [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                      [&_li]:mb-1 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                      [&_code]:text-emerald-300 [&_code]:text-xs [&_pre]:bg-slate-800 [&_pre]:rounded-lg
                      [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0
                      [&_strong]:text-white [&_blockquote]:border-l-2 [&_blockquote]:border-slate-600
                      [&_blockquote]:pl-3 [&_blockquote]:text-slate-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeProblem.description}
                      </ReactMarkdown>
                    </div>

                    {activeProblem.constraints?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Constraints</p>
                        <ul className="space-y-1">
                          {activeProblem.constraints.map((c, i) => (
                            <li key={i} className="text-xs text-slate-400 font-mono flex gap-2">
                              <span className="text-slate-600 flex-shrink-0">•</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-500 mb-3">
                        Đọc kỹ đề. Khi sẵn sàng, ghi approach trước khi code.
                      </p>
                      <button
                        onClick={() => dispatch(approachSubmitted({
                          problemId: activeProblemId,
                          approachText: '',
                          updatedProgress: { phase: mode === 'solo' ? 'CODE' : 'APPROACH' },
                        }))}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition-colors"
                      >
                        {mode === 'solo' ? 'Bắt đầu code →' : 'Sẵn sàng → Ghi approach'}
                      </button>
                    </div>
                  </div>
                )}

                {activePhase === 'APPROACH' && (
                  <div className="p-4 space-y-4">
                    {activeProblem && (
                      <div className="pb-4 border-b border-slate-800">
                        <h1 className="text-white font-heading font-semibold text-sm mb-1">{activeProblem.title}</h1>
                        <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">{activeProblem.description}</p>
                      </div>
                    )}
                    <ApproachBox problemId={activeProblemId} onSubmit={handleApproachSubmit} />
                  </div>
                )}

                {(activePhase === 'CODE' || activePhase === 'DONE') && activeProblem && (
                  <div className="p-5 space-y-5">
                    <div className="space-y-2">
                      <h1 className="text-white font-heading font-bold text-base leading-snug">
                        {activeProblem.title}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFF_BG[activeProblem.difficulty] ?? ''} ${DIFF_COLOR[activeProblem.difficulty] ?? ''}`}>
                          {DIFF_LABEL[activeProblem.difficulty] ?? activeProblem.difficulty}
                        </span>
                        {activeProblem.tags?.map((tag) => (
                          <span key={tag} className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed
                      [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                      [&_li]:mb-1 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                      [&_code]:text-emerald-300 [&_code]:text-xs [&_pre]:bg-slate-800 [&_pre]:rounded-lg
                      [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0
                      [&_strong]:text-white [&_blockquote]:border-l-2 [&_blockquote]:border-slate-600
                      [&_blockquote]:pl-3 [&_blockquote]:text-slate-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeProblem.description}
                      </ReactMarkdown>
                    </div>

                    {activeProblem.constraints?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Constraints</p>
                        <ul className="space-y-1">
                          {activeProblem.constraints.map((c, i) => (
                            <li key={i} className="text-xs text-slate-400 font-mono flex gap-2">
                              <span className="text-slate-600 flex-shrink-0">•</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeProblem.hints?.length > 0 && activePhase !== 'READ' && activePhase !== 'DONE' && (
                      <div className="border-t border-slate-800 pt-4">
                        <HintsPanel
                          hints={activeProblem.hints}
                          unlockedIndices={unlockedHints[activeProblemId] ?? []}
                          onUnlock={(hintIndex) => dispatch(unlockHint({ problemId: activeProblemId, hintIndex }))}
                        />
                      </div>
                    )}

                    {activePhase === 'DONE' && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-emerald-400 font-medium">Đã nộp bài</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {leftTab === 'ai' && (
              <div className="p-3">
                <AIChat messages={aiConversation} problemId={activeProblemId} />
              </div>
            )}
          </div>
        </div>

        {/* ── Horizontal drag divider ── */}
        <div
          className="w-1.5 flex-shrink-0 flex items-center justify-center group cursor-col-resize rounded-full select-none"
          onMouseDown={startDragH}
        >
          <div className="w-1 h-12 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors" />
        </div>

        {/* ── Right panel: Editor + Console ── */}
        <div className="flex-1 flex flex-col min-w-0 gap-1.5">

          {/* Editor panel */}
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60 min-h-0">

            {/* Editor toolbar */}
            <div className="flex items-center px-3 h-9 border-b border-slate-800 flex-shrink-0 bg-slate-900 gap-2 rounded-t-xl">
              {availableLanguages.length <= 1 ? (
                <span className="text-xs font-mono text-slate-500 capitalize">{currentLanguage}</span>
              ) : (
                <select
                  value={currentLanguage}
                  onChange={(e) => dispatch(changeLanguage({ problemId: activeProblemId, language: e.target.value }))}
                  className="text-xs font-mono text-slate-300 bg-slate-800 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-cta cursor-pointer"
                >
                  {availableLanguages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-hidden">
              {(activePhase === 'CODE' || activePhase === 'DONE') ? (
                <CodeEditor
                  problemId={activeProblemId}
                  starterCode={currentStarterCode}
                  disabled={activePhase === 'DONE' || scoringStatus === 'scoring'}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
                  <Code2 className="w-10 h-10 text-slate-700" />
                  <p className="text-sm text-slate-600">
                    {activePhase === 'READ' ? 'Đọc đề bài rồi bấm "Sẵn sàng"' : 'Ghi approach để mở editor'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Vertical drag divider (console) ── */}
          <div
            className="h-1.5 flex-shrink-0 flex justify-center items-center group cursor-row-resize rounded-full select-none"
            onMouseDown={startDragV}
          >
            <div className="h-1 w-12 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors" />
          </div>

          {/* Console panel */}
          <div
            className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60"
            style={{ height: consoleOpen ? consoleHeight : 36 }}
          >
            {/* Tab bar */}
            <div className="flex items-center h-9 flex-shrink-0 border-b border-slate-800 rounded-t-xl px-1 gap-0.5">
              <button
                onClick={() => setConsoleOpen((v) => !v)}
                className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
              >
                {consoleOpen
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronUp   className="w-3.5 h-3.5" />}
              </button>

              {['testcase', 'result'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setConsoleTab(tab); if (!consoleOpen) setConsoleOpen(true) }}
                  className={[
                    'px-3 h-full text-xs font-medium border-b-2 transition-colors',
                    consoleTab === tab
                      ? 'border-cta text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {tab === 'testcase' ? 'Testcase' : 'Test Result'}
                </button>
              ))}

              {runResults && consoleTab === 'result' && (
                <span className={`ml-auto mr-2 text-xs font-semibold tabular-nums ${passed === total && total > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {passed}/{total} passed
                </span>
              )}
            </div>

            {consoleOpen && (
              <div className="flex-1 px-3 pb-3 overflow-y-auto">
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

      {/* Scoring overlay (interview mode only) */}
      {mode !== 'solo' && scoringStatus === 'scoring' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white font-semibold">Đang chấm điểm...</p>
            <p className="text-slate-400 text-sm">AI đang phân tích bài làm của bạn</p>
          </div>
        </div>
      )}

      {/* Next-problem transition overlay (interview mode only) */}
      {mode !== 'solo' && pendingNextProblemId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="text-center space-y-3 p-8 bg-slate-900 border border-slate-700 rounded-2xl max-w-xs w-full mx-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-white font-semibold">Đã nộp bài!</p>
            <p className="text-slate-400 text-sm">
              Chuyển sang bài tiếp theo trong{' '}
              <span className="text-cta font-bold">{transitionCountdown ?? 0}s</span>...
            </p>
            <button
              onClick={() => {
                dispatch(nextProblemPending(null))
                dispatch(switchProblem(pendingNextProblemId))
              }}
              className="w-full py-2 rounded-xl bg-cta hover:bg-cta/90 text-black text-sm font-semibold transition-colors"
            >
              Vào ngay
            </button>
          </div>
        </div>
      )}

      {/* Practice success overlay */}
      {mode === 'solo' && practiceSubmitDone && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center space-y-4 p-8 bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-sm w-full mx-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-white font-semibold text-lg">Nộp bài thành công!</h2>
            <p className="text-slate-400 text-sm">Bạn đã hoàn thành bài tập này.</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => navigate('practice-problems')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Thử bài khác
              </button>
              <button
                onClick={() => navigate('dashboard')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cta hover:bg-cta/90 text-black text-sm font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
