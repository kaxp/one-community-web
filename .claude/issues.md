# `.claude/issues.md`

> **Code-quality / bug issues found during QA passes.** Written by Claude in QA mode (Stage 5) or by Claude during Stage 4 spot-checks when the human finds something.
>
> **Purpose:** triageable, actionable backlog. Distinct from `decisions.md` (architectural choices) and from `session.md` (continuity).

---

## How this file is used

### Who writes

- **Claude (QA mode)** — writes new rows to `§ Active` during Stage 5 QA session.
- **Claude (Builder mode)** — moves rows from `§ Active` to `§ Resolved` after fixing.
- **Human** — strikes through or marks `deferred` rows that will be punted to a later milestone.

### Who reads

- **Claude (Builder mode)** — at session start, checks `§ Active` for items touching the current feature and fixes those first.

### When to add a row

A finding belongs here if it is ONE of:

- Bug (wrong behaviour vs PRD §7)
- Violation of a `CLAUDE.md` rule (`any`, inline axios, missing RoleGuard, etc.)
- Missing UI state (loading / empty / error / success)
- Accessibility or mobile layout issue
- Failing test, lint warning, or type error
- Security concern (logging sensitive data, unsafe HTML rendering, missing CORS check)

A finding does NOT belong here if it is:

- An architectural choice → `decisions.md`
- A backend gap → already in `frontend_prd.md §13.2`
- A "nice to have" that the human didn't request → discard

### Severity levels

- **H** — blocks a feature or breaks a flow. Fix before shipping the feature.
- **M** — degrades UX or violates a CLAUDE.md rule but doesn't break the flow. Fix this milestone.
- **L** — polish / consistency / minor perf. Defer acceptable.

### Row format

```markdown
### [I-N] <short title>

- **Severity:** H / M / L
- **File:** `src/path/to/file.tsx:42`
- **Feature:** <feature-key from queue.md>
- **Rule violated:** <CLAUDE.md §X.Y OR frontend_prd.md §Y.Z — cite the exact rule>
- **Observed:** <what's wrong, one line>
- **Expected:** <what it should do, one line>
- **Fix:** <concrete fix, one line>
- **Found at:** YYYY-MM-DD (stage-N QA / spot-check)
```

### Resolution

When Claude fixes an issue, move the row to `§ Resolved` and append:

```markdown
- **Resolved:** YYYY-MM-DD, commit `<short-sha>`
- **Fix applied:** <one-line summary of what changed>
```

If the human defers an issue:

```markdown
- **Deferred:** YYYY-MM-DD — <reason>. Revisit in milestone: <vX.Y or phase-Z>.
```

---

## § Active

### [I-6] Bundle main chunk at 295.56 KB gzip — 4.4 KB headroom under 300 KB target

- **Severity:** L (informational; not exceeded yet)
- **File:** observability — `pnpm build` output
- **Feature:** cross-cutting
- **Rule violated:** queue.md § Stage 5 bundle-size target — "Initial chunk < 300 KB gzip"
- **Observed:** Main chunk currently 295.56 KB gzip — under target but with only 4.4 KB headroom. Lazy splits remain healthy (every Stage 3+ feature route ≤ 21 KB gzip; the new `CartesianChart` lazy chunk for Recharts is 101.15 KB gzip and only loads on Funnel / Match Success tabs). Pressure now comes from shared deps (TanStack Query + React Router + axios + Zod + shadcn primitives + shared schemas).
- **Expected:** Stage 5.4 will run a fuller bundle audit. **A single new shared dep added in Stage 5 (e.g. Playwright e2e helper, a new modal lib) could push past 300 KB**. Watch carefully.
- **Fix:** None right now. Treat as a watchpoint for Stage 5.4. Likely follow-up: add a `manualChunks` config splitting the React + TanStack Query vendor bundle.
- **Found at:** 2026-04-26 (Stage 5 regression — build output)

---

QA fixes complete. **1 active issue remains — L: 1.** All H + M items from the Stage 5.1 audit are resolved (or deferred where noted). I-6 is a watchpoint, not a defect.

---

## § Resolved (last 30)

### [I-1] AdminAnalyticsPage chunk is 113 KB gzip ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `src/features/analytics/routes/AdminAnalyticsPage.tsx` + the 4 chart components
- **Fix applied:** Superseded by [I-9]'s fix — Recharts is now lazy-loaded behind the Funnel / Match tabs. `pnpm build` reports the analytics chunk at **3.24 KB gzip** (was 113.82 KB) and a separate `CartesianChart-*.js` chunk at 101.15 KB gzip that only loads on the chart tabs.

### [I-3] Inline role-string comparisons drift across 5 display-mode call-sites ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original files:** `src/features/auth/lib/post-signin-navigate.ts:31`, `src/features/search/routes/SearchPage.tsx:38`, `src/features/profile/schemas.ts:83`, `src/features/profile/routes/ProfilePage.tsx:27`, `src/features/profile/routes/ProfilePage.tsx:130-138`
- **Fix applied:** Added `isStartupRole`, `isLpRole`, `isMaskedSearchRole` predicates to `src/lib/role-capabilities.ts`. Updated all 5 call-sites to use the helpers. Added 3 unit tests in `src/lib/role-capabilities.test.ts` covering each predicate's positive / negative / null inputs.

