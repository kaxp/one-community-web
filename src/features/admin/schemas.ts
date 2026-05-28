import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

export const ADMIN_CONNECTION_STATUSES = [
  'pending_admin',
  'approved',
  'rejected_admin',
  'pending_target',
  'accepted',
  'declined',
] as const;
export type AdminConnectionStatus = (typeof ADMIN_CONNECTION_STATUSES)[number];
export const zAdminConnectionStatus = z.enum(ADMIN_CONNECTION_STATUSES);

export const ADMIN_TAB_STATUSES = [
  'pending_admin',
  'pending_target',
  'accepted',
  'declined',
] as const;
export type AdminTabStatus = (typeof ADMIN_TAB_STATUSES)[number];

const zPartyRef = z.object({
  user_id: zUUID,
  name: z.string().nullable(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
});
export type AdminConnectionParty = z.infer<typeof zPartyRef>;

export const zAdminConnection = z.object({
  connection_id: zUUID,
  status: zAdminConnectionStatus,
  requester: zPartyRef,
  target: zPartyRef,
  message: z.string().nullable().optional(),
  created_at: zISODateTime,
  responded_at: zISODateTime.nullable(),
});
export type AdminConnection = z.infer<typeof zAdminConnection>;

export const zAdminConnectionsResponse = z.object({
  items: z.array(zAdminConnection),
  next_cursor: z.string().nullable(),
});
export type AdminConnectionsResponse = z.infer<typeof zAdminConnectionsResponse>;

export const zAdminActionRequest = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});
export type AdminActionRequest = z.infer<typeof zAdminActionRequest>;

export const zAdminActionResponse = z.object({
  connection_id: zUUID,
  status: zAdminConnectionStatus,
  admin_id: zUUID,
  acted_at: zISODateTime,
});
export type AdminActionResponse = z.infer<typeof zAdminActionResponse>;

// PRD §7.12.1 — admin/summary KPI dashboard.
const zMisStatusRow = z.object({
  startup_id: zUUID,
  user_id: zUUID.nullable(),
  company_name: z.string(),
  period: z.string(),
  submitted: z.boolean(),
});
export type AdminMisStatusRow = z.infer<typeof zMisStatusRow>;

const zRecentDigestRow = z.object({
  id: zUUID,
  digest_type: z.string(),
  sent_at: zISODateTime,
});
export type AdminRecentDigest = z.infer<typeof zRecentDigestRow>;

const zRecentActionRow = z.object({
  admin_id: zUUID,
  admin_name: z.string().nullable(),
  action: z.string(),
  target_type: z.string(),
  target_id: zUUID,
  created_at: zISODateTime,
});
export type AdminRecentAction = z.infer<typeof zRecentActionRow>;

export const zAdminSummaryResponse = z.object({
  pending_connection_count: z.number().int().nonnegative(),
  mis_status: z.array(zMisStatusRow),
  recent_digests: z.array(zRecentDigestRow),
  recent_actions: z.array(zRecentActionRow),
});
export type AdminSummaryResponse = z.infer<typeof zAdminSummaryResponse>;

// PRD §7.12.7 / §7.12.8 — quarterly reports.
export const QUARTERLY_REPORT_STATUSES = ['pending', 'approved', 'sent'] as const;
export type QuarterlyReportStatus = (typeof QUARTERLY_REPORT_STATUSES)[number];
export const zQuarterlyReportStatus = z.enum(QUARTERLY_REPORT_STATUSES);

export const zQuarterlyReport = z.object({
  report_id: z.string().min(1),
  quarter: z.string(),
  status: zQuarterlyReportStatus,
  drive_url: z.string().nullable(),
  generated_at: zISODateTime,
  approved_by: zUUID.nullable(),
  approved_at: zISODateTime.nullable(),
  distributed_at: zISODateTime.nullable().optional(),
  recipient_count: z.number().int().nonnegative().optional(),
});
export type QuarterlyReport = z.infer<typeof zQuarterlyReport>;

export const zQuarterlyReportsResponse = z.array(zQuarterlyReport);
export type QuarterlyReportsResponse = z.infer<typeof zQuarterlyReportsResponse>;

export const zQuarterlyReportApproveRequest = z.object({
  report_id: z.string().min(1, 'report_id is required'),
});
export type QuarterlyReportApproveRequest = z.infer<typeof zQuarterlyReportApproveRequest>;

