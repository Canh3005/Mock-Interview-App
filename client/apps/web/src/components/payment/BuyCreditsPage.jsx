import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import {
  fetchPackagesRequest,
  selectPackage,
  selectMethod,
  createOrderRequest,
  clearOrderError,
} from '../../store/slices/paymentSlice'
import PackageCard from './PackageCard'
import PaymentMethodSelector from './PaymentMethodSelector'

export default function BuyCreditsPage() {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const deficit = Number(searchParams.get('deficit')) || 0

  const { packages, packagesLoading, packagesError, selectedPackageId, selectedMethod, ordering, orderError } =
    useSelector((s) => s.payment)

  useEffect(() => {
    dispatch(fetchPackagesRequest())
    return () => {
      dispatch(clearOrderError())
    }
  }, [dispatch])

  const suggestedPackageId = useMemo(() => {
    if (!deficit || !packages.length) return null
    const covering = packages.find((p) => p.credits >= deficit)
    return covering ? covering.id : packages[packages.length - 1].id
  }, [deficit, packages])

  useEffect(() => {
    if (suggestedPackageId && !selectedPackageId) {
      dispatch(selectPackage(suggestedPackageId))
    }
  }, [suggestedPackageId, selectedPackageId, dispatch])

  const handleProceed = () => {
    if (!selectedPackageId) return
    dispatch(createOrderRequest({ packageId: selectedPackageId, paymentMethod: selectedMethod }))
  }

  return (
    <div className="dash-page-shell min-h-full transition-colors duration-200">
      <main className="dash-page">
        <header className="dash-page-header">
          <div>
            <h1 className="dash-page-title">{t('payment.title')}</h1>
            <p className="dash-muted mt-0.5 text-sm">{t('payment.subtitle')}</p>
          </div>
        </header>

        {packagesLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="dash-muted h-8 w-8 animate-spin" />
          </div>
        )}

        {packagesError && (
          <div className="dash-card rounded-[20px] p-5 text-center text-sm text-red-500">
            {packagesError}
          </div>
        )}

        {!packagesLoading && !packagesError && packages.length > 0 && (
          <div className="flex flex-col gap-6">
            {deficit > 0 && (
              <p className="dash-muted text-sm">
                {t('payment.autoSuggestHint')}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPackageId === pkg.id}
                  highlighted={suggestedPackageId === pkg.id && selectedPackageId !== pkg.id}
                  onSelect={(id) => dispatch(selectPackage(id))}
                />
              ))}
            </div>

            <div className="dash-card flex flex-col gap-4 rounded-[20px] p-5 sm:p-6">
              <p className="dash-text text-sm font-semibold">
                {t('payment.selectMethod')}
              </p>
              <PaymentMethodSelector
                selected={selectedMethod}
                onSelect={(m) => dispatch(selectMethod(m))}
              />
            </div>

            {orderError && (
              <p className="text-center text-sm text-red-500">{orderError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleProceed}
                disabled={!selectedPackageId || ordering}
                className="dash-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-bold disabled:opacity-50"
              >
                {ordering && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('payment.proceedButton')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
