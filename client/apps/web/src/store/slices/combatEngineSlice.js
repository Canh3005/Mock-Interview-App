/**
 * Task 3.6 — Redux slice cho Combat Multimodal Engine status
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  engineStatus: 'idle',          // 'idle' | 'loading' | 'running' | 'stopped'
  lastFlushedAt: null,           // timestamp ms
  totalFramesAnalyzed: 0,
  mediapipeReady: false,
  latestSnapshot: {
    dominantExpression: 'neutral',
    expressionConfidence: 0,
    gazeOnScreenPercent: 100,
    fillerRate: 0,
    speakingPaceWpm: 0,
    turnDurationMs: 0,
  },
};

const combatEngineSlice = createSlice({
  name: 'combatEngine',
  initialState,
  reducers: {
    engineStatusChanged(state, action) {
      state.engineStatus = action.payload;
    },

    mediapipeReady(state) {
      state.mediapipeReady = true;
    },

    metricsFlushed(state) {
      state.lastFlushedAt = Date.now();
    },

    frameAnalyzed(state) {
      state.totalFramesAnalyzed++;
    },

    snapshotUpdated(state, action) {
      state.latestSnapshot = action.payload;
    },

    resetCombatEngine() {
      return initialState;
    },
  },
});

export const {
  engineStatusChanged,
  mediapipeReady,
  metricsFlushed,
  frameAnalyzed,
  snapshotUpdated,
  resetCombatEngine,
} = combatEngineSlice.actions;

export default combatEngineSlice.reducer;
