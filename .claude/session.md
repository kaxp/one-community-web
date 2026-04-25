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

_(none — Stage 4 Session 4.1 complete. Three admin features shipped: `admin-home`, `admin-digest`, `admin-matchmaking-ops`. **Please spot-check before authorising Stage 4.2.**)_

### Last completed action

Completed Stage 4.1 — three admin features in one batch.

**1. admin-home** (`/admin`, replaces the Stage 1 `<AdminHomePlaceholder>`):
- `GET /admin/summary` (§7.12.1) drives a single-call KPI dashboard.
- Schema: `zAdminSummaryResponse` in `src/features/admin/schemas.ts` — `pending_connection_count`, `mis_status[]`, `recent_digests[]`, `recent_actions[]`.
- Hook: `useAdminSummary()` — 60s staleTime, refetchOnFocus per §7.12.1 transformation note.
- Page: `<AdminHomePage>` renders three KPI cards (Pending connections + link to `/admin/connections?status=pending_admin`, MIS submitted-vs-pending list, Recent digests with relative time + link to `/admin/digest`) plus a "Recent admin actions" audit feed and a "Want to send a digest now?" CTA.
- The orphaned `src/app/routes/AdminHomePlaceholder.tsx` is deleted.

**2. admin-digest** (`/admin/digest`):
- 6 endpoints wired: `GET /admin/digest` (§7.12.3), `POST /admin/digest/send` (§7.12.4 — `.passthrough()` Zod per §13 G4), `POST /digest/generate` (§7.13.1), `POST /digest/approve` (§7.13.2), `GET /digest/pending` (§7.13.3), `GET /digest/history?limit=...` (§7.13.4).
- Schemas: `src/features/digest/schemas.ts` — workflow rows, content (with `html`/`plain`/`segment`/`interest_tags` `.passthrough()` for forward compat), three request/response pairs for send/generate/approve.
- Hooks: `useAdminDigest`, `useDigestSend`, `useDigestPending`, `useDigestHistory`, `useDigestGenerate`, `useDigestApprove`. Approve has optimistic-remove + rollback + invalidates pending/history/admin.summary on settle (§8.12.4).
- Page: `<AdminDigestPage>` with three URL-backed tabs (`?tab=workflows|pending|history`).
  - Workflows tab: each card shows status + target_roles + schedule + last_send + per-row "Generate for {segment}" + "Send Now" `<InlineExecutionButton>`.
  - Pending tab: each card surfaces subject + segment + interest_tags + plain-text snippet, with a "Preview" button opening `<DigestPreviewDrawer>` (a `<Sheet>` rendering `content.html` inside `<iframe sandbox="allow-same-origin" srcDoc={html}>`) and an "Approve & Send" `<InlineExecutionButton>`.
  - History tab: read-only list with per-row Preview drawer (HTML body lazy-loaded by row expansion).
- Sandbox discipline: never `dangerouslySetInnerHTML`. iframe `sandbox` attribute is `allow-same-origin` only — no scripts, no popups, no top-navigation.
- Toasts: 409 on send → "A send is already in progress for this workflow"; 409 on approve → "Already approved or sent — refreshing"; 404 → "Workflow not found" / "Digest no longer exists".

**3. admin-matchmaking-ops** (`/admin/matchmaking`):
- 4 endpoints: `POST /matchmaking/generate` (§7.8.1, returns 202 + job_id), `GET /matchmaking/jobs/{id}` (§7.8.2), `GET /matchmaking/pending` (§7.8.4), `POST /matchmaking/approve` (§7.8.3).
- Schemas added to `src/features/matchmaking/schemas.ts`: `zMatchGenerateRequest`, `zMatchGenerateAck`, `zMatchJobStatus`, `zMatchGenerateResult`, `zMatchApproveRequest`, `zMatchApproveResponse`, `zMatchPendingResponse`.
- Hooks: `useMatchGenerate` (mutation), `useMatchPending` (query), `useMatchApprove` (mutation with optimistic-remove from pending + invalidate user-facing suggestions on settle).
- Page: `<AdminMatchmakingOpsPage>` uses `<ExecutionPanel jobPoll>` (the same pattern as the pitch deck eval) for generate. The form has a `type="date"` picker that auto-clamps to Monday on change via `format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')`. `onJobAccepted` registers the job in the debug dock (`registerJob({ task_name: 'matchmaking.generate' })`). `renderResult` shows generated_count + "Refresh pending list" button.
- Below the panel: pending suggestions grouped by `week_of` (§7.8.4 transformation note) in a DataTable with score badge, reason, and Approve action.
- Reject is intentionally absent — the backend endpoint doesn't exist yet (§7.8.4 transformation note); a comment in the column definition flags the gap so a future session can wire it when /matchmaking/{id}/reject ships.

**Cross-cutting:**
- `src/api/endpoints.ts`: added 9 typed endpoint functions (`getAdminSummary`, `getAdminDigest`, `postAdminDigestSend`, `postDigestGenerate`, `postDigestApprove`, `getDigestPending`, `getDigestHistory`, `postMatchGenerate`, `getMatchJob`, `postMatchApprove`, `getMatchPending`).
- `src/api/query-keys.ts`: added `qk.admin.digest`, `qk.digest.pending`, `qk.digest.history(limit)`, `qk.digest.historyAll`, `qk.matchmaking.jobAll`.
- `src/app/router.tsx`: lazy + `<RoleGuard roles={['admin','super_admin']}>` for all three new routes; replaced the `AdminHomePlaceholder` with the real page.
- MSW: three new handler files — `admin-home-handlers.ts`, `admin-digest-handlers.ts`, `admin-matchmaking-ops-handlers.ts`. The matchmaking handler simulates the 202 → poll → SUCCESS transition with `pollsBeforeReady` (default 1 read) so tests can drive the polling loop deterministically.

