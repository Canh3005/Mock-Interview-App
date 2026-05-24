export default function StatCard({ icon, label, value, change, changeType = 'neutral', onClick, isPrimary = false }) {
  const badgeClass = {
    up: isPrimary ? 'border border-white/20 bg-white/15 text-white' : 'dash-chip border',
    down: isPrimary ? 'border border-white/20 bg-white/15 text-white' : 'dash-badge border text-red-600 dark:text-red-300',
    neutral: isPrimary ? 'border border-white/20 bg-white/15 text-white' : 'dash-badge border',
  }[changeType]

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick() : undefined}
      className={[
        'group flex min-h-[164px] flex-col justify-between rounded-[20px] border p-5 transition-all duration-200 sm:p-6',
        isPrimary
          ? 'dash-feature-card'
          : 'dash-card hover:-translate-y-0.5 hover:border-[var(--dash-border-strong)]',
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={[
            'flex h-10 w-10 items-center justify-center rounded-[13px]',
            isPrimary ? 'border border-white/15 bg-white/15 text-white' : 'dash-icon-tile',
          ].join(' ')}
        >
          {icon}
        </span>
        {change && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
            {change}
          </span>
        )}
      </div>

      <div>
        <p className={['text-sm font-medium', isPrimary ? 'text-white/75' : 'dash-muted'].join(' ')}>
          {label}
        </p>
        <p className={['mt-3 text-[2.4rem] font-extrabold leading-none tracking-normal', isPrimary ? 'text-white' : 'dash-text'].join(' ')}>
          {value}
        </p>
      </div>
    </div>
  )
}
