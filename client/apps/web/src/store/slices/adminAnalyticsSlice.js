import { createSlice } from '@reduxjs/toolkit';

const adminAnalyticsSlice = createSlice({
  name: 'adminAnalytics',
  initialState: {
    period: '30d',
    revenue: null,
    llmCost: null,
    questionUsage: null,
    examMode: null,
    anomalies: null,
    loading: {
      revenue: false,
      llmCost: false,
      questionUsage: false,
      examMode: false,
      anomalies: false,
    },
    error: null,
  },
  reducers: {
    setPeriod: (state, { payload }) => { state.period = payload; },

    fetchRevenueRequest: (state) => { state.loading.revenue = true; },
    fetchRevenueSuccess: (state, { payload }) => { state.loading.revenue = false; state.revenue = payload; },
    fetchRevenueFailure: (state) => { state.loading.revenue = false; },

    fetchLlmCostRequest: (state) => { state.loading.llmCost = true; },
    fetchLlmCostSuccess: (state, { payload }) => { state.loading.llmCost = false; state.llmCost = payload; },
    fetchLlmCostFailure: (state) => { state.loading.llmCost = false; },

    fetchQuestionUsageRequest: (state) => { state.loading.questionUsage = true; },
    fetchQuestionUsageSuccess: (state, { payload }) => { state.loading.questionUsage = false; state.questionUsage = payload; },
    fetchQuestionUsageFailure: (state) => { state.loading.questionUsage = false; },

    fetchExamModeRequest: (state) => { state.loading.examMode = true; },
    fetchExamModeSuccess: (state, { payload }) => { state.loading.examMode = false; state.examMode = payload; },
    fetchExamModeFailure: (state) => { state.loading.examMode = false; },

    fetchAnomaliesRequest: (state) => { state.loading.anomalies = true; },
    fetchAnomaliesSuccess: (state, { payload }) => { state.loading.anomalies = false; state.anomalies = payload; },
    fetchAnomaliesFailure: (state) => { state.loading.anomalies = false; },
  },
});

export const {
  setPeriod,
  fetchRevenueRequest, fetchRevenueSuccess, fetchRevenueFailure,
  fetchLlmCostRequest, fetchLlmCostSuccess, fetchLlmCostFailure,
  fetchQuestionUsageRequest, fetchQuestionUsageSuccess, fetchQuestionUsageFailure,
  fetchExamModeRequest, fetchExamModeSuccess, fetchExamModeFailure,
  fetchAnomaliesRequest, fetchAnomaliesSuccess, fetchAnomaliesFailure,
} = adminAnalyticsSlice.actions;

export default adminAnalyticsSlice.reducer;
