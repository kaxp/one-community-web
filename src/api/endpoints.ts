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
  zCardScanRecord,
  zCardScanResponse,
  zLPProfileResponse,
  zProfileUpdateResponse,
  type CardScanRecord,
  type CardScanRequest,
  type CardScanResponse,
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
  zAdminSummaryResponse,
  zDeadLetterJobsResponse,
  zDeadLetterRetryResponse,
  zFunnelStatusResponse,
  zInboundPitchDetail,
  zInboundPitchesResponse,
  zMISOverviewListResponse,
  zPartnerReferralResponse,
  zQuarterlyReportApproveResponse,
  zQuarterlyReportsResponse,
  type AdminActionRequest,
  type AdminActionResponse,
  type AdminConnectionsResponse,
  type AdminConnectionStatus,
  type AdminSummaryResponse,
  type DeadLetterJobsResponse,
  type DeadLetterRetryResponse,
  type DLQRetryStatus,
  type FunnelStatusRequest,
  type FunnelStatusResponse,
  type InboundPitchDetail,
  type InboundPitchRange,
  type InboundPitchesResponse,
  type MISOverviewListResponse,
  type MISOverviewRange,
  type PartnerReferralRequest,
  type PartnerReferralResponse,
  type QuarterlyReportApproveRequest,
  type QuarterlyReportApproveResponse,
  type QuarterlyReportsResponse,
} from '@/features/admin/schemas';
import {
  zAnalyticsCohort,
  zAnalyticsFunnelConnections,
  zAnalyticsFunnelLp,
  zAnalyticsFunnelStartup,
  zAnalyticsMatchSuccess,
  zAnalyticsOverview,
  type AnalyticsCohort,
  type AnalyticsFunnelConnections,
  type AnalyticsFunnelLp,
  type AnalyticsFunnelStartup,
  type AnalyticsMatchSuccess,
  type AnalyticsOverview,
} from '@/features/analytics/schemas';
import {
  zTracxnResponse,
  type TracxnRequest,
  type TracxnResponse,
} from '@/features/enrichment/schemas';
import {
  zAdminDigestResponse,
  zDigestApproveResponse,
  zDigestGenerateResponse,
  zDigestHistoryResponse,
  zDigestPendingResponse,
  zDigestSendResponse,
  type AdminDigestResponse,
  type DigestApproveRequest,
  type DigestApproveResponse,
  type DigestGenerateRequest,
  type DigestGenerateResponse,
  type DigestHistoryResponse,
  type DigestPendingResponse,
  type DigestSendRequest,
  type DigestSendResponse,
} from '@/features/digest/schemas';
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
  zMISUploadResponse,
  zMISHistoryResponse,
  type MISFormResponse,
  type MISUploadResponse,
  type MISHistoryResponse,
} from '@/features/mis/schemas';
import {
  zBookResponse,
  zBookingsResponse,
  zCancelResponse,
  zSlotsResponse,
  type BookRequest,
  type BookResponse,
  type BookingsResponse,
  type CancelResponse,
  type SlotsResponse,
} from '@/features/schedule/schemas';
import {
  zHomeCityResponse,
  zTravelPlan,
  zTravelPlanCancelResponse,
  zTravelPlansResponse,
  type HomeCityRequest,
  type HomeCityResponse,
  type TravelPlan,
  type TravelPlanCancelResponse,
  type TravelPlanCreateRequest,
  type TravelPlansResponse,
} from '@/features/travel/schemas';
import { zAdminCalendarResponse, type AdminCalendarResponse } from '@/features/schedule/schemas';
import {
  zMatchApproveResponse,
  zMatchGenerateAck,
  zMatchJobStatus,
  zMatchPendingResponse,
  zMatchSuggestionsResponse,
  zRespondResult,
  type MatchApproveRequest,
  type MatchApproveResponse,
  type MatchGenerateAck,
  type MatchGenerateRequest,
  type MatchJobStatus,
  type MatchPendingResponse,
  type MatchSuggestionsResponse,
  type RespondRequest,
  type RespondResult,
} from '@/features/matchmaking/schemas';
import {
  zProfileViewersResponse,
  type ProfileViewersResponse,
} from '@/features/profile-viewers/schemas';
import {
  zMyDigestPreferences,
  zMyDigestsResponse,
  type MyDigestPreferences,
  type MyDigestPreferencesUpdate,
  type MyDigestsResponse,
} from '@/features/digest/me-schemas';
import { env } from '@/lib/env';
import { ProfileServiceInterim } from '@/api/interim/profile-service';
import { OCRServiceInterim, type OCRProgress, type OCRResult } from '@/api/interim/ocr-client';

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

