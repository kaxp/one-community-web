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
