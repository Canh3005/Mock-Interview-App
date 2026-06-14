import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sessionId: null,
  interviewSessionId: null,
  phase: 'PHASE_1_FR',
  problem: null,

  canvasJSON: null,       // { nodes, edges }
  canvasMode: 'locked',   // 'locked' | 'editable'
  lastSavedAt: null,
  autoSaveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'

  loading: false,
  error: null,
};

const nsdSessionSlice = createSlice({
  name: 'nsdSession',
  initialState,
  reducers: {
    loadRequest(state) {
      state.loading = true;
      state.error = null;
    },
    loadSuccess(state, action) {
      const { id, interviewSessionId, phase, problem, canvasJSON } = action.payload;
      state.sessionId = id;
      state.interviewSessionId = interviewSessionId;
      state.phase = phase ?? 'PHASE_1_FR';
      state.problem = problem ?? null;
      state.canvasJSON = canvasJSON ?? null;
      state.canvasMode = phase === 'PHASE_4_HLD' || phase === 'PHASE_5_DEEP_DIVE' ? 'editable' : 'locked';
      state.loading = false;
      state.error = null;
    },
    loadFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    canvasChanged() {},

    setCanvasJSON(state, action) {
      state.canvasJSON = action.payload;
    },
    setCanvasMode(state, action) {
      state.canvasMode = action.payload;
    },

    autoSaveStart(state) {
      state.autoSaveStatus = 'saving';
    },
    autoSaveSuccess(state) {
      state.autoSaveStatus = 'saved';
      state.lastSavedAt = Date.now();
    },
    autoSaveFailure(state) {
      state.autoSaveStatus = 'error';
    },

    phaseUpdated(state, action) {
      state.phase = action.payload;
      const editable = action.payload === 'PHASE_4_HLD' || action.payload === 'PHASE_5_DEEP_DIVE';
      state.canvasMode = editable ? 'editable' : 'locked';
    },

    resetNSDSession() {
      return initialState;
    },
  },
});

export const {
  loadRequest,
  loadSuccess,
  loadFailure,
  canvasChanged,
  setCanvasJSON,
  setCanvasMode,
  autoSaveStart,
  autoSaveSuccess,
  autoSaveFailure,
  phaseUpdated,
  resetNSDSession,
} = nsdSessionSlice.actions;

export default nsdSessionSlice.reducer;
