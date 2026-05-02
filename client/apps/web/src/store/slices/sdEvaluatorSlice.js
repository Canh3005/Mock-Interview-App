import { createSlice } from '@reduxjs/toolkit';

const sdEvaluatorSlice = createSlice({
  name: 'sdEvaluator',
  initialState: {
    status: 'idle',
    completedDimensions: [],
    finalScore: null,
    hintPenalty: 0,
    gradeBand: null,
    error: null,
  },
  reducers: {
    triggerEvaluation(state) {
      state.status = 'processing';
      state.completedDimensions = [];
      state.finalScore = null;
      state.hintPenalty = 0;
      state.gradeBand = null;
      state.error = null;
    },
    progressPolled(state, action) {
      state.completedDimensions = action.payload.completedDimensions ?? [];
    },
    evaluationCompleted(state, action) {
      state.status = 'completed';
      state.completedDimensions = action.payload.dimensions ?? [];
      state.finalScore = action.payload.finalScore ?? null;
      state.hintPenalty = action.payload.hintPenalty ?? 0;
      state.gradeBand = action.payload.gradeBand ?? null;
    },
    evaluationFailed(state, action) {
      state.status = 'failed';
      state.error = action.payload;
    },
    evaluationReset() {
      return {
        status: 'idle',
        completedDimensions: [],
        finalScore: null,
        hintPenalty: 0,
        gradeBand: null,
        error: null,
      };
    },
  },
});

export const {
  triggerEvaluation,
  progressPolled,
  evaluationCompleted,
  evaluationFailed,
  evaluationReset,
} = sdEvaluatorSlice.actions;

export default sdEvaluatorSlice.reducer;