export const zQuarterlyReportApproveResponse = z.object({
  report_id: z.string(),
  status: zQuarterlyReportStatus,
  approved_by: zUUID.nullable(),
  approved_at: zISODateTime.nullable(),
  distribution_job_id: z.string().nullable().optional(),
});
export type QuarterlyReportApproveResponse = z.infer<typeof zQuarterlyReportApproveResponse>;

// PRD §7.12.9 / §7.12.10 — dead-letter queue (offset-paginated; the only
// endpoint that uses offset rather than cursor — §13 G10).
export const DLQ_RETRY_STATUSES = ['pending', 'retried', 'succeeded', 'abandoned'] as const;
export type DLQRetryStatus = (typeof DLQ_RETRY_STATUSES)[number];
export const zDLQRetryStatus = z.enum(DLQ_RETRY_STATUSES);

export const zDeadLetterJob = z.object({
  id: z.string().min(1),
  task_name: z.string(),
  task_id: z.string().nullable(),
  args: z.array(z.unknown()),
  kwargs: z.record(z.unknown()),
  exception_class: z.string(),
  exception_message: z.string().nullable(),
  traceback: z.string().nullable(),
  failed_at: zISODateTime,
  retried_at: zISODateTime.nullable(),
  retry_status: zDLQRetryStatus,
});
export type DeadLetterJob = z.infer<typeof zDeadLetterJob>;

// `data` is a bare array; pagination metadata lives on the envelope (§7.12.9).
export const zDeadLetterJobsResponse = z.array(zDeadLetterJob);
export type DeadLetterJobsResponse = z.infer<typeof zDeadLetterJobsResponse>;

export const zDeadLetterRetryResponse = z.object({
  dlq_id: z.string(),
  new_task_id: z.string(),
  retry_status: zDLQRetryStatus,
});
export type DeadLetterRetryResponse = z.infer<typeof zDeadLetterRetryResponse>;

// PRD §7.12.5 + §8.2 LPFunnelStatus — LP funnel.
export const LP_FUNNEL_STATUSES = [
  '1_new_lead',
  '2_first_reach_out',
  '3_in_conversation',
  '4_soft_commit',
  '5_invested',
] as const;
export type LPFunnelStatus = (typeof LP_FUNNEL_STATUSES)[number];
export const zLPFunnelStatus = z.enum(LP_FUNNEL_STATUSES);

export const zFunnelStatusRequest = z.object({
  status: zLPFunnelStatus,
  override: z.boolean().optional(),
});
export type FunnelStatusRequest = z.infer<typeof zFunnelStatusRequest>;

export const zFunnelStatusResponse = z.object({
  user_id: zUUID,
  funnel_status: zLPFunnelStatus,
  funnel_status_updated_at: zISODateTime,
  auto_actions_triggered: z.array(z.string()),
});
export type FunnelStatusResponse = z.infer<typeof zFunnelStatusResponse>;

