import HintsPanel from './HintsPanel'

const DIFFICULTY_STYLE = {
  EASY: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  HARD: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function ProblemPanel({ problem, phase, unlockedHintIndices = [], onUnlockHint }) {
  if (!problem) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Đang tải bài...
      </div>
    )
  }

  const showHints = (phase === 'APPROACH' || phase === 'CODE') && problem.hints?.length > 0

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_STYLE[problem.difficulty] ?? DIFFICULTY_STYLE.MEDIUM}`}>
            {problem.difficulty}
          </span>
          {problem.tags?.map((tag) => (
            <span key={tag} className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
        <h2 className="text-white font-bold text-lg leading-snug">{problem.title}</h2>
      </div>

      {/* Description */}
      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
        {problem.description}
      </div>

      {/* Constraints */}
      {problem.constraints?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Constraints</p>
          <ul className="space-y-0.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="text-xs text-slate-400 font-mono">
                • {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hints */}
      {showHints && (
        <div className="border-t border-slate-700/40 pt-4">
          <HintsPanel
            hints={problem.hints}
            unlockedIndices={unlockedHintIndices}
            onUnlock={onUnlockHint}
          />
        </div>
      )}
    </div>
  )
}
