import { useSelector, useDispatch } from 'react-redux'
import { CheckCircle2, Loader2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setScoringInitialTab } from '../../store/slices/interviewSetupSlice'

const BASE_DIMENSIONS = [
  'componentCoverage',
  'scalabilityFit',
  'tradeoffArticulation',
  'communicationClarity',
]

function DimensionRow({ dimensionKey, completedDimensions, status }) {
  const { t } = useTranslation()
  const result = completedDimensions.find((d) => d.dimension === dimensionKey)
  const label = t(`sdRoom.evaluation.dimensions.${dimensionKey}`)

  if (result) {
    return (
      <div className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-slate-800/60">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-sm text-slate-200">{label}</span>
        </div>
        <span className="text-sm font-medium text-slate-300">
          {result.score} / {result.maxScore}
        </span>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-2.5 py-2.5 px-4 rounded-lg bg-slate-800/40">
        <Loader2 className="w-4 h-4 text-cta animate-spin shrink-0" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 py-2.5 px-4 rounded-lg bg-slate-800/20">
      <Clock className="w-4 h-4 text-slate-600 shrink-0" />
      <span className="text-sm text-slate-600">{label}</span>
    </div>
  )
}

export default function EvaluationLoadingOverlay({ navigate }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { status, completedDimensions, finalScore, hintPenalty, gradeBand, error } =
    useSelector((s) => s.sdEvaluator)

  if (status === 'idle') return null

  const hasCurveball = completedDimensions.some((d) => d.dimension === 'curveballAdaptation')
  const dimensions = hasCurveball ? [...BASE_DIMENSIONS, 'curveballAdaptation'] : BASE_DIMENSIONS

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 flex items-center justify-center">
      <div className="w-full max-w-md mx-4 bg-slate-900 border border-slate-800/60 rounded-2xl p-6 flex flex-col gap-4">
        <EvaluationHeader status={status} t={t} />
        <div className="flex flex-col gap-1.5">
          {dimensions.map((key) => (
            <DimensionRow
              key={key}
              dimensionKey={key}
              completedDimensions={completedDimensions}
              status={status}
            />
          ))}
        </div>
        {status === 'completed' && (
          <>
            <EvaluationResult finalScore={finalScore} hintPenalty={hintPenalty} gradeBand={gradeBand} t={t} />
            <button
              onClick={() => { dispatch(setScoringInitialTab('systemDesign')); navigate('scoring'); }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-cta text-white text-sm font-medium hover:bg-cta/90 transition-colors"
            >
              {t('sdRoom.evaluation.viewResults')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
        {status === 'failed' && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error || t('sdRoom.evaluation.error')}
          </div>
        )}
      </div>
    </div>
  )
}

function EvaluationHeader({ status, t }) {
  return (
    <div className="flex items-center gap-3">
      {status === 'processing' && <Loader2 className="w-5 h-5 text-cta animate-spin shrink-0" />}
      {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
      {status === 'failed' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
      <h2 className="text-base font-semibold text-slate-200">
        {status === 'completed' ? t('sdRoom.evaluation.completed') : t('sdRoom.evaluation.analyzing')}
      </h2>
    </div>
  )
}

function EvaluationResult({ finalScore, hintPenalty, gradeBand, t }) {
  return (
    <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{t('sdRoom.evaluation.finalScore')}</span>
        <div className="flex items-center gap-2">
          {hintPenalty > 0 && (
            <span className="text-xs text-amber-400">
              {t('sdRoom.evaluation.hintPenalty', { points: hintPenalty })}
            </span>
          )}
          <span className="text-2xl font-bold text-white">{finalScore}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{t('sdRoom.evaluation.grade')}</span>
        <span className="text-sm font-medium text-cta">{gradeBand}</span>
      </div>
      <p className="text-xs text-slate-500 text-center">{t('sdRoom.evaluation.debriefNote')}</p>
    </div>
  )
}
