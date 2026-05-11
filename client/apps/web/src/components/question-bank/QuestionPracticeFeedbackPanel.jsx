import {
  CheckCircle2,
  Clock3,
  Loader2,
  Quote,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {error}
    </div>
  );
}

function FeedbackStatusBadge({ status }) {
  const { t } = useTranslation();
  const isReady = status === 'feedback_ready';
  const isFailed = status === 'feedback_failed';
  const className = isReady
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
    : isFailed
      ? 'border-red-400/40 bg-red-400/10 text-red-100'
      : 'border-amber-400/40 bg-amber-400/10 text-amber-100';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {isReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
      {t(`questionBank.feedback.status.${status}`)}
    </span>
  );
}

function EvidenceQuotes({ quotes }) {
  if (!quotes?.length) return null;
  return (
    <div className="space-y-2">
      {quotes.map((quote, index) => (
        <blockquote key={`${quote}-${index}`} className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-300">
          <Quote className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
          {quote}
        </blockquote>
      ))}
    </div>
  );
}

function SignalResultList({ signals }) {
  const { t } = useTranslation();
  if (!signals?.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">{t('questionBank.feedback.signals')}</h3>
      {signals.map((signal, index) => (
        <div key={signal.key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('questionBank.feedback.signalNumber', { number: index + 1 })}
            </span>
            <span className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {t(`questionBank.feedback.signalStatus.${signal.status}`)}
            </span>
          </div>
          <p className="mb-2 text-sm leading-6 text-slate-200">{signal.feedback}</p>
          <EvidenceQuotes quotes={signal.evidenceQuotes} />
        </div>
      ))}
    </div>
  );
}

function RedFlagList({ redFlags }) {
  const { t } = useTranslation();
  const presentFlags = redFlags?.filter((flag) => flag.present) ?? [];
  if (!presentFlags.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">{t('questionBank.feedback.redFlags')}</h3>
      {presentFlags.map((flag) => (
        <div key={flag.key} className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="mb-2 text-sm leading-6 text-red-100">{flag.feedback}</p>
          <EvidenceQuotes quotes={flag.evidenceQuotes} />
        </div>
      ))}
    </div>
  );
}

function ImprovementList({ suggestions }) {
  const { t } = useTranslation();
  if (!suggestions?.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white">{t('questionBank.feedback.improvements')}</h3>
      <ul className="space-y-2 text-sm leading-6 text-slate-300">
        {suggestions.map((suggestion, index) => (
          <li key={`${suggestion}-${index}`} className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeedbackResultPanel({ attempt }) {
  const { t } = useTranslation();
  const result = attempt?.result;
  if (!result) return null;
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-cta/15 px-2.5 py-1 text-xs font-semibold text-cta">
            {t(`questionBank.feedback.band.${result.overallBand}`)}
          </span>
          <span className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
            {t(`questionBank.feedback.confidence.${result.confidence}`)}
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-200">{result.summary}</p>
      </div>
      <SignalResultList signals={result.signalResults} />
      <RedFlagList redFlags={result.redFlags} />
      <ImprovementList suggestions={result.improvementSuggestions} />
    </div>
  );
}

export default function QuestionPracticeFeedbackPanel({
  attempt,
  loading,
  error,
  retryLoading,
  onRetry,
}) {
  const { t } = useTranslation();
  if (!attempt) return null;
  const isFailed = attempt.status === 'feedback_failed';
  const isReady = attempt.status === 'feedback_ready';
  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{t('questionBank.feedback.title')}</h2>
          <p className="text-xs text-slate-500">{t('questionBank.feedback.subtitle')}</p>
        </div>
        <FeedbackStatusBadge status={attempt.status} />
      </div>
      <ErrorBanner error={error} />
      {!isReady && !isFailed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('questionBank.feedback.processing')}
        </div>
      )}
      {isFailed && (
        <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          <p>{t('questionBank.feedback.failed')}</p>
          <button type="button" onClick={onRetry} disabled={retryLoading || !attempt.retryable} className="inline-flex items-center gap-2 rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-60">
            {retryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('questionBank.feedback.retry')}
          </button>
        </div>
      )}
      {isReady && <FeedbackResultPanel attempt={attempt} />}
      {loading && isReady ? (
        <p className="text-xs text-slate-500">{t('questionBank.feedback.refreshing')}</p>
      ) : null}
    </section>
  );
}
