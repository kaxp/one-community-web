import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

// PRD §7.7.3 + §13 G11 — "Who viewed me" feature.
//
// PII rule (G11): the Zod schema below intentionally does NOT include
// `email` or `phone`. Even if the backend later expands the response,
// this schema acts as a parse-time firewall: extra keys are stripped
// silently by Zod's default behaviour (without `.passthrough()`), so
// the typed object handed to the UI cannot carry leaked PII. The lint
// regression test (`pii-discipline.test.ts`) is the second layer.
export const zViewerProfile = z.object({
  user_id: zUUID,
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable(),
  avatar_url: z.string().nullable(),
});
export type ViewerProfile = z.infer<typeof zViewerProfile>;

export const zProfileViewerItem = z.object({
  viewer: zViewerProfile,
  viewed_at: zISODateTime,
});
export type ProfileViewerItem = z.infer<typeof zProfileViewerItem>;

export const zProfileViewersResponse = z.object({
  items: z.array(zProfileViewerItem),
  next_cursor: z.string().nullable(),
});
export type ProfileViewersResponse = z.infer<typeof zProfileViewersResponse>;
