import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';

// PRD §7.12.3 — `GET /admin/digest`. Backend returns `data: WorkflowRow[]`
// (bare array, no envelope items wrapper).

export const DIGEST_WORKFLOW_STATUSES = ['active', 'paused'] as const;
export const zDigestWorkflowStatus = z.enum(DIGEST_WORKFLOW_STATUSES);
export type DigestWorkflowStatus = (typeof DIGEST_WORKFLOW_STATUSES)[number];

const zDigestLastSend = z.object({
  digest_id: zUUID,
  sent_at: zISODateTime,
  message_count: z.number().int().nonnegative(),
});

export const zDigestWorkflow = z.object({
  workflow_name: z.string(),
  status: zDigestWorkflowStatus,
  target_roles: z.array(z.string()),
  schedule: z.string(),
  last_send: zDigestLastSend.nullable(),
});
export type DigestWorkflow = z.infer<typeof zDigestWorkflow>;

export const zAdminDigestResponse = z.array(zDigestWorkflow);
export type AdminDigestResponse = z.infer<typeof zAdminDigestResponse>;

// PRD §7.12.4 — `POST /admin/digest/send`. §13 G4 says we should accept
// extra fields; treat the response as additive via `.passthrough()`.
export const zDigestSendRequest = z.object({
  workflow_name: z.string().min(1, 'Workflow name is required'),
});
export type DigestSendRequest = z.infer<typeof zDigestSendRequest>;

export const zDigestSendResponse = z
  .object({
    workflow_name: z.string(),
    triggered_at: zISODateTime.optional(),
    message_count: z.number().int().nonnegative().optional(),
    digest_id: zUUID.optional(),
  })
  .passthrough();
export type DigestSendResponse = z.infer<typeof zDigestSendResponse>;

// PRD §7.13 — digest content (pending + history rows).
export const DIGEST_CONTENT_STATUSES = ['pending', 'approved', 'sent'] as const;
export const zDigestContentStatus = z.enum(DIGEST_CONTENT_STATUSES);
export type DigestContentStatus = (typeof DIGEST_CONTENT_STATUSES)[number];

// `content` for pending rows includes `html` + `plain` + tags. History rows
// trim `html` / `plain` server-side so we model both via partial fields.
const zDigestContent = z
  .object({
    status: zDigestContentStatus,
    subject: z.string(),
    html: z.string().nullable().optional(),
    plain: z.string().nullable().optional(),
    segment: z.string().nullable().optional(),
    interest_tags: z.array(z.string()).nullable().optional(),
  })
  .passthrough();
export type DigestContent = z.infer<typeof zDigestContent>;

export const zDigestRow = z.object({
  id: zUUID,
  user_id: zUUID,
  digest_type: z.string(),
  content: zDigestContent,
  sent_at: zISODateTime.nullable(),
});
export type DigestRow = z.infer<typeof zDigestRow>;

export const zDigestPendingResponse = z.array(zDigestRow);
export type DigestPendingResponse = z.infer<typeof zDigestPendingResponse>;

export const zDigestHistoryResponse = z.array(zDigestRow);
export type DigestHistoryResponse = z.infer<typeof zDigestHistoryResponse>;

// PRD §7.13.1 — generate.
export const zDigestGenerateRequest = z.object({
  segment: z.string().min(1, 'Segment is required'),
});
export type DigestGenerateRequest = z.infer<typeof zDigestGenerateRequest>;

export const zDigestGenerateResponse = z.object({
  generated_count: z.number().int().nonnegative(),
  segment: z.string(),
  digest_ids: z.array(zUUID),
});
export type DigestGenerateResponse = z.infer<typeof zDigestGenerateResponse>;

// PRD §7.13.2 — approve.
export const zDigestApproveRequest = z.object({
  digest_id: zUUID,
});
export type DigestApproveRequest = z.infer<typeof zDigestApproveRequest>;

export const zDigestApproveResponse = z.object({
  sent: z.boolean(),
  digest_id: zUUID,
  queued_at: zISODateTime,
});
export type DigestApproveResponse = z.infer<typeof zDigestApproveResponse>;
