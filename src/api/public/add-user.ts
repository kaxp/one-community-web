import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  zPublicAddUserSuccess,
  type PublicAddUserInput,
  type PublicAddUserResult,
} from '@/features/public-add-user/schemas';

// Phase 4 menu Phase C1 (2026-05-28) — POST /api/v1/public/add-user.
//
// Mirrors src/api/public/pitch.ts. Bypasses the shared error interceptor
// via validateStatus: () => true so we can distinguish 202 / 400 / 422 / 429
// / 503 without ApiError wrapping the rate-limit + validation paths.
export async function submitPublicAddUser(
  payload: PublicAddUserInput,
): Promise<PublicAddUserResult> {
  let resp: { status: number; data: unknown };
  try {
    resp = await apiClient.post('/public/add-user', payload, {
      validateStatus: () => true,
    });
  } catch (err) {
    // The shared response interceptor throws ApiError on any 4xx with
    // body.error (validateStatus doesn't suppress it — it only prevents
    // axios's default rejection). Differentiate by status + code here.
    if (err instanceof ApiError) {
      if (err.status === 429) return { kind: 'rate_limited' };
      if (err.status === 400 && err.code === 'invalid_email') return { kind: 'invalid_email' };
      return { kind: 'server_error', message: err.userMessage };
    }
    return { kind: 'server_error', message: 'Network error — please check your connection.' };
  }

  if (resp.status === 429) {
    return { kind: 'rate_limited' };
  }

  if (resp.status === 400) {
    const body = resp.data as { error?: { code?: string; message?: string } };
    if (body?.error?.code === 'invalid_email') {
      return { kind: 'invalid_email' };
    }
    return {
      kind: 'server_error',
      message: body?.error?.message ?? 'Submission failed.',
    };
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

  // 202 success
  const body = resp.data as { data?: unknown };
  const parsed = zPublicAddUserSuccess.safeParse(body.data);
  if (!parsed.success) {
    return { kind: 'server_error', message: 'Unexpected response shape from server.' };
  }
  return { kind: 'success', data: parsed.data };
}