// PRD §7.2.1 — `POST /onboarding/card-scan`. Two phases: (1) initial parse
// with `raw_text` only → backend GPT-4o populates `parsed`. (2) final
// confirm with `parsed` + `category` → backend optionally creates a user
// row. 409 `duplicate_contact` includes `existing_user_id` in detail.
export async function postCardScan(body: CardScanRequest): Promise<CardScanResponse> {
  const resp = await apiClient.post<ApiEnvelope<CardScanResponse>>(
    '/onboarding/card-scan',
    stripUndefined(body as unknown as Record<string, unknown>),
  );
  return zCardScanResponse.parse(unwrap(resp.data, '/onboarding/card-scan'));
}

// PRD §7.2.2 — `GET /onboarding/card-scan/{scan_id}`. Ownership-gated.
export async function getCardScan(scanId: string): Promise<CardScanRecord> {
  const url = `/onboarding/card-scan/${scanId}`;
  const resp = await apiClient.get<ApiEnvelope<CardScanRecord>>(url);
  return zCardScanRecord.parse(unwrap(resp.data, url));
}

// PRD §13.2 G2 — OCR. When `VITE_OCR_SERVER_ENABLED=true`, hit the backend
// `POST /ocr` (multipart). Otherwise run tesseract.js client-side.
// `onProgress` is forwarded to the interim service; the server-side path
// reports a single 100% step on completion (the backend response is
// effectively all-or-nothing from the client's POV).
export async function runOCR(args: {
  blob: Blob | File;
  onProgress?: (p: OCRProgress) => void;
}): Promise<OCRResult> {
  if (env.OCR_SERVER_ENABLED) {
    const form = new FormData();
    form.append('file', args.blob, args.blob instanceof File ? args.blob.name : 'card.jpg');
    args.onProgress?.({ status: 'uploading', progress: 0.1 });
    const resp = await apiClient.post<ApiEnvelope<OCRResult>>('/ocr', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    args.onProgress?.({ status: 'done', progress: 1 });
    return unwrap(resp.data, '/ocr');
  }
  return OCRServiceInterim.recognize({
    blob: args.blob,
    ...(args.onProgress ? { onProgress: args.onProgress } : {}),
  });
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

// PRD §7.9.1 — `GET /portfolio/mis` (current period + last submission info).
export async function getMisForm(): Promise<MISFormResponse> {
  const resp = await apiClient.get<ApiEnvelope<MISFormResponse>>('/portfolio/mis');
  return zMISFormResponse.parse(unwrap(resp.data, '/portfolio/mis'));
}

// PRD §7.9.2 — `POST /portfolio/mis` — multipart file upload.
// Use `buildMISFormData()` from mis/schemas to construct the FormData.
// Axios detects FormData automatically and sets `Content-Type: multipart/form-data`
// with the correct boundary — no explicit header override needed.
export async function postMisUpload(formData: FormData): Promise<MISUploadResponse> {
  const resp = await apiClient.post('/portfolio/mis', formData);
  return zMISUploadResponse.parse(
    unwrap(resp.data as ApiEnvelope<MISUploadResponse>, '/portfolio/mis'),
  );
}

// PRD §7.9.3 — `GET /portfolio/mis/history` (past submissions).
export async function getMisHistory(args?: {
  companyId?: string | undefined;
  limit?: number;
}): Promise<MISHistoryResponse> {
  const params = new URLSearchParams();
  if (args?.companyId) params.set('company_id', args.companyId);
  if (args?.limit) params.set('limit', String(args.limit));
  const qs = params.toString();
  const url = `/portfolio/mis/history${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<MISHistoryResponse>>(url);
  return zMISHistoryResponse.parse(unwrap(resp.data, url));
}

// PRD §7.10.1 — `GET /schedule/slots`. Returns `data: Slot[]` (array IS the
// payload). All times are IST (+05:30) per backend convention.
export async function getScheduleSlots(args: {
  fromDate?: string;
  days?: number;
}): Promise<SlotsResponse> {
  const params = new URLSearchParams();
  if (args.fromDate) params.set('from_date', args.fromDate);
  if (args.days !== undefined) params.set('days', String(args.days));
  const qs = params.toString();
  const url = `/schedule/slots${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<SlotsResponse>>(url);
  return zSlotsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.10.2 — `POST /schedule/book`. 409 conflict when the slot is no
// longer available (GIST EXCLUSION on the target). Caller should refetch
// slots on 409.
export async function postScheduleBook(body: BookRequest): Promise<BookResponse> {
  const payload = stripUndefined(body as unknown as Record<string, unknown>);
  const resp = await apiClient.post<ApiEnvelope<BookResponse>>('/schedule/book', payload);
  return zBookResponse.parse(unwrap(resp.data, '/schedule/book'));
}

// PRD §7.10.3 — `GET /schedule/bookings`. Cursor-paginated.
export async function getScheduleBookings(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<BookingsResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/schedule/bookings${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<BookingsResponse>>(url);
  return zBookingsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.10.4 — `DELETE /schedule/book/{booking_id}`. Ownership: requester /
// target / admin. GCal delete is best-effort (§13 G9) — caller refetches.
export async function deleteScheduleBooking(
  bookingId: string,
  reason?: string,
): Promise<CancelResponse> {
  const url = `/schedule/book/${bookingId}`;
  const resp = await apiClient.delete<ApiEnvelope<CancelResponse>>(url, {
    data: reason ? { reason } : undefined,
  });
  return zCancelResponse.parse(unwrap(resp.data, url));
}

// PRD §7.11.1 — `POST /travel/plans`. Server enforces travel_end >= travel_start;
// the form schema also rejects client-side. `purpose` may be undefined and is
// stripped from the wire body.
export async function postTravelPlan(body: TravelPlanCreateRequest): Promise<TravelPlan> {
  const payload = stripUndefined(body as unknown as Record<string, unknown>);
  const resp = await apiClient.post<ApiEnvelope<TravelPlan>>('/travel/plans', payload);
  return zTravelPlan.parse(unwrap(resp.data, '/travel/plans'));
}

// PRD §7.11.2 — `GET /travel/plans` returns `data: TravelPlan[]` (array IS
// payload, not wrapped in `{ items }`). `active_only=true` is server default.
export async function getTravelPlans(args?: {
  active_only?: boolean;
}): Promise<TravelPlansResponse> {
  const params = new URLSearchParams();
  if (args?.active_only !== undefined) params.set('active_only', String(args.active_only));
  const qs = params.toString();
  const url = `/travel/plans${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<TravelPlansResponse>>(url);
  return zTravelPlansResponse.parse(unwrap(resp.data, url));
}

// PRD §7.11.3 — `DELETE /travel/plans/{id}`. Owner-only; 403 if not owner.
export async function deleteTravelPlan(id: string): Promise<TravelPlanCancelResponse> {
  const url = `/travel/plans/${id}`;
  const resp = await apiClient.delete<ApiEnvelope<TravelPlanCancelResponse>>(url);
  return zTravelPlanCancelResponse.parse(unwrap(resp.data, url));
}

// PRD §7.11.4 — `PUT /travel/home-city`. Trim handled at the form layer.
export async function putHomeCity(body: HomeCityRequest): Promise<HomeCityResponse> {
  const resp = await apiClient.put<ApiEnvelope<HomeCityResponse>>('/travel/home-city', body);
  return zHomeCityResponse.parse(unwrap(resp.data, '/travel/home-city'));
}

// PRD §7.8.5 — `GET /matchmaking/suggestions` (user-facing list). Backend
// returns `data: MatchSuggestion[]` (array IS payload, not wrapped).
export async function getMatchSuggestions(): Promise<MatchSuggestionsResponse> {
  const resp = await apiClient.get<ApiEnvelope<MatchSuggestionsResponse>>(
    '/matchmaking/suggestions',
  );
  return zMatchSuggestionsResponse.parse(unwrap(resp.data, '/matchmaking/suggestions'));
}

// PRD §7.8.6 — `POST /matchmaking/suggestions/{id}/respond`. Mutual `accepted`
// auto-creates a connection request (admin-gated) — surfaced via
// `connection_created: true`.
export async function respondToSuggestion(
  id: string,
  body: RespondRequest,
): Promise<RespondResult> {
  const url = `/matchmaking/suggestions/${id}/respond`;
  const resp = await apiClient.post<ApiEnvelope<RespondResult>>(url, body);
  return zRespondResult.parse(unwrap(resp.data, url));
}

// PRD §7.7.3 + §13 G11 — `GET /interactions/profile-viewers`. The Zod schema
// is the parse-time firewall against PII (email / phone) leaking even if the
// backend response expands; extra keys are stripped silently.
export async function getProfileViewers(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<ProfileViewersResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/interactions/profile-viewers${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<ProfileViewersResponse>>(url);
  return zProfileViewersResponse.parse(unwrap(resp.data, url));
}

// PRD §7.12.1 — admin/summary KPI dashboard. Cached 60s with refetch on focus.
export async function getAdminSummary(): Promise<AdminSummaryResponse> {
  const resp = await apiClient.get<ApiEnvelope<AdminSummaryResponse>>('/admin/summary');
  return zAdminSummaryResponse.parse(unwrap(resp.data, '/admin/summary'));
}

// PRD §7.12.3 — `GET /admin/digest`. Returns `data: WorkflowRow[]` (bare).
export async function getAdminDigest(): Promise<AdminDigestResponse> {
  const resp = await apiClient.get<ApiEnvelope<AdminDigestResponse>>('/admin/digest');
  return zAdminDigestResponse.parse(unwrap(resp.data, '/admin/digest'));
}

// PRD §7.12.4 — `POST /admin/digest/send`. 409 conflict when an in-flight
// send is already running for the workflow. §13 G4 — passthrough Zod parse.
export async function postAdminDigestSend(body: DigestSendRequest): Promise<DigestSendResponse> {
  const resp = await apiClient.post<ApiEnvelope<DigestSendResponse>>('/admin/digest/send', body);
  return zDigestSendResponse.parse(unwrap(resp.data, '/admin/digest/send'));
}

// PRD §7.13.1 — `POST /digest/generate`. Backend writes pending rows, no send.
export async function postDigestGenerate(
  body: DigestGenerateRequest,
): Promise<DigestGenerateResponse> {
  const resp = await apiClient.post<ApiEnvelope<DigestGenerateResponse>>('/digest/generate', body);
  return zDigestGenerateResponse.parse(unwrap(resp.data, '/digest/generate'));
}

// PRD §7.13.2 — `POST /digest/approve`. 409 if the row is already approved/sent.
export async function postDigestApprove(
  body: DigestApproveRequest,
): Promise<DigestApproveResponse> {
  const resp = await apiClient.post<ApiEnvelope<DigestApproveResponse>>('/digest/approve', body);
  return zDigestApproveResponse.parse(unwrap(resp.data, '/digest/approve'));
}

// PRD §7.13.3 — `GET /digest/pending` (admin review queue).
export async function getDigestPending(): Promise<DigestPendingResponse> {
  const resp = await apiClient.get<ApiEnvelope<DigestPendingResponse>>('/digest/pending');
  return zDigestPendingResponse.parse(unwrap(resp.data, '/digest/pending'));
}

// PRD §7.13.4 — `GET /digest/history?limit=...` (sent rows).
export async function getDigestHistory(args: { limit?: number }): Promise<DigestHistoryResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  const qs = params.toString();
  const url = `/digest/history${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<DigestHistoryResponse>>(url);
  return zDigestHistoryResponse.parse(unwrap(resp.data, url));
}

// PRD §7.8.1 — admin starts the matchmaking generation job. 202 + job_id.
export async function postMatchGenerate(body: MatchGenerateRequest): Promise<MatchGenerateAck> {
  const resp = await apiClient.post<ApiEnvelope<MatchGenerateAck>>('/matchmaking/generate', body);
  return zMatchGenerateAck.parse(unwrap(resp.data, '/matchmaking/generate'));
}

// PRD §7.8.2 — Celery job poll.
export async function getMatchJob(jobId: string): Promise<MatchJobStatus> {
  const url = `/matchmaking/jobs/${jobId}`;
  const resp = await apiClient.get<ApiEnvelope<MatchJobStatus>>(url);
  return zMatchJobStatus.parse(unwrap(resp.data, url));
}

// PRD §7.8.3 — admin approves a single suggestion.
export async function postMatchApprove(body: MatchApproveRequest): Promise<MatchApproveResponse> {
  const resp = await apiClient.post<ApiEnvelope<MatchApproveResponse>>(
    '/matchmaking/approve',
    body,
  );
  return zMatchApproveResponse.parse(unwrap(resp.data, '/matchmaking/approve'));
}

// PRD §7.8.4 — admin pending list. Returns `data: MatchSuggestion[]` (bare).
export async function getMatchPending(): Promise<MatchPendingResponse> {
  const resp = await apiClient.get<ApiEnvelope<MatchPendingResponse>>('/matchmaking/pending');
  return zMatchPendingResponse.parse(unwrap(resp.data, '/matchmaking/pending'));
}

// PRD §7.12.7 — `GET /admin/quarterly-reports?quarter=...`. Bare array data.
export async function getQuarterlyReports(args: {
  quarter?: string;
}): Promise<QuarterlyReportsResponse> {
  const params = new URLSearchParams();
  if (args.quarter) params.set('quarter', args.quarter);
  const qs = params.toString();
  const url = `/admin/quarterly-reports${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<QuarterlyReportsResponse>>(url);
  return zQuarterlyReportsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.12.8 — `POST /admin/quarterly-reports/approve`.
export async function postQuarterlyReportApprove(
  body: QuarterlyReportApproveRequest,
): Promise<QuarterlyReportApproveResponse> {
  const resp = await apiClient.post<ApiEnvelope<QuarterlyReportApproveResponse>>(
    '/admin/quarterly-reports/approve',
    body,
  );
  return zQuarterlyReportApproveResponse.parse(
    unwrap(resp.data, '/admin/quarterly-reports/approve'),
  );
}

// PRD §7.12.9 — `GET /admin/dead-letter-jobs`. OFFSET pagination — the only
// endpoint that uses it (§13 G10). Caller should also read `pagination.limit`
// and `pagination.offset` from the envelope; we return both.
export interface DLQListResult {
  items: DeadLetterJobsResponse;
  limit: number;
  offset: number;
}
export async function getDeadLetterJobs(args: {
  retry_status?: DLQRetryStatus;
  limit?: number;
  offset?: number;
}): Promise<DLQListResult> {
  const params = new URLSearchParams();
  if (args.retry_status) params.set('retry_status', args.retry_status);
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.offset !== undefined) params.set('offset', String(args.offset));
  const qs = params.toString();
  const url = `/admin/dead-letter-jobs${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<DeadLetterJobsResponse>>(url);
  const items = zDeadLetterJobsResponse.parse(unwrap(resp.data, url));
  const limit = resp.data.pagination?.limit ?? args.limit ?? 50;
  const offset = resp.data.pagination?.offset ?? args.offset ?? 0;
  return { items, limit, offset };
}

// PRD §7.12.10 — `POST /admin/dead-letter-jobs/{id}/retry`.
export async function postDeadLetterRetry(id: string): Promise<DeadLetterRetryResponse> {
  const url = `/admin/dead-letter-jobs/${id}/retry`;
  const resp = await apiClient.post<ApiEnvelope<DeadLetterRetryResponse>>(url, {});
  return zDeadLetterRetryResponse.parse(unwrap(resp.data, url));
}

// PRD §7.12.5 — `PUT /admin/lp/{user_id}/funnel-status`. 409 on skip without
// override; the page surfaces an "Enable override?" dialog and re-PUTs.
export async function putLpFunnelStatus(
  userId: string,
  body: FunnelStatusRequest,
): Promise<FunnelStatusResponse> {
  const url = `/admin/lp/${userId}/funnel-status`;
  const payload = body.override === undefined ? { status: body.status } : body;
  const resp = await apiClient.put<ApiEnvelope<FunnelStatusResponse>>(url, payload);
  return zFunnelStatusResponse.parse(unwrap(resp.data, url));
}

// PRD §7.12.6 — partner-referral broadcast.
export async function postPartnerReferral(
  body: PartnerReferralRequest,
): Promise<PartnerReferralResponse> {
  const payload = stripUndefined(body as unknown as Record<string, unknown>);
  const resp = await apiClient.post<ApiEnvelope<PartnerReferralResponse>>(
    '/admin/partner-referral',
    payload,
  );
  return zPartnerReferralResponse.parse(unwrap(resp.data, '/admin/partner-referral'));
}

// PRD §7.15.1 — Tracxn ingest. Idempotent on (website_domain, company_name).
// `action ∈ {created, merged, duplicate_skipped}` drives the toast copy
// page-side.
export async function postTracxnIngest(body: TracxnRequest): Promise<TracxnResponse> {
  const payload = stripUndefined(body as unknown as Record<string, unknown>);
  const resp = await apiClient.post<ApiEnvelope<TracxnResponse>>('/enrichment/tracxn', payload);
  return zTracxnResponse.parse(unwrap(resp.data, '/enrichment/tracxn'));
}

// PRD §7.14.1 — analytics overview KPIs.
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const resp = await apiClient.get<ApiEnvelope<AnalyticsOverview>>('/analytics/overview');
  return zAnalyticsOverview.parse(unwrap(resp.data, '/analytics/overview'));
}

// PRD §7.14.2 — LP funnel.
export async function getAnalyticsFunnelLp(): Promise<AnalyticsFunnelLp> {
  const resp = await apiClient.get<ApiEnvelope<AnalyticsFunnelLp>>('/analytics/funnel/lp');
  return zAnalyticsFunnelLp.parse(unwrap(resp.data, '/analytics/funnel/lp'));
}

// PRD §7.14.3 — startup funnel.
export async function getAnalyticsFunnelStartup(): Promise<AnalyticsFunnelStartup> {
  const resp = await apiClient.get<ApiEnvelope<AnalyticsFunnelStartup>>(
    '/analytics/funnel/startup',
  );
  return zAnalyticsFunnelStartup.parse(unwrap(resp.data, '/analytics/funnel/startup'));
}

// PRD §7.14.4 — connections funnel.
export async function getAnalyticsFunnelConnections(): Promise<AnalyticsFunnelConnections> {
  const resp = await apiClient.get<ApiEnvelope<AnalyticsFunnelConnections>>(
    '/analytics/funnel/connections',
  );
  return zAnalyticsFunnelConnections.parse(unwrap(resp.data, '/analytics/funnel/connections'));
}

// PRD §7.14.5 — cohort retention.
export async function getAnalyticsCohort(args: { months?: number }): Promise<AnalyticsCohort> {
  const params = new URLSearchParams();
  if (args.months !== undefined) params.set('months', String(args.months));
  const qs = params.toString();
  const url = `/analytics/cohort${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<AnalyticsCohort>>(url);
  return zAnalyticsCohort.parse(unwrap(resp.data, url));
}

// PRD §7.14.6 — match-success weekly.
export async function getAnalyticsMatchSuccess(): Promise<AnalyticsMatchSuccess> {
  const resp = await apiClient.get<ApiEnvelope<AnalyticsMatchSuccess>>('/analytics/match-success');
  return zAnalyticsMatchSuccess.parse(unwrap(resp.data, '/analytics/match-success'));
}

// PRD §7.13.5 — `GET /me/digest/recent`. Cursor-paginated; cursor = sent_at
// of the previous page's last item. Returns only `status='sent'` rows.
export async function listMyDigests(args: {
  limit?: number;
  cursor?: string | null;
}): Promise<MyDigestsResponse> {
  const params = new URLSearchParams();
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const qs = params.toString();
  const url = `/me/digest/recent${qs ? `?${qs}` : ''}`;
  const resp = await apiClient.get<ApiEnvelope<MyDigestsResponse>>(url);
  return zMyDigestsResponse.parse(unwrap(resp.data, url));
}

// PRD §7.13.6 — `GET /me/digest/preferences`.
export async function getMyDigestPreferences(): Promise<MyDigestPreferences> {
  const resp = await apiClient.get<ApiEnvelope<MyDigestPreferences>>('/me/digest/preferences');
  return zMyDigestPreferences.parse(unwrap(resp.data, '/me/digest/preferences'));
}

// PRD §7.13.7 — `PUT /me/digest/preferences`. PATCH-style; `extra='forbid'`
// on the backend — strip any undefined keys so the wire body stays clean.
export async function updateMyDigestPreferences(
  body: MyDigestPreferencesUpdate,
): Promise<MyDigestPreferences> {
  const payload = stripUndefined(body as unknown as Record<string, unknown>);
  const resp = await apiClient.put<ApiEnvelope<MyDigestPreferences>>(
    '/me/digest/preferences',
    payload,
  );
  return zMyDigestPreferences.parse(unwrap(resp.data, '/me/digest/preferences'));
}

// Phase 7.2.f — `GET /admin/pitches/inbound`.
export async function getAdminInboundPitches(args: {
  range: InboundPitchRange;
  cursor?: string;
  limit?: number;
}): Promise<InboundPitchesResponse> {
  const params = new URLSearchParams({ range: args.range });
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const url = `/admin/pitches/inbound?${params.toString()}`;
  const resp = await apiClient.get<ApiEnvelope<InboundPitchesResponse>>(url);
  return zInboundPitchesResponse.parse(unwrap(resp.data, url));
}

// Phase 7.2.f — `GET /admin/pitches/{startup_id}`.
// 404 when startup_id doesn't exist or isn't inbound (source_channel not in
// {web_form, email}). The detail endpoint scopes strictly to inbound rows.
export async function getAdminInboundPitchDetail(startupId: string): Promise<InboundPitchDetail> {
  const url = `/admin/pitches/${startupId}`;
  const resp = await apiClient.get<ApiEnvelope<InboundPitchDetail>>(url);
  return zInboundPitchDetail.parse(unwrap(resp.data, url));
}

// Phase 7.2.g — `GET /admin/mis-overview`.
export async function getAdminMisOverview(args: {
  range: MISOverviewRange;
  cursor?: string;
  limit?: number;
}): Promise<MISOverviewListResponse> {
  const params = new URLSearchParams({ range: args.range });
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.cursor) params.set('cursor', args.cursor);
  const url = `/admin/mis-overview?${params.toString()}`;
  const resp = await apiClient.get<ApiEnvelope<MISOverviewListResponse>>(url);
  return zMISOverviewListResponse.parse(unwrap(resp.data, url));
}

// Stage 6 S5 — `GET /admin/schedule/calendar`. days clamped to 1–60.
export async function getAdminCalendar(args: {
  from: string;
  days: number;
}): Promise<AdminCalendarResponse> {
  const days = Math.max(1, Math.min(60, args.days));
  const params = new URLSearchParams({ from: args.from, days: String(days) });
  const url = `/admin/schedule/calendar?${params.toString()}`;
  const resp = await apiClient.get<ApiEnvelope<AdminCalendarResponse>>(url);
  return zAdminCalendarResponse.parse(unwrap(resp.data, url));
}
