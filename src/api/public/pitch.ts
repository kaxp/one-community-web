import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  zPublicPitchSuccess,
  type PublicPitchInput,
  type PublicPitchResult,
} from '@/features/public-pitch/schemas';

// Stage 6 S8 — POST /api/v1/public/pitch.
//
// Uses apiClient (axios) so MSW can intercept in tests. The auth interceptor
// only adds Authorization when a token exists in the auth store; unauthenticated
// visitors have no token so the header is never sent on the public endpoint.
//
// validateStatus: () => true — never reject on HTTP status so we can
// differentiate 202 / 429 / 422 without the error interceptor interfering.
// We override the response interceptor's error-envelope check by using a
// separate adapter configuration that runs BEFORE the shared interceptor.
// Simplest path: use the raw axios instance configured for public calls.
export async function submitPublicPitch(payload: PublicPitchInput): Promise<PublicPitchResult> {
  // We need raw access to the status code without ApiError wrapping.
  // axiosConfig.validateStatus bypasses the default 2xx rejection, and we
  // pass the request directly through the client (interceptors still run but
  // the 4xx won't throw because validateStatus returns true).
  let resp: { status: number; data: unknown };
  try {
    resp = await apiClient.post('/public/pitch', payload, {
      validateStatus: () => true,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      // The response interceptor throws ApiError for any response with body.error
      // (including 429 rate-limit). Recover the original intent by checking status.
      if (err.status === 429) return { kind: 'rate_limited' };
      return { kind: 'server_error', message: err.userMessage };
    }
    return { kind: 'server_error', message: 'Network error — please check your connection.' };
  }

  if (resp.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (resp.status === 422) {
    const body = resp.data as { detail?: unknown };
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(body.detail)) {
      for (const entry of body.detail as { loc?: unknown[]; msg?: string }[]) {
        if (Array.isArray(entry.loc) && entry.loc.length >= 2) {
          const field = String(entry.loc[entry.loc.length - 1]);
          fieldErrors[field] = entry.msg ?? 'Invalid value';
        }
      }
    }
    return { kind: 'validation_error', fieldErrors };
  }

  if (resp.status >= 400) {
    const body = resp.data as { error?: { message?: string } };
    return {
      kind: 'server_error',
      message: body?.error?.message ?? 'Something went wrong on our end.',
    };
  }

  // 202 / 200 success
  const body = resp.data as { data?: unknown };
  const parsed = zPublicPitchSuccess.safeParse(body.data);
  if (!parsed.success) {
    return { kind: 'server_error', message: 'Unexpected response shape from server.' };
  }
  return { kind: 'success', data: parsed.data };
}
