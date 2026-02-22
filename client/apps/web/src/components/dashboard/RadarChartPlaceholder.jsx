/**
 * RadarChartPlaceholder — Styled placeholder for Radar Chart (to be replaced with Recharts/Chart.js)
 * Renders a visual spider/radar grid with CSS, labeled axes for:
 *   Communication, Algorithm, System Design, Problem Solving, Behavioral
 */
export default function RadarChartPlaceholder({ colSpan = '' }) {
  const axes = [
    { label: 'Giao tiếp',    angle: -90,  score: 78 },
    { label: 'Thuật toán',   angle: -18,  score: 85 },
    { label: 'System Design',angle: 54,   score: 62 },
    { label: 'Problem Solving', angle: 126, score: 90 },
    { label: 'Behavioral',   angle: 198,  score: 70 },
  ]

  const cx = 50   // percent
  const cy = 50   // percent
  const r  = 38   // percent radius of outermost ring

  // Convert polar (angle in deg from top, radius 0–1) → SVG %coords
  const polar = (angleDeg, frac) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + frac * r * Math.cos(rad),
      y: cy + frac * r * Math.sin(rad),
    }
  }

  // Build polygon points for score polygon
  const scorePoints = axes
    .map(({ angle, score }) => {
      const pt = polar(angle, score / 100)
      return `${pt.x}% ${pt.y}%`
    })
    .join(', ')

  // Build background ring polygons (4 rings at 25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1].map((frac) =>
    axes.map(({ angle }) => {
      const pt = polar(angle, frac)
      return `${pt.x}% ${pt.y}%`
    }).join(', ')
  )

  return (
    <div
      className={[
        colSpan,
        'bg-primary border border-slate-700/60 rounded-[12px] p-6 shadow-md',
        'flex flex-col',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-base font-semibold text-white tracking-tight">
            Radar Năng lực
          </h2>
          <p className="font-body text-xs text-slate-400 mt-0.5">
            Đánh giá tổng quan 5 nhóm kỹ năng
          </p>
        </div>
        <span className="font-heading text-xs font-medium text-cta bg-cta/10 border border-cta/30 px-2.5 py-1 rounded-full">
          Avg 77%
        </span>
      </div>

      {/* Chart area */}
      <div className="relative flex-1 min-h-[260px] flex items-center justify-center">
        <div className="relative w-full max-w-[300px] aspect-square mx-auto">
          {/* SVG Radar Grid */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full absolute inset-0"
            aria-label="Radar chart placeholder"
          >
            {/* Concentric rings */}
            {rings.map((pts, i) => (
              <polygon
                key={i}
                points={pts.replace(/(\d+\.?\d*)%/g, (_, n) => (parseFloat(n) * 1))}
                // We use CSS polygon via clipPath trick — actually easier with real % coords in a foreignObject.
                // For pure SVG, we convert % to 0–100 units directly.
                className="fill-none stroke-slate-700/60"
                strokeWidth="0.5"
              />
            ))}

            {/* Axis lines */}
            {axes.map(({ angle }, i) => {
              const outer = polar(angle, 1)
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={parseFloat(outer.x)}
                  y2={parseFloat(outer.y)}
                  className="stroke-slate-700/50"
                  strokeWidth="0.5"
                />
              )
            })}

            {/* Score polygon fill */}
            <polygon
              points={axes
                .map(({ angle, score }) => {
                  const pt = polar(angle, score / 100)
                  return `${parseFloat(pt.x)},${parseFloat(pt.y)}`
                })
                .join(' ')}
              className="fill-cta/20 stroke-cta"
              strokeWidth="1"
            />

            {/* Score dots */}
            {axes.map(({ angle, score }, i) => {
              const pt = polar(angle, score / 100)
              return (
                <circle
                  key={i}
                  cx={parseFloat(pt.x)}
                  cy={parseFloat(pt.y)}
                  r="1.5"
                  className="fill-cta stroke-background"
                  strokeWidth="0.5"
                />
              )
            })}

            {/* Ring percentage labels */}
            {[25, 50, 75, 100].map((pct) => (
              <text
                key={pct}
                x={cx + 1}
                y={cy - (pct / 100) * r}
                fontSize="2.2"
                className="fill-slate-500"
                textAnchor="start"
              >
                {pct}%
              </text>
            ))}
          </svg>

          {/* Axis labels — positioned via absolute with rotation trick */}
          {axes.map(({ label, angle, score }, i) => {
            const labelPt = polar(angle, 1.22)
            return (
              <div
                key={i}
                className="absolute pointer-events-none text-center"
                style={{
                  left: `${parseFloat(labelPt.x)}%`,
                  top:  `${parseFloat(labelPt.y)}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '72px',
                }}
              >
                <span className="font-body text-[10px] font-medium text-slate-300 leading-tight block">
                  {label}
                </span>
                <span className="font-heading text-[10px] font-bold text-cta">{score}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-cta/20 border border-cta inline-block" />
          <span className="font-body text-xs text-slate-400">Điểm của bạn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-700/60 border border-slate-600 inline-block" />
          <span className="font-body text-xs text-slate-400">Mức chuẩn</span>
        </div>
        <span className="ml-auto font-body text-xs text-slate-500 italic">
          Chart.js / Recharts sẽ được tích hợp tại đây
        </span>
      </div>
    </div>
  )
}
