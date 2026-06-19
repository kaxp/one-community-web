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

// Values the type-selector can produce. null/undefined = auto-classify (GPT).
export const SEARCH_TARGET_TYPES = ['startup', 'lp'] as const;
export type SearchTargetType = (typeof SEARCH_TARGET_TYPES)[number];

export const zSearchRequest = z.object({
  query: z.string().trim().min(1, 'Enter a query').max(500),
  filters: zSearchFilters.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().nullable().optional(),
  target_type: z.enum(SEARCH_TARGET_TYPES).nullable().optional(),
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

// ── Conversational search v4 answer envelope ─────────────────────────────────
// The v4 synthesizer returns one of three shapes depending on intent mode:
//
//   list shape     (discover, rank)
//     → groups[], optional sections/pivot/alternatives/verdict/subject_id
//   analysis shape (drill_in, analyze_bear, analyze_bull, compare)
//     → sections[], optional groups/pivot/alternatives
//   redirect shape (meta, entity_not_found)
//     → pivot + alternatives[], optional groups/sections
//
// All shapes share: intro + follow_up.
// All mode-specific fields are optional so validation doesn't fail when the
// synthesizer returns a different shape than the v3 schema expected.

export const zSearchAnswerItem = z.object({
  startup_id: z.string(),
  // name is populated by the v4 synthesizer so the FE can render it without
  // looking up the card in resultsByUserId (useful for entity_not_found mode).
  name: z.string().optional(),
  explanation: z.string(),
});

export const zSearchAnswerGroup = z.object({
  heading: z.string(),
  items: z.array(zSearchAnswerItem),
});

// Analysis shape: sections with a heading + body paragraph per risk / topic.
export const zSearchAnswerSection = z.object({
  heading: z.string(),
  body: z.string(),
});

// Used in subjects[] (compare mode) and alternatives[] (entity_not_found).
export const zSearchAnswerNamedRef = z.object({
  startup_id: z.string(),
  name: z.string(),
});

export const zSearchAnswer = z.object({
  intro: z.string(),
  // List shape
  groups: z.array(zSearchAnswerGroup).optional(),
  // Analysis shape
  sections: z.array(zSearchAnswerSection).optional(),
  subject_id: z.string().nullable().optional(),
  subjects: z.array(zSearchAnswerNamedRef).nullable().optional(),
  verdict: z.string().nullable().optional(),
  // Redirect shape
  pivot: z.string().nullable().optional(),
  alternatives: z.array(zSearchAnswerNamedRef).optional(),
  // Shared
  follow_up: z.string().nullable().optional(),
});
export type SearchAnswer = z.infer<typeof zSearchAnswer>;
export type SearchAnswerSection = z.infer<typeof zSearchAnswerSection>;
export type SearchAnswerNamedRef = z.infer<typeof zSearchAnswerNamedRef>;

const zSearchPayloadBase = z.object({
  total: z.number().int(),
  stage3_applied: z.boolean(),
  rerank_cap: z.number().int(),
  next_cursor: z.string().nullable(),
  // Hybrid search additions — intent drives UI affordances, text appears
  // above results (e.g. "We don't have 'Uber' in our database").
  intent: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  // Synthesised answer envelope. Frontend renders this as a Cosmic-style
  // grouped response when present; falls back to the card grid when null.
  answer: zSearchAnswer.nullable().optional(),
});

// ── Conversational search (Phase 2) ──────────────────────────────────────────

export const zConversationRequest = z.object({
  conversation_id: z.string().nullable().optional(),
  message: z.string().trim().min(1, 'Type something').max(500),
  target_type: z.enum(SEARCH_TARGET_TYPES).nullable().optional(),
  limit: z.number().int().min(1).max(20).optional(),
});
export type ConversationRequest = z.infer<typeof zConversationRequest>;

// Server always returns startup-shaped results today (LP conversational
// search is future scope); we keep `target_type` open so we can extend.
// v5 source item — [{startup_id, company_name}] referenced in the answer.
export const zSearchSource = z.object({
  startup_id: z.string(),
  company_name: z.string(),
});
export type SearchSource = z.infer<typeof zSearchSource>;

export const zConversationResponse = z.object({
  conversation_id: z.string(),
  turn: z.number().int(),
  action: z.string(),
  resolved_query: z.string(),
  clarification: z.string().nullable().optional(),
  results: z.array(zStartupResultItem),
  total: z.number().int(),
  target_type: z.string(),
  intent: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  answer: zSearchAnswer.nullable().optional(),
  stage3_applied: z.boolean(),
  // ── Search v5 prose fields (additive) ──────────────────────────────────
  answer_markdown: z.string().nullable().optional(),
  sources: z.array(zSearchSource).optional(),
  cached: z.boolean().optional(),
  confidence: z.number().nullable().optional(),
  session_id: z.string().nullable().optional(),
  latency_ms: z.record(z.number()).nullable().optional(),
});
export type ConversationResponse = z.infer<typeof zConversationResponse>;

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

// ── Latest Public Intel sub-schemas ─────────────────────────────────────────
// Sourced from public internet. Nested inside startups.latest_intel_structured.
// investment_signal is stripped for non-admin roles by the backend.
const zIntelCompetitor = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

const zIntelNewsItem = z.object({
  headline: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export const zLatestIntelStructured = z
  .object({
    source: z.string().nullable().optional(),
    last_updated: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    quick_stats: z
      .object({
        hq: z.string().nullable().optional(),
        stage: z.string().nullable().optional(),
        sector: z.string().nullable().optional(),
        founded: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    funding: z
      .object({
        valuation: z.string().nullable().optional(),
        latest_round: z.string().nullable().optional(),
        total_funding: z.string().nullable().optional(),
        lead_investors: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    team: z
      .object({
        founders: z.string().nullable().optional(),
        key_hires: z.string().nullable().optional(),
        team_size: z.string().nullable().optional(),
        exits_changes: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    traction: z
      .object({
        mrr_arr: z.string().nullable().optional(),
        customers: z.string().nullable().optional(),
        geography: z.string().nullable().optional(),
        key_customers: z.array(z.string()).nullable().optional(),
      })
      .nullable()
      .optional(),
    competition: z
      .object({
        differentiation: z.string().nullable().optional(),
        competitors: z.array(zIntelCompetitor).nullable().optional(),
      })
      .nullable()
      .optional(),
    recent_news: z.array(zIntelNewsItem).nullable().optional(),
    red_flags: z.array(z.string()).nullable().optional(),
    product_updates: z.array(z.string()).nullable().optional(),
    investment_signal: z
      .object({
        color: z.string().nullable().optional(),
        signal: z.string().nullable().optional(),
        confidence: z.string().nullable().optional(),
        line_1: z.string().nullable().optional(),
        line_2: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    evaluation_generated_at: z.string().nullable().optional(),
    evaluation_summary: z.record(z.unknown()).nullable().optional(),
  })
  .passthrough();
export type LatestIntelStructured = z.infer<typeof zLatestIntelStructured>;

export const zSearchDetailStartup = z.object({
  user_id: zUUID,
  company_name: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  one_liner: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  founding_year: z.number().int().nullable().optional(),
  team_size: z.number().int().nullable().optional(),
  city: z.string().nullable().optional(),
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
  raising_raw: z.string().nullable().optional(),
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
  // Latest Public Intel — always visible when present; investment_signal stripped for non-admin
  latest_intel_structured: zLatestIntelStructured.nullable().optional(),
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
