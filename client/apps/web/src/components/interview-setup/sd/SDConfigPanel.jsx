import { useDispatch, useSelector } from 'react-redux';
import { setSdConfig } from '../../../store/slices/interviewSetupSlice';
import { Zap } from 'lucide-react';

const DURATION_OPTIONS = [45, 60];

export default function SDConfigPanel() {
  const dispatch = useDispatch();
  const { durationMinutes, enableCurveball } = useSelector((s) => s.interviewSetup.sdConfig);

  return (
    <div className="mt-3 ml-12 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Thời lượng:</span>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => dispatch(setSdConfig({ durationMinutes: n }))}
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs text-slate-400 font-medium">Curveball Scenarios</span>
        </div>
        <button
          onClick={() => dispatch(setSdConfig({ enableCurveball: !enableCurveball }))}
          className={[
            'relative w-10 h-5 rounded-full transition-colors',
            enableCurveball ? 'bg-cta' : 'bg-slate-700',
          ].join(' ')}
        >
          <span className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            enableCurveball ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')} />
        </button>
      </div>
    </div>
  );
}
