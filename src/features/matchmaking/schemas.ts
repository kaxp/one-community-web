import { z } from 'zod';
import { zUUID, zISODate } from '@/lib/zod-helpers';

// PRD §7.8.5 / §7.8.6 / §8.8 — matchmaking suggestions (user-facing).

export const SUGGESTION_STATUSES = ['pending', 'approved', 'rejected', 'skipped'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export const zSuggestionStatus = z.enum(SUGGESTION_STATUSES);

// PRD §7.8.5 — same item shape as §7.8.4. `score` and the hydrated startup
// fields are nullable; reason can be a missing GPT-4o trace.
export const zMatchSuggestion = z.object({
  id: zUUID,
  lp_id: zUUID,
  startup_id: zUUID,
  // startup_user_id is users.id for the startup — needed for /search/profile/:id.
  // startup_id is the startups table PK, which is a different UUID.
  startup_user_id: z.string().nullable().optional(),
  score: z.number().nullable(),
  reason: z.string().nullable(),
  status: zSuggestionStatus,
  week_of: zISODate,
  company_name: z.string().nullable(),
  sector: z.string().nullable(),
  one_liner: z.string().nullable(),
});
export type MatchSuggestion = z.infer<typeof zMatchSuggestion>;

// PRD §7.8.5 — `data` is a bare array (no `{ items }` envelope).
export const zMatchSuggestionsResponse = z.array(zMatchSuggestion);
export type MatchSuggestionsResponse = z.infer<typeof zMatchSuggestionsResponse>;

// PRD §7.8.6 — respond payload + result.
export const RESPOND_ACTIONS = ['accepted', 'rejected', 'skipped'] as const;
export type RespondAction = (typeof RESPOND_ACTIONS)[number];
export const zRespondAction = z.enum(RESPOND_ACTIONS);

export const zRespondRequest = z.object({
  action: zRespondAction,
});
export type RespondRequest = z.infer<typeof zRespondRequest>;

export const zRespondResult = z.object({
  suggestion_id: zUUID,
  action: zRespondAction,
  connection_created: z.boolean(),
  connection_id: zUUID.nullable(),
});
export type RespondResult = z.infer<typeof zRespondResult>;

// PRD §7.8.1 — admin starts a generation job.
export const zMatchGenerateRequest = z.object({
  week_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-MM-dd'),
});
export type MatchGenerateRequest = z.infer<typeof zMatchGenerateRequest>;

export const zMatchGenerateAck = z.object({
  job_id: zUUID,
  status: z.literal('queued'),
  week_of: z.string(),
});
export type MatchGenerateAck = z.infer<typeof zMatchGenerateAck>;

// PRD §7.8.2 — Celery job poll (mirrors §7.3.4 deck job shape).
export const MATCH_JOB_STATES = [
  'PENDING',
  'STARTED',
  'SUCCESS',
  'FAILURE',
  'RETRY',
  'REVOKED',
] as const;
export const zMatchJobState = z.enum(MATCH_JOB_STATES);

export const zMatchGenerateResult = z.object({
  generated_count: z.number().int().nonnegative(),
  week_of: z.string(),
});
export type MatchGenerateResult = z.infer<typeof zMatchGenerateResult>;

export const zMatchJobStatus = z.object({
  job_id: zUUID,
  state: zMatchJobState,
  ready: z.boolean(),
  successful: z.boolean().nullable(),
  result: zMatchGenerateResult.nullable(),
});
export type MatchJobStatus = z.infer<typeof zMatchJobStatus>;

// PRD §7.8.3 — admin approve.
export const zMatchApproveRequest = z.object({
  suggestion_id: zUUID,
});
export type MatchApproveRequest = z.infer<typeof zMatchApproveRequest>;

export const zMatchApproveResponse = z.object({
  suggestion_id: zUUID,
  status: z.literal('approved'),
  approved_at: z.string().datetime({ offset: true }),
});
export type MatchApproveResponse = z.infer<typeof zMatchApproveResponse>;

// PRD §7.8.4 — admin pending list (same item shape as §7.8.5).
export const zMatchPendingResponse = z.array(zMatchSuggestion);
export type MatchPendingResponse = z.infer<typeof zMatchPendingResponse>;
