# Frontend Build Runbook — Solo Opus 4.7 Autonomous Mode

> **Audience:** you (the human driving the build).
> **Goal:** complete the entire One Community frontend using a single Claude Code Opus 4.7 instance, with your intervention batched to ~7–8 hours total across 8–12 wall-clock days.

---

## 0. Before you start

### 0.1 What this document is

A step-by-step runbook. Each stage has:

- The goal
- Your action
- A copy-pasteable prompt
- The expected output
- A gate (what to review before proceeding)

**Don't skip gates.** They're the cheapest way to catch replicated mistakes before they spread across 20+ screens.

### 0.2 Prerequisites

- Backend running locally (`make dev` in `one-community-1`) on `http://localhost:8000`
- Node.js 20+, `pnpm` 8+
- Claude Code installed, set to Opus 4.7 via `/model` (this is non-negotiable — do not use Sonnet for Builder)
- An empty git repo ready for the frontend, e.g. `~/one-community-web/`

### 0.3 One-time setup — copy the canonical files into the frontend repo

Run these commands once:

```bash
cd ~/one-community-web

# 1. Create standard folders
mkdir -p docs .claude

# 2. Copy the PRD and CLAUDE.md
cp ~/Documents/projects/one-community-1/docs/frontend_prd.md ./docs/frontend_prd.md
cp ~/Documents/projects/one-community-1/docs/frontend_claude.md ./CLAUDE.md

# 3. Copy the .claude/ coordination files
cp -r ~/Documents/projects/one-community-1/docs/frontend/claude-dir/. ./.claude/

# 4. Init git (if not done)
git init
git add .
git commit -m "chore: bootstrap — CLAUDE.md, PRD, .claude/ templates"
```

**Verify the target looks like this:**

```
~/one-community-web/
├── CLAUDE.md                   # behavioural rules (== frontend_claude.md)
├── docs/
│   └── frontend_prd.md         # API contracts, data models, transformations
└── .claude/
    ├── decisions.md            # living decisions log + pending human input
    ├── queue.md                # feature build queue with checkboxes
    ├── session.md              # "where I stopped" state
    ├── issues.md               # QA-found code issues
    └── settings.json           # Claude Code hooks
```

### 0.4 Start Claude Code in the frontend repo

```bash
cd ~/one-community-web
claude
```

Then inside Claude Code:

```
/model opus
```

Confirm the top-right of the UI shows `claude-opus-4-7`. If not, repeat.

---

## Stage 0 — Upfront interview (30 min)

**Goal:** batch every decision Claude will need into one conversation so it never blocks mid-build on small questions.

**Your action:** paste this prompt verbatim:

```
You are about to build the entire One Community web frontend solo. Before writing any code, read these files fully:
- CLAUDE.md
- docs/frontend_prd.md
- .claude/decisions.md
- .claude/queue.md

The human has already pre-answered two decisions (see .claude/decisions.md § Resolved):
- [P-1] Brand / design tokens — Warmup Ventures palette locked (primary #1F73B7, light theme, Inter font, 0.5rem radius, shadcn CSS variables provided). Do NOT re-ask.
- [P-2] Application name in UI — "One Community". Do NOT re-ask.

Now compile every REMAINING unknown you will need resolved to build the entire system end-to-end without interruption. Add every pending item to .claude/decisions.md § Pending using the P-N format (see CLAUDE.md § 0.1). Start numbering from P-3. Include at minimum:

1. Backend URLs (dev / staging / prod values for VITE_API_BASE_URL).
2. Seed user phone numbers I can use to test each of the 10 roles in dev.
3. Deployment target (Vercel / Netlify / self-hosted?).
4. CI/CD provider confirmation (is GitHub Actions OK? — a ci.yml template already exists at .github/workflows/ci.yml).
5. Feature flag defaults — confirm the values already in .env.example are correct (all gap flags false until backend ships).
6. Sentry DSN (optional — leave blank if none).
7. Logo asset — does Warmup Ventures have an SVG/PNG logo you want in the top bar, or should I use a wordmark-only design with Inter semibold?
8. Favicon — provide a URL or should I render a solid-primary "W" glyph?
9. Any other spec ambiguity you foresee blocking the build.

Print the 🟡 HUMAN INPUT NEEDED banner referencing ALL pending items. Then stop. Do NOT scaffold, do NOT write code, do NOT ask anything outside the decisions.md mechanism.
```

**Expected output:**

- Claude reads both docs (~1M tokens loaded).
- Appends 15–25 items to `.claude/decisions.md § Pending`.
- Prints the human-input banner.
- Stops.

**Your action (batch answer):**

- Open `.claude/decisions.md`, read every pending item.
- Answer all of them inline in that same file (fill the "Answer:" line under each P-N item).
- Commit: `git commit -am "decisions: Stage 0 answers"`.
- Back in Claude Code:

```
I've filled in every answer in .claude/decisions.md. Please move every resolved P-N item from § Pending to § Resolved. Then say "Stage 0 complete" and stop.
```

**Gate:** `.claude/decisions.md § Pending` is empty. `§ Resolved` has all P-1..P-N entries with answers. Claude is idle.

---

## Stage 1 — Scaffold (3 hours)

**Goal:** chassis only. All deps, full folder tree per `frontend_prd.md §6.2`, all core primitives (`apiClient`, `authStore`, `ExecutionPanel`, `RoleGuard`, `can()`, MSW setup), CI workflow. **No features.**

**Prompt:**

```
Build the Stage 1 scaffold per .claude/queue.md § Stage 1 and frontend_prd.md §§ 6.1, 6.2, 6.5, 6.7.

Mandatory:
- pnpm create vite@latest . --template react-ts
- All deps per §6.1 (TanStack Query, Zustand, RHF, Zod, axios, Tailwind, shadcn/ui, lucide-react, date-fns, sonner, react-dropzone, vitest, RTL, MSW v2)
- Strict tsconfig per CLAUDE.md §1.3
- Folder structure EXACTLY per §6.2
- Implement: apiClient (client.ts + errors.ts + endpoints.ts stub + query-keys.ts), authStore, AppShell, Sidebar (role-filtered via NAV_ITEMS + can()), TopBar, RoleGuard, RequireAuth, ExecutionPanel (+ ExecutionDialog, InlineExecutionButton), ErrorState, EmptyState, SkeletonRow, PhoneInput, OTPInput, FileDropzone, Toaster.
- MSW: setupWorker in src/test/msw-browser.ts; handlers file empty stub.
- Route tree per §10.4 with /signin + /dashboard + /expired + /unauthorized + /not-found stubs. Also scaffold Phase-4 placeholder routes /documents (per §13 G3) and /digest (per §10.5) — each renders a "Coming soon" page pointing to the non-Phase-4 equivalent.
- Debug dock per §6.8 (dev-only, lazy-loaded).
- GitHub Actions CI: install → lint → typecheck → test → build.
- husky + lint-staged pre-commit hook.

At the end: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` MUST all exit 0.

After success:
- Tick the Stage 1 box in .claude/queue.md
- Update .claude/session.md (current=none, next=Stage 2 auth)
- Commit: `chore: Stage 1 scaffold complete`
- Say "Stage 1 done. Human review please."
- Stop.

If you encounter a blocker, use the decisions.md pending protocol (CLAUDE.md §0.1).
```

**Expected output:** one commit, all four gates green, `queue.md` has `[x]` on Stage 1 row.

**🔴 YOUR GATE (critical — 1 hour):**

This is the only time in the whole build where you read every file. Check:

- [x] `src/app/router.tsx` matches PRD §10.4 route tree
- [x] `src/auth/auth-store.ts` persists to `localStorage['oc.auth']`, has `expiresAt` check
- [x] `src/api/client.ts` has the envelope interceptor + 401 → clear → redirect logic per §6.5
- [x] `src/components/execution-panel/` has the ExecutionPanel, Dialog, InlineButton variants per §6.7
- [x] `src/lib/role-capabilities.ts` has the CAPABILITIES map + `can()` + `NAV_ITEMS`
- [x] `tsconfig.json` has `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` all true
- [x] CI workflow file runs all four gates

**If anything is wrong, fix it yourself or ask Claude to fix via a targeted prompt.** This is the chassis — downstream features inherit its shape.

Once approved:

```bash
git tag v0.1-scaffold
```

---

## Stage 2 — Auth + 2 calibration features (2 sessions, thorough review)

**Goal:** build `/signin` + profile completion, then **two calibration features** (Search + Admin Connections) to validate the ExecutionPanel pattern works correctly before mass-producing.

### 2a — Auth flow (one session)

**Prompt:**

```
Build Stage 2 auth per .claude/queue.md.

Endpoints: POST /auth/otp/send (§7.1.1), POST /auth/otp/verify (§7.1.2), GET /auth/me (§7.1.3).
Screens: /signin (phone → OTP → submit → route by role), /onboarding/profile, /onboarding/lp-profile.
Use ExecutionPanel for the submission steps.
MSW handlers for all 3 endpoints.
Unit tests: every hook. Integration test: full /signin → /dashboard smoke.
Follow CLAUDE.md §10 DoD checklist before declaring done.

