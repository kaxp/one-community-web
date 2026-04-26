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

---

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

QA regression complete. **6 issues found — H: 1, M: 2, L: 3.**

Top 3 ship blockers:
1. **[I-2] Placeholder WhatsApp link `+91XXXXXXXXXX` rendered to users in every error state** — H, fixes a broken-link click on every 5xx. Single-file env-flag gate, ~10 min.

(No other H issues. Treat I-3 + I-4 as Stage 5.2 fix candidates; I-1 + I-5 + I-6 as Stage 5.4 / 5.5 deferrable polish.)

---

## § Resolved (last 30)

_(Empty. Populated as issues are fixed.)_

---

## § Deferred

_(Empty. Populated by human triage.)_

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
