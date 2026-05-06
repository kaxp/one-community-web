import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';
import { STARTUP_STAGES } from '@/features/onboarding/schemas';

// PRD §7.4.1 — request body. `filters` keys are all optional arrays; `cursor` is opaque.
export const zSearchFilters = z
  .object({
    sector: z.array(z.string().trim().toLowerCase().min(1)).optional(),
    stage: z.array(z.enum(STARTUP_STAGES)).optional(),
    geography: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();
export type SearchFilters = z.infer<typeof zSearchFilters>;

export const zSearchRequest = z.object({
  query: z.string().trim().min(1, 'Enter a query').max(500),
  filters: zSearchFilters.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().nullable().optional(),
});
export type SearchRequest = z.infer<typeof zSearchRequest>;

// Response item shapes are `target_type`-discriminated. Many fields are optional so we
// can render Partner-masked responses (PRD §7.4.1 Partner note) without throwing.
const zStartupResultItem = z.object({
  user_id: zUUID,
  name: z.string(),
  organisation: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  company_name: z.string().optional(),
  sector: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  one_liner: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  traction: z.string().nullable().optional(),
  funding_target_cr: z.number().nullable().optional(),
  similarity_score: z.number().optional(),
  ai_rank: z.number().int().nullable().optional(),
  ai_reason: z.string().nullable().optional(),
});
export type StartupResultItem = z.infer<typeof zStartupResultItem>;

const zLPResultItem = z.object({
  user_id: zUUID,
  name: z.string(),
  organisation: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  fund_name: z.string().nullable().optional(),
  aum_cr: z.number().nullable().optional(),
  cheque_range_min: z.number().nullable().optional(),
  cheque_range_max: z.number().nullable().optional(),
  sectors: z.array(z.string()).optional(),
  stages: z.array(z.string()).optional(),
  geography: z.array(z.string()).optional(),
  co_invest_interest: z.boolean().optional(),
  similarity_score: z.number().optional(),
  ai_rank: z.number().int().nullable().optional(),
  ai_reason: z.string().nullable().optional(),
});
export type LPResultItem = z.infer<typeof zLPResultItem>;

export type SearchResultItem = StartupResultItem | LPResultItem;

const zSearchPayloadBase = z.object({
  total: z.number().int(),
  stage3_applied: z.boolean(),
  rerank_cap: z.number().int(),
  next_cursor: z.string().nullable(),
});

export const zSearchResponse = z.discriminatedUnion('target_type', [
  zSearchPayloadBase.extend({
    target_type: z.literal('startup'),
    results: z.array(zStartupResultItem),
  }),
  zSearchPayloadBase.extend({
    target_type: z.literal('lp'),
    results: z.array(zLPResultItem),
  }),
]);
export type SearchResponse = z.infer<typeof zSearchResponse>;

// Helpers for the URL-backed filter state. We stringify arrays as comma-joined values
// so `?sector=fintech,saas&stage=seed` round-trips cleanly.
export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.sector?.length) params.set('sector', filters.sector.join(','));
  if (filters.stage?.length) params.set('stage', filters.stage.join(','));
  if (filters.geography?.length) params.set('geography', filters.geography.join(','));
  return params;
}

export function filtersFromSearchParams(params: URLSearchParams): SearchFilters {
  const sector = params.get('sector')?.split(',').filter(Boolean) ?? [];
  const stage = (params.get('stage')?.split(',').filter(Boolean) ?? []) as readonly string[];
  const geography = params.get('geography')?.split(',').filter(Boolean) ?? [];
  const out: SearchFilters = {};
  if (sector.length) out.sector = sector.map((s) => s.toLowerCase());
  const validStages = stage.filter((s): s is (typeof STARTUP_STAGES)[number] =>
    (STARTUP_STAGES as readonly string[]).includes(s),
  );
  if (validStages.length) out.stage = validStages;
  if (geography.length) out.geography = geography;
  return out;
}

// ── Detail page schemas (/search/detail/startup/:id + /search/detail/lp/:id) ─
// All fields are nullable/optional — the backend gates them by role and
// connection status, so the same schema parses any viewer's response.

export const zFounderDetail = z.object({
  name: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});
export type FounderDetail = z.infer<typeof zFounderDetail>;

export const zSearchDetailStartup = z.object({
  user_id: zUUID,
  company_name: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  one_liner: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  founding_year: z.number().int().nullable().optional(),
  team_size: z.number().int().nullable().optional(),
  website_url: z.string().nullable().optional(),
  company_linkedin_url: z.string().nullable().optional(),
  tracxn_url: z.string().nullable().optional(),
  pitch_deck_url: z.string().nullable().optional(),
  drive_folder_url: z.string().nullable().optional(),
  revenue_model: z.string().nullable().optional(),
  traction: z.string().nullable().optional(),
  founders: z.array(zFounderDetail).optional(),
  connection_status: z.string().nullable().optional(),
  // Financials — gated by role / connection
  funding_target_cr: z.number().nullable().optional(),
  existing_investors: z.string().nullable().optional(),
  last_round_valuation: z.string().nullable().optional(),
  money_raised: z.string().nullable().optional(),
  valuation_sought: z.string().nullable().optional(),
  mrr_arr: z.string().nullable().optional(),
  revenue_monthly: z.number().nullable().optional(),
  burn_monthly: z.number().nullable().optional(),
  runway_months: z.number().int().nullable().optional(),
  growth_pct: z.number().nullable().optional(),
  gross_margin_pct: z.number().nullable().optional(),
  customer_count: z.number().int().nullable().optional(),
  debt_amount: z.array(z.string()).nullable().optional(),
  debt_raise: z.string().nullable().optional(),
  // Admin-only
  ai_pitch_summary: z.string().nullable().optional(),
  ai_signal: z.string().nullable().optional(),
  ai_pitch_score: z.number().nullable().optional(),
  deal_manager: z.string().nullable().optional(),
  deal_originator: z.string().nullable().optional(),
  partner_on_call: z.array(z.string()).nullable().optional(),
  notion_status: z.string().nullable().optional(),
  investment_memo_url: z.string().nullable().optional(),
});
export type SearchDetailStartup = z.infer<typeof zSearchDetailStartup>;

export const zSearchDetailLp = z.object({
  user_id: zUUID,
  name: z.string().nullable().optional(),
  organisation: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  connection_status: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  fund_name: z.string().nullable().optional(),
  lp_type: z.string().nullable().optional(),
  sectors: z.array(z.string()).optional(),
  stages: z.array(z.string()).optional(),
  geography: z.array(z.string()).optional(),
  co_invest_interest: z.boolean().nullable().optional(),
  // Gated by role / connection
  aum_cr: z.number().nullable().optional(),
  cheque_range_min: z.number().nullable().optional(),
  cheque_range_max: z.number().nullable().optional(),
  expected_ticket: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});
export type SearchDetailLp = z.infer<typeof zSearchDetailLp>;
