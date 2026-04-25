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

_(none — Stage 3 eighth feature `profile-viewers` complete. **8 of 9 Stage 3 user features are done — please run Spot-check Gate 2 before continuing.** The remaining row is `onboarding-add-user`, which is the spot-check-gate-2 boundary per `queue.md`.)_

### Last completed action

Completed Stage 3 eighth feature **profile-viewers** end-to-end. PRD §7.7.3 (`GET /interactions/profile-viewers`, cursor-paginated) ships behind `/profile-viewers` for all 10 authenticated roles, with PII discipline per §13 G11 enforced via TWO independent layers.

- **Schemas** (`src/features/profile-viewers/schemas.ts`):
  - `zViewerProfile` — exactly five fields (`user_id`, `name`, `role`, `organisation`, `avatar_url`). NO `email` / `phone`. NO `.passthrough()`. This is the parse-time firewall (Layer 1) — Zod silently drops any rogue keys the backend might add later.
  - `zProfileViewerItem` wraps `viewer` + `viewed_at` (ISO datetime).
  - `zProfileViewersResponse` is the cursor-paginated `{ items, next_cursor }` envelope.
- **Endpoint function** (`src/api/endpoints.ts`): `getProfileViewers({ limit, cursor })` Zod-parses the response via `unwrap()`.
- **Query keys**: `qk.interactions.profileViewersAll` + `qk.interactions.profileViewers(limit)`.
- **Hook** (`src/features/profile-viewers/hooks/use-profile-viewers.ts`): `useInfiniteQuery` keyed by `limit`; cursor flows through `pageParam` per CLAUDE.md §5.5. 60s staleTime, 5min gcTime.
- **Component** (`src/features/profile-viewers/components/ViewerCard.tsx`): destructures ONLY `{ user_id, name, role, organisation, avatar_url }` from `item.viewer` plus `viewed_at`. Inlines a small `initials()` helper for the avatar fallback (the existing copy in `features/profile/components/ProfileHeader.tsx` is duplicated rather than refactored — extracting to a shared lib is out of scope for this feature). Card is keyboard-accessible (`role="button"` + `Enter/Space` activation) and navigates to `/profile/{viewer.user_id}` on click. `viewed_at` renders as `formatDistanceToNow` with the full ISO in the `title` attribute.
- **Route** (`src/app/router.tsx`): `/profile-viewers` mounted under `<RequireAuth>` + `<ProfileGate>` + `<AppShell>` with no extra `<RoleGuard>` (matches `NAV_ITEMS.viewers.roles = ['*']`). Lazy-imported per [P-19].
- **Page** (`src/features/profile-viewers/routes/ProfileViewersPage.tsx`): card grid (`md:grid-cols-2`). Loading = 4 skeleton tiles, error = `<ErrorState>`, empty = `<EmptyState icon={Eye}>` with the "No one has viewed your profile yet." copy from §7.7.3 UI flow #4. "Load more" button surfaces when `hasNextPage` is true.
- **MSW** (`src/test/msw-fixtures/profile-viewers-handlers.ts`): cursor-pagination simulation (`?cursor=<offset>`). Helpers: `setMswProfileViewersFixture`, `setMswProfileViewersGenerated(count)` for the 60-row paginate scenario, `setMswProfileViewersLeakPii(true)` which deliberately splices `email` + `phone` onto the first row's `viewer` payload to prove the firewall, `queueProfileViewersError`. Reset hook registered in `src/test/setup.ts` afterEach.
- **README** (`src/features/profile-viewers/README.md`): documents the two enforcement layers + the render contract for `<ViewerCard>`. Explicitly required by the prompt; CLAUDE.md "no README without explicit ask" exception applies.
- **PII-grep regression test (Layer 2 — `pii-discipline.test.ts`)**: walks every `.ts` / `.tsx` file under `src/features/profile-viewers/`, strips block + line comments, and asserts no source line matches `/viewer\.email\b/` or `/viewer\.phone\b/`. The README and the test file itself are allow-listed (they document the rule). If a future edit lands a forbidden read in the source, the test fails the test gate.
- **Tests (+16 cases vs prior commit, total 223 across 59 files):**
  - `schemas.test.ts` (4): populated parse / Zod strips backend-leaked email+phone / empty paginated response / required-field rejection.
  - `pii-discipline.test.ts` (1): the source-grep regression.
  - `use-profile-viewers.test.ts` (5): 5-row seed / empty fixture / 60-row paginate (50+10) / Zod strips PII at the hook boundary / 500 ApiError.
  - `ProfileViewersPage.test.tsx` (6): renders 5 cards / empty state / 500 ErrorState / click → /profile/:id navigation / Load more pagination / no leaked email/phone in DOM.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (223/223 across 59 files), `pnpm build` (exits 0). Per-feature chunk: ProfileViewersPage **5.74 KB / 2.42 KB gzip** — comfortably under the 30 KB-per-feature budget. Main chunk: 290.30 → 290.42 KB gzip (+0.12 KB).

