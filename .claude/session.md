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

_(none — Stage 2a auth + responsive nav rule + session-termination policy all complete; awaiting human review before feature-search)_

### Last completed action

Followed Stage 2a with two scoped policy fixes prompted by hands-on review:

1. **Responsive navigation** (CLAUDE.md §7.11 updated, mirrors PRD §10.1). The Stage-1 sidebar was `hidden lg:block`, leaving tablet + mobile users with no nav at all. Fix:
   - New `<Sheet>` primitive in `src/components/ui/sheet.tsx` (Radix Dialog with side-anchored content).
   - Extracted shared `<NavList>` (`src/components/layout/NavList.tsx`) — single source of truth, used by both the desktop sidebar and the mobile drawer; tap-target height `min-h-11` per CLAUDE.md §7.11.
   - New `<MobileNavDrawer>` (`src/components/layout/MobileNavDrawer.tsx`) renders a hamburger button (`lg:hidden`) in the TopBar, opens a left-anchored sheet with the same `<NavList>`, and auto-closes when a link is clicked.
   - `<Sidebar>` is now lg+ only and pulls from `<NavList>`; `<TopBar>` mounts the drawer; `<AppShell>` unchanged.
   - 3 new tests in `src/components/layout/MobileNavDrawer.test.tsx` (button accessible name, full role-filtered nav rendered in dialog, admin items shown for admin role).
   - **Rule baked into CLAUDE.md §7.11**: every viewport must surface nav, the desktop sidebar + mobile drawer share `<NavList>`, `<Sheet>` is the sanctioned drawer primitive, and PR review must test 375 / 768 / 1024 / 1440. This is now a hard rule for every future feature session.

2. **Session-termination policy** (decisions.md [P-17], CLAUDE.md §15) — unchanged from previous turn but worth restating:
   - JWT's `expiresAt` is the only gate; only sign-out / natural expiry / fresh-signin failure clear the store.
   - `api/client.ts`, `auth/require-auth.tsx`, `auth/profile-gate.tsx` no longer clear on 401.
   - MSW tokens encode the phone (`msw-jwt.<base64url(phone)>`) so dev refresh recovers the session.
   - Regression tests in `src/api/client.test.ts` + `src/auth/profile-gate.test.tsx`.

Previously-completed auth chassis is unchanged: 5 typed endpoints, 5 React Query hooks with tests, `/signin` phone→OTP flow, `/onboarding/profile` + `/onboarding/lp-profile` on `<ExecutionPanel>`, role-based post-signin routing, `DevPhoneHelper` dev affordance.

Four gates clean on this commit: `pnpm lint` (0 errors, 4 cosmetic react-refresh warnings), `pnpm typecheck` (0), `pnpm test` (37/37 across 13 files — +3 cases vs the P-17 commit), `pnpm build` (exits 0; main chunk ~285 KB gzip).

Infra carryover (unchanged this turn): test runner is jsdom 24 (MSW 2.13 × happy-dom 14 TypedEvent incompat), `vite.config.ts` pins `test.env.VITE_*`, `auth-store.ts` has an in-memory storage fallback for tests.

### Next concrete step

Wait for the human's Stage 2a review. Smoke checks: (a) sign in as LP at 375 / 768 / 1024 / 1440, hamburger appears below 1024px and the drawer renders the same nav as the desktop sidebar, link click dismisses the drawer; (b) refresh while signed in stays on the role home with the TopBar user chip intact; (c) wrong OTP inline-errors and clears the field; (d) `/expired` page renders when `expiresAt` elapses. If approved, proceed to **Stage 2b — feature-search** (queue.md Stage 2 second row).

### Open blockers

_(none)_

### Files touched this session

- **Responsive nav rule (CLAUDE.md §7.11):** new `src/components/ui/sheet.tsx`, new `src/components/layout/NavList.tsx`, new `src/components/layout/MobileNavDrawer.tsx`, new `src/components/layout/MobileNavDrawer.test.tsx`; modified `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`; updated `CLAUDE.md §7.11`.
- **Policy change (decisions.md P-17):** modified `src/api/client.ts`, `src/auth/require-auth.tsx`, `src/auth/profile-gate.tsx`, `src/test/msw-fixtures/auth-handlers.ts`; added `src/api/client.test.ts`, `src/auth/profile-gate.test.tsx`; updated `CLAUDE.md §15` and `.claude/decisions.md § Resolved` with P-17.
- **From earlier in Stage 2a (still in HEAD):** `src/features/auth/{schemas.ts, index.ts, hooks/*, lib/*, components/*, routes/*}`, `src/features/onboarding/{schemas.ts, index.ts, hooks/*, routes/*}`, `src/auth/profile-gate.tsx`, `src/test/{hook-utils.tsx, msw-fixtures/*}`, `src/api/{endpoints.ts, query-keys.ts}`, `src/auth/auth-store.ts`, `src/app/router.tsx`, `src/test/{msw-handlers.ts, setup.ts}`, `vite.config.ts`, `package.json`.

### Tests green?

Yes. All four gates exit 0. 37/37 tests across 13 files.

### Last updated

2026-04-25T11:08:00+05:30

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
