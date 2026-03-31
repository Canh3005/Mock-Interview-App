import { Check, Lock } from 'lucide-react';
import { STAGE_NAMES } from '../../store/slices/behavioralSlice';

const STAGES = [1, 2, 3, 4, 5, 6];

export default function CombatSidebar({ videoRef, isRecording, isAiSpeaking, currentStage }) {
  return (
    <aside className="w-52 flex-shrink-0 border-r border-slate-800 flex-col hidden md:flex">
      <div className="p-3 border-b border-slate-800">
        <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {isRecording && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              REC
            </div>
          )}

          {isAiSpeaking && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg">
              <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '240ms' }} />
              <span className="ml-1">AI đang nói</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3 px-2">
          Tiến độ
        </p>
        {STAGES.map((s) => {
          const isPast    = s < currentStage;
          const isCurrent = s === currentStage;
          return (
            <div
              key={s}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors mb-0.5 ${
                isCurrent ? 'bg-cta/10 border border-cta/30' : isPast ? 'opacity-60' : 'opacity-30'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border ${
                isPast    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : isCurrent ? 'bg-cta/20 border-cta text-cta'
                : 'bg-slate-800 border-slate-600 text-slate-500'
              }`}>
                {isPast ? <Check className="w-3 h-3" /> : !isCurrent ? <Lock className="w-2.5 h-2.5" /> : s}
              </div>
              <span className={`text-xs leading-tight ${
                isCurrent ? 'text-white font-semibold' : isPast ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {STAGE_NAMES[s]}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
