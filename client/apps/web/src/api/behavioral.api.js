import axiosClient from './axiosClient';

const BASE = '/behavioral';

export const behavioralApi = {
  startSession: (interviewSessionId) =>
    axiosClient.post(`${BASE}/sessions/start`, { interviewSessionId }),

  nextStage: (sessionId) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/next-stage`),

  completeSession: (sessionId) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/complete`),

  getScore: (sessionId) =>
    axiosClient.get(`${BASE}/sessions/${sessionId}/score`),

  heartbeat: (sessionId) =>
    axiosClient.post(`${BASE}/sessions/${sessionId}/heartbeat`),

  // SSE streaming — returns a raw EventSource or fetch stream
  // We'll use native fetch for SSE since axiosClient doesn't support streaming
  createMessageStream: (sessionId, payload, accessToken) => {
    const baseURL =
      import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return fetch(`${baseURL}${BASE}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
};
