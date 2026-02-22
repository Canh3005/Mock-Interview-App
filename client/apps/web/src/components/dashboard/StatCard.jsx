/**
 * StatCard — Reusable metric card for quick stats
 * Accepts: icon (ReactNode), label, value, change, changeType ('up'|'down'|'neutral'), onClick
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ icon, label, value, change, changeType = 'neutral', onClick, colSpan = '' }) {
  const changeColors = {
    up:      'text-cta',
    down:    'text-rose-400',
    neutral: 'text-slate-400',
  }
  const ChangeIcon = changeType === 'up' ? TrendingUp : changeType === 'down' ? TrendingDown : Minus

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={[
        colSpan,
        'group relative bg-primary border border-slate-700/60 rounded-[12px] p-6',
        'shadow-md transition-all duration-200',
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(34,197,94,0.15)] hover:border-cta/40' : '',
      ].join(' ')}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-700/60 text-cta shrink-0">
          {icon}
        </span>
        <span className="font-body text-sm font-medium text-slate-400 tracking-wide uppercase">
          {label}
        </span>
      </div>

      {/* Value */}
      <p className="font-heading text-3xl font-bold text-white tabular-nums leading-none mb-2">
        {value}
      </p>

      {/* Change indicator */}
      {change && (
        <div className={`flex items-center gap-1. text-xs font-medium ${changeColors[changeType]}`}>
          <ChangeIcon size={12} />
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}
