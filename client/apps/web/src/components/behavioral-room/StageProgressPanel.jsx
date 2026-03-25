import { Check, Lock } from 'lucide-react'
import { STAGE_NAMES } from '../../store/slices/behavioralSlice'

const STAGES = [1, 2, 3, 4, 5, 6]

export default function StageProgressPanel({ currentStage, candidateLevel }) {
  return (
    <div className="flex flex-col gap-1 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3 px-2">
        Tiến độ
      </p>

      {STAGES.map((s) => {
        const isPast = s < currentStage
        const isCurrent = s === currentStage
        const isFuture = s > currentStage

        return (
          <div
            key={s}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors ${
              isCurrent
                ? 'bg-cta/10 border border-cta/30'
                : isPast
                ? 'opacity-70'
                : 'opacity-40'
            }`}
          >
            {/* Step indicator */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border transition-colors ${
                isPast
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : isCurrent
                  ? 'bg-cta/20 border-cta text-cta'
                  : 'bg-slate-800 border-slate-600 text-slate-500'
              }`}
            >
              {isPast ? (
                <Check className="w-3.5 h-3.5" />
              ) : isFuture ? (
                <Lock className="w-3 h-3" />
              ) : (
                s
              )}
            </div>

            {/* Stage name */}
            <span
              className={`text-sm leading-tight ${
                isCurrent
                  ? 'text-white font-semibold'
                  : isPast
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              {STAGE_NAMES[s]}
            </span>
          </div>
        )
      })}

      {/* Candidate level badge */}
      {candidateLevel && (
        <div className="mt-4 px-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
              candidateLevel === 'senior'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                : candidateLevel === 'mid'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
            }`}
          >
            {candidateLevel === 'senior'
              ? 'Senior'
              : candidateLevel === 'mid'
              ? 'Mid-level'
              : 'Junior'}
          </span>
        </div>
      )}
    </div>
  )
}
