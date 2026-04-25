import { useDispatch, useSelector } from 'react-redux'
import { setDsaProblemCount } from '../../../store/slices/interviewSetupSlice'
import { Shuffle } from 'lucide-react'

const COUNT_OPTIONS = [1, 2, 3]

export default function DSAConfigPanel() {
  const dispatch = useDispatch()
  const { problemCount } = useSelector((s) => s.interviewSetup.dsaConfig)

  return (
    <div className="mt-3 ml-12 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Số bài:</span>
        <div className="flex gap-1.5">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => dispatch(setDsaProblemCount(n))}
              className={[
                'w-8 h-8 rounded-lg text-sm font-semibold transition-colors',
                problemCount === n
                  ? 'bg-cta text-black'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Shuffle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-600" />
        <span>Bài sẽ được chọn tự động phù hợp với level của bạn.</span>
      </div>
    </div>
  )
}
