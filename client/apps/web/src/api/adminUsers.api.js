import axiosClient from './axiosClient';

export const adminUsersApi = {
  list: (params) => axiosClient.get('/admin/users', { params }),
  getDetail: (id) => axiosClient.get(`/admin/users/${id}`),
  suspend: (id) => axiosClient.patch(`/admin/users/${id}/suspend`),
  activate: (id) => axiosClient.patch(`/admin/users/${id}/activate`),
};
