import axiosClient from './axiosClient';

export const sdProblemApi = {
  getList: (params) => axiosClient.get('/admin/sd-problems', { params }),
  create: (data) => axiosClient.post('/admin/sd-problems', data),
  update: ({ id, data }) => axiosClient.patch(`/admin/sd-problems/${id}`, data),
  remove: (id) => axiosClient.delete(`/admin/sd-problems/${id}`),
};
