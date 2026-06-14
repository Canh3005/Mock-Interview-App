import axiosClient from './axiosClient';

export const nsdProblemApi = {
  getList: (params) => axiosClient.get('/admin/nsd-problems', { params }),
  create: (data) => axiosClient.post('/admin/nsd-problems', data),
  update: ({ id, data }) => axiosClient.patch(`/admin/nsd-problems/${id}`, data),
  remove: (id) => axiosClient.delete(`/admin/nsd-problems/${id}`),
};
