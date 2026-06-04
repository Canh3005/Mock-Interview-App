import { Gift, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const TYPE_CONFIG = {
  BONUS:  { icon: Gift,        color: 'text-[var(--dash-accent)]', sign: '+', labelKey: 'wallet.history.typeBonus' },
  CREDIT: { icon: TrendingUp,  color: 'text-[var(--dash-accent)]', sign: '+', labelKey: 'wallet.history.typeCredit' },
  REFUND: { icon: RotateCcw,   color: 'text-[var(--dash-accent)]', sign: '+', labelKey: 'wallet.history.typeRefund' },
  DEBIT:  { icon: TrendingDown, color: 'text-red-500',             sign: '−', labelKey: 'wallet.history.typeDebit' },
}

function _formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TransactionRow({ tx }) {
  const { t } = useTranslation()
  const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.DEBIT
  const Icon = cfg.icon

  return (
    <div className="dash-border flex items-center gap-4 border-b px-1 py-4 last:border-b-0">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] dash-icon-tile ${cfg.color}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="dash-text text-sm font-semibold">{t(cfg.labelKey)}</p>
        {tx.description && (
          <p className="dash-muted mt-0.5 truncate text-xs">{tx.description}</p>
        )}
        <p className="dash-subtle mt-0.5 text-xs">{_formatDate(tx.createdAt)}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-sm font-bold ${cfg.color}`}>
          {cfg.sign}{tx.amount} {t('wallet.credits')}
        </p>
        <p className="dash-subtle mt-0.5 text-xs">
          {tx.balanceAfter !== null && tx.balanceAfter !== undefined
            ? `${t('wallet.history.remaining')}: ${tx.balanceAfter}`
            : '—'}
        </p>
      </div>
    </div>
  )
}
