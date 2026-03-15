import { useDispatch, useSelector } from 'react-redux'
import { toggleRound } from '../../../store/slices/interviewSetupSlice'
import { CheckSquare, Square, Clock, Lock, Users, Terminal, Bot, Network, Target, Swords } from 'lucide-react'

const ROUNDS = [
  {
    key: 'hr_behavioral',
    label: 'HR & Behavioral (STAR)',
    description: 'Đánh giá culture fit qua cấu trúc STAR. AI Facilitator dẫn dắt 6 giai đoạn theo level.',
    duration: 20,
    available: true,
    Icon: Users,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  {
    key: 'dsa',
    label: 'DSA & Live Coding',
    description: 'Giải thuật, Clean Code, Time/Space Complexity. Sandbox an toàn.',
    duration: 30,
    available: false,
    Icon: Terminal,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    key: 'ai_prompting',
    label: 'AI Prompting & Pair Programming',
    description: 'Debug code với AI nội bộ. Chấm điểm tư duy Chain-of-Thought.',
    duration: 20,
    available: false,
    Icon: Bot,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
  },
  {
    key: 'system_design',
    label: 'System Design (Whiteboard)',
    description: 'Thiết kế kiến trúc bằng Drag & Drop. AI đọc JSON diagram.',
    duration: 30,
    available: false,
    Icon: Network,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
  },
]

export default function RoundSelectionStep({ onStart }) {
  const dispatch = useDispatch()
  const { selectedRounds, selectedMode } = useSelector((s) => s.interviewSetup)

  const estimatedTotal = selectedRounds.reduce((sum, key) => {
    const r = ROUNDS.find((r) => r.key === key)
    return sum + (r?.duration ?? 0)
  }, 0)

  const canStart = selectedRounds.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-heading font-bold text-white mb-1">Chọn vòng thi</h2>
        <p className="text-slate-400 text-sm">
          Chọn một hoặc nhiều vòng thi.{' '}
          <span className={`inline-flex items-center gap-1 font-medium ${selectedMode === 'combat' ? 'text-orange-400' : 'text-sky-400'}`}>
            {selectedMode === 'combat'
              ? <><Swords className="w-3.5 h-3.5" /> Thực chiến</>
              : <><Target className="w-3.5 h-3.5" /> Luyện tập</>}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ROUNDS.map((round) => {
          const isSelected = selectedRounds.includes(round.key)
          const disabled = !round.available

          return (
            <button
              key={round.key}
              disabled={disabled}
              onClick={() => !disabled && dispatch(toggleRound(round.key))}
              className={[
                'w-full text-left rounded-xl border p-4 transition-all duration-200',
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-slate-800/30 border-slate-700/50'
                  : isSelected
                    ? 'bg-slate-800 border-cta ring-1 ring-cta/30'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${round.iconBg}`}>
                  <round.Icon className={`w-5 h-5 ${round.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-white text-sm">{round.label}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      ~{round.duration} phút
                    </span>
                    {!round.available && (
                      <span className="flex items-center gap-1 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Sắp ra mắt
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{round.description}</p>
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {disabled ? (
                    <Square className="w-4 h-4 text-slate-700" />
                  ) : isSelected ? (
                    <CheckSquare className="w-4 h-4 text-cta" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer: estimated time + start button */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
        {estimatedTotal > 0 ? (
          <span className="text-slate-400 text-sm">
            Tổng thời gian ước tính:{' '}
            <span className="text-white font-medium">~{estimatedTotal} phút</span>
          </span>
        ) : (
          <span className="text-slate-500 text-sm">Chọn ít nhất 1 vòng</span>
        )}
        <button
          disabled={!canStart}
          onClick={onStart}
          className="px-5 py-2.5 rounded-xl bg-cta hover:bg-cta/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
        >
          Bắt đầu
        </button>
      </div>
    </div>
  )
}
