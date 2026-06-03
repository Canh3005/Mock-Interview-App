import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchAssessmentHistoryRequest, deleteAssessmentRequest } from '../../../store/slices/profileSlice';
import { History, FileText, Loader2, Trash2 } from 'lucide-react';
import FitAssessmentSummary from './FitAssessmentSummary';

function ScoreBar({ score }) {
  const color =
    score >= 70 ? 'from-green-500 to-emerald-400' :
    score >= 40 ? 'from-yellow-500 to-amber-400' :
    'from-red-500 to-rose-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
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
  const { t, i18n } = useTranslation();
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
        <h2 className="text-xl font-heading font-semibold text-white">{t('profile.assessmentHistory.title')}</h2>
      </div>

      {historyLoading && assessmentHistory.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span>{t('profile.assessmentHistory.loading')}</span>
        </div>
      ) : assessmentHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
          <FileText size={36} />
          <p className="text-sm">{t('profile.assessmentHistory.empty')}</p>
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
                    {new Date(item.createdAt).toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'en' ? 'en-US' : 'vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    title={t('profile.assessmentHistory.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {item.fitScore !== null && item.fitScore !== undefined && (
                <ScoreBar score={item.fitScore} />
              )}

              {item.fitAssessmentSummary && (
                <details className="mt-3 group">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-200 select-none list-none flex items-center gap-1">
                    <span className="group-open:hidden">{t('profile.assessmentHistory.showDetails')}</span>
                    <span className="hidden group-open:inline">{t('profile.assessmentHistory.hideDetails')}</span>
                  </summary>
                  <div className="mt-3">
                    <FitAssessmentSummary summary={item.fitAssessmentSummary} />
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