### [I-4] `MaskedCardFooter` "Upgrade for full access" button shows a placeholder toast ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `src/features/search/components/MaskedCardFooter.tsx:33-36`
- **Fix applied:** Added `VITE_PARTNER_UPGRADE_ENABLED` env flag (default `false` in dev / staging / prod). Gated the upgrade `<Button>` behind `env.PARTNER_UPGRADE_ENABLED`. Updated `src/lib/env.ts`, `src/vite-env.d.ts`, all three `.env.*` files, and `SearchPage.test.tsx` to assert the button is hidden by default.

### [I-5] Long-standing `react-refresh` lint warnings (4) ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original files:** `src/app/router.tsx:121,123`, `src/components/ui/button.tsx:44`, `src/test/test-utils.tsx:27`
- **Fix applied:** Extracted `PageLoader` + `Susp` into new `src/app/route-suspense.tsx`. Extracted `buttonVariants` + `ButtonVariants` type into new `src/components/ui/button-variants.ts`. `src/test/test-utils.tsx` is test-only (never loaded by Vite dev server) so the `export *` line carries a targeted `// eslint-disable-next-line react-refresh/only-export-components` with rationale. `pnpm lint` now reports **0 errors, 0 warnings**.

### [I-7] `/admin/partner-referral` route unreachable from sidebar ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `src/lib/role-capabilities.ts:166-173` (NAV_ITEMS); route at `src/app/router.tsx:428-435`
- **Fix applied:** Added `{ key: 'admin-partner-referral', label: 'Partner referral', path: '/admin/partner-referral', icon: 'Megaphone', roles: ['admin', 'super_admin'] }` to `NAV_ITEMS`. Added a sibling test in `role-capabilities.test.ts` asserting the entry exists with the right roles.

### [I-8] `SearchPage` declares `useMutation` inline in the route component ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `src/features/search/routes/SearchPage.tsx:59-72`
- **Fix applied:** Extracted the submit-mutation logic into a new `src/features/search/hooks/use-search-submit.ts`. `SearchPage` now imports `useSearchSubmit({ query, filters })` and surfaces the mutation directly — no `useMutation` / `useQueryClient` / `searchUnified` / `qk` references in the route file. Added `use-search-submit.test.tsx` with happy-path + empty-query rejection cases.

### [I-9] AdminAnalyticsPage imports Recharts charts eagerly — root cause of I-1 ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `src/features/analytics/routes/AdminAnalyticsPage.tsx:13,15`
- **Fix applied:** Replaced eager imports of `FunnelBarChart` + `MatchSuccessChart` with `React.lazy()`. Wrapped the Funnel pane and Match pane in `<Suspense fallback={<ChartSkeleton />}>`. KpiCards + CohortHeatmap stay eager (no Recharts). Build output confirms: analytics chunk **3.24 KB gzip** (was 113.82); new `CartesianChart-*.js` chunk 101.15 KB gzip loads only on the active chart tab.

### [I-10] Five mutation hooks lack unit tests ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original files:** `src/features/admin/hooks/use-dead-letter-retry.ts`, `use-quarterly-report-approve.ts`, `src/features/digest/hooks/use-digest-generate.ts`, `src/features/matchmaking/hooks/use-match-approve.ts`, `use-match-generate.ts`
- **Fix applied:** Added 4 new test files (`use-dead-letter-retry.test.tsx`, `use-quarterly-report-approve.test.tsx`, `use-match-approve.test.tsx`, `use-match-generate.test.tsx`) covering happy + error paths. `use-match-approve.test.tsx` specifically asserts the `RollbackContext` branch (optimistic remove → 4xx → cache restored). Extended the existing `use-digest.test.tsx` with `useDigestGenerate` cases. Side-fix: corrected a UUID-shape bug in `src/test/msw-fixtures/admin-matchmaking-ops-handlers.ts` (`padStart(8) → padStart(4)`) that surfaced when `use-match-generate` gained its first unit test.

### [I-11] Four query hooks lack unit tests ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original files:** `src/features/digest/hooks/use-digest-history.ts`, `src/features/analytics/hooks/use-analytics-funnel-{lp,startup,connections}.ts`
- **Fix applied:** Extended `src/features/analytics/hooks/use-analytics.test.ts` with 3 new tests covering each funnel sub-hook. Extended `src/features/digest/hooks/use-digest.test.tsx` with a `useDigestHistory` happy-path test.

### [I-13] PRD §4 row 18 (`/digest`) role list stale post-[P-22] ✅ resolved 2026-04-27 (Stage 5.2 fixes)

- **Original file:** `docs/frontend_prd.md` §4 row 18
- **Fix applied:** Updated the "Primary APIs" cell from "(Phase 4 — placeholder)" to the three real `/me/digest/*` endpoints, and the "Allowed roles" cell from the narrow LP/Potential LP/VC/Startup Funded/Partner list to "All authenticated (most useful to LP / Potential LP / VC / Startup Funded / Partner) — per [P-22]". Reflects the post-[P-22] reality: the route has no `<RoleGuard>` (all authenticated reach it; admins also see an admin-console shortcut on the page).

