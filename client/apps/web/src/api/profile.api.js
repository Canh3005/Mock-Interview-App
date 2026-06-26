import axiosClient from './axiosClient';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const profileApi = {
  getProfile: () => axiosClient.get('/users/profile'),
  updateProfile: (data) => axiosClient.put('/users/profile', data),
  uploadDocument: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return axiosClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getDocumentContext: () => axiosClient.get('/documents/context'),
  updateCvJson: (data) => axiosClient.patch('/documents/cv/current', data),
  updateJdJson: (data) => axiosClient.patch('/documents/jd/current', data),
  runCompatibilityAssessment: () => axiosClient.post('/documents/compatibility-assessment'),
  getAssessmentHistory: () => axiosClient.get('/documents/history'),
  deleteAssessment: (id) => axiosClient.delete(`/documents/history/${id}`),

  // Calibration review
  getCalibrationCurrent: () => axiosClient.get('/documents/calibration/current'),
  updateCalibrationProfile: (profileId, data) =>
    axiosClient.patch(`/documents/calibration/${profileId}`, data),
  addClaim: (profileId, data) =>
    axiosClient.post(`/documents/calibration/${profileId}/claims`, data),
  updateClaim: (claimId, data) =>
    axiosClient.patch(`/documents/claims/${claimId}`, data),
  deleteClaim: (claimId) =>
    axiosClient.delete(`/documents/claims/${claimId}`),
  addRisk: (profileId, data) =>
    axiosClient.post(`/documents/calibration/${profileId}/risks`, data),
  updateRisk: (riskId, data) =>
    axiosClient.patch(`/documents/risks/${riskId}`, data),
  deleteRisk: (riskId) =>
    axiosClient.delete(`/documents/risks/${riskId}`),

  openCalibrationStream: (token, onEvent, onError) => {
    const es = new EventSource(
      `${BASE_URL}/documents/calibration/stream?t=${token ?? ''}`,
    );
    es.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        onEvent({});
      }
    };
    es.onerror = () => onError();
    return es;
  },
};
