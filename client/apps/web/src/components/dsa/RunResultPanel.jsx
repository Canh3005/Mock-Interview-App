import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, Lock } from 'lucide-react'

const STATUS_CFG = {
  AC:  { color: 'text-emerald-400', label: 'Accepted' },
  WA:  { color: 'text-red-400',     label: 'Wrong Answer' },
  TLE: { color: 'text-yellow-400',  label: 'Time Limit Exceeded' },
  RE:  { color: 'text-orange-400',  label: 'Runtime Error' },
  CE:  { color: 'text-purple-400',  label: 'Compile Error' },
}

function CodeBox({ value }) {
  return (
    <pre className="mt-1 px-3 py-2 rounded-lg bg-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all">
      {value || '(empty)'}
    </pre>
  )
}

export default function RunResultPanel({ results, showHidden = false }) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  if (!results?.length) {
    return (
      <div className="flex items-center justify-center h-full py-6 text-slate-500 text-xs">
        Bấm Run để xem kết quả
      </div>
    )
  }

  const visible = showHidden ? results : results.filter((r) => !r.isHidden)
  const hiddenCount = results.filter((r) => r.isHidden).length
  const allPassed = visible.length > 0 && visible.every((r) => r.status === 'AC')
  const overallStatus = allPassed ? 'AC' : (visible.find((r) => r.status !== 'AC')?.status ?? 'WA')
  const cfg = STATUS_CFG[overallStatus] ?? STATUS_CFG.WA

  const safeIdx = Math.min(selectedIdx, visible.length - 1)
  const selected = visible[safeIdx]

  const avgTime = (() => {
    const times = visible.map((r) => r.timeMs).filter((t) => t != null)
    if (!times.length) return null
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  })()

  return (
    <div className="space-y-3 py-1">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
        {avgTime != null && (
          <span className="text-xs text-slate-500">Runtime: {avgTime} ms</span>
        )}
      </div>

      {/* Case tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((r, i) => {
          const isPass = r.status === 'AC'
          const isActive = i === safeIdx
          return (
            <button
              key={r.testCaseId}
              onClick={() => setSelectedIdx(i)}
              className={[
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? isPass ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                           : 'bg-red-500/15 text-red-300 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent',
              ].join(' ')}
            >
              {isPass
                ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                : <XCircle className="w-3 h-3 text-red-400" />}
              {r.isHidden ? `Hidden ${i + 1}` : `Case ${i + 1}`}
            </button>
          )
        })}

        {/* Locked hidden row */}
        {!showHidden && hiddenCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-600 border border-slate-700/50 bg-slate-800/40">
            <Lock className="w-3 h-3" />
            {hiddenCount} hidden
          </div>
        )}
      </div>

      {/* Selected case detail */}
      {selected && (
        <div className="space-y-2">
          {selected.compileError ? (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Compile Error</p>
              <CodeBox value={selected.compileError} />
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium text-slate-500">Input</p>
                <CodeBox value={selected.input ?? '—'} />
              </div>
              {selected.stdout ? (
                <div>
                  <p className="text-xs font-medium text-slate-500">Stdout</p>
                  <CodeBox value={selected.stdout} />
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-slate-500">Output</p>
                <CodeBox value={selected.output ?? '—'} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Expected</p>
                <CodeBox value={selected.expectedOutput ?? '—'} />
              </div>
            </>
          )}
          {selected.timeMs != null && (
            <p className="text-[10px] text-slate-600 font-mono">{selected.timeMs} ms</p>
          )}
        </div>
      )}
    </div>
  )
}
