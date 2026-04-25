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

_(none — Stage 3 first feature `profile-view` complete; next unchecked queue.md row is `connections`)_

### Last completed action

Completed Stage 3 first feature **profile-view** end-to-end against the §13 G1 gap (`VITE_PROFILE_V1_ENABLED=false`). PRD §7.5.1 implemented; flip plan is a single env-var change.

- **Schemas** (`src/features/profile/schemas.ts`): `zProfileView` + nested `zStartupBlock` / `zLPBlock` / `zVCBlock` / `zContact` / `zViewerInteraction`. Every nullable field is `.nullable().optional()` so the same parser handles all three viewer states (no-connection / pending / accepted-with-contact) plus partner-masked responses (PRD §8.12.3).
- **Endpoint** (`src/api/endpoints.ts`): `getProfileById(id)` branches on `env.PROFILE_V1_ENABLED`. Flag on → real `GET /profile/{id}` + Zod parse. Flag off → `ProfileServiceInterim.getById(id)`. Public signature is identical so the flip is a one-line env change.
- **Interim composer** (`src/api/interim/profile-service.ts`): runs `POST /search { query: targetUserId }` + `GET /connections` + `GET /connections/pending` in parallel; matches the target by `user_id` in the search hit (the connections lists derive `contact`, `has_connected`, `has_requested`); throws `ApiError(404)` when no source has the user. The search MSW haystack now includes `user_id` so the UUID-as-query strategy returns the matching catalogue item.
- **Hook** (`src/features/profile/hooks/use-profile.ts`): thin `useQuery` keyed on `qk.profile.byId(id)` with `staleTime: 30_000`.
- **Page** (`src/features/profile/routes/ProfilePage.tsx`): all four UI states — skeleton loading, EmptyState for missing id / 404, ErrorState for other errors, success body. Success body renders: back button, header card (avatar + name + role badge + organisation/designation), action area (Request to connect / Pending admin approval / Connected — driven by `viewer_interaction` + `can(role, 'connections.request')`), startup OR LP block based on target role, ContactCard ONLY when `contact !== null`. `useLogInteraction({ interaction_type: 'profile_view', target_id, target_type, source: 'profile_page' })` fires once on mount; the new module-level dedup absorbs StrictMode double-invokes and remounts within 10s. Partner viewers see `<LockedField>` blurred placeholders for missing rows via the new `<InfoRow>` primitive (mirrors the search-card mask UX from [P-21]).
- **Routing** (`src/app/router.tsx`): `/profile/:id` mounted under `<RequireAuth><ProfileGate><AppShell>` inside the same searcher `<RoleGuard>` that wraps `/search` (`lp, potential_lp, vc, startup_funded, partner, admin, super_admin`). Page is `React.lazy`-imported at module scope per [P-19].
- **Module-level interaction dedup** (`src/lib/interaction-dedup.ts`): hoisted out of `useLogInteraction`'s useRef into a module-scoped `Map` so a page mount → unmount → remount within 10s does NOT re-fire. `resetInteractionDedup()` wired into `src/test/setup.ts` afterEach to keep tests isolated.
- **MSW** (`src/test/msw-fixtures/profile-handlers.ts`): three scenario fixtures (`no_connection`, `pending`, `accepted_with_contact`) + `forbidden` / `not_found` / `error_500` error scenarios, scenario-switchable via `setMswProfileScenario`. Owns `GET /profile/{id}` (for the flag=true path), `GET /connections`, and `GET /connections/pending` (for the §13 G1 interim composer). Registered in `msw-handlers.ts`; `resetMswProfileState()` wired into `setup.ts`.
- **Tests** (+13 cases vs prior commit, total 82 across 21 files):
  - 3 `useProfile` cases — composes no-connection / pending / accepted-with-contact viewer states correctly through the interim path.
  - 5 `ProfilePage` smoke cases — renders Request-to-connect on no-connection, Pending status on pending, Contact card + Connected pill on accepted, "Profile not found" empty state on 404, and partner viewer renders without crashing.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (82/82), `pnpm build` (exits 0). Bundle: ProfilePage chunk **2.66 KB gzip**, main chunk 285.77 → 287.09 KB gzip (+1.32 KB — well under the 30 KB-per-feature budget per CLAUDE.md §10).

### Next concrete step

Pick up the next unchecked feature in `queue.md § Stage 3` — **`connections`** (PRD §7.6.4 + §7.6.5 + §7.6.3 + §7.7.2). Two routes (`/connections` accepted list, `/connections/pending` incoming/outgoing tabs), with PATCH `/connections/{id}/respond` + POST `/interactions/feedback` mutations. Note: the profile interim composer already calls `GET /connections` + `GET /connections/pending` via MSW handlers in `profile-handlers.ts` — the connections feature will likely promote those handlers (or replicate them) into a dedicated `connections-handlers.ts` and add the missing fixtures (rejected_admin, declined). Smoke checks for the just-shipped profile-view: (a) sign in as LP `+911234567892`, navigate to `/profile/11111111-1111-4000-8000-000000000001` — startup card renders with Request-to-connect button; (b) sign in as partner `+911234567897` to confirm masked view via `<InfoRow>` placeholders; (c) hard-refresh the page within 10s and verify only one `POST /interactions/log` fires (Network tab) — confirms the module-level dedup.

### Open blockers

_(none)_

### Files touched this session

- **Profile feature (new):** `src/features/profile/{schemas.ts, index.ts}`, `src/features/profile/hooks/{use-profile.ts, use-profile.test.ts}`, `src/features/profile/components/{InfoRow.tsx, ProfileHeader.tsx, StartupBlock.tsx, LPBlock.tsx, ContactCard.tsx}`, `src/features/profile/routes/{ProfilePage.tsx, ProfilePage.test.tsx}`.
- **Interim service (new):** `src/api/interim/profile-service.ts`.
- **Cross-cutting:** `src/api/endpoints.ts` (`getProfileById`), `src/api/query-keys.ts` (`qk.profile.{all,byId}`), `src/app/router.tsx` (`/profile/:id` route + lazy import), `src/lib/interaction-dedup.ts` (new), `src/features/interactions/hooks/use-log-interaction.ts` (refactored to use module-level dedup).
- **MSW + tests:** new `src/test/msw-fixtures/profile-handlers.ts`; modified `src/test/{msw-handlers.ts, setup.ts}`. `src/test/msw-fixtures/search-handlers.ts` haystacks now include `user_id` so the §13 G1 composer's UUID-as-query strategy works.
- **Coordination:** `.claude/queue.md` (`profile-view` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 82/82 tests across 21 files.

### Last updated

2026-04-25T16:30:00+05:30
