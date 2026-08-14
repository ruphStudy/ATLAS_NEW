import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookies';
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE } from '@/constants';
import type { AuthResponse } from '@/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

/**
 * Configured Axios instance for all ATLAS API calls.
 *
 * Features:
 *   - Automatic base URL from env
 *   - JSON content type headers
 *   - JWT Authorization header injection (read from cookie — see `lib/cookies.ts`)
 *   - Workspace ID header injection (best-effort; the backend actually
 *     derives workspace context from the JWT's own `workspaceId` claim,
 *     not this header — see `services/workspaces.service.ts`)
 *   - Automatic access-token refresh + request queueing on 401
 *   - Unwraps the backend's standard envelope (`{ success, message, data,
 *     meta, timestamp, requestId }` — see `TransformInterceptor` on the
 *     backend) so every service function can treat `response.data` as the
 *     actual payload.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_COOKIE);
}

export function storeSession(tokens: { accessToken: string; refreshToken: string }): void {
  setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, ACCESS_TOKEN_MAX_AGE);
  setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_TOKEN_MAX_AGE);
}

export function clearSession(): void {
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
}

// ── Request Interceptor ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('atlas_active_workspace_id') : null;
    if (workspaceId && config.headers) {
      config.headers['X-Workspace-ID'] = workspaceId;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/** Backend's standard success envelope — see `TransformInterceptor` on the backend. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

function isApiEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return !!body && typeof body === 'object' && 'success' in body && 'data' in body;
}

async function refreshTokensRaw(refreshToken: string): Promise<AuthResponse> {
  const { data } = await axios.post<ApiEnvelope<AuthResponse>>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  return isApiEnvelope(data) ? data.data : (data as unknown as AuthResponse);
}

// ── Response Interceptor: envelope unwrap + refresh-on-401 with request queueing ──
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null): void {
  refreshWaiters.forEach((resolve) => resolve(token));
  refreshWaiters = [];
}

apiClient.interceptors.response.use(
  (response) => {
    if (isApiEnvelope(response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) return reject(error);
            if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const data = await refreshTokensRaw(refreshToken);
        storeSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        isRefreshing = false;
        onRefreshed(data.accessToken);
        if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshed(null);
        clearSession();
        if (typeof window !== 'undefined') {
          const next = window.location.pathname + window.location.search;
          window.location.href = `/login?sessionExpired=1&next=${encodeURIComponent(next)}`;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
