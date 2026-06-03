import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, RotateCcw, LayoutGrid, Swords } from 'lucide-react'
import { ROUTES } from '../../router/routes'
import BehaviorCompetencyBar from './BehaviorCompetencyBar'
import BehaviorProbeAccordion from './BehaviorProbeAccordion'
import CombatTab from './CombatTab'

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
    <section className="dash-card rounded-[22px] p-5 sm:p-6">
      <p className="dash-subtle mb-3 text-xs font-semibold uppercase tracking-[0.08em]">{t('behaviorScorecard.scoreLabel')}</p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <_ScoreRing score={readiness.finalScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="dash-text text-2xl font-bold">{readiness.finalScore}</span>
            <span className="dash-subtle text-[10px]">/100</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold border ${bandConf.bg} ${bandConf.color}`}>
            {bandLabel}
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="dash-badge rounded-full border px-2.5 py-1 font-semibold">{scorecard.probeAuditTrail?.length ?? 0} {t('behaviorScorecard.probeCountSuffix')}</span>
            <span className="dash-badge rounded-full border px-2.5 py-1 font-semibold">{scorecard.stagesCompleted?.length ?? 0} {t('behaviorScorecard.stagesCompletedSuffix')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function _CompetencySection({ competencyScores }) {
  const { t } = useTranslation()
  if (!competencyScores?.length) return null
  return (
    <section className="dash-card rounded-[22px] p-5">
      <p className="dash-subtle mb-3 text-[10px] font-semibold uppercase tracking-[0.08em]">
        {t('behaviorScorecard.competencies')}
      </p>
      <div className="flex flex-col gap-3">
        {competencyScores.map((c) => (
          <BehaviorCompetencyBar key={c.competencyKey} label={c.label} score={c.score} />
        ))}
      </div>
    </section>
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
      <p className="dash-subtle text-[10px] font-semibold uppercase tracking-[0.08em]">
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
    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className="dash-control flex flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-colors"
      >
        <Home className="w-4 h-4" />
        {t('behaviorScorecard.backHome')}
      </button>
      <button
        onClick={() => navigate(ROUTES.INTERVIEW_SETUP)}
        className="dash-primary-button flex flex-1 items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        {t('behaviorScorecard.practiceAgain')}
      </button>
    </div>
  )
}

function _ViewTabs({ view, setView }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'report', label: t('behaviorScorecard.tabs.report'), Icon: LayoutGrid },
    { id: 'combat', label: t('behaviorScorecard.tabs.combat'), Icon: Swords },
  ]
  return (
    <div className="dash-card flex gap-1 rounded-[18px] p-1">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2 text-xs font-semibold transition-colors ${
            view === id ? 'dash-nav-active' : 'dash-nav-muted'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

export default function BehaviorScorecardDisplay({ scorecard }) {
  const [view, setView] = useState('report')
  if (!scorecard) return null

  // Combat mode: scorecard mang theo multimodal/integrity → hiện tab Thực chiến.
  const isCombat = !!(scorecard.multimodal || scorecard.integrity)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <_HeroSection scorecard={scorecard} />
      {isCombat && <_ViewTabs view={view} setView={setView} />}
      {isCombat && view === 'combat' ? (
        <section className="dash-card rounded-[22px] p-5">
          <CombatTab scoreData={scorecard} behavioralScore={scorecard.readiness?.finalScore} />
        </section>
      ) : (
        <>
          <_CompetencySection competencyScores={scorecard.competencyScores} />
          <_ProbesByStage probeAuditTrail={scorecard.probeAuditTrail} />
        </>
      )}
      <_Actions />
    </div>
  )
}
