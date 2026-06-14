import { useTranslation } from 'react-i18next'
import { NODE_LIBRARY } from './nodeTypes'

export default function NodeLibrary() {
  const { t } = useTranslation()

  const handleDragStart = (event, type) => {
    event.dataTransfer.setData('nodeType', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex w-52 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900">
      <div className="flex-shrink-0 border-b border-slate-800 px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          {t('sdRoom.nodeLibrary.title')}
        </h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {NODE_LIBRARY.map(({ category, items }) => (
          <div key={category}>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {t(`sdRoom.nodeLibrary.categories.${category}`)}
            </p>
            <div className="space-y-1">
              {items.map(({ type, label }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(event) => handleDragStart(event, type)}
                  className="flex cursor-grab select-none items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-cta hover:bg-slate-700 hover:text-white"
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