After success:
- Tick Stage 2a boxes in queue.md
- Update session.md
- Commit: `feat: auth + onboarding`
- Say "Stage 2a done. Review please." and stop.
```

**🔴 YOUR GATE (30 min):**

- Log in as a seeded LP → should land on `/search`
- Log in as a seeded startup_inprogress → should land on `/pitch`
- Wrong OTP → inline error, counter starts
- Expired session → `/expired` page
- Mobile layout at 375px — no overflow, tap targets ≥ 44px

### 2b — First calibration feature: Search (one session)

**Prompt:**

```
Build feature-search per .claude/queue.md Stage 2.

Primary contract: POST /search (§7.4.1).
Secondary: POST /interactions/log (§7.7.1) fire-and-forget per visible card.
Screen: /search with SearchBar, FilterChips (URL-backed), ResultCard grid, infinite scroll via next_cursor.
Handle all three response shapes: startup results, lp results, stage3_applied=false fallback.
Partner role sees masked card (conditional rendering — see §7.4.1 Partner note).
MSW handlers for /search (3 fixtures: startup-results, lp-results, empty).
Use ExecutionPanel for the query submission.
Unit tests for useSearch hook + 400ms debounce. Smoke test for SearchPage.

Follow §10 DoD. Tick queue.md. Update session.md. Commit `feat: search`.

Say "Stage 2b done. Review please." and stop.
```

**🔴 YOUR GATE (45 min — deep review):**

- All 4 UI states render (loading skeleton, empty, error, success)
- Debounce works — no spam on keystroke
- Pagination: scroll loads next page
- Partner role → call `can('search.use', 'partner')` returns false → `/unauthorized`
- 429 rate-limit produces toast with countdown
- `stage3_applied=false` banner renders
- Mobile 375px: cards stack cleanly, filter chips horizontal-scroll
- Read the diff: does the ExecutionPanel usage match the spec? Are query keys in `qk.search.*`?

If anything's off, **prompt Claude with specific file:line fixes now**. The next 18 features will inherit whatever pattern you accept here.

### 2c — Second calibration feature: Admin Connections (one session)

Same pattern, but exercises the admin `<RoleGuard>` + DataTable + PATCH mutations.

**Prompt:**

```
Build feature-admin-connections per queue.md Stage 2.

Primary: GET /admin/connections (§7.12.2), PATCH /connections/{id}/admin (§7.6.2).
Screen: /admin/connections with status tabs (pending_admin / pending_target / accepted / declined via URL param), TanStack Table rows, InlineExecutionButton for Approve/Reject with optimistic update + rollback.
<RoleGuard roles={['admin','super_admin']}> on the route.
MSW handlers.
Unit tests: mutations invalidate correct keys (qk.admin.connections, qk.admin.summary, qk.connections.pending).

Follow §10 DoD. Tick queue.md. Commit `feat: admin connections queue`.

Say "Stage 2c done. Review please." and stop.
```

**🔴 YOUR GATE (30 min):**

- Approve a pending → row animates out, badge count decrements on `/admin`
- Try as LP → `/unauthorized`
- 409 conflict on Approve → refetches + toast
- Table sorts, paginates with cursor

**If 2b AND 2c both look good:** you've validated the pattern. Move to autonomous mode.

```bash
git tag v0.2-calibration
```

---

## Stage 3 — User features (9 sessions, ~1 week)

**Goal:** ship every user-facing feature in `queue.md § Stage 3` using one explicit prompt per feature. One feature per session, ~2–3 hours each, 1–3 sessions per day.

**Universal rules (apply to every Stage 3 prompt):**

- Each prompt below is **copy-paste ready**. Open Claude Code, paste, hit Enter.
- Do **not** run two feature prompts in the same session — context bloat hurts quality.
- Before pasting, confirm the previous feature's box is `[x]` in `.claude/queue.md` and `.claude/session.md` reflects "Stopping".
- After each session: review the diff, run `pnpm dev` once, click through the new screen briefly, then commit-tag if at a gate boundary.
- All prompts assume Stage 1 chassis + Stage 2 calibration patterns are in place. They reference `src/features/search/` and `src/features/admin/` as the canonical templates.

**Spot-check gates** (do these — they catch replicated mistakes):

- 🟡 **Gate 1** after 3.4 (`mis`): you've now built 4 features. Spend 30 min smoking the screens at 375/768/1440px. Look for repeated mistakes; fix the pattern once if found.
- 🟡 **Gate 2** after 3.8 (`profile-viewers`): another 4 features down. Same drill.
- 🔴 **Final Stage 3 gate** after 3.9 (`onboarding-add-user`): full Stage 3 done. Tag `v0.3-user-features`.

---

### 3.1 — `profile-view` (gap-flagged, 1 session)

**Pattern reference:** Search card → profile-view modal-or-page composition.
**Special:** This is a **§13 G1 gap** — `GET /profile/{id}` is not yet on the backend. The implementation routes through `VITE_PROFILE_V1_ENABLED` flag and an interim service.

**Prompt:**

```
Implement profile-view per .claude/queue.md § Stage 3 row "profile-view".

PRD context to load FIRST:
- §7.5.1 — GET /profile/{id} contract (target shape)
- §13.2 G1 — gap resolution: feature flag + interim service + MSW handler
- §6.6b — palette tokens for masked-fields styling
- §8.12.3 — role-masked field handling rules

Read for pattern reference:
- src/features/search/routes/SearchPage.tsx — card + click-to-detail interaction
- src/features/search/schemas.ts — discriminated union pattern (apply same for profile)
- src/api/endpoints.ts — Zod-at-boundary pattern

Implementation:
- Route: /profile/:id under <RequireAuth><ProfileGate><AppShell> — gated by RoleGuard {lp, potential_lp, vc, startup_funded, partner, admin, super_admin}
- Lazy-import the page per decisions.md [P-19]
- Endpoint function `getProfileById(id)` in src/api/endpoints.ts that branches on env.VITE_PROFILE_V1_ENABLED:
  • flag true → real GET /profile/{id} call + Zod parse
  • flag false → src/api/interim/profile-service.ts composing from POST /search (find by user_id) + GET /connections (derive contact + viewer_interaction)
- Hook: useProfile(id) in src/features/profile/hooks/use-profile.ts
- Page: src/features/profile/routes/ProfilePage.tsx — show role badge, identity block, role-specific block (startup vs lp vs vc), conditional contact card (only when contact !== null), "Request Connect" button (hidden if !can_request_connect or has_requested), "Pending admin approval" status when has_requested && !has_connected
- Fire ONCE on mount: POST /interactions/log {target_id, interaction_type:'profile_view', target_type, source:'profile_page'} — fire-and-forget; ignore failures via console.warn
- MSW handlers in src/test/msw-fixtures/profile-handlers.ts: 3 fixtures (no-connection, pending, accepted-with-contact) — scenario-switchable like search-handlers.ts
- Tests: useProfile unit (3 fixtures), ProfilePage smoke (renders 3 viewer states)
- Partner-mask handling: every nullable field uses optional chaining + conditional render, never assumes presence

Specific gotchas:
- §13 G1 interim service must return EXACTLY the same TypeScript shape as the real endpoint will — flip is just `VITE_PROFILE_V1_ENABLED=true`, no other code change
- The `profile_view` interaction log dedupes server-side over 60s; client-side dedup cache in src/lib/interaction-dedup.ts (write if not present) prevents re-fires within 10s

DoD per CLAUDE.md §10. Run all four gates — must exit 0.

At the end:
- Tick "profile-view" in queue.md
- Update session.md (current=none → next=connections)
- Commit: feat(profile): GET /profile/{id} with §13 G1 interim service + flag
- Say "profile-view done. Next: connections. Stopping."
- Stop.

If blocked, use decisions.md P-N protocol (CLAUDE.md §0.1).
```

---

### 3.2 — `connections` (1 session)

**Pattern reference:** `AdminConnectionsPage` (Stage 2c) for tabs + table; `ExecutionPanel` for the request flow; `InlineExecutionButton` for accept/decline.

**Prompt:**

```
Implement connections per .claude/queue.md § Stage 3 row "connections".

PRD context to load FIRST:
- §7.6.1 — POST /connections/request
- §7.6.3 — PATCH /connections/{id}/respond (accept/decline)
- §7.6.4 — GET /connections (accepted list)
- §7.6.5 — GET /connections/pending (incoming + outgoing pending)
- §7.7.2 — POST /interactions/feedback (48h post-accept prompt)
- §8.12.4 — invalidation matrix rows for §7.6.1, §7.6.3
- §8.12.5 — optimistic update pattern (already used in admin-connection-action)

