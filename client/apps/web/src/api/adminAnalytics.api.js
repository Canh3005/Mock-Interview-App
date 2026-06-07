import axiosClient from './axiosClient';

export const adminAnalyticsApi = {
  getRevenue: (period) => axiosClient.get('/admin/analytics/revenue', { params: { period } }),
  getLlmCost: (period) => axiosClient.get('/admin/analytics/llm-cost', { params: { period } }),
  getQuestionUsage: (limit) => axiosClient.get('/admin/analytics/question-usage', { params: { limit } }),
  getExamModeUsage: (period) => axiosClient.get('/admin/analytics/exam-mode-usage', { params: { period } }),
  getAnomalies: (page, limit) => axiosClient.get('/admin/analytics/anomalies', { params: { page, limit } }),
  getRevenueDayTransactions: (date, page, limit) =>
    axiosClient.get('/admin/analytics/revenue/transactions', { params: { date, page, limit } }),
};
