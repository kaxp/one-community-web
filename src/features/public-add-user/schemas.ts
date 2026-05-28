import { z } from 'zod';

// Phase 4 menu Phase C1 (2026-05-28) — public Join Community form.
// Mirrors backend modules/onboarding/public_router.py::PublicAddUserRequest
// + the WhatsApp Join Community Flow payload (docs/wa_flows/join_community_flow.json).

export const PUBLIC_ADD_USER_ROLES = [
  'lp',
  'potential_lp',
  'partner',
  'vc',
  'advisor',
  'family_office',
  'other',
] as const;
export type PublicAddUserRole = (typeof PUBLIC_ADD_USER_ROLES)[number];

export const PUBLIC_ADD_USER_ROLE_LABELS: Record<PublicAddUserRole, string> = {
  lp: 'Limited Partner',
  potential_lp: 'Potential LP / exploring',
  partner: 'Channel partner',
  vc: 'VC / institutional fund',
  advisor: 'Advisor / mentor',
  family_office: 'Family office',
  other: 'Other',
};

// Empty <input> renders an empty string in RHF, not undefined. We want the
// API payload to OMIT the field rather than send "" — so transform empty
// strings to undefined and mark optional.
const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? undefined : v))
    .optional();

export const zPublicAddUserForm = z.object({
  // --- Required ---
  name: z.string().trim().min(1, 'Required').max(120),
  email: z
    .string()
    .trim()
    .min(1, 'Required')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address'),
  role: z.enum(PUBLIC_ADD_USER_ROLES, { required_error: 'Required' }),
  // --- Optional ---
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-().]{7,24}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  organisation: optStr(200),
  linkedin_url: z
    .string()
    .trim()
    .url('Enter a valid URL (https://…)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  city: optStr(100),
  message: optStr(1000),
});

export type PublicAddUserFormValues = z.input<typeof zPublicAddUserForm>;
export type PublicAddUserInput = z.output<typeof zPublicAddUserForm>;

export const zPublicAddUserSuccess = z
  .object({
    signup_id: z.string(),
    status: z.string(),
  })
  .passthrough();
export type PublicAddUserSuccess = z.infer<typeof zPublicAddUserSuccess>;

export type PublicAddUserResult =
  | { kind: 'success'; data: PublicAddUserSuccess }
  | { kind: 'rate_limited' }
  | { kind: 'invalid_email' }
  | { kind: 'validation_error'; fieldErrors: Record<string, string> }
  | { kind: 'server_error'; message: string };
