import axiosClient from './axiosClient';

export const walletApi = {
  getBalance: () => axiosClient.get('/wallet/me'),
};
