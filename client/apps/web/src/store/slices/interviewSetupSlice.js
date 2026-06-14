import { createSlice } from '@reduxjs/toolkit';

// step flow:
// 'idle' → preflight_loading → context_missing | context_confirm
// -> mode_select -> (combat? combat_permission :) initializing -> done
const initialState = {
  step: 'idle',

  // preflight
  missing: [],
  summary: null, // { cvSnippet, jdSnippet }
  cv: null,      // full CvJson
  jd: null,      // full JdJson

  // language
  selectedLanguage: 'vi', // 'vi' | 'en' | 'ja'

  // mode
  selectedMode: 'practice', // 'practice' | 'combat'

  // combat permission
  combatPermissions: {
    webcam: 'pending',   // 'pending' | 'granted' | 'denied'
    microphone: 'pending',
    faceDetected: false,
  },

  // rounds
  selectedRounds: [],

  // DSA config (only relevant when 'dsa' is in selectedRounds)
  dsaConfig: {
    problemCount: 1,  // 1 | 2 | 3
  },

  // System Design config (only relevant when 'system_design' is in selectedRounds)
  systemDesignConfig: {
    durationMinutes: 45,
    enableCurveball: true,
  },

  // behavioral interview config (F030)
  behavioralConfig: {
    depth: 'broad',      // 'broad' | 'deep'
    durationMinutes: 60,
  },

  // session result
  session: null, // { sessionId, candidateLevel }

  // round transition (behavioral → dsa)
  roundTransitionPending: false,
  pendingNextRoundInterviewId: null,

  // scoring page initial tab (set before navigate('scoring'))
  scoringInitialTab: 'behavioral',

  calibrationStale: false,

  loading: false,
  error: null,
  creditError: null, // { code, required, current, deficit } | null
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
      state.session = null; // clear stale session so navigate effect doesn't fire early
    },
    preflightSuccess(state, action) {
      state.loading = false;
      const { ready, missing, summary, cv, jd, calibrationStale } = action.payload;
      if (ready) {
        state.summary = summary;
        state.cv = cv;
        state.jd = jd;
        state.calibrationStale = calibrationStale ?? false;
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
    selectLanguage(state, action) {
      state.selectedLanguage = action.payload; // 'vi' | 'en' | 'ja'
    },
    selectMode(state, action) {
      state.selectedMode = action.payload; // 'practice' | 'combat'
    },
    proceedFromMode(state) {
      state.step = 'mode_select';
    },
    proceedFromRoundSelect(state) {
      if (state.selectedMode === 'combat') {
        state.step = 'combat_permission';
      }
      // practice mode: initSessionRequest will be dispatched by the caller
    },
    setCombatPermissions(state, action) {
      state.combatPermissions = { ...state.combatPermissions, ...action.payload };
    },
    proceedFromCombatPermission(state) {
      // Only used when user switches from combat → practice inside permission gate
      state.step = 'mode_select';
    },
    setDsaProblemCount(state, action) {
      state.dsaConfig.problemCount = action.payload; // 1 | 2 | 3
    },
    setSystemDesignConfig(state, action) {
      state.systemDesignConfig = { ...state.systemDesignConfig, ...action.payload };
    },
    toggleRound(state, action) {
      const round = action.payload;
      if (state.selectedRounds.includes(round)) {
        state.selectedRounds = state.selectedRounds.filter((r) => r !== round);
      } else {
        state.selectedRounds = [...state.selectedRounds, round];
      }
    },

    // ─── Behavioral config (F030) ─────────────────────────────────────────
    setBehavioralConfig(state, action) {
      state.behavioralConfig = { ...state.behavioralConfig, ...action.payload };
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

    // ─── Credit error ──────────────────────────────────────────────────────
    setCreditError(state, action) {
      state.loading = false;
      state.error = null;
      state.creditError = action.payload;
      state.step = 'mode_select';
    },
    clearCreditError(state) {
      state.creditError = null;
    },

    // ─── Session init ──────────────────────────────────────────────────────
    initSessionRequest(state) {
      state.step = 'initializing';
      state.loading = true;
      state.error = null;
      state.creditError = null;
    },
    initSessionSuccess(state, action) {
      state.loading = false;
      state.session = action.payload;
      state.step = 'done';
    },
    initSessionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.step = 'mode_select';
    },

    // ─── Resume (direct re-entry for in-progress sessions) ────────────────
    resumeSession(state, action) {
      // action.payload: { sessionId, candidateLevel }
      state.session = { ...action.payload };
      state.step = 'done';
    },

    // ─── Round transition (behavioral → dsa) ──────────────────────────────
    requestRoundTransition(state, action) {
      state.roundTransitionPending = true;
      state.pendingNextRoundInterviewId = action.payload.interviewSessionId;
    },
    confirmRoundTransition(state) {
      state.roundTransitionPending = false;
      state.pendingNextRoundInterviewId = null;
    },

    // ─── Scoring initial tab ───────────────────────────────────────────────
    setScoringInitialTab(state, action) {
      state.scoringInitialTab = action.payload; // 'behavioral' | 'liveCoding'
    },

    // ─── Reset ────────────────────────────────────────────────────────────
    resetSetup() {
      return initialState;
    },
  },
});

export const {
  setDsaProblemCount,
  setSystemDesignConfig,
  requestRoundTransition,
  confirmRoundTransition,
  setScoringInitialTab,
  preflightRequest,
  preflightSuccess,
  preflightFailure,
  confirmContext,
  selectLanguage,
  selectMode,
  proceedFromMode,
  proceedFromRoundSelect,
  setCombatPermissions,
  proceedFromCombatPermission,
  toggleRound,
  setBehavioralConfig,
  saveContextRequest,
  saveContextSuccess,
  saveContextFailure,
  initSessionRequest,
  initSessionSuccess,
  initSessionFailure,
  resumeSession,
  setCreditError,
  clearCreditError,
  resetSetup,
} = interviewSetupSlice.actions;

export default interviewSetupSlice.reducer;
