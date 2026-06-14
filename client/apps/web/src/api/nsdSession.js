import axiosClient from './axiosClient';

export const nsdSessionApi = {
  create: (payload) => axiosClient.post('/nsd-sessions', payload),
  getById: (id) => axiosClient.get(`/nsd-sessions/${id}`),
  updateCanvas: (id, canvas) =>
    axiosClient.patch(`/nsd-sessions/${id}/canvas`, { canvas }),
};