---

## § Deferred

### [I-2] User-visible WhatsApp support link is the literal placeholder `+91XXXXXXXXXX`

- **Severity:** **H** (visible regression — every ErrorState surfaces the placeholder to end users)
- **File:** `src/lib/support-contacts.ts:5`, surfaced via `src/components/error-state/ErrorState.tsx:5`
- **Feature:** cross-cutting (every feature renders ErrorState on failure paths)
- **Rule violated:** CLAUDE.md §7.3 (`error.code` errors render friendly + actionable UI) — the "Contact support on WhatsApp" CTA is a click-to-chat link with `wa.me/91XXXXXXXXXX`, which opens a broken URL on click.
- **Observed:** `SUPPORT_WHATSAPP = '+91XXXXXXXXXX'` is rendered inside `ErrorState` — when a 5xx fires, the user sees a non-working WhatsApp button. The accompanying TODO(P-15) only documents the gap; it doesn't gate the rendering.
- **Expected:** Until a real number is set, hide the WhatsApp CTA entirely (or guard it behind a `VITE_SUPPORT_WHATSAPP_ENABLED` flag and default to off in development + production). The Email CTA, which has a real address, can keep rendering.
- **Fix:** In `src/components/error-state/ErrorState.tsx`, conditionally render the WhatsApp button only when `SUPPORT_WHATSAPP !== '+91XXXXXXXXXX'`. Add an env-driven override and a unit test asserting the button is hidden when the placeholder value is in effect.
- **Found at:** 2026-04-26 (Stage 5 regression)
- **Deferred:** 2026-04-26 — pending a real WhatsApp support number from the human (P-15 follow-up). Revisit in milestone: v1.0 / Stage 5.5 polish.

### [I-12] `useMe` test triggers an unwrapped React state-update warning

- **Severity:** L (test-only noise; production code is fine)
- **File:** `src/features/auth/hooks/use-me.test.ts`
- **Feature:** auth
- **Rule violated:** CLAUDE.md §10 DoD — "no warnings".
- **Observed:** `pnpm test` stderr emits an `act(...)` warning when the React Query hook transitions idle → fetching → success against MSW. The same pattern surfaces in 4+ other tests (AddUserPage, SearchPage, DuplicateContactDialog) — this is a project-wide React 18 strict-act issue, not a single-test bug.
- **Expected:** A targeted test-helper refactor (likely an `actAround(renderHookWithProviders)` shim) — not a per-test patch. Several `await act(...)` attempts during Stage 5.2 either left the warning in place (the transition still happens during render) or required wrapping `renderHookWithProviders` itself, which expands the surface beyond the I-12 description.
- **Deferred:** 2026-04-27 — fixing one site doesn't suppress the warning across the project. Tackle as a Stage 5.5 (a11y / polish) project-wide test-helper refactor. Revisit in milestone: v1.0.

### [I-14] Vite build emits "chunks larger than 500 KB" warning

- **Severity:** L (informational)
- **File:** `pnpm build` console output
- **Feature:** cross-cutting
- **Rule violated:** CLAUDE.md §10 DoD — "no warnings".
- **Observed:** After [I-9]'s fix, the analytics chunk no longer trips the warning, but two chunks still exceed 500 KB **raw**: the main chunk (1,260.06 KB raw / 295.56 KB gzip) and the new `CartesianChart-*.js` Recharts chunk (338.29 KB raw / 101.15 KB gzip). Both are within gzip targets; raw size is the surface area Vite warns on.
- **Expected:** Configure `build.rollupOptions.output.manualChunks` to split a `vendor` chunk (react, react-dom, @tanstack/react-query, react-router) so the main chunk drops below 500 KB raw. Or raise `build.chunkSizeWarningLimit` to 800 KB if the team accepts the current shape.
- **Deferred:** 2026-04-27 — partial-fix already shipped via [I-9]. Full clearance requires a `manualChunks` design call which belongs in Stage 5.4 bundle-size pass. Revisit in milestone: Stage 5.4.

---

<!--
Example rows (for reference only):

### [I-3] PitchPage shows no empty state when profile is 404

- **Severity:** M
- **File:** `src/features/pitch/routes/PitchPage.tsx:17`
- **Feature:** pitch
- **Rule violated:** CLAUDE.md §7.1 (all 4 UI states mandatory)
- **Observed:** On first visit, 404 triggers ErrorState banner instead of rendering the create form.
- **Expected:** 404 is a domain signal per PRD §7.3.2 UI flow — should render the empty create form, not ErrorState.
- **Fix:** In `use-pitch-profile.ts`, unwrap 404 into `{ status: 'missing' }` and branch in the route.
- **Found at:** 2026-05-03 (Stage 4 spot-check)

### [I-3] PitchPage shows no empty state when profile is 404  ✅ resolved 2026-05-03, commit `a1b2c3d`
- **Fix applied:** Added `status` enum to PitchProfileResult; /pitch route renders `<CreatePitchForm>` when missing.
-->
