import { createSlice } from '@reduxjs/toolkit';

export const QUESTION_BANK_PAGE_SIZE = 12;

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
    limit: QUESTION_BANK_PAGE_SIZE,
    filters: initialFilters,
    loading: false,
    taxonomyLoading: false,
    error: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    submitLoading: false,
    submitError: null,
    feedbackLoading: false,
    feedbackError: null,
    retryFeedbackLoading: false,
    currentAttempt: null,
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
    fetchQuestionProbeDetailRequest: (state) => {
      state.detailLoading = true;
      state.detailError = null;
    },
    fetchQuestionProbeDetailSuccess: (state, action) => {
      state.detailLoading = false;
      state.detail = action.payload;
    },
    fetchQuestionProbeDetailFailure: (state, action) => {
      state.detailLoading = false;
      state.detailError = action.payload;
    },
    clearQuestionProbeDetail: (state) => {
      state.detail = null;
      state.detailError = null;
      state.currentAttempt = null;
      state.submitError = null;
      state.feedbackError = null;
      state.feedbackLoading = false;
      state.retryFeedbackLoading = false;
    },
    submitQuestionPracticeAttemptRequest: (state) => {
      state.submitLoading = true;
      state.submitError = null;
    },
    submitQuestionPracticeAttemptSuccess: (state, action) => {
      state.submitLoading = false;
      state.currentAttempt = action.payload;
    },
    submitQuestionPracticeAttemptFailure: (state, action) => {
      state.submitLoading = false;
      state.submitError = action.payload;
    },
    resetQuestionPracticeAttempt: (state) => {
      state.currentAttempt = null;
      state.submitError = null;
      state.feedbackError = null;
      state.feedbackLoading = false;
      state.retryFeedbackLoading = false;
      state.submitLoading = false;
    },
    fetchQuestionPracticeAttemptRequest: (state) => {
      state.feedbackLoading = true;
      state.feedbackError = null;
    },
    fetchQuestionPracticeAttemptSuccess: (state, action) => {
      state.feedbackLoading = false;
      state.currentAttempt = action.payload;
    },
    fetchQuestionPracticeAttemptFailure: (state, action) => {
      state.feedbackLoading = false;
      state.feedbackError = action.payload;
    },
    pollQuestionPracticeAttemptRequest: () => {},
    retryQuestionPracticeFeedbackRequest: (state) => {
      state.retryFeedbackLoading = true;
      state.feedbackError = null;
    },
    retryQuestionPracticeFeedbackSuccess: (state, action) => {
      state.retryFeedbackLoading = false;
      state.currentAttempt = action.payload;
    },
    retryQuestionPracticeFeedbackFailure: (state, action) => {
      state.retryFeedbackLoading = false;
      state.feedbackError = action.payload;
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
  fetchQuestionProbeDetailRequest,
  fetchQuestionProbeDetailSuccess,
  fetchQuestionProbeDetailFailure,
  clearQuestionProbeDetail,
  submitQuestionPracticeAttemptRequest,
  submitQuestionPracticeAttemptSuccess,
  submitQuestionPracticeAttemptFailure,
  resetQuestionPracticeAttempt,
  fetchQuestionPracticeAttemptRequest,
  fetchQuestionPracticeAttemptSuccess,
  fetchQuestionPracticeAttemptFailure,
  pollQuestionPracticeAttemptRequest,
  retryQuestionPracticeFeedbackRequest,
  retryQuestionPracticeFeedbackSuccess,
  retryQuestionPracticeFeedbackFailure,
} = questionBankSlice.actions;

export default questionBankSlice.reducer;
