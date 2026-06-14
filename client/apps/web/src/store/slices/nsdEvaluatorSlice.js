import { createSlice } from '@reduxjs/toolkit';

const nsdEvaluatorSlice = createSlice({
  name: 'nsdEvaluator',
  initialState: {
    status: 'idle',     // 'idle' | 'processing' | 'completed' | 'failed'
    result: null,       // NSDEvaluationResult when completed
    error: null,
  },
  reducers: {
    triggerEvaluation(state) {
      state.status = 'processing';
      state.result = null;
      state.error = null;
    },
    evaluationCompleted(state, action) {
      state.status = 'completed';
      state.result = action.payload;
    },
    evaluationFailed(state, action) {
      state.status = 'failed';
      state.error = action.payload;
    },
    evaluationReset() {
      return { status: 'idle', result: null, error: null };
    },
  },
});

export const {
  triggerEvaluation,
  evaluationCompleted,
  evaluationFailed,
  evaluationReset,
} = nsdEvaluatorSlice.actions;

export default nsdEvaluatorSlice.reducer;
