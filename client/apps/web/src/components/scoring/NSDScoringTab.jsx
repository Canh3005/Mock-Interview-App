import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { triggerEvaluation } from '../../store/slices/nsdEvaluatorSlice';

const GRADE_META = {
  good: { label: 'Good', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  pass: { label: 'Pass', className: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  needs_improvement: { label: 'Needs improvement', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  poor: { label: 'Poor', className: 'border-red-500/30 bg-red-500/10 text-red-300' },
};

function gradeMeta(grade) {
  return GRADE_META[grade] ?? { label: grade ?? 'Unavailable', className: 'border-slate-600 bg-slate-800 text-slate-300' };
}

export default function NSDScoringTab({ session }) {
  const dispatch = useDispatch();
  const { status, result, error } = useSelector((state) => state.nsdEvaluator);
  const evaluation = result ?? session?.evaluationResult ?? null;
  const meta = gradeMeta(evaluation?.overallGrade);
  const phaseSummaries = evaluation?.tier2_phases ?? [];
  const gaps = evaluation?.tier3_skill_gaps?.gaps ?? [];

  if (!session) {
    return (
      <div className="dash-card mx-auto max-w-3xl rounded-[20px] p-6 text-center">
        <p className="dash-subtle text-sm">No system design session found.</p>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="dash-card mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-[20px] p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cta" />
        <p className="dash-text text-sm font-semibold">Evaluating system design session...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="dash-card mx-auto max-w-3xl rounded-[20px] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <h2 className="dash-text text-base font-bold">Evaluation unavailable</h2>
            <p className="dash-subtle mt-1 text-sm">
              The NSD session has not produced an evaluation result yet.
            </p>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            <button
              type="button"
              onClick={() => dispatch(triggerEvaluation(session.id))}
              className="dash-primary-button mt-4 inline-flex h-10 items-center rounded-[12px] px-4 text-sm font-bold"
            >
              Run evaluation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="dash-card rounded-[20px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">System Design</p>
            <h2 className="dash-text mt-1 text-xl font-bold">{session.problem?.title ?? 'NSD Session'}</h2>
            <p className="dash-subtle mt-1 text-sm">{session.problem?.domain ?? session.phase}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${meta.className}`}>
            <CheckCircle2 className="h-4 w-4" />
            {meta.label}
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {phaseSummaries.map((phase) => {
          const phaseGrade = gradeMeta(phase.phaseScore);
          return (
            <article key={phase.phase} className="dash-card rounded-[18px] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="dash-text text-sm font-bold">{phase.phase}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${phaseGrade.className}`}>
                  {phaseGrade.label}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                {(phase.strengths ?? []).length > 0 && (
                  <div>
                    <p className="dash-subtle mb-1 text-xs font-semibold uppercase tracking-[0.08em]">Strengths</p>
                    <ul className="list-disc space-y-1 pl-5 dash-text">
                      {phase.strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {(phase.weaknesses ?? []).length > 0 && (
                  <div>
                    <p className="dash-subtle mb-1 text-xs font-semibold uppercase tracking-[0.08em]">Weaknesses</p>
                    <ul className="list-disc space-y-1 pl-5 dash-text">
                      {phase.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {phaseSummaries.length === 0 && (
          <div className="dash-card rounded-[18px] p-5">
            <Clock className="mb-3 h-5 w-5 text-slate-400" />
            <p className="dash-subtle text-sm">No phase summaries were saved for this session.</p>
          </div>
        )}
      </section>

      {gaps.length > 0 && (
        <section className="dash-card rounded-[20px] p-5">
          <h3 className="dash-text mb-3 text-base font-bold">Skill gaps</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {gaps.map((gap, index) => (
              <div key={`${gap.skill_tag}-${index}`} className="dash-muted-panel rounded-[14px] border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="dash-text text-sm font-semibold">{gap.skill_tag}</span>
                  <span className="dash-badge rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                    {gap.severity}
                  </span>
                </div>
                <p className="dash-subtle mt-2 text-xs">{(gap.evidence ?? []).length} evidence item(s)</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
