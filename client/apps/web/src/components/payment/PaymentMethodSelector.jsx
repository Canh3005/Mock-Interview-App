import { useTranslation } from 'react-i18next'

const METHODS = [
  { id: 'momo', labelKey: 'payment.momo' },
  { id: 'vnpay', labelKey: 'payment.vnpay' },
]

export default function PaymentMethodSelector({ selected, onSelect }) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-3">
      {METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={[
            'inline-flex h-11 flex-1 items-center justify-center rounded-[14px] border px-4 text-sm font-bold transition-all duration-150',
            selected === m.id
              ? 'dash-primary-button'
              : 'dash-control',
          ].join(' ')}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  )
}
