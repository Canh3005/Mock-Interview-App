import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Code2 } from 'lucide-react'
import { confirmRoundTransition } from '../../store/slices/interviewSetupSlice'
import { resetDSASession, startDSARound } from '../../store/slices/dsaSessionSlice'
import { ROUTES } from '../../router/routes'

export default function RoundTransitionScreen() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pendingNextRoundInterviewId, dsaConfig } = useSelector((s) => s.interviewSetup)

  const handleStart = () => {
    dispatch(confirmRoundTransition())
    dispatch(resetDSASession())
    dispatch(startDSARound({ interviewSessionId: pendingNextRoundInterviewId }))
    navigate(ROUTES.DSA_ROOM)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-8 text-center space-y-6">

        <div className="w-14 h-14 rounded-full bg-cta/10 border border-cta/20 flex items-center justify-center mx-auto">
          <Code2 className="w-7 h-7 text-cta" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            {t('interviewSetup.transition.roundComplete', { round: 1 })}
          </p>
          <h2 className="text-xl font-heading font-bold text-white">
            {t('interviewSetup.transition.nextRound')}
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            {t('interviewSetup.transition.solvePrefix')}{' '}
            <span className="text-white font-semibold">
              {t('interviewSetup.transition.problemCount', { count: dsaConfig?.problemCount ?? 1 })}
            </span>{' '}
            {t('interviewSetup.transition.solveSuffix')}
            <br />
            {t('interviewSetup.transition.prepare')}
          </p>
        </div>

        <div className="pt-2 space-y-2 text-xs text-slate-600">
          <p>{t('interviewSetup.transition.resultNote')}</p>
        </div>

        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold text-sm transition-colors"
        >
          {t('interviewSetup.transition.start')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
