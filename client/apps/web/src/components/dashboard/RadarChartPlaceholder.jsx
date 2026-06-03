import { useTranslation } from 'react-i18next'

export default function RadarChartPlaceholder({ colSpan = '', competencies = [], loading = false }) {
  const { t } = useTranslation()
  const fallbackAxes = [
    { label: t('dashboard.radar.axes.algorithms'), angle: 0, score: 0 },
    { label: t('dashboard.radar.axes.systemDesign'), angle: 72, score: 0 },
    { label: t('dashboard.radar.axes.communication'), angle: 144, score: 0 },
    { label: t('dashboard.radar.axes.problemSolving'), angle: 216, score: 0 },
    { label: t('dashboard.radar.axes.behavioral'), angle: 288, score: 0 },
  ]
  const cx = 50
  const cy = 50
  const r = 36

  const polar = (angleDeg, frac) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + frac * r * Math.cos(rad), y: cy + frac * r * Math.sin(rad) }
  }

  const hasData = competencies.length > 0
  const count = hasData ? Math.min(competencies.length, 5) : fallbackAxes.length

  const axes = hasData
    ? competencies.slice(0, 5).map((c, i) => ({
        label: c.label,
        angle: (i * 360) / count,
        score: c.averageScore,
      }))
    : fallbackAxes

  const rings = [0.25, 0.5, 0.75, 1].map((frac) =>
    axes.map(({ angle }) => {
      const point = polar(angle, frac)
      return `${point.x},${point.y}`
    }).join(' ')
  )

  const dataPoints = axes.map(({ angle, score }) => {
    const point = polar(angle, score / 100)
    return `${point.x},${point.y}`
  }).join(' ')

  return (
    <div className={[colSpan, 'dash-card flex min-h-[380px] flex-col rounded-[20px] p-5 transition-colors duration-200 sm:p-6'].join(' ')}>
      <div>
        <h2 className="dash-card-title">{t('dashboard.radar.title')}</h2>
        <p className="dash-subtle mt-1 text-xs font-medium">{t('dashboard.radar.subtitle')}</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center pt-5">
        {loading ? (
          <div className="aspect-square w-full max-w-[315px]">
            <div className="dash-progress-track h-full w-full animate-pulse rounded-full opacity-30" />
          </div>
        ) : (
          <div className="relative aspect-square w-full max-w-[315px]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-label={t('dashboard.radar.ariaLabel')}>
              <defs>
                <linearGradient id="skillRadarFill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--dash-accent)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.26" />
                </linearGradient>
              </defs>
              {rings.map((points) => (
                <polygon key={points} points={points} fill="none" stroke="var(--dash-border-strong)" strokeWidth="1" />
              ))}
              {axes.map(({ angle }) => {
                const outer = polar(angle, 1)
                return (
                  <line
                    key={angle}
                    x1={cx}
                    y1={cy}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="var(--dash-border)"
                    strokeWidth="1"
                  />
                )
              })}
              {hasData && (
                <>
                  <polygon points={dataPoints} fill="url(#skillRadarFill)" stroke="var(--dash-accent)" strokeWidth="1.7" />
                  {axes.map(({ angle, score }) => {
                    const point = polar(angle, score / 100)
                    return <circle key={angle} cx={point.x} cy={point.y} r="1.5" fill="var(--dash-accent)" />
                  })}
                </>
              )}
            </svg>

            {axes.map(({ label, angle }) => {
              const labelPoint = polar(angle, 1.22)
              return (
                <span
                  key={label}
                  className="dash-muted absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center text-xs font-semibold leading-tight"
                  style={{ left: `${labelPoint.x}%`, top: `${labelPoint.y}%` }}
                >
                  {label}
                </span>
              )
            })}

            {!hasData && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="dash-subtle text-center text-xs font-medium leading-snug px-6">
                  {t('dashboard.radar.noData')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
