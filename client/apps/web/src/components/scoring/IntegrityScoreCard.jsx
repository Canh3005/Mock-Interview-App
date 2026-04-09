import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Activity } from 'lucide-react'

const VERDICT_STYLE = {
  CLEAN: {
    label: 'Tính minh bạch: Đạt',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: ShieldCheck,
  },
  MINOR_FLAGS: {
    label: 'Có một số sự kiện ghi nhận',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: ShieldAlert,
  },
  SUSPICIOUS: {
    label: 'Cần hậu kiểm',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    icon: ShieldAlert,
  },
  HIGHLY_SUSPICIOUS: {
    label: 'Nhiều dấu hiệu bất thường',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    icon: ShieldX,
  },
}

function getOverallCombatScore(scoreData) {
  if (typeof scoreData?.overall_combat_score === 'number') {
    return scoreData.overall_combat_score
  }
  const behavioral = scoreData?.total_score ?? 0
  const softSkill  = scoreData?.multimodal?.overall_soft_skill_score ?? 0
  const integrity  = scoreData?.integrity?.integrity_score ?? 100
  const base    = behavioral * 0.65 + softSkill * 0.35
  const penalty = integrity >= 85 ? 0 : (85 - integrity) * 0.5
  return Math.max(0, Math.round(base - penalty))
}

function scoreColor(s) {
  if (s >= 80) return 'text-emerald-400'
  if (s >= 60) return 'text-amber-400'
  return 'text-red-400'
}

export default function IntegrityScoreCard({ scoreData }) {
  const integrity = scoreData?.integrity
  if (!integrity) return null

  const style        = VERDICT_STYLE[integrity.verdict] ?? VERDICT_STYLE.MINOR_FLAGS
  const Icon         = style.icon
  const overallScore = getOverallCombatScore(scoreData)

  return (
    <div className="flex flex-col gap-3">
      {/* Combat overall + integrity in one row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Combat tổng hợp</p>
          <span className={`text-2xl font-bold ${scoreColor(overallScore)}`}>
            {overallScore}<span className="text-sm text-slate-500 font-normal">/100</span>
          </span>
          <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">
            65% Behavioral + 35% Soft Skills
          </p>
        </div>

        <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${style.bg}`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Integrity</p>
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${style.color} flex-shrink-0`} />
            <span className={`text-2xl font-bold ${style.color}`}>
              {integrity.integrity_score}<span className="text-sm font-normal">/100</span>
            </span>
          </div>
          <p className={`text-[10px] font-medium ${style.color}`}>{style.label}</p>
        </div>
      </div>

      {/* HR notes */}
      {integrity.hr_notes && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3">
          <p className="text-xs text-slate-300 leading-relaxed">{integrity.hr_notes}</p>
        </div>
      )}

      {/* Events timeline */}
      {integrity.events_timeline?.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-300">
              Sự kiện bất thường ({integrity.events_timeline.length})
            </h3>
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
                    {event.severity}
                    {event.duration_ms ? ` · ${Math.round(event.duration_ms / 1000)}s` : ''}
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
