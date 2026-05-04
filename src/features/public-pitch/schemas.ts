import { z } from 'zod';

// Stage 6 S8 — public pitch submission form + API schemas.
// Mirrors Phase 7.2.a InboundPitchRequest from one-community-1.

export const PITCH_STAGES = [
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
export type PitchStage = (typeof PITCH_STAGES)[number];

export const PITCH_STAGE_LABELS: Record<PitchStage, string> = {
  ideation: 'Ideation',
  pre_seed: 'Pre-seed',
  seed: 'Seed',
  early_growth: 'Early growth',
  pre_a: 'Pre-A',
  series_a: 'Series A',
  pre_b: 'Pre-B',
  series_b: 'Series B',
  late_growth: 'Late growth',
};

// Client-side Zod schema (strict types for RHF valueAsNumber fields).
// Optional numeric fields use `.or(z.nan())` and transform NaN → undefined
// so blank <input type="number"> fields don't surface Zod errors.
const optNum = () =>
  z
    .number()
    .optional()
    .transform((v) => (v !== undefined && Number.isNaN(v) ? undefined : v));

const optInt = () =>
  z
    .number()
    .int()
    .optional()
    .transform((v) => (v !== undefined && Number.isNaN(v) ? undefined : v));

const optUrl = () =>
  z
    .string()
    .trim()
    .url('Enter a valid URL (https://…)')
    .optional()
    .or(z.literal('').transform(() => undefined));

export const zPublicPitchForm = z.object({
  // --- Required ---
  company_name: z.string().trim().min(1, 'Required').max(200),
  founder_name: z.string().trim().min(1, 'Required').max(200),
  email: z
    .string()
    .trim()
    .min(1, 'Required')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address'),
  sector: z.string().trim().min(1, 'Required'),
  stage: z.enum(PITCH_STAGES, { required_error: 'Required' }),
  tagline: z.string().trim().min(1, 'Required').max(280),
  description: z.string().trim().min(1, 'Required').max(4000),
  founding_year: z
    .number()
    .int()
    .min(1900, 'Must be 1900 or later')
    .max(new Date().getFullYear(), 'Cannot be in the future'),

  // --- Optional ---
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  website_url: optUrl(),
  team_size: optInt(),
  ask_amount_cr: optNum(),
  revenue_model: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  revenue_inr: optNum(),
  growth_pct: optNum(),
  burn_rate_inr: optNum(),
  runway_months: optInt(),
  current_balance_inr: optNum(),
  gross_margin_pct: optNum(),
  customer_count: optInt(),
  deck_url: optUrl(),
});

export type PublicPitchFormValues = z.input<typeof zPublicPitchForm>;
export type PublicPitchInput = z.output<typeof zPublicPitchForm>;

// API response schemas (.passthrough per §13 G8)
export const zPublicPitchSuccess = z
  .object({
    pitch_id: z.string(),
    status: z.enum(['received', 'duplicate']),
    drive_folder_id: z.string().nullable(),
  })
  .passthrough();
export type PublicPitchSuccess = z.infer<typeof zPublicPitchSuccess>;

// Discriminated result that the API client returns.
export type PublicPitchResult =
  | { kind: 'success'; data: PublicPitchSuccess }
  | { kind: 'rate_limited' }
  | { kind: 'validation_error'; fieldErrors: Record<string, string> }
  | { kind: 'server_error'; message: string };
