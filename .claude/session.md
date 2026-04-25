# `.claude/session.md`

> **Session continuity file.** Claude overwrites this at the END of every session; reads it at the START of the next.
>
> **Purpose:** survive context resets. A fresh Opus instance should be able to resume work correctly by reading this file alone (plus `queue.md`, `decisions.md`, `frontend_claude.md`, and the relevant `frontend_prd.md §7.X`).

---

## How Claude uses this file

### At session START (MANDATORY)

1. Read this file top-to-bottom.
2. Verify `Current feature` matches the next unchecked item in `queue.md`. If mismatched, reconcile (usually means a feature was in-progress but the box wasn't ticked).
3. Begin from `Next concrete step`.
4. Check `Open blockers` — if any reference BLOCKING pending items in `decisions.md`, STOP and notify the human.

### At session END (MANDATORY)

Overwrite the template below with the CURRENT state. Don't append history — this file is not a log, it's a single snapshot of "where I am right now."

### Format rules

- **Last updated** — use the ACTUAL current timestamp. Not a placeholder.
- **Current feature** — use the exact feature-key from `queue.md`.
- **Last completed action** — one sentence, specific ("wrote useSearch hook + tests" beats "worked on search").
- **Next concrete step** — one sentence, executable by the next session ("wire SearchBar to useSearch in /search route" beats "continue search").
- **Open blockers** — list P-N items from `decisions.md § Pending` that affect this feature. Empty is fine.
- **Files touched this session** — git diff list. Lets the next session know what to smoke-test first.

---

## Current state

### Current feature

_(none — Stage 4 Session 4.3 complete. Three admin features shipped: `admin-partner-referral`, `admin-tracxn`, `admin-analytics`. **Stage 4 is now COMPLETE.** Please run final spot-check, tag `v0.4-admin`, then proceed to Stage 5.)_

### Last completed action

Completed Stage 4.3 — three admin features in one batch.

**1. admin-partner-referral** (`/admin/partner-referral`):
- 1 endpoint: `POST /admin/partner-referral` (§7.12.6).
- Schema in `src/features/admin/schemas.ts` — `zPartnerReferralRequest` (sector required, message + startup_name optional with empty-string → undefined transform), `zPartnerReferralResponse.passthrough()`.
- Hook: `usePartnerReferral()`.
- Page: single `<ExecutionPanel>` with sector + startup_name + message fields. Toast on success: "Notified {N} partner{s}".

**2. admin-tracxn** (`/admin/tracxn`):
- 1 endpoint: `POST /enrichment/tracxn` (§7.15.1).
- Schema in `src/features/enrichment/schemas.ts` — `zTracxnRequest` (company_name required, others optional with empty-string transforms), `zTracxnResponse.passthrough()` with `action: 'created'|'merged'|'duplicate_skipped'` discriminator.
- Hook: `useTracxnIngest()` — invalidates `['search']` (prefix match — any new/updated startup may now appear) + `qk.admin.summary` on `created` / `merged` (skipped on `duplicate_skipped`).
- Page: `<ExecutionPanel>` with all 7 input fields. The Funding Amount input uses `setValueAs` (not `valueAsNumber: true`) so an empty string becomes `undefined` cleanly. Toast copy varies per action: created → "Added {company_name}", merged → "Updated N fields on {company_name}", duplicate_skipped → "Already exists — no changes for {company_name}".

**3. admin-analytics** (`/admin/analytics`):
- 6 endpoints: `GET /analytics/{overview, funnel/lp, funnel/startup, funnel/connections, cohort, match-success}` (§7.14.1–§7.14.6).
- Schemas: `src/features/analytics/schemas.ts` — every shape `.passthrough()` per §13 G8. Overview models 11 documented KPIs; chart endpoints accept `items` arrays with the documented `status`/`week_of`/`cohort` keys plus tolerant extras. Cohort fields are all `nullable().optional()` because new cohorts haven't elapsed enough time for the longer windows.
- Hooks: `useAnalyticsOverview`, `useAnalyticsFunnelLp`, `useAnalyticsFunnelStartup`, `useAnalyticsFunnelConnections`, `useAnalyticsCohort({ months })`, `useAnalyticsMatchSuccess`. All 60s staleTime.
- Lib: `src/features/analytics/lib/labels.ts` — display label maps for LP funnel (re-using `LPFunnelStatus`), startup pipeline (top 6 + Other fallthrough), connections funnel.
- Components (`src/features/analytics/components/`):
  - `KpiCards.tsx` — 8 KPI cards rendered from a `KPIS` spec. Indian-numbering (`value.toLocaleString('en-IN')`). Unknown keys arriving from the backend are silently ignored (the debug dock can inspect raw via the `.passthrough()` pass).
  - `FunnelBarChart.tsx` — horizontal `<BarChart>` from Recharts. Tooltip formatter guards against undefined.
  - `CohortHeatmap.tsx` — table heatmap. Cells render `(retained_Nm / cohort_size * 100).toFixed(0) + '%'`; null cells (not yet elapsed) render `—` with a muted background. Color buckets at 80/60/40/20 thresholds.
  - `MatchSuccessChart.tsx` — `<LineChart>` of accepted/rejected/skipped percentages over time. Multiplies the [0..1] payload by 100 for display.
- Page (`AdminAnalyticsPage.tsx`): URL-backed `?tab=overview|funnel|cohort|match` tabs. Funnel tab renders three independently-error-bounded cards (LP, Startup, Connections) so a single failed endpoint doesn't break the others.
- The main bundle grew +1.05 KB gzip; AdminAnalyticsPage chunk is 113.82 KB gzip — heavier than the prompt's 50–80 KB target because Recharts v3 has a wider surface area than v2. **Tracked as `[I-1]` in `issues.md` (severity L)** for Stage 5 polish; the lazy-split itself works correctly.

**Cross-cutting:**
- `src/api/endpoints.ts` — added 8 typed endpoint functions (`postPartnerReferral`, `postTracxnIngest`, `getAnalyticsOverview`, `getAnalyticsFunnelLp`, `getAnalyticsFunnelStartup`, `getAnalyticsFunnelConnections`, `getAnalyticsCohort`, `getAnalyticsMatchSuccess`).
- `src/api/query-keys.ts` — added `qk.analytics.{overview, funnelLp, funnelStartup, funnelConnections, cohort(months), cohortAll, matchSuccess}`.
- `src/app/router.tsx` — 3 new lazy routes under the existing admin RoleGuard.
- MSW: 3 new handler files — `admin-partner-referral-handlers.ts`, `admin-tracxn-handlers.ts`, `admin-analytics-handlers.ts`. The Tracxn handler simulates idempotency (created → merged → duplicate_skipped on repeat submissions) AND exposes a `setMswTracxnForcedAction()` knob so tests can drive each branch deterministically. The analytics handler intentionally splices an unknown `speculative_signal_count` into the overview payload to prove `.passthrough()` preserves it.

**Tests (+18 cases vs prior commit, total 308 across 82 files):**
- `use-partner-referral.test.tsx` (2): broadcasts seed payload / 422.
- `AdminPartnerReferralPage.test.tsx` (2): renders form fields / submit fires + toast.
- `use-tracxn-ingest.test.tsx` (3): created / merged with updated_fields / duplicate_skipped.
- `AdminTracxnPage.test.tsx` (3): action-specific toast copy for each of the 3 actions.
- `use-analytics.test.ts` (4): overview seed parses + preserves unknown keys (`.passthrough()` proof) / cohort 3 rows / match-success weekly rows / overview 500 → ApiError.
- `AdminAnalyticsPage.test.tsx` (4): KPI cards on Overview tab / Funnel tab renders 3 charts / Cohort tab renders heatmap rows / Match Success tab renders the line chart. The page test mocks `<FunnelBarChart>` and `<MatchSuccessChart>` so jsdom doesn't have to ship Recharts' canvas/ResizeObserver internals.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (308/308 across 82 files), `pnpm build` (exits 0). Per-feature chunks:
- `AdminPartnerReferralPage` — **0.92 KB gzip** (well within budget).
- `AdminTracxnPage` — **1.30 KB gzip** (well within budget).
- `AdminAnalyticsPage` — **113.82 KB gzip** (over the prompt's 50–80 KB target; tracked as `[I-1]`).
Main chunk: 293.26 → 294.31 KB gzip (+1.05 KB — within the prompt's <5 KB constraint).

### Next concrete step

**Stage 4 is COMPLETE.** Per `queue.md` Stage 4 footer: tag `v0.4-admin`. Wait for the human to:
1. Run the final Stage 4 spot-check across all 9 admin features (3 from 4.1 + 3 from 4.2 + 3 from 4.3).
2. Tag the repo `v0.4-admin`.
3. Authorise Stage 5 (Polish + QA).

Once authorised, the next features (Stage 5) are:
- `qa-report` — Opus in QA mode writes `.claude/issues.md § Active`. No code changes.
- `qa-fixes` — fix every non-deferred row from issues.md. Triages resolved vs archived. **Note:** `[I-1]` (analytics chunk size) is already in `§ Active` — fix or defer per human judgement.
- `a11y-audit` — Lighthouse + keyboard nav smoke on top 10 screens.
- `bundle-size` — route-level lazy on remaining admin routes (already done) + main < 300KB gzip.
- `playwright-smoke` — signin → search → request-connect → admin-approve → target-accept E2E.

Smoke checks for the just-shipped Stage 4.3 features (manual):
- (a) Sign in as `+911234567890` (admin) → sidebar "Tracxn ingest" → `/admin/tracxn` → submit a new company "Acme Test" → toast "Added Acme Test". Submit the SAME payload again → toast "Already exists — no changes for Acme Test". Change one field (e.g. funding_amount_cr) and submit again → toast "Updated 3 fields on Acme Test".
- (b) Sidebar "Partner referral" → `/admin/partner-referral` → fill sector "fintech" → submit → toast "Notified 3 partners".
- (c) Sidebar "Analytics" → `/admin/analytics` → Overview tab loads with 8 KPI cards. Switch to Funnel tab → 3 charts (LP, Startup pipeline with "Other" bucket, Connection requests). Switch to Cohort tab → heatmap with 3 cohorts; some cells render `—`. Switch to Match Success → line chart with 3 weekly data points trending up.
- (d) Sign in as a non-admin (LP) and try the 3 routes → all redirect to `/unauthorized`.
- (e) DevTools network tab on `/admin/analytics`: confirm the 113 KB Recharts chunk only loads when the analytics route activates, not on initial signin.

### Open blockers

_(none — `[I-1]` is non-blocking polish, deferred to Stage 5)_

### Files touched this session

- **admin-partner-referral (new):**
  - `src/features/admin/schemas.ts` — extended with `zPartnerReferralRequest/Response`.
  - `src/features/admin/hooks/{use-partner-referral.ts, use-partner-referral.test.tsx}`.
  - `src/features/admin/routes/{AdminPartnerReferralPage.tsx, AdminPartnerReferralPage.test.tsx}`.
- **admin-tracxn (new):**
  - `src/features/enrichment/schemas.ts` (rewrite — was stub).
  - `src/features/enrichment/index.ts` (barrel).
  - `src/features/enrichment/hooks/{use-tracxn-ingest.ts, use-tracxn-ingest.test.tsx}`.
  - `src/features/enrichment/routes/{AdminTracxnPage.tsx, AdminTracxnPage.test.tsx}`.
- **admin-analytics (new):**
  - `src/features/analytics/schemas.ts` (rewrite — was stub) + `index.ts` barrel.
  - `src/features/analytics/lib/labels.ts`.
  - `src/features/analytics/hooks/{use-analytics-overview, use-analytics-funnel-lp, use-analytics-funnel-startup, use-analytics-funnel-connections, use-analytics-cohort, use-analytics-match-success}.ts` + `use-analytics.test.ts`.
  - `src/features/analytics/components/{KpiCards, FunnelBarChart, CohortHeatmap, MatchSuccessChart}.tsx`.
  - `src/features/analytics/routes/{AdminAnalyticsPage.tsx, AdminAnalyticsPage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — 8 new typed endpoint functions.
  - `src/api/query-keys.ts` — `qk.analytics.*`.
  - `src/app/router.tsx` — 3 new lazy routes.
  - `package.json` — added `recharts@^3.8.1`.
- **MSW + tests:**
  - `src/test/msw-fixtures/{admin-partner-referral-handlers.ts, admin-tracxn-handlers.ts, admin-analytics-handlers.ts}` (new).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (3 rows ticked), `.claude/session.md` (this file), `.claude/issues.md` ([I-1] added).

### Tests green?

Yes. All four gates exit 0. 308/308 tests across 82 files (was 290/290 across 76 files — +18 new tests, +6 new test files: 1 hook + 1 page per feature).

### Last updated

2026-04-26T01:38:00+05:30
