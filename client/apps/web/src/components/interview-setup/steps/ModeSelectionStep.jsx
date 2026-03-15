import { useDispatch, useSelector } from 'react-redux'
import { Target, Swords } from 'lucide-react'
import { selectMode, proceedFromMode } from '../../../store/slices/interviewSetupSlice'

const MODES = [
  {
    key: 'practice',
    Icon: Target,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    title: 'Luyện tập',
    description:
      'AI đóng vai Mentor thân thiện. Có gợi ý khi bạn bị kẹt. Không áp lực. Thích hợp để làm quen với format phỏng vấn.',
    badges: ['Không giới hạn thời gian', 'Không cần Webcam'],
    badgeColor: 'bg-sky-500/15 text-sky-400',
    borderActive: 'border-sky-500',
    ringActive: 'ring-sky-500/30',
  },
  {
    key: 'combat',
    Icon: Swords,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    title: 'Thực chiến',
    description:
      'Mô phỏng phỏng vấn thực tế. AI đánh giá nghiêm khắc theo đúng level. Kích hoạt giám sát và phân tích cảm xúc.',
    badges: ['Giới hạn thời gian', 'Yêu cầu Webcam + Mic'],
    badgeColor: 'bg-orange-500/15 text-orange-400',
    borderActive: 'border-orange-500',
    ringActive: 'ring-orange-500/30',
    warning:
      'Mọi sự kiện bất thường sẽ được ghi lại dưới dạng cờ đỏ để hậu kiểm — bạn sẽ không bị đuổi ra ngay. Dữ liệu video không được lưu trữ.',
  },
]

export default function ModeSelectionStep() {
  const dispatch = useDispatch()
  const selectedMode = useSelector((s) => s.interviewSetup.selectedMode)

  const canProceed = !!selectedMode

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">Chọn chế độ phỏng vấn</h2>
        <p className="text-slate-400 text-sm">Hai chế độ có sự khác biệt về tài nguyên và cơ chế đánh giá.</p>
      </div>

      <div className="flex flex-col gap-3">
        {MODES.map((mode) => {
          const isSelected = selectedMode === mode.key
          return (
            <button
              key={mode.key}
              onClick={() => dispatch(selectMode(mode.key))}
              className={[
                'w-full text-left rounded-xl border p-4 transition-all duration-200',
                'bg-slate-800/60 hover:bg-slate-800',
                isSelected
                  ? `${mode.borderActive} ring-2 ${mode.ringActive}`
                  : 'border-slate-700',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mode.iconBg}`}>
                  <mode.Icon className={`w-5 h-5 ${mode.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-white text-sm">{mode.title}</span>
                    {mode.badges.map((b) => (
                      <span
                        key={b}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${mode.badgeColor}`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{mode.description}</p>

                  {/* Combat warning — show when selected */}
                  {isSelected && mode.warning && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs leading-relaxed">
                      ⚠️ {mode.warning}
                    </div>
                  )}
                </div>

                {/* Radio indicator */}
                <div
                  className={[
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 transition-colors',
                    isSelected
                      ? `${mode.borderActive} bg-current`
                      : 'border-slate-600',
                  ].join(' ')}
                />
              </div>
            </button>
          )
        })}
      </div>

      <button
        disabled={!canProceed}
        onClick={() => dispatch(proceedFromMode())}
        className="w-full px-4 py-3 rounded-xl bg-cta hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
      >
        Tiếp tục
      </button>
    </div>
  )
}
