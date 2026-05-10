import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function QuestionBankPagination({
  page,
  limit,
  total,
  loading,
  onPageChange,
}) {
  const { t } = useTranslation();
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasPrev = page > 1;
  const hasNext = end < total;

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
      <span className="text-xs text-slate-500">
        {t('questionBank.pagination.summary', { start, end, total })}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrev || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t('questionBank.pagination.previous')}
        </button>
        <span className="min-w-9 text-center text-xs text-slate-400 tabular-nums">
          {page}
        </span>
        <button
          type="button"
          disabled={!hasNext || loading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('questionBank.pagination.next')}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
