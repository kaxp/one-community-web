import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';

// PRD §7.9 — Monthly MIS submission. Period is a server-driven YYYY-MM token
// matching `^\d{4}-(0[1-9]|1[0-2])$`. raw_data is a strict 6-key allowlist —
// any extra key is a developer mistake, not a backend transport concern, so
// we enforce it client-side via Zod `.strict()` before POST.

export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const zPeriod = z.string().regex(PERIOD_REGEX, 'Expected YYYY-MM');

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

// `<input type="number">` with `valueAsNumber` produces NaN on empty input;
// fold NaN to undefined so blank optional fields don't surface errors.
const optionalNumber = (min = 0) =>
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

// PRD §7.9.1 / §7.9.3 prefill payload. All fields nullable (first-ever MIS).
export const zMISPrefill = z
  .object({
    revenue: z.number().nullable().optional(),
    burn: z.number().nullable().optional(),
    runway_months: z.number().nullable().optional(),
    headcount: z.number().nullable().optional(),
    highlights: z.string().nullable().optional(),
    lowlights: z.string().nullable().optional(),
  })
  .nullable();
export type MISPrefill = z.infer<typeof zMISPrefill>;

// PRD §7.9.1 — current-month form schema.
export const zMISFormResponse = z.object({
  period: zPeriod,
  company_name: z.string(),
  startup_id: zUUID,
  // PRD §7.9.1 — `fields_schema` is hint-only; tolerate any shape.
  fields_schema: z.record(z.unknown()).optional(),
  prefill: zMISPrefill,
  already_submitted: z.boolean(),
  last_submission_at: z.string().nullable().optional(),
});
export type MISFormResponse = z.infer<typeof zMISFormResponse>;

// PRD §7.9.3 — last-month prefill (parallel fetch).
export const zMISPrefillResponse = z.object({
  period: zPeriod,
  company_name: z.string(),
  prefill: zMISPrefill,
});
export type MISPrefillResponse = z.infer<typeof zMISPrefillResponse>;

// PRD §7.9.2 — strict raw_data allowlist. EXACTLY these 6 keys may appear.
// Any extra key throws a ZodError — caught by buildMISRequest before POST.
export const zMISRawData = z
  .object({
    revenue_inr: z.string().regex(/^-?\d+\.\d{2}$/, 'Decimal string'),
    burn_inr: z.string().regex(/^-?\d+\.\d{2}$/, 'Decimal string'),
    headcount: z.number().int().min(0),
    runway_months: z.number().min(0),
    highlights: z.string().max(2000),
    lowlights: z.string().max(2000),
  })
  .partial()
  .strict();
export type MISRawData = z.infer<typeof zMISRawData>;

// What React Hook Form holds — local form input shape, before transformation
// to the wire request.
export const zMISFormInput = z
  .object({
    revenue: optionalNumber(0),
    burn: optionalNumber(0),
    runway_months: optionalInt(0, 1200),
    headcount: optionalInt(0, 1_000_000),
    highlights: optionalString(2000),
    lowlights: optionalString(2000),
  })
  .strict();
export type MISFormInput = z.infer<typeof zMISFormInput>;

// PRD §7.9.2 wire request body.
export const zMISSubmitRequest = z.object({
  period: zPeriod,
  revenue: z.number().min(0).optional(),
  burn: z.number().min(0).optional(),
  runway_months: z.number().min(0).optional(),
  headcount: z.number().int().min(0).optional(),
  highlights: z.string().max(2000).optional(),
  lowlights: z.string().max(2000).optional(),
  raw_data: zMISRawData.optional(),
});
export type MISSubmitRequest = z.infer<typeof zMISSubmitRequest>;

export const zMISSubmitResponse = z.object({
  submission_id: zUUID,
  period: zPeriod,
  startup_id: zUUID,
  submitted_at: zISODateTime,
});
export type MISSubmitResponse = z.infer<typeof zMISSubmitResponse>;

// PRD §8.12.1 — INR amounts in raw_data are Decimal-formatted strings via
// `value.toFixed(2)`. The .strict() schema rejects any developer typo (e.g.
// `revenue_in` vs `revenue_inr`) before the POST hits the network.
export function buildMISRequest(period: string, form: MISFormInput): MISSubmitRequest {
  const rawDataDraft: Record<string, unknown> = {};
  if (form.revenue !== undefined) rawDataDraft.revenue_inr = form.revenue.toFixed(2);
  if (form.burn !== undefined) rawDataDraft.burn_inr = form.burn.toFixed(2);
  if (form.headcount !== undefined) rawDataDraft.headcount = form.headcount;
  if (form.runway_months !== undefined) rawDataDraft.runway_months = form.runway_months;
  if (form.highlights !== undefined) rawDataDraft.highlights = form.highlights;
  if (form.lowlights !== undefined) rawDataDraft.lowlights = form.lowlights;
  const rawData = zMISRawData.parse(rawDataDraft);

  const body: MISSubmitRequest = { period };
  if (form.revenue !== undefined) body.revenue = form.revenue;
  if (form.burn !== undefined) body.burn = form.burn;
  if (form.runway_months !== undefined) body.runway_months = form.runway_months;
  if (form.headcount !== undefined) body.headcount = form.headcount;
  if (form.highlights !== undefined) body.highlights = form.highlights;
  if (form.lowlights !== undefined) body.lowlights = form.lowlights;
  if (Object.keys(rawData).length > 0) body.raw_data = rawData;
  return body;
}
