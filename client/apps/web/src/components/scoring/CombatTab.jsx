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
import { useTranslation } from 'react-i18next'

// ── shared combat helpers/atoms ──────────────────────────────────────────────
export const INTEGRITY_STYLE = {
  CLEAN:            { labelKey: 'scoring.integrity.verdict.CLEAN',             color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck },
  MINOR_FLAGS:      { labelKey: 'scoring.integrity.verdict.MINOR_FLAGS',       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   Icon: ShieldAlert },
  SUSPICIOUS:       { labelKey: 'scoring.integrity.verdict.SUSPICIOUS',        color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30', Icon: ShieldAlert },
  HIGHLY_SUSPICIOUS:{ labelKey: 'scoring.integrity.verdict.HIGHLY_SUSPICIOUS', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       Icon: ShieldX },
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
  const { t } = useTranslation()
  const multimodal  = scoreData?.multimodal
  const integrity   = scoreData?.integrity
  const overallCombat = getOverallCombatScore(scoreData, behavioralScore)

  const intStyle = INTEGRITY_STYLE[integrity?.verdict] ?? INTEGRITY_STYLE.MINOR_FLAGS
  const IntIcon  = intStyle.Icon

  const dominantLabel = (value) => t(`scoring.combat.expression.${value}`, value)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Score summary row ── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Combat overall */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('scoring.combat.overall')}</p>
          <span className={`text-xl font-bold leading-tight ${scoreColor(overallCombat)}`}>{overallCombat}</span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
        {/* Soft skills */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-3 flex flex-col gap-0.5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('scoring.combat.softSkills')}</p>
          <span className={`text-xl font-bold leading-tight ${scoreColor(multimodal?.overall_soft_skill_score ?? 0)}`}>
            {multimodal?.overall_soft_skill_score ?? '—'}
          </span>
          <span className="text-[10px] text-slate-500">/100</span>
        </div>
        {/* Integrity */}
        {integrity && (
          <div className={`rounded-2xl border p-3 flex flex-col gap-0.5 ${intStyle.bg}`}>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('scoring.integrity.title')}</p>
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
            <p className={`text-xs font-semibold ${intStyle.color}`}>{t(intStyle.labelKey)}</p>
            {integrity.hr_notes && (
              <p className="text-xs text-slate-400 leading-relaxed mt-1">{integrity.hr_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Multimodal breakdown ── */}
      {multimodal ? (
        <div className="flex flex-col gap-3">
          <SectionLabel>{t('scoring.combat.realtimeAnalysis')}</SectionLabel>

          {/* Eye tracking */}
          {multimodal.eye_tracking && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">{t('scoring.combat.eyeContact')}</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.eye_tracking.score)}`}>
                  {multimodal.eye_tracking.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.eye_tracking.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{t('scoring.combat.lookAtCamera')}</span>
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
                  <span className="text-sm font-semibold text-slate-200">{t('scoring.combat.fillerWords')}</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.filler_words.score)}`}>
                  {multimodal.filler_words.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.filler_words.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{t('scoring.combat.fillerRate')}</span>
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
                  <span className="text-sm font-semibold text-slate-200">{t('scoring.combat.facialExpression')}</span>
                </div>
                <span className={`text-sm font-bold ${scoreColor(multimodal.expression.score)}`}>
                  {multimodal.expression.score}/100
                </span>
              </div>
              <ScoreBar score={multimodal.expression.score} />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{t('scoring.combat.dominantExpression')}</span>
                <span className={`font-semibold ${
                  multimodal.expression.dominant_expression === 'confident' ? 'text-emerald-400'
                  : multimodal.expression.dominant_expression === 'stressed' ? 'text-red-400'
                  : 'text-slate-300'
                }`}>
                  {dominantLabel(multimodal.expression.dominant_expression)}
                </span>
              </div>
              {multimodal.expression.stress_peak_minutes?.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
                  <Clock className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    {t('scoring.combat.stressPeaks', { minutes: multimodal.expression.stress_peak_minutes.join(', ') })}
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
                {t('scoring.combat.noAnalysisData')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">{t('scoring.combat.noMultimodalData')}</p>
        </div>
      )}

      {/* ── Integrity events ── */}
      {integrity?.events_timeline?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <SectionLabel>{t('scoring.integrity.events', { count: integrity.events_timeline.length })}</SectionLabel>
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
