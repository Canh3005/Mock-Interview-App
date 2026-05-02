import axiosClient from './axiosClient';
import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const sdInterviewerApi = {
  startSession: (sessionId) =>
    fetchWithAuth(`${BASE_URL}/sd-sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),

  // SSE stream — dùng fetchWithAuth vì axiosClient không hỗ trợ streaming
  createMessageStream: (sessionId, payload) =>
    fetchWithAuth(`${BASE_URL}/sd-sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  requestHint: (sessionId) => axiosClient.post(`/sd-sessions/${sessionId}/hint`),
};
