import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    sseConnected: false,
  },
  reducers: {
    connectSseRequest: () => {},
    disconnectSseRequest: () => {},
    sseConnected: (state) => { state.sseConnected = true; },
    sseDisconnected: (state) => { state.sseConnected = false; },

    fetchUnreadRequest: () => {},
    fetchUnreadSuccess: (state, { payload }) => {
      state.items = payload;
      state.unreadCount = payload.length;
    },

    addNotification: (state, { payload }) => {
      state.items.unshift(payload);
      state.unreadCount += 1;
    },

    markReadRequest: (_state, _action) => {},
    markReadSuccess: (state, { payload: id }) => {
      const item = state.items.find((n) => n.id === id);
      if (item) item.readAt = new Date().toISOString();
      state.unreadCount = state.items.filter((n) => !n.readAt).length;
    },

    markAllReadRequest: () => {},
    markAllReadSuccess: (state) => {
      state.items = state.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }));
      state.unreadCount = 0;
    },
  },
});

export const {
  connectSseRequest,
  disconnectSseRequest,
  sseConnected,
  sseDisconnected,
  fetchUnreadRequest,
  fetchUnreadSuccess,
  addNotification,
  markReadRequest,
  markReadSuccess,
  markAllReadRequest,
  markAllReadSuccess,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
