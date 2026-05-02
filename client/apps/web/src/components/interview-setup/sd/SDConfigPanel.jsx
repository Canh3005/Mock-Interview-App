import { useDispatch, useSelector } from 'react-redux';
import { setSdConfig } from '../../../store/slices/interviewSetupSlice';
import { Zap, Globe } from 'lucide-react';
import ToggleSwitch from '../../shared/ui/ToggleSwitch';

const DURATION_OPTIONS = [45, 60];

const LANGUAGE_LABELS = { vi: 'Tiếng Việt', en: 'English', ja: '日本語' };

export default function SDConfigPanel() {
  const dispatch = useDispatch();
  const { durationMinutes, enableCurveball } = useSelector((s) => s.interviewSetup.sdConfig);
  const selectedLanguage = useSelector((s) => s.interviewSetup.selectedLanguage);

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
        <ToggleSwitch
          checked={enableCurveball}
          onChange={(val) => dispatch(setSdConfig({ enableCurveball: val }))}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Ngôn ngữ phỏng vấn:{' '}
          <span className="text-slate-300 font-medium">{LANGUAGE_LABELS[selectedLanguage] ?? selectedLanguage}</span>
          <span className="ml-1 text-slate-600">· đổi ở bước Chọn chế độ</span>
        </span>
      </div>
    </div>
  );
}
