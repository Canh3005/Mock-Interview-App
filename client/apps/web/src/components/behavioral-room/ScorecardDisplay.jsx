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
import { ChevronDown, ChevronUp, AlertTriangle, Star, Home, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'

const VERDICT_CONFIG = {
  SENIOR_PASS: { labelKey: 'scoring.legacy.verdict.SENIOR_PASS', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/40' },
  MID_PASS: { labelKey: 'scoring.legacy.verdict.MID_PASS', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  MID_BORDERLINE: { labelKey: 'scoring.legacy.verdict.MID_BORDERLINE', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40' },
  JUNIOR_RECOMMEND: { labelKey: 'scoring.legacy.verdict.JUNIOR_RECOMMEND', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/40' },
  JUNIOR_FAIL: { labelKey: 'scoring.legacy.verdict.JUNIOR_FAIL', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' },
  SENIOR_FAIL: { labelKey: 'scoring.legacy.verdict.SENIOR_FAIL', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' },
  SCORING_ERROR: { labelKey: 'scoring.legacy.verdict.SCORING_ERROR', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' },
}

const STAGE_LABELS = {
  stage_1_culture_fit: 'scoring.legacy.stage.cultureFit',
  stage_2_tech_stack: 'scoring.legacy.stage.techStack',
  stage_3_domain: 'scoring.legacy.stage.domain',
  stage_4_cv_deepdive: 'scoring.legacy.stage.cvDeepDive',
  stage_5_soft_skills: 'scoring.legacy.stage.softSkills',
  stage_6_reverse_interview: 'scoring.legacy.stage.reverseInterview',
}

function AccordionStage({ stageKey, data }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const label = STAGE_LABELS[stageKey] ? t(STAGE_LABELS[stageKey]) : stageKey
  const score = data?.score ?? 0
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${scoreColor}`}>{score}/100</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 flex flex-col gap-3 bg-slate-900/40">
          <p className="text-sm text-slate-300 leading-relaxed">{data?.feedback}</p>

          {data?.highlights?.length > 0 && (
            <div>
              <p className="text-xs text-emerald-400 font-semibold mb-1">{t('scoring.legacy.strengths')}</p>
              <ul className="flex flex-col gap-1">
                {data.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">+</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data?.red_flags?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {t('scoring.legacy.redFlags')}
              </p>
              <ul className="flex flex-col gap-1">
                {data.red_flags.map((f, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="text-red-400 flex-shrink-0">–</span>
                    {f}
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

export default function ScorecardDisplay({ scoreData }) {
  const { t } = useTranslation()
  const navigate = useNavigate();
  if (!scoreData) return null

  const verdict = VERDICT_CONFIG[scoreData.overall_verdict] ?? VERDICT_CONFIG.SCORING_ERROR

  // Radar chart data
  const radarData = Object.entries(scoreData.breakdown ?? {}).map(([key, val]) => ({
    subject: STAGE_LABELS[key] ? t(STAGE_LABELS[key]) : key,
    score: val?.score ?? 0,
    fullMark: 100,
  }))

  // STAR bar data
  const starData = [
    { name: t('scoring.legacy.star.situation'), score: scoreData.star_analysis?.avg_situation_score ?? 0 },
    { name: t('scoring.legacy.star.task'), score: scoreData.star_analysis?.avg_task_score ?? 0 },
    { name: t('scoring.legacy.star.action'), score: scoreData.star_analysis?.avg_action_score ?? 0 },
    { name: t('scoring.legacy.star.result'), score: scoreData.star_analysis?.avg_result_score ?? 0 },
  ]

  const barColors = ['#60a5fa', '#f59e0b', '#22d3ee', '#34d399']

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-heading font-bold text-white">{t('scoring.legacy.title')}</h1>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-5xl font-bold text-white">{scoreData.total_score}</span>
          <span className="text-slate-500 text-lg">/100</span>
        </div>
        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${verdict.bg} ${verdict.color}`}>
          {t(verdict.labelKey)}
        </span>
      </div>

      {/* Radar chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('scoring.legacy.stageScores')}</h2>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* STAR bar chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-1">{t('scoring.legacy.starAnalysis')}</h2>
        {scoreData.star_analysis?.weakness && (
          <p className="text-xs text-amber-400 mb-3">
            ⚠ {scoreData.star_analysis.weakness}
          </p>
        )}
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={starData} layout="vertical" barSize={18}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {starData.map((_, i) => (
                <Cell key={i} fill={barColors[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage accordion */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-300">{t('scoring.legacy.stageDetails')}</h2>
        {Object.entries(scoreData.breakdown ?? {}).map(([key, data]) => (
          <AccordionStage key={key} stageKey={key} data={data} />
        ))}
      </div>

      {/* Consistency check warning */}
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

      {/* Communication quality */}
      {scoreData.communication_quality && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">{t('scoring.legacy.communication.title')}</h2>
            <span className={`text-sm font-bold ${
              (scoreData.communication_quality.score ?? 0) >= 80 ? 'text-emerald-400' :
              (scoreData.communication_quality.score ?? 0) >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {scoreData.communication_quality.score ?? 0}/100
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: t('scoring.legacy.communication.clarity'), value: scoreData.communication_quality.clarity },
              { label: t('scoring.legacy.communication.conciseness'), value: scoreData.communication_quality.conciseness },
              { label: t('scoring.legacy.communication.structure'), value: scoreData.communication_quality.structure },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{value}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* CV claim verification */}
      {scoreData.cv_claim_verification && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">{t('scoring.legacy.cvVerification')}</h2>
          {scoreData.cv_claim_verification.verified?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1.5">
                {t('scoring.legacy.verified')}
              </p>
              <ul className="flex flex-col gap-1">
                {scoreData.cv_claim_verification.verified.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
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
                    <XCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actionable feedback */}
      {scoreData.actionable_feedback && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-blue-400 mb-2">{t('scoring.legacy.improvements')}</h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {scoreData.actionable_feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
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
