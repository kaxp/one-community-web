import { http, HttpResponse, type HttpHandler } from 'msw';
import type {
  AnalyticsCohort,
  AnalyticsFunnelConnections,
  AnalyticsFunnelLp,
  AnalyticsFunnelStartup,
  AnalyticsMatchSuccess,
  AnalyticsOverview,
} from '@/features/analytics/schemas';

// PRD §7.14.1–7.14.6 fixtures. All shapes use `.passthrough()` server-side
// per §13 G8 — we mirror that here by accepting + returning the documented
// keys but tolerating extras downstream.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const SEED_OVERVIEW: AnalyticsOverview = {
  users_total: 412,
  lps_total: 120,
  potential_lps_total: 85,
  vcs_total: 45,
  startups_total: 230,
  portfolio_startups_total: 12,
  connections_accepted: 56,
  connections_pending: 8,
  digests_sent_30d: 8,
  mis_submissions_this_month: 10,
  meetings_scheduled_30d: 23,
  // Intentional unknown key — the page must ignore this without breaking.
  speculative_signal_count: 3,
};

const SEED_FUNNEL_LP: AnalyticsFunnelLp = {
  items: [
    { status: '1_new_lead', count: 40 },
    { status: '2_first_reach_out', count: 25 },
    { status: '3_in_conversation', count: 18 },
    { status: '4_soft_commit', count: 7 },
    { status: '5_invested', count: 30 },
  ],
};

const SEED_FUNNEL_STARTUP: AnalyticsFunnelStartup = {
  items: [
    { status: 'longlist', count: 83 },
    { status: 'team_reach_out', count: 12 },
    { status: 'deep_dive_scheduled', count: 5 },
    { status: 'termsheet_discussion', count: 2 },
    { status: 'portfolio', count: 12 },
    { status: 'pass_for_now', count: 34 },
    { status: 'follow_up_q3', count: 6 },
    { status: 'archived', count: 9 },
  ],
};

const SEED_FUNNEL_CONNECTIONS: AnalyticsFunnelConnections = {
  items: [
    { status: 'pending_admin', count: 4 },
    { status: 'pending_target', count: 2 },
    { status: 'accepted', count: 56 },
    { status: 'declined', count: 11 },
    { status: 'rejected_admin', count: 3 },
  ],
};

const SEED_COHORT: AnalyticsCohort = {
  items: [
    {
      cohort: '2026-01',
      cohort_size: 100,
      retained_1m: 80,
      retained_3m: 55,
      retained_6m: 30,
      retained_12m: null,
    },
    {
      cohort: '2026-02',
      cohort_size: 110,
      retained_1m: 92,
      retained_3m: 62,
      retained_6m: null,
      retained_12m: null,
    },
    {
      cohort: '2026-03',
      cohort_size: 95,
      retained_1m: 78,
      retained_3m: null,
      retained_6m: null,
      retained_12m: null,
    },
  ],
};

const SEED_MATCH_SUCCESS: AnalyticsMatchSuccess = {
  items: [
    {
      week_of: '2026-04-07',
      suggestions_generated: 130,
      accepted_count: 50,
      rejected_count: 30,
      skipped_count: 50,
      accepted_pct: 0.38,
      rejected_pct: 0.23,
      skipped_pct: 0.39,
    },
    {
      week_of: '2026-04-14',
      suggestions_generated: 150,
      accepted_count: 63,
      rejected_count: 27,
      skipped_count: 60,
      accepted_pct: 0.42,
      rejected_pct: 0.18,
      skipped_pct: 0.4,
    },
    {
      week_of: '2026-04-21',
      suggestions_generated: 165,
      accepted_count: 72,
      rejected_count: 25,
      skipped_count: 68,
      accepted_pct: 0.44,
      rejected_pct: 0.15,
      skipped_pct: 0.41,
    },
  ],
};

let overview: AnalyticsOverview = SEED_OVERVIEW;
let funnelLp: AnalyticsFunnelLp = SEED_FUNNEL_LP;
let funnelStartup: AnalyticsFunnelStartup = SEED_FUNNEL_STARTUP;
let funnelConnections: AnalyticsFunnelConnections = SEED_FUNNEL_CONNECTIONS;
let cohort: AnalyticsCohort = SEED_COHORT;
let matchSuccess: AnalyticsMatchSuccess = SEED_MATCH_SUCCESS;