Read for pattern reference:
- src/features/admin/hooks/use-admin-connection-action.ts — optimistic update + rollback recipe (clone for respond)
- src/features/admin/routes/AdminConnectionsPage.tsx — tab pattern with URL search params
- src/components/execution-panel/InlineExecutionButton.tsx — per-row mutation hook (one instance per button)

Implementation:
- Two routes:
  • /connections (accepted list) — DataTable with counterpart card + contact strip (email/phone/linkedin chips when contact !== null)
  • /connections/pending — two URL-tabs (?direction=incoming|outgoing); incoming rows show Accept/Decline InlineExecutionButton, outgoing shows status pill (Awaiting admin / Awaiting target)
- Lazy-import both pages per [P-19]
- RoleGuard: all 10 roles (this is "all authenticated")
- NAV_ITEMS already has "connections" + "pending" entries (Stage 1) — verify icons render
- Hooks:
  • useConnections({limit, cursor}) — useInfiniteQuery, qk.connections.list
  • useConnectionsPending({limit, cursor}) — useInfiniteQuery, qk.connections.pending
  • useRespondToConnection() — useMutation; optimistic remove-from-pending; on accept, also invalidate qk.profile.byId(counterpart) + qk.connections.list
  • useFeedback() — useMutation; collapses prompt on success
- Endpoint functions: requestConnection, respondToConnection, listConnections, listPendingConnections, submitFeedback — all in src/api/endpoints.ts with Zod parse
- "Request Connect" modal opens from /search ResultCard or /profile/:id button (Stage 3.1) — composes via ExecutionDialog with optional 200-char message textarea (Zod max(200))
- 48h post-accept feedback prompt: render a small Card on /connections rows with intro_id + Yes/No buttons; use InlineExecutionButton; on 409 silently hide (already submitted)
- MSW handlers: connections-handlers.ts with scenarios for empty / mixed / accepted-only / 409-conflict-on-respond
- Tests: each hook unit + smoke for both pages (incoming Accept → mutation fires → row optimistically removed)

Specific gotchas:
- counterpart.contact is null until status === 'accepted' — render the contact strip CONDITIONALLY, never with `?? '—'` placeholder for the whole block
- After respond:accept, invalidate qk.profile.byId(counterpart_id) so /profile/:id unmasks contact
- Outgoing rows must NOT show Accept/Decline (those buttons are for the target, not the requester)

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "connections" in queue.md
- Update session.md (next=pitch)
- Commit: feat(connections): list + pending + respond + feedback
- Say "connections done. Next: pitch. Stopping."
- Stop.
```

---

### 3.3 — `pitch` (1 session, **first jobPoll usage**)

**Pattern reference:** `ExecutionPanel` from `CompleteProfilePage`. **First time** the `jobPoll` prop on ExecutionPanel is exercised — implement the polling logic in `ExecutionPanel.tsx` if not done yet (types are already there from Stage 1).

**Prompt:**

```
Implement pitch per .claude/queue.md § Stage 3 row "pitch".

PRD context to load FIRST:
- §7.3.1 — POST /pitch/profile (create/update)
- §7.3.2 — GET /pitch/profile (404 means "show create form" — domain signal, not error)
- §7.3.3 — POST /pitch/deck (returns 202 + job_id)
- §7.3.4 — GET /pitch/deck/jobs/{job_id} (poll every 3s, max 30 polls = 90s)
- §6.7.2 — ExecutionPanel `jobPoll` prop (already in src/components/execution-panel/types.ts but NOT yet wired in ExecutionPanel.tsx)
- §6.7.3 — state machine including the polling-job branch
- §8.12 — ask_amount_cr is INR crore (display as "₹ {value} Cr"); stage ENUM map

Read for pattern reference:
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel basic usage
- src/components/execution-panel/types.ts — JobPollResult and JobPollConfig already exist

Implementation:
- Route: /pitch under all three startup roles (startup_inprogress / startup_onboarded / startup_funded) + admin/super_admin
- Lazy-import per [P-19]
- Page tabs: "Profile" (always visible) | "Deck" (visible if profile exists) | "AI Evaluation" (visible only after a successful deck job)
- "Profile" tab: useStartupProfile() with 404→{status:'missing'} unwrap; if missing show empty form, else prefilled <ExecutionPanel<StartupProfileRequest, StartupProfileResponse>>
- "Deck" tab: <ExecutionPanel<DeckUploadRequest, AIEvaluationResult> jobPoll={...}>
  • Submit POST /pitch/deck → 202 + job_id (return shape from mutationFn)
  • jobPoll.queryKey: qk.pitch.deckJob(job_id); jobPoll.queryFn: getDeckJob(jobId); maxPolls=30; intervalMs=3000
  • On state===SUCCESS, render AIEvaluationResult block (signal badge with green/yellow/red per "strong"|"moderate"|"weak", summary, strengths/concerns/recommended_lp_types as bullet lists)
  • On state===FAILURE, show "Evaluation failed" with Retry that re-POSTs /pitch/deck with the same deck_url
  • On 30-poll timeout, show "Still running — check back later" with manual refresh button
- WIRE the jobPoll branch in src/components/execution-panel/ExecutionPanel.tsx — types are already defined; consume `jobPoll` prop, render polling state, transition state machine per §6.7.3
- Register the job in the debug dock via use-job-registry.ts (per §6.8 — every 202+job_id MUST register)
- Hooks: useStartupProfile, useUpsertStartupProfile, useSubmitDeck, useDeckJobStatus
- Endpoint functions: getStartupProfile, postStartupProfile, postDeck, getDeckJob — all with Zod parse
- MSW handlers: pitch-handlers.ts — scenarios for no-profile (404), profile-exists, deck-job-success-after-2-polls, deck-job-failure, deck-job-timeout
- Tests: each hook + page smoke + ExecutionPanel jobPoll unit test (poll runs N times → SUCCESS triggers renderResult)

Specific gotchas:
- §7.3.2 returning 404 is NOT an ApiError to surface — useStartupProfile must catch and unwrap into a discriminated `{status: 'missing' | 'present', data?}`. Treat 404 as a domain signal per §7.3.2 UI flow.
- ask_amount_cr displayed as "₹ {value} Cr" with `toLocaleString('en-IN')` per §8.12.2 row
- stage ENUM display map: pre_seed → "Pre-Seed", series_a → "Series A", etc. Use a single label helper.
- jobPoll: do NOT poll with refetchInterval if `enabled` is gated behind `!result.ready` AND `pollCount < 30` — write the cap as TanStack Query's `refetchInterval: (query) => query.state.data?.ready ? false : 3000`.

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "pitch" in queue.md
- Update session.md (next=mis)
- Commit: feat(pitch): profile + deck + AI eval polling
- Say "pitch done. Next: mis. Stopping."
- Stop.
```

---

### 3.4 — `mis` (1 session, **strict raw_data + 409 conflict**)

**Pattern reference:** `<ExecutionPanel>` standard. **Watch the strict `raw_data` allowlist** and the `period` regex — these are easy to get wrong.

**Prompt:**

```
Implement mis per .claude/queue.md § Stage 3 row "mis".

