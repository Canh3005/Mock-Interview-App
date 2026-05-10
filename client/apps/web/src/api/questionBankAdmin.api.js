import axiosClient from './axiosClient';

export const questionBankAdminApi = {
  getTaxonomy: () => axiosClient.get('/question-bank/taxonomy'),
  getProbes: (params) => axiosClient.get('/admin/question-bank/probes', { params }),
  createProbe: (data) => axiosClient.post('/admin/question-bank/probes', data),
  updateProbe: ({ id, data }) => axiosClient.patch(`/admin/question-bank/probes/${id}`, data),
  transitionProbe: ({ id, transition, reason }) =>
    axiosClient.post(`/admin/question-bank/probes/${id}/${transition}`, { reason }),
  getInterviewSets: (params) => axiosClient.get('/admin/question-bank/interview-sets', { params }),
  createInterviewSet: (data) => axiosClient.post('/admin/question-bank/interview-sets', data),
  updateInterviewSet: ({ id, data }) =>
    axiosClient.patch(`/admin/question-bank/interview-sets/${id}`, data),
  transitionInterviewSet: ({ id, transition, reason }) =>
    axiosClient.post(`/admin/question-bank/interview-sets/${id}/${transition}`, { reason }),
};
