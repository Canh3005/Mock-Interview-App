import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'

export default function ActionableSuggestions({ suggestions = [] }) {
  const { t } = useTranslation()

  return (
    <section id="suggestions" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          {t('sdDebrief.nav.suggestions')}
        </h2>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-sm text-slate-500">{t('sdDebrief.suggestionFallback')}</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {suggestions.map((s, idx) => (
            <li key={idx} className="flex gap-3 items-start bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="text-sm text-slate-300 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
