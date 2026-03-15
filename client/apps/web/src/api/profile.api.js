import axiosClient from './axiosClient';

export const profileApi = {
  getProfile: () => axiosClient.get('/users/profile'),
  updateProfile: (data) => axiosClient.put('/users/profile', data),
  uploadDocument: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return axiosClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getJobStatus: (jobId) => axiosClient.get(`/documents/status/${jobId}`),
  getAssessmentHistory: () => axiosClient.get('/documents/history'),
  deleteAssessment: (id) => axiosClient.delete(`/documents/history/${id}`),
};
