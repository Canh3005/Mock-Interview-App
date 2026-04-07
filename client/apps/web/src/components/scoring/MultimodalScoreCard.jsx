import { Eye, MessageSquare, Smile, AlertCircle, Clock } from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarColor(score) {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function ScoreBar({ score }) {
  return (
    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  )
}

function MetricCard({ icon: Icon, iconColor, label, score, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-slate-200">{label}</span>
        </div>
        <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}/100</span>
      </div>
      <ScoreBar score={score} />
      {children}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export default function MultimodalScoreCard({ multimodal }) {
  if (!multimodal) return null

  const { eye_tracking, filler_words, expression, overall_soft_skill_score } = multimodal

  const dominantLabel = {
    confident: 'Tự tin',
    neutral: 'Bình thường',
    stressed: 'Căng thẳng',
    uncertain: 'Do dự',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section header + overall score */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300">Phân tích soft skills (Combat)</h2>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
          <span className="text-xs text-red-400 font-medium">Tổng</span>
          <span className={`text-sm font-bold ${scoreColor(overall_soft_skill_score)}`}>
            {overall_soft_skill_score}/100
          </span>
        </div>
      </div>

      {/* Eye tracking */}
      {eye_tracking && (
        <MetricCard
          icon={Eye}
          iconColor="text-cyan-400"
          label="Giao tiếp bằng mắt"
          score={eye_tracking.score}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Nhìn vào camera</span>
            <span className="font-semibold text-slate-200">{eye_tracking.screen_gaze_percent}%</span>
          </div>
          {eye_tracking.feedback && (
            <p className="text-xs text-slate-400 leading-relaxed">{eye_tracking.feedback}</p>
          )}
        </MetricCard>
      )}

      {/* Filler words */}
      {filler_words && (
        <MetricCard
          icon={MessageSquare}
          iconColor="text-violet-400"
          label="Từ đệm (Filler words)"
          score={filler_words.score}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tỉ lệ từ đệm</span>
            <span className={`font-semibold ${filler_words.avg_filler_rate < 0.05 ? 'text-emerald-400' : filler_words.avg_filler_rate < 0.15 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(filler_words.avg_filler_rate * 100)}%
            </span>
          </div>
          {filler_words.top_fillers?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filler_words.top_fillers.map((word) => (
                <span
                  key={word}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300"
                >
                  "{word}"
                </span>
              ))}
            </div>
          )}
          {filler_words.feedback && (
            <p className="text-xs text-slate-400 leading-relaxed">{filler_words.feedback}</p>
          )}
        </MetricCard>
      )}

      {/* Expression */}
      {expression && (
        <MetricCard
          icon={Smile}
          iconColor="text-amber-400"
          label="Biểu cảm khuôn mặt"
          score={expression.score}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Biểu cảm chủ đạo</span>
            <span className={`font-semibold ${
              expression.dominant_expression === 'confident' ? 'text-emerald-400' :
              expression.dominant_expression === 'stressed' ? 'text-red-400' : 'text-slate-300'
            }`}>
              {dominantLabel[expression.dominant_expression] ?? expression.dominant_expression}
            </span>
          </div>

          {expression.stress_peak_minutes?.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300 leading-relaxed">
                Căng thẳng cao tại phút: {expression.stress_peak_minutes.join(', ')}
              </p>
            </div>
          )}

          {expression.feedback && (
            <p className="text-xs text-slate-400 leading-relaxed">{expression.feedback}</p>
          )}
        </MetricCard>
      )}

      {/* No data fallback */}
      {!eye_tracking && !filler_words && !expression && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            Không có dữ liệu phân tích — camera hoặc MediaPipe chưa hoạt động trong phiên này.
          </p>
        </div>
      )}
    </div>
  )
}
