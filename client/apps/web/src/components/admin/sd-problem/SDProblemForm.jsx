import { useTranslation } from 'react-i18next';

const ROLES = ['backend', 'full-stack', 'data-eng'];

function FieldRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cta';
const textareaCls = `${inputCls} resize-y min-h-[80px] font-mono text-xs`;

export default function SDProblemForm({ form, onChange }) {
  const { t } = useTranslation();

  const _toggle = (role) => {
    const next = form.targetRole.includes(role)
      ? form.targetRole.filter((r) => r !== role)
      : [...form.targetRole, role];
    onChange('targetRole', next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label={t('adminSdProblems.form.title')}>
          <input className={inputCls} value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="URL Shortener" />
        </FieldRow>
        <FieldRow label={t('adminSdProblems.form.domain')}>
          <input className={inputCls} value={form.domain} onChange={(e) => onChange('domain', e.target.value)} placeholder="url-shortener" />
        </FieldRow>
      </div>

      <FieldRow label={t('adminSdProblems.form.context')}>
        <textarea
          className={textareaCls}
          style={{ minHeight: 80 }}
          value={form.context}
          onChange={(e) => onChange('context', e.target.value)}
          placeholder={t('adminSdProblems.form.contextPlaceholder')}
        />
      </FieldRow>

      <FieldRow label={t('adminSdProblems.form.targetRole')}>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => _toggle(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${form.targetRole.includes(r) ? 'bg-cta/15 border-cta/40 text-cta' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              {r}
            </button>
          ))}
        </div>
      </FieldRow>

      <div className="grid grid-cols-3 gap-4">
        <FieldRow label={t('adminSdProblems.form.targetLevel')}>
          <select className={inputCls} value={form.targetLevel} onChange={(e) => onChange('targetLevel', e.target.value)}>
            <option value="mid">{t('adminSdProblems.level.mid')}</option>
            <option value="senior">{t('adminSdProblems.level.senior')}</option>
            <option value="staff">{t('adminSdProblems.level.staff')}</option>
          </select>
        </FieldRow>
        <FieldRow label={t('adminSdProblems.form.difficulty')}>
          <select className={inputCls} value={form.difficulty} onChange={(e) => onChange('difficulty', e.target.value)}>
            <option value="medium">{t('adminSdProblems.difficulty.medium')}</option>
            <option value="hard">{t('adminSdProblems.difficulty.hard')}</option>
          </select>
        </FieldRow>
        <FieldRow label={t('adminSdProblems.form.duration')}>
          <input className={inputCls} type="number" value={form.estimatedDuration} onChange={(e) => onChange('estimatedDuration', parseInt(e.target.value, 10) || 0)} />
        </FieldRow>
      </div>

      <FieldRow label={t('adminSdProblems.form.expectedComponents')}>
        <input className={inputCls} value={form.expectedComponents} onChange={(e) => onChange('expectedComponents', e.target.value)} placeholder="API Gateway, Cache, DB" />
      </FieldRow>

      <FieldRow label={t('adminSdProblems.form.tags')}>
        <input className={inputCls} value={form.tags} onChange={(e) => onChange('tags', e.target.value)} placeholder="scalability, caching" />
      </FieldRow>

      <FieldRow label={t('adminSdProblems.form.scalingConstraints')}>
        <textarea className={textareaCls} value={form.scalingConstraints} onChange={(e) => onChange('scalingConstraints', e.target.value)}
          placeholder={'{\n  "peakQPS": 10000,\n  "dau": 1000000\n}'} />
      </FieldRow>

      <FieldRow label={t('adminSdProblems.form.referenceArchitecture')}>
        <textarea className={textareaCls} value={form.referenceArchitecture} onChange={(e) => onChange('referenceArchitecture', e.target.value)}
          placeholder={'{\n  "nodes": [],\n  "edges": []\n}'} />
      </FieldRow>

      <FieldRow label={t('adminSdProblems.form.curveballScenarios')}>
        <textarea className={textareaCls} style={{ minHeight: 100 }} value={form.curveBallScenarios} onChange={(e) => onChange('curveBallScenarios', e.target.value)}
          placeholder={'[\n  {\n    "trigger": "...",\n    "prompt": "...",\n    "expectedAdaptation": "..."\n  }\n]'} />
      </FieldRow>
    </div>
  );
}
