import { createSlice } from '@reduxjs/toolkit';

const sdProblemSlice = createSlice({
  name: 'sdProblem',
  initialState: {
    problems: [],
    total: 0,
    page: 1,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    fetchSDProblemsRequest: (state) => { state.loading = true; state.error = null; },
    fetchSDProblemsSuccess: (state, action) => {
      state.loading = false;
      state.problems = action.payload.data;
      state.total = action.payload.total;
      state.page = action.payload.page;
    },
    fetchSDProblemsFailure: (state, action) => { state.loading = false; state.error = action.payload; },

    saveSDProblemRequest: (state) => { state.saving = true; state.error = null; },
    saveSDProblemSuccess: (state) => { state.saving = false; },
    saveSDProblemFailure: (state, action) => { state.saving = false; state.error = action.payload; },

    deleteSDProblemRequest: (state) => { state.loading = true; state.error = null; },
    deleteSDProblemSuccess: (state) => { state.loading = false; },
    deleteSDProblemFailure: (state, action) => { state.loading = false; state.error = action.payload; },
  },
});

export const {
  fetchSDProblemsRequest,
  fetchSDProblemsSuccess,
  fetchSDProblemsFailure,
  saveSDProblemRequest,
  saveSDProblemSuccess,
  saveSDProblemFailure,
  deleteSDProblemRequest,
  deleteSDProblemSuccess,
  deleteSDProblemFailure,
} = sdProblemSlice.actions;

export default sdProblemSlice.reducer;
