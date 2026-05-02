import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chatHistory: [],     // [{ role: 'user'|'ai'|'hint', content, timestamp }]
  streamingMessage: '', // token đang stream, chưa hoàn chỉnh
  componentCoverage: 0, // 0–100 integer từ BE meta
  hintsUsed: 0,
  loading: false,
  hintLoading: false,
  error: null,
};

const sdInterviewerSlice = createSlice({
  name: 'sdInterviewer',
  initialState,
  reducers: {
    startSessionRequest(state) {
      state.loading = true;
      state.error = null;
      state.streamingMessage = '';
    },
    startSessionDone(state, action) {
      const { fullText } = action.payload;
      state.loading = false;
      state.streamingMessage = '';
      if (fullText) {
        state.chatHistory.push({
          role: 'ai',
          content: fullText,
          timestamp: new Date().toISOString(),
        });
      }
    },
    startSessionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    sendMessageRequest(state, action) {
      state.loading = true;
      state.error = null;
      state.streamingMessage = '';
      state.chatHistory.push({
        role: 'user',
        content: action.payload.userMessage,
        timestamp: new Date().toISOString(),
      });
    },
    streamChunk(state, action) {
      state.streamingMessage = (state.streamingMessage + action.payload).replace('[PHASE_COMPLETE]', '');
    },
    streamDone(state, action) {
      const { fullText, meta } = action.payload;
      state.loading = false;
      state.streamingMessage = '';
      state.chatHistory.push(
        { role: 'ai', content: fullText, timestamp: new Date().toISOString() },
      );
      if (meta?.componentCoverage !== undefined) {
        state.componentCoverage = meta.componentCoverage;
      }
    },
    streamFailure(state, action) {
      state.loading = false;
      state.streamingMessage = '';
      state.error = action.payload;
    },
    requestHintRequest(state) {
      state.hintLoading = true;
    },
    requestHintSuccess(state, action) {
      const { hintMessage, hintsUsed } = action.payload;
      state.hintLoading = false;
      state.hintsUsed = hintsUsed;
      state.chatHistory.push({
        role: 'hint',
        content: hintMessage,
        timestamp: new Date().toISOString(),
      });
    },
    requestHintFailure(state, action) {
      state.hintLoading = false;
      state.error = action.payload;
    },
    resetInterviewer() {
      return initialState;
    },
  },
});

export const {
  startSessionRequest,
  startSessionDone,
  startSessionFailure,
  sendMessageRequest,
  streamChunk,
  streamDone,
  streamFailure,
  requestHintRequest,
  requestHintSuccess,
  requestHintFailure,
  resetInterviewer,
} = sdInterviewerSlice.actions;

export default sdInterviewerSlice.reducer;
