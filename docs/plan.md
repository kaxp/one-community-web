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

## Stage 3 — Autonomous user features (4-6 sessions, ~1 week)

**Goal:** grind through `queue.md § Stage 3` features. Opus implements one feature per session, ~2-3 hours each. You run 1-3 sessions per day.

### The one prompt you use for every feature

Copy-paste this EXACT prompt each session. It works for every remaining feature because queue.md tells Claude what's next.

```
Read .claude/session.md, .claude/queue.md, .claude/decisions.md (pending + resolved), and the relevant frontend_prd.md §7.X for the NEXT unchecked feature in queue.md.

Implement that ONE feature completely:
- Feature folder per §6.2
- Zod schemas per §7.0 envelope + endpoint rules
- Typed endpoint function in src/api/endpoints.ts
- Stable query keys in src/api/query-keys.ts
- Hooks (useQuery / useMutation) in the feature folder
- Route component wrapped in <ExecutionPanel> where applicable
- NAV_ITEMS entry added in role-capabilities.ts
- MSW handler (happy path + 1 error fixture)
- Unit tests per hook
- All 4 UI states implemented

Follow CLAUDE.md §10 DoD. Run all four gates. Must exit 0.

At the end:
- Tick the feature box in queue.md
- Update session.md (current=<feature>, last=<what you did>, next=<next unchecked feature>)
- Commit: `feat: <feature-name>`
- Say "<feature> done. Next: <next feature>. Stopping."
- Stop.

If you hit a real blocker, use the decisions.md pending protocol (CLAUDE.md §0.1 — add P-N item, print banner, stop). Do not invent answers. Do not make architectural decisions.
```

### Spot-check gates during Stage 3

After every **4 completed features**, spend 30 min:

- `pnpm dev`, click through the 4 new screens at 375/768/1440px
- Verify all 4 UI states trigger
- Look for replicated mistakes (same wrong pattern in multiple places)
- If you find a systemic issue: fix it yourself ONCE, add a note to `.claude/decisions.md § Resolved`, and all future sessions inherit the correction

Suggested spot-check gates:

- After: profile-view, connections (list + pending), pitch, mis → **gate**
- After: schedule, travel, matchmaking, profile-viewers → **gate**
- After: onboarding/add-user → Stage 3 done

```bash
git tag v0.3-user-features
```

---

## Stage 4 — Autonomous admin features (3 sessions, ~3 days)

Same prompt as Stage 3. The remaining admin features in `queue.md § Stage 4` follow identical patterns to the calibration ones (DataTable + tabs + mutations).

Cluster them into 3 sessions:

- **Session 1:** admin-home (/admin/summary) + admin-digest + admin-matchmaking-ops
- **Session 2:** admin-quarterly-reports + admin-dead-letter-jobs + admin-lp-funnel
- **Session 3:** admin-partner-referral + admin-tracxn + admin-analytics (last one needs Recharts)

Use the **same prompt** from Stage 3. Just say "next feature(s)".

**Analytics tip:** the analytics session benefits from loading `frontend_prd.md §7.14.1–7.14.6` fully, because each chart has its own shape. Claude will do this automatically.

**🔴 Spot-check after each admin session** (20 min each).

```bash
git tag v0.4-admin
```

---

## Stage 5 — Final polish + QA (1-2 sessions)

### 5a — QA report session

**Prompt:**

```
Switch into QA mode. Do NOT write code. Produce a single report at .claude/issues.md § Active issues.

Run through every screen in queue.md. For each:
1. Verify all 4 UI states render (loading / empty / error / success).
2. Verify <RoleGuard> is correct per §4 feature map.
3. Verify mobile layout at 375px — no overflow, tap targets ≥ 44px.
4. Verify keyboard nav (Tab / Esc / Enter works).
5. Verify ExecutionPanel is used for action screens.
6. Grep for `any`, inline role string comparisons, inline axios, hardcoded data.
7. Verify each feature has a unit test for hooks + MSW handler.
8. Run `pnpm lint && typecheck && test && build` — capture any warnings.

Write issues to .claude/issues.md with file:line references per CLAUDE.md §10. Do NOT fix. Do NOT commit code. Only append to issues.md.

At the end: say "QA complete. N issues found (X severe, Y medium, Z low). Awaiting triage."
```

### 5b — Fix session

Review `.claude/issues.md`, strike through items you want to defer, then:

```
Fix every non-deferred issue in .claude/issues.md § Active. After each fix, move the row to § Resolved with commit hash. Run all four gates (lint/typecheck/test/build) at the end.

Tick Stage 5 boxes in queue.md. Commit `chore: Stage 5 fixes`. Say "Build complete. Ready for production review." Stop.
```

```bash
git tag v1.0
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
