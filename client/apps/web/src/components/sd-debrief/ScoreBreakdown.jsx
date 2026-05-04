import { useTranslation } from 'react-i18next'

const BAND_CONFIG = {
  Exceptional: { ring: '#10b981', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Strong:      { ring: '#3b82f6', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Good:        { ring: '#06b6d4', badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  Developing:  { ring: '#f59e0b', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  'Needs Work':{ ring: '#ef4444', badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const DIM_LABEL_KEY = {
  componentCoverage:    'sdRoom.evaluation.dimensions.componentCoverage',
  scalabilityFit:       'sdRoom.evaluation.dimensions.scalabilityFit',
  tradeoffArticulation: 'sdRoom.evaluation.dimensions.tradeoffArticulation',
  communicationClarity: 'sdRoom.evaluation.dimensions.communicationClarity',
  curveballAdaptation:  'sdRoom.evaluation.dimensions.curveballAdaptation',
}

const R = 52
const CIRC = 2 * Math.PI * R

function ScoreRing({ score, color }) {
  const filled = (Math.max(0, Math.min(100, score)) / 100) * CIRC
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg width="128" height="128" viewBox="0 0 128 128" className="absolute inset-0">
        <circle cx="64" cy="64" r={R} fill="none" stroke="#1e293b" strokeWidth="9" />
        <circle
          cx="64" cy="64" r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRC - filled}`}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-bold text-white tabular-nums leading-none">{score}</span>
        <span className="text-[11px] text-slate-500 leading-none">/ 100</span>
      </div>
    </div>
  )
}

function dimBarColor(pct) {
  if (pct >= 75) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-red-500'
}

function DimensionCard({ dim }) {
  const { t } = useTranslation()
  const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0
  const barColor = dimBarColor(pct)
  const reasoning = dim.data?.reasoning
  const missing = dim.data?.missingComponents

  return (
    <div className="flex flex-col gap-2 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">
          {t(DIM_LABEL_KEY[dim.dimension] ?? dim.dimension)}
        </span>
        <span className="text-xs tabular-nums font-mono text-slate-400 shrink-0">
          {dim.score}<span className="text-slate-600">/{dim.maxScore}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      {reasoning && (
        <p className="text-xs text-slate-500 leading-relaxed">{reasoning}</p>
      )}
      {Array.isArray(missing) && missing.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {missing.map((m) => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ScoreBreakdown({ evaluationResult }) {
  const { t } = useTranslation()
  const { finalScore, hintPenalty, gradeBand, dimensions } = evaluationResult
  const scoringDims = (dimensions ?? []).filter((d) => d.maxScore > 0)
  const band = BAND_CONFIG[gradeBand] ?? BAND_CONFIG['Needs Work']

  return (
    <section id="score" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <ScoreRing score={finalScore} color={band.ring} />
        <div className="flex flex-col gap-2">
          <span className={`self-start px-3 py-1 rounded-full text-sm font-semibold border ${band.badge}`}>
            {t(`sdDebrief.gradeBand.${gradeBand}`, { defaultValue: gradeBand })}
          </span>
          {hintPenalty > 0 && (
            <span className="text-xs text-amber-400/80">
              {t('sdDebrief.hintPenalty', { pts: hintPenalty })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {scoringDims.map((d) => <DimensionCard key={d.dimension} dim={d} />)}
      </div>
    </section>
  )
}
