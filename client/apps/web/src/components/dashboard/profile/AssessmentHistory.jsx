import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAssessmentHistoryRequest, deleteAssessmentRequest } from '../../../store/slices/profileSlice';
import { History, FileText, Loader2, Trash2 } from 'lucide-react';

function ScoreBar({ score }) {
  const color =
    score >= 70 ? 'from-green-500 to-emerald-400' :
    score >= 40 ? 'from-yellow-500 to-amber-400' :
    'from-red-500 to-rose-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-12 text-right ${
        score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
      }`}>
        {score}%
      </span>
    </div>
  );
}

export default function AssessmentHistory() {
  const dispatch = useDispatch();
  const { assessmentHistory, historyLoading, pollingStatus } = useSelector((state) => state.profile);

  const handleDelete = (id) => {
    dispatch(deleteAssessmentRequest(id));
  };

  useEffect(() => {
    dispatch(fetchAssessmentHistoryRequest());
  }, [dispatch]);

  // Refresh history when a new JD assessment completes
  useEffect(() => {
    if (pollingStatus === 'completed') {
      dispatch(fetchAssessmentHistoryRequest());
    }
  }, [pollingStatus, dispatch]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-5">
        <History size={20} className="text-cta" />
        <h2 className="text-xl font-heading font-semibold text-white">Assessment History</h2>
      </div>

      {historyLoading && assessmentHistory.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span>Loading history...</span>
        </div>
      ) : assessmentHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
          <FileText size={36} />
          <p className="text-sm">No JD assessments yet. Upload a JD with a CV to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
          {assessmentHistory.map((item) => (
            <div key={item.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-300 font-medium truncate">{item.originalName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <ScoreBar score={item.fitScore} />

              {item.matchReport && (
                <details className="mt-3 group">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-200 select-none list-none flex items-center gap-1">
                    <span className="group-open:hidden">▶ Show details</span>
                    <span className="hidden group-open:inline">▼ Hide details</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {item.matchReport.missing_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">Missing Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.matchReport.missing_skills.map((skill, i) => (
                            <span key={i} className="text-xs bg-red-900/30 text-red-400 border border-red-800/50 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.matchReport.suggestions?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">Suggestions</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {item.matchReport.suggestions.map((s, i) => (
                            <li key={i} className="text-xs text-slate-400">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
