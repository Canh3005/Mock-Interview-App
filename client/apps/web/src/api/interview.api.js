import axiosClient from './axiosClient';

export const interviewApi = {
  preflight: () => axiosClient.get('/interview/preflight'),

  updateContext: (payload) => axiosClient.put('/interview/context', payload),

  initSession: (payload) => axiosClient.post('/interview/sessions/init', payload),
};
