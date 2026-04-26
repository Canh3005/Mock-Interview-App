import axiosClient from './axiosClient';

export const sdSessionApi = {
  create: (payload) => axiosClient.post('/sd-sessions', payload),
  getById: (id) => axiosClient.get(`/sd-sessions/${id}`),
};
