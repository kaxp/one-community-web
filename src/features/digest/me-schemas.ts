import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';

// PRD §7.13.5–7.13.7 — user-facing digest endpoints (all 10 roles).
// Per [P-22]: backend is live; these schemas mirror the final contracts.

// §7.13.5 — `GET /me/digest/recent`. Cursor-paginated by sent_at.
export const zMyDigestRow = z.object({
  id: zUUID,
  digest_type: z.string(),
  subject: z.string().nullable(),
  segment: z.string().nullable(),
  // 280-char plain-text preview used in the list card.
  html_snippet: z.string().nullable(),
  // Full HTML newsletter body — rendered in an iframe in the detail sheet.
  html_body: z.string().nullable().optional(),
  sent_at: zISODateTime.nullable(),
});
export type MyDigestRow = z.infer<typeof zMyDigestRow>;

export const zMyDigestsResponse = z.object({
  items: z.array(zMyDigestRow),
  next_cursor: z.string().nullable(),
});
export type MyDigestsResponse = z.infer<typeof zMyDigestsResponse>;

// §7.13.6 — `GET /me/digest/preferences`.
// Use z.literal union (not z.enum) as specified — easiest to subtype later.
export const zDigestFrequency = z.union([
  z.literal('weekly'),
  z.literal('monthly'),
  z.literal('paused'),
]);
export type DigestFrequency = z.infer<typeof zDigestFrequency>;
export const DIGEST_FREQUENCIES = ['weekly', 'monthly', 'paused'] as const;

export const zMyDigestPreferences = z.object({
  frequency: zDigestFrequency,
  interest_tags: z.array(z.string()),
  opted_in_wa: z.boolean(),
});
export type MyDigestPreferences = z.infer<typeof zMyDigestPreferences>;

// §7.13.7 — `PUT /me/digest/preferences`. All fields optional (PATCH-style);
// extra keys are rejected by the backend (`ConfigDict(extra='forbid')`).
// We use `.strict()` so the client schema mirrors that discipline and any
// accidental extra key produces a Zod error before the wire call.
export const zMyDigestPreferencesUpdate = z
  .object({
    frequency: zDigestFrequency.optional(),
    interest_tags: z.array(z.string()).optional(),
    opted_in_wa: z.boolean().optional(),
  })
  .strict();
export type MyDigestPreferencesUpdate = z.infer<typeof zMyDigestPreferencesUpdate>;

// The server returns the full preferences shape (same as GET) on PUT success.
// We reuse `zMyDigestPreferences` as the response type.

// RHF input shape for the preferences form. The form always submits the full
// set of current values so the wire body is always deterministic.
export const zPreferencesForm = z.object({
  frequency: zDigestFrequency,
  interest_tags: z.array(z.string()),
  opted_in_wa: z.boolean(),
});
export type PreferencesForm = z.infer<typeof zPreferencesForm>;
