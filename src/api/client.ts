import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { env } from '@/lib/env';
import { useAuthStore } from '@/auth/auth-store';
import { getReporter } from '@/lib/error-reporter';
import { ApiError } from './errors';
import type { ApiEnvelope, ApiErrorEnvelope } from '@/types/api';

function generateTraceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.headers && !config.headers['X-Trace-ID']) {
    config.headers['X-Trace-ID'] = generateTraceId();
  }
  return config;
});

// Session-termination policy (see decisions.md [P-17]): the JWT's `expiresAt` is the
// single gate for session validity. The HTTP interceptor does NOT clear the auth store
// on 401 / token_expired / link_expired — it only surfaces the ApiError. The only
// clearers are: (a) explicit sign-out (TopBar), (b) RequireAuth seeing `expiresAt` in
// the past, (c) callers who explicitly catch an error during a new sign-in attempt.
apiClient.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiEnvelope<unknown> | undefined;
    if (body && body.error) {
      throw ApiError.fromEnvelope(body.error, resp.status);
    }
    return resp;
  },
  (err: AxiosError<{ error?: ApiErrorEnvelope }>) => {
    const status = err.response?.status ?? 0;
    const envelope = err.response?.data?.error;
    const apiErr = envelope
      ? ApiError.fromEnvelope(envelope, status)
      : new ApiError('network_error', 'Network error — please retry.', status);

    if (status >= 500 || apiErr.code === 'network_error') {
      getReporter().captureException(apiErr, { url: err.config?.url, status });
    }

    return Promise.reject(apiErr);
  },
);
