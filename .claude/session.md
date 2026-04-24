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

_(none — Stage 2a auth feature complete, awaiting human review before feature-search)_

### Last completed action

Completed **Stage 2a — Auth + onboarding** (queue.md Stage 2 first row ticked). Endpoints live for `POST /auth/otp/send` (§7.1.1), `POST /auth/otp/verify` (§7.1.2), `GET /auth/me` (§7.1.3), `PATCH /onboarding/profile` (§7.2.3), `POST /onboarding/lp-profile` (§7.2.4) — typed in `src/api/endpoints.ts`, Zod-validated at the boundary, with query keys in `src/api/query-keys.ts`. `/signin` is a full phone → OTP flow (`src/features/auth/routes/SignInPage.tsx`): phone submit validates and E.164-normalises via `lib/phone.ts`, OTP auto-submits on the 6th digit, resend has a 30s cooldown, wrong OTP clears the field and inline-errors, and on success we call `/auth/me`, hydrate the auth store, and route per PRD §10.2 through `lib/post-signin-navigate.ts`. `/onboarding/profile` and `/onboarding/lp-profile` are built on `<ExecutionPanel>` (PRD §6.7); LP profile has a sector / stage / geography chip multi-select with a Skip-for-now affordance. Router adds a new `<ProfileGate>` wrapper (`src/auth/profile-gate.tsx`) that forces `profile_complete=false` to `/onboarding/profile` on every app-route visit and refreshes `/auth/me` on cold start. `DevPhoneHelper` renders a seeded-phone switcher on `/signin` in dev (tree-shaken in prod).

Tests: 5 hook tests (useOtpSend, useOtpVerify, useMe, useCompleteProfile, useCreateLPProfile — 13 cases total) covering happy path + 401/409/422/429/403 errors; 1 integration test (SignInPage — 3 cases: phone→OTP→role-home, incomplete-profile detour, wrong-OTP inline error). MSW handlers for all 5 endpoints live in `src/test/msw-fixtures/auth-handlers.ts` (seeded from DEV_SEED_USERS) with reset helpers called from `src/test/setup.ts`.

Four gates clean: `pnpm lint` (0 errors, 4 cosmetic react-refresh warnings), `pnpm typecheck` (0), `pnpm test` (29/29 across 10 files), `pnpm build` (exits 0; main chunk 284.50 KB gzip — still under 300 KB target, +45 KB vs Stage 1 from auth feature weight).

Notes: MSW 2.13 × happy-dom 14 incompatibility on `TypedEvent` forced a test-env switch to `jsdom` (jsdom 24 added as devDep). `vite.config.ts` now pins `test.env.VITE_*` values so the Zod env guard doesn't trip in tests. `auth-store.ts` gained a `resolveStorage()` fallback to an in-memory map when `localStorage.setItem` is absent (happy-dom quirk).

### Next concrete step

Wait for the human's Stage 2a review (plan.md gate: log in as LP → `/search`, startup_inprogress → `/pitch`, wrong OTP inline-errors + counter, `/expired` page, mobile 375px layout, tap targets ≥ 44px). If approved, proceed to **Stage 2b — feature-search** (queue.md Stage 2 second row) using the prompt in `docs/plan.md § Stage 2b`. Next unchecked queue row: `feature-search` (POST /search §7.4.1 + POST /interactions/log §7.7.1).

### Open blockers

_(none)_

### Files touched this session

- New: `src/features/auth/schemas.ts`, `src/features/auth/index.ts` (barrel), `src/features/auth/hooks/{use-otp-send,use-otp-verify,use-me}.ts` + tests, `src/features/auth/lib/{post-signin-navigate,hydrate-session}.ts`, `src/features/auth/components/DevPhoneHelper.tsx`, `src/features/auth/routes/{SignInPage.tsx,SignInPage.test.tsx}`
- New: `src/features/onboarding/schemas.ts`, `src/features/onboarding/index.ts`, `src/features/onboarding/hooks/{use-complete-profile,use-create-lp-profile}.ts` + tests, `src/features/onboarding/routes/{CompleteProfilePage.tsx,LPProfilePage.tsx}`
- New: `src/auth/profile-gate.tsx`, `src/test/hook-utils.tsx`, `src/test/msw-fixtures/{seed-users.ts,auth-handlers.ts}`
- Modified: `src/api/endpoints.ts` (5 typed functions), `src/api/query-keys.ts` (+ onboarding keys), `src/auth/auth-store.ts` (resilient storage), `src/app/router.tsx` (ProfileGate + onboarding routes), `src/test/msw-handlers.ts`, `src/test/setup.ts`, `vite.config.ts` (jsdom + test env), `package.json` (+ jsdom)
- Removed: `src/app/routes/SignInPage.tsx` (Stage-1 stub superseded by `src/features/auth/routes/SignInPage.tsx`)
- `.claude/queue.md` (`auth` row ticked), `.claude/session.md` (this file)

### Tests green?

Yes. All four gates exit 0. 29/29 tests.

### Last updated

2026-04-25T00:05:00+05:30

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
