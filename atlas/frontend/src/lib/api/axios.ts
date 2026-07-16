import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

/**
 * Configured Axios instance for all ATLAS API calls.
 *
 * Features:
 *   - Automatic base URL from env
 *   - JSON content type headers
 *   - JWT Authorization header injection
 *   - Workspace ID header injection
 *   - Centralised error handling
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

// ── Request Interceptor ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach access token if present
    const token = typeof window !== 'undefined' ? localStorage.getItem('atlas_access_token') : null;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach workspace ID if present
    const workspaceId =
      typeof window !== 'undefined' ? localStorage.getItem('atlas_workspace_id') : null;
    if (workspaceId && config.headers) {
      config.headers['X-Workspace-ID'] = workspaceId;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response Interceptor ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 401 → token expired, refresh logic will go here
    if (error.response?.status === 401) {
      // TODO: implement token refresh
      if (typeof window !== 'undefined') {
        localStorage.removeItem('atlas_access_token');
      }
    }

    return Promise.reject(error);
  },
);
