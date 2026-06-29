import type {
  QuestionProbeFollowUpTrigger,
  QuestionProbeLanguage,
  QuestionProbeStage,
} from '../../question-bank/constants/question-bank-taxonomy.constants';
import type { PlannedProbe } from '../../session-planning/types/session-plan.types';
import type { ProbeScoringResult } from '../../question-bank/types/question-practice-scoring.types';

export type InterviewState =
  | 'PLANNED'
  | 'OPENING'
  | 'ASKING_PROBE'
  | 'EVALUATING_TURN'
  | 'DECIDING_NEXT_ACTION'
  | 'ASKING_REDIRECT'
  | 'ASKING_FOLLOW_UP'
  | 'REPHRASING'
  | 'TRANSITIONING_PROBE'
  | 'TRANSITIONING_STAGE'
  | 'COMPLETED';

export type InterviewTurnType =
  | 'opening_contract'
  | 'stage_intro'
  | 'probe_question'
  | 'redirect'
  | 'follow_up'
  | 'rephrase'
  | 'probe_transition'
  | 'stage_transition'
  | 'candidate_answer';

export interface InterviewTurn {
  id: string;
  sessionId: string;
  stageKey: QuestionProbeStage | null;
  probeId: string | null;
  turnIndex: number;
  probeTurnIndex: number;
  role: 'interviewer' | 'candidate';
  type: InterviewTurnType;
  content: string;
  followUpTrigger?: QuestionProbeFollowUpTrigger;
  timestamp: string;
}

export type ProbeCloseReason =
  | 'sufficient_evidence'
  | 'max_follow_ups_reached'
  | 'turn_limit_reached'
  | 'time_exhausted'
  | 'no_follow_up_available'
  | 'no_new_evidence'
  | 'no_relevant_story'
  | 'fallback_triggered'
  | 'candidate_no_knowledge';

export interface ActiveProbeSession {
  plannedProbe: PlannedProbe;
  questionProbeId: string;
  stage: QuestionProbeStage;
  startedAt: string;
  /** Số lần candidate đã trả lời trong probe này */
  candidateTurnCount: number;
  followUpCount: number;
  /** Số lần đã redirect (nhắc trả lời đúng câu hỏi) */
  redirectCount: number;
  rephraseCount: number;
  /** Tổng follow_up + challenge + redirect đã emit — safety ceiling */
  totalTurnCount: number;
  /** Toàn bộ candidate answer texts tích lũy để scoring cumulative */
  candidateAnswerTexts: string[];
  lastScoringResult: ProbeScoringResult | null;
  previousBand: ProbeScoringResult['overallBand'] | null;
  status: 'active' | 'closed';
  closeReason?: ProbeCloseReason;
  isFallback: boolean;
}

export type StageStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface ProbeRunSummary {
  questionProbeId: string;
  questionProbeRevision: number;
  candidateTurnCount: number;
  followUpCount: number;
  finalBand: ProbeScoringResult['overallBand'];
  finalScoringResult: ProbeScoringResult;
  closeReason: ProbeCloseReason;
  isFallback: boolean;
}

export interface StageProgress {
  stage: QuestionProbeStage;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  allocatedMinutes: number;
  usedMinutes: number;
  probeRuns: ProbeRunSummary[];
}

export type PolicyAction =
  | 'REDIRECT'
  | 'FOLLOW_UP'
  | 'CLOSE_PROBE'
  | 'USE_FALLBACK'
  | 'REPHRASE';

export interface PolicyDecision {
  action: PolicyAction;
  closeReason?: ProbeCloseReason;
  followUpTrigger?: QuestionProbeFollowUpTrigger;
  hasFallback?: boolean;
}

export type SseEventType =
  | 'turn_start'
  | 'chunk'
  | 'turn_complete'
  | 'session_completed'
  | 'error';

export interface SseTurnStartEvent {
  type: 'turn_start';
  turnType: InterviewTurnType;
}

export interface SseChunkEvent {
  type: 'chunk';
  token: string;
}

export interface SseTurnCompleteEvent {
  type: 'turn_complete';
  nextTurn: InterviewTurn;
  state: InterviewState;
  stageProgress: StageProgress[];
}

export interface SseSessionCompletedEvent {
  type: 'session_completed';
  state: 'COMPLETED';
  stageProgress: StageProgress[];
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
}

export type SseEvent =
  | SseTurnStartEvent
  | SseChunkEvent
  | SseTurnCompleteEvent
  | SseSessionCompletedEvent
  | SseErrorEvent;

/** Map probeId → rendered question text (pre-rendered at session init) */
export type RenderedQuestionsMap = Record<string, string>;

/** Map `${probeId}:${trigger}` → rendered follow-up/challenge text */
export type RenderedFollowUpsMap = Record<string, string>;

export interface ScoreForRuntimeParams {
  questionProbeId: string;
  answerText: string;
  language: QuestionProbeLanguage;
  cvClaims?: string[];
}
