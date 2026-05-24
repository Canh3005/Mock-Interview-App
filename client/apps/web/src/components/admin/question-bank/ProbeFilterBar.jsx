import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SelectField } from './QuestionBankFormFields';

const controlClass =
  'dash-control h-10 rounded-lg border border-slate-700/70 bg-slate-950/70 text-sm text-slate-200 outline-none transition-all duration-150 focus:border-cta focus:ring-2 focus:ring-cta/20';

export default function ProbeFilterBar({
  filters,
  taxonomy,
  onChange,
  onReset,
}) {
  const { t } = useTranslation();
  const safeTaxonomy = taxonomy ?? {};
  const _filterOptions = (options = []) => [{ key: '', label: t('adminQuestionBank.all') }, ...options];

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <label className="flex flex-col gap-1 text-xs text-slate-400 min-w-[220px] flex-1">
        {t('adminQuestionBank.search')}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className={`${controlClass} w-full pl-9 pr-3`}
          />
        </div>
      </label>

      <SelectField
        label={t('adminQuestionBank.status')}
        value={filters.status}
        options={_filterOptions(safeTaxonomy.statuses)}
        onChange={(status) => onChange({ status })}
        labelClassName="flex flex-col gap-1 text-xs text-slate-400 min-w-[150px]"
      />
      <SelectField
        label={t('adminQuestionBank.role')}
        value={filters.roleFamily}
        options={_filterOptions(safeTaxonomy.roleFamilies)}
        onChange={(roleFamily) => onChange({ roleFamily })}
        labelClassName="flex flex-col gap-1 text-xs text-slate-400 min-w-[150px]"
      />
      <SelectField
        label={t('adminQuestionBank.level')}
        value={filters.level}
        options={_filterOptions(safeTaxonomy.levels)}
        onChange={(level) => onChange({ level })}
        labelClassName="flex flex-col gap-1 text-xs text-slate-400 min-w-[150px]"
      />

      <button
        type="button"
        onClick={onReset}
        className="dash-control h-10 px-3 rounded-lg border border-slate-700/70 bg-slate-800/80 text-slate-300 transition-all duration-150 hover:text-white cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
