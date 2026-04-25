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
import {
  zAcceptedConnectionsResponse,
  zConnectionRequestResponse,
  zFeedbackResponse,
  zPendingConnectionsResponse,
  zRespondResponse,
  type AcceptedConnectionsResponse,
  type ConnectionRequestBody,
  type ConnectionRequestResponse,
  type FeedbackBody,
  type FeedbackResponse,
  type PendingConnectionsResponse,
  type RespondBody,
  type RespondResponse,
} from '@/features/connections/schemas';
import {
  zDeckJobStatus,
  zDeckUploadAck,
  zStartupProfileResponse,
  type DeckJobStatus,
  type DeckUploadAck,
  type DeckUploadRequest,
  type StartupProfileRequest,
  type StartupProfileResponse,
} from '@/features/pitch/schemas';
import {
  zMISFormResponse,
  zMISPrefillResponse,
  zMISSubmitResponse,
  type MISFormResponse,
  type MISPrefillResponse,
  type MISSubmitRequest,
  type MISSubmitResponse,
} from '@/features/mis/schemas';
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

// PRD §7.6.1 — `POST /connections/request`. `message` becomes `reason` in DB.
export async function requestConnection(
  body: ConnectionRequestBody,
): Promise<ConnectionRequestResponse> {
  const resp = await apiClient.post<ApiEnvelope<ConnectionRequestResponse>>(
    '/connections/request',
    stripUndefined(body as unknown as Record<string, unknown>),
  );
  return zConnectionRequestResponse.parse(unwrap(resp.data, '/connections/request'));
}

// PRD §7.6.3 — `PATCH /connections/{id}/respond`. Target accepts/declines.
export async function respondToConnection(id: string, body: RespondBody): Promise<RespondResponse> {
  const resp = await apiClient.patch<ApiEnvelope<RespondResponse>>(
    `/connections/${id}/respond`,
    body,
  );
  return zRespondResponse.parse(unwrap(resp.data, `/connections/${id}/respond`));
}

// PRD §7.6.4 — `GET /connections` (accepted list).
export async function listConnections(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<AcceptedConnectionsResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/connections${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<AcceptedConnectionsResponse>>(url);
  return zAcceptedConnectionsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.6.5 — `GET /connections/pending` (incoming + outgoing pending).
export async function listPendingConnections(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<PendingConnectionsResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/connections/pending${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<PendingConnectionsResponse>>(url);
  return zPendingConnectionsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.7.2 — `POST /interactions/feedback`. 48h post-accept prompt.
export async function submitFeedback(body: FeedbackBody): Promise<FeedbackResponse> {
  const resp = await apiClient.post<ApiEnvelope<FeedbackResponse>>('/interactions/feedback', body);
  return zFeedbackResponse.parse(unwrap(resp.data, '/interactions/feedback'));
}

// PRD §7.3.1 — `POST /pitch/profile` (create/update startup profile).
export async function postStartupProfile(
  body: StartupProfileRequest,
): Promise<StartupProfileResponse> {
  const resp = await apiClient.post<ApiEnvelope<StartupProfileResponse>>(
    '/pitch/profile',
    stripUndefined(body as unknown as Record<string, unknown>),
  );
  return zStartupProfileResponse.parse(unwrap(resp.data, '/pitch/profile'));
}

// PRD §7.3.2 — `GET /pitch/profile`. The 404 path is handled in
// `useStartupProfile` (it's a domain signal: "no profile yet, show create
// form"); here we surface only the success body.
export async function getStartupProfile(): Promise<StartupProfileResponse> {
  const resp = await apiClient.get<ApiEnvelope<StartupProfileResponse>>('/pitch/profile');
  return zStartupProfileResponse.parse(unwrap(resp.data, '/pitch/profile'));
}

// PRD §7.3.3 — `POST /pitch/deck`. Returns 202 + job_id; the client polls
// `getDeckJob(job_id)` via the ExecutionPanel `jobPoll` config.
export async function postDeck(body: DeckUploadRequest): Promise<DeckUploadAck> {
  const resp = await apiClient.post<ApiEnvelope<DeckUploadAck>>('/pitch/deck', body);
  return zDeckUploadAck.parse(unwrap(resp.data, '/pitch/deck'));
}

// PRD §7.3.4 — `GET /pitch/deck/jobs/{job_id}`. Polled every 3s, capped at
// 30 polls in the panel layer.
export async function getDeckJob(jobId: string): Promise<DeckJobStatus> {
  const url = `/pitch/deck/jobs/${jobId}`;
  const resp = await apiClient.get<ApiEnvelope<DeckJobStatus>>(url);
  return zDeckJobStatus.parse(unwrap(resp.data, url));
}

// PRD §7.9.1 — `GET /portfolio/mis` (current month form schema + prefill).
export async function getMisForm(): Promise<MISFormResponse> {
  const resp = await apiClient.get<ApiEnvelope<MISFormResponse>>('/portfolio/mis');
  return zMISFormResponse.parse(unwrap(resp.data, '/portfolio/mis'));
}

// PRD §7.9.3 — `GET /portfolio/mis/prefill` (last month's data). Admins must
// pass `company_id`; non-admins resolve from JWT.
export async function getMisPrefill(args?: {
  companyId?: string | undefined;
}): Promise<MISPrefillResponse> {
  const params = new URLSearchParams();
  if (args?.companyId) params.set('company_id', args.companyId);
  const qs = params.toString();
  const url = `/portfolio/mis/prefill${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<MISPrefillResponse>>(url);
  return zMISPrefillResponse.parse(unwrap(resp.data, url));
}

// PRD §7.9.2 — `POST /portfolio/mis`. UNIQUE(startup_id, period) enforced
// → 409 mis_already_submitted. Body must already include the strict raw_data
// (build via `buildMISRequest`).
export async function postMisSubmit(body: MISSubmitRequest): Promise<MISSubmitResponse> {
  const resp = await apiClient.post<ApiEnvelope<MISSubmitResponse>>('/portfolio/mis', body);
  return zMISSubmitResponse.parse(unwrap(resp.data, '/portfolio/mis'));
}
