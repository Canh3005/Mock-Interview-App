import { ChevronLeft, ChevronRight, Edit2, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LEVEL_COLORS = {
  mid: 'bg-sky-500/10 border-sky-500/20 text-sky-500',
  senior: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  staff: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
};

function PaginationBar({ page, total, limit, onPageChange }) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="dash-border flex items-center justify-between border-t p-4 text-sm dash-subtle">
      <span>{t('adminSdProblems.pagination', { page, totalPages, total })}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="dash-icon-button disabled:opacity-40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="dash-icon-button disabled:opacity-40">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function NSDProblemList({ problems, loading, page, total, limit, onPageChange, onCreateNew, onEdit, onDelete }) {
  const { t } = useTranslation();

  return (
    <main className="dash-page animate-in fade-in font-body duration-500">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{t('adminSdProblems.title')}</h1>
          <p className="dash-page-description">{t('adminSdProblems.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="dash-primary-button flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all"
        >
          <Plus className="h-5 w-5" />
          {t('adminSdProblems.create')}
        </button>
      </header>

      <div className="dash-card relative flex min-h-[300px] flex-col overflow-x-auto rounded-xl">
        {loading && (
          <div className="dash-muted-panel absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-cta" />
          </div>
        )}
        <table className="min-w-[600px] flex-1 text-left text-sm">
          <thead className="dash-muted-panel dash-border border-b">
            <tr>
              <th className="px-6 py-4 font-semibold dash-subtle">{t('adminSdProblems.columns.title')}</th>
              <th className="px-6 py-4 font-semibold dash-subtle">{t('adminSdProblems.columns.domain')}</th>
              <th className="px-6 py-4 font-semibold dash-subtle">{t('adminSdProblems.columns.level')}</th>
              <th className="px-6 py-4 font-semibold dash-subtle">Active</th>
              <th className="px-6 py-4 text-right font-semibold dash-subtle">{t('adminSdProblems.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="dash-border divide-y">
            {problems.map((problem) => (
              <tr key={problem.id} className="group transition-colors hover:bg-[var(--dash-surface-muted)]">
                <td className="px-6 py-4 font-medium dash-text">{problem.title}</td>
                <td className="px-6 py-4 font-mono text-xs dash-subtle">{problem.domain}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${LEVEL_COLORS[problem.targetLevel] ?? ''}`}>
                    {problem.targetLevel}
                  </span>
                </td>
                <td className="px-6 py-4 dash-subtle">{problem.isActive ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => onEdit(problem)} className="cursor-pointer rounded-lg p-2 dash-subtle transition-colors hover:bg-cta/15 hover:text-cta">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onDelete(problem.id)} className="cursor-pointer rounded-lg p-2 dash-subtle transition-colors hover:bg-red-500/15 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {problems.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="py-8 text-center italic dash-subtle">{t('adminSdProblems.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
        <PaginationBar page={page} total={total} limit={limit} onPageChange={onPageChange} />
      </div>
    </main>
  );
}
