import axiosClient from './axiosClient';

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
};
