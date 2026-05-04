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
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
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
  admin_name: z.string(),
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
