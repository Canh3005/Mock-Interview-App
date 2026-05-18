import { useDispatch, useSelector } from 'react-redux';
import { Layers, Zap } from 'lucide-react';
import { setBehavioralConfig } from '../../../store/slices/interviewSetupSlice';

const DEPTH_OPTIONS = [
  { value: 'broad', label: 'Toàn diện', icon: Layers, hint: '6 giai đoạn cân bằng' },
  { value: 'deep', label: 'Chuyên sâu', icon: Zap, hint: 'Đào sâu kỹ thuật' },
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

export default function BehavioralConfigPanel() {
  const dispatch = useDispatch();
  const { depth, durationMinutes } = useSelector((s) => s.interviewSetup.behavioralConfig);

  return (
    <div className="mt-3 ml-12 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Chiến lược:</span>
        {DEPTH_OPTIONS.map(({ value, label, icon: Icon, hint }) => (
          <button
            key={value}
            onClick={() => dispatch(setBehavioralConfig({ depth: value }))}
            title={hint}
            className={[
              'flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors',
              depth === value
                ? 'bg-cta text-black'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            ].join(' ')}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium">Thời lượng:</span>
        {DURATION_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => dispatch(setBehavioralConfig({ durationMinutes: n }))}
            className={[
              'px-3 h-8 rounded-lg text-xs font-semibold transition-colors',
              durationMinutes === n
                ? 'bg-cta text-black'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            ].join(' ')}
          >
            {n} phút
          </button>
        ))}
      </div>
    </div>
  );
}
