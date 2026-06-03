import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const BADGE_KEYS = {
  popular: 'payment.popularBadge',
  save23: 'payment.save23Badge',
  save33: 'payment.save33Badge',
}

export default function PackageCard({ pkg, selected, onSelect, highlighted }) {
  const { t } = useTranslation()
  const isFeatured = pkg.badge === 'popular'

  return (
    <button
      type="button"
      onClick={() => onSelect(pkg.id)}
      className={[
        'relative flex w-full flex-col gap-3 rounded-[20px] p-5 text-left transition-all duration-200 sm:p-6',
        isFeatured ? 'dash-feature-card' : 'dash-card',
        selected
          ? 'ring-2 ring-[var(--dash-accent)] ring-offset-2'
          : 'hover:-translate-y-0.5',
        highlighted && !selected ? 'ring-2 ring-amber-400 ring-offset-2' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {pkg.badge && (
        <span className="dash-chip absolute right-4 top-4 rounded-full px-2.5 py-1 text-xs font-semibold">
          {t(BADGE_KEYS[pkg.badge])}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px] text-lg font-extrabold',
            isFeatured
              ? 'bg-white/20 text-white'
              : 'dash-icon-tile dash-accent',
          ].join(' ')}
        >
          {pkg.credits}
        </div>
        <div>
          <p
            className={[
              'text-base font-bold',
              isFeatured ? 'text-white' : 'dash-text',
            ].join(' ')}
          >
            {pkg.name}
          </p>
          <p
            className={[
              'text-xs font-medium',
              isFeatured ? 'text-white/70' : 'dash-muted',
            ].join(' ')}
          >
            {pkg.credits} {t('payment.credits')}
          </p>
        </div>
      </div>

      <p
        className={[
          'text-2xl font-extrabold leading-none',
          isFeatured ? 'text-white' : 'dash-text',
        ].join(' ')}
      >
        {pkg.priceVnd.toLocaleString('vi-VN')}
        <span
          className={[
            'ml-1 text-sm font-semibold',
            isFeatured ? 'text-white/70' : 'dash-muted',
          ].join(' ')}
        >
          {t('payment.vnd')}
        </span>
      </p>

      {selected && (
        <span className="absolute bottom-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--dash-accent)] text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  )
}
