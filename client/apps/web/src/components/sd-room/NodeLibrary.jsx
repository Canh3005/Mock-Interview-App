import { useTranslation } from 'react-i18next'
import { NODE_LIBRARY } from './SDNodeTypes'

export default function NodeLibrary() {
  const { t } = useTranslation()

  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('nodeType', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="w-60 h-full bg-card border-r border-border flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{t('sdRoom.nodeLibrary.title')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {NODE_LIBRARY.map(({ category, items }) => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t(`sdRoom.nodeLibrary.categories.${category}`)}
            </p>
            <div className="space-y-1">
              {items.map(({ type, label }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground bg-background border border-border cursor-grab hover:border-cta hover:bg-cta/5 transition-colors select-none"
                >
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
