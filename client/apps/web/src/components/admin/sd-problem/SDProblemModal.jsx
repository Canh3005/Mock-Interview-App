import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import SDProblemForm from './SDProblemForm';

const EMPTY = {
  title: '', domain: '', targetRole: [], targetLevel: 'mid', difficulty: 'medium',
  estimatedDuration: 45, expectedComponents: '', tags: '',
  scalingConstraints: '', referenceArchitecture: '', curveBallScenarios: '',
};

function _parseJsonField(value) {
  if (!value || !value.trim()) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function _toFormState(problem) {
  if (!problem) return EMPTY;
  return {
    title: problem.title ?? '',
    domain: problem.domain ?? '',
    targetRole: problem.targetRole ?? [],
    targetLevel: problem.targetLevel ?? 'mid',
    difficulty: problem.difficulty ?? 'medium',
    estimatedDuration: problem.estimatedDuration ?? 45,
    expectedComponents: (problem.expectedComponents ?? []).join(', '),
    tags: (problem.tags ?? []).join(', '),
    scalingConstraints: problem.scalingConstraints ? JSON.stringify(problem.scalingConstraints, null, 2) : '',
    referenceArchitecture: problem.referenceArchitecture ? JSON.stringify(problem.referenceArchitecture, null, 2) : '',
    curveBallScenarios: problem.curveBallScenarios?.length ? JSON.stringify(problem.curveBallScenarios, null, 2) : '',
  };
}

export default function SDProblemModal({ problem, saving, onSave, onClose }) {
  const [form, setForm] = useState(() => _toFormState(problem));

  useEffect(() => { setForm(_toFormState(problem)); }, [problem]);

  const _handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const _handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title: form.title,
      domain: form.domain,
      targetRole: form.targetRole,
      targetLevel: form.targetLevel,
      difficulty: form.difficulty,
      estimatedDuration: form.estimatedDuration,
      expectedComponents: form.expectedComponents.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      scalingConstraints: _parseJsonField(form.scalingConstraints),
      referenceArchitecture: _parseJsonField(form.referenceArchitecture),
      curveBallScenarios: _parseJsonField(form.curveBallScenarios) ?? [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/60 shrink-0">
          <h3 className="text-lg font-heading font-semibold text-white">
            {problem ? 'Chỉnh sửa Problem' : 'Tạo Problem mới'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={_handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <SDProblemForm form={form} onChange={_handleChange} />
          </div>

          <div className="p-6 border-t border-slate-700/60 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-sm">
              Hủy
            </button>
            <button type="submit" disabled={saving || !form.title} className="px-5 py-2 rounded-xl bg-cta hover:bg-cta/90 text-black font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
