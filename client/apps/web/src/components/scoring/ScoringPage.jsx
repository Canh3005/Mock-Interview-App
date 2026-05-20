import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import { Loader2 } from 'lucide-react';
import ScorecardDisplay from './ScorecardDisplay';
import BehaviorScorecardDisplay from './BehaviorScorecardDisplay';
import DSAScoringTab from './DSAScoringTab';
import SDScoringTab from '../sd-debrief/SDScoringTab';
import { interviewApi } from '../../api/interview.api';

/**
 * Standalone scoring page shared by both BehavioralRoom and CombatRoom.
 *
 * Props:
 *   navigate      — app router function
 *   mode          — 'behavioral' | 'combat'
 *   interviewSessionId — session ID to fetch all rounds from
 *   extraSections — (optional) React node rendered below scorecard for combat-specific data
 */
export default function ScoringPage() {
  const navigate = useNavigate();
  const { session, scoringInitialTab } = useSelector((s) => s.interviewSetup);
  const mode = session?.mode === 'combat' ? 'combat' : 'behavioral';
  const interviewSessionId = session?.sessionId;
  const initialTab = scoringInitialTab;

  const { status, scoreData } = useSelector((s) => s.behavioral);
  const sdEvaluatorStatus = useSelector((s) => s.sdEvaluator.status);
  const [allSessions, setAllSessions] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState(initialTab ?? 'behavioral');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const isNewProbeScorecard = allSessions?.behavioral?.finalScore?.scorecardVersion === '1.0';
  const isLoading = initialTab !== 'liveCoding' &&
    !isNewProbeScorecard &&
    (status === 'completing' || (status === 'completed' && !scoreData));

  // Fetch all sessions for this interview
  useEffect(() => {
    if (interviewSessionId) {
      setIsLoadingSessions(true);
      interviewApi
        .getAllSessionsForInterview(interviewSessionId)
        .then((data) => {
          setAllSessions(data.sessions);
          // Honour initialTab if that session exists, otherwise pick first available
          const sessions = data.sessions;
          if (initialTab && sessions[initialTab] !== null && sessions[initialTab] !== undefined) {
            setSelectedSessionType(initialTab);
          } else {
            const firstAvailable = Object.entries(sessions).find(([, s]) => s !== null);
            if (firstAvailable) setSelectedSessionType(firstAvailable[0]);
          }
        })
        .catch((err) => console.error('Failed to fetch sessions:', err))
        .finally(() => setIsLoadingSessions(false));
    }
  }, [interviewSessionId]);

  useEffect(() => {
    if (
      sdEvaluatorStatus === 'completed' &&
      interviewSessionId &&
      allSessions?.systemDesign?.evaluationResult == null
    ) {
      setIsLoadingSessions(true);
      interviewApi
        .getAllSessionsForInterview(interviewSessionId)
        .then((data) => {
          setAllSessions(data.sessions);
        })
        .catch((err) => console.error('Failed to re-fetch sessions:', err))
        .finally(() => setIsLoadingSessions(false));
    }
  }, [sdEvaluatorStatus]);

  if (isLoading || isLoadingSessions) {
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

  // Get the score data for the selected session type
  const currentSessionData = allSessions?.[selectedSessionType];
  const behavioralFinalScore = currentSessionData?.finalScore;
  const displayScore = selectedSessionType === 'behavioral'
    ? (behavioralFinalScore ?? scoreData)
    : currentSessionData?.finalScore;

  // Session type labels
  const SESSION_LABELS = {
    behavioral: 'Behavioral',
    liveCoding: 'Live Coding',
    prompt: 'AI Prompting',
    systemDesign: 'System Design',
  };

  // Available sessions (non-null)
  const availableSessions = allSessions
    ? Object.entries(allSessions).filter(([_, session]) => session !== null)
    : [];

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Session Type Tabs */}
      {availableSessions.length > 1 && (
        <div className="border-b border-slate-700 sticky top-0 z-10 bg-background">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto">
              {availableSessions.map(([sessionType]) => (
                <button
                  key={sessionType}
                  onClick={() => setSelectedSessionType(sessionType)}
                  className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedSessionType === sessionType
                      ? 'text-cta border-b-2 border-cta'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {SESSION_LABELS[sessionType]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scorecard for selected session */}
      {selectedSessionType === 'systemDesign'
        ? <SDScoringTab session={currentSessionData} />
        : selectedSessionType === 'liveCoding'
          ? <DSAScoringTab session={currentSessionData} />
          : behavioralFinalScore?.scorecardVersion === '1.0'
            ? <BehaviorScorecardDisplay scorecard={behavioralFinalScore} />
            : (
              <ScorecardDisplay
                scoreData={displayScore}
                isCombat={mode === 'combat'}
              />
            )
      }

      {/* Extra sections */}
    </div>
  );
}
