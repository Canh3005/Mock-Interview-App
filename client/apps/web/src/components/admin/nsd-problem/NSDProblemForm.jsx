import { useTranslation } from 'react-i18next';

const PHASE_FIELDS = ['phase1Data', 'phase2Data', 'phase3Data', 'phase4Data', 'phase5Data'];

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-cta focus:outline-none';
const textareaCls = `${inputCls} min-h-[140px] resize-y font-mono text-xs`;

export default function NSDProblemForm({ form, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label={t('adminSdProblems.form.title')}>
          <input className={inputCls} value={form.title} onChange={(event) => onChange('title', event.target.value)} placeholder="URL Shortener" />
        </FieldRow>
        <FieldRow label={t('adminSdProblems.form.domain')}>
          <input className={inputCls} value={form.domain} onChange={(event) => onChange('domain', event.target.value)} placeholder="url-shortener" />
        </FieldRow>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FieldRow label={t('adminSdProblems.form.targetLevel')}>
          <select className={inputCls} value={form.targetLevel} onChange={(event) => onChange('targetLevel', event.target.value)}>
            <option value="mid">{t('adminSdProblems.level.mid')}</option>
            <option value="senior">{t('adminSdProblems.level.senior')}</option>
            <option value="staff">{t('adminSdProblems.level.staff')}</option>
          </select>
        </FieldRow>
        <FieldRow label={t('adminSdProblems.form.duration')}>
          <input
            className={inputCls}
            type="number"
            min="1"
            value={form.estimatedDurationMinutes}
            onChange={(event) => onChange('estimatedDurationMinutes', parseInt(event.target.value, 10) || 0)}
          />
        </FieldRow>
        <FieldRow label="Active">
          <select className={inputCls} value={form.isActive ? 'true' : 'false'} onChange={(event) => onChange('isActive', event.target.value === 'true')}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </FieldRow>
      </div>

      <FieldRow label={t('adminSdProblems.form.tags')}>
        <input className={inputCls} value={form.tags} onChange={(event) => onChange('tags', event.target.value)} placeholder="scalability, caching" />
      </FieldRow>

      {PHASE_FIELDS.map((field, index) => (
        <FieldRow key={field} label={`Phase ${index + 1} JSON`}>
          <textarea
            className={textareaCls}
            value={form[field]}
            onChange={(event) => onChange(field, event.target.value)}
            placeholder={`{\n  "..." : "phase ${index + 1} data"\n}`}
          />
        </FieldRow>
      ))}
    </div>
  );
}
