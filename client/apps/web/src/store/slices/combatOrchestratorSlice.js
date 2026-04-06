/**
 * Task 3.1 — Redux slice cho Combat Orchestrator state
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  combatState: 'INITIALIZING', // CombatState enum
  currentStage: 1,
  stageElapsed: 0,      // ms
  totalElapsed: 0,      // ms
  turnsInStage: 0,
  inputMode: 'voice',   // 'voice' | 'text'
  isAiSpeaking: false,
  isCandidateSpeaking: false,
  silenceDurationMs: 0,
  stateLog: [],         // for debug/replay
};

const combatOrchestratorSlice = createSlice({
  name: 'combatOrchestrator',
  initialState,
  reducers: {
    stateChanged(state, action) {
      const {
        combatState,
        currentStage,
        stageElapsed,
        totalElapsed,
        turnsInStage,
        inputMode,
      } = action.payload;

      if (combatState !== undefined) state.combatState = combatState;
      if (currentStage !== undefined) state.currentStage = currentStage;
      if (stageElapsed !== undefined) state.stageElapsed = stageElapsed;
      if (totalElapsed !== undefined) state.totalElapsed = totalElapsed;
      if (turnsInStage !== undefined) state.turnsInStage = turnsInStage;
      if (inputMode !== undefined) state.inputMode = inputMode;

      // Derived booleans
      state.isAiSpeaking =
        combatState === 'AI_ASKING' || combatState === 'AI_FOLLOW_UP';
      state.isCandidateSpeaking = combatState === 'CANDIDATE_SPEAKING';

      // Append log
      state.stateLog.push({
        state: combatState,
        ts: Date.now(),
      });
    },

    silenceUpdated(state, action) {
      state.silenceDurationMs = action.payload;
    },

    inputModeChanged(state, action) {
      state.inputMode = action.payload;
    },

    stageAdvanced(state, action) {
      state.currentStage = action.payload;
      state.turnsInStage = 0;
      state.stageElapsed = 0;
    },

    resetCombatOrchestrator() {
      return initialState;
    },
  },
});

export const {
  stateChanged,
  silenceUpdated,
  inputModeChanged,
  stageAdvanced,
  resetCombatOrchestrator,
} = combatOrchestratorSlice.actions;

export default combatOrchestratorSlice.reducer;
