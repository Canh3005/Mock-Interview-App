import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Lightbulb, ArrowRight } from 'lucide-react'

export default function ApproachBox({ problemId, onSubmit }) {
  const { t } = useTranslation()
  const savedApproach = useSelector((s) => s.dsaSession.approachTexts[problemId] ?? '')
  const [text, setText] = useState(savedApproach)
  const loading = useSelector((s) => s.dsaSession.loading)

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(problemId, text.trim())
  }

  return (
    <div className="dash-card flex flex-col gap-3 rounded-[18px] p-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <span className="dash-text text-sm font-semibold">{t('dsaRoom.approach.title')}</span>
      </div>

      <p className="dash-subtle text-xs leading-relaxed">
        {t('dsaRoom.approach.description')}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('dsaRoom.approach.placeholder')}
        rows={4}
        className="dash-input w-full resize-none rounded-[14px] px-3 py-2 text-sm placeholder:text-[var(--dash-subtle)] focus:outline-none"
      />

      <button
        disabled={!text.trim() || loading}
        onClick={handleSubmit}
        className="dash-primary-button flex w-full items-center justify-center gap-2 rounded-[14px] py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('dsaRoom.approach.confirm')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
