import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

export const STARTUP_STAGES = [
  'ideation',
  'pre_seed',
  'seed',
  'early_growth',
  'pre_a',
  'series_a',
  'pre_b',
  'series_b',
  'late_growth',
] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const zProfileUpdateRequest = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    email: z
      .string()
      .trim()
      .email('Enter a valid email')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    organisation: optionalString(200),
    designation: optionalString(200),
    linkedin_url: z
      .string()
      .trim()
      .url('Enter a valid URL')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .strict();
export type ProfileUpdateRequest = z.infer<typeof zProfileUpdateRequest>;

export const zProfileUpdateResponse = z.object({
  user_id: zUUID,
  name: z.string().nullable(),
  role: zUserRole,
  profile_complete: z.boolean(),
});
export type ProfileUpdateResponse = z.infer<typeof zProfileUpdateResponse>;

export const zLPProfileRequest = z
  .object({
    fund_name: optionalString(200),
    aum_crore: z.number().nonnegative().optional(),
    thesis: optionalString(2000),
    preferred_sectors: z.array(z.string().trim().toLowerCase().min(1)),
    preferred_stages: z.array(z.enum(STARTUP_STAGES)),
    geography: z.array(z.string().trim().min(1)),
    ticket_size_min_cr: z.number().nonnegative().optional(),
    ticket_size_max_cr: z.number().nonnegative().optional(),
    co_invest_interest: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.ticket_size_min_cr === undefined ||
      v.ticket_size_max_cr === undefined ||
      v.ticket_size_min_cr <= v.ticket_size_max_cr,
    { message: 'Min ticket size must be ≤ max', path: ['ticket_size_max_cr'] },
  );
export type LPProfileRequest = z.infer<typeof zLPProfileRequest>;

export const zLPProfileResponse = z.object({
  user_id: zUUID,
  fund_name: z.string().nullable(),
  profile_complete: z.boolean(),
});
export type LPProfileResponse = z.infer<typeof zLPProfileResponse>;
