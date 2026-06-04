import axiosClient from './axiosClient';

export const walletApi = {
  getBalance: () => axiosClient.get('/wallet/me'),
  getTransactions: (params) => axiosClient.get('/wallet/transactions', { params }),
};
