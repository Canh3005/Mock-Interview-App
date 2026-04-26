import axiosClient from './axiosClient';

export const sdSessionApi = {
  create: (payload) => axiosClient.post('/sd-sessions', payload),
  getById: (id) => axiosClient.get(`/sd-sessions/${id}`),
  updateArchitecture: (id, architectureJSON) =>
    axiosClient.patch(`/sd-sessions/${id}/architecture`, architectureJSON),
  updatePhase: (id, phase) =>
    axiosClient.patch(`/sd-sessions/${id}/phase`, { phase }),
  appendTranscript: (id, entry) =>
    axiosClient.patch(`/sd-sessions/${id}/transcript`, entry),
};
