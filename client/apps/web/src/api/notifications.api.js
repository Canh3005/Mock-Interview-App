import axiosClient from './axiosClient';
import { fetchWithAuth } from './fetchWithAuth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const notificationsApi = {
  openStream: () =>
    fetchWithAuth(`${BASE_URL}/notifications/stream`, { method: 'GET' }),

  getUnread: () => axiosClient.get('/notifications'),

  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),

  markAllRead: () => axiosClient.patch('/notifications/read-all'),
};
