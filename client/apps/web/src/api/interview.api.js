import axiosClient from './axiosClient';

export const interviewApi = {
  preflight: () => axiosClient.get('/interview/preflight'),

  initSession: (payload) => axiosClient.post('/interview/sessions/init', payload),
};
