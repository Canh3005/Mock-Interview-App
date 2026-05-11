import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Minus, Plus, Search } from 'lucide-react';

const inputClass =
  'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-200 outline-none transition-all duration-150 hover:border-slate-500 focus:border-cta focus:ring-2 focus:ring-cta/20';

const selectButtonClass =
  'w-full cursor-pointer rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 pr-9 text-left text-sm text-slate-200 shadow-inner shadow-black/10 outline-none transition-all duration-150 hover:border-slate-500 focus:border-cta focus:ring-2 focus:ring-cta/20';

export function FormSection({ title, children }) {
  return (
    <section className="border border-slate-800 rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {children}
    </section>
  );
}

export function TextField({ label, value, onChange, type = 'text', min, max }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <input
        type={type}
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

export function NumberField({ label, value, onChange, min = 1, max }) {
  return (
    <TextField
      label={label}
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(nextValue) => onChange(Number(nextValue))}
    />
  );
}

export function TextAreaField({ label, value, onChange, rows = 3 }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <textarea
        rows={rows}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

export function SelectField({ label, value, options, onChange, labelClassName = 'flex flex-col gap-1 text-xs text-slate-400' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.key === (value ?? '')) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!open) return undefined;

    const _handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const _handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', _handlePointerDown);
    document.addEventListener('keydown', _handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', _handlePointerDown);
      document.removeEventListener('keydown', _handleKeyDown);
    };
  }, [open]);

  const _select = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={labelClassName}>
      <span>{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={selectButtonClass}
        >
          <span className="block truncate">{selectedOption?.label ?? ''}</span>
        </button>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="max-h-64 overflow-y-auto py-1">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => _select(option.key)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-100 ${
                    option.key === (value ?? '')
                      ? 'bg-cta/15 text-cta'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.key === (value ?? '') && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchableMultiSelectField({
  label,
  values,
  options,
  onChange,
  allLabel = 'All',
  searchPlaceholder = 'Search...',
  clearLabel = 'Clear selection',
  noOptionsLabel = 'No options',
  labelClassName = 'flex flex-col gap-1 text-xs text-slate-400',
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const rootRef = useRef(null);
  const selectedValues = values ?? [];
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.key)),
    [options, selectedSet],
  );
  const filteredOptions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      `${option.label} ${option.key}`.toLowerCase().includes(query),
    );
  }, [options, searchText]);
  const displayLabel = useMemo(() => {
    if (selectedOptions.length === 0) return allLabel;
    const visible = selectedOptions.slice(0, 2).map((option) => option.label);
    const remaining = selectedOptions.length - visible.length;
    return remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ');
  }, [allLabel, selectedOptions]);

  useEffect(() => {
    if (!open) return undefined;

    const _handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const _handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', _handlePointerDown);
    document.addEventListener('keydown', _handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', _handlePointerDown);
      document.removeEventListener('keydown', _handleKeyDown);
    };
  }, [open]);

  const _toggle = (key) => {
    onChange(
      selectedSet.has(key)
        ? selectedValues.filter((item) => item !== key)
        : [...selectedValues, key],
    );
  };

  const _clear = () => {
    onChange([]);
    setSearchText('');
  };

  return (
    <div ref={rootRef} className={labelClassName}>
      <span>{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={selectButtonClass}
        >
          <span className="block truncate">{displayLabel}</span>
        </button>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40">
            <div className="border-b border-slate-800 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={searchPlaceholder}
                  className={`${inputClass} h-9 pl-9`}
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm text-slate-200 transition-colors duration-100 hover:bg-slate-800 hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(option.key)}
                    onChange={() => _toggle(option.key)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cta"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selectedSet.has(option.key) && <Check className="h-4 w-4 shrink-0 text-cta" />}
                </label>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-3 text-sm text-slate-500">{noOptionsLabel}</div>
              )}
            </div>
            {selectedValues.length > 0 && (
              <div className="border-t border-slate-800 p-2">
                <button
                  type="button"
                  onClick={_clear}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 transition-colors duration-100 hover:bg-slate-800 hover:text-white"
                >
                  {clearLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MultiCheckboxField({ label, values, options, onChange }) {
  const selected = values ?? [];
  const _toggle = (key) => {
    onChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };
  return (
    <div className="flex flex-col gap-2 text-xs text-slate-400">
      <span>{label}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {options.map((option) => (
          <label key={option.key} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200">
            <input type="checkbox" checked={selected.includes(option.key)} onChange={() => _toggle(option.key)} />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function LineListField({ label, values, onChange, rows = 4 }) {
  return (
    <TextAreaField
      label={label}
      rows={rows}
      value={(values ?? []).join('\n')}
      onChange={(value) => onChange(value.split('\n'))}
    />
  );
}

export function AddButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm text-cta hover:text-cta/80 cursor-pointer">
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

export function RemoveButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-xs text-red-300 hover:text-red-200 cursor-pointer">
      <Minus className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export function ValidationSummary({ issues }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
      <ul className="list-disc pl-5 space-y-1">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}
