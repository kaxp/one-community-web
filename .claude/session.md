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

_(none — Stage 3 fourth feature `mis` complete. The four-features spot-check gate is now due before continuing to `schedule`.)_

### Last completed action

Completed Stage 3 fourth feature **mis** end-to-end. All three PRD endpoints (§7.9.1 GET form / §7.9.3 GET prefill / §7.9.2 POST submit) ship behind a single `/mis` route gated to `startup_funded` + admin / super_admin.

- **MIS schemas** (`src/features/mis/schemas.ts`):
  - `zMISFormResponse` (§7.9.1), `zMISPrefillResponse` (§7.9.3), `zMISSubmitResponse` (§7.9.2 ack), `zMISPrefill` (nullable prefill payload shared by both GETs).
  - `zMISRawData` — **strict** 6-key allowlist (`revenue_inr` + `burn_inr` Decimal-string, `headcount` int, `runway_months` float, `highlights` + `lowlights` ≤ 2000-char string). `.partial().strict()` so each key is individually optional but extras throw `ZodError`. Tested explicitly.
  - `zMISFormInput` — RHF input shape (revenue/burn/runway/headcount as numbers, highlights/lowlights as strings) with the same NaN-tolerant `.optional() + .transform(NaN→undefined)` pattern used in pitch.
  - `zMISSubmitRequest` — wire body (period regex + top-level + raw_data).
  - `buildMISRequest(period, form)` — pure helper that converts form input to wire body. INR amounts go into `raw_data.revenue_inr` / `burn_inr` as `value.toFixed(2)` Decimal strings (PRD §8.12.1). Validates `raw_data` via `.strict()` before composing the body — any developer typo throws here, before the network call.
