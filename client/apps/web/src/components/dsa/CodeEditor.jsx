import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Editor from '@monaco-editor/react'
import { setEditorCode, triggerIdleAI } from '../../store/slices/dsaSessionSlice'

const MONACO_OPTIONS = {
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off',
  snippetSuggestions: 'none',
  wordBasedSuggestions: 'off',
  parameterHints: { enabled: false },
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
}

const LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
}

export default function CodeEditor({ problemId, starterCode, disabled }) {
  const dispatch = useDispatch()
  const sessionId = useSelector((s) => s.dsaSession.sessionId)
  const language = useSelector(
    (s) => s.dsaSession.sessionProblems.find((sp) => sp.problemId === problemId)?.language ?? 'python'
  )
  const code = useSelector((s) => s.dsaSession.editorCode[problemId]?.[language] ?? starterCode ?? '')
  const phase = useSelector((s) => s.dsaSession.problemProgress[problemId]?.phase)
  const mode = useSelector((s) => s.dsaSession.mode)

  const lastActivityRef = useRef(Date.now())
  const idleTimerRef = useRef(null)

  // Idle detection — 5 min no keypress → trigger AI (disabled in solo mode)
  useEffect(() => {
    if (disabled || phase !== 'CODE' || mode === 'solo') return

    idleTimerRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
        dispatch(triggerIdleAI())
        lastActivityRef.current = Date.now() // reset to avoid spam
      }
    }, 30_000)

    return () => clearInterval(idleTimerRef.current)
  }, [disabled, phase, dispatch])

  const handleChange = (value) => {
    lastActivityRef.current = Date.now()
    dispatch(setEditorCode({ problemId, language, code: value ?? '' }))
  }

  return (
    <div className={`h-full rounded-lg overflow-hidden border ${disabled ? 'border-slate-700/50 opacity-60' : 'border-slate-700'}`}>
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language] ?? 'python'}
        value={code}
        onChange={handleChange}
        options={{ ...MONACO_OPTIONS, readOnly: disabled }}
        theme="vs-dark"
      />
    </div>
  )
}
