import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import ScorecardDisplay from './ScorecardDisplay';

/**
 * Standalone scoring page shared by both BehavioralRoom and CombatRoom.
 *
 * Props:
 *   navigate  — app router function
 *   mode      — 'behavioral' | 'combat'
 *   extraSections — (optional) React node rendered below scorecard for combat-specific data
 */
export default function ScoringPage({ navigate, mode = 'behavioral', extraSections }) {
  const { status, scoreData } = useSelector((s) => s.behavioral);

  const isLoading = status === 'completing' || (status === 'completed' && !scoreData);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-cta animate-spin" />
          <p className="text-slate-400 text-sm">AI đang phân tích buổi phỏng vấn của bạn...</p>
          <p className="text-slate-600 text-xs">Quá trình này mất khoảng 15–30 giây</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {mode === 'combat' && (
        <div className="max-w-2xl mx-auto pt-6 px-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
              Combat Mode
            </span>
          </div>
        </div>
      )}
      <ScorecardDisplay scoreData={scoreData} navigate={navigate} />
      {extraSections && (
        <div className="max-w-2xl mx-auto pb-8 px-4 flex flex-col gap-6">
          {extraSections}
        </div>
      )}
    </div>
  );
}
