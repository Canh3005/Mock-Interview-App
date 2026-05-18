import axiosClient from './axiosClient';
import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const behavioralApi = {
  create: (interviewSessionId) =>
    axiosClient.post('/api/behavior-sessions', { interviewSessionId }),

  // SSE streaming — dùng fetchWithAuth thay vì axiosClient để support streaming
  submitAnswer: (sessionId, content) =>
    fetchWithAuth(`${BASE_URL}/api/behavior-sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),

  getSession: (sessionId) =>
    axiosClient.get(`/api/behavior-sessions/${sessionId}`),

  complete: (sessionId) =>
    axiosClient.post(`/api/behavior-sessions/${sessionId}/complete`),
};
