import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * localStorage key holding the JWT. Must stay in sync with AuthContext.
 */
export const TOKEN_STORAGE_KEY = 'token';

/**
 * Window event dispatched exactly once when the backend rejects the stored
 * token with a 401. AuthContext clears user state on this event; App opens
 * the auth modal.
 */
export const SESSION_EXPIRED_EVENT = 'algoforge:session-expired';

// Module-level once-guard so a burst of simultaneous 401 responses only
// triggers a single session-expiry notification. Re-armed by the request
// interceptor as soon as a new authenticated request is made (i.e. after
// the user logs in again).
let sessionExpiryHandled = false;

/**
 * Helper kept for parity with the previous per-file convention: builds an
 * axios config carrying the stored JWT. The apiClient request interceptor
 * already attaches this header automatically, so most callers can omit it.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // A fresh authenticated request means the user logged in again —
    // re-arm the session-expiry guard for the next eventual 401.
    sessionExpiryHandled = false;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !sessionExpiryHandled) {
      const hadToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (hadToken) {
        sessionExpiryHandled = true;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);
