import axiosClient from './axiosClient';

export const questionBankApi = {
  getTaxonomy: () => axiosClient.get('/question-bank/taxonomy'),
  getProbes: (params) => axiosClient.get('/question-bank/probes', { params }),
  getProbeDetail: ({ probeId, params }) =>
    axiosClient.get(`/question-bank/probes/${probeId}`, { params }),
  submitPracticeAttempt: ({ probeId, data }) =>
    axiosClient.post(`/question-bank/probes/${probeId}/practice-attempts`, data),
};
