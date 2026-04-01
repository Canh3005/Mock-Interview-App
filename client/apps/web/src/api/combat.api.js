import axiosClient from './axiosClient';
import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const combatApi = {
  /** Task 3.10 — Ingest multimodal metrics batch */
  ingestMetrics: (behavioralSessionId, payload) =>
    axiosClient.post(`/combat/sessions/${behavioralSessionId}/metrics`, payload),

  /** Task 3.4 — Get stage intro text */
  getStageIntro: (sessionId, stageNumber) =>
    axiosClient.get(
      `/behavioral/sessions/${sessionId}/stage-intro/${stageNumber}`,
    ),

  /** SSE stream — combat message (reuses behavioral endpoint) */
  createCombatMessageStream: (sessionId, payload) =>
    fetchWithAuth(`${BASE_URL}/behavioral/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
