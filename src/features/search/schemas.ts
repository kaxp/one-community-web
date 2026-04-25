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
