export default function RadarChartPlaceholder({ colSpan = '' }) {
  const axes = [
    { label: 'Thuật toán', angle: 0, score: 85 },
    { label: 'System Design', angle: 72, score: 62 },
    { label: 'Giao tiếp', angle: 144, score: 78 },
    { label: 'Problem Solving', angle: 216, score: 90 },
    { label: 'Behavioral', angle: 288, score: 70 },
  ]

  const cx = 50
  const cy = 50
  const r = 36

  const polar = (angleDeg, frac) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: cx + frac * r * Math.cos(rad), y: cy + frac * r * Math.sin(rad) }
  }

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
        <h2 className="dash-card-title">Radar Năng lực</h2>
        <p className="dash-subtle mt-1 text-xs font-medium">So sánh các nhóm kỹ năng chính</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center pt-5">
        <div className="relative aspect-square w-full max-w-[315px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-label="Radar chart">
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
            <polygon points={dataPoints} fill="url(#skillRadarFill)" stroke="var(--dash-accent)" strokeWidth="1.7" />
            {axes.map(({ angle, score }) => {
              const point = polar(angle, score / 100)
              return <circle key={angle} cx={point.x} cy={point.y} r="1.5" fill="var(--dash-accent)" />
            })}
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
        </div>
      </div>
    </div>
  )
}
