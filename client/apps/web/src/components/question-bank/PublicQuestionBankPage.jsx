import { useCallback, useEffect, useMemo } from 'react';
import { AlertCircle, Loader2, SearchX } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchQuestionProbesRequest,
  fetchTaxonomyRequest,
  resetQuestionBankFilters,
  setQuestionBankFilters,
} from '../../store/slices/questionBankSlice';
import QuestionBankFilters from './QuestionBankFilters';
import QuestionBankPagination from './QuestionBankPagination';
import QuestionProbeCard from './QuestionProbeCard';

const SUPPORTED_LOCALES = ['vi', 'en', 'ja'];

function _appLocale(i18n) {
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'vi';
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'vi';
}

function PageHeader({ page, totalPages, total }) {
  const { t } = useTranslation();
  return (
    <header className="dash-page-header">
      <div>
        <h1 className="dash-page-title">{t('questionBank.title')}</h1>
        <p className="dash-page-description">{t('questionBank.subtitle')}</p>
      </div>
      <div className="dash-card rounded-lg px-4 py-2 text-right">
        <p className="dash-subtle text-xs">
          {t('questionBank.pageCount', { page, totalPages })}
        </p>
        <p className="dash-text text-lg font-semibold">
          {t('questionBank.resultCount', { count: total })}
        </p>
      </div>
    </header>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      {error}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-100 bg-gray-50 py-20 text-center">
      <SearchX className="w-10 h-10 text-gray-300" />
      <h2 className="text-base font-semibold text-gray-700">
        {t('questionBank.emptyTitle')}
      </h2>
      <p className="max-w-md text-sm text-gray-500">
        {t('questionBank.emptyBody')}
      </p>
    </div>
  );
}

function Results({ probes, page, limit, total, loading, onPageChange }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t('questionBank.loading')}</span>
      </div>
    );
  }
  if (probes.length === 0) return <EmptyState />;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {probes.map((probe) => (
          <QuestionProbeCard key={probe.id} probe={probe} />
        ))}
      </div>
      <QuestionBankPagination
        page={page}
        limit={limit}
        total={total}
        loading={loading}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function useQuestionBankLocale({ dispatch, filters, i18n }) {
  const appLocale = useMemo(
    () => _appLocale(i18n),
    [i18n.language, i18n.resolvedLanguage],
  );
  useEffect(() => {
    if (filters.locale === appLocale) return;
    dispatch(setQuestionBankFilters({ locale: appLocale }));
  }, [appLocale, dispatch, filters.locale]);
  return appLocale;
}

function useQuestionBankFetch({ appLocale, dispatch, filters }) {
  useEffect(() => {
    dispatch(fetchTaxonomyRequest());
  }, [dispatch]);
  useEffect(() => {
    if (filters.locale !== appLocale) return;
    dispatch(fetchQuestionProbesRequest({ page: 1 }));
  }, [appLocale, dispatch, filters]);
}

function useQuestionBankActions(dispatch) {
  const handleFilterChange = useCallback(
    (changes) => dispatch(setQuestionBankFilters(changes)),
    [dispatch],
  );
  const handleReset = useCallback(() => {
    dispatch(resetQuestionBankFilters());
  }, [dispatch]);
  const handlePageChange = useCallback(
    (targetPage) => dispatch(fetchQuestionProbesRequest({ page: targetPage })),
    [dispatch],
  );
  return { handleFilterChange, handleReset, handlePageChange };
}

export default function PublicQuestionBankPage() {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const {
    probes,
    taxonomy,
    total,
    page,
    limit,
    filters,
    loading,
    error,
  } = useSelector((state) => state.questionBank);
  const appLocale = useQuestionBankLocale({ dispatch, filters, i18n });
  useQuestionBankFetch({ appLocale, dispatch, filters });
  const { handleFilterChange, handleReset, handlePageChange } =
    useQuestionBankActions(dispatch);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="dash-page-shell min-h-full text-text-base font-body">
      <main className="dash-page">
        <PageHeader page={page} totalPages={totalPages} total={total} />

        <QuestionBankFilters
          filters={filters}
          taxonomy={taxonomy}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        <ErrorBanner error={error} />
        <Results
          probes={probes}
          page={page}
          limit={limit}
          total={total}
          loading={loading}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
}
