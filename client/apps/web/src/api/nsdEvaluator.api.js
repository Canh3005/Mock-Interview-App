import axiosClient from './axiosClient';

export const nsdEvaluatorApi = {
  enqueue: (sessionId) => axiosClient.post(`/nsd-sessions/${sessionId}/evaluate`),
  getStatus: (sessionId) => axiosClient.get(`/nsd-sessions/${sessionId}/evaluate/status`),
};
