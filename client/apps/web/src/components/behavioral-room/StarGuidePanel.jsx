import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const STAR_ITEMS = [
  {
    key: 'situation',
    labelKey: 'behavioralRoom.star.situation.label',
    hintKey: 'behavioralRoom.star.situation.hint',
    color: 'blue',
  },
  {
    key: 'task',
    labelKey: 'behavioralRoom.star.task.label',
    hintKey: 'behavioralRoom.star.task.hint',
    color: 'amber',
  },
  {
    key: 'action',
    labelKey: 'behavioralRoom.star.action.label',
    hintKey: 'behavioralRoom.star.action.hint',
    color: 'cta',
  },
  {
    key: 'result',
    labelKey: 'behavioralRoom.star.result.label',
    hintKey: 'behavioralRoom.star.result.hint',
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
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(!practiceMode)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors py-4"
        title={t('behavioralRoom.star.open')}
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
          {t('behavioralRoom.star.checklist')}
        </p>
        <button
          onClick={() => setCollapsed(true)}
          className="text-slate-600 hover:text-slate-400 transition-colors"
          title={t('behavioralRoom.star.collapse')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {STAR_ITEMS.map(({ key, labelKey, hintKey, color }) => {
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
                <span className="text-xs font-semibold">{t(labelKey)}</span>
                {isDone && (
                  <span className="ml-auto text-[10px] opacity-70">✓</span>
                )}
              </div>
              <p className="text-[11px] opacity-70 leading-tight pl-4">{t(hintKey)}</p>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed px-1">
        {t('behavioralRoom.star.realtimeNote')}
      </p>
    </div>
  )
}
