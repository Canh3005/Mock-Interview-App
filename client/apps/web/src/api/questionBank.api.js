import axiosClient from './axiosClient';

export const questionBankApi = {
  getTaxonomy: () => axiosClient.get('/question-bank/taxonomy'),
  getProbes: (params) => axiosClient.get('/question-bank/probes', { params }),
};
