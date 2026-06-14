import { createSlice } from '@reduxjs/toolkit';

const nsdProblemSlice = createSlice({
  name: 'nsdProblem',
  initialState: {
    problems: [],
    total: 0,
    page: 1,
    loading: false,
    saving: false,
    error: null,
  },
  reducers: {
    fetchNSDProblemsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchNSDProblemsSuccess: (state, action) => {
      state.loading = false;
      state.problems = action.payload.data;
      state.total = action.payload.total;
      state.page = action.payload.page;
    },
    fetchNSDProblemsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    saveNSDProblemRequest: (state) => {
      state.saving = true;
      state.error = null;
    },
    saveNSDProblemSuccess: (state) => {
      state.saving = false;
    },
    saveNSDProblemFailure: (state, action) => {
      state.saving = false;
      state.error = action.payload;
    },
    deleteNSDProblemRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteNSDProblemSuccess: (state) => {
      state.loading = false;
    },
    deleteNSDProblemFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchNSDProblemsRequest,
  fetchNSDProblemsSuccess,
  fetchNSDProblemsFailure,
  saveNSDProblemRequest,
  saveNSDProblemSuccess,
  saveNSDProblemFailure,
  deleteNSDProblemRequest,
  deleteNSDProblemSuccess,
  deleteNSDProblemFailure,
} = nsdProblemSlice.actions;

export default nsdProblemSlice.reducer;
