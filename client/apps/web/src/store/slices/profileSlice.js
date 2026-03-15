import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  radarScores: {
    systemDesignScore: 0,
    dsaScore: 0,
    englishScore: 0,
    softSkillScore: 0
  },
  loading: false,
  error: null,
  uploadingDoc: false,
  pollingJobId: null,
  pollingStatus: null, // 'waiting', 'active', 'completed', 'failed'
  pollingResult: null, // JSON result from parsing
  assessmentHistory: [],
  historyLoading: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    fetchProfileRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProfileSuccess: (state, action) => {
      state.loading = false;
      state.data = action.payload;
      if (action.payload?.radarScores) {
         state.radarScores = action.payload.radarScores;
      }
    },
    fetchProfileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateProfileRequest: (state, action) => {
      state.loading = true;
      state.error = null;
    },
    updateProfileSuccess: (state, action) => {
      state.loading = false;
      state.data = action.payload;
      if (action.payload?.radarScores) {
         state.radarScores = action.payload.radarScores;
      }
    },
    updateProfileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    uploadDocumentRequest: (state, action) => {
      state.uploadingDoc = true;
      state.error = null;
      state.pollingJobId = null;
      state.pollingStatus = null;
      state.pollingResult = null;
    },
    uploadDocumentSuccess: (state, action) => {
      // API returns { jobId }
      state.pollingJobId = action.payload.jobId;
      state.pollingStatus = 'waiting';
    },
    uploadDocumentFailure: (state, action) => {
      state.uploadingDoc = false;
      state.error = action.payload;
    },
    pollJobStatusRequest: (state, action) => {
      // action.payload is jobId
    },
    pollJobStatusSuccess: (state, action) => {
      const { status, result } = action.payload;
      state.pollingStatus = status;
      if (status === 'completed' || status === 'failed') {
        state.uploadingDoc = false;
        state.pollingJobId = null; // Stop polling
        if (status === 'completed') {
            state.pollingResult = result;
        }
      }
    },
    pollJobStatusFailure: (state, action) => {
      state.uploadingDoc = false;
      state.pollingJobId = null;
      state.error = action.payload;
    },
    resetPollingState: (state) => {
      state.pollingJobId = null;
      state.pollingStatus = null;
      state.pollingResult = null;
    },
    fetchAssessmentHistoryRequest: (state) => {
      state.historyLoading = true;
    },
    fetchAssessmentHistorySuccess: (state, action) => {
      state.historyLoading = false;
      state.assessmentHistory = action.payload;
    },
    fetchAssessmentHistoryFailure: (state) => {
      state.historyLoading = false;
    },
    deleteAssessmentRequest: (state, action) => {
      // optimistic: remove immediately from list
      state.assessmentHistory = state.assessmentHistory.filter(
        (item) => item.id !== action.payload
      );
    },
    deleteAssessmentFailure: () => {
      // restore on failure by re-fetching (handled in saga)
    },
  },
});

export const {
  fetchProfileRequest, fetchProfileSuccess, fetchProfileFailure,
  updateProfileRequest, updateProfileSuccess, updateProfileFailure,
  uploadDocumentRequest, uploadDocumentSuccess, uploadDocumentFailure,
  pollJobStatusRequest, pollJobStatusSuccess, pollJobStatusFailure,
  resetPollingState,
  fetchAssessmentHistoryRequest, fetchAssessmentHistorySuccess, fetchAssessmentHistoryFailure,
  deleteAssessmentRequest, deleteAssessmentFailure,
} = profileSlice.actions;

export default profileSlice.reducer;
