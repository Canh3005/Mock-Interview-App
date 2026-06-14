import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NSDProblemForm from './NSDProblemForm';

const PHASE_FIELDS = ['phase1Data', 'phase2Data', 'phase3Data', 'phase4Data', 'phase5Data'];

const EMPTY = {
  title: '',
  domain: '',
  targetLevel: 'mid',
  estimatedDurationMinutes: 45,
  tags: '',
  isActive: true,
  phase1Data: '',
  phase2Data: '',
  phase3Data: '',
  phase4Data: '',
  phase5Data: '',
};

function parseJsonField(value) {
  if (!value || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toJsonText(value) {
  return value ? JSON.stringify(value, null, 2) : '';
}

function toFormState(problem) {
  if (!problem) return EMPTY;
  return {
    title: problem.title ?? '',
    domain: problem.domain ?? '',
    targetLevel: problem.targetLevel ?? 'mid',
    estimatedDurationMinutes: problem.estimatedDurationMinutes ?? 45,
    tags: (problem.tags ?? []).join(', '),
    isActive: problem.isActive ?? true,
    phase1Data: toJsonText(problem.phase1Data),
    phase2Data: toJsonText(problem.phase2Data),
    phase3Data: toJsonText(problem.phase3Data),
    phase4Data: toJsonText(problem.phase4Data),
    phase5Data: toJsonText(problem.phase5Data),
  };
}

export default function NSDProblemModal({ problem, saving, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(problem));
  const [jsonError, setJsonError] = useState(null);

  useEffect(() => {
    setForm(toFormState(problem));
    setJsonError(null);
  }, [problem]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const phaseData = {};
    for (const field of PHASE_FIELDS) {
      const parsed = parseJsonField(form[field]);
      if (parsed === undefined) {
        setJsonError(`${field} is not valid JSON`);
        return;
      }
      phaseData[field] = parsed;
    }
    setJsonError(null);
    onSave({
      title: form.title,
      domain: form.domain,
      targetLevel: form.targetLevel,
      estimatedDurationMinutes: form.estimatedDurationMinutes,
      tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      isActive: form.isActive,
      ...phaseData,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-white">
            {problem ? t('adminSdProblems.editModalTitle') : t('adminSdProblems.createModalTitle')}
          </h3>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {jsonError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {jsonError}
              </div>
            )}
            <NSDProblemForm form={form} onChange={handleChange} />
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-700/60 p-6">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
              {t('adminSdProblems.cancel')}
            </button>
            <button type="submit" disabled={saving || !form.title || !form.domain} className="flex cursor-pointer items-center gap-2 rounded-xl bg-cta px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-cta/90 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('adminSdProblems.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
