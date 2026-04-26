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

### [I-1] AdminAnalyticsPage chunk is 113 KB gzip (target was 50–80 KB)

- **Severity:** L
- **File:** `src/features/analytics/routes/AdminAnalyticsPage.tsx` + the 4 chart components in `src/features/analytics/components/`
- **Feature:** admin-analytics
- **Rule violated:** Stage 4.3 prompt — "analytics chunk should appear separately ~50–80KB"
- **Observed:** Recharts v3.8.1 ships heavier than the v2 estimates the prompt was written against. The lazy-split is working correctly (only fetched on `/admin/analytics`; main chunk only grew +1.05 KB gzip), but the analytics chunk itself is 386.37 KB raw / 113.82 KB gzip.
- **Expected:** ~50–80 KB gzip per the prompt; the prod-grade fix is per-chart dynamic import or downgrading to recharts v2.
- **Fix:** Either (a) wrap each chart import behind `React.lazy(() => import('recharts').then(...))` so the heavy library only loads on the active analytics tab, or (b) drop to `recharts@^2.x` which has a smaller surface area. Defer until Stage 5 polish.
- **Found at:** 2026-04-26 (Stage 4.3 build)
- **Human input:** Let's choose option a fix.
---



### [I-3] Inline role-string comparisons drift across 5 display-mode call-sites

- **Severity:** M
- **File:**
  - `src/features/auth/lib/post-signin-navigate.ts:31` — `role === 'lp' || role === 'potential_lp'`
  - `src/features/search/routes/SearchPage.tsx:38` — `const isMasked = role === 'partner';`
  - `src/features/profile/schemas.ts:83` — `role === 'startup_inprogress' || role === 'startup_onboarded' || role === 'startup_funded'`
  - `src/features/profile/routes/ProfilePage.tsx:27` — `const isMasked = role === 'partner';`
  - `src/features/profile/routes/ProfilePage.tsx:130-138` — both startup-target and lp-target inline checks via `useMemo`
- **Feature:** cross-cutting (auth + search + profile)
- **Rule violated:** CLAUDE.md §3.4 / §16 — "**`can(role, capability)`** is the only sanctioned way to gate UI. Never compare role strings inline."
- **Observed:** These are display-mode branching, not security gates — but they bypass the central capability vocabulary and will silently drift when a new role enum is added (the union now includes `partner`; the next added role will not surface in any of these `||` chains automatically).
- **Expected:** Introduce small predicate helpers in `src/lib/role-capabilities.ts`:
  - `isStartupRole(role)` — covers all three startup_* values
  - `isLpRole(role)` — covers `lp` + `potential_lp`
  - `isMaskedSearchRole(role)` — currently `role === 'partner'`, future-proof for any masked role
  Update all 5 call-sites to use the helpers. Add unit tests in `role-capabilities.test.ts` asserting each predicate.
- **Fix:** Add 3 predicates to `role-capabilities.ts` + update 5 call-sites + 3 unit tests. ~30 minutes.
- **Found at:** 2026-04-26 (Stage 5 regression)

---

### [I-4] `MaskedCardFooter` "Upgrade for full access" button shows a placeholder toast and dead-ends

