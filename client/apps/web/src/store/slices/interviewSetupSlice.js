import { createSlice } from '@reduxjs/toolkit';

// step flow:
// 'idle' → preflight_loading → context_missing | context_confirm
// → mode_select → round_select → (combat? combat_permission :) initializing → done
const initialState = {
  step: 'idle',

  // preflight
  missing: [],
  summary: null, // { cvSnippet, jdSnippet }
  cv: null,      // full CvJson
  jd: null,      // full JdJson

  // mode
  selectedMode: null, // 'practice' | 'combat'

  // combat permission
  combatPermissions: {
    webcam: 'pending',   // 'pending' | 'granted' | 'denied'
    microphone: 'pending',
    faceDetected: false,
  },

  // rounds
  selectedRounds: [],

  // session result
  session: null, // { sessionId, candidateLevel, estimatedDuration }

  loading: false,
  error: null,
};

const interviewSetupSlice = createSlice({
  name: 'interviewSetup',
  initialState,
  reducers: {
    // ─── Preflight ─────────────────────────────────────────────────────────
    preflightRequest(state) {
      state.step = 'preflight_loading';
      state.loading = true;
      state.error = null;
    },
    preflightSuccess(state, action) {
      state.loading = false;
      const { ready, missing, summary, cv, jd } = action.payload;
      if (ready) {
        state.summary = summary;
        state.cv = cv;
        state.jd = jd;
        state.step = 'context_confirm';
      } else {
        state.missing = missing;
        state.step = 'context_missing';
      }
    },
    preflightFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.step = 'idle';
    },

    // ─── Step transitions ──────────────────────────────────────────────────
    confirmContext(state) {
      state.step = 'mode_select';
    },
    selectMode(state, action) {
      state.selectedMode = action.payload; // 'practice' | 'combat'
    },
    proceedFromMode(state) {
      state.step = 'round_select';
    },
    proceedFromRoundSelect(state) {
      if (state.selectedMode === 'combat') {
        state.step = 'combat_permission';
      }
    },
    setCombatPermissions(state, action) {
      state.combatPermissions = { ...state.combatPermissions, ...action.payload };
    },
    proceedFromCombatPermission(state) {
      state.step = 'round_select';
    },
    toggleRound(state, action) {
      const round = action.payload;
      if (state.selectedRounds.includes(round)) {
        state.selectedRounds = state.selectedRounds.filter((r) => r !== round);
      } else {
        state.selectedRounds = [...state.selectedRounds, round];
      }
    },

    // ─── Save context (edit CV/JD before interview) ────────────────────────
    saveContextRequest(state, action) {
      state.loading = true;
      state.error = null;
      state.cv = action.payload.cv;
      state.jd = action.payload.jd;
    },
    saveContextSuccess(state) {
      state.loading = false;
      state.step = 'mode_select';
    },
    saveContextFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // ─── Session init ──────────────────────────────────────────────────────
    initSessionRequest(state) {
      state.step = 'initializing';
      state.loading = true;
      state.error = null;
    },
    initSessionSuccess(state, action) {
      state.loading = false;
      state.session = action.payload;
      state.step = 'done';
    },
    initSessionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.step = 'round_select';
    },

    // ─── Resume (direct re-entry for in-progress sessions) ────────────────
    resumeSession(state, action) {
      // action.payload: { sessionId, candidateLevel }
      state.session = { ...action.payload, estimatedDuration: 0 };
      state.step = 'done';
    },

    // ─── Reset ────────────────────────────────────────────────────────────
    resetSetup() {
      return initialState;
    },
  },
});

export const {
  preflightRequest,
  preflightSuccess,
  preflightFailure,
  confirmContext,
  selectMode,
  proceedFromMode,
  proceedFromRoundSelect,
  setCombatPermissions,
  proceedFromCombatPermission,
  toggleRound,
  saveContextRequest,
  saveContextSuccess,
  saveContextFailure,
  initSessionRequest,
  initSessionSuccess,
  initSessionFailure,
  resumeSession,
  resetSetup,
} = interviewSetupSlice.actions;

export default interviewSetupSlice.reducer;