let nextOverviewError: ErrorEnvelope | null = null;
let nextFunnelLpError: ErrorEnvelope | null = null;
let nextFunnelStartupError: ErrorEnvelope | null = null;
let nextFunnelConnectionsError: ErrorEnvelope | null = null;
let nextCohortError: ErrorEnvelope | null = null;
let nextMatchSuccessError: ErrorEnvelope | null = null;

export function resetMswAnalyticsState() {
  overview = SEED_OVERVIEW;
  funnelLp = SEED_FUNNEL_LP;
  funnelStartup = SEED_FUNNEL_STARTUP;
  funnelConnections = SEED_FUNNEL_CONNECTIONS;
  cohort = SEED_COHORT;
  matchSuccess = SEED_MATCH_SUCCESS;
  nextOverviewError = null;
  nextFunnelLpError = null;
  nextFunnelStartupError = null;
  nextFunnelConnectionsError = null;
  nextCohortError = null;
  nextMatchSuccessError = null;
}

resetMswAnalyticsState();

export function setMswAnalyticsOverview(v: AnalyticsOverview) {
  overview = v;
}
export function setMswAnalyticsFunnelLp(v: AnalyticsFunnelLp) {
  funnelLp = v;
}
export function setMswAnalyticsFunnelStartup(v: AnalyticsFunnelStartup) {
  funnelStartup = v;
}
export function setMswAnalyticsFunnelConnections(v: AnalyticsFunnelConnections) {
  funnelConnections = v;
}
export function setMswAnalyticsCohort(v: AnalyticsCohort) {
  cohort = v;
}
export function setMswAnalyticsMatchSuccess(v: AnalyticsMatchSuccess) {
  matchSuccess = v;
}

export function queueAnalyticsOverviewError(err: ErrorEnvelope) {
  nextOverviewError = err;
}
export function queueAnalyticsFunnelLpError(err: ErrorEnvelope) {
  nextFunnelLpError = err;
}
export function queueAnalyticsFunnelStartupError(err: ErrorEnvelope) {
  nextFunnelStartupError = err;
}
export function queueAnalyticsFunnelConnectionsError(err: ErrorEnvelope) {
  nextFunnelConnectionsError = err;
}
export function queueAnalyticsCohortError(err: ErrorEnvelope) {
  nextCohortError = err;
}
export function queueAnalyticsMatchSuccessError(err: ErrorEnvelope) {
  nextMatchSuccessError = err;
}

function errorBody(err: ErrorEnvelope) {
  return {
    data: null,
    error: {
      code: err.code,
      message: err.message,
      ...(err.detail !== undefined ? { detail: err.detail } : {}),
    },
  };
}

export const adminAnalyticsHandlers: HttpHandler[] = [
  http.get('*/api/v1/analytics/overview', () => {
    if (nextOverviewError) {
      const err = nextOverviewError;
      nextOverviewError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: overview, error: null });
  }),
  http.get('*/api/v1/analytics/funnel/lp', () => {
    if (nextFunnelLpError) {
      const err = nextFunnelLpError;
      nextFunnelLpError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: funnelLp, error: null });
  }),
  http.get('*/api/v1/analytics/funnel/startup', () => {
    if (nextFunnelStartupError) {
      const err = nextFunnelStartupError;
      nextFunnelStartupError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: funnelStartup, error: null });
  }),
  http.get('*/api/v1/analytics/funnel/connections', () => {
    if (nextFunnelConnectionsError) {
      const err = nextFunnelConnectionsError;
      nextFunnelConnectionsError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: funnelConnections, error: null });
  }),
  http.get('*/api/v1/analytics/cohort', () => {
    if (nextCohortError) {
      const err = nextCohortError;
      nextCohortError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: cohort, error: null });
  }),
  http.get('*/api/v1/analytics/match-success', () => {
    if (nextMatchSuccessError) {
      const err = nextMatchSuccessError;
      nextMatchSuccessError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({ data: matchSuccess, error: null });
  }),
];