- **Severity:** M (UX papercut visible to every partner user on every search result)
- **File:** `src/features/search/components/MaskedCardFooter.tsx:33-36`
- **Feature:** search (partner-mode escalation footer)
- **Rule violated:** CLAUDE.md §7.4 — "Don't add features… for hypothetical future requirements" + §7.3 (no hardcoded data in routes; toast acts like one).
- **Observed:** Every partner search result card renders an "Upgrade for full access" button next to "Request to connect". Clicking it fires `toast.info('Partner upgrade coming soon — request a connection in the meantime.')`. There is no upgrade flow, no settings page, no email handoff — the click is a dead end. A confused partner will keep clicking.
- **Expected:** Either (a) hide the upgrade button until the monetisation flow is wired (preferred — current UX implies a paid tier that doesn't exist), or (b) render it disabled with a tooltip explaining "coming soon", or (c) link it to an external waitlist form.
- **Fix:** In `MaskedCardFooter.tsx`, gate the upgrade button behind a `VITE_PARTNER_UPGRADE_ENABLED` env flag (default false). Remove the JSX entirely when the flag is off. Update the partner masking decision in `decisions.md [P-20]` to note the deferred upgrade flow.
- **Found at:** 2026-04-26 (Stage 5 regression)

---

### [I-5] Long-standing `react-refresh` lint warnings (4) carried over from Stage 1

- **Severity:** L
- **File:**
  - `src/app/router.tsx:121,123` — `PageLoader` + `Susp` exported alongside `router` const
  - `src/components/ui/button.tsx:44` — `buttonVariants` exported alongside `Button` (shadcn convention)
  - `src/test/test-utils.tsx:27` — `export *` re-export
- **Feature:** cross-cutting (chassis)
- **Rule violated:** CLAUDE.md §10 DoD — "all four gates green; no warnings". The lint gate currently passes with 0 errors but reports 4 warnings.
- **Observed:** Same 4 warnings observed in Stage 1 review and Stage 2 review. They are cosmetic (Vite HMR boundary suggestions) and don't fail builds.
- **Expected:** Either (a) document them as accepted in `decisions.md` so the DoD bar moves to "0 errors, 4 known warnings", or (b) split the offending exports into separate files so the warnings disappear entirely. Option (b) is the textbook fix; ~20 min total.
- **Fix:** Defer-able — open a P-N in `decisions.md` with the chosen option. Do not block ship on this.
- **Found at:** 2026-04-26 (Stage 5 regression — same 4 warnings as Stage 1/2)

---

### [I-6] Bundle main chunk at 294.31 KB gzip — 5.7 KB headroom under 300 KB target

- **Severity:** L (informational; not exceeded yet)
- **File:** observability — `pnpm build` output
- **Feature:** cross-cutting
- **Rule violated:** queue.md § Stage 5 bundle-size target — "Initial chunk < 300 KB gzip"
- **Observed:** Main chunk currently 294.31 KB gzip — under target but with only 5.7 KB headroom. P-19 lazy-splitting is in place; every Stage 3+ feature route is properly chunked (e.g. `MISPage` 6.21 KB gzip, `SearchPage` 4.22 KB, `AddUserPage` 20.57 KB). The growth pressure now comes from shared deps in the main chunk (TanStack Query + React Router + axios + Zod + the shadcn primitives + the shared schema files).
- **Expected:** Stage 5.4 will run a fuller bundle audit. No fix needed today, but **a single new shared dep added in Stage 5 (e.g. Playwright e2e helper, a new modal lib) could push past 300 KB**. Watch carefully.
- **Fix:** None right now. Treat as a watchpoint for Stage 5.4.
- **Found at:** 2026-04-26 (Stage 5 regression — build output)

---

### [I-7] `/admin/partner-referral` route is unreachable from the sidebar

- **Severity:** **H** (visible regression — admins cannot discover the partner-referral console without typing the URL)
- **File:** `src/lib/role-capabilities.ts:166-173` (NAV_ITEMS array — `admin-partner-referral` entry is missing); route registered in `src/app/router.tsx:428-435`
- **Feature:** admin-partner-referral
- **Rule violated:** CLAUDE.md §3.4 — "Adding a new route MUST add an entry to `NAV_ITEMS` with correct roles — otherwise the route is unreachable from the UI." Also CLAUDE.md §11 NEVER DO list — "Add a new root-level route … not listed in `frontend_prd.md §4`" (this route IS in §4 row 27 but NAV_ITEMS was not updated).
- **Observed:** `src/app/router.tsx:428-435` registers `/admin/partner-referral` under the admin RoleGuard; `src/api/endpoints.ts:719`, `src/test/msw-fixtures/admin-partner-referral-handlers.ts`, and `src/features/admin/routes/AdminPartnerReferralPage.test.tsx` all reference the path. But `NAV_ITEMS` in `src/lib/role-capabilities.ts` skips from `admin-tracxn` straight to `admin-analytics` — there is no `admin-partner-referral` entry. The admin sidebar therefore omits it entirely; the only way to reach the page is via direct URL or the deeplinked admin home.
- **Expected:** A nav entry between the LP funnel row (line 167) and the Tracxn row (line 168) so admins discover the console from the sidebar.
- **Fix:** Add the following entry to `NAV_ITEMS` in `src/lib/role-capabilities.ts`:
  ```ts
  { key: 'admin-partner-referral', label: 'Partner referral', path: '/admin/partner-referral', icon: 'Megaphone', roles: ['admin', 'super_admin'] },
  ```
  Pick an icon already imported by `<NavList>` (`Megaphone` from `lucide-react` is the natural fit; verify it's whitelisted in the icon resolver). Add a sidebar smoke assertion in `src/components/layout/__tests__` (or whichever test exercises NavList) confirming the link renders for admin role.
- **Found at:** 2026-04-26 (Stage 5.1 QA)

---

### [I-8] `SearchPage` declares `useMutation` inline in the route component

- **Severity:** M
- **File:** `src/features/search/routes/SearchPage.tsx:59-72`
- **Feature:** feature-search
- **Rule violated:** CLAUDE.md §15 "Patterns" — "`<ExecutionPanel>` (PRD §6.7) is mandatory for all action screens. No inline `useMutation` inside route components." Also CLAUDE.md §4.2 — "Do not combine data fetching with business logic inside components. Always go via a hook."
- **Observed:** `SearchPage` imports `useMutation, useQueryClient` directly from TanStack Query and constructs `submitMutation` at line 59. The author justified it in lines 54-57 ("ExecutionPanel-style explicit submit") but the rule allows no exceptions outside `SignInPage` (CLAUDE.md §6.7.1). The mutation also reaches into `qc.setQueryData` to seed the infinite-query cache, which mixes data orchestration into the route.
- **Expected:** Either (a) extract the submit-orchestration into `src/features/search/hooks/use-search-submit.ts` returning the mutation result and `onSubmit` handler; the route only consumes the hook. Or (b) wrap the search bar in a real `<ExecutionPanel>` if the team agrees `/search` is an "action screen" by §6.7's definition.
- **Fix:** Option (a) — move lines 59-72 into a new `use-search-submit.ts` hook; the route imports `const { submitMutation, onSubmit } = useSearchSubmit({ query, filters, qc })`. ~30 minutes including unit test for the hook.
- **Found at:** 2026-04-26 (Stage 5.1 QA)

---

### [I-9] `AdminAnalyticsPage` imports Recharts charts eagerly — root cause of I-1's 113 KB chunk

- **Severity:** M (informational root-cause for already-tracked I-1; the fix delivers I-1's option (a))
- **File:** `src/features/analytics/routes/AdminAnalyticsPage.tsx:12-15` (the four `import { ... } from '@/features/analytics/components/...'` lines that pull `KpiCards`, `FunnelBarChart`, `CohortHeatmap`, `MatchSuccessChart`)
- **Feature:** admin-analytics
- **Rule violated:** CLAUDE.md §7.12 — "Code-split at the route level". Also queue.md Stage 5 bundle-size — "analytics chunk should appear separately ~50–80 KB".
- **Observed:** `AdminAnalyticsPage.tsx` imports the four chart components synchronously. Each chart pulls Recharts → the entire Recharts surface is bundled into the analytics chunk (386.37 KB raw / 113.82 KB gzip per `pnpm build`). Recharts loads on `/admin/analytics` route entry, not on the active tab.
- **Expected:** Per I-1 option (a) — `React.lazy()` each chart at the tab boundary so Recharts only loads when the Funnel / Cohort / Match Success tab is selected. The Overview tab (KpiCards) needs no chart code and should remain eager.
- **Fix:** In `AdminAnalyticsPage.tsx`:
  1. Change the three chart imports to `const FunnelBarChart = lazy(() => import('@/features/analytics/components/FunnelBarChart').then(m => ({ default: m.FunnelBarChart })))` (and similarly for Cohort + Match Success).
  2. Wrap the chart render in `<Suspense fallback={<Skeleton className="h-72 w-full" />}>` per tab.
  3. Re-run `pnpm build` and confirm the analytics chunk drops below 80 KB gzip; the Recharts chunk should appear as a separate lazy-loaded asset.
- **Found at:** 2026-04-26 (Stage 5.1 QA — supersedes I-1 root cause analysis)

---

### [I-10] Five mutation hooks lack unit tests

- **Severity:** M (mutations encode optimistic updates + invalidation; untested mutations are exactly the kind that drift silently)
- **File:**
  - `src/features/admin/hooks/use-dead-letter-retry.ts`
  - `src/features/admin/hooks/use-quarterly-report-approve.ts`
  - `src/features/digest/hooks/use-digest-generate.ts`
  - `src/features/matchmaking/hooks/use-match-approve.ts` (has optimistic rollback context — most fragile of the five)
  - `src/features/matchmaking/hooks/use-match-generate.ts`
- **Feature:** admin-dead-letter-jobs / admin-quarterly-reports / admin-digest / admin-matchmaking-ops
- **Rule violated:** CLAUDE.md §10 DoD — "Every new hook has a unit test." CLAUDE.md §9.2 step 10 — "Add MSW handlers in `src/test/msw-handlers.ts` and a unit test for each hook + a smoke test for the page."
- **Observed:** Each of the five hooks defines a `useMutation` (some with optimistic update + rollback) but no `.test.ts` / `.test.tsx` file exists alongside, and the hook's camelCase name does not appear in any sibling test file. The route-level smoke tests exercise the mutations indirectly, but the optimistic + invalidation paths are not asserted (e.g. `use-match-approve.ts` has a `RollbackContext` branch — no test covers it).
- **Expected:** One unit test per hook covering: success path → cache invalidation; error path → no state change / rollback if applicable; for `use-match-approve.ts` specifically — both the optimistic update AND the rollback on 4xx.
- **Fix:** Add 5 test files modelled on `src/features/digest/hooks/use-digest.test.tsx` (which covers `useDigestApprove`'s rollback). Each test ~25-40 lines; together ~3 hours.
- **Found at:** 2026-04-26 (Stage 5.1 QA)

---

### [I-11] Four query hooks lack unit tests

- **Severity:** L (query hooks are simpler and route-tests usually exercise them; still a DoD gap)
- **File:**
  - `src/features/digest/hooks/use-digest-history.ts`
  - `src/features/analytics/hooks/use-analytics-funnel-connections.ts`
  - `src/features/analytics/hooks/use-analytics-funnel-lp.ts`
  - `src/features/analytics/hooks/use-analytics-funnel-startup.ts`
- **Feature:** admin-digest / admin-analytics
- **Rule violated:** CLAUDE.md §10 DoD — "Every new hook has a unit test."
- **Observed:** Four query-only hooks lack explicit test files and aren't imported in any sibling `.test.*` file. The analytics overview / cohort / match-success hooks ARE covered by `use-analytics.test.ts`; the three funnel sub-hooks are not.
- **Expected:** Add the three funnel-sub-hooks to the existing `use-analytics.test.ts` (single import block + one `it()` per hook is sufficient — they all hit `/analytics/funnel/*` and use the same envelope shape). Add `useDigestHistory` to `use-digest.test.tsx` similarly.
- **Fix:** ~45 minutes total — extend two existing test files.
- **Found at:** 2026-04-26 (Stage 5.1 QA)

---

### [I-12] `useMe` test triggers an unwrapped React state-update warning

- **Severity:** L (test-only noise; production code is fine)
- **File:** `src/features/auth/hooks/use-me.test.ts:25-34` (the `fetches profile when a session is hydrated` case)
- **Feature:** auth
- **Rule violated:** CLAUDE.md §10 DoD — "no warnings" (warnings appear in `pnpm test` stderr per the build log). React docs — wrap state-changing fire-events in `act(...)`.
- **Observed:** `pnpm test` stderr shows: `Warning: An update to TestComponent inside a test was not wrapped in act(...). … at TestComponent (.../testing-library/react/dist/pure.js:307:5)`. The warning surfaces every time the test runs but does not fail the suite. It originates from the hook's MSW-driven query state transitioning from `idle → fetching → success` after `setMswSignedInPhone` populates the session.
- **Expected:** Wrap the `setAuth(...)` + `setMswSignedInPhone(...)` calls inside `act(async () => { … })` (or use `await waitFor` directly without the up-front mutation). The cleanest fix is replacing `renderHookWithProviders(() => useMe())` with the same call after `act()` settles the auth-store state.
- **Fix:** ~10 minutes — either (a) wrap the auth-store mutation in `act(() => { setAuth(...); setMswSignedInPhone(...); })`, or (b) move `setAuth` into a `beforeEach` so it runs synchronously before the hook mounts.
- **Found at:** 2026-04-26 (Stage 5.1 QA — observed in `pnpm test` stderr)

---

### [I-13] PRD §4 row 18 (`/digest`) role list is stale post-[P-22]

- **Severity:** L (documentation drift, no behavioural impact)
- **File:** `docs/frontend_prd.md` §4 row 18 — "Allowed roles: LP, Potential LP, VC, Startup Funded, Partner"
- **Feature:** user-digest
- **Rule violated:** CLAUDE.md §15 — PRD §4 must mirror what `NAV_ITEMS` and `<RoleGuard>` actually enforce. Also CLAUDE.md §9.7 — "If the backend changes a contract: Update `frontend_prd.md §7` first."
- **Observed:** `src/app/router.tsx:347-353` registers `/digest` with NO `<RoleGuard>` (only `RequireAuth + ProfileGate`); `NAV_ITEMS.digest.roles = ['*']` (all authenticated). After [P-22] replaced the blocker with the real UI, the route is open to every authenticated role including `advisor`, `startup_inprogress`, `startup_onboarded`, `admin`, `super_admin` — none of which appear in PRD §4 row 18's allow-list.
- **Expected:** Update `frontend_prd.md §4` row 18 to match the post-[P-22] reality: "All authenticated" (with a parenthetical noting the page is most useful to LP / Potential LP / VC / Startup Funded / Partner — admins see an admin-console shortcut). Or, if the PRD's narrower list is intentional product policy, add a `<RoleGuard>` to the route.
- **Fix:** ~5 minutes if the PRD is the side that drifts (preferred per [P-22] supersedes); ~10 minutes if a RoleGuard is added.
- **Found at:** 2026-04-26 (Stage 5.1 QA — cross-reference router vs PRD)

---

### [I-14] Vite build emits "chunks larger than 500 KB" warning for the analytics chunk

- **Severity:** L (informational — same root cause as I-9 / I-1; flagged here so the warning is acknowledged in the report)
- **File:** `pnpm build` console output — last 6 lines
- **Feature:** admin-analytics
- **Rule violated:** CLAUDE.md §10 DoD — "no warnings" (build emits a Rollup warning).
- **Observed:** Build log ends with `(!) Some chunks are larger than 500 kB after minification. Consider: …` — driven by `AdminAnalyticsPage-DsAsqABa.js` at 386.37 KB raw. The main chunk (`index-tG0ry3Uo.js`) at 1,259.64 KB raw also exceeds 500 KB but is acceptable for an SPA shell when gzipped (295.59 KB gzip).
- **Expected:** Once I-9 ships, the analytics chunk falls below 500 KB raw. The main-chunk warning will remain because of TanStack Query + React Router + Zod + Recharts shells; consider raising `build.chunkSizeWarningLimit` to 800 KB OR splitting common deps into `manualChunks: { vendor: ['react', 'react-dom', '@tanstack/react-query'] }` once Stage 5.4 bundle audit runs.
- **Fix:** Bundled into I-9's fix + a Stage 5.4 manualChunks pass.
- **Found at:** 2026-04-26 (Stage 5.1 QA)

---

QA regression complete. **6 issues found — H: 1, M: 2, L: 3.**

Top 3 ship blockers:
1. **[I-2] Placeholder WhatsApp link `+91XXXXXXXXXX` rendered to users in every error state** — H, fixes a broken-link click on every 5xx. Single-file env-flag gate, ~10 min.

(No other H issues. Treat I-3 + I-4 as Stage 5.2 fix candidates; I-1 + I-5 + I-6 as Stage 5.4 / 5.5 deferrable polish.)

---

QA complete. 14 issues found — H: 2, M: 5, L: 7. Awaiting human triage.

(Stage 5.1 QA pass added I-7 through I-14 on 2026-04-26. Pre-existing rows I-1, I-3, I-4, I-5, I-6 remain Active; I-2 is Deferred — see below.)

Stage 5.1 ship blockers in priority order:
1. **[I-2] (Deferred — H)** — Broken WhatsApp support link visible on every error.
2. **[I-7] (H)** — `/admin/partner-referral` unreachable from sidebar; admin can only get there by typing the URL. Single-line NAV_ITEMS entry, ~5 min.
3. **[I-8] (M)** — `SearchPage` inline `useMutation` violates §15. Extract to hook, ~30 min.
4. **[I-9] (M)** — Eager Recharts import in `AdminAnalyticsPage` (root cause of I-1 chunk size). Lazy-split per chart, ~45 min.
5. **[I-10] (M)** — Five mutation hooks (incl. `use-match-approve` rollback) untested. ~3 hr.
6. **[I-3] (M)** — Pre-existing inline role comparisons. ~30 min.
7. **[I-4] (M)** — Pre-existing partner upgrade dead-end button. ~10 min.

Polish / deferrable: I-1 (replaced by I-9 fix), I-5, I-6, I-11, I-12, I-13, I-14.

---

## § Resolved (last 30)

_(Empty. Populated as issues are fixed.)_

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
