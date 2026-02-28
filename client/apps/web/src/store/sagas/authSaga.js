import { call, put, takeLatest } from 'redux-saga/effects';
import { authApi } from '../../api/auth';
import axios from 'axios';
import {
  checkAuthRequest,
  loginRequest,
  loginSuccess,
  loginFailure,
  registerRequest,
  registerSuccess,
  registerFailure,
  logoutRequest,
  logoutSuccess,
  logoutFailure,
  refreshSuccess,
  refreshFailure,
} from '../slices/authSlice';

// App Initialization: Silent Refresh
function* handleCheckAuth() {
  try {
    // Use raw axios here or a specific API that expects credentials to avoid triggering interceptors
    // But our interceptor explicitly allows /auth/refresh so we can use axiosClient.
    // However, to keep it clean, we hit the endpoint using raw axios withCredentials
    // so we handle the specific initial load error gracefully.
    const response = yield call(axios.post, `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/refresh`, {}, {
      withCredentials: true
    });
    
    // If successful, user had a valid HttpOnly cookie
    yield put(refreshSuccess(response.data));
  } catch (error) {
    // If fails, user has no session or token expired, that's fine for init.
    yield put(refreshFailure());
  }
}

function* handleLogin(action) {
  try {
    const response = yield call(authApi.login, action.payload);
    yield put(loginSuccess(response));
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    yield put(loginFailure(message));
  }
}

function* handleRegister(action) {
  try {
    const response = yield call(authApi.register, action.payload);
    yield put(registerSuccess(response));
  } catch (error) {
    const message = error.response?.data?.message || 'Registration failed';
    yield put(registerFailure(message));
  }
}

function* handleLogout() {
  try {
    yield call(authApi.logout);
    yield put(logoutSuccess());
  } catch (error) {
    const message = error.response?.data?.message || 'Logout failed';
    yield put(logoutFailure(message));
  }
}

export default function* authSaga() {
  yield takeLatest(checkAuthRequest.type, handleCheckAuth);
  yield takeLatest(loginRequest.type, handleLogin);
  yield takeLatest(registerRequest.type, handleRegister);
  yield takeLatest(logoutRequest.type, handleLogout);
}
