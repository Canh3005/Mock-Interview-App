import axiosClient from './axiosClient';

export const authApi = {
  login: (data) => {
    return axiosClient.post('/auth/login', data);
  },

  register: (data) => {
    return axiosClient.post('/auth/register', data);
  },

  logout: () => {
    return axiosClient.post('/auth/logout');
  },

  // Often called on initial app load, though refresh interceptor does it.
  getProfile: () => {
    return axiosClient.get('/auth/me');
  }
};
