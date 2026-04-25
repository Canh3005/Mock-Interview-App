import axiosClient from './axiosClient';

const BASE = '/live-coding';

export const dsaApi = {
  createSession: (body) =>
    axiosClient.post(`${BASE}/sessions`, body),

  getSession: (sessionId) =>
    axiosClient.get(`${BASE}/sessions/${sessionId}`),

  getScore: (sessionId) =>
    axiosClient.get(`${BASE}/sessions/${sessionId}/score`),

  submitApproach: (sessionId, problemId, approachText) =>
    axiosClient.patch(`${BASE}/sessions/${sessionId}/approach`, { problemId, approachText }),

  runCode: (sessionId, problemId, code, language) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/run`, { problemId, code, language }),

  submitProblem: (sessionId, problemId, code, language, meta = {}) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/submit`, { problemId, code, language, ...meta }),

  triggerIdle: (sessionId, problemId) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/idle`, { problemId }),
};
