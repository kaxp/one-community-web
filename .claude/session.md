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

_(none — Stage 2b feature-search complete; awaiting human review before Stage 2c admin-connections)_

### Last completed action

Completed **Stage 2b — feature-search** (queue.md Stage 2 second row ticked). PRD §7.4.1 + §7.7.1 implemented end-to-end:

- **Endpoints**: `searchUnified()` posts to `/search` (Zod-parsed `discriminatedUnion('target_type')` over startup + lp shapes; both variants accept all fields as optional so partner-masked responses parse cleanly). `logInteraction()` posts to `/interactions/log` (fire-and-forget at the call site).
- **Hooks**: `useSearch({ query, filters, enabled })` is a `useInfiniteQuery` keyed on `qk.search.query({ query, filters })`, paginating via `next_cursor`, with `staleTime: 0`. `useLogInteraction()` returns a memoised `fire()` function with a 10s client-side dedup window per `(target_id, interaction_type)` (CLAUDE.md §5.6 — server dedups for 60s).
- **Components**: `<SearchBar>` (search input + submit button), `<FilterChips>` (sector / stage / geography multi-select; URL-backed via `useSearchParams`; round-trips comma-joined values), `<ResultCard>` (target_type-narrowed render: startup variant shows company_name / one_liner / description / traction / funding_target_cr / ai_reason; LP variant shows fund_name / cheque_range / sectors / stages / geography / ai_reason. Defensive rendering — every optional field hides its row when null/missing, so partner-masked items render gracefully).
- **Page**: `/search` ships all 4 UI states (skeleton loading, empty CTA when no query, error state with retry, populated result grid). Stage-3 fallback banner ("AI ranking temporarily unavailable…") shows when `stage3_applied=false`. Search input is debounced 400ms via new `lib/use-debounced-value.ts` and the URL/queryKey update on the trailing edge. The form-level submit button is wired to a `useMutation` that pre-warms the query cache — surfacing isPending / inline ErrorState in the spirit of `<ExecutionPanel>` (PRD §6.7.1 explicitly classifies /search as a "plain page", but the prompt asked for ExecutionPanel surface — we surface mutation state without forcing the whole page into the panel's renderResult slot, since infinite scroll lives below).
- **Per-card analytics**: `<ResultCard>` mounts an `IntersectionObserver` (threshold 0.4); when a card becomes visible it fires `search_view` once, deduped client-side. Falls back to immediate fire when IntersectionObserver isn't available (jsdom, tests).
- **Routing**: `/search` is mounted under `<RoleGuard roles={['lp','potential_lp','vc','startup_funded','admin','super_admin']}>` inside `AppShell`. **Removed `partner` from `search.use` capability and from the `search` NAV_ITEM** to honor CLAUDE.md §15 / PRD §7.4.1 (partner is excluded from search). Added a regression test for it.
- **MSW**: 5 fixtures in `src/test/msw-fixtures/search-fixtures.ts` (startup-results, lp-results, empty, stage3_fallback, partner-masked) plus an `error_500` and `rate_limit` mode. `src/test/msw-fixtures/search-handlers.ts` exposes `setMswSearchScenario(...)` + `getMswInteractionLogCount()` for tests; reset helpers wired into `src/test/setup.ts`.
- **Tests**: 7 hook tests (useSearch — startup / lp / fallback / empty / disabled / 429), 3 hook tests (useLogInteraction — fires, dedupes, silent on failure), 7 SearchPage smoke tests (4 UI states, partner masking renders without crash, stage3 banner, interaction fire). Total **+18 cases vs prior commit**.

Four gates clean: `pnpm lint` (0 errors, 4 cosmetic react-refresh warnings), `pnpm typecheck` (0), `pnpm test` (55/55 across 16 files), `pnpm build` (exits 0; main chunk 289.99 KB gzip — under the 300 KB target).

### Next concrete step

Wait for the human's Stage 2b review. Smoke checks: (a) sign in as LP, type "fintech" → debounce 400ms then results stream in; URL params should reflect `?q=fintech`; (b) toggle Sector chips → result grid updates and URL persists; (c) try as `partner` role → no Search nav item; visiting `/search` directly → `/unauthorized`; (d) hit Search button explicitly → fresh fetch fires; (e) Network tab should show 1 `/interactions/log` per visible card with body `{ interaction_type: 'search_view', target_type, ... }`. If approved, prompt **Stage 2c — feature-admin-connections** (queue.md Stage 2 third row).

### Open blockers

_(none)_

### Files touched this session

- **Search feature (new):** `src/features/search/{schemas.ts, index.ts}`, `src/features/search/hooks/{use-search.ts, use-search.test.ts}`, `src/features/search/lib/labels.ts`, `src/features/search/components/{SearchBar.tsx, FilterChips.tsx, ResultCard.tsx}`, `src/features/search/routes/{SearchPage.tsx, SearchPage.test.tsx}`.
- **Interactions feature (new):** `src/features/interactions/{schemas.ts, index.ts}`, `src/features/interactions/hooks/{use-log-interaction.ts, use-log-interaction.test.ts}`.
- **Cross-cutting:** new `src/lib/use-debounced-value.ts`; modified `src/api/endpoints.ts` (`searchUnified` + `logInteraction`); modified `src/api/query-keys.ts` (added `qk.interactions.log`); modified `src/app/router.tsx` (`/search` route under RoleGuard); modified `src/lib/role-capabilities.ts` (partner excluded from `search.use` + `search` nav); added test `src/lib/role-capabilities.test.ts` (partner-not-in-search regression).
- **MSW + tests:** new `src/test/msw-fixtures/{search-fixtures.ts, search-handlers.ts}`; modified `src/test/{msw-handlers.ts, setup.ts}`.
- **From prior turns (still in HEAD):** Stage 1 chassis, Stage 2a auth + onboarding, P-17 session-termination policy, responsive-nav rule (`<NavList>` / `<MobileNavDrawer>` / `<Sheet>`).
- `.claude/queue.md` (`feature-search` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 55/55 tests across 16 files.

### Last updated

2026-04-25T11:30:00+05:30

---

## Example — what this looks like mid-build

<!--
### Current feature
feature-search

### Last completed action
Implemented `useSearch` hook with 400ms debounce + MSW handler for POST /search covering
startup-results and empty-results fixtures. Unit tests pass.

### Next concrete step
Wire `useSearch` into `SearchPage.tsx`; build `<FilterChips>` component with URL-backed state
(sector, stage, geography); add infinite-scroll via `next_cursor`.

### Open blockers
- [P-7] Partner role UX — should the "Request Connect" button be hidden or disabled?
  (Non-blocking; I've hidden it for now per PRD §7.4.1 note.)

### Files touched this session
- src/features/search/schemas.ts (new)
- src/features/search/hooks/use-search.ts (new)
- src/api/endpoints.ts (added `search()` function)
- src/api/query-keys.ts (added `qk.search.*`)
- src/test/msw-handlers.ts (added POST /search handler)
- src/test/msw-fixtures/search-startup-results.json (new)
- src/features/search/hooks/use-search.test.ts (new)

### Tests green?
Yes. `pnpm lint && typecheck && test --run && build` all exit 0.

### Last updated
2026-04-25T14:47:00+05:30
-->