- **Endpoint functions** (`src/api/endpoints.ts`): `getMisForm`, `getMisPrefill({ companyId? })`, `postMisSubmit(body)` — all Zod-parsed via `unwrap()`.
- **Query keys** (`src/api/query-keys.ts`): `qk.mis.{all, form, prefill}`. `prefill` accepts an optional `{ companyId }` suffix when admin mode is needed (passed through tuple-style for cache identity).
- **Hooks** (`src/features/mis/hooks/`):
  - `useMisForm()` — useQuery against `qk.mis.form`. ApiError flows through (no domain-signal carve-out — 404 here means "no startup profile", which is genuinely an error state for this page).
  - `useMisPrefill({ companyId?, enabled? })` — parallel useQuery against `qk.mis.prefill`.
  - `useSubmitMis(period)` — useMutation accepting `MISFormInput`; internally calls `buildMISRequest(period, form)` then `postMisSubmit`. Invalidates `qk.mis.form` (so `already_submitted` flips true) AND `qk.admin.summary` (admin's mis_status badge) per §8.12.4.
- **Route** (`src/app/router.tsx`): `/mis` mounted under `<RoleGuard roles={['startup_funded', 'admin', 'super_admin']}>` (matches `CAPABILITIES['mis.submit']`). Lazy-imported per [P-19].
- **Page** (`src/features/mis/routes/MISPage.tsx`): two parallel queries via independent hooks (`useMisForm` + `useMisPrefill`), full four states (loading skeleton / ErrorState / already-submitted banner / success form). Banner reads "MIS for {period} was already submitted on {date}. Submitting again will be rejected with a 409. Contact your admin if you need to override." Submit button label flips to "Already submitted" and the form is `disabled` when `already_submitted=true`.
- **Components** (`src/features/mis/components/`):
  - `MISForm.tsx` — `<ExecutionPanel<MISFormInput, MISSubmitResponse>>` consumer. Numeric inputs for revenue/burn/runway/headcount + textareas for highlights/lowlights (max 2000 chars enforced both via `maxLength` HTML attr and Zod). Last-month prefill values surface as field hints (`Last month: ₹ 20,00,000`) using `formatINR`.
- **Period label** — `formatPeriodLabel('2026-04')` → `April 2026` via `date-fns` `format(parse('yyyy-MM'), 'LLLL yyyy')` (PRD §8.12.2).
- **MSW** (`src/test/msw-fixtures/mis-handlers.ts`): canonical owner of `GET /portfolio/mis`, `GET /portfolio/mis/prefill`, `POST /portfolio/mis`. Stateful — first POST flips the in-memory fixture's `already_submitted` flag to `true`, so a second POST in the same test produces real 409 `mis_already_submitted` (mirrors backend UNIQUE(startup_id, period) behaviour). Helpers: `setMswMisFormFixture`, `setMswMisAlreadySubmitted`, `setMswMisPrefillFixture`, `queueMisFormError`, `queueMisPrefillError`, `queueMisSubmitError`. Reset hook registered in `src/test/setup.ts` afterEach.
- **Tests (+23 cases vs prior commit, total 141 across 39 files):**
  - `schemas.test.ts` (10): zMISRawData accepts 6 allowlisted keys / rejects extra key / rejects misspelled key / accepts empty {}; PERIOD_REGEX positive + negative cases; buildMISRequest INR-as-Decimal-string + omits raw_data when empty + omits undefined top-level fields.
  - `use-mis-form.test.ts` (3): success / already_submitted with timestamp / 500 ApiError.
  - `use-mis-prefill.test.ts` (3): success / prefill=null / 404 ApiError.
  - `use-submit-mis.test.ts` (3): happy path / 409 mis_already_submitted / 422 validation_error.
  - `MISPage.test.tsx` (4): renders prefilled form (no banner) / shows already-submitted banner + disabled submit button / 500 surfaces ErrorState / submit succeeds → page refetches → banner appears + form values retained.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (141/141 across 39 files), `pnpm build` (exits 0). Per-feature chunk: MISPage **25.24 KB / 6.22 KB gzip**. Main chunk: 288.39 → 289.06 KB gzip (+0.67 KB — well under the 30 KB-per-feature budget).

### Next concrete step

**Spot-check Gate 1 is now due** — 4 Stage 3 features complete (`profile-view`, `connections`, `pitch`, `mis`). Per `queue.md § Stage 3`: "Spot-check gate after 4 features total". The human should review before the next session picks up `schedule`.

After the gate clears, the next unchecked queue.md row is **`schedule`** (PRD §7.10.1 GET slots, §7.10.2 POST book, §7.10.3 GET bookings, §7.10.4 DELETE book/{id}). Calendar grid UI in IST timezone via `date-fns-tz`.

Smoke checks for the just-shipped MIS feature (manual):
- (a) Sign in as `+911234567894` (startup_funded) → sidebar shows "MIS" → click `/mis` → form prefills with last-month values, period label reads "April 2026", no banner.
- (b) Submit the form → success toast "Submitted MIS for 2026-04" → page refetches and now shows the warning banner with the submission timestamp; the submit button reads "Already submitted" and the form is disabled.
- (c) Click submit again (it's disabled, but try via DevTools to remove `disabled`) — verify the 409 path: ApiError surfaces inline with code `mis_already_submitted`, form values are retained.
- (d) Sign in as a non-startup_funded role (e.g. `+911234567892` LP) → MIS does NOT appear in the sidebar (NAV_ITEMS filter), and visiting `/mis` directly should redirect to `/unauthorized` (RoleGuard).
- (e) Verify Indian numbering on prefill hints — `Last month: ₹ 20,00,000` (not `₹ 2,000,000`).

### Open blockers

_(none)_

### Files touched this session

- **MIS feature (new):**
  - `src/features/mis/{schemas.ts, schemas.test.ts, index.ts}`.
  - `src/features/mis/lib/format-inr.ts` (new — `₹ 21,00,000` Indian numbering).
  - `src/features/mis/hooks/{use-mis-form, use-mis-prefill, use-submit-mis}.ts` + matching `.test.ts` files.
  - `src/features/mis/components/MISForm.tsx`.
  - `src/features/mis/routes/{MISPage.tsx, MISPage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `getMisForm`, `getMisPrefill`, `postMisSubmit`.
  - `src/api/query-keys.ts` — added `qk.mis.{all, form, prefill}`.
  - `src/app/router.tsx` — `/mis` lazy-imported under startup_funded `<RoleGuard>`.
- **MSW + tests:**
  - `src/test/msw-fixtures/mis-handlers.ts` (new — stateful 409 reproduction).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`mis` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 141/141 tests across 39 files (was 118/118 across 34 files — +23 new tests, +5 new test files: schemas, three hooks, one page).

### Last updated

2026-04-25T19:00:00+05:30
