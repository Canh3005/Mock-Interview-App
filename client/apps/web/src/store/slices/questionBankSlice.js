import { createSlice } from '@reduxjs/toolkit';

const initialFilters = {
  search: '',
  roleFamily: '',
  level: '',
  type: '',
  competency: '',
  techTag: '',
  difficulty: '',
  language: '',
  locale: 'vi',
  sort: 'newest',
};

const questionBankSlice = createSlice({
  name: 'questionBank',
  initialState: {
    probes: [],
    taxonomy: null,
    total: 0,
    page: 1,
    limit: 10,
    filters: initialFilters,
    loading: false,
    taxonomyLoading: false,
    error: null,
  },
  reducers: {
    fetchTaxonomyRequest: (state) => {
      state.taxonomyLoading = true;
      state.error = null;
    },
    fetchTaxonomySuccess: (state, action) => {
      state.taxonomyLoading = false;
      state.taxonomy = action.payload;
    },
    fetchTaxonomyFailure: (state, action) => {
      state.taxonomyLoading = false;
      state.error = action.payload;
    },
    setQuestionBankFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    resetQuestionBankFilters: (state) => {
      state.filters = { ...initialFilters, locale: state.filters.locale };
      state.page = 1;
    },
    fetchQuestionProbesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchQuestionProbesSuccess: (state, action) => {
      state.loading = false;
      state.probes = action.payload.data;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    },
    fetchQuestionProbesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTaxonomyRequest,
  fetchTaxonomySuccess,
  fetchTaxonomyFailure,
  setQuestionBankFilters,
  resetQuestionBankFilters,
  fetchQuestionProbesRequest,
  fetchQuestionProbesSuccess,
  fetchQuestionProbesFailure,
} = questionBankSlice.actions;

export default questionBankSlice.reducer;