### Next concrete step

**Stage 3 spot-check gate 2 is now due** per `queue.md` (8 features built since calibration). Wait for the human to spot-check before starting `onboarding-add-user`.

Once the gate clears, the next unchecked queue.md row is **`onboarding-add-user`** (PRD §7.2.1 POST /onboarding/card-scan + §7.2.2 GET /onboarding/card-scan/{id}). Client-side OCR via `tesseract.js` per §13 G2; duplicate-contact modal on 409.

Smoke checks for the just-shipped Profile Viewers feature (manual):
- (a) Sign in as `+911234567892` (LP) → sidebar shows "Who viewed me" → click `/profile-viewers` → grid renders 5 seeded viewer cards (Kapil / Priya / Anita / Rohan / Sneha) with name + role badge + organisation + relative-time line.
- (b) Hover the "Viewed X ago" line → tooltip shows the full ISO datetime (PPpp format).
- (c) Click any card → navigates to `/profile/<user_id>` (works whether or not the profile is reachable; if not, the existing `<ProfilePage>` will surface its own error).
- (d) `setMswProfileViewersGenerated(60)` (via dev hooks, or just generate viewers organically) → "Load more" button appears under the grid → click → second page of 10 appended; button disappears.
- (e) `setMswProfileViewersLeakPii(true)` → reload `/profile-viewers` → DOM does NOT show `should-not-render@example.com` or `+919999999999` even though the JSON response contained them. (Network tab can confirm the bytes arrived; the Zod schema strips them before they reach React.)
- (f) `setMswProfileViewersFixture([])` → reload → empty state with "No one has viewed your profile yet." copy + Eye icon.

### Open blockers

_(none)_

### Files touched this session

- **profile-viewers feature (new):**
  - `src/features/profile-viewers/{schemas.ts, schemas.test.ts, index.ts, README.md, pii-discipline.test.ts}`.
  - `src/features/profile-viewers/hooks/{use-profile-viewers.ts, use-profile-viewers.test.ts}`.
  - `src/features/profile-viewers/components/ViewerCard.tsx`.
  - `src/features/profile-viewers/routes/{ProfileViewersPage.tsx, ProfileViewersPage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `getProfileViewers`.
  - `src/api/query-keys.ts` — added `qk.interactions.profileViewersAll` + `qk.interactions.profileViewers(limit)`.
  - `src/app/router.tsx` — `/profile-viewers` lazy-imported under `<AppShell>`.
- **MSW + tests:**
  - `src/test/msw-fixtures/profile-viewers-handlers.ts` (new — paginated + PII-leak toggle).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`profile-viewers` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 223/223 tests across 59 files (was 207/207 across 55 files — +16 new tests, +4 new test files: schemas, pii-discipline grep, hook, page).

### Last updated

2026-04-25T23:32:00+05:30
