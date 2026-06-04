import axiosClient from './axiosClient';

export const paymentApi = {
  getPackages: () => axiosClient.get('/payment/packages'),
  createOrder: (data) => axiosClient.post('/payment/orders', data),
  getOrderStatus: (orderId) => axiosClient.get(`/payment/orders/${orderId}/status`),
  processReturn: (params) => axiosClient.get('/payment/process-return', { params }),
};
