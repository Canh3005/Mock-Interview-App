import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, ShoppingCart } from 'lucide-react'
import {
  fetchTransactionsRequest,
  loadMoreTransactions,
  setTxFilter,
} from '../../store/slices/walletSlice'
import { ROUTES } from '../../router/routes'
import TransactionRow from './TransactionRow'

const FILTERS = [
  { key: 'all',     labelKey: 'wallet.history.filterAll' },
  { key: 'income',  labelKey: 'wallet.history.filterIncome' },
  { key: 'expense', labelKey: 'wallet.history.filterExpense' },
  { key: 'refund',  labelKey: 'wallet.history.filterRefund' },
]

export default function TransactionHistoryPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const sentinelRef = useRef(null)

  const { balance, transactions, txLoading, txFilter, txHasMore } =
    useSelector((s) => s.wallet)

  useEffect(() => {
    dispatch(fetchTransactionsRequest())
  }, [dispatch])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) dispatch(loadMoreTransactions())
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [dispatch])

  return (
    <div className="dash-page-shell min-h-full transition-colors duration-200">
      <main className="dash-page">
        <header className="dash-page-header">
          <div>
            <h1 className="dash-page-title">{t('wallet.history.title')}</h1>
            <p className="dash-muted mt-0.5 text-sm">{t('wallet.history.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTES.BUY_CREDITS)}
            className="dash-primary-button inline-flex h-10 shrink-0 items-center gap-2 rounded-[14px] px-4 text-sm font-bold"
          >
            <ShoppingCart className="h-4 w-4" />
            {t('wallet.history.buyMore')}
          </button>
        </header>

        <div className="dash-feature-card flex items-center rounded-[20px] p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium text-white/70">
              {t('wallet.history.currentBalance')}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {balance ?? '—'}{' '}
              <span className="text-lg font-semibold">{t('wallet.credits')}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => txFilter !== f.key && dispatch(setTxFilter(f.key))}
              className={[
                'inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors',
                txFilter === f.key ? 'dash-primary-button' : 'dash-chip border',
              ].join(' ')}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        <div className="dash-card rounded-[20px] px-5 sm:px-6">
          {txLoading && transactions.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="dash-muted h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="dash-muted py-12 text-center text-sm">
              {t('wallet.history.empty')}
            </p>
          ) : (
            <>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}

              {txHasMore && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {txLoading && <Loader2 className="dash-muted h-5 w-5 animate-spin" />}
                </div>
              )}

              {!txHasMore && (
                <p className="dash-subtle py-4 text-center text-xs">
                  {t('wallet.history.allLoaded')}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
