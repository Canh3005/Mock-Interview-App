import {
  AlertTriangle,
  Eye,
  Smile,
  Activity,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  AlertCircle,
} from 'lucide-react'

// ── shared combat helpers/atoms ──────────────────────────────────────────────
export const INTEGRITY_STYLE = {
  CLEAN:            { label: 'Tính minh bạch: Đạt',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck },
  MINOR_FLAGS:      { label: 'Có một số sự kiện ghi nhận', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   Icon: ShieldAlert },
  SUSPICIOUS:       { label: 'Cần hậu kiểm',               color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30', Icon: ShieldAlert },
  HIGHLY_SUSPICIOUS:{ label: 'Nhiều dấu hiệu bất thường',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       Icon: ShieldX },
}

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

/**
 * Điểm combat tổng = behavioral*0.65 + soft-skill*0.35 - penalty(integrity).
 * `behavioralScore` cho phép các scorecard khác nhau truyền điểm gốc của mình
 * (legacy dùng `scoreData.total_score`, probe-based dùng `readiness.finalScore`).
 */
export function getOverallCombatScore(scoreData, behavioralScore) {
  if (typeof scoreData?.overall_combat_score === 'number') return scoreData.overall_combat_score
  const behavioral = behavioralScore ?? scoreData?.total_score ?? 0
  const softSkill  = scoreData?.multimodal?.overall_soft_skill_score ?? 0
  const integrity  = scoreData?.integrity?.integrity_score ?? 100
  const base    = behavioral * 0.65 + softSkill * 0.35
  const penalty = integrity >= 85 ? 0 : (85 - integrity) * 0.5
  return Math.max(0, Math.round(base - penalty))
}

// ── combat tab ───────────────────────────────────────────────────────────────
export default function CombatTab({ scoreData, behavioralScore }) {
  const multimodal  = scoreData?.multimodal
  const integrity   = scoreData?.integrity
  const overallCombat = getOverallCombatScore(scoreData, behavioralScore)

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
