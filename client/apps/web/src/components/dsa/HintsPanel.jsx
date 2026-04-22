import { useState } from 'react'
import { Lightbulb, Lock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

export default function HintsPanel({ hints = [], unlockedIndices = [], onUnlock }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (!hints.length) return null

  const nextToUnlock = unlockedIndices.length < hints.length ? unlockedIndices.length : null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5" />
        Hints
      </p>

      <div className="space-y-1.5">
        {hints.map((hint, i) => {
          const isUnlocked = unlockedIndices.includes(i)
          const isExpanded = expandedIndex === i

          if (isUnlocked) {
            return (
              <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Hint {i + 1}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 text-sm text-slate-300 leading-relaxed border-t border-amber-500/10 pt-2">
                    {hint}
                  </div>
                )}
              </div>
            )
          }

          if (i === nextToUnlock) {
            return (
              <UnlockPrompt
                key={i}
                index={i}
                onUnlock={() => {
                  onUnlock(i)
                  setExpandedIndex(i)
                }}
              />
            )
          }

          return (
            <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-3 py-2 flex items-center gap-2 opacity-40">
              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500">Hint {i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UnlockPrompt({ index, onUnlock }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-2">
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Xem hint có thể ảnh hưởng đến điểm số của bạn.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onUnlock}
            className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
          >
            Xem Hint {index + 1}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
          >
            Huỷ
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full rounded-lg border border-slate-700/60 bg-slate-800/40 hover:border-amber-500/30 hover:bg-amber-500/5 px-3 py-2 flex items-center gap-2 transition-colors group"
    >
      <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-500 transition-colors shrink-0" />
      <span className="text-xs text-slate-400 group-hover:text-amber-400 transition-colors">
        Unlock Hint {index + 1}
      </span>
    </button>
  )
}
