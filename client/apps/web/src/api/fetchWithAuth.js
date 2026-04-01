/**
 * fetchWithAuth.js
 * Raw fetch() wrapper with silent 401 token-refresh + retry (once).
 * Use này thay vì axiosClient khi cần binary/streaming responses
 * (TTS arraybuffer, SSE stream) mà axiosClient không hỗ trợ trực tiếp.
 */
import { store } from '../store/store';
import { refreshSuccess, logoutRequest } from '../store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Shared refresh lock — prevents concurrent refreshes across all in-flight fetches
let _isRefreshing = false;
let _refreshQueue = [];

function _processQueue(error, token = null) {
  _refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _refreshQueue = [];
}

async function _refreshToken() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

/**
 * fetch() with automatic 401 silent refresh + retry.
 *
 * @param {string} url
 * @param {RequestInit} options  - fetch options (không cần set Authorization, tự inject)
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  const accessToken = store.getState().auth.accessToken;

  const buildHeaders = (token) => ({
    ...options.headers,
    Authorization: `Bearer ${token}`,
  });

  const res = await fetch(url, { ...options, headers: buildHeaders(accessToken) });

  if (res.status !== 401) return res;

  // ── 401: attempt silent refresh ───────────────────────────────────────────
  if (_isRefreshing) {
    // Another request already holds the refresh lock — queue and wait
    const newToken = await new Promise((resolve, reject) =>
      _refreshQueue.push({ resolve, reject }),
    );
    return fetch(url, { ...options, headers: buildHeaders(newToken) });
  }

  _isRefreshing = true;
  try {
    const data = await _refreshToken();
    store.dispatch(refreshSuccess(data));
    _processQueue(null, data.accessToken);
    return fetch(url, { ...options, headers: buildHeaders(data.accessToken) });
  } catch (err) {
    _processQueue(err);
    store.dispatch(logoutRequest());
    throw err;
  } finally {
    _isRefreshing = false;
  }
}
