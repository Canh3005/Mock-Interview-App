import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, RotateCcw } from 'lucide-react'
import { ROUTES } from '../../router/routes'
import BehaviorCompetencyBar from './BehaviorCompetencyBar'
import BehaviorProbeAccordion from './BehaviorProbeAccordion'

const READINESS_BAND_CONFIG = {
  ready:          { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  almost_ready:   { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/40' },
  needs_practice: { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/40' },
  not_ready:      { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
}

function _ScoreRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? '#34d399' : score >= 65 ? '#22d3ee' : score >= 45 ? '#f59e0b' : '#f87171'
  return (
    <svg width={112} height={112} className="rotate-[-90deg]">
      <circle cx={56} cy={56} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle
        cx={56} cy={56} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function _HeroSection({ scorecard }) {
  const { t } = useTranslation()
  const { readiness } = scorecard
  const bandConf = READINESS_BAND_CONFIG[readiness.band] ?? READINESS_BAND_CONFIG.not_ready
  const bandLabel = t(`behaviorScorecard.readinessBand.${readiness.band}`)

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
      <p className="text-xs text-slate-500 mb-3">{t('behaviorScorecard.scoreLabel')}</p>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <_ScoreRing score={readiness.finalScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{readiness.finalScore}</span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold border ${bandConf.bg} ${bandConf.color}`}>
            {bandLabel}
          </span>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>{scorecard.probeAuditTrail?.length ?? 0} {t('behaviorScorecard.probeCountSuffix')}</span>
            <span>{scorecard.stagesCompleted?.length ?? 0} {t('behaviorScorecard.stagesCompletedSuffix')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function _CompetencySection({ competencyScores }) {
  const { t } = useTranslation()
  if (!competencyScores?.length) return null
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {t('behaviorScorecard.competencies')}
      </p>
      <div className="flex flex-col gap-3">
        {competencyScores.map((c) => (
          <BehaviorCompetencyBar key={c.competencyKey} label={c.label} score={c.score} />
        ))}
      </div>
    </div>
  )
}

function _ProbesByStage({ probeAuditTrail }) {
  const { t } = useTranslation()
  if (!probeAuditTrail?.length) return null

  const byStage = probeAuditTrail.reduce((acc, probe) => {
    const key = probe.stage
    if (!acc[key]) acc[key] = { label: probe.stageLabel, probes: [] }
    acc[key].probes.push(probe)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        {t('behaviorScorecard.probeDetail')}
      </p>
      {Object.entries(byStage).map(([stageKey, { label, probes }]) => (
        <div key={stageKey} className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-medium">── {label} ──</p>
          {probes.map((probe) => (
            <BehaviorProbeAccordion key={probe.questionProbeId} probe={probe} />
          ))}
        </div>
      ))}
    </div>
  )
}

function _Actions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="flex gap-3 mt-2">
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
      >
        <Home className="w-4 h-4" />
        {t('behaviorScorecard.backHome')}
      </button>
      <button
        onClick={() => navigate(ROUTES.INTERVIEW_SETUP)}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold text-sm transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        {t('behaviorScorecard.practiceAgain')}
      </button>
    </div>
  )
}

export default function BehaviorScorecardDisplay({ scorecard }) {
  if (!scorecard) return null
  return (
    <div className="flex flex-col max-w-2xl mx-auto py-6 px-4 gap-4">
      <_HeroSection scorecard={scorecard} />
      <_CompetencySection competencyScores={scorecard.competencyScores} />
      <_ProbesByStage probeAuditTrail={scorecard.probeAuditTrail} />
      <_Actions />
    </div>
  )
}
