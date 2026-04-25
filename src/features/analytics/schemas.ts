import { z } from 'zod';

// PRD §7.14 + §13 G8 — analytics shapes are dashboard-specific and additive.
// Every schema below uses `.passthrough()` so unknown keys are preserved
// (visible in the debug dock) and the UI never breaks because a new KPI
// arrives. Charts must guard each numeric read with `?? 0`.

// §7.14.1 — overview KPIs. We model the documented keys explicitly so the
// page renders well-typed cards, but `.passthrough()` keeps any extras.
export const zAnalyticsOverview = z
  .object({
    users_total: z.number().int().nonnegative().optional(),
    lps_total: z.number().int().nonnegative().optional(),
    potential_lps_total: z.number().int().nonnegative().optional(),
    vcs_total: z.number().int().nonnegative().optional(),
    startups_total: z.number().int().nonnegative().optional(),
    portfolio_startups_total: z.number().int().nonnegative().optional(),
    connections_accepted: z.number().int().nonnegative().optional(),
    connections_pending: z.number().int().nonnegative().optional(),
    digests_sent_30d: z.number().int().nonnegative().optional(),
    mis_submissions_this_month: z.number().int().nonnegative().optional(),
    meetings_scheduled_30d: z.number().int().nonnegative().optional(),
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
