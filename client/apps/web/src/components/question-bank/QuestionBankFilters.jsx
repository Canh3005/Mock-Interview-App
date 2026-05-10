import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SelectField } from '../admin/question-bank/QuestionBankFormFields';

const controlClass =
  'h-10 rounded-lg border border-slate-700/70 bg-slate-950/70 text-sm text-slate-200 shadow-inner shadow-black/10 outline-none transition-all duration-150 hover:border-slate-500/80 hover:bg-slate-900 focus:border-cta focus:ring-2 focus:ring-cta/20';

const SEARCH_DEBOUNCE_MS = 400;

const taxonomyControls = [
  ['roleFamily', 'role', 'roleFamilies'],
  ['level', 'level', 'levels'],
  ['type', 'type', 'types'],
  ['competency', 'competency', 'competencies'],
  ['language', 'language', 'languages'],
];

function _label({ t, group, option }) {
  if (!option?.key) return '';
  return t(`questionBank.taxonomy.${group}.${option.key}`, {
    defaultValue: option.label ?? option.key,
  });
}

function _options({ t, group, options = [], allLabel }) {
  return [
    { key: '', label: allLabel },
    ...options.map((option) => ({
      key: option.key,
      label: _label({ t, group, option }),
    })),
  ];
}

function _techTagOptions(taxonomy) {
  return (taxonomy?.techTagGroups ?? []).flatMap((group) =>
    group.tags.map((tag) => ({ key: tag, label: tag })),
  );
}

function SearchControl({ value, onChange, placeholder, label }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400 min-w-[240px] flex-[2]">
      {label}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${controlClass} w-full pl-9 pr-3`}
        />
      </div>
    </label>
  );
}

function FilterSelects({ filters, taxonomy, techTagOptions, allLabel, onChange }) {
  const { t } = useTranslation();
  const controls = taxonomyControls.map(([filterKey, labelKey, group]) => ({
    key: filterKey,
    label: t(`questionBank.filters.${labelKey}`),
    value: filters[filterKey],
    options: _options({ t, group, options: taxonomy?.[group], allLabel }),
  }));
  const extraControls = [
    {
      key: 'techTag',
      label: t('questionBank.filters.techTag'),
      value: filters.techTag,
      options: techTagOptions,
    },
    {
      key: 'difficulty',
      label: t('questionBank.filters.difficulty'),
      value: filters.difficulty,
      options: [
        { key: '', label: allLabel },
        ...[1, 2, 3, 4, 5].map((level) => ({
          key: String(level),
          label: t(`questionBank.difficulty.${level}`),
        })),
      ],
    },
    {
      key: 'sort',
      label: t('questionBank.filters.sort'),
      value: filters.sort,
      options: [
        { key: 'newest', label: t('questionBank.sort.newest') },
        { key: 'popular', label: t('questionBank.sort.popular') },
      ],
    },
  ];

  return [...controls, ...extraControls].map((control) => (
    <SelectField
      key={control.key}
      label={control.label}
      value={control.value}
      options={control.options}
      onChange={(value) => onChange({ [control.key]: value })}
      labelClassName="flex flex-col gap-1 text-xs text-slate-400 min-w-[150px] flex-1"
    />
  ));
}

export default function QuestionBankFilters({
  filters,
  taxonomy,
  onChange,
  onReset,
}) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(filters.search);
  const lastAppliedSearchRef = useRef(filters.search);
  const allLabel = t('questionBank.filters.all');
  const techTagOptions = useMemo(
    () => [{ key: '', label: allLabel }, ..._techTagOptions(taxonomy)],
    [taxonomy, allLabel],
  );

  useEffect(() => {
    if (filters.search === lastAppliedSearchRef.current) return;
    lastAppliedSearchRef.current = filters.search;
    setSearchInput(filters.search);
  }, [filters.search]);

  const _applySearch = useCallback(
    (value) => {
      const nextSearch = value.trim();
      if (nextSearch === filters.search) return;
      lastAppliedSearchRef.current = nextSearch;
      onChange({ search: nextSearch });
    },
    [filters.search, onChange],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      _applySearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [_applySearch, searchInput]);

  const _handleSubmit = (event) => {
    event.preventDefault();
    _applySearch(searchInput);
  };

  return (
    <form onSubmit={_handleSubmit} className="border border-slate-700/60 bg-slate-900/50 rounded-lg p-4 flex flex-wrap gap-3 items-end">
      <SearchControl
        value={searchInput}
        onChange={setSearchInput}
        label={t('questionBank.filters.search')}
        placeholder={t('questionBank.filters.searchPlaceholder')}
      />
      <FilterSelects
        filters={filters}
        taxonomy={taxonomy}
        techTagOptions={techTagOptions}
        allLabel={allLabel}
        onChange={onChange}
      />
      <button type="button" onClick={onReset} className="h-10 px-3 rounded-lg border border-slate-700/70 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white" aria-label={t('questionBank.filters.reset')}>
        <RotateCcw className="w-4 h-4" />
      </button>
    </form>
  );
}
