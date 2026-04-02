import axiosClient from './axiosClient';

export const interviewApi = {
  preflight: () => axiosClient.get('/interview/preflight'),

  updateContext: (payload) => axiosClient.put('/interview/context', payload),

  initSession: (payload) => axiosClient.post('/interview/sessions/init', payload),

  getInterviewHistory: ({ limit, offset } = {}) =>
    axiosClient.get('/interview/sessions/in-progress', { params: { limit, offset } }),
};
