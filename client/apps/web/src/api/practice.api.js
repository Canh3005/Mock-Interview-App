import axiosClient from './axiosClient';

const BASE = '/practice';

export const practiceApi = {
  getPublicProblems: (params) =>
    axiosClient.get('/problems/public', { params }),

  getProblem: (problemId) =>
    axiosClient.get(`${BASE}/problems/${problemId}`),

  runCode: (problemId, code, language) =>
    axiosClient.post(`${BASE}/run`, { problemId, code, language }),

  submitProblem: (problemId, code, language, unlockedHints = []) =>
    axiosClient.post(`${BASE}/submit`, { problemId, code, language, unlockedHints }),

  markSolved: (problemId) =>
    axiosClient.post(`${BASE}/solved`, { problemId }),

  getSolvedProblemIds: () =>
    axiosClient.get(`${BASE}/solved`),
};
