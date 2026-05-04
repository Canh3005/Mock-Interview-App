import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Loader2, Trophy, GitBranch, MessageSquare, Lightbulb } from 'lucide-react'
import { triggerEvaluation } from '../../store/slices/sdEvaluatorSlice'
import ReferenceCanvas, { computeHighlights } from './ReferenceCanvas'
import ScoreBreakdown from './ScoreBreakdown'
import AnnotatedTranscript from './AnnotatedTranscript'
import ActionableSuggestions from './ActionableSuggestions'

const NAV_ITEMS = [
  { key: 'score',       Icon: Trophy },
  { key: 'reference',   Icon: GitBranch },
  { key: 'transcript',  Icon: MessageSquare },
  { key: 'suggestions', Icon: Lightbulb },
]

function DebriefNav() {
  const { t } = useTranslation()
  return (
    <nav className="sticky top-0 z-10 bg-background border-b border-slate-800 flex gap-1 px-4">
      {NAV_ITEMS.map(({ key, Icon }) => (
        <a
          key={key}
          href={`#${key}`}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
        >
          <Icon className="w-3.5 h-3.5" />
          {t(`sdDebrief.nav.${key}`)}
        </a>
      ))}
    </nav>
  )
}

function ReferenceWalkthrough({ session, evaluationResult }) {
  const { t } = useTranslation()
  const refArch = session?.problem?.referenceArchitecture
  const archJSON = session?.architectureJSON

  const { nodeHighlights, edgeHighlights } = useMemo(() => {
    if (!refArch) return { nodeHighlights: {}, edgeHighlights: {} }
    return computeHighlights(
      archJSON?.nodes ?? [],
      archJSON?.edges ?? [],
      refArch.nodes ?? [],
      refArch.edges ?? [],
    )
  }, [archJSON, refArch])

  if (!refArch) return null

  return (
    <section id="reference" className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        {t('sdDebrief.nav.reference')}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <ReferenceCanvas
          nodes={archJSON?.nodes ?? []}
          edges={archJSON?.edges ?? []}
          edgeHighlights={edgeHighlights}
          title={t('sdDebrief.yourDiagram')}
        />
        <ReferenceCanvas
          nodes={refArch.nodes ?? []}
          edges={refArch.edges ?? []}
          nodeHighlights={nodeHighlights}
          title={t('sdDebrief.referenceDiagram')}
        />
      </div>
    </section>
  )
}

export default function SDScoringTab({ session, navigate }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const sdEvaluatorStatus = useSelector((s) => s.sdEvaluator.status)

  if (!session?.evaluationResult) {
    const isProcessing = sdEvaluatorStatus === 'processing'
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        {isProcessing ? (
          <>
            <Loader2 className="w-8 h-8 text-cta animate-spin" />
            <p className="text-sm text-slate-400">{t('sdDebrief.evaluating')}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400">{t('sdDebrief.evaluationUnavailable')}</p>
            <button
              onClick={() => dispatch(triggerEvaluation(session?.id))}
              className="px-4 py-2 rounded-lg bg-cta text-white text-sm font-medium hover:bg-cta/90 transition-colors"
            >
              {t('sdDebrief.retry')}
            </button>
          </>
        )}
      </div>
    )
  }

  const evaluationResult = session.evaluationResult
  const annotationsDim = evaluationResult?.dimensions?.find((d) => d.dimension === 'annotations')
  const suggestionsDim = evaluationResult?.dimensions?.find((d) => d.dimension === 'suggestions')

  return (
    <div className="overflow-y-auto">
      <DebriefNav />
      <ScoreBreakdown evaluationResult={evaluationResult} />
      <ReferenceWalkthrough session={session} evaluationResult={evaluationResult} />
      <AnnotatedTranscript
        transcriptHistory={session.transcriptHistory ?? []}
        annotations={annotationsDim?.data?.annotations ?? []}
      />
      <ActionableSuggestions suggestions={suggestionsDim?.data?.suggestions ?? []} />
    </div>
  )
}