**Tests (+22 cases vs prior commit, total 271 across 70 files):**
- `use-admin-summary.test.ts` (2): seeded payload / 500.
- `AdminHomePage.test.tsx` (4): renders KPI cards with seed data / pending link goes to /admin/connections / 500 ErrorState / empty state for all-empty arrays.
- `use-digest.test.tsx` (6): useAdminDigest seed / useDigestPending seed / useDigestApprove optimistic remove + invalidations / approve rollback on 409 / useDigestSend invalidations / useDigestSend 409 conflict.
- `AdminDigestPage.test.tsx` (4): Workflows tab default with Send Now / Pending tab Preview opens sandboxed iframe (`sandbox="allow-same-origin"` + `srcdoc` contains `<html>`) / History tab lists sent / approving removes optimistically.
- `use-match-pending.test.ts` (3): seeded list / empty / 500.
- `AdminMatchmakingOpsPage.test.tsx` (3): renders Generate panel + grouped pending table / empty state / Approve removes optimistically and the MSW server-side counter increments.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (271/271 across 70 files), `pnpm build` (exits 0). Per-feature chunks: AdminHomePage **1.59 KB gzip**, AdminDigestPage **2.95 KB gzip**, AdminMatchmakingOpsPage **2.44 KB gzip** — all comfortably under the 80 KB admin-feature budget. Main chunk: 291.34 → 292.35 KB gzip (+1.01 KB across 3 admin features).

### Next concrete step

**Stage 4.1 is complete.** Per `queue.md` Session 4.1 footer: `_Spot-check gate_`. Wait for the human to spot-check before continuing into Session 4.2.

Once authorised, the next features (Stage 4.2 — Reports + DLQ + LP funnel) are:
- `admin-quarterly-reports` (§7.12.7 + §7.12.8)
- `admin-dead-letter-jobs` (§7.12.9 + §7.12.10) — note: **offset pagination**, the only endpoint that uses it (PRD §13 G10).
- `admin-lp-funnel` (§7.12.5)

Smoke checks for the just-shipped Stage 4.1 features (manual):
- (a) Sign in as `+911234567890` (admin) → sidebar "Admin home" → `/admin` → KPI cards render with seed data.
- (b) Click the pending count link → routes to `/admin/connections?status=pending_admin`.
- (c) Click sidebar "Digests" → `/admin/digest` → Workflows tab default. Click "Send Now" on lp_weekly → toast "Triggered — 87 messages queued".
- (d) Click "Generate for lp" → toast "Generated 3 drafts for lp" → switch to Pending tab → 2 seed rows visible. Click Preview on the first → side drawer opens with sandboxed iframe rendering the HTML.
- (e) Click "Approve & Send" → row disappears optimistically → toast "Approved — delivery queued" → switch to History tab → the just-approved row is on top.
- (f) Sidebar "Matchmaking ops" → `/admin/matchmaking` → date picker shows next Monday → click Generate → progress indicator → toast "Generation queued — polling job…" → after a few seconds the job lands SUCCESS and the result panel says "47 new pending suggestions".
- (g) Below the panel, two seed rows for week of 2026-04-28. Click Approve on Acme → row disappears → toast "Approved".
- (h) Sign in as a non-admin (e.g. `+911234567892` LP) and try `/admin`, `/admin/digest`, `/admin/matchmaking` → all redirect to `/unauthorized`.

### Open blockers

_(none)_

### Files touched this session

- **admin-home (new):**
  - `src/features/admin/schemas.ts` — extended with `zAdminSummaryResponse` + nested rows.
  - `src/features/admin/hooks/use-admin-summary.{ts,test.ts}`.
  - `src/features/admin/routes/AdminHomePage.{tsx,test.tsx}`.
- **admin-digest (new):**
  - `src/features/digest/schemas.ts` (rewrite — was stub).
  - `src/features/digest/index.ts` (barrel).
  - `src/features/digest/hooks/{use-admin-digest, use-digest-send, use-digest-generate, use-digest-pending, use-digest-history, use-digest-approve}.ts`.
  - `src/features/digest/hooks/use-digest.test.tsx`.
  - `src/features/digest/components/DigestPreviewDrawer.tsx`.
  - `src/features/digest/routes/{AdminDigestPage.tsx, AdminDigestPage.test.tsx}`.
- **admin-matchmaking-ops (new):**
  - `src/features/matchmaking/schemas.ts` — extended with admin-side request/response types.
  - `src/features/matchmaking/hooks/{use-match-generate, use-match-pending, use-match-approve}.ts`.
  - `src/features/matchmaking/hooks/use-match-pending.test.ts`.
  - `src/features/matchmaking/routes/{AdminMatchmakingOpsPage.tsx, AdminMatchmakingOpsPage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — +11 typed endpoint functions (admin/summary + 6 digest + 4 matchmaking-ops).
  - `src/api/query-keys.ts` — `qk.admin.digest`, `qk.digest.{pending, history(limit), historyAll}`, `qk.matchmaking.jobAll`.
  - `src/app/router.tsx` — replaced AdminHomePlaceholder with AdminHomePage; added `/admin/digest` and `/admin/matchmaking` routes.
  - **Deleted:** `src/app/routes/AdminHomePlaceholder.tsx` (orphaned after the real Admin Home shipped).
- **MSW + tests:**
  - `src/test/msw-fixtures/{admin-home-handlers.ts, admin-digest-handlers.ts, admin-matchmaking-ops-handlers.ts}` (new).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (3 rows ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 271/271 tests across 70 files (was 249/249 across 64 files — +22 new tests, +6 new test files: 1 hook + 1 page per feature).

### Last updated

2026-04-26T00:20:00+05:30
