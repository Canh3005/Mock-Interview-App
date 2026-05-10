import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  RotateCcw,
  Send,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATUS_CLASS = {
  draft: 'bg-slate-500/10 border-slate-500/20 text-slate-300',
  in_review: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
  active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  needs_revision: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  retired: 'bg-red-500/10 border-red-500/20 text-red-300',
};

const EDITABLE_STATUSES = new Set(['draft', 'in_review', 'needs_revision']);

function ActionButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 text-slate-400 hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function PaginationBar({ page, total, limit, onPageChange }) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / limit) || 1;
  return (
    <div className="p-4 border-t border-slate-700/60 flex items-center justify-between text-sm text-slate-400">
      <span>{t('adminQuestionBank.pageSummary', { page, totalPages, total })}</span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer hover:bg-slate-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function ProbeTable({
  probes,
  loading,
  page,
  total,
  limit,
  onPageChange,
  onEdit,
  onTransition,
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-x-auto relative min-h-[360px] flex flex-col">
      {loading && (
        <div className="absolute inset-0 z-10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin w-8 h-8 text-cta" />
        </div>
      )}
      <table className="w-full text-left text-sm min-w-[920px] flex-1">
        <thead className="bg-slate-900/30 border-b border-slate-700/60">
          <tr>
            <th className="px-4 py-2.5 font-semibold text-slate-400">
              {t('adminQuestionBank.probe')}
            </th>
            <th className="px-4 py-2.5 font-semibold text-slate-400">
              {t('adminQuestionBank.targeting')}
            </th>
            <th className="px-4 py-2.5 font-semibold text-slate-400">
              {t('adminQuestionBank.status')}
            </th>
            <th className="px-4 py-2.5 font-semibold text-slate-400">
              {t('adminQuestionBank.revision')}
            </th>
            <th className="px-4 py-2.5 font-semibold text-slate-400 text-right">
              {t('adminQuestionBank.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {probes.map((probe) => (
            <tr key={probe.id} className="hover:bg-slate-800/80 transition-colors">
              <td className="px-4 py-2.5">
                <div className="max-w-[360px] truncate font-medium leading-5 text-white">
                  {probe.localizedContent?.vi?.title || probe.code || probe.id}
                </div>
                <div className="max-w-[360px] truncate text-[11px] leading-4 text-slate-500">
                  {probe.code || probe.id}
                </div>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-400">
                <div className="max-w-[320px] truncate leading-5">
                  {(probe.roleFamilies ?? []).join(', ')}
                  {(probe.levels ?? []).length ? ` / ${(probe.levels ?? []).join(', ')}` : ''}
                </div>
                <div className="max-w-[320px] truncate text-[11px] leading-4 text-slate-500">
                  {(probe.competencies ?? []).slice(0, 3).join(', ')}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={[
                    'inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                    STATUS_CLASS[probe.status] ?? STATUS_CLASS.draft,
                  ].join(' ')}
                >
                  {probe.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-400">{probe.revision}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  {EDITABLE_STATUSES.has(probe.status) && (
                    <ActionButton title={t('adminQuestionBank.edit')} onClick={() => onEdit(probe)}>
                      <Edit2 className="w-4 h-4" />
                    </ActionButton>
                  )}
                  {(probe.status === 'draft' || probe.status === 'needs_revision') && (
                    <ActionButton
                      title={t('adminQuestionBank.submitReview')}
                      onClick={() => onTransition(probe, 'submit-review')}
                    >
                      <Send className="w-4 h-4" />
                    </ActionButton>
                  )}
                  {probe.status === 'needs_revision' && (
                    <ActionButton
                      title={t('adminQuestionBank.reopenDraft')}
                      onClick={() => onTransition(probe, 'reopen-draft')}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </ActionButton>
                  )}
                  {probe.status === 'in_review' && (
                    <ActionButton
                      title={t('adminQuestionBank.publish')}
                      onClick={() => onTransition(probe, 'publish')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </ActionButton>
                  )}
                  {(probe.status === 'in_review' || probe.status === 'active') && (
                    <ActionButton
                      title={t('adminQuestionBank.needsRevision')}
                      onClick={() => onTransition(probe, 'needs-revision', true)}
                    >
                      <Wrench className="w-4 h-4" />
                    </ActionButton>
                  )}
                  {(probe.status === 'active' || probe.status === 'needs_revision') && (
                    <ActionButton
                      title={t('adminQuestionBank.retire')}
                      onClick={() => onTransition(probe, 'retire', true)}
                    >
                      <XCircle className="w-4 h-4" />
                    </ActionButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {probes.length === 0 && !loading && (
            <tr>
              <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                {t('adminQuestionBank.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <PaginationBar page={page} total={total} limit={limit} onPageChange={onPageChange} />
    </div>
  );
}
