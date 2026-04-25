import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';

// PRD §7.15.1 — manual Tracxn ingest. `company_name` required; everything
// else optional. The form submits empty strings as `undefined` so the wire
// body strips the keys entirely.

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

// `<input type="number">` with `valueAsNumber` produces NaN on empty input.
// Treat NaN as undefined so empty optional fields don't fail validation.
const optionalPositiveNumber = () =>
  z
    .number()
    .refine((v) => Number.isNaN(v) || v >= 0, { message: 'Must be ≥ 0' })
    .optional()
    .transform((v) => (v !== undefined && Number.isNaN(v) ? undefined : v));

export const zTracxnRequest = z.object({
  company_name: z.string().trim().min(1, 'Company name is required').max(200),
  website_url: optionalUrl(),
  sector: optionalString(120),
  stage: optionalString(60),
  description: optionalString(5000),
  funding_amount_cr: optionalPositiveNumber(),
  founders: optionalString(500),
});
export type TracxnRequest = z.infer<typeof zTracxnRequest>;

export const TRACXN_ACTIONS = ['created', 'merged', 'duplicate_skipped'] as const;
export type TracxnAction = (typeof TRACXN_ACTIONS)[number];
export const zTracxnAction = z.enum(TRACXN_ACTIONS);

export const zTracxnResponse = z
  .object({
    action: zTracxnAction,
    startup_id: zUUID,
    updated_fields: z.array(z.string()).optional(),
  })
  .passthrough();
export type TracxnResponse = z.infer<typeof zTracxnResponse>;
