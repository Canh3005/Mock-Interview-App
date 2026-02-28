import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAuthenticating: true, // true on initial load for silent refresh
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Check Auth - App Init
    checkAuthRequest: (state) => {
      state.isAuthenticating = true;
    },
    
    // Login
    loginRequest: (state, action) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Register
    registerRequest: (state, action) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Refresh - Called by Sagas or directly by Axios interceptor
    refreshSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticating = false;
    },
    refreshFailure: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.isAuthenticating = false;
    },

    // Logout
    logoutRequest: (state) => {
      // Opt-in UI change immediately or wait. Better to wait for server response then clear
      state.loading = true;
    },
    logoutSuccess: (state) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
    },
    logoutFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      // Even if failed, we clear local state to prevent bad loops
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const {
  checkAuthRequest,
  loginRequest,
  loginSuccess,
  loginFailure,
  registerRequest,
  registerSuccess,
  registerFailure,
  refreshSuccess,
  refreshFailure,
  logoutRequest,
  logoutSuccess,
  logoutFailure,
} = authSlice.actions;

export default authSlice.reducer;
