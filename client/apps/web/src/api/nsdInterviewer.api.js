import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const nsdInterviewerApi = {
  startSession: (sessionId) =>
    fetchWithAuth(`${BASE_URL}/nsd-sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }),

  // SSE stream — includes canvas when in Phase 4 or Phase 5
  createMessageStream: (sessionId, payload) =>
    fetchWithAuth(`${BASE_URL}/nsd-sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
