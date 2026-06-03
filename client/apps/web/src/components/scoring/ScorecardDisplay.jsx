import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../../router/routes'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from 'recharts'
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Star,
  Home,
  RotateCcw,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  MessageSquare,
  Swords,
} from 'lucide-react'
import CombatTab from './CombatTab'

// ── constants ──────────────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  SENIOR_PASS:      { labelKey: 'scoring.legacy.verdict.SENIOR_PASS',      color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/40' },
  MID_PASS:         { labelKey: 'scoring.legacy.verdict.MID_PASS',         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  MID_BORDERLINE:   { labelKey: 'scoring.legacy.verdict.MID_BORDERLINE',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/40' },
  JUNIOR_RECOMMEND: { labelKey: 'scoring.legacy.verdict.JUNIOR_RECOMMEND', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/40' },
  JUNIOR_FAIL:      { labelKey: 'scoring.legacy.verdict.JUNIOR_FAIL',      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
  SENIOR_FAIL:      { labelKey: 'scoring.legacy.verdict.SENIOR_FAIL',      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
  SCORING_ERROR:    { labelKey: 'scoring.legacy.verdict.SCORING_ERROR',    color: 'text-slate-400',   bg: 'bg-slate-800 border-slate-700' },
}

const STAGE_LABELS = {
  stage_1_culture_fit:       'scoring.legacy.stage.cultureFit',
  stage_2_tech_stack:        'scoring.legacy.stage.techStack',
  stage_3_domain:            'scoring.legacy.stage.domain',
  stage_4_cv_deepdive:       'scoring.legacy.stage.cvDeepDive',
  stage_5_soft_skills:       'scoring.legacy.stage.softSkills',
  stage_6_reverse_interview: 'scoring.legacy.stage.reverseInterview',
}

const BAR_COLORS = ['#60a5fa', '#f59e0b', '#22d3ee', '#34d399']

// ── helpers ────────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return 'text-emerald-400'
  if (s >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarColor(s) {
  if (s >= 75) return 'bg-emerald-500'
  if (s >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// ── atoms ──────────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? '#34d399' : score >= 60 ? '#f59e0b' : '#f87171'
  return (
    <svg width={112} height={112} className="rotate-[-90deg]">
      <circle cx={56} cy={56} r={r} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle
        cx={56} cy={56} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function ScoreBar({ score }) {
  return (
    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${scoreBarColor(score)}`}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
      {children}
    </h3>
  )
}

// ── stage accordion ────────────────────────────────────────────────────────────
function AccordionStage({ stageKey, data }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const label = STAGE_LABELS[stageKey] ? t(STAGE_LABELS[stageKey]) : stageKey
  const score = data?.score ?? 0

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/100</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 flex flex-col gap-3 bg-slate-900/40">
          <p className="text-sm text-slate-300 leading-relaxed">{data?.feedback}</p>
          {data?.highlights?.length > 0 && (
            <div>
              <p className="text-xs text-emerald-400 font-semibold mb-1.5">{t('scoring.legacy.strengths')}</p>
              <ul className="flex flex-col gap-1">
                {data.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data?.red_flags?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {t('scoring.legacy.redFlags')}
              </p>
              <ul className="flex flex-col gap-1">
                {data.red_flags.map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── tab panels ─────────────────────────────────────────────────────────────────
function OverviewTab({ scoreData }) {
  const { t } = useTranslation()
  const radarData = Object.entries(scoreData.breakdown ?? {}).map(([key, val]) => ({
    subject: STAGE_LABELS[key] ? t(STAGE_LABELS[key]) : key,
    score: val?.score ?? 0,
    fullMark: 100,
  }))
  const starData = [
    { name: t('scoring.legacy.star.situation'), score: scoreData.star_analysis?.avg_situation_score ?? 0 },
    { name: t('scoring.legacy.star.task'),      score: scoreData.star_analysis?.avg_task_score      ?? 0 },
    { name: t('scoring.legacy.star.action'),    score: scoreData.star_analysis?.avg_action_score    ?? 0 },
    { name: t('scoring.legacy.star.result'),    score: scoreData.star_analysis?.avg_result_score    ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <SectionLabel>{t('scoring.legacy.stageScores')}</SectionLabel>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Radar name="Score" dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <SectionLabel>{t('scoring.legacy.starAnalysis')}</SectionLabel>
        {scoreData.star_analysis?.weakness && (
          <p className="text-xs text-amber-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {scoreData.star_analysis.weakness}
          </p>
        )}
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={starData} layout="vertical" barSize={16}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={65} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {starData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {scoreData.actionable_feedback && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <SectionLabel>{t('scoring.legacy.improvements')}</SectionLabel>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {scoreData.actionable_feedback}
          </p>
        </div>
      )}
    </div>
  )
}

function DetailTab({ scoreData }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t('scoring.legacy.stageDetails')}</SectionLabel>
        {Object.entries(scoreData.breakdown ?? {}).map(([key, data]) => (
          <AccordionStage key={key} stageKey={key} data={data} />
        ))}
      </div>

      {scoreData.consistency_check?.has_contradictions && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1">
              {t('scoring.legacy.contradiction')}
              {scoreData.consistency_check.impact !== 'none' && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20">
                  {scoreData.consistency_check.impact === 'significant'
                    ? t('scoring.legacy.impact.significant')
                    : t('scoring.legacy.impact.minor')}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{scoreData.consistency_check.detail}</p>
          </div>
        </div>
      )}

      {scoreData.cv_claim_verification && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <SectionLabel>{t('scoring.legacy.cvVerification')}</SectionLabel>
          {scoreData.cv_claim_verification.verified?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1.5">{t('scoring.legacy.verified')}</p>
              <ul className="flex flex-col gap-1">
                {scoreData.cv_claim_verification.verified.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {scoreData.cv_claim_verification.unverified_or_inflated?.length > 0 && (
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-1.5">
                {t('scoring.legacy.unverified')}
              </p>
              <ul className="flex flex-col gap-1">
                {scoreData.cv_claim_verification.unverified_or_inflated.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <XCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CommunicationTab({ scoreData }) {
  const { t } = useTranslation()
  const cq = scoreData.communication_quality
  if (!cq) return <p className="text-sm text-slate-500 text-center py-8">{t('scoring.legacy.noCommunicationData')}</p>

  const cqScore = cq.score ?? 0
  const metrics = [
    { label: t('scoring.legacy.communication.clarity'), value: cq.clarity },
    { label: t('scoring.legacy.communication.conciseness'), value: cq.conciseness },
    { label: t('scoring.legacy.communication.structure'), value: cq.structure },
  ]

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>{t('scoring.legacy.communication.title')}</SectionLabel>
        <span className={`text-lg font-bold ${scoreColor(cqScore)}`}>{cqScore}/100</span>
      </div>
      <div className="flex flex-col gap-3">
        {metrics.map(({ label, value }) => value ? (
          <div key={label} className="border-b border-slate-700/50 pb-3 last:border-0 last:pb-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{value}</p>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

// ── main export ────────────────────────────────────────────────────────────────
const BASE_TABS = [
  { id: 'overview',      labelKey: 'scoring.legacy.tabs.overview',      Icon: LayoutGrid },
  { id: 'detail',        labelKey: 'scoring.legacy.tabs.detail',        Icon: List },
  { id: 'communication', labelKey: 'scoring.legacy.tabs.communication', Icon: MessageSquare },
]
const COMBAT_TAB = { id: 'combat', labelKey: 'scoring.legacy.tabs.combat', Icon: Swords }

export default function ScorecardDisplay({ scoreData, isCombat = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const tabs = isCombat ? [...BASE_TABS, COMBAT_TAB] : BASE_TABS
  const [tab, setTab] = useState(isCombat ? 'combat' : 'overview')

  if (!scoreData) return null

  const verdict = VERDICT_CONFIG[scoreData.overall_verdict] ?? VERDICT_CONFIG.SCORING_ERROR

  return (
    <div className="flex flex-col max-w-2xl mx-auto py-6 px-4 gap-4">
      {/* ── Hero header ── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <h1 className="text-base font-bold text-white">{t('scoring.legacy.title')}</h1>
          </div>
          {isCombat && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
              <Swords className="w-3 h-3" />
               {t('scoring.combat.overall')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <ScoreRing score={scoreData.total_score} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor(scoreData.total_score)}`}>
                {scoreData.total_score}
              </span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <span className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold border ${verdict.bg} ${verdict.color}`}>
              {t(verdict.labelKey)}
            </span>
            {scoreData.actionable_feedback && (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {scoreData.actionable_feedback}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
        {tabs.map(({ id, labelKey, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors
              ${tab === id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'overview'      && <OverviewTab      scoreData={scoreData} />}
      {tab === 'detail'        && <DetailTab        scoreData={scoreData} />}
      {tab === 'communication' && <CommunicationTab scoreData={scoreData} />}
      {tab === 'combat'        && <CombatTab        scoreData={scoreData} />}

      {/* ── Actions ── */}
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
    </div>
  )
}
