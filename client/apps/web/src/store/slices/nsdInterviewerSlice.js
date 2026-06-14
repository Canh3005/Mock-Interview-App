import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chatHistory: [],      // [{ role: 'user'|'ai', content, timestamp, wasFill? }]
  streamingMessage: '', // token accumulator during stream
  loading: false,
  error: null,
};

const nsdInterviewerSlice = createSlice({
  name: 'nsdInterviewer',
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
        state.chatHistory.push({ role: 'ai', content: fullText, timestamp: new Date().toISOString() });
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
      state.streamingMessage = state.streamingMessage + action.payload;
    },
    streamDone(state, action) {
      const { fullText, meta } = action.payload;
      state.loading = false;
      state.streamingMessage = '';
      state.chatHistory.push({
        role: 'ai',
        content: fullText,
        timestamp: new Date().toISOString(),
        wasFill: meta?.wasFill ?? false,
      });
    },
    streamFailure(state, action) {
      state.loading = false;
      state.streamingMessage = '';
      state.error = action.payload;
    },
    resetNSDInterviewer() {
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
  resetNSDInterviewer,
} = nsdInterviewerSlice.actions;

export default nsdInterviewerSlice.reducer;
