import axios from 'axios';
import { store } from '../store/store';
import { logoutRequest } from '../store/slices/authSlice';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for sending the HttpOnly Refresh Token cookie
});

// Request Interceptor: Attach Access Token if available
axiosClient.interceptors.request.use(
  (config) => {
    // We import store dynamically to avoid circular dependencies if any,
    // but direct import is fine here since store configures reducers
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Queue to hold promises while refreshing token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response Interceptor: Handle 401 and silent refresh
axiosClient.interceptors.response.use(
  (response) => {
    return response.data; // Simply return data on success
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we are not trying to refresh the token itself to prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      
      if (isRefreshing) {
        // If already refreshing, wait for it to finish
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        // Ask Redux Saga to handle the refresh
        // Note: we can also just call axios directly here, but using Saga
        // keeps state management clean.
        // Wait, firing Redux action here might be tricky to await.
        // Let's do a direct axios call to break circularity with Redux actions if we want to await here.
        axios.post(`${axiosClient.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
          .then(({ data }) => {
            const { accessToken } = data;
            
            // Dispatch action to update store but we don't need to await it
            // since we have the token right here
            store.dispatch({ type: 'auth/refreshSuccess', payload: data });
            
            processQueue(null, accessToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            // If refresh fails (token expired), dispatch logout
            store.dispatch(logoutRequest());
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
