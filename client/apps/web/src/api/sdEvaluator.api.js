import axiosClient from './axiosClient';

export const sdEvaluatorApi = {
  enqueue: (sessionId) => axiosClient.post(`/sd-sessions/${sessionId}/evaluate`),
  getStatus: (sessionId) => axiosClient.get(`/sd-sessions/${sessionId}/evaluate/status`),
};
