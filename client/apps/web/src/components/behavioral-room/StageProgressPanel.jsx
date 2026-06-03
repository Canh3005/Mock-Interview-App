import { useTranslation } from 'react-i18next'
import { Check, Lock, Loader2, SkipForward } from 'lucide-react'

function _StageIcon({ status }) {
  if (status === 'completed') return <Check className="w-3.5 h-3.5" />
  if (status === 'skipped') return <SkipForward className="w-3 h-3" />
  if (status === 'active') return <Loader2 className="w-3.5 h-3.5 animate-spin" />
  return <Lock className="w-3 h-3" />
}

function _stageIndicatorClass(status) {
  if (status === 'completed') return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
  if (status === 'active') return 'dash-chip'
  if (status === 'skipped') return 'dash-muted-panel dash-subtle'
  return 'dash-muted-panel dash-subtle'
}

function _LevelBadge({ level }) {
  const { t } = useTranslation()
  const colors = {
    senior: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
    mid: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
    junior: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
  }
  if (!level) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[level] ?? colors.junior}`}>
      {t(`dashboard.sessions.level.${level}`, level)}
    </span>
  )
}

export default function StageProgressPanel({ stageProgress, candidateLevel }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-1 py-2">
      <p className="dash-subtle mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em]">
        {t('behavioralRoom.stage.progress')}
      </p>

      {stageProgress.map((stage, idx) => {
        const isActive = stage.status === 'active'
        const isDone = stage.status === 'completed'
        const isSkipped = stage.status === 'skipped'
        const stageName = t(`behavioralRoom.stage.names.${stage.stage}`, { defaultValue: stage.stage })

        return (
          <div
            key={stage.stage}
            className={`flex items-start gap-3 px-2 py-2.5 rounded-xl transition-colors ${
              isActive ? 'dash-chip border' : isDone ? 'opacity-80' : 'opacity-50'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold border transition-colors ${_stageIndicatorClass(stage.status)}`}>
              {stage.status === 'pending' ? (
                <span className="text-slate-500 text-[10px]">{idx + 1}</span>
              ) : (
                <_StageIcon status={stage.status} />
              )}
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-sm leading-tight ${isActive ? 'dash-text font-semibold' : isDone ? 'dash-muted' : 'dash-subtle'}`}>
                {stageName}
              </span>
              {/* Probe progress bar */}
              {(isActive || isDone) && stage.probeRuns.length > 0 && (
                <p className="dash-subtle text-[10px]">
                  {t('behavioralRoom.stage.probeCount', { count: stage.probeRuns.length })} · {isSkipped ? t('behavioralRoom.stage.status.skipped') : isDone ? t('behavioralRoom.stage.status.completed') : t('behavioralRoom.stage.status.active')}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {candidateLevel && (
        <div className="mt-4 px-2">
          <_LevelBadge level={candidateLevel} />
        </div>
      )}
    </div>
  )
}
