import { useState } from 'react'
import { ChevronDown, ChevronUp, Code } from 'lucide-react'

export default function SolutionWalkthrough({ code, language = 'python' }) {
  const [open, setOpen] = useState(false)

  if (!code) return null

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Code đã nộp</span>
          <span className="text-[10px] text-slate-500 font-mono">{language}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-500" />
          : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <pre className="p-4 text-xs font-mono text-slate-300 leading-relaxed bg-slate-900/60 overflow-x-auto whitespace-pre">
          {code}
        </pre>
      )}
    </div>
  )
}
