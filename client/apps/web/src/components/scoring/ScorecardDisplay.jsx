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
  Eye,
  Smile,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  AlertCircle,
} from 'lucide-react'

// ── constants ──────────────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  SENIOR_PASS:      { label: 'Senior – Đạt',       color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/40' },
  MID_PASS:         { label: 'Mid – Đạt',           color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  MID_BORDERLINE:   { label: 'Mid – Cần cải thiện', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/40' },
  JUNIOR_RECOMMEND: { label: 'Junior – Tiềm năng',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/40' },
  JUNIOR_FAIL:      { label: 'Junior – Chưa đạt',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
  SENIOR_FAIL:      { label: 'Senior – Chưa đạt',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/40' },
  SCORING_ERROR:    { label: 'Lỗi chấm điểm',       color: 'text-slate-400',   bg: 'bg-slate-800 border-slate-700' },
}

const INTEGRITY_STYLE = {
  CLEAN:            { label: 'Tính minh bạch: Đạt',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck },
  MINOR_FLAGS:      { label: 'Có một số sự kiện ghi nhận', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   Icon: ShieldAlert },
  SUSPICIOUS:       { label: 'Cần hậu kiểm',               color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30', Icon: ShieldAlert },
  HIGHLY_SUSPICIOUS:{ label: 'Nhiều dấu hiệu bất thường',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       Icon: ShieldX },
}

const STAGE_LABELS = {
  stage_1_culture_fit:       'Culture Fit',
  stage_2_tech_stack:        'Tech Stack',
  stage_3_domain:            'Domain',
  stage_4_cv_deepdive:       'CV Deep-dive',
  stage_5_soft_skills:       'Soft Skills',
  stage_6_reverse_interview: 'Reverse Interview',
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

function getOverallCombatScore(scoreData) {
  if (typeof scoreData?.overall_combat_score === 'number') return scoreData.overall_combat_score
  const behavioral = scoreData?.total_score ?? 0
  const softSkill  = scoreData?.multimodal?.overall_soft_skill_score ?? 0
  const integrity  = scoreData?.integrity?.integrity_score ?? 100
  const base    = behavioral * 0.65 + softSkill * 0.35
  const penalty = integrity >= 85 ? 0 : (85 - integrity) * 0.5
  return Math.max(0, Math.round(base - penalty))
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
  const [open, setOpen] = useState(false)
  const label = STAGE_LABELS[stageKey] ?? stageKey
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
              <p className="text-xs text-emerald-400 font-semibold mb-1.5">Điểm mạnh</p>
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
                <AlertTriangle className="w-3 h-3" /> Red Flags
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
  const radarData = Object.entries(scoreData.breakdown ?? {}).map(([key, val]) => ({
    subject: STAGE_LABELS[key] ?? key,
    score: val?.score ?? 0,
    fullMark: 100,
  }))
  const starData = [
    { name: 'Situation', score: scoreData.star_analysis?.avg_situation_score ?? 0 },
    { name: 'Task',      score: scoreData.star_analysis?.avg_task_score      ?? 0 },
    { name: 'Action',    score: scoreData.star_analysis?.avg_action_score    ?? 0 },
    { name: 'Result',    score: scoreData.star_analysis?.avg_result_score    ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <SectionLabel>Điểm theo giai đoạn</SectionLabel>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Radar name="Score" dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
        <SectionLabel>Phân tích STAR</SectionLabel>
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
          <SectionLabel>Điểm cần cải thiện</SectionLabel>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {scoreData.actionable_feedback}
          </p>
        </div>
      )}
    </div>
  )
}

function DetailTab({ scoreData }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <SectionLabel>Chi tiết từng giai đoạn</SectionLabel>
        {Object.entries(scoreData.breakdown ?? {}).map(([key, data]) => (
          <AccordionStage key={key} stageKey={key} data={data} />
        ))}
      </div>

      {scoreData.consistency_check?.has_contradictions && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-400 mb-1">
              Mâu thuẫn giữa các giai đoạn
              {scoreData.consistency_check.impact !== 'none' && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20">
                  {scoreData.consistency_check.impact === 'significant' ? 'Nghiêm trọng' : 'Nhỏ'}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{scoreData.consistency_check.detail}</p>
          </div>
        </div>
      )}

      {scoreData.cv_claim_verification && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <SectionLabel>Kiểm chứng CV</SectionLabel>
          {scoreData.cv_claim_verification.verified?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1.5">Đã xác nhận</p>
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
                Chưa xác minh / Có thể thổi phồng
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
  const cq = scoreData.communication_quality
  if (!cq) return <p className="text-sm text-slate-500 text-center py-8">Không có dữ liệu giao tiếp</p>

  const cqScore = cq.score ?? 0
  const metrics = [
    { label: 'Độ rõ ràng', value: cq.clarity },
    { label: 'Súc tích',   value: cq.conciseness },
    { label: 'Cấu trúc',   value: cq.structure },
  ]

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Chất lượng giao tiếp</SectionLabel>
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

// ── combat tab ─────────────────────────────────────────────────────────────────
function CombatTab({ scoreData }) {
  const multimodal  = scoreData?.multimodal
  const integrity   = scoreData?.integrity
  const overallCombat = getOverallCombatScore(scoreData)

  const intStyle = INTEGRITY_STYLE[integrity?.verdict] ?? INTEGRITY_STYLE.MINOR_FLAGS
  const IntIcon  = intStyle.Icon

  const dominantLabel = { confident: 'Tự tin', neutral: 'Bình thường', stressed: 'Căng thẳng', uncertain: 'Do dự' }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Score summary row ── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Combat overall */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Combat</p>
          <span className={`text-xl font-bold leading-tight ${scoreColor(overallCombat)}`}>{overallCombat}</span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
        {/* Soft skills */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Soft Skills</p>
          <span className={`text-xl font-bold leading-tight ${scoreColor(multimodal?.overall_soft_skill_score ?? 0)}`}>
            {multimodal?.overall_soft_skill_score ?? '—'}
          </span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
        {/* Integrity */}
        {integrity && (
          <div className={`rounded-2xl border p-3 flex flex-col gap-0.5 ${intStyle.bg}`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Integrity</p>
            <span className={`text-xl font-bold leading-tight ${intStyle.color}`}>{integrity.integrity_score}</span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
        )}
      </div>

      {/* ── Integrity verdict banner ── */}
      {integrity && (
        <div className={`rounded-2xl border p-3 flex items-start gap-3 ${intStyle.bg}`}>
          <IntIcon className={`w-4 h-4 ${intStyle.color} flex-shrink-0 mt-0.5`} />
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${intStyle.color}`}>{intStyle.label}</p>
            {integrity.hr_notes && (
              <p className="text-xs text-slate-400 leading-relaxed mt-1">{integrity.hr_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Multimodal breakdown ── */}
      {multimodal ? (
        <div className="flex flex-col gap-3">
          <SectionLabel>Phân tích hành vi thời gian thực</SectionLabel>

          {/* Eye tracking */}
          {multimodal.eye_tracking && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">Giao tiếp bằng mắt</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.eye_tracking.score)}`}>
                  {multimodal.eye_tracking.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.eye_tracking.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Nhìn vào camera</span>
                <span className="font-semibold text-slate-200">{multimodal.eye_tracking.screen_gaze_percent}%</span>
              </div>
              {multimodal.eye_tracking.feedback && (
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{multimodal.eye_tracking.feedback}</p>
              )}
            </div>
          )}

          {/* Filler words */}
          {multimodal.filler_words && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-slate-200">Từ đệm</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.filler_words.score)}`}>
                  {multimodal.filler_words.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.filler_words.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Tỉ lệ từ đệm</span>
                <span className={`font-semibold ${
                  multimodal.filler_words.avg_filler_rate < 0.05 ? 'text-emerald-400'
                  : multimodal.filler_words.avg_filler_rate < 0.15 ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  {Math.round(multimodal.filler_words.avg_filler_rate * 100)}%
                </span>
              </div>
              {multimodal.filler_words.top_fillers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {multimodal.filler_words.top_fillers.map((word) => (
                    <span key={word} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
                      "{word}"
                    </span>
                  ))}
                </div>
              )}
              {multimodal.filler_words.feedback && (
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{multimodal.filler_words.feedback}</p>
              )}
            </div>
          )}

          {/* Expression */}
          {multimodal.expression && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-slate-200">Biểu cảm khuôn mặt</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.expression.score)}`}>
                  {multimodal.expression.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.expression.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Biểu cảm chủ đạo</span>
                <span className={`font-semibold ${
                  multimodal.expression.dominant_expression === 'confident' ? 'text-emerald-400'
                  : multimodal.expression.dominant_expression === 'stressed' ? 'text-red-400'
                  : 'text-slate-300'
                }`}>
                  {dominantLabel[multimodal.expression.dominant_expression] ?? multimodal.expression.dominant_expression}
                </span>
              </div>
              {multimodal.expression.stress_peak_minutes?.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
                  <Clock className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    Căng thẳng cao tại phút: {multimodal.expression.stress_peak_minutes.join(', ')}
                  </p>
                </div>
              )}
              {multimodal.expression.feedback && (
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{multimodal.expression.feedback}</p>
              )}
            </div>
          )}

          {!multimodal.eye_tracking && !multimodal.filler_words && !multimodal.expression && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                Không có dữ liệu phân tích — camera hoặc MediaPipe chưa hoạt động trong phiên này.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">Không có dữ liệu multimodal cho phiên này.</p>
        </div>
      )}

      {/* ── Integrity events ── */}
      {integrity?.events_timeline?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <SectionLabel>Sự kiện bất thường ({integrity.events_timeline.length})</SectionLabel>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {integrity.events_timeline.slice(0, 8).map((event, index) => (
              <div
                key={`${event.ts}-${index}`}
                className="flex items-start gap-2 text-xs rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-slate-300 font-medium truncate">{event.type}</p>
                  <p className="text-slate-500 text-[10px]">
                    {event.severity}{event.duration_ms ? ` · ${Math.round(event.duration_ms / 1000)}s` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── main export ────────────────────────────────────────────────────────────────
const BASE_TABS = [
  { id: 'overview',      label: 'Tổng quan',  Icon: LayoutGrid },
  { id: 'detail',        label: 'Chi tiết',   Icon: List },
  { id: 'communication', label: 'Giao tiếp',  Icon: MessageSquare },
]
const COMBAT_TAB = { id: 'combat', label: 'Thực chiến', Icon: Swords }

export default function ScorecardDisplay({ scoreData, navigate, isCombat = false }) {
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
            <h1 className="text-base font-bold text-white">Kết quả phỏng vấn</h1>
          </div>
          {isCombat && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
              <Swords className="w-3 h-3" />
              Combat
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
              {verdict.label}
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
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors
              ${tab === id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
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
