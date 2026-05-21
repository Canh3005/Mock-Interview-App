import axiosClient from './axiosClient';
import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const combatApi = {
  /** Task 3.10 — Ingest multimodal metrics batch */
  ingestMetrics: (behavioralSessionId, payload) =>
    axiosClient.post(`/combat/sessions/${behavioralSessionId}/metrics`, payload),

  /** Task 4.1 — Ingest tab/focus proctoring event */
  ingestProctoringEvent: (behavioralSessionId, payload) =>
    axiosClient.post(
      `/combat/sessions/${behavioralSessionId}/proctoring-event`,
      payload,
    ),

  ingestProctoringEventBatch: (behavioralSessionId, payload) =>
    axiosClient.post(
      `/combat/sessions/${behavioralSessionId}/proctoring-event/batch`,
      payload,
    ),

  getIntegrity: (interviewSessionId) =>
    axiosClient.get(`/combat/sessions/${interviewSessionId}/integrity`),

  /** SSE stream — combat message (reuses behavioral endpoint) */
  createCombatMessageStream: (sessionId, payload) =>
    fetchWithAuth(`${BASE_URL}/behavioral/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
