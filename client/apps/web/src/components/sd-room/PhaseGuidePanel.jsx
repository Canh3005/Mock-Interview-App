import { useDispatch, useSelector } from 'react-redux'
import { Lightbulb, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { requestHintRequest } from '../../store/slices/sdInterviewerSlice'

export default function PhaseGuidePanel() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const phase = useSelector((s) => s.sdSession.phase)
  const { hintLoading, loading, hintsUsed } = useSelector((s) => s.sdInterviewer)

  const goal = t(`sdRoom.phaseGuide.${phase}.goal`, { defaultValue: '' })
  const checklist = t(`sdRoom.phaseGuide.${phase}.checklist`, { returnObjects: true, defaultValue: [] })

  const handleHint = () => {
    if (hintLoading || loading) return
    dispatch(requestHintRequest())
  }

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-5">
      {goal && (
        <p className="text-xs text-slate-400 leading-relaxed">{goal}</p>
      )}

      {Array.isArray(checklist) && checklist.length > 0 && (
        <ul className="flex flex-col gap-3">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Circle className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-2">
        <button
          onClick={handleHint}
          disabled={hintLoading || loading}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium hover:bg-yellow-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {hintLoading
            ? t('sdRoom.aiChat.hintLoading')
            : t('sdRoom.aiChat.requestHint', { count: hintsUsed })}
        </button>
        <p className="text-[10px] text-slate-600 text-center">{t('sdRoom.aiChat.hintPenaltyNote')}</p>
      </div>
    </div>
  )
}
