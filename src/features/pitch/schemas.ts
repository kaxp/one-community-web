import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';
import { STARTUP_STAGES } from '@/features/onboarding/schemas';

// Re-export so feature consumers don't need to know the stage enum lives in
// onboarding.
export { STARTUP_STAGES };

// PRD §7.3.1–§7.3.4 — startup pitch profile + deck eval.

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const optionalUrl = () =>
  z
    .string()
    .trim()
    .url('Enter a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined));

// `<input type="number">` fed through `valueAsNumber` produces `NaN` on empty
// input. Treat NaN as "unset" so blank optional fields don't surface a Zod
// error before the user even types. We don't use `z.preprocess` because that
// erases the schema's input type (becomes `unknown`) and the form generic
// then can't infer `Partial<TInput>` cleanly under `exactOptionalPropertyTypes`.
const optionalPositiveNumber = (min = 0) =>
  z
    .number()
    .refine((v) => Number.isNaN(v) || v >= min, { message: `Must be at least ${min}` })
    .optional()
    .transform((v) => (v !== undefined && Number.isNaN(v) ? undefined : v));

const optionalInt = (min: number, max: number) =>
  z
    .number()
    .refine((v) => Number.isNaN(v) || (Number.isInteger(v) && v >= min && v <= max), {
      message: `Whole number ${min}–${max}`,
    })
    .optional()
    .transform((v) => (v !== undefined && Number.isNaN(v) ? undefined : v));

// PRD §7.3.1 request body. `name` required; everything else optional.
export const zStartupProfileRequest = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    tagline: optionalString(280),
    sector: optionalString(120),
    stage: z.enum(STARTUP_STAGES).optional(),
    website_url: optionalUrl(),
    description: optionalString(5000),
    founding_year: optionalInt(1900, new Date().getFullYear()),
    team_size: optionalInt(0, 100_000),
    revenue_model: optionalString(1000),
    traction: optionalString(1000),
    ask_amount_cr: optionalPositiveNumber(0),
    // Financial metrics — moved from MIS (decisions.md [P-23])
    revenue_monthly: optionalPositiveNumber(0), // INR rupees
    burn_monthly: optionalPositiveNumber(0), // INR rupees
    runway_months: optionalPositiveNumber(0), // months
  })
  .strict();
export type StartupProfileRequest = z.infer<typeof zStartupProfileRequest>;

// PRD §7.3.1 response (and §7.3.2 success).
export const zStartupProfileResponse = z.object({
  startup_id: zUUID,
  user_id: zUUID,
  name: z.string(),
  tagline: z.string().nullable().optional(),
  sector: z
    .union([z.string(), z.array(z.string()).transform((arr) => arr.join(', '))])
    .nullable()
    .optional(),
  stage: z.enum(STARTUP_STAGES).nullable().optional(),
  deck_url: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  founding_year: z.number().int().nullable().optional(),
  team_size: z.number().int().nullable().optional(),
  revenue_model: z.string().nullable().optional(),
  traction: z.string().nullable().optional(),
  ask_amount_cr: z.number().nullable().optional(),
  notion_page_id: z.string().nullable().optional(),
  // Financial metrics — moved from MIS (decisions.md [P-23])
  revenue_monthly: z.number().nonnegative().nullable().optional(),
  burn_monthly: z.number().nonnegative().nullable().optional(),
  runway_months: z.number().nonnegative().nullable().optional(),
});
export type StartupProfileResponse = z.infer<typeof zStartupProfileResponse>;

// Discriminated union: `useStartupProfile` unwraps a 404 into this so the
// route can branch on `status === 'missing'` (PRD §7.3.2 — 404 is a domain
// signal, not an ErrorState surface).
export type StartupProfileResult =
  | { status: 'missing' }
  | { status: 'present'; data: StartupProfileResponse };

// PRD §7.3.3 deck submit.
export const zDeckUploadRequest = z
  .object({
    deck_url: z.string().trim().url('Paste a valid Google Drive URL'),
  })
  .strict();
export type DeckUploadRequest = z.infer<typeof zDeckUploadRequest>;

export const zDeckUploadAck = z.object({
  startup_id: zUUID,
  deck_url: z.string().url(),
  job_id: zUUID,
  status: z.literal('queued'),
});
export type DeckUploadAck = z.infer<typeof zDeckUploadAck>;

// PRD §7.3.4 — AI evaluation result, embedded in `JobPollResult.result`.
export const AI_SIGNALS = ['strong', 'moderate', 'weak'] as const;
export type AISignal = (typeof AI_SIGNALS)[number];

export const zAIEvaluationResult = z.object({
  signal: z.enum(AI_SIGNALS),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  recommended_lp_types: z.array(z.string()),
});
export type AIEvaluationResult = z.infer<typeof zAIEvaluationResult>;

export const JOB_STATES = ['PENDING', 'STARTED', 'SUCCESS', 'FAILURE', 'RETRY', 'REVOKED'] as const;

export const zDeckJobStatus = z.object({
  job_id: zUUID,
  state: z.enum(JOB_STATES),
  ready: z.boolean(),
  successful: z.boolean().nullable(),
  result: zAIEvaluationResult.nullable(),
});
export type DeckJobStatus = z.infer<typeof zDeckJobStatus>;
