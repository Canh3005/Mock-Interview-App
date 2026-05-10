import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpenCheck, Loader2, SearchX } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import SharedNavbar from '../shared/SharedNavbar';
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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/15 border border-cta/30 text-cta">
            <BookOpenCheck size={16} />
          </span>
          <h1 className="font-heading text-2xl font-bold text-white leading-tight">
            {t('questionBank.title')}
          </h1>
        </div>
        <p className="text-sm text-slate-400">{t('questionBank.subtitle')}</p>
      </div>
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-right">
        <p className="text-xs text-slate-500">
          {t('questionBank.pageCount', { page, totalPages })}
        </p>
        <p className="text-lg font-semibold text-white">
          {t('questionBank.resultCount', { count: total })}
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      {error}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 py-20 text-center">
      <SearchX className="w-10 h-10 text-slate-700" />
      <h2 className="text-base font-semibold text-slate-300">
        {t('questionBank.emptyTitle')}
      </h2>
      <p className="max-w-md text-sm text-slate-500">
        {t('questionBank.emptyBody')}
      </p>
    </div>
  );
}

function Results({ probes, page, limit, total, loading, onPageChange }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
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

function useDarkMode() {
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);
  return [darkMode, setDarkMode];
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
  const [darkMode, setDarkMode] = useDarkMode();
  const {
    probes,
    taxonomy,
    total,
    page,
    limit,
    filters,
    loading,
    taxonomyLoading,
    error,
  } = useSelector((state) => state.questionBank);
  const appLocale = useQuestionBankLocale({ dispatch, filters, i18n });
  useQuestionBankFetch({ appLocale, dispatch, filters });
  const { handleFilterChange, handleReset, handlePageChange } =
    useQuestionBankActions(dispatch);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300">
        <SharedNavbar
          page="dashboard"
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((value) => !value)}
        />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          <PageHeader page={page} totalPages={totalPages} total={total} />

          <QuestionBankFilters
            filters={filters}
            taxonomy={taxonomy}
            loading={loading || taxonomyLoading}
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
    </div>
  );
}
