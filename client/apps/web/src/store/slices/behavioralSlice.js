import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sessionId: null,
  // Granular state từ server: OPENING | ASKING_PROBE | ASKING_FOLLOW_UP | ... | COMPLETED
  interviewState: null,
  // StageProgress[] từ server — cập nhật sau mỗi turnComplete
  stageProgress: [],

  // Full turn history: InterviewTurn[]
  // { id, sessionId, stageKey, probeId, turnIndex, probeTurnIndex, role, type, content, timestamp }
  turns: [],

  // SSE streaming state
  streamingText: '',
  isEvaluating: false, // khi nhận event 'evaluating' (scoring đang chạy)
  isStreaming: false,  // khi nhận event 'turn_start' → đến khi turnComplete

  // Session lifecycle
  status: 'idle', // idle | starting | active | completing | completed | error
  elapsedSeconds: 0,
  error: null,
};

const behavioralSlice = createSlice({
  name: 'behavioral',
  initialState,
  reducers: {
    // ─── Session khởi tạo ────────────────────────────────────────────────────
    createSessionRequest(state) {
      state.status = 'starting';
      state.error = null;
    },
    createSessionSuccess(state, action) {
      const { sessionId, openingTurn, state: interviewState } = action.payload;
      state.sessionId = sessionId;
      state.interviewState = interviewState;
      state.status = 'active';
      state.turns = [openingTurn];
    },
    hydrateSessionSuccess(state, action) {
      const { sessionId, state: interviewState, turnHistory = [], stageProgress = [] } = action.payload;
      state.sessionId = sessionId;
      state.interviewState = interviewState;
      state.status = interviewState === 'COMPLETED' ? 'completed' : 'active';
      state.turns = turnHistory;
      state.stageProgress = stageProgress;
      state.error = null;
      state.isEvaluating = false;
      state.isStreaming = false;
      state.streamingText = '';
    },
    createSessionFailure(state, action) {
      state.status = 'error';
      state.error = action.payload;
    },

    // ─── Candidate answer (optimistic) ───────────────────────────────────────
    addCandidateTurn(state, action) {
      state.turns.push({
        id: `candidate-${Date.now()}`,
        sessionId: state.sessionId,
        stageKey: null,
        probeId: null,
        turnIndex: state.turns.length,
        probeTurnIndex: 0,
        role: 'candidate',
        type: 'candidate_answer',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // ─── SSE events ──────────────────────────────────────────────────────────
    evaluatingStarted(state) {
      state.isEvaluating = true;
      state.isStreaming = false;
    },
    turnStreamStart(state) {
      state.isEvaluating = false;
      state.isStreaming = true;
      state.streamingText = '';
    },
    streamChunk(state, action) {
      state.streamingText += action.payload;
    },
    turnComplete(state, action) {
      const { nextTurn, state: newInterviewState, stageProgress } = action.payload;
      state.isStreaming = false;
      state.streamingText = '';
      state.isEvaluating = false;
      state.turns.push(nextTurn);
      state.interviewState = newInterviewState;
      state.stageProgress = stageProgress;
    },
    streamError(state, action) {
      state.isStreaming = false;
      state.isEvaluating = false;
      state.streamingText = '';
      state.error = action.payload ?? null;
    },

    // ─── Session completed ───────────────────────────────────────────────────
    sessionCompleted(state) {
      state.status = 'completed';
      state.interviewState = 'COMPLETED';
    },

    // ─── Timer ───────────────────────────────────────────────────────────────
    tickTimer(state) {
      state.elapsedSeconds += 1;
    },

    // ─── Reset ───────────────────────────────────────────────────────────────
    resetBehavioral() {
      return initialState;
    },
  },
});

export const {
  createSessionRequest,
  createSessionSuccess,
  createSessionFailure,
  hydrateSessionSuccess,
  addCandidateTurn,
  evaluatingStarted,
  turnStreamStart,
  streamChunk,
  turnComplete,
  streamError,
  sessionCompleted,
  tickTimer,
  resetBehavioral,
} = behavioralSlice.actions;

// Action type dùng bên ngoài saga (tránh circular import)
export const SUBMIT_ANSWER = 'behavioral/submitAnswer';
export const submitAnswer = (content) => ({ type: SUBMIT_ANSWER, payload: content });

// ─── Compatibility aliases cho combat mode (chưa migrate) ────────────────────
export const startSessionRequest = createSessionRequest;
export const startSessionSuccess = createSessionSuccess;
export const startSessionFailure = createSessionFailure;
export const addUserMessage = (payload) => addCandidateTurn(payload?.content ?? payload);
export const streamStart = turnStreamStart;
export const streamDone = (payload) => turnComplete({
  nextTurn: { id: `ai-${Date.now()}`, sessionId: '', stageKey: null, probeId: null, turnIndex: 0, probeTurnIndex: 0, role: 'interviewer', type: 'probe_question', content: payload?.fullText ?? '', timestamp: new Date().toISOString() },
  state: 'ASKING_PROBE',
  stageProgress: [],
});
export const nextStageSuccess = () => ({ type: 'behavioral/noop' });
export const completeSessionRequest = sessionCompleted;
export const scoringPolled = sessionCompleted;
export const scoringFailure = (payload) => streamError(payload);
export const SEND_MESSAGE = SUBMIT_ANSWER;
export const sendMessage = submitAnswer;

export default behavioralSlice.reducer;
