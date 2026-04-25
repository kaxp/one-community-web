import { apiClient } from './client';
import type { ApiEnvelope } from '@/types/api';
import {
  zAuthMeResponse,
  zOtpSendResponse,
  zOtpVerifyResponse,
  type AuthMeResponse,
  type OtpSendRequest,
  type OtpSendResponse,
  type OtpVerifyRequest,
  type OtpVerifyResponse,
} from '@/features/auth/schemas';
import {
  zLPProfileResponse,
  zProfileUpdateResponse,
  type LPProfileRequest,
  type LPProfileResponse,
  type ProfileUpdateRequest,
  type ProfileUpdateResponse,
} from '@/features/onboarding/schemas';
import {
  zSearchResponse,
  type SearchRequest,
  type SearchResponse,
} from '@/features/search/schemas';
import {
  zInteractionLogResponse,
  type InteractionLogRequest,
  type InteractionLogResponse,
} from '@/features/interactions/schemas';
import {
  zAdminActionResponse,
  zAdminConnectionsResponse,
  type AdminActionRequest,
  type AdminActionResponse,
  type AdminConnectionsResponse,
  type AdminConnectionStatus,
} from '@/features/admin/schemas';
import { zProfileView, type ProfileView } from '@/features/profile/schemas';
import { env } from '@/lib/env';
import { ProfileServiceInterim } from '@/api/interim/profile-service';

function unwrap<T>(env: ApiEnvelope<T>, path: string): T {
  if (env.data === null) {
    throw new Error(`Empty envelope from ${path}`);
  }
  return env.data;
}

// Strips keys whose value is `undefined` before sending (PRD §7.2.3 — backend has no null allowlist).
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function sendOtp(body: OtpSendRequest): Promise<OtpSendResponse> {
  const resp = await apiClient.post<ApiEnvelope<OtpSendResponse>>('/auth/otp/send', body);
  return zOtpSendResponse.parse(unwrap(resp.data, '/auth/otp/send'));
}

export async function verifyOtp(body: OtpVerifyRequest): Promise<OtpVerifyResponse> {
  const resp = await apiClient.post<ApiEnvelope<OtpVerifyResponse>>('/auth/otp/verify', body);
  return zOtpVerifyResponse.parse(unwrap(resp.data, '/auth/otp/verify'));
}

export async function getMe(): Promise<AuthMeResponse> {
  const resp = await apiClient.get<ApiEnvelope<AuthMeResponse>>('/auth/me');
  return zAuthMeResponse.parse(unwrap(resp.data, '/auth/me'));
}

export async function patchProfile(body: ProfileUpdateRequest): Promise<ProfileUpdateResponse> {
  const resp = await apiClient.patch<ApiEnvelope<ProfileUpdateResponse>>(
    '/onboarding/profile',
    stripUndefined(body),
  );
  return zProfileUpdateResponse.parse(unwrap(resp.data, '/onboarding/profile'));
}

export async function postLPProfile(body: LPProfileRequest): Promise<LPProfileResponse> {
  const resp = await apiClient.post<ApiEnvelope<LPProfileResponse>>(
    '/onboarding/lp-profile',
    stripUndefined(body),
  );
  return zLPProfileResponse.parse(unwrap(resp.data, '/onboarding/lp-profile'));
}

export async function searchUnified(body: SearchRequest): Promise<SearchResponse> {
  const payload: Record<string, unknown> = stripUndefined(body);
  if (
    payload.filters &&
    typeof payload.filters === 'object' &&
    Object.keys(payload.filters as Record<string, unknown>).length === 0
  ) {
    delete payload.filters;
  }
  const resp = await apiClient.post<ApiEnvelope<SearchResponse>>('/search', payload);
  return zSearchResponse.parse(unwrap(resp.data, '/search'));
}

export async function logInteraction(body: InteractionLogRequest): Promise<InteractionLogResponse> {
  const resp = await apiClient.post<ApiEnvelope<InteractionLogResponse>>(
    '/interactions/log',
    stripUndefined(body as unknown as Record<string, unknown>),
  );
  return zInteractionLogResponse.parse(unwrap(resp.data, '/interactions/log'));
}

export async function getAdminConnections(args: {
  status?: AdminConnectionStatus;
  cursor?: string | null;
}): Promise<AdminConnectionsResponse> {
  const params = new URLSearchParams();
  if (args.status) params.set('status', args.status);
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/admin/connections${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<AdminConnectionsResponse>>(url);
  return zAdminConnectionsResponse.parse(unwrap(resp.data, url));
}

export async function adminActOnConnection(
  id: string,
  body: AdminActionRequest,
): Promise<AdminActionResponse> {
  const resp = await apiClient.patch<ApiEnvelope<AdminActionResponse>>(
    `/connections/${id}/admin`,
    stripUndefined(body as unknown as Record<string, unknown>),
  );
  return zAdminActionResponse.parse(unwrap(resp.data, `/connections/${id}/admin`));
}

// PRD §7.5.1 — `GET /profile/{id}`. Gap-flagged via `VITE_PROFILE_V1_ENABLED`
// (PRD §13.2 G1). When the backend ships, flip the flag to `true` and delete
// `src/api/interim/profile-service.ts` — this function's signature is unchanged.
export async function getProfileById(id: string): Promise<ProfileView> {
  if (env.PROFILE_V1_ENABLED) {
    const resp = await apiClient.get<ApiEnvelope<ProfileView>>(`/profile/${id}`);
    return zProfileView.parse(unwrap(resp.data, `/profile/${id}`));
  }
  return ProfileServiceInterim.getById(id);
}