// PRD §7.12.6 — partner-referral broadcast.
export const zPartnerReferralRequest = z.object({
  sector: z.string().trim().min(1, 'Sector is required'),
  message: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  startup_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type PartnerReferralRequest = z.infer<typeof zPartnerReferralRequest>;

export const zPartnerReferralResponse = z
  .object({
    partners_notified: z.number().int().nonnegative(),
    partner_ids: z.array(z.string()),
    sector: z.string(),
  })
  .passthrough();
export type PartnerReferralResponse = z.infer<typeof zPartnerReferralResponse>;

// Phase 7.2.f — inbound pitches list + drawer.
// .passthrough() per §13 G8 — tighten to .strict() when backend publishes
// the formal schema.

export const INBOUND_PITCH_SIGNALS = ['strong', 'moderate', 'weak'] as const;
export type InboundPitchSignal = (typeof INBOUND_PITCH_SIGNALS)[number];

export const INBOUND_PITCH_RANGES = ['weekly', 'monthly', 'yearly'] as const;
export type InboundPitchRange = (typeof INBOUND_PITCH_RANGES)[number];

export const SOURCE_CHANNELS = ['web_form', 'email'] as const;
export type InboundSourceChannel = (typeof SOURCE_CHANNELS)[number];

export const zInboundPitch = z
  .object({
    id: zUUID,
    company_name: z.string(),
    ai_pitch_score: z.number().nullable(),
    ai_pitch_summary: z.string().nullable(),
    ai_signal: z.enum(INBOUND_PITCH_SIGNALS).nullable(),
    created_at: zISODateTime,
    notion_page_id: z.string().nullable(),
    drive_folder_id: z.string().nullable(),
    source_channel: z.enum(SOURCE_CHANNELS).nullable(),
    // Phase 4 menu Phase C2 (2026-05-28): an inbound startup that also sent
    // a WA video pitch surfaces the click-through URL here too.
    wa_video_pitch_url: z.string().nullable().optional(),
    wa_video_pitch_received_at: zISODateTime.nullable().optional(),
  })
  .passthrough();
export type InboundPitch = z.infer<typeof zInboundPitch>;

export const zInboundPitchesResponse = z
  .object({
    items: z.array(zInboundPitch),
    next_cursor: z.string().nullable(),
  })
  .passthrough();
export type InboundPitchesResponse = z.infer<typeof zInboundPitchesResponse>;

// ── Phase 4 menu Phase C2 (2026-05-28): WA video pitches admin tab ────────

// Source channel may be anything (founded startups can have null/any) — keep open.
export const zVideoPitchItem = z
  .object({
    id: zUUID,
    company_name: z.string(),
    founder_name: z.string().nullable().optional(),
    sector: z.unknown().nullable().optional(),
    stage: z.string().nullable().optional(),
    wa_video_pitch_url: z.string().nullable(),
    wa_video_pitch_received_at: zISODateTime.nullable(),
    wa_video_pitch_media_id: z.string().nullable().optional(),
    wa_video_pitch_conversation_id: z.string().nullable().optional(),
    source_channel: z.string().nullable().optional(),
    notion_page_id: z.string().nullable().optional(),
    drive_folder_id: z.string().nullable().optional(),
  })
  .passthrough();
export type VideoPitchItem = z.infer<typeof zVideoPitchItem>;

export const zVideoPitchesResponse = z
  .object({
    items: z.array(zVideoPitchItem),
    next_cursor: z.string().nullable(),
  })
  .passthrough();
export type VideoPitchesResponse = z.infer<typeof zVideoPitchesResponse>;

const zPitchEvaluation = z
  .object({
    signal: z.string().nullable(),
    summary: z.string().nullable(),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    recommended_lp_types: z.array(z.string()),
    financial_health: z.string().nullable(),
    market_position: z.string().nullable(),
    competitive_landscape: z.string().nullable(),
    team_assessment: z.string().nullable(),
    key_risks: z.array(z.string()),
    indian_ecosystem_signals: z.string().nullable(),
    recommendation_rationale: z.string().nullable(),
  })
  .passthrough();
export type PitchEvaluation = z.infer<typeof zPitchEvaluation>;

export const zInboundPitchDetail = z
  .object({
    id: zUUID,
    company_name: z.string(),
    ai_pitch_score: z.number().nullable(),
    ai_pitch_summary: z.string().nullable(),
    ai_signal: z.enum(INBOUND_PITCH_SIGNALS).nullable(),
    created_at: zISODateTime,
    notion_page_id: z.string().nullable(),
    drive_folder_id: z.string().nullable(),
    source_channel: z.enum(SOURCE_CHANNELS).nullable(),
    founder_name: z.string().nullable(),
    founder_email: z.string().nullable(),
    founder_phone: z.string().nullable(),
    founder_linkedin: z.string().nullable(),
    sector: z.string().nullable(),
    stage: z.string().nullable(),
    founding_year: z.number().int().nullable(),
    team_size: z.number().int().nullable(),
    website_url: z.string().nullable(),
    description: z.string().nullable(),
    one_liner: z.string().nullable(),
    revenue_model: z.string().nullable(),
    revenue_monthly: z.number().nullable(),
    burn_monthly: z.number().nullable(),
    runway_months: z.number().nullable(),
    current_balance_inr: z.number().nullable(),
    growth_pct: z.number().nullable(),
    gross_margin_pct: z.number().nullable(),
    customer_count: z.number().int().nullable(),
    funding_target_cr: z.number().nullable(),
    pitch_deck_url: z.string().nullable(),
    evaluation: zPitchEvaluation.nullable(),
  })
  .passthrough();
export type InboundPitchDetail = z.infer<typeof zInboundPitchDetail>;

// Phase 7.2.g — admin MIS overview list.
// .passthrough() per §13 G8.
export const MIS_OVERVIEW_RANGES = ['monthly', 'quarterly', 'yearly'] as const;
export type MISOverviewRange = (typeof MIS_OVERVIEW_RANGES)[number];

export const zMISOverviewItem = z
  .object({
    id: zUUID,
    startup_id: zUUID,
    user_id: zUUID.nullable(),
    company_name: z.string(),
    period: z.string(),
    submitted_at: zISODateTime,
    file_url: z.string().nullable(),
    file_name: z.string().nullable(),
    comment: z.string().nullable(),
    revenue: z.number().nullable(),
    burn: z.number().nullable(),
    runway_months: z.number().nullable(),
    headcount: z.number().nullable(),
    notion_page_id: z.string().nullable(),
    drive_folder_id: z.string().nullable(),
    // Phase 4 menu Phase C2 (2026-05-28): WA upload provenance. When set,
    // file_url points at the Kapso conversation URL (click-through to view).
    wa_conversation_id: z.string().nullable().optional(),
    wa_media_id: z.string().nullable().optional(),
  })
  .passthrough();
export type MISOverviewItem = z.infer<typeof zMISOverviewItem>;

export const zMISPendingItem = z.object({
  startup_id: zUUID,
  user_id: zUUID.nullable(),
  company_name: z.string(),
});
export type MISPendingItem = z.infer<typeof zMISPendingItem>;

export const zMISOverviewListResponse = z
  .object({
    items: z.array(zMISOverviewItem),
    next_cursor: z.string().nullable(),
    pending: z.array(zMISPendingItem).default([]),
  })
  .passthrough();
export type MISOverviewListResponse = z.infer<typeof zMISOverviewListResponse>;

// ── App runtime config (feature flags) ──────────────────────────────────────

// ── Admin Users tab ──────────────────────────────────────────────────────────

export const USER_SORT_OPTIONS = ['created_at', 'updated_at', 'name', 'role'] as const;
export type UserSortOption = (typeof USER_SORT_OPTIONS)[number];

export const zAdminUserListItem = z
  .object({
    id: zUUID,
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    role: zUserRole,
    organisation: z.string().nullable(),
    designation: z.string().nullable(),
    created_at: zISODateTime,
    updated_at: zISODateTime.nullable(),
  })
  .passthrough();
export type AdminUserListItem = z.infer<typeof zAdminUserListItem>;

export const zAdminUsersResponse = z
  .object({
    items: z.array(zAdminUserListItem),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type AdminUsersResponse = z.infer<typeof zAdminUsersResponse>;

export const zAdminFounderListItem = z
  .object({
    id: zUUID,
    startup_id: zUUID.nullable(),
    name: z.string().nullable(),
    position: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    description: z.string().nullable(),
    notion_page_id: z.string().nullable(),
    created_at: zISODateTime,
    updated_at: zISODateTime.nullable(),
  })
  .passthrough();
export type AdminFounderListItem = z.infer<typeof zAdminFounderListItem>;

export const zAdminFoundersResponse = z
  .object({
    items: z.array(zAdminFounderListItem),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type AdminFoundersResponse = z.infer<typeof zAdminFoundersResponse>;

export const zAdminUserUpdateRequest = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  role: zUserRole.optional(),
  organisation: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  poc: z.string().trim().optional(),
});
export type AdminUserUpdateRequest = z.infer<typeof zAdminUserUpdateRequest>;

export const zAdminUserUpdateResponse = z
  .object({
    id: zUUID,
    name: z.string().nullable(),
    role: zUserRole,
    updated_at: zISODateTime.nullable(),
  })
  .passthrough();
export type AdminUserUpdateResponse = z.infer<typeof zAdminUserUpdateResponse>;

export const zAdminUserDeleteResponse = z.object({
  deleted: z.boolean(),
  user_id: zUUID,
});
export type AdminUserDeleteResponse = z.infer<typeof zAdminUserDeleteResponse>;

// ── Admin Startups tab ────────────────────────────────────────────────────────

export const STARTUP_SORT_OPTIONS = ['created_at', 'company_name', 'stage', 'status'] as const;
export type StartupSortOption = (typeof STARTUP_SORT_OPTIONS)[number];

export const zAdminStartupListItem = z
  .object({
    id: zUUID,
    user_id: zUUID.nullable(),
    company_name: z.string(),
    sector: z.array(z.string()),
    stage: z.string().nullable(),
    status: z.string().nullable(),
    founder_name: z.string().nullable(),
    website_url: z.string().nullable(),
    created_at: zISODateTime,
  })
  .passthrough();
export type AdminStartupListItem = z.infer<typeof zAdminStartupListItem>;

export const zAdminStartupsResponse = z
  .object({
    items: z.array(zAdminStartupListItem),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type AdminStartupsResponse = z.infer<typeof zAdminStartupsResponse>;

// Referrals schemas (existing, keeping in place)

export const zAppConfigItem = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  updated_at: z.string().nullable().optional(),
});
export type AppConfigItem = z.infer<typeof zAppConfigItem>;

export const zAppConfigListResponse = z.object({
  items: z.array(zAppConfigItem),
});
export type AppConfigListResponse = z.infer<typeof zAppConfigListResponse>;

// ── LP CRM (LP Funnel relationship tracking) ─────────────────────────────────

export const LP_CRM_NOTE_TYPES = ['follow_up', 'meeting', 'call', 'deck_shared'] as const;
export type LpCrmNoteType = (typeof LP_CRM_NOTE_TYPES)[number];

export const LP_CRM_NOTE_LABELS: Record<LpCrmNoteType, string> = {
  follow_up: 'Follow-up',
  meeting: 'Meeting',
  call: 'Call',
  deck_shared: 'Deck Shared',
};

export const LP_CRM_ROLE_FILTER = ['lp', 'potential_lp'] as const;
export type LpCrmRoleFilter = (typeof LP_CRM_ROLE_FILTER)[number];

export const LP_CRM_SORT = ['last_activity', 'name'] as const;
export type LpCrmSort = (typeof LP_CRM_SORT)[number];

export const zLpCrmListItem = z
  .object({
    id: zUUID,
    name: z.string().nullable(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable(),
    organisation: z.string().nullable(),
    role: zUserRole,
    fund_name: z.string().nullable(),
    funnel_status: z.string().nullable(),
    poc: z.string().nullable(),
    last_meeting_date: z.string().nullable(),
    last_comment: z.string().nullable(),
    next_follow_up: z.string().nullable().optional(),
    created_at: zISODateTime,
  })
  .passthrough();
export type LpCrmListItem = z.infer<typeof zLpCrmListItem>;

export const zLpCrmListResponse = z
  .object({
    items: z.array(zLpCrmListItem),
    total: z.number().int().nonnegative(),
  })
  .passthrough();
export type LpCrmListResponse = z.infer<typeof zLpCrmListResponse>;

export const zLpCrmDetail = z
  .object({
    id: zUUID,
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    organisation: z.string().nullable(),
    designation: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    role: zUserRole,
    fund_name: z.string().nullable(),
    aum_cr: z.number().nullable(),
    cheque_range_min: z.number().nullable(),
    cheque_range_max: z.number().nullable(),
    sectors: z.array(z.string()),
    stages: z.array(z.string()),
    geography: z.array(z.string()),
    funnel_status: z.string().nullable(),
    poc: z.string().nullable(),
    description: z.string().nullable(),
    first_meeting_date: z.string().nullable(),
    last_meeting_date: z.string().nullable(),
  })
  .passthrough();
export type LpCrmDetail = z.infer<typeof zLpCrmDetail>;

export const zLpCrmNote = z
  .object({
    id: zUUID,
    lp_user_id: zUUID,
    admin_user_id: zUUID.nullable(),
    admin_name: z.string().nullable(),
    note_type: z.enum(LP_CRM_NOTE_TYPES),
    note_date: z.string(),
    comment: z.string(),
    follow_up_date: z.string().nullable().optional(),
    created_at: zISODateTime,
  })
  .passthrough();
export type LpCrmNote = z.infer<typeof zLpCrmNote>;

export const zLpCrmNotesResponse = z.object({ items: z.array(zLpCrmNote) }).passthrough();
export type LpCrmNotesResponse = z.infer<typeof zLpCrmNotesResponse>;

export const zLpCrmNoteCreate = z.object({
  note_type: z.enum(LP_CRM_NOTE_TYPES),
  note_date: z.string().min(1),
  comment: z.string().trim().optional().default(''),
  follow_up_date: z.string().nullable().optional(),
});
export type LpCrmNoteCreate = z.infer<typeof zLpCrmNoteCreate>;
