import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  problems: [],
  total: 0,
  page: 1,
  limit: 10,
  currentProblem: null,
  loading: false,
  error: null,
  verifyResult: null, // Holds { verified: boolean, languages: {}, details: [] }
  verifyLoading: false,
  importLoading: false,
};

const adminProblemsSlice = createSlice({
  name: 'adminProblems',
  initialState,
  reducers: {
    fetchProblemsStart(state, action) {
      state.loading = true;
      state.error = null;
    },
    fetchProblemsSuccess(state, action) {
      state.loading = false;
      state.problems = action.payload.data;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    },
    fetchProblemsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchProblemByIdStart(state, action) {
      state.loading = true;
      state.error = null;
    },
    fetchProblemByIdSuccess(state, action) {
      state.loading = false;
      state.currentProblem = action.payload;
    },
    fetchProblemByIdFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    createProblemStart(state, action) {
      state.loading = true;
      state.error = null;
    },
    createProblemSuccess(state, action) {
      state.loading = false;
      state.currentProblem = action.payload;
    },
    createProblemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    updateProblemStart(state, action) {
      state.loading = true;
      state.error = null;
    },
    updateProblemSuccess(state, action) {
      state.loading = false;
      state.currentProblem = action.payload; // Update current
    },
    updateProblemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    deleteProblemStart(state, action) {
      state.loading = true;
      state.error = null;
    },
    deleteProblemSuccess(state, action) {
      state.loading = false;
      // Note: the saga should re-fetch the list after delete
    },
    deleteProblemFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    verifyProblemStart(state, action) {
      state.verifyLoading = true;
      state.verifyResult = null;
      state.error = null;
    },
    verifyProblemSuccess(state, action) {
      state.verifyLoading = false;
      state.verifyResult = action.payload;

      // Optimistic update status to 'VERIFIED' immediately to prevent UI lag when navigating
      if (action.payload.verified && state.currentProblem) {
        state.currentProblem.status = 'VERIFIED';
        const idx = state.problems.findIndex(p => p.id === state.currentProblem.id);
        if (idx !== -1) {
          state.problems[idx].status = 'VERIFIED';
        }
      }
    },
    verifyProblemFailure(state, action) {
      state.verifyLoading = false;
      state.error = action.payload;
    },
    clearVerifyResult(state) {
      state.verifyResult = null;
    },
    setCurrentProblem(state, action) {
      state.currentProblem = action.payload;
    },
    clearCurrentProblem(state) {
      state.currentProblem = null;
    },
    importProblemsStart(state) {
      state.importLoading = true;
      state.error = null;
    },
    importProblemsSuccess(state) {
      state.importLoading = false;
    },
    importProblemsFailure(state, action) {
      state.importLoading = false;
      state.error = action.payload;
    }
  },
});

export const {
  fetchProblemsStart,
  fetchProblemsSuccess,
  fetchProblemsFailure,
  fetchProblemByIdStart,
  fetchProblemByIdSuccess,
  fetchProblemByIdFailure,
  createProblemStart,
  createProblemSuccess,
  createProblemFailure,
  updateProblemStart,
  updateProblemSuccess,
  updateProblemFailure,
  deleteProblemStart,
  deleteProblemSuccess,
  deleteProblemFailure,
  verifyProblemStart,
  verifyProblemSuccess,
  verifyProblemFailure,
  clearVerifyResult,
  setCurrentProblem,
  clearCurrentProblem,
  importProblemsStart,
  importProblemsSuccess,
  importProblemsFailure
} = adminProblemsSlice.actions;

export default adminProblemsSlice.reducer;
