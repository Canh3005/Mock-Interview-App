import { useTranslation } from 'react-i18next'

const ANNOTATION_STYLE = {
  green:  { wrap: 'bg-green-950/50 border-l-2 border-green-500',  badge: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  yellow: { wrap: 'bg-yellow-950/50 border-l-2 border-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  red:    { wrap: 'bg-red-950/50 border-l-2 border-red-500',       badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function TranscriptEntry({ entry, annotation }) {
  const isUser = entry.role === 'user'
  const style = annotation ? ANNOTATION_STYLE[annotation.type] : null

  return (
    <div className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-lg ${style?.wrap ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${isUser ? 'text-cta' : 'text-slate-500'}`}>
          {isUser ? 'You' : 'Interviewer'}
        </span>
        {entry.phase && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-600 uppercase tracking-wide">
            {entry.phase}
          </span>
        )}
        {entry.timestamp && (
          <span className="text-[10px] text-slate-600 tabular-nums ml-auto shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      {annotation && (
        <div className={`self-start flex items-center gap-1.5 mt-0.5 px-2 py-1 rounded-md ${style.badge}`}>
          <span className="text-[10px] font-bold uppercase tracking-wide">{annotation.type}</span>
          <span className="text-xs italic text-slate-400">{annotation.comment}</span>
        </div>
      )}
    </div>
  )
}

export default function AnnotatedTranscript({ transcriptHistory = [], annotations = [] }) {
  const { t } = useTranslation()

  const filtered = transcriptHistory.filter(
    (e) => e.role === 'user' || e.role === 'ai',
  )

  if (filtered.length === 0) {
    return (
      <section id="transcript" className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-500">{t('sdDebrief.annotationFallback')}</p>
      </section>
    )
  }

  const annotationMap = Object.fromEntries(
    (annotations ?? []).map((a) => [a.entryIndex, a]),
  )

  return (
    <section id="transcript" className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-1.5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
        {t('sdDebrief.nav.transcript')}
      </h2>
      {filtered.map((entry, idx) => (
        <TranscriptEntry key={idx} entry={entry} annotation={annotationMap[idx] ?? null} />
      ))}
    </section>
  )
}
