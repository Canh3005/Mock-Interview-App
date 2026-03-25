import { createSlice } from '@reduxjs/toolkit';

const STAGE_NAMES = {
  1: 'Culture Fit & Company Alignment',
  2: 'Tech Stack Deep-Dive',
  3: 'Domain Knowledge',
  4: 'Thực chiến CV',
  5: 'Kỹ năng mềm & Xử lý tình huống',
  6: 'Reverse Interview',
};

const initialState = {
  // Session info
  sessionId: null,
  candidateLevel: null,
  currentStage: 1,
  stageName: STAGE_NAMES[1],
  status: 'idle', // idle | starting | in_progress | completing | completed | error

  // Chat messages: [{ id, role: 'user'|'ai', content, inputType, starStatus?, timestamp }]
  messages: [],

  // Streaming
  isStreaming: false,
  streamingText: '',

  // STAR status from last AI response
  starStatus: { situation: false, task: false, action: false, result: false },

  // Stage transition
  isTransitioning: false,

  // Scoring
  isScoring: false,
  scoreData: null,

  // Timer (seconds elapsed)
  elapsedSeconds: 0,

  error: null,
};

const behavioralSlice = createSlice({
  name: 'behavioral',
  initialState,
  reducers: {
    // ─── Session start ─────────────────────────────────────────────────────
    startSessionRequest(state) {
      state.status = 'starting';
      state.error = null;
    },
    startSessionSuccess(state, action) {
      const { sessionId, currentStage, firstQuestion, candidateLevel, stageName } =
        action.payload;
      state.sessionId = sessionId;
      state.currentStage = currentStage;
      state.stageName = stageName;
      state.candidateLevel = candidateLevel;
      state.status = 'in_progress';
      state.messages = [
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: firstQuestion,
          timestamp: new Date().toISOString(),
        },
      ];
    },
    startSessionFailure(state, action) {
      state.status = 'error';
      state.error = action.payload;
    },

    // ─── Streaming ─────────────────────────────────────────────────────────
    streamStart(state) {
      state.isStreaming = true;
      state.streamingText = '';
    },
    streamChunk(state, action) {
      state.streamingText += action.payload;
    },
    streamDone(state, action) {
      const { fullText, starStatus } = action.payload;
      state.isStreaming = false;
      state.streamingText = '';
      state.starStatus = starStatus ?? state.starStatus;
      state.messages.push({
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: fullText,
        starStatus,
        timestamp: new Date().toISOString(),
      });
    },
    streamError(state) {
      state.isStreaming = false;
      state.streamingText = '';
    },

    // ─── Send user message (optimistic) ───────────────────────────────────
    addUserMessage(state, action) {
      state.messages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: action.payload.content,
        inputType: action.payload.inputType,
        timestamp: new Date().toISOString(),
      });
    },

    // ─── Stage transition ──────────────────────────────────────────────────
    nextStageRequest(state) {
      state.isTransitioning = true;
      state.error = null;
    },
    nextStageSuccess(state, action) {
      const { currentStage, stageName, firstQuestion } = action.payload;
      state.isTransitioning = false;
      state.currentStage = currentStage;
      state.stageName = stageName;
      state.starStatus = { situation: false, task: false, action: false, result: false };
      state.messages.push({
        id: `ai-stage-${Date.now()}`,
        role: 'ai',
        content: firstQuestion,
        isStageIntro: true,
        timestamp: new Date().toISOString(),
      });
    },
    nextStageFailure(state, action) {
      state.isTransitioning = false;
      state.error = action.payload;
    },

    // ─── Complete + scoring ────────────────────────────────────────────────
    completeSessionRequest(state) {
      state.isScoring = true;
      state.status = 'completing';
    },
    scoringPolled(state, action) {
      const { status, score } = action.payload;
      if (status === 'COMPLETED' && score) {
        state.isScoring = false;
        state.status = 'completed';
        state.scoreData = score;
      }
    },
    scoringFailure(state, action) {
      state.isScoring = false;
      state.error = action.payload;
    },

    // ─── Timer ────────────────────────────────────────────────────────────
    tickTimer(state) {
      state.elapsedSeconds += 1;
    },

    // ─── Reset ─────────────────────────────────────────────────────────────
    resetBehavioral() {
      return initialState;
    },
  },
});

export const {
  startSessionRequest,
  startSessionSuccess,
  startSessionFailure,
  streamStart,
  streamChunk,
  streamDone,
  streamError,
  addUserMessage,
  nextStageRequest,
  nextStageSuccess,
  nextStageFailure,
  completeSessionRequest,
  scoringPolled,
  scoringFailure,
  tickTimer,
  resetBehavioral,
} = behavioralSlice.actions;

// Custom action (not managed by slice reducer) for SSE send — defined here
// to avoid circular import: components → saga → api → axiosClient → store → rootSaga → saga
export const SEND_MESSAGE = 'behavioral/sendMessage';
export const sendMessage = (payload) => ({ type: SEND_MESSAGE, payload });

export { STAGE_NAMES };
export default behavioralSlice.reducer;
