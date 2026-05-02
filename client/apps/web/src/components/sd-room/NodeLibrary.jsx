import { useTranslation } from 'react-i18next'
import { NODE_LIBRARY } from './SDNodeTypes'

export default function NodeLibrary() {
  const { t } = useTranslation()

  const _handleDragStart = (e, type) => {
    e.dataTransfer.setData('nodeType', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-52 flex-shrink-0 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60">
      <div className="px-4 py-2.5 border-b border-slate-800 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          {t('sdRoom.nodeLibrary.title')}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NODE_LIBRARY.map(({ category, items }) => (
          <div key={category}>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              {t(`sdRoom.nodeLibrary.categories.${category}`)}
            </p>
            <div className="space-y-1">
              {items.map(({ type, label }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => _handleDragStart(e, type)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 bg-slate-800 border border-slate-700 cursor-grab hover:border-cta hover:text-white hover:bg-slate-700 transition-colors select-none"
                >
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
