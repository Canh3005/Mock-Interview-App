import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useState } from 'react'

const STAR_ITEMS = [
  {
    key: 'situation',
    label: 'S – Situation',
    hint: 'Bối cảnh: bạn đang ở đâu, dự án nào?',
    color: 'blue',
  },
  {
    key: 'task',
    label: 'T – Task',
    hint: 'Nhiệm vụ: bạn phải làm gì?',
    color: 'amber',
  },
  {
    key: 'action',
    label: 'A – Action',
    hint: 'Hành động: bạn đã làm gì cụ thể? (Quan trọng nhất)',
    color: 'cta',
  },
  {
    key: 'result',
    label: 'R – Result',
    hint: 'Kết quả: số liệu định lượng? (%, thời gian, tác động)',
    color: 'emerald',
  },
]

const colorMap = {
  blue: {
    done: 'bg-blue-500/20 border-blue-500 text-blue-300',
    pending: 'bg-slate-800 border-slate-600 text-slate-400',
    dot: 'bg-blue-400',
  },
  amber: {
    done: 'bg-amber-500/20 border-amber-500 text-amber-300',
    pending: 'bg-slate-800 border-slate-600 text-slate-400',
    dot: 'bg-amber-400',
  },
  cta: {
    done: 'bg-cta/20 border-cta text-cta',
    pending: 'bg-slate-800 border-slate-600 text-slate-400',
    dot: 'bg-cta',
  },
  emerald: {
    done: 'bg-emerald-500/20 border-emerald-500 text-emerald-300',
    pending: 'bg-slate-800 border-slate-600 text-slate-400',
    dot: 'bg-emerald-400',
  },
}

export default function StarGuidePanel({ starStatus, practiceMode = true }) {
  const [collapsed, setCollapsed] = useState(!practiceMode)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors py-4"
        title="Mở STAR Guide"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="[writing-mode:vertical-lr] text-xs tracking-widest">
          STAR
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
          STAR Checklist
        </p>
        <button
          onClick={() => setCollapsed(true)}
          className="text-slate-600 hover:text-slate-400 transition-colors"
          title="Thu nhỏ"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {STAR_ITEMS.map(({ key, label, hint, color }) => {
          const isDone = starStatus?.[key] ?? false
          const colors = colorMap[color]

          return (
            <div
              key={key}
              className={`border rounded-xl p-3 transition-all ${
                isDone ? colors.done : colors.pending
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isDone ? colors.dot : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold">{label}</span>
                {isDone && (
                  <span className="ml-auto text-[10px] opacity-70">✓</span>
                )}
              </div>
              <p className="text-[11px] opacity-70 leading-tight pl-4">{hint}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed px-1">
        Checklist cập nhật realtime sau mỗi câu trả lời của bạn.
      </p>
    </div>
  )
}
