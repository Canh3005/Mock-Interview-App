/**
 * Atom: một competency row — label trái, score bar + số phải.
 * Props: competencyKey, label, score (0–100)
 */
export default function BehaviorCompetencyBar({ label, score }) {
  const barColor =
    score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  const textColor =
    score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="dash-muted-panel flex items-center gap-3 rounded-[14px] border px-3 py-2.5">
      <span className="dash-text w-40 shrink-0 truncate text-sm font-semibold">{label}</span>
      <div className="dash-progress-track h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${textColor}`}>{score}</span>
    </div>
  )
}
