import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { fetchBalanceRequest } from '../../store/slices/walletSlice'
import { ROUTES } from '../../router/routes'

function _resolveSuccess(params) {
  if (params.get('resultCode') !== null) {
    return params.get('resultCode') === '0'
  }
  if (params.get('vnp_ResponseCode') !== null) {
    return params.get('vnp_ResponseCode') === '00'
  }
  return null
}

export default function PaymentResultPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [resolved, setResolved] = useState(false)

  const success = _resolveSuccess(searchParams)

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchBalanceRequest())
      setResolved(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [dispatch])

  useEffect(() => {
    if (!resolved) return
    const timer = setTimeout(() => {
      navigate(ROUTES.DASHBOARD)
    }, 3000)
    return () => clearTimeout(timer)
  }, [resolved, navigate])

  return (
    <div className="dash-page-shell flex min-h-full items-center justify-center">
      <div className="dash-card flex w-full max-w-sm flex-col items-center gap-6 rounded-[20px] p-8 text-center">
        {!resolved ? (
          <>
            <Loader2 className="dash-muted h-12 w-12 animate-spin" />
            <p className="dash-muted text-sm">{t('payment.resultPending')}</p>
          </>
        ) : success === false ? (
          <>
            <XCircle className="h-12 w-12 text-red-500" />
            <div>
              <h2 className="dash-text text-lg font-bold">{t('payment.resultTitle')}</h2>
              <p className="dash-muted mt-1 text-sm">{t('payment.resultFailed')}</p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate(ROUTES.BUY_CREDITS)}
                className="dash-primary-button inline-flex h-11 items-center justify-center rounded-[14px] px-4 text-sm font-bold"
              >
                {t('payment.tryAgain')}
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="dash-control inline-flex h-11 items-center justify-center rounded-[14px] border px-4 text-sm font-bold"
              >
                {t('payment.backToDashboard')}
              </button>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="h-12 w-12 text-[var(--dash-accent)]" />
            <div>
              <h2 className="dash-text text-lg font-bold">{t('payment.resultTitle')}</h2>
              <p className="dash-muted mt-1 text-sm">{t('payment.resultSuccess')}</p>
            </div>
            <p className="dash-subtle text-xs">{t('payment.backToDashboard')}...</p>
          </>
        )}
      </div>
    </div>
  )
}
