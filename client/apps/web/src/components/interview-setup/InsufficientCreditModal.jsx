import { Coins } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

export default function InsufficientCreditModal({ creditError, onClose, onTopUp }) {
  const { t } = useTranslation()
  const { required, current, deficit } = creditError

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-red-500/30 bg-red-500/10 text-red-500">
        <Coins className="h-8 w-8" />
      </div>
      <div>
        <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">
          {t('interviewSetup.credit.eyebrow')}
        </p>
        <h2 className="dash-text mt-1 text-xl font-bold">{t('interviewSetup.credit.title')}</h2>
        <p className="dash-muted mt-2 max-w-sm text-sm leading-relaxed">
          <Trans
            i18nKey="interviewSetup.credit.body"
            values={{ required, current, deficit }}
            components={{
              strong: <span className="dash-text font-semibold" />,
              danger: <span className="font-semibold text-red-500" />,
            }}
          />
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          className="dash-control inline-flex h-11 items-center justify-center rounded-[14px] border px-4 text-sm font-bold"
        >
          {t('interviewSetup.credit.close')}
        </button>
        <button
          type="button"
          onClick={onTopUp}
          className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-4 text-sm font-bold"
        >
          {t('interviewSetup.credit.topUp')}
        </button>
      </div>
    </div>
  )
}
