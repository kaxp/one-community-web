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
