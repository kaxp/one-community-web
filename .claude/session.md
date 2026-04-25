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

_(none — Stage 3 sixth feature `travel` complete. Next unchecked queue.md row is `matchmaking`.)_

### Last completed action

Completed Stage 3 sixth feature **travel** end-to-end. All four PRD endpoints (§7.11.1 POST plans / §7.11.2 GET plans / §7.11.3 DELETE plan / §7.11.4 PUT home-city) ship behind a single `/travel` route open to all 10 authenticated roles.

- **Cross-cutting auth-store extension:** `UserProfile` (and `zAuthMeResponse`, `seedProfileFromVerify`, `profileFromMe`) gained an optional/nullable `home_city` field. PRD §7.11.4 says `qk.auth.me` "includes home_city" but §7.1.3's sample payload didn't show it — the schema now treats it as `optional().nullable()` so older /auth/me responses parse cleanly while newer ones flow through. The home-city PUT hook patches `authStore.user.home_city` immediately and invalidates `qk.auth.me` on success.
- **Travel schemas** (`src/features/travel/schemas.ts`):
  - `zTravelPlan` (§7.11.1/§7.11.2) — `id`, `user_id`, `destination_city`, `travel_start`/`travel_end` (`yyyy-MM-dd`), `purpose` nullable, `status: 'active'|'cancelled'`, `alerts_sent`.
  - `zTravelPlansResponse` is a bare `z.array(zTravelPlan)` (array IS the payload, no `{ items }` wrapper — matches §7.11.2).
  - `zTravelPlanCreateRequest` — wire body, `purpose` optional.
  - `zTravelPlanCancelResponse` — `{ id, status }` only (§7.11.3).
  - `zHomeCityRequest` / `zHomeCityResponse` — §7.11.4.
  - `zTripForm` — RHF input shape; trims `destination_city`, coerces empty `purpose` to undefined, **client-side validates `travel_end >= travel_start` via `.refine` with `path: ['travel_end']`** so the inline error appears under the end-date field.
  - `zHomeCityForm` — single-input form schema; trim + 1..200 chars.
- **Endpoint functions** (`src/api/endpoints.ts`): `postTravelPlan`, `getTravelPlans`, `deleteTravelPlan`, `putHomeCity`. All Zod-parsed via `unwrap()`. `purpose` undefined-stripped from POST body via `stripUndefined`.
- **Query keys** (`src/api/query-keys.ts`): `qk.travel.{all, plansAll, plans(activeOnly)}`. The `plansAll` alias lets mutations invalidate both active-only=true and active-only=false variants in one call.
- **Hooks** (`src/features/travel/hooks/`):
  - `useTravelPlans({ activeOnly })` — useQuery, 30s staleTime.
  - `useCreateTravelPlan()` — useMutation; on success invalidates `qk.travel.plansAll`.
  - `useDeleteTravelPlan()` — useMutation with **optimistic remove across every cached `qk.travel.plans(*)` variant** (§8.12.5). Walks `getQueriesData` so toggling active_only doesn't break the rollback. On error, restores all snapshots; on settle, invalidates `plansAll` so the cache reconciles with server truth (cancelled rows drop from active_only=true; show with status='cancelled' on active_only=false).
  - `useUpdateHomeCity()` — useMutation; on success patches `authStore.user.home_city` immediately and invalidates `qk.auth.me`.
