import { Clock, Radio, LogOut, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CombatHeader({
  currentStage, stageName, candidateLevel,
  combatState, isAiSpeaking, isRecording, isWaitingForCandidate,
  isStreaming, elapsedMs, isLastStageFinished,
  onExit, onFinish,
}) {
  const { t } = useTranslation();
  const statusStyle = isAiSpeaking
    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    : isRecording
    ? 'bg-red-500/10 border-red-500/30 text-red-400'
    : isWaitingForCandidate
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    : 'bg-slate-800 border-slate-700 text-slate-500';

  const finishStyle = isLastStageFinished
    ? 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
    : 'text-red-400 border-red-500/40 hover:bg-red-500/10';

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs text-slate-400 border border-slate-700 hover:border-red-500/50 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
          title={t('combatRoom.header.exitTitle')}
        >
          <LogOut className="w-3.5 h-3.5" />
          {t('combatRoom.header.exit')}
        </button>
        <span className="text-sm font-semibold text-white">{t('combatRoom.header.mode')}</span>
        <span className="text-slate-600">·</span>
        <span className="text-sm text-slate-400">
          {t('combatRoom.header.stage', { current: currentStage, total: 6, name: stageName })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusStyle}`}>
          {t(`combatRoom.state.${combatState}`, combatState)}
        </span>

        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{formatTime(elapsedMs)}</span>
        </div>

        {candidateLevel && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
            candidateLevel === 'senior'
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : candidateLevel === 'mid'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {t(`combatRoom.level.${candidateLevel}`, candidateLevel)}
          </span>
        )}

        <button
          onClick={onFinish}
          disabled={isStreaming}
          className={`flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${finishStyle}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t('combatRoom.header.finish')}
        </button>

        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
          <Radio className="w-3 h-3" />
          {t('combatRoom.header.monitoring')}
        </div>
      </div>
    </header>
  );
}
