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

// Country codes for phone field — default +91 (India-first)
export const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)' },
  { code: '+1', label: '+1 (US/Canada)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (Singapore)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+61', label: '+61 (Australia)' },
  { code: '+60', label: '+60 (Malaysia)' },
  { code: '+49', label: '+49 (Germany)' },
  { code: '+33', label: '+33 (France)' },
] as const;

// Optional field helpers
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

const reqUrl = (msg = 'Enter a valid URL (https://…)') =>
  z.string().trim().min(1, 'Required').url(msg);

const optStr = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v));

// Co-founder entry (additional founders beyond the primary)
export const zCoFounder = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().min(1, 'Required').email('Enter a valid email'),
  phone_country_code: z.string().default('+91'),
  phone_number: z.string().trim().min(1, 'Required'),
  linkedin_url: optUrl(),
});
export type CoFounderValues = z.input<typeof zCoFounder>;

export const zPublicPitchForm = z.object({
  // ── Company ──────────────────────────────────────────────────────────
  company_name: z.string().trim().min(1, 'Required').max(200),
  city: z.string().trim().min(1, 'Required'),
  sector: z.string().trim().min(1, 'Required'),
  stage: z.enum(PITCH_STAGES, { required_error: 'Required' }),
  founding_year: z
    .number()
    .int()
    .min(1900, 'Must be 1900 or later')
    .max(new Date().getFullYear(), 'Cannot be in the future'),
  team_size: optInt(),
  tagline: z.string().trim().min(1, 'Required').max(280),
  description: z.string().trim().min(1, 'Required').max(4000),
  website_url: reqUrl(),
  company_linkedin_url: optUrl(),
  deck_url: reqUrl(),
  tracxn_url: optUrl(),

  // ── Founders ─────────────────────────────────────────────────────────
  founder_name: z.string().trim().min(1, 'Required').max(200),
  email: z
    .string()
    .trim()
    .min(1, 'Required')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address'),
  phone_country_code: z.string().default('+91'),
  phone_number: z.string().trim().min(1, 'Required'),
  founder_linkedin_url: reqUrl('Enter a valid LinkedIn URL'),
  additional_founders: z.array(zCoFounder).optional(),

  // ── Funding ──────────────────────────────────────────────────────────
  // Radio inputs return null in JSDOM when nothing is selected; nullish handles both null and undefined.
  has_raised_funds: z.enum(['yes', 'no']).nullish(),
  money_raised: optStr(),
  existing_investors: optStr(),

  // ── Financials (optional) ────────────────────────────────────────────
  revenue_inr: optNum(),
  burn_rate_inr: optNum(),
  runway_months: optInt(),
  current_balance_inr: optNum(),
  growth_pct: optNum(),
  gross_margin_pct: optNum(),
  customer_count: optInt(),
  ask_amount_cr: optNum(),
  revenue_model: optStr(),

  // ── Anything else ────────────────────────────────────────────────────
  additional_notes: z
    .string()
    .trim()
    .max(2000, 'Max 2000 characters')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export type PublicPitchFormValues = z.input<typeof zPublicPitchForm>;

// What gets sent to the API after phone combining + flattening.
// All optional fields use `| undefined` so exactOptionalPropertyTypes is satisfied
// when assigning values that may be explicitly undefined.
export type PublicPitchInput = {
  company_name: string;
  city: string;
  founder_name: string;
  email: string;
  phone: string;
  founder_linkedin_url: string;
  additional_founders?:
    | Array<{
        name: string;
        email?: string | undefined;
        phone?: string | undefined;
        linkedin_url?: string | undefined;
      }>
    | undefined;
  sector: string;
  stage: string;
  tagline: string;
  description: string;
  founding_year: number;
  team_size?: number | undefined;
  website_url: string;
  company_linkedin_url?: string | undefined;
  deck_url: string;
  tracxn_url?: string | undefined;
  money_raised?: string | undefined;
  existing_investors?: string | undefined;
  revenue_inr?: number | undefined;
  burn_rate_inr?: number | undefined;
  runway_months?: number | undefined;
  current_balance_inr?: number | undefined;
  growth_pct?: number | undefined;
  gross_margin_pct?: number | undefined;
  customer_count?: number | undefined;
  ask_amount_cr?: number | undefined;
  revenue_model?: string | undefined;
  additional_notes?: string | undefined;
};

function combinePhone(countryCode: string, localNumber: string | undefined): string | undefined {
  if (!localNumber) return undefined;
  const cleaned = localNumber.replace(/\D/g, '').replace(/^0+/, '');
  if (!cleaned) return undefined;
  return `${countryCode}${cleaned}`;
}

export function toApiPayload(values: PublicPitchFormValues): PublicPitchInput {
  const phone = combinePhone(
    values.phone_country_code ?? '+91',
    values.phone_number as string | undefined,
  );
  const additional_founders = (values.additional_founders ?? [])
    .filter((f) => f.name?.trim())
    .map((f) => {
      const entry: { name: string; email?: string; phone?: string; linkedin_url?: string } = {
        name: f.name,
      };
      if (f.email) entry.email = f.email;
      const fPhone = combinePhone(
        f.phone_country_code ?? '+91',
        f.phone_number as string | undefined,
      );
      if (fPhone) entry.phone = fPhone;
      if (f.linkedin_url) entry.linkedin_url = f.linkedin_url;
      return entry;
    });

  return {
    company_name: values.company_name,
    city: values.city as string,
    founder_name: values.founder_name,
    email: values.email,
    phone: phone as string,
    founder_linkedin_url: values.founder_linkedin_url as string,
    additional_founders: additional_founders.length ? additional_founders : undefined,
    sector: values.sector,
    stage: values.stage,
    tagline: values.tagline,
    description: values.description,
    founding_year: values.founding_year,
    team_size: values.team_size,
    website_url: values.website_url as string,
    company_linkedin_url: values.company_linkedin_url,
    deck_url: values.deck_url as string,
    tracxn_url: values.tracxn_url,
    money_raised: values.money_raised,
    existing_investors: values.existing_investors,
    revenue_inr: values.revenue_inr,
    burn_rate_inr: values.burn_rate_inr,
    runway_months: values.runway_months,
    current_balance_inr: values.current_balance_inr,
    growth_pct: values.growth_pct,
    gross_margin_pct: values.gross_margin_pct,
    customer_count: values.customer_count,
    ask_amount_cr: values.ask_amount_cr,
    revenue_model: values.revenue_model,
    additional_notes: values.additional_notes,
  };
}

// drive_folder_id is optional — FastAPI may omit it if not yet created
export const zPublicPitchSuccess = z
  .object({
    pitch_id: z.string(),
    status: z.enum(['received', 'duplicate']),
    drive_folder_id: z.string().nullish(),
  })
  .passthrough();
export type PublicPitchSuccess = z.infer<typeof zPublicPitchSuccess>;

export type PublicPitchResult =
  | { kind: 'success'; data: PublicPitchSuccess }
  | { kind: 'rate_limited' }
  | { kind: 'validation_error'; fieldErrors: Record<string, string> }
  | { kind: 'server_error'; message: string };
