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
