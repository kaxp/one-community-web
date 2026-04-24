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

_(none — Stage 2a auth feature complete, session-termination policy refactored per user direction, awaiting human review before feature-search)_

### Last completed action

Amended the Stage 2a auth feature to enforce the new **session-termination policy** (decisions.md [P-17], CLAUDE.md §15 updated):

- `src/api/client.ts` no longer clears `authStore` on 401 / `token_expired` / `link_expired`. It still rethrows the `ApiError` so individual callers can react.
- `src/auth/require-auth.tsx` no longer listens to `auth:expire` events. Token validity check is now: `token && expiresAt > Date.now()` on every render — nothing else.
- `src/auth/profile-gate.tsx` no longer clears the session or redirects to `/signin` when `/auth/me` returns 401 (or anything else). It falls back to the persisted user snapshot from `zustand/persist`; a `profile_complete=false` snapshot still redirects to `/onboarding/profile`. A browser refresh while signed in now keeps the session intact, which was the reported bug.
- `src/test/msw-fixtures/auth-handlers.ts` — MSW tokens now encode the phone (`msw-jwt.<base64url(phone)>`) and authenticated handlers decode it on every request. This keeps the dev-mode mock stateless across page loads, so refresh + MSW works end-to-end. `setMswSignedInPhone()` remains for tests that bypass the sign-in flow.
- New regression tests: `src/api/client.test.ts` (3 cases asserting 401 / `token_expired` / `link_expired` do NOT clear the store); `src/auth/profile-gate.test.tsx` (2 cases asserting refresh-after-401 stays on `/dashboard` and a stale `profile_complete=false` snapshot still redirects to onboarding).

Previously-completed auth chassis is unchanged: 5 typed endpoints, 5 React Query hooks with tests, `/signin` phone→OTP flow, `/onboarding/profile` + `/onboarding/lp-profile` on `<ExecutionPanel>`, role-based post-signin routing (`lib/post-signin-navigate.ts`), `DevPhoneHelper` dev affordance, MSW handlers seeded from `DEV_SEED_USERS`.

Four gates clean on this commit: `pnpm lint` (0 errors, 4 cosmetic react-refresh warnings), `pnpm typecheck` (0), `pnpm test` (34/34 across 12 files — +5 cases vs prior snapshot), `pnpm build` (exits 0; main chunk 284.16 KB gzip).

Infra carryover (unchanged this turn): test runner is jsdom 24 (MSW 2.13 × happy-dom 14 TypedEvent incompat), `vite.config.ts` pins `test.env.VITE_*`, `auth-store.ts` has an in-memory storage fallback for tests.

### Next concrete step

Wait for the human's Stage 2a + P-17 review (plan.md gate plus the refresh smoke: sign in as LP → `pnpm dev` refresh → should stay on `/search`, TopBar user chip intact). If approved, proceed to **Stage 2b — feature-search** (queue.md Stage 2 second row) using the prompt in `docs/plan.md § Stage 2b`. Next unchecked queue row: `feature-search` (POST /search §7.4.1 + POST /interactions/log §7.7.1).

### Open blockers

_(none)_

### Files touched this session

- **Policy change (decisions.md P-17):** modified `src/api/client.ts`, `src/auth/require-auth.tsx`, `src/auth/profile-gate.tsx`, `src/test/msw-fixtures/auth-handlers.ts`; added `src/api/client.test.ts`, `src/auth/profile-gate.test.tsx`; updated `CLAUDE.md §15` and `.claude/decisions.md § Resolved` with P-17.
- **From prior turn (still in HEAD):** `src/features/auth/{schemas.ts, index.ts, hooks/*, lib/*, components/*, routes/*}`, `src/features/onboarding/{schemas.ts, index.ts, hooks/*, routes/*}`, `src/auth/profile-gate.tsx`, `src/test/{hook-utils.tsx, msw-fixtures/*}`, `src/api/{endpoints.ts, query-keys.ts}`, `src/auth/auth-store.ts`, `src/app/router.tsx`, `src/test/{msw-handlers.ts, setup.ts}`, `vite.config.ts`, `package.json`.

### Tests green?

Yes. All four gates exit 0. 34/34 tests across 12 files.

### Last updated

2026-04-25T00:55:00+05:30

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
