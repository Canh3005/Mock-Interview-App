import { useDispatch, useSelector } from 'react-redux'
import { Target, Swords, AlertTriangle, Globe } from 'lucide-react'
import { selectMode, proceedFromMode, selectLanguage } from '../../../store/slices/interviewSetupSlice'

const LANGUAGES = [
  {
    key: 'vi',
    label: 'Tiếng Việt',
    badge: 'VI',
    badgeColor: 'bg-red-500/15 text-red-400',
    borderActive: 'border-red-500',
    ringActive: 'ring-red-500/30',
  },
  {
    key: 'en',
    label: 'English',
    badge: 'EN',
    badgeColor: 'bg-sky-500/15 text-sky-400',
    borderActive: 'border-sky-500',
    ringActive: 'ring-sky-500/30',
  },
  {
    key: 'ja',
    label: '日本語',
    badge: 'JA',
    badgeColor: 'bg-pink-500/15 text-pink-400',
    borderActive: 'border-pink-500',
    ringActive: 'ring-pink-500/30',
  },
]

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
  const selectedLanguage = useSelector((s) => s.interviewSetup.selectedLanguage)

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
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 inline mr-1.5" />
                      {mode.warning}
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

      {/* Language selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Globe className="w-3.5 h-3.5" />
          <span>Ngôn ngữ phỏng vấn</span>
        </div>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.key
            return (
              <button
                key={lang.key}
                onClick={() => dispatch(selectLanguage(lang.key))}
                className={[
                  'flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all duration-200',
                  'bg-slate-800/60 hover:bg-slate-800',
                  isSelected
                    ? `${lang.borderActive} ring-2 ${lang.ringActive} text-white`
                    : 'border-slate-700 text-slate-400',
                ].join(' ')}
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold mr-1.5 ${lang.badgeColor}`}>
                  {lang.badge}
                </span>
                {lang.label}
              </button>
            )
          })}
        </div>
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
