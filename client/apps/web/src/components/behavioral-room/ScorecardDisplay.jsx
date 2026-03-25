import { useState } from 'react'
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
import { ChevronDown, ChevronUp, AlertTriangle, Star, Home, RotateCcw } from 'lucide-react'

const VERDICT_CONFIG = {
  SENIOR_PASS: { label: 'Senior – Đạt', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/40' },
  MID_PASS: { label: 'Mid – Đạt', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  MID_BORDERLINE: { label: 'Mid – Cần cải thiện', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40' },
  JUNIOR_RECOMMEND: { label: 'Junior – Tiềm năng', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/40' },
  JUNIOR_FAIL: { label: 'Junior – Chưa đạt', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' },
  SENIOR_FAIL: { label: 'Senior – Chưa đạt', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' },
  SCORING_ERROR: { label: 'Lỗi chấm điểm', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' },
}

const STAGE_LABELS = {
  stage_1_culture_fit: 'Culture Fit',
  stage_2_tech_stack: 'Tech Stack',
  stage_3_domain: 'Domain',
  stage_4_cv_deepdive: 'CV Deep-dive',
  stage_5_soft_skills: 'Soft Skills',
  stage_6_reverse_interview: 'Reverse Interview',
}

function AccordionStage({ stageKey, data }) {
  const [open, setOpen] = useState(false)
  const label = STAGE_LABELS[stageKey] ?? stageKey
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
              <p className="text-xs text-emerald-400 font-semibold mb-1">Điểm mạnh</p>
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
                <AlertTriangle className="w-3 h-3" /> Red Flags
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

export default function ScorecardDisplay({ scoreData, navigate }) {
  if (!scoreData) return null

  const verdict = VERDICT_CONFIG[scoreData.overall_verdict] ?? VERDICT_CONFIG.SCORING_ERROR

  // Radar chart data
  const radarData = Object.entries(scoreData.breakdown ?? {}).map(([key, val]) => ({
    subject: STAGE_LABELS[key] ?? key,
    score: val?.score ?? 0,
    fullMark: 100,
  }))

  // STAR bar data
  const starData = [
    { name: 'Situation', score: scoreData.star_analysis?.avg_situation_score ?? 0 },
    { name: 'Task', score: scoreData.star_analysis?.avg_task_score ?? 0 },
    { name: 'Action', score: scoreData.star_analysis?.avg_action_score ?? 0 },
    { name: 'Result', score: scoreData.star_analysis?.avg_result_score ?? 0 },
  ]

  const barColors = ['#60a5fa', '#f59e0b', '#22d3ee', '#34d399']

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-heading font-bold text-white">Kết quả phỏng vấn</h1>
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="text-5xl font-bold text-white">{scoreData.total_score}</span>
          <span className="text-slate-500 text-lg">/100</span>
        </div>
        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${verdict.bg} ${verdict.color}`}>
          {verdict.label}
        </span>
      </div>

      {/* Radar chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Điểm theo giai đoạn</h2>
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
        <h2 className="text-sm font-semibold text-slate-300 mb-1">Phân tích STAR</h2>
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
        <h2 className="text-sm font-semibold text-slate-300">Chi tiết từng giai đoạn</h2>
        {Object.entries(scoreData.breakdown ?? {}).map(([key, data]) => (
          <AccordionStage key={key} stageKey={key} data={data} />
        ))}
      </div>

      {/* Actionable feedback */}
      {scoreData.actionable_feedback && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-blue-400 mb-2">Điểm cần cải thiện</h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {scoreData.actionable_feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('dashboard')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </button>
        <button
          onClick={() => navigate('interview-setup')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Luyện tập lại
        </button>
      </div>
    </div>
  )
}
