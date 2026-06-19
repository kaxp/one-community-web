import { z } from 'zod';

// PRD §7.14 + §13 G8 — analytics shapes are dashboard-specific and additive.
// Every schema below uses `.passthrough()` so unknown keys are preserved
// (visible in the debug dock) and the UI never breaks because a new KPI
// arrives. Charts must guard each numeric read with `?? 0`.

// §7.14.1 — overview KPIs. We model the documented keys explicitly so the
// page renders well-typed cards, but `.passthrough()` keeps any extras.
export const zAnalyticsOverview = z
  .object({
    total_users: z.number().default(0),
    lps: z.number().default(0),
    potential_lps: z.number().default(0),
    startups: z.number().default(0),
    connections_accepted: z.number().default(0),
    connections_pending: z.number().default(0),
    meetings_30d: z.number().default(0),
    digests_sent_30d: z.number().default(0),
    mis_this_month: z.number().default(0),
  })
  .passthrough();
export type AnalyticsOverview = z.infer<typeof zAnalyticsOverview>;

// §7.14.2 — LP funnel counts.
export const zFunnelLpItem = z
  .object({
    status: z.string(),
    count: z.number().int().nonnegative(),
  })
  .passthrough();
export type FunnelLpItem = z.infer<typeof zFunnelLpItem>;

export const zAnalyticsFunnelLp = z
  .object({
    items: z.array(zFunnelLpItem),
  })
  .passthrough();
export type AnalyticsFunnelLp = z.infer<typeof zAnalyticsFunnelLp>;

// §7.14.3 — startup funnel counts.
export const zFunnelStartupItem = z
  .object({
    status: z.string(),
    count: z.number().int().nonnegative(),
  })
  .passthrough();
export type FunnelStartupItem = z.infer<typeof zFunnelStartupItem>;

export const zAnalyticsFunnelStartup = z
  .object({
    items: z.array(zFunnelStartupItem),
  })
  .passthrough();
export type AnalyticsFunnelStartup = z.infer<typeof zAnalyticsFunnelStartup>;

// §7.14.4 — connections funnel counts.
export const zFunnelConnectionsItem = z
  .object({
    status: z.string(),
    count: z.number().int().nonnegative(),
  })
  .passthrough();
export type FunnelConnectionsItem = z.infer<typeof zFunnelConnectionsItem>;

export const zAnalyticsFunnelConnections = z
  .object({
    items: z.array(zFunnelConnectionsItem),
  })
  .passthrough();
export type AnalyticsFunnelConnections = z.infer<typeof zAnalyticsFunnelConnections>;

// §7.14.5 — cohort retention.
export const zCohortRow = z
  .object({
    cohort: z.string(),
    cohort_size: z.number().int().nonnegative(),
    retained_1m: z.number().int().nonnegative().nullable().optional(),
    retained_3m: z.number().int().nonnegative().nullable().optional(),
    retained_6m: z.number().int().nonnegative().nullable().optional(),
    retained_12m: z.number().int().nonnegative().nullable().optional(),
  })
  .passthrough();
export type CohortRow = z.infer<typeof zCohortRow>;

export const zAnalyticsCohort = z
  .object({
    items: z.array(zCohortRow),
  })
  .passthrough();
export type AnalyticsCohort = z.infer<typeof zAnalyticsCohort>;

// §7.14.6 — match-success weekly.
export const zMatchSuccessRow = z
  .object({
    week_of: z.string(),
    suggestions_generated: z.number().int().nonnegative().optional(),
    accepted_count: z.number().int().nonnegative().optional(),
    rejected_count: z.number().int().nonnegative().optional(),
    skipped_count: z.number().int().nonnegative().optional(),
    accepted_pct: z.number().nullable().optional(),
    rejected_pct: z.number().nullable().optional(),
    skipped_pct: z.number().nullable().optional(),
  })
  .passthrough();
export type MatchSuccessRow = z.infer<typeof zMatchSuccessRow>;

export const zAnalyticsMatchSuccess = z
  .object({
    items: z.array(zMatchSuccessRow),
  })
  .passthrough();
export type AnalyticsMatchSuccess = z.infer<typeof zAnalyticsMatchSuccess>;

// User activities — all users with search + login counts.
export const zUserActivityItem = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    role: z.string(),
    total_searches: z.number().int().nonnegative(),
    last_search_at: z.string().nullable(),
    total_logins: z.number().int().nonnegative().default(0),
    last_login_at: z.string().nullable().default(null),
    created_at: z.string(),
  })
  .passthrough();
export type UserActivityItem = z.infer<typeof zUserActivityItem>;

// Per-user search history entries.
export const zUserSearchEntry = z
  .object({
    id: z.string(),
    query: z.string(),
    filters: z.record(z.unknown()).optional(),
    results_count: z.number().int().nonnegative(),
    duration_ms: z.number().nullable().optional(),
    created_at: z.string(),
  })
  .passthrough();
export type UserSearchEntry = z.infer<typeof zUserSearchEntry>;

// Per-user login history entries.
export const zUserLoginEntry = z
  .object({
    id: z.string(),
    login_at: z.string(),
    ip_address: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
  })
  .passthrough();
export type UserLoginEntry = z.infer<typeof zUserLoginEntry>;
