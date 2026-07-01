import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const SIGNAL_ICON = {
  covered: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />,
  unclear: <MinusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />,
  missing: <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />,
}

const BAND_COLOR = {
  strong: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  solid: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  needs_work: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  insufficient_evidence: 'text-red-400 border-red-500/30 bg-red-500/10',
}

function _ProbeSignals({ signalResults }) {
  const { t } = useTranslation()
  if (!signalResults?.length) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {signalResults.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          {SIGNAL_ICON[s.status] ?? SIGNAL_ICON.missing}
          <div className="min-w-0">
            <span className="text-xs text-slate-300">{s.label}</span>
            {s.evidenceQuotes?.[0] && (
              <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                &ldquo;{s.evidenceQuotes[0]}&rdquo;
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function _ProbeNotes({ notes }) {
  const { t } = useTranslation()
  if (!notes?.length) return null
  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {t('behaviorScorecard.notesLabel')}
      </p>
      <ul className="flex flex-col gap-0.5">
        {notes.map((n, i) => (
          <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
            <span className="text-slate-600 shrink-0">·</span>
            {n}
          </li>
        ))}
      </ul>
    </div>
  )
}

function _ProbeBody({ probe }) {
  const { t } = useTranslation()
  const firstAnswer = probe.candidateAnswerQuotes?.[0]
  return (
    <div className="dash-muted-panel flex flex-col gap-0 px-4 py-3">
      {probe.summary && (
        <p className="dash-muted mb-3 text-xs leading-relaxed">{probe.summary}</p>
      )}
      {firstAnswer && (
        <div className="dash-card mb-3 rounded-[14px] p-2.5">
          <p className="dash-subtle mb-1 text-[10px] uppercase tracking-[0.08em]">
            {t('behaviorScorecard.answerQuoteLabel')}
          </p>
          <p className="dash-muted line-clamp-3 text-xs italic">&ldquo;{firstAnswer}&rdquo;</p>
        </div>
      )}
      <_ProbeSignals signalResults={probe.signalResults} />
      <_ProbeNotes notes={probe.improvementSuggestions} />
    </div>
  )
}

export default function BehaviorProbeAccordion({ probe }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const bodyRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(open ? bodyRef.current.scrollHeight : 0)
    }
  }, [open])

  const bandKey = probe.band ?? 'insufficient_evidence'
  const bandLabel = t(`behaviorScorecard.probeBand.${bandKey}`)
  const bandClass = BAND_COLOR[bandKey] ?? BAND_COLOR.insufficient_evidence
  const title = probe.primaryQuestion?.slice(0, 80) ?? ''

  return (
    <div className="dash-card overflow-hidden rounded-[18px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--dash-surface-muted)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {probe.isFallback && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">
              {t('behaviorScorecard.fallbackBadge')}
            </span>
          )}
          <span className="dash-text truncate text-sm font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bandClass}`}>
            {bandLabel}
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>
      <div
        style={{ maxHeight: height, overflow: 'hidden', transition: 'max-height 0.25s ease' }}
      >
        <div ref={bodyRef}>
          <_ProbeBody probe={probe} />
        </div>
      </div>
    </div>
  )
}
