import { z } from 'zod';
import { zUUID, zE164 } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';
import { STARTUP_STAGES } from '@/features/onboarding/schemas';
import { isStartupRole } from '@/lib/role-capabilities';

// PRD §7.5.1 — `GET /profile/{id}`. Gap-flagged via VITE_PROFILE_V1_ENABLED (§13.2 G1).
//
// Many fields are optional / nullable so the same schema parses cleanly across
// the three viewer states the PRD documents:
//   • viewer-without-connection — descriptive fields present, contact null.
//   • accepted-connection — contact populated.
//   • partner viewer — most descriptive fields stripped server-side (§8.12.3).

export const zStartupBlock = z
  .object({
    company_name: z.string().nullable().optional(),
    sector: z.string().nullable().optional(),
    stage: z.enum(STARTUP_STAGES).nullable().optional(),
    description: z.string().nullable().optional(),
    founding_year: z.number().int().nullable().optional(),
    team_size: z.number().int().nullable().optional(),
    traction: z.string().nullable().optional(),
    ask_amount_cr: z.number().nullable().optional(),
    website_url: z.string().url().nullable().optional(),
  })
  .strict();
export type StartupBlock = z.infer<typeof zStartupBlock>;

export const zLPBlock = z
  .object({
    fund_name: z.string().nullable().optional(),
    aum_cr: z.number().nullable().optional(),
    cheque_range_min: z.number().nullable().optional(),
    cheque_range_max: z.number().nullable().optional(),
    sectors: z.array(z.string()).optional(),
    stages: z.array(z.string()).optional(),
    geography: z.array(z.string()).optional(),
    co_invest_interest: z.boolean().nullable().optional(),
  })
  .strict();
export type LPBlock = z.infer<typeof zLPBlock>;

// PRD §7.5.1: VC gets a `vc_profile` whose shape is TBD. Treat as a nullable
// passthrough object so the parser doesn't reject unknown VC fields.
export const zVCBlock = z.record(z.unknown());
export type VCBlock = z.infer<typeof zVCBlock>;

export const zContact = z
  .object({
    email: z.string().email().nullable().optional(),
    phone: zE164.nullable().optional(),
    linkedin_url: z.string().url().nullable().optional(),
    verified: z.boolean().optional(),
  })
  .strict();
export type Contact = z.infer<typeof zContact>;

export const zViewerInteraction = z
  .object({
    has_requested: z.boolean(),
    has_connected: z.boolean(),
  })
  .strict();
export type ViewerInteraction = z.infer<typeof zViewerInteraction>;

export const zProfileView = z.object({
  user_id: zUUID,
  role: zUserRole,
  name: z.string(),
  avatar_url: z.string().nullable().optional(),
  organisation: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  startup: zStartupBlock.nullable().optional(),
  lp_profile: zLPBlock.nullable().optional(),
  vc_profile: zVCBlock.nullable().optional(),
  contact: zContact.nullable().optional(),
  can_request_connect: z.boolean(),
  viewer_interaction: zViewerInteraction,
});
export type ProfileView = z.infer<typeof zProfileView>;

export function profileTargetType(role: ProfileView['role']): 'lp' | 'startup' {
  return isStartupRole(role) ? 'startup' : 'lp';
}
