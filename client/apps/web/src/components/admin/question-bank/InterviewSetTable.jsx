import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
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

function ActionButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-2 text-slate-400 hover:text-cta hover:bg-cta/15 rounded-lg transition-colors cursor-pointer"
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
      <span>{t('adminQuestionBank.setPageSummary', { page, totalPages, total })}</span>
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

function InterviewSetRow({ interviewSet, onEdit, onTransition }) {
  const { t } = useTranslation();
  return (
    <tr className="hover:bg-slate-800/80 transition-colors">
      <td className="px-5 py-4">
        <div className="font-medium text-white">{interviewSet.title}</div>
        <div className="text-xs text-slate-500 mt-1">{interviewSet.code || interviewSet.id}</div>
      </td>
      <td className="px-5 py-4 text-xs text-slate-400">
        <div>{interviewSet.roleFamily}</div>
        <div>{interviewSet.level}</div>
        <div>{interviewSet.durationMinutes} {t('adminQuestionBank.minutesShort')}</div>
      </td>
      <td className="px-5 py-4 text-xs text-slate-400">
        <div>{(interviewSet.stages ?? []).join(', ')}</div>
        <div>{(interviewSet.competencies ?? []).slice(0, 2).join(', ')}</div>
        <div>{t('adminQuestionBank.questionCount')}: {interviewSet.questionCount}</div>
      </td>
      <td className="px-5 py-4">
        <span
          className={[
            'inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border',
            STATUS_CLASS[interviewSet.status] ?? STATUS_CLASS.draft,
          ].join(' ')}
        >
          {interviewSet.status}
        </span>
      </td>
      <td className="px-5 py-4 text-slate-400">{interviewSet.revision}</td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <ActionButton title={t('adminQuestionBank.edit')} onClick={() => onEdit(interviewSet)}>
            <Edit2 className="w-4 h-4" />
          </ActionButton>
          {(interviewSet.status === 'draft' || interviewSet.status === 'in_review') && (
            <ActionButton
              title={t('adminQuestionBank.publishSet')}
              onClick={() => onTransition(interviewSet, 'publish')}
            >
              <CheckCircle2 className="w-4 h-4" />
            </ActionButton>
          )}
          {interviewSet.status === 'active' && (
            <ActionButton
              title={t('adminQuestionBank.retireSet')}
              onClick={() => onTransition(interviewSet, 'retire', true)}
            >
              <XCircle className="w-4 h-4" />
            </ActionButton>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function InterviewSetTable({
  interviewSets,
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
            <th className="px-5 py-4 font-semibold text-slate-400">
              {t('adminQuestionBank.interviewSet')}
            </th>
            <th className="px-5 py-4 font-semibold text-slate-400">
              {t('adminQuestionBank.targeting')}
            </th>
            <th className="px-5 py-4 font-semibold text-slate-400">
              {t('adminQuestionBank.coverage')}
            </th>
            <th className="px-5 py-4 font-semibold text-slate-400">
              {t('adminQuestionBank.status')}
            </th>
            <th className="px-5 py-4 font-semibold text-slate-400">
              {t('adminQuestionBank.revision')}
            </th>
            <th className="px-5 py-4 font-semibold text-slate-400 text-right">
              {t('adminQuestionBank.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {interviewSets.map((interviewSet) => (
            <InterviewSetRow
              key={interviewSet.id}
              interviewSet={interviewSet}
              onEdit={onEdit}
              onTransition={onTransition}
            />
          ))}
          {interviewSets.length === 0 && !loading && (
            <tr>
              <td colSpan="6" className="text-center py-10 text-slate-500 italic">
                {t('adminQuestionBank.emptySets')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <PaginationBar page={page} total={total} limit={limit} onPageChange={onPageChange} />
    </div>
  );
}
