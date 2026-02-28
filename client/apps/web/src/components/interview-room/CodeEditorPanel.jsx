/**
 * CodeEditorPanel — Right pane
 * Contains a syntax-highlighted textarea editor (no external deps),
 * language selector, output console, and keyboard shortcut hints.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  Terminal,
  Maximize2,
  Settings2,
} from 'lucide-react'

// ── Minimal JS token colouring (pure regex, no deps) ──────────────────────────
const KEYWORDS = /\b(function|const|let|var|return|if|else|for|while|in|of|new|typeof|null|undefined|true|false|class|import|export|default|try|catch|finally|throw|async|await|this|break|continue|switch|case|do)\b/g
const STRINGS  = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g
const NUMBERS  = /\b(\d+\.?\d*)\b/g
const FUNCTIONS = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g
const OPERATORS = /([{}[\]();,.])/g

function syntaxHighlight(code) {
  // Escape HTML first
  let out = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Order matters: strings & comments first to avoid false positives
  out = out.replace(STRINGS, '<span class="sh-string">$&</span>')
  out = out.replace(COMMENTS, '<span class="sh-comment">$&</span>')
  out = out.replace(KEYWORDS, '<span class="sh-keyword">$&</span>')
  out = out.replace(FUNCTIONS, '<span class="sh-function">$&</span>')
  out = out.replace(NUMBERS, '<span class="sh-number">$&</span>')
  out = out.replace(OPERATORS, '<span class="sh-operator">$&</span>')

  return out
}

// ── Starter code ──────────────────────────────────────────────────────────────
const STARTER_CODE = `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}

// Test cases
console.log(twoSum([2, 7, 11, 15], 9));  // [0, 1]
console.log(twoSum([3, 2, 4], 6));        // [1, 2]
console.log(twoSum([3, 3], 6));           // [0, 1]
`

// ── Fake execution output ──────────────────────────────────────────────────────
function simulateRun(code) {
  const lines = []
  const origLog = console.log
  const captured = []
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'console',
      code.replace(/^\/\*\*[\s\S]*?\*\//m, '') // strip JSDoc
    )
    fn({ log: (...args) => captured.push(args.map(a => JSON.stringify(a)).join(' ')) })
  } catch (e) {
    return { ok: false, lines: [e.message] }
  }
  return { ok: true, lines: captured }
}

// ── Language options ───────────────────────────────────────────────────────────
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java']

export default function CodeEditorPanel({ runTrigger, isRunning, setIsRunning }) {
  const { t } = useTranslation()
  const [code, setCode] = useState(STARTER_CODE)
  const [language, setLanguage] = useState('JavaScript')
  const [langOpen, setLangOpen] = useState(false)
  const [output, setOutput] = useState([])
  const [outputStatus, setOutputStatus] = useState(null) // null | 'ok' | 'error'
  const [copied, setCopied] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [lineCount, setLineCount] = useState(STARTER_CODE.split('\n').length)

  const textareaRef = useRef(null)
  const highlightRef = useRef(null)

  // Sync scroll between textarea and highlight layer
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop  = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  const handleCode = (e) => {
    const val = e.target.value
    setCode(val)
    setLineCount(val.split('\n').length)
    syncScroll()
  }

  // Tab key support
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const next = code.substring(0, start) + '  ' + code.substring(end)
      setCode(next)
      setLineCount(next.split('\n').length)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2
          textareaRef.current.selectionEnd = start + 2
        }
      })
    }
  }

  // Run via toolbar external trigger
  useEffect(() => {
    if (runTrigger === 0) return
    runCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrigger])

  const runCode = useCallback(() => {
    setIsRunning(true)
    setOutput([])
    setOutputStatus(null)
    setConsoleOpen(true)
    setTimeout(() => {
      const result = simulateRun(code)
      setOutput(result.lines.length > 0 ? result.lines : [t('interviewRoom.console.noOutput')])
      setOutputStatus(result.ok ? 'ok' : 'error')
      setIsRunning(false)
    }, 750)
  }, [code, setIsRunning])

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const resetCode = () => {
    setCode(STARTER_CODE)
    setLineCount(STARTER_CODE.split('\n').length)
    setOutput([])
    setOutputStatus(null)
  }

  return (
    <div className="h-full flex flex-col bg-[#0D1628] overflow-hidden">
      {/* ── Editor Toolbar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-[#0D1424]">
        {/* Left: language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            aria-label={t('interviewRoom.editor.language', { lang: language })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 text-slate-200 text-xs font-['Fira_Code',monospace] font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
            {language}
            <ChevronDown size={12} className={`text-slate-500 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <ul
              role="listbox"
              aria-label={t('interviewRoom.editor.selectLanguage')}
              className="absolute left-0 top-full mt-1 z-50 bg-[#1A2236] border border-slate-700/60 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
            >
              {LANGUAGES.map(lang => (
                <li
                  key={lang}
                  role="option"
                  aria-selected={language === lang}
                  onClick={() => { setLanguage(lang); setLangOpen(false) }}
                  className={`px-3 py-2 font-['Fira_Code',monospace] text-xs cursor-pointer transition-colors duration-150 ${
                    language === lang
                      ? 'bg-[#22C55E]/15 text-[#22C55E]'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {lang}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyCode}
            aria-label={copied ? t('interviewRoom.editor.copied') : t('interviewRoom.editor.copyCode')}
            title={copied ? t('interviewRoom.editor.copied') : t('interviewRoom.editor.copy')}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            {copied ? <Check size={13} className="text-[#22C55E]" /> : <Copy size={13} />}
          </button>
          <button
            onClick={resetCode}
            aria-label={t('interviewRoom.editor.resetCode')}
            title={t('interviewRoom.editor.reset')}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <RotateCcw size={13} />
          </button>
          <button
            aria-label={t('interviewRoom.editor.settings')}
            title={t('interviewRoom.editor.settingsTitle')}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <Settings2 size={13} />
          </button>

          {/* Run button */}
          <button
            onClick={runCode}
            disabled={isRunning}
            aria-label={isRunning ? t('interviewRoom.editor.running') : t('interviewRoom.editor.runCodeShortcut')}
            title={t('interviewRoom.editor.runShortcut')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-['Fira_Sans',sans-serif] border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] ${
              isRunning
                ? 'bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]/60 cursor-not-allowed'
                : 'bg-[#22C55E] border-[#22C55E] text-white hover:bg-[#16A34A] hover:-translate-y-px shadow-md active:translate-y-0'
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-[#22C55E]/40 border-t-[#22C55E] animate-spin" aria-hidden="true" />
                {t('interviewRoom.editor.running')}
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" />
                {t('interviewRoom.editor.run')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Editor Area ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Line numbers gutter */}
        <div
          aria-hidden="true"
          className="flex-shrink-0 w-10 bg-[#0A0F1E] border-r border-slate-700/30 py-4 text-right pr-2 overflow-hidden pointer-events-none"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i + 1}
              className="font-['Fira_Code',monospace] text-[11px] leading-[1.6] text-slate-600 select-none"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area: layered highlight + textarea */}
        <div className="relative flex-1 min-w-0 overflow-auto" onScroll={syncScroll}>
          {/* Syntax highlight layer (visual only) */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 py-4 px-4 font-['Fira_Code',monospace] text-[13px] leading-[1.6] pointer-events-none overflow-hidden whitespace-pre code-highlight"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(code) }}
          />

          {/* Actual textarea (transparent, on top) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCode}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={t('interviewRoom.editor.ariaLabel')}
            aria-multiline="true"
            className="relative w-full h-full min-h-full py-4 px-4 bg-transparent text-transparent caret-[#22C55E] font-['Fira_Code',monospace] text-[13px] leading-[1.6] resize-none border-0 outline-none focus:outline-none selection:bg-[#22C55E]/25"
            style={{ caretColor: '#22C55E' }}
          />
        </div>
      </div>

      {/* ── Output Console ── */}
      <div
        className="flex-shrink-0 border-t border-slate-700/50 bg-[#070D1A]"
        style={{ height: consoleOpen ? '160px' : '36px' }}
      >
        {/* Console header */}
        <button
          onClick={() => setConsoleOpen(o => !o)}
          aria-expanded={consoleOpen}
          aria-controls="console-output"
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#22C55E]"
        >
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-slate-500" />
            <span className="font-['Fira_Code',monospace] text-[11px] font-semibold text-slate-400">
              {t('interviewRoom.console.title')}
            </span>
            {outputStatus && (
              <span
                className={`text-[10px] font-['Fira_Sans',sans-serif] font-semibold px-1.5 py-0.5 rounded-full ${
                  outputStatus === 'ok'
                    ? 'bg-[#22C55E]/15 text-[#22C55E]'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {outputStatus === 'ok' ? t('interviewRoom.console.passed') : t('interviewRoom.console.error')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Maximize2 size={11} className="text-slate-600" aria-hidden="true" />
            <ChevronDown
              size={12}
              className={`text-slate-500 transition-transform duration-200 ${consoleOpen ? '' : 'rotate-180'}`}
            />
          </div>
        </button>

        {/* Console body */}
        {consoleOpen && (
          <div
            id="console-output"
            role="log"
            aria-live="polite"
            aria-label={t('interviewRoom.console.outputLabel')}
            className="overflow-y-auto px-4 py-2"
            style={{ height: '124px' }}
          >
            {output.length === 0 ? (
              <p className="font-['Fira_Code',monospace] text-[12px] text-slate-600 select-none">
                {t('interviewRoom.console.runToExecute')}
              </p>
            ) : (
              output.map((line, i) => (
                <p
                  key={i}
                  className={`font-['Fira_Code',monospace] text-[12px] leading-[1.7] ${
                    outputStatus === 'error' ? 'text-rose-400' : 'text-[#22C55E]'
                  }`}
                >
                  <span className="text-slate-600 mr-2 select-none">›</span>
                  {line}
                </p>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
