import { AlertTriangle, BookOpen, CheckCircle, Info } from 'lucide-react';

const STATUS_BADGE = {
  ready: { label: 'Calibration ready', icon: CheckCircle, color: 'text-green-400 border-green-800' },
  partial: { label: 'Partial calibration', icon: Info, color: 'text-yellow-400 border-yellow-800' },
  failed: { label: 'Calibration failed', icon: AlertTriangle, color: 'text-red-400 border-red-800' },
  not_started: { label: 'Not started', icon: Info, color: 'text-slate-400 border-slate-700' },
};

const STRICTNESS_LABEL = {
  standard: 'Standard',
  strict: 'Strict',
  very_strict: 'Very strict',
};

function StatusBadge({ status }) {
  const config = STATUS_BADGE[status] ?? STATUS_BADGE.not_started;
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${config.color}`}>
      <Icon size={11} />
      {config.label}
    </span>
  );
}

export default function BehaviorCalibrationSummary({ summary, status, missingSources, levelMismatch }) {
  if (!summary && status === 'not_started') {
    return (
      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
        <p className="text-xs text-slate-400">
          Upload both CV and JD to generate behavior interview focus areas.
        </p>
      </div>
    );
  }

  const focusAreas = summary?.userFacingSummary?.focusAreas ?? [];
  const evidenceToPrep = summary?.userFacingSummary?.evidenceToPrep ?? [];
  const missingDataWarning = summary?.userFacingSummary?.missingDataWarning;
  const levelMismatchWarning = summary?.userFacingSummary?.levelMismatchWarning;
  const competencies = summary?.priorityCompetencies ?? [];

  return (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <BookOpen size={14} />
          Behavior interview focus
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={status ?? 'not_started'} />
          {summary?.evidenceStrictness && (
            <span className="text-[11px] px-2 py-0.5 rounded border border-slate-700 text-slate-400">
              Evidence: {STRICTNESS_LABEL[summary.evidenceStrictness] ?? summary.evidenceStrictness}
            </span>
          )}
        </div>
      </div>

      {(levelMismatch || levelMismatchWarning) && (
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-900/20 border border-yellow-800/50">
          <AlertTriangle size={13} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-300">
            {levelMismatchWarning ?? 'Your experience level may not match JD requirements.'}
          </p>
        </div>
      )}

      {missingDataWarning && (
        <div className="flex items-start gap-2 p-2 rounded bg-slate-800/60 border border-slate-700">
          <Info size={13} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400">{missingDataWarning}</p>
        </div>
      )}

      {missingSources?.includes('jd_context') && !missingDataWarning && (
        <p className="text-xs text-slate-500">
          JD uploaded — add CV to get full calibration with evidence requirements.
        </p>
      )}

      {missingSources?.includes('cv_context') && !missingDataWarning && (
        <p className="text-xs text-slate-500">
          CV uploaded — add JD to calibrate behavior focus for this role.
        </p>
      )}

      {competencies.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-1.5">Focus competencies</p>
          <div className="flex flex-wrap gap-1.5">
            {competencies.map((comp) => (
              <span
                key={comp}
                className="text-[11px] px-2 py-0.5 rounded-full bg-cta/10 text-cta border border-cta/30"
              >
                {comp.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {focusAreas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-1">What to prepare</p>
          <ul className="list-disc pl-4 space-y-1">
            {focusAreas.map((area, i) => (
              <li key={i} className="text-xs text-slate-400">{area}</li>
            ))}
          </ul>
        </div>
      )}

      {evidenceToPrep.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-1">Evidence to prepare</p>
          <ul className="list-disc pl-4 space-y-1">
            {evidenceToPrep.map((item, i) => (
              <li key={i} className="text-xs text-slate-400">{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Trong buổi phỏng vấn behavior, nên chuẩn bị evidence về các mục trên. Đây là gợi ý luyện tập, không phải kết luận tuyển dụng.
      </p>
    </div>
  );
}