- **Route** (`src/app/router.tsx`): `/travel` mounted under `<RequireAuth>` + `<ProfileGate>` + `<AppShell>` with no extra `<RoleGuard>` (matches `NAV_ITEMS.travel.roles = ['*']`). Lazy-imported per [P-19].
- **Page** (`src/features/travel/routes/TravelPage.tsx`): two stacked sections — `<HomeCityPanel>` (ExecutionPanel wrapping a single `home_city` input) on top, `<Card>` with the trip list and "Add trip" + "Show past trips" affordances below. URL param `?active_only=false` drives the toggle so the state survives refresh / share-link.
- **Components** (`src/features/travel/components/`):
  - `HomeCityPanel.tsx` — wraps `<ExecutionPanel>` with `useUpdateHomeCity`; pre-seeds the input from `useUser()?.home_city ?? ''`. Submit label flips to "Update home city" when a value already exists.
  - `TripList.tsx` — sorts client-side by `travel_start` ASC (PRD §7.11.2 doesn't guarantee order). Each row is a `<Card>` with city + status badge + date range + optional purpose + Cancel button. `<CancelDialog>` wraps the destructive confirm and routes 403 / 404 to specific toasts. Loading = 3 row skeletons; empty (active_only=true) = "No upcoming trips" with copy nudging the user to add one.
  - `AddTripDialog.tsx` — RHF + `zodResolver(zTripForm)`. `type="date"` inputs emit `yyyy-MM-dd` directly; today's date is the initial value for both. End-before-start failures render under the End date field via Zod's `path` config; server 422 surfaces inline via `<ErrorState compact />` (no toast for validation_error). Other errors toast.
- **MSW** (`src/test/msw-fixtures/travel-handlers.ts`): canonical owner of all four travel routes. Stateful — POST appends, DELETE flips status to `cancelled`, GET honours `active_only` (fixture `today` is `2026-04-25` matching the system date so the seed Delhi-Jan trip is filtered out by default). Helpers: `setMswTravelPlansFixture`, `setMswTravelToday`, `setMswHomeCityFixture`, `getMswTravelPlans`, `getMswHomeCity`, `queueTravelListError`, `queueTravelCreateError`, `queueTravelDeleteError`, `queueHomeCityError`. Reset hook registered in `src/test/setup.ts` afterEach.
- **Tests (+28 cases vs prior commit, total 190 across 51 files):**
  - `schemas.test.ts` (10): valid plan / null purpose / empty list / bad date / end-before-start / same-day / coerce-empty-purpose / 600-char rejection / trim destination / blank home-city / trim home-city.
  - `use-travel-plans.test.ts` (4): active-only filter / past-included / empty / 500 ApiError.
  - `use-create-travel-plan.test.tsx` (3): create + invalidate / 422 surfaces / undefined purpose stripped.
  - `use-delete-travel-plan.test.tsx` (2): optimistic remove / rollback on error.
  - `use-update-home-city.test.tsx` (2): success patches store + invalidates qk.auth.me / 422 leaves store untouched.
  - `TravelPage.test.tsx` (6): renders home-city + trips / toggle past / empty state / 500 ErrorState / add-trip flow / cancel-trip optimistic remove.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (190/190 across 51 files), `pnpm build` (exits 0). Per-feature chunk: TravelPage **8.99 KB / 3.26 KB gzip** — comfortably under the 30 KB-per-feature budget. Main chunk: 289.59 → 290.02 KB gzip (+0.43 KB).

### Next concrete step

Next unchecked queue.md row is **`matchmaking`** (PRD §7.8.5 GET /matchmaking/suggestions, §7.8.6 POST /matchmaking/suggestions/{id}/respond). Card-based UI with "Interested / Skip / Not a fit" actions. The admin-side matchmaking ops is a Stage 4 feature, not this one.

Smoke checks for the just-shipped Travel feature (manual):
- (a) Sign in as `+911234567892` (LP) → sidebar shows "Travel" → click `/travel` → top section renders the home-city ExecutionPanel; bottom section renders the upcoming trips list with seed Bengaluru + Mumbai entries. Delhi (Jan 2026) is filtered out by default.
- (b) Type "Bengaluru" in the home-city input → click "Save home city" → toast "Saved" → input retains the new value (auth store + /auth/me both updated).
- (c) Click "Add trip" → modal opens with today's date in both pickers → type a city + change end date to a date BEFORE start date → "End date must be on or after start date" error surfaces under the end-date field.
- (d) Fix the dates and submit → toast "Trip added" → modal closes → new row appears at the correct position in the list (sorted by start date ASC).
- (e) Click Cancel on an upcoming trip → confirm dialog → "Cancel trip" → row disappears from the active_only=true list.
- (f) Toggle "Show past trips" → URL flips to `?active_only=false` → cancelled + past rows reappear with their respective badges. Toggle off → query param removed.

### Open blockers

_(none)_

### Files touched this session

- **Travel feature (new):**
  - `src/features/travel/{schemas.ts, schemas.test.ts, index.ts}`.
  - `src/features/travel/hooks/{use-travel-plans, use-create-travel-plan, use-delete-travel-plan, use-update-home-city}.{ts,tsx}` + matching `.test.{ts,tsx}` files.
  - `src/features/travel/components/{HomeCityPanel, TripList, AddTripDialog}.tsx`.
  - `src/features/travel/routes/{TravelPage.tsx, TravelPage.test.tsx}`.
- **Cross-cutting:**
  - `src/types/domain.ts` — `UserProfile.home_city?: string | null`.
  - `src/features/auth/schemas.ts` — `zAuthMeResponse.home_city: z.string().nullable().optional()`.
  - `src/features/auth/lib/hydrate-session.ts` — map `home_city` through `profileFromMe` + default `null` in `seedProfileFromVerify`.
  - `src/api/endpoints.ts` — added `postTravelPlan`, `getTravelPlans`, `deleteTravelPlan`, `putHomeCity`.
  - `src/api/query-keys.ts` — added `qk.travel.{all, plansAll, plans}`.
  - `src/app/router.tsx` — `/travel` lazy-imported under `<AppShell>` (no extra `<RoleGuard>`).
- **MSW + tests:**
  - `src/test/msw-fixtures/travel-handlers.ts` (new — stateful list with active_only filter).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`travel` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 190/190 tests across 51 files (was 162/162 across 45 files — +28 new tests, +6 new test files: schemas, four hooks, one page).

### Last updated

2026-04-25T19:38:00+05:30