PRD context to load FIRST:
- §7.9.1 — GET /portfolio/mis (current month form schema + prefill)
- §7.9.2 — POST /portfolio/mis (strict raw_data, 409 mis_already_submitted)
- §7.9.3 — GET /portfolio/mis/prefill (last month's data for prefill)
- §8.12.1 — period regex `^\d{4}-(0[1-9]|1[0-2])$`; raw_data strict-allowlist (6 keys ONLY)
- §8.12.2 — INR amounts: Indian numbering (e.g. ₹ 21,00,000)

Read for pattern reference:
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel usage
- Stage 3.3 pitch — gating logic on tab visibility / status

Implementation:
- Route: /mis under {startup_funded, admin, super_admin}; lazy + RoleGuard
- Page: <ExecutionPanel<MISSubmitRequest, MISSubmitResponse>> with current-month period read-only
- Top banner: when already_submitted=true, show warning "MIS for {period} was already submitted on {last_submission_at}. Submitting again will be rejected with 409."
- Form fields: revenue, burn (INR rupees, numeric inputs with currency formatting on display), runway_months, headcount, highlights (textarea max 2000), lowlights (textarea max 2000)
- On submit, build the request body:
  • period: current month from `format(new Date(), 'yyyy-MM')`
  • Top-level metrics from form values
  • raw_data: STRICT allowlist with exactly these 6 keys: revenue_inr (Decimal as string with toFixed(2)), burn_inr (Decimal string), headcount, runway_months, highlights, lowlights — REJECT extra keys via Zod .strict()
- On 409 mis_already_submitted: keep form values, show ApiError banner with "MIS for {period} was already submitted. Contact admin to override." — do NOT clear the form
- Hooks: useMisForm (reads §7.9.1), useMisPrefill (reads §7.9.3 in parallel), useSubmitMis (mutation)
- Parallel fetch on page mount: useQueries([useMisForm, useMisPrefill])
- Invalidations on success: qk.mis.form, qk.admin.summary (mis_status badge updates)
- MSW: mis-handlers.ts — scenarios for first-submission, already-submitted, 409-on-resubmit
- Tests: hooks + page smoke + 409 conflict path + raw_data extra-key rejection (Zod throws)

Specific gotchas:
- §8.12.1: amounts shown to user are in rupees, but raw_data sends them as Decimal-formatted strings (e.g. revenue 2100000 → raw_data.revenue_inr "2100000.00")
- Zod strict on raw_data: `z.object({...}).strict()` — extra keys throw. Test this explicitly.
- period regex client-side validate before submit — backend will 422 on invalid format

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "mis" in queue.md
- Update session.md (next=schedule)
- Commit: feat(mis): monthly submission with prefill + 409 handling
- Say "mis done. 4 features complete — please run Spot-check Gate 1 before continuing. Stopping."
- Stop.
```

🟡 **Spot-check Gate 1** — pause here. `pnpm dev` and click through `/profile/:id`, `/connections`, `/pitch`, `/mis` at 375/768/1440px. Look for repeated patterns that need refinement. Fix once if needed.

---

### 3.5 — `schedule` (1 session, calendar grid + IST)

**Pattern reference:** Stage 2c admin-connections for DataTable + cancel mutation. New: a calendar slot grid component.

**Prompt:**

```
Implement schedule per .claude/queue.md § Stage 3 row "schedule".

PRD context to load FIRST:
- §7.10.1 — GET /schedule/slots?from_date&days
- §7.10.2 — POST /schedule/book (409 conflict on slot overlap)
- §7.10.3 — GET /schedule/bookings (caller's meetings, paginated)
- §7.10.4 — DELETE /schedule/book/{id} (ownership: requester/target/admin)
- §8.12.1 — scheduled_at: ISO-8601 with TZ via date-fns-tz; duration_minutes 30 or 60 only
- §8.12.2 — display in user's local TZ via utcToZonedTime

Read for pattern reference:
- src/features/admin/routes/AdminConnectionsPage.tsx — list pattern
- src/features/search/components/FilterChips.tsx — URL-backed state pattern (apply to from_date)

Implementation:
- Route: /schedule — all 10 roles; lazy + RoleGuard (all-authenticated)
- Page layout: top half = Slot grid (calendar), bottom half = "Upcoming meetings" DataTable
- Slot grid component (src/features/schedule/components/SlotGrid.tsx):
  • Rows = dates (next 7 days, configurable via ?days= URL param 1–30)
  • Columns = 30-min time slots; cells = green when available (in response), grey when not
  • Click an available slot → opens ExecutionDialog with target picker (search-by-name) + duration radio (30/60) + purpose textarea
- Bookings list: DataTable with columns scheduled_at (formatted local TZ), duration, counterpart, status badge, Cancel button (disabled when status=cancelled)
- Hooks: useSlots({from_date, days}), useBookings({limit, cursor}), useBookMeeting (mutation), useCancelBooking (mutation)
- On 409 from book: show toast "That slot just filled up — pick another"; refetch slots immediately
- On 403 from cancel: toast "Only the organiser, target, or admin can cancel"
- Lazy-import per [P-19]; install date-fns-tz dependency
- MSW: schedule-handlers.ts — scenarios for slots-empty, slots-populated, book-success, book-409, cancel-success
- Tests: hooks + grid renders correctly + click → modal → submit → invalidate

Specific gotchas:
- All slot times in MSW + display: use IST (+05:30) per backend convention; convert to user's local TZ on display via utcToZonedTime
- duration_minutes coerce strict 30 or 60: Zod `.refine(v => v===30 || v===60)`
- After cancel, ALWAYS refetch bookings (GCal delete is best-effort per §13 G9; reconcile from server)
- Confirm dialog on cancel includes warning: "If your Google Calendar still shows the event, delete it manually."

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "schedule" in queue.md
- Update session.md (next=travel)
- Commit: feat(schedule): slot grid + booking + cancel
- Say "schedule done. Next: travel. Stopping."
- Stop.
```

---

### 3.6 — `travel` (1 session, simple CRUD)

**Pattern reference:** Stage 3.5 schedule (booking → travel plan create) for shape; CompleteProfilePage for ExecutionPanel.

**Prompt:**

```
Implement travel per .claude/queue.md § Stage 3 row "travel".

PRD context to load FIRST:
- §7.11.1 — POST /travel/plans (travel_end ≥ travel_start)
- §7.11.2 — GET /travel/plans?active_only
- §7.11.3 — DELETE /travel/plans/{id} (owner only)
- §7.11.4 — PUT /travel/home-city
- §8.12.1 — date format yyyy-MM-dd via date-fns format()

Read for pattern reference:
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel for the "Update home city" form
- src/features/admin/routes/AdminConnectionsPage.tsx — list with delete pattern

Implementation:
- Route: /travel — all 10 roles; lazy + RoleGuard
- Page: two sections
  • "Home city" — single-input ExecutionPanel using PUT /travel/home-city (optimistic update auth-store after success since /auth/me carries home_city)
  • "Trips" — list of upcoming trips (default ?active_only=true) + "Add trip" ExecutionDialog with destination_city, travel_start (date picker), travel_end (date picker, validated ≥ start), purpose (textarea max 500)
  • Toggle "Show past trips" → active_only=false
- Hooks: useTravelPlans({active_only}), useCreateTravelPlan, useDeleteTravelPlan, useUpdateHomeCity
- Lazy-import per [P-19]
- MSW: travel-handlers.ts — scenarios for empty list, populated list, create-success, delete-success, validation-error (end-before-start)
- Tests: hooks + page renders + create-trip flow + cancel-trip optimistic remove

Specific gotchas:
- Sort trips client-side by travel_start ASC (PRD §7.11.2 doesn't guarantee sort order)
- Cancelled trips already excluded server-side when active_only=true; the toggle adds them
- After update-home-city success, invalidate qk.auth.me so the new value propagates

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "travel" in queue.md
- Update session.md (next=matchmaking)
- Commit: feat(travel): plans CRUD + home-city
- Say "travel done. Next: matchmaking. Stopping."
- Stop.
```

---

### 3.7 — `matchmaking` (1 session)

**Pattern reference:** Stage 3.6 simple CRUD for the respond mutation; Search ResultCard for suggestion-card UI.

**Prompt:**

```
Implement matchmaking per .claude/queue.md § Stage 3 row "matchmaking".

PRD context to load FIRST:
- §7.8.5 — GET /matchmaking/suggestions (user-facing list)
- §7.8.6 — POST /matchmaking/suggestions/{id}/respond {action: accepted|rejected|skipped}
- §8.12.4 — invalidation matrix for §7.8.6 (qk.matchmaking.suggestions + qk.connections.pending if connection_created)

Read for pattern reference:
- src/features/search/components/ResultCard.tsx — startup card layout (re-skin for suggestion card)
- src/features/admin/hooks/use-admin-connection-action.ts — optimistic remove pattern (clone for respond)

Implementation:
- Route: /matchmaking under {startup_funded, lp, potential_lp, vc, admin, super_admin} — lazy + RoleGuard
- Page: card grid (md:grid-cols-2). Each card shows the OTHER side's snapshot (startup details if I'm an LP, LP details if I'm a startup) + match score (badge) + reason (one sentence) + 3 buttons: "Interested" / "Not a fit" / "Skip"
- Buttons use InlineExecutionButton with optimistic remove from list on click
- On success with `connection_created: true` → toast "Match! Connection request created — awaiting admin approval."
- On success with `connection_created: false` → toast "Noted. We'll let you know when the other side responds."
- On 409 (already responded) → silent refetch
- Hooks: useMatchSuggestions, useRespondToSuggestion (with optimistic remove)
- Lazy-import per [P-19]
- MSW: matchmaking-handlers.ts — scenarios for empty week (Monday hasn't run), populated 3 cards, accept-creates-connection, accept-no-mutual, 409-already-responded
- Tests: hooks + page renders 3 cards + accept → optimistic remove + connection_created toast

Specific gotchas:
- Display the COUNTERPART side: if caller is `lp` or `potential_lp`, suggestion contains startup details; if caller is a startup, contains LP details. Inspect `lp_id === auth.user_id` to determine perspective.
- Score badge color: > 0.8 green, 0.6–0.8 yellow, < 0.6 grey — use ink-muted for missing score.
- Empty state: "No suggestions this week. Check back on Monday." — DO NOT auto-refetch on focus.

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "matchmaking" in queue.md
- Update session.md (next=profile-viewers)
- Commit: feat(matchmaking): user suggestions + respond
- Say "matchmaking done. Next: profile-viewers. Stopping."
- Stop.
```

---

### 3.8 — `profile-viewers` (1 session, **PII discipline**)

**Pattern reference:** simple list page. Special: enforce a frontend rule that NEVER renders viewer email/phone even if the backend adds those fields.

**Prompt:**

```
Implement profile-viewers per .claude/queue.md § Stage 3 row "profile-viewers".

PRD context to load FIRST:
- §7.7.3 — GET /interactions/profile-viewers (cursor-paginated)
- §13 G11 — PII discipline: NEVER render viewer.email or viewer.phone even if backend adds them. Custom ESLint rule + frontend-enforced render rule.

Read for pattern reference:
- src/features/admin/routes/AdminConnectionsPage.tsx — paginated DataTable

Implementation:
- Route: /profile-viewers — all 10 roles; lazy + RoleGuard
- Page: list of viewer cards (md:grid-cols-2 or DataTable). Each shows viewer.name, viewer.role (RoleBadge), viewer.organisation, viewer.avatar_url (initials fallback), and `viewed_at` as relative time via formatDistanceToNow.
- Click card → navigate to /profile/{viewer.user_id}
- Hooks: useProfileViewers — useInfiniteQuery, qk.interactions.profileViewers
- Lazy-import per [P-19]
- MSW: profile-viewers-handlers.ts — scenarios for empty, populated 5, paginated 50+
- Tests: hook + page renders + scroll → loadMore + each card shows ONLY allowed fields

PII enforcement:
- The ViewerCard component MUST destructure ONLY {user_id, name, role, organisation, avatar_url, viewed_at} from the viewer item. Even if backend response carries email/phone, they MUST NOT appear in the JSX.
- Add a custom ESLint rule (or a regex-based check in the existing eslint config) that fails the lint gate if `viewer.email` or `viewer.phone` is read in any file under src/features/profile-viewers/. If a custom ESLint rule is too heavy, write a unit test that grep-checks the source files for forbidden access.
- Document this rule in src/features/profile-viewers/README.md (one paragraph) so future changes can't silently regress.

Specific gotchas:
- `viewed_at` displays as relative time on the card; full ISO on hover (title attribute)
- Empty state: "No one has viewed your profile yet."
- The dedup-window means each viewer appears at most once even if they viewed multiple times in 60s — don't try to count "views per viewer"; that's a backend concern.

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "profile-viewers" in queue.md
- Update session.md (next=onboarding-add-user)
- Commit: feat(profile-viewers): list + PII discipline (§13 G11)
- Say "profile-viewers done. 8 features complete — please run Spot-check Gate 2 before continuing. Stopping."
- Stop.
```

🟡 **Spot-check Gate 2** — pause here. Smoke-test the four new screens (`/schedule`, `/travel`, `/matchmaking`, `/profile-viewers`) at 375/768/1440px.

---

### 3.9 — `onboarding-add-user` (1 session, **client-side OCR**)

**Pattern reference:** ExecutionPanel for the form. Special: `tesseract.js` for client-side OCR per §13 G2 — first interim service that runs in the browser, not via fetch.

**Prompt:**

```
Implement onboarding-add-user per .claude/queue.md § Stage 3 row "onboarding-add-user".

PRD context to load FIRST:
- §7.2.1 — POST /onboarding/card-scan
- §7.2.2 — GET /onboarding/card-scan/{scan_id}
- §13.2 G2 — OCR gap: client-side via tesseract.js (Whisper deferred — text-only mode for now)

Read for pattern reference:
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel basic
- src/api/interim/profile-service.ts — interim-service pattern from Stage 3.1

Implementation:
- Route: /add-user under {lp, potential_lp, vc, admin, super_admin} — lazy + RoleGuard
- Add tesseract.js dependency: `pnpm add tesseract.js`
- Add interim file: src/api/interim/ocr-client.ts exporting `OCRServiceInterim.recognize(blob: Blob | File): Promise<{raw_text, confidence}>` — wraps Tesseract.recognize with English language; emits progress events
- Page flow:
  1. <FileDropzone> for card image (already exists in components/forms/) — accepts image/jpeg, image/png, image/heic; show progress indicator (Tesseract emits {status, progress})
  2. On OCR complete: Submit POST /onboarding/card-scan {raw_text} via ExecutionPanel → backend GPT-4o parse
  3. Render parsed contact form (name, phone, email, organisation, designation, linkedin_url) prefilled with response.parsed values; highlight missing required fields (name, phone) in red, low-confidence fields in amber
  4. Pick a category (radio: LP / Potential LP / VC / Startup / Partner)
  5. Submit final → POST /onboarding/card-scan with full form data + category, returns {scan_id, user_created, user_id?}
- On 409 duplicate_contact: open modal with "Update existing" (PATCH /onboarding/profile on existing user — admin only) or "Cancel"
- Behind feature flag: respect VITE_OCR_SERVER_ENABLED. When true, replace OCRServiceInterim with a real POST /ocr endpoint call. Endpoint function `runOCR(blob)` in src/api/endpoints.ts branches on the flag.
- Hooks: useCardScan (mutation), useGetCardScan (query), useOCR (calls OCRServiceInterim or endpoint based on flag)
- Lazy-import per [P-19]
- MSW: onboarding-handlers.ts — scenarios for parse-success, parse-partial, 409-duplicate, real-OCR-endpoint mock (when flag flipped)
- Tests: hooks + page smoke + duplicate-contact modal flow + flag-flip path renders the right hook

Specific gotchas:
- §8.12.1: phone normalisation toE164 BEFORE submit — ocr likely produces "+91-9876543210"; strip dashes
- Tesseract latency 2–6s on mid-range laptops — show progress indicator with the % from Tesseract
- CompleteProfilePage update path applies when user_created=false AND admin chose "Update existing"

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick "onboarding-add-user" in queue.md
- Update session.md (Stage 3 done; next=Stage 4.1)
- Commit: feat(onboarding): card scan with tesseract.js client OCR (§13 G2)
- Say "onboarding-add-user done. Stage 3 complete — please run final Stage 3 gate, tag v0.3-user-features, then proceed to Stage 4.1. Stopping."
- Stop.
```

🔴 **Final Stage 3 gate.** All 9 user-facing features done.

```bash
cd ~/Documents/projects/one-community-web
git tag v0.3-user-features
git push --tags
```

---

## Stage 4 — Admin features (3 sessions, ~3 days)

**Goal:** ship the 9 admin screens in 3 batched sessions. Patterns are mostly already established (DataTable + tabs + InlineExecutionButton from Stage 2c) so each session can do 3 features.

### 4.1 — Session 1: admin-home + admin-digest + admin-matchmaking-ops

**Prompt:**

```
Implement Stage 4 Session 1: three admin features in one session, batched.

PRD context to load:
- §7.12.1 — GET /admin/summary (KPI dashboard)
- §7.12.3 — GET /admin/digest (workflow list)
- §7.12.4 — POST /admin/digest/send
- §7.13.1 — POST /digest/generate
- §7.13.2 — POST /digest/approve
- §7.13.3 — GET /digest/pending
- §7.13.4 — GET /digest/history
- §7.8.1 — POST /matchmaking/generate (returns 202 + job_id)
- §7.8.2 — GET /matchmaking/jobs/{id} (poll)
- §7.8.3 — POST /matchmaking/approve
- §7.8.4 — GET /matchmaking/pending

Read for pattern reference:
- src/features/admin/routes/AdminConnectionsPage.tsx — DataTable + tabs + InlineExecutionButton
- Stage 3.3 pitch ExecutionPanel jobPoll wiring (re-use for matchmaking generate)
- src/features/search/components/FilterChips.tsx — URL-backed state for digest tabs

Implementation per feature:
- admin-home (/admin overrides the placeholder route from Stage 1):
  • Page: KPI cards from /admin/summary — pending_connection_count (link to /admin/connections), mis_status (table of unsubmitted), recent_digests (mini list with link), recent_actions (audit feed)
  • Hook: useAdminSummary
  • Cache 60s, refetchOnFocus
- admin-digest (/admin/digest):
  • Three URL tabs: Workflows / Pending / History
  • Workflows tab: list from /admin/digest with "Send Now" InlineExecutionButton per row
  • Pending tab: list from /digest/pending; each row has Preview drawer (sandboxed iframe with content.html) + Approve&Send InlineExecutionButton
  • History tab: read-only list from /digest/history?limit=50
  • + a "Generate for {segment}" button per workflow that calls /digest/generate
  • Invalidations per §8.12.4
- admin-matchmaking-ops (/admin/matchmaking):
  • Page header: "Generate this week" with date picker (defaults to next Monday) + Generate button → 202 + job_id
  • <ExecutionPanel jobPoll> for the generate flow — register job in debug dock
  • Below: Pending suggestions table (from /matchmaking/pending) with Approve InlineExecutionButton per row + Reject (placeholder — no endpoint yet, just hide for now and add a TODO)
  • Hooks: useMatchGenerate, useMatchGenerateJob, useMatchPending, useMatchApprove

For all three features:
- Lazy-import each route per [P-19]
- RoleGuard {admin, super_admin}
- MSW handlers for every endpoint (admin-home-handlers.ts, admin-digest-handlers.ts, admin-matchmaking-ops-handlers.ts) — scenarios for empty, populated, 202 polling success, 409 conflicts
- Tests: 1 hook unit + 1 page smoke per feature (= 3 hooks × 2 = 6 minimum new tests)

Specific gotchas:
- Sandbox the digest preview html: `<iframe sandbox="allow-same-origin" srcDoc={content.html}>` — never dangerouslySetInnerHTML
- generated digest preview can be large — lazy-load only on row expand (don't fetch all at once)
- Date picker for week_of must clamp to Monday: `format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')`

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick all three rows in queue.md § Session 4.1
- Update session.md (next=Stage 4.2)
- Commit: feat(admin): home + digest + matchmaking-ops
- Say "Stage 4.1 done. 3 admin features. Please spot-check before 4.2. Stopping."
- Stop.
```

🟡 **Spot-check after 4.1** (20 min).

---

### 4.2 — Session 2: admin-quarterly-reports + admin-dead-letter-jobs + admin-lp-funnel

**Prompt:**

```
Implement Stage 4 Session 2: three admin features in one session, batched.

PRD context to load:
- §7.12.7 — GET /admin/quarterly-reports
- §7.12.8 — POST /admin/quarterly-reports/approve
- §7.12.9 — GET /admin/dead-letter-jobs (OFFSET pagination — only endpoint that uses it)
- §7.12.10 — POST /admin/dead-letter-jobs/{id}/retry
- §7.12.5 — PUT /admin/lp/{user_id}/funnel-status (5 statuses + override on 409)
- §13 G10 — DLQ uses offset pagination; use <OffsetPaginator> component
- §8.12.4 — invalidation rows for the three mutations

Read for pattern reference:
- src/features/admin/routes/AdminConnectionsPage.tsx — DataTable + InlineExecutionButton
- src/components/pagination/ — both CursorPaginator and OffsetPaginator (verify OffsetPaginator exists; build if not)

Implementation per feature:
- admin-quarterly-reports (/admin/quarterly-reports):
  • Page: optional ?quarter=Q1-2026 filter input + DataTable from /admin/quarterly-reports
  • Each row: quarter, status badge (pending/approved/sent), drive_url link (rel="noopener noreferrer"), Approve InlineExecutionButton (visible only when status=pending)
  • On approve success: row flips to "Approved, distributing…"
  • Confirm dialog before approve (warns about distribution)
- admin-dead-letter-jobs (/admin/dead-letter-jobs):
  • URL tabs: pending / retried / succeeded / abandoned (?retry_status=)
  • OFFSET-paginated DataTable with limit=50
  • Each row: task_name, exception_class (badge), failed_at (relative), retry_status, Actions (Retry InlineExecutionButton for pending only)
  • Click row → opens Drawer with full args/kwargs JSON, traceback inside <pre overflow-x-auto>
  • On retry success: optimistic update retry_status=retried; toast "Retried — new task {new_task_id}"; on 409 refetch
  • Use <OffsetPaginator limit=50> with prev/next buttons
- admin-lp-funnel (/admin/lp-funnel/:user_id):
  • Picker route: /admin/lp-funnel — search-or-select an LP (re-use SearchPage filter to user_role=lp)
  • Detail route: /admin/lp-funnel/:user_id — show current funnel_status badge + 5 stage buttons (1_new_lead → 5_invested) + override checkbox
  • Click a stage button → confirm dialog → PUT /admin/lp/{user_id}/funnel-status
  • On 409 (skip without override) → modal "Enable override?" → re-PUT with override=true
  • On success: toast lists auto_actions_triggered (e.g. "deal_suggestions_enabled")

For all three features:
- Lazy-import each route per [P-19]
- RoleGuard {admin, super_admin}
- MSW handlers per endpoint with key scenarios (offset pagination, 409 override, 409 already-handled)
- Tests: 1 hook unit + 1 page smoke per feature

Specific gotchas:
- DLQ traceback rendering: <pre className="overflow-x-auto whitespace-pre">{traceback}</pre> — never overflow the card
- args/kwargs are arbitrary JSON — render with <code>{JSON.stringify(args, null, 2)}</code>
- LP funnel labels: '1_new_lead' → 'New Lead', '2_first_reach_out' → 'First reach-out', etc. Use a single label map in src/features/admin/lib/funnel-labels.ts.

DoD per CLAUDE.md §10. Run all four gates.

At the end:
- Tick all three rows in queue.md § Session 4.2
- Update session.md (next=Stage 4.3)
- Commit: feat(admin): quarterly-reports + dlq + lp-funnel
- Say "Stage 4.2 done. Please spot-check before 4.3. Stopping."
- Stop.
```

🟡 **Spot-check after 4.2** (20 min).

---

### 4.3 — Session 3: admin-partner-referral + admin-tracxn + admin-analytics

**Prompt:**

```
Implement Stage 4 Session 3: three admin features in one session, batched. The analytics screen is the most complex — load §7.14 fully.

PRD context to load:
- §7.12.6 — POST /admin/partner-referral (sector + message + startup_name)
- §7.15.1 — POST /enrichment/tracxn (action: created|merged|duplicate_skipped)
- §7.14.1 — GET /analytics/overview (KPI cards)
- §7.14.2 — GET /analytics/funnel/lp
- §7.14.3 — GET /analytics/funnel/startup
- §7.14.4 — GET /analytics/funnel/connections
- §7.14.5 — GET /analytics/cohort?months
- §7.14.6 — GET /analytics/match-success
- §13 G8 — analytics shapes are draft; use Zod .passthrough() everywhere; chart components must guard each key with `?? 0`

Read for pattern reference:
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel for partner-referral and tracxn forms
- (no chart pattern yet — this is the first Recharts use)

Install: `pnpm add recharts`

Implementation per feature:
- admin-partner-referral (/admin/partner-referral):
  • Simple <ExecutionPanel<PartnerReferralRequest, PartnerReferralResponse>> with sector picker, message textarea, startup_name input
  • On success: toast "Notified {partners_notified} partners"
- admin-tracxn (/admin/tracxn):
  • Manual ingest console: <ExecutionPanel<TracxnInput, TracxnResponse>> with all input fields (company_name required, others optional)
  • Action-specific success toast: created → "Added {company_name}", merged → "Updated {updated_fields.length} fields on {company_name}", duplicate_skipped → "Already exists"
- admin-analytics (/admin/analytics):
  • URL tabs: Overview / Funnel / Cohort / Match Success
  • Overview tab: 4–6 KPI cards (users_total, lps_total, startups_total, connections_accepted, etc.) — render only known keys; ignore unknown ones (debug dock can inspect raw)
  • Funnel tab: 3 stacked <FunnelChart> from Recharts — LP funnel (5 stages), Startup pipeline (top 6 statuses + "Other" bucket), Connections (5 statuses)
  • Cohort tab: heatmap from /analytics/cohort?months=12 — rows=cohort, columns=retention windows (1m/3m/6m/12m); render percentages = retained_Nm / cohort_size
  • Match Success tab: <LineChart> from Recharts over weeks — accepted/rejected/skipped percentages
  • All chart components in src/features/analytics/components/
  • Hooks: useAnalyticsOverview, useAnalyticsFunnel{LP,Startup,Connections}, useAnalyticsCohort, useAnalyticsMatchSuccess

For all three features:
- Lazy-import each route per [P-19]
- RoleGuard {admin, super_admin}
- All Zod schemas use .passthrough() — strict can be tightened per §13 G8 once backend publishes
- MSW handlers: partner-referral, tracxn, analytics (6 endpoints with empty + populated scenarios)
- Tests: 1 hook unit + 1 page smoke per feature (analytics smoke can be light — Recharts renders are visual)

Specific gotchas:
- Indian-numbering for KPIs: `value.toLocaleString('en-IN')`
- Funnel chart labels: map enum keys → display labels (e.g. '1_new_lead' → 'New Lead')
- Cohort heatmap cells: null → "—" (not enough history elapsed); compute percentage with `(retained_Nm / cohort_size * 100).toFixed(0) + '%'`
- Match-success percentages: `(value * 100).toFixed(0) + '%'`
- Lazy-import Recharts at the chart component level (it's heavy ~80KB gzip): `const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })))` — keep main chunk small

DoD per CLAUDE.md §10. Run all four gates. Bundle: analytics chunk should appear separately ~50–80KB; main chunk shouldn't grow > 5KB.

At the end:
- Tick all three rows in queue.md § Session 4.3
- Update session.md (Stage 4 done; next=Stage 5.1 QA report)
- Commit: feat(admin): partner-referral + tracxn + analytics
- Say "Stage 4.3 done. Stage 4 complete — please run final spot-check, tag v0.4-admin, then proceed to Stage 5. Stopping."
- Stop.
```

🔴 **Final Stage 4 gate.**

```bash
cd ~/Documents/projects/one-community-web
git tag v0.4-admin
git push --tags
```

---

## Stage 4-fix — User-side `/digest` (1 session, ~1.5 hr)

> **Why this exists.** The original `/digest` route was wired as a Phase-4 placeholder ("blocked on backend channel"). Backend now ships three user-facing endpoints under `/api/v1/me/digest/*` (decisions.md `[P-22]`, PRD §7.13.5–7.13.7). This session replaces the placeholder with the real Recent + Preferences UI. The Phase-4 framing stays only as a small hint under the frequency radio — the data layer is no longer blocked.

**Prompt:**

```
Replace the /digest blocker page with the real user-side digest UI per PRD §7.13.5–7.13.7 and decisions.md [P-22].

PRD context to load FIRST:
- §7.13.5 — GET /me/digest/recent (cursor-paginated)
- §7.13.6 — GET /me/digest/preferences
- §7.13.7 — PUT /me/digest/preferences (PATCH-style; ConfigDict extra='forbid')
- §8.12.4 — invalidation matrix row for the new mutation
- decisions.md [P-22] — backend changes summary + future-session rule

Read for pattern reference:
- src/features/admin/routes/AdminConnectionsPage.tsx — list pattern (clone for Recent panel)
- src/features/onboarding/routes/CompleteProfilePage.tsx — ExecutionPanel pattern (clone for Preferences form)
- src/features/digest/components/DigestPreviewDrawer.tsx — already exists; reuse for "open row" preview if you decide to add it
- decisions.md [P-21] — masking discipline (NOT applied here — every authenticated user sees their OWN preferences in full)

Implementation:
- Endpoint functions in src/api/endpoints.ts: listMyDigests, getMyDigestPreferences, updateMyDigestPreferences. Each uses the standard envelope unwrap + Zod parse pattern.
- Zod schemas in src/features/digest/me-schemas.ts mirroring the §7.13.5–7.13.7 contracts. Use z.literal union for frequency (not z.enum, easier to subtype).
- Stable query keys: qk.me.digest.recent (with limit) and qk.me.digest.preferences.
- Hooks in src/features/digest/hooks/:
  - useMyDigests({ limit }) — useInfiniteQuery on qk.me.digest.recent; cursor via getNextPageParam
  - useMyDigestPreferences() — useQuery, staleTime 5 min, refetchOnFocus
  - useUpdateMyDigestPreferences() — useMutation, on success: invalidate qk.me.digest.preferences (always) and qk.me.digest.recent (only if frequency === 'paused' was set, since paused users won't see new rows)
- Replace src/features/digest/routes/UserDigestPage.tsx (or whatever the placeholder file is named — find via grep for "What needs to ship before this goes live"):
  - Remove the entire blocker card and the Phase-4 banner at the top
  - Two-column layout matching the screenshot:
    - Left: Recent digests list using <Card> rows. Each row shows subject (or digest_type if subject is null), formatDistanceToNow(sent_at), html_snippet truncated to 280 chars. Empty state: "Your first digest will land Monday morning."
    - Right: Preferences form inside <ExecutionPanel<MyDigestPreferencesUpdate, MyDigestPreferencesResponse>>:
      - Frequency radio: Weekly / Monthly / Paused
      - Subtle hint under radio: "Active when WhatsApp delivery launches." — keeps Phase-4 honesty without showing a blocker
      - Topic-of-interest chip selector (sanctioned vocab from P-22 / the existing screenshot: fintech, defence, saas, deep_tech, ai, climate). Multi-select toggle; persists in form state.
      - WhatsApp opt-in toggle (calls through opted_in_wa)
      - Save button (the panel's default Submit)
- MSW handlers in src/test/msw-fixtures/digest-me-handlers.ts: scenario-switchable for empty / populated / 422-bad-frequency / 422-extra-key. Wire into msw-handlers.ts.
- Tests:
  - useMyDigests: pagination test (3 fixtures, asserts next_cursor stops)
  - useMyDigestPreferences: hydrate from MSW + caches 5 min
  - useUpdateMyDigestPreferences: optimistic + rollback on 422
  - UserDigestPage smoke: renders Recent list + Preferences form; submit flips frequency
- Lazy-import the page route per [P-19] (it should already be lazy from Stage 1 — verify, don't duplicate)

Specific gotchas:
- The blocker card on the existing page also references /admin/digest as the "open admin console" CTA — keep that link only when role is admin / super_admin (use can('admin.any', role)).
- For non-LP roles (vc, partner, advisor, startup_*), the LP-mirror logic on the backend is a no-op; don't render anything special on the frontend, the form behaves identically.
- The "Topics of interest" chip vocabulary (fintech / defence / saas / deep_tech / ai / climate) is a frontend-suggested list, not a server-enforced enum. Allow free-form additions via a small "+" affordance if you want, but the v1 default ships with the 6 chips visible and clickable.
- Server normalises tags (trim + lowercase + dedupe + sort) — DO NOT pre-normalise on the client. Submit what the user picked; trust the server response.

DoD per CLAUDE.md §10. Run all four gates — must exit 0.

At the end:
- Tick a new "user-digest-page" row in queue.md § Stage 4 (add it under Session 4.1 since it conceptually belongs with the digest workflow, but mark "(post-Stage-4-fix)")
- Update session.md (next=Stage 5.1 qa-report)
- Commit: feat(digest): replace /digest blocker with real /me/digest UI (P-22)
- Say "User-side digest done. /digest no longer shows a blocker. Ready for Stage 5.1 qa-report. Stopping."
- Stop.

If blocked, use decisions.md P-N protocol (CLAUDE.md §0.1).
```

🟡 **After this session:** sign in as the LP seed user (+911234567892) and visit `/digest` — should show the Recent list (probably empty unless you've seeded historical digests) + the Preferences form. Toggle the frequency between Weekly / Monthly / Paused and confirm the value persists across refresh. Toggle a topic chip and reload — same.

---

## Stage 5 — Polish + QA (5 sessions, ~3 days)

Five distinct sessions. Run them in order — `qa-report` (read-only) writes findings; `qa-fixes` (write) addresses them; the last three are independent polish passes.

### 5.1 — `qa-report` (read-only QA pass)

**Prompt:**

```
Switch into QA mode. Do NOT write any code. Do NOT commit. Produce a single report at .claude/issues.md § Active.

Run through every screen in queue.md § Stage 2/3/4 (all 21 features). For each feature:

1. **Four UI states** — verify loading skeleton, empty, error (ApiError code → friendly message), success all render. Note any feature with a missing state.
2. **<RoleGuard>** — confirm the route's role list matches the spec. Cross-check against PRD §4 Feature → Screen Mapping table.
3. **Mobile** — open the page at 375px viewport. Note any horizontal-overflow, tap-targets <44px, illegible text.
4. **Keyboard nav** — tab order, Esc closes overlays, Enter submits forms.
5. **ExecutionPanel** — every action screen wraps its form+mutation in ExecutionPanel / ExecutionDialog / InlineExecutionButton. Note any inline `useMutation` in route components.
6. **Code grep** — flag any:
   • `as any` outside test files
   • inline role string comparisons (`role === 'admin'`) outside src/lib/role-capabilities.ts
   • inline axios.create or axios.post outside src/api/client.ts
   • dangerouslySetInnerHTML
   • hardcoded test data in route components
7. **Tests** — every hook has a unit test; every page has a smoke test; MSW handlers cover happy + error paths.
8. **Bundle observability** — run `pnpm build` and capture chunk sizes. Note any feature whose chunk exceeds 30 KB gzip.
9. **Gates** — `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0. Note any new warnings.

Format each issue per CLAUDE.md §10 issue template:
```

[I-N] <short title>

- File: src/path/to/file.tsx:42
- Severity: H | M | L
- Rule violated: <CLAUDE.md §X.Y or PRD §Y.Z>
- Observed: <what's wrong>
- Expected: <what should happen>
- Fix: <concrete one-line fix>
- Found at: 2026-MM-DD (Stage 5.1 QA)

```

At the end: append a summary line to .claude/issues.md: "QA complete. N issues found — H: x, M: y, L: z. Awaiting human triage."

Update session.md (current=qa-report; next=human triage of issues.md).
Commit: `chore: Stage 5.1 QA report (N issues found)`
Stop.
```

**After this prompt:** open `.claude/issues.md`, read every issue, strike through the ones you want to defer (move them to `§ Deferred` per the file's template), and decide which to fix in 5.2.

---

### 5.2 — `qa-fixes`

**Prompt:**

```
Fix every non-deferred issue in .claude/issues.md § Active. Process them in severity order (all H first, then M, then L) — within a severity, group by file so multiple fixes land in fewer commits.

For each fix:
1. Open the file at the file:line cited in the issue.
2. Apply the "Fix" recipe.
3. Update the relevant test (or add one if missing).
4. Run `pnpm lint && pnpm typecheck && pnpm test` after EVERY 3-5 fixes — don't batch a dozen fixes between gate runs.
5. Move the issue row from § Active to § Resolved with the commit hash and a one-line "Fix applied:" note.

If a fix becomes more involved than the issue described (e.g. requires architectural change), STOP that issue and use the decisions.md P-N protocol — do NOT silently expand scope.

Run all four gates at the end. Must exit 0.

Tick "qa-report" and "qa-fixes" boxes in queue.md.
Update session.md (next=Stage 5.3 a11y).
Commit final state with: `chore: Stage 5.2 fixes — resolved N issues (H: x, M: y, L: z)`
Say "QA fixes complete. Awaiting human review of .claude/issues.md before Stage 5.3."
Stop.
```

---

### 5.3 — `a11y-audit`

**Prompt:**

```
Run an accessibility audit on the top 10 screens. Append findings to .claude/issues.md § Active under heading "## A11y findings (Stage 5.3)".

Top 10 screens: /signin, /onboarding/profile, /dashboard, /search, /profile/:id, /connections, /pitch, /mis, /admin, /admin/connections.

For each screen:
1. Lighthouse score — run `npx lighthouse http://localhost:5173/<path> --only-categories=accessibility --chrome-flags="--headless"` and capture the score. Target: ≥ 90.
2. Keyboard nav — tab from address bar to every interactive element; verify focus rings visible (brand-blue ring per §6.6b); Esc closes modals; Enter submits forms.
3. ARIA — every <button> has accessible name (visible text or aria-label); every <input> has <Label htmlFor>; status changes announced via aria-live="polite".
4. Colour contrast — verify text/background contrast ≥ 4.5:1 (auto-checked by Lighthouse but spot-check brand-blue + ink-muted on muted backgrounds).
5. Reduced motion — ensure no auto-playing animations; respect `@media (prefers-reduced-motion: reduce)`.

For every screen with score < 90 OR a manual finding: append an issue row per CLAUDE.md §10 template with severity (H if blocks AT users, M if degrades, L if cosmetic).

Then implement the fixes from the same session (this differs from 5.1, where you only reported). After each fix, re-run Lighthouse. After all fixes, every screen must score ≥ 90.

Run all four gates at the end.

Tick "a11y-audit" in queue.md.
Update session.md (next=Stage 5.4 bundle-size).
Commit: `chore: a11y fixes — all top-10 screens ≥ 90`
Stop.
```

---

### 5.4 — `bundle-size`

**Prompt:**

```
Verify the bundle is healthy and below the queue.md gate (initial chunk < 300KB gzip).

1. Run `pnpm build` and capture the chunk-size output.
2. Confirm route-level lazy is applied to every feature route — open src/app/router.tsx, count the `const X = lazy(...)` declarations vs the static imports of route components. Per [P-19] only HomePage / SignInPage / DashboardPage / ExpiredPage / UnauthorizedPage / NotFoundPage / ComingSoonPage should be eager.
3. If main chunk > 300KB gzip OR any feature chunk > 80KB gzip: identify the heaviest dependency in the chunk (use `npx vite-bundle-visualizer` or read the build output). Lazy-import it at the feature level — common offenders: recharts, tesseract.js, large date-fns imports.
4. Confirm tesseract.js (if used in onboarding-add-user) is dynamically imported only when the user enters the OCR flow, not at app boot.
5. Verify the Phase-4 placeholder routes (/documents, /digest) are eagerly imported (they're tiny ComingSoonPage instances) — no need to lazy-split.

Append a summary to .claude/issues.md § Resolved (or § Active if any fix was needed) of the form:
```

Bundle size verification (Stage 5.4):

- Initial chunk: X KB gzip (target < 300)
- Largest feature chunk: <feature-name> Y KB gzip (target < 80)
- Status: ✅ all targets met / ⚠️ N exceeded — fixes applied

```

Run all four gates at the end.

Tick "bundle-size" in queue.md.
Update session.md (next=Stage 5.5 playwright-smoke).
Commit (only if changes were made): `perf: bundle-size pass — main chunk now {X} KB`
Stop.
```

---

### 5.5 — `playwright-smoke`

**Prompt:**

```
Add Playwright e2e smoke tests for the critical user flows. Install Playwright if missing: `pnpm add -D @playwright/test && pnpm exec playwright install --with-deps chromium`.

Create tests in `e2e/`:

1. **e2e/auth-and-search.spec.ts** — sign in as the LP seed user (+911234567892, OTP 000000) → land on /dashboard → click Search in sidebar → enter "fintech" → see at least 1 result card → assert no console errors.

2. **e2e/connection-flow.spec.ts** — sign in as LP → search → click "Request Connect" on a result → submit message → toast success → /connections/pending shows the request → switch to admin user (+918087464723) → /admin/connections pending tab shows the row → Approve → request disappears from pending. (You may need to fake the second user via auth-store mutation in the test setup since switching real users is heavy.)

3. **e2e/pitch-deck.spec.ts** — sign in as startup_funded user (+911234567894) → /pitch → submit profile → switch to Deck tab → submit Drive URL → poll job → render AI evaluation result.

4. **e2e/admin-respond.spec.ts** — sign in as the target user → /connections/pending shows the incoming request → Accept → contact details unlock on /profile/:id.

Add a `pnpm e2e` script to package.json: `"e2e": "playwright test"`.

Add a CI step in .github/workflows/ci.yml: install browsers, run `pnpm e2e` after `pnpm build`. Skip if branch is a long-lived feature branch.

For each spec, use Playwright fixtures to avoid re-typing the OTP flow — write a `signin(role)` helper in `e2e/_helpers.ts`.

Run `pnpm e2e` locally → all 4 specs must pass against the dev backend running at localhost:8000.

Run all four gates + e2e at the end.

Tick "playwright-smoke" in queue.md.
Update session.md (Build complete — ready for production review).
Commit: `test(e2e): playwright smoke for 4 critical flows`
Say "Stage 5 complete. Build is ready for production review. Tag v1.0 after human approval. Stopping."
Stop.
```

🔴 **Final v1.0 gate.** Read the full diff since `v0.4-admin`. Smoke-test every screen one last time. When satisfied:

```bash
cd ~/Documents/projects/one-community-web
git tag v1.0
git push --tags
```

---

## Time budget summary

| Stage                                           | Your time              | Opus sessions       |
| ----------------------------------------------- | ---------------------- | ------------------- |
| Stage 0: Interview                              | 30 min                 | 1 × 30 min          |
| Stage 1: Scaffold + review                      | 1 hr                   | 1 × 3 hrs           |
| Stage 2: Auth + 2 calibration features + review | 2 hrs                  | 3 × 2 hrs           |
| Stage 3: 8 user features + 2 spot-checks        | 1 hr                   | 8 × 2-3 hrs         |
| Stage 4: 9 admin features + 3 spot-checks       | 1 hr                   | 3 × 3 hrs (batched) |
| Stage 5: QA + fixes                             | 1 hr                   | 2 × 2 hrs           |
| **Total**                                       | **~6.5 hrs attention** | **~50-60 hrs Opus** |

Wall-clock: 8-12 days running 2-3 sessions per day.

---

## Emergency protocols

### Claude gets stuck mid-session

It should self-halt via the `decisions.md` banner. If it doesn't and is producing garbage:

1. Hit Esc, stop the run.
2. Inspect `session.md` and `queue.md` — what feature was it on?
3. Start a fresh session with: `"Revert any uncommitted changes. Read session.md. Resume cleanly."`

### You find a systemic mistake mid-build

Do NOT prompt Claude to fix all occurrences one-by-one. Instead:

1. Pick ONE file that exemplifies the right pattern.
2. Prompt: `"File X at line Y is correct. Apply the same pattern to [list of files]. Run all four gates."`
3. This refactor becomes the new template for future features.

### Backend contract changes mid-build

1. Update `docs/frontend_prd.md §7.X` in YOUR editor with the new shape.
2. Tell Claude: `"PRD §7.X updated. Invalidate all cached knowledge of this endpoint. Update the Zod schema, endpoint function, and every usage. Run all four gates."`
3. Commit the PRD change separately from the code change so git blame stays clean.

---

## Success criteria

Build is done when:

- [ ] Every box in `queue.md` is ticked
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0
- [ ] `.claude/decisions.md § Pending` is empty
- [ ] `.claude/issues.md § Active` is empty (or deliberately deferred items only)
- [ ] Playwright smoke of at least: signin → search → request-connect → admin-approve → target-accept works end-to-end
- [ ] Lighthouse accessibility score ≥ 90 on the top 5 screens
- [ ] Bundle size: initial chunk < 300KB gzipped

Tag it `v1.0`, push, and hand off to QA/staging.

---

_Runbook version 1.0 — 2026-04-24. If this gets revised, bump the version in session.md's header._
