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
  // Upload state (file POST)
  uploadingDoc: false,
  lastJobId: null,           // jobId từ upload response — dùng để mở SSE parse
  // Parse state (SSE)
  parsingDoc: false,
  parseResult: null,         // { type, cvData/jdData, missingSources, ... }
  parseError: null,
  // Compatibility assessment (SSE)
  compatibilityLoading: false,
  compatibilityResult: null, // { fitScore, fitAssessment, fitAssessmentSummary }
  compatibilityError: null,
  // Document context (CV + JD from DB, persists across sessions)
  documentContext: { cv: null, jd: null },
  contextLoading: false,
  // CV/JD manual edit save
  cvSaving: false,
  cvSaveError: null,
  jdSaving: false,
  jdSaveError: null,
  // Assessment history
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
    updateProfileRequest: (state) => {
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
    uploadDocumentRequest: (state) => {
      state.uploadingDoc = true;
      state.error = null;
      state.lastJobId = null;
      state.parseResult = null;
      state.parseError = null;
      state.compatibilityResult = null;
      state.compatibilityError = null;
    },
    uploadDocumentSuccess: (state, action) => {
      // API returns { jobId, recordId }
      state.uploadingDoc = false;
      state.lastJobId = action.payload.jobId;
    },
    uploadDocumentFailure: (state, action) => {
      state.uploadingDoc = false;
      state.error = action.payload;
    },
    startDocumentParse: (state) => {
      state.parsingDoc = true;
      state.parseResult = null;
      state.parseError = null;
    },
    documentParseSuccess: (state, action) => {
      state.parsingDoc = false;
      state.parseResult = action.payload;
      if (action.payload?.type === 'CV' && action.payload.cvData) {
        state.documentContext.cv = action.payload.cvData;
      }
      if (action.payload?.type === 'JD' && action.payload.jdData) {
        state.documentContext.jd = action.payload.jdData;
      }
    },
    documentParseFailure: (state, action) => {
      state.parsingDoc = false;
      state.parseError = action.payload;
    },
    resetParseState: (state) => {
      state.lastJobId = null;
      state.parseResult = null;
      state.parseError = null;
      state.compatibilityResult = null;
      state.compatibilityError = null;
    },
    runCompatibilityStart: (state) => {
      state.compatibilityLoading = true;
      state.compatibilityResult = null;
      state.compatibilityError = null;
    },
    runCompatibilitySuccess: (state, action) => {
      state.compatibilityLoading = false;
      state.compatibilityResult = action.payload;
    },
    runCompatibilityFailure: (state, action) => {
      state.compatibilityLoading = false;
      state.compatibilityError = action.payload;
    },
    updateCvJsonRequest: (state) => {
      state.cvSaving = true;
      state.cvSaveError = null;
    },
    updateCvJsonSuccess: (state) => {
      state.cvSaving = false;
    },
    updateCvJsonFailure: (state, action) => {
      state.cvSaving = false;
      state.cvSaveError = action.payload;
    },
    updateJdJsonRequest: (state) => {
      state.jdSaving = true;
      state.jdSaveError = null;
    },
    updateJdJsonSuccess: (state) => {
      state.jdSaving = false;
    },
    updateJdJsonFailure: (state, action) => {
      state.jdSaving = false;
      state.jdSaveError = action.payload;
    },
    fetchDocumentContextRequest: (state) => {
      state.contextLoading = true;
    },
    fetchDocumentContextSuccess: (state, action) => {
      state.contextLoading = false;
      state.documentContext = action.payload;
    },
    fetchDocumentContextFailure: (state) => {
      state.contextLoading = false;
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
  startDocumentParse, documentParseSuccess, documentParseFailure,
  resetParseState,
  runCompatibilityStart, runCompatibilitySuccess, runCompatibilityFailure,
  updateCvJsonRequest, updateCvJsonSuccess, updateCvJsonFailure,
  updateJdJsonRequest, updateJdJsonSuccess, updateJdJsonFailure,
  fetchDocumentContextRequest, fetchDocumentContextSuccess, fetchDocumentContextFailure,
  fetchAssessmentHistoryRequest, fetchAssessmentHistorySuccess, fetchAssessmentHistoryFailure,
  deleteAssessmentRequest, deleteAssessmentFailure,
} = profileSlice.actions;

export default profileSlice.reducer;
