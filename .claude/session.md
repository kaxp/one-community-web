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

_(none — Stage 3 third feature `pitch` complete; next unchecked queue.md row is `mis`)_

### Last completed action

Completed Stage 3 third feature **pitch** end-to-end. All four PRD endpoints (§7.3.1–§7.3.4) ship behind a single `/pitch` route with three URL-tabs. Also wired the long-deferred `<ExecutionPanel jobPoll>` branch — types existed, the runtime didn't.

- **`<ExecutionPanel jobPoll>` branch (cross-cutting)** — `src/components/execution-panel/ExecutionPanel.tsx` now owns the polling state machine described in PRD §6.7.3. Submit returns a 202 ack with `job_id`; the panel extracts the id, registers the job in the debug dock via `registerJob()` (PRD §6.8), and drives a `useQuery` with `refetchInterval: (q) => q.state.data?.ready ? false : intervalMs` capped at `maxPolls` (defaults 3000ms / 30 polls). Renders a polling banner during `STARTED`, the `renderResult` block on SUCCESS, an "Evaluation failed" panel on FAILURE with a retry button that resets the mutation, and a "Still running" timeout panel with manual refresh after the cap. Types refactored: `ExecutionPanelProps<TInput, TOutput, TAck = TOutput>` so the mutation can return a 202 ack while `renderResult` consumes the polled `TOutput`. `onJobAccepted?(ack, jobId)` is the seam for the debug-dock registration.
- **Job registry** — new `src/lib/debug/use-job-registry.ts` writes `localStorage['oc.debug.jobs']` (FIFO cap 100). Pure module (no React) so the dock can read it without importing the panel.
- **Pitch schemas** (`src/features/pitch/schemas.ts`): `zStartupProfileRequest` / `zStartupProfileResponse` matching §7.3.1, `zDeckUploadRequest` / `zDeckUploadAck` matching §7.3.3 (ack carries `job_id` + `status: 'queued'`), `zAIEvaluationResult` matching §7.3.4 SUCCESS payload (signal + summary + strengths/concerns/recommended_lp_types), `zDeckJobStatus` for the poll endpoint. Discriminated `StartupProfileResult = { status: 'missing' } | { status: 'present', data }` so the page branches off the 404 domain signal cleanly. `STARTUP_STAGES` re-exported from onboarding for convenience. Optional number fields use a NaN-tolerant pattern (`refine + .optional() + .transform(NaN→undefined)`) — no `z.preprocess` because that erases the input type and breaks the form's `Partial<TInput>` inference under `exactOptionalPropertyTypes`.
- **Stage label helper** — `src/features/pitch/lib/stage-label.ts` exposes `stageLabel(stage)` (`pre_seed → "Pre-Seed"` etc.) and `formatCrore(value)` (PRD §8.12.2 — `₹ 10 Cr` via `toLocaleString('en-IN')`).
- **Endpoint functions** (`src/api/endpoints.ts`): `getStartupProfile`, `postStartupProfile`, `postDeck`, `getDeckJob` — all Zod-parsed. Profile save uses `stripUndefined` per CLAUDE.md §5.10 (backend has no clear-field allowlist).
- **Query keys** (`src/api/query-keys.ts`): `qk.pitch.profile`, plus `qk.pitch.deckJobAll` (broad-prefix invalidation per §8.12.4) AND `qk.pitch.deckJob(id)` (per-job, used as the panel's `jobPoll.queryKey` prefix that gets the id appended).
- **Hooks** (`src/features/pitch/hooks/`):
  - `useStartupProfile` — catches the 404 ApiError and folds it into `{ status: 'missing' }`. Re-throws every other error as ApiError so `<ErrorState>` can surface it.
  - `useUpsertStartupProfile` — mutation. On success invalidates `qk.pitch.profile` AND `qk.pitch.deckJobAll` (clears stale eval state per PRD §7.3.1 transformation note).
  - `useSubmitDeck` — mutation returning the 202 ack `DeckUploadAck`. On success invalidates `qk.pitch.profile` so `deck_url` flips from null to the submitted URL (per §8.12.4).
  - `useDeckJobStatus(jobId)` — standalone polling hook (used in tests; the route consumes `getDeckJob` via `<ExecutionPanel jobPoll.queryFn>`).
- **Route** (`src/app/router.tsx`): `/pitch` mounted under a `<RoleGuard roles={['startup_inprogress','startup_onboarded','startup_funded','admin','super_admin']}>`. Lazy-imported per [P-19].
- **Page** (`src/features/pitch/routes/PitchPage.tsx`): three URL-tabs (`?tab=profile|deck|evaluation`).
  - **Profile** (always) — `useStartupProfile` → either empty `<StartupProfileForm>` (404) or prefilled (200).
  - **Deck** (visible iff profile present) — `<CurrentDeckSummary>` + `<DeckUploadPanel>`. The deck panel is the canonical `<ExecutionPanel jobPoll>` consumer: 202 → poll every 3s → SUCCESS renders `<AIEvaluationCard>` inline; FAILURE/timeout handled by the panel itself.
  - **AI Evaluation** (visible iff a successful eval has happened) — re-renders the latest result via the `onEvaluation` callback bubbled up from `<DeckUploadPanel>`.
  - On 404 from POST /pitch/deck, the panel auto-navigates to `?tab=profile` (the user has no startup row yet — PRD §7.3.3).
- **Components** (`src/features/pitch/components/`):
  - `StartupProfileForm.tsx` — full §7.3.1 schema. `ExecutionPanel<StartupProfileRequest, StartupProfileResponse>` with stage select + ask amount + URLs.
  - `DeckUploadPanel.tsx` — `ExecutionPanel<DeckUploadRequest, AIEvaluationResult, DeckUploadAck>`. Wires the `jobPoll` config + `onJobAccepted` (registers in debug dock) + `onEvaluation` upward callback. Mirrors the panel's polling cache (read-only, `enabled: false`) so the latest SUCCESS result can be lifted to the parent without extra network calls.
  - `AIEvaluationCard.tsx` — green/yellow/red badge keyed off `result.signal` (`strong | moderate | weak`), summary, strengths/concerns bullet lists, opaque LP-type chips. Concerns get a tinted background when signal === 'weak' per PRD §7.3.4 transformation note.
- **MSW** (`src/test/msw-fixtures/pitch-handlers.ts`): canonical owner of `GET /pitch/profile`, `POST /pitch/profile`, `POST /pitch/deck`, `GET /pitch/deck/jobs/:jobId`. Module-scoped fixture stores with helpers `setMswProfileScenario`, `setMswPitchProfileFixture`, `queuePitchProfileError`, `queuePitchProfileSaveError`, `queuePitchDeckError`, `setMswDeckOutcome` (success / failure / timeout, configurable `pollsBeforeReady`), `setMswPitchAIResult`. Per-job counter map keyed by job_id so the deck-job poll handler is genuinely stateful across multiple ticks. UUID generator hand-shaped to satisfy Zod's RFC-4122 v4 regex (8-4-4-4-12 with version-4 + variant nibbles in the right places).
- **Tests** (+15 cases vs prior commit, total 118 across 34 files):
  - `useStartupProfile` (3): present, missing (404 → status='missing', not ApiError), 500 surfaces ApiError.
  - `useUpsertStartupProfile` (2): success + 422 ApiError.
  - `useSubmitDeck` (2): 202 ack + 404 ApiError.
  - `useDeckJobStatus` (2): STARTED while polls remaining, SUCCESS once `pollsBeforeReady=0`.
  - `ExecutionPanel.jobpoll.test.tsx` (3): polls until SUCCESS triggers renderResult; FAILURE renders the failure block; `onJobAccepted` fires exactly once with the extracted job_id.
  - `PitchPage` (3): 404 renders Create form (no Deck/Evaluation tabs); existing profile renders Edit form (Deck tab visible); Deck tab + successful poll renders the `<AIEvaluationCard>` with strengths.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (118/118 across 34 files), `pnpm build` (exits 0). Per-feature chunk: PitchPage **11.48 KB / 3.95 KB gzip**. Main chunk: 287.65 → 288.39 KB gzip (+0.74 KB — well under the 30 KB-per-feature budget).

### Next concrete step

Pick up the next unchecked feature in `queue.md § Stage 3` — **`mis`** (PRD §7.9.1 GET, §7.9.2 POST, §7.9.3 GET prefill). Wrap the submit in `<ExecutionPanel>` (no jobPoll this time). Strict `raw_data` keys per §7.9.2 — reject any key not in the allowlist before submit. 409 on `mis_already_submitted` opens an override dialog. Smoke checks for the just-shipped pitch feature:
- (a) Sign in as startup_funded `+911234567894`, navigate to `/pitch` → Profile tab default, prefilled with Acme. Edit and Save → toast "Profile saved" + cache refetch.
- (b) Sign in as a fresh startup with no profile (use MSW `setMswProfileScenario('missing')` in dev tooling) → empty Create form, only Profile tab visible.
- (c) Click Deck tab → paste any URL → submit. Polling banner appears; ~6s later (2 polls × 3s) AI evaluation card appears with green "Strong signal" badge + strengths/concerns bullets.
- (d) Force a failure via debug tooling (or temp `setMswDeckOutcome('failure')`) → "Evaluation failed" block with Retry; click Retry → the form re-enables for resubmit.
- (e) Confirm the AI Evaluation tab now appears in the tab bar after the first SUCCESS, and re-renders the latest eval block when clicked.

### Open blockers

_(none)_

### Files touched this session

- **ExecutionPanel jobPoll wiring (cross-cutting):**
  - `src/components/execution-panel/ExecutionPanel.tsx` — full polling state machine.
  - `src/components/execution-panel/types.ts` — `<TInput, TOutput, TAck = TOutput>` split + `onJobAccepted` prop.
  - `src/components/execution-panel/ExecutionPanel.jobpoll.test.tsx` (new — 3 cases).
  - `src/lib/debug/use-job-registry.ts` (new — `localStorage['oc.debug.jobs']`, FIFO cap 100).
- **Pitch feature (new):**
  - `src/features/pitch/{schemas.ts, index.ts}`.
  - `src/features/pitch/lib/stage-label.ts` (new — `stageLabel` + `formatCrore`).
  - `src/features/pitch/hooks/{use-startup-profile,use-upsert-startup-profile,use-submit-deck,use-deck-job-status}.ts` (+ matching `.test.ts` files).
  - `src/features/pitch/components/{StartupProfileForm,DeckUploadPanel,AIEvaluationCard}.tsx`.
  - `src/features/pitch/routes/{PitchPage.tsx, PitchPage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `getStartupProfile`, `postStartupProfile`, `postDeck`, `getDeckJob`.
  - `src/api/query-keys.ts` — added `qk.pitch.deckJobAll` (broad-prefix invalidation).
  - `src/app/router.tsx` — `/pitch` lazy-imported under startup-roles `<RoleGuard>`.
- **MSW + tests:**
  - `src/test/msw-fixtures/pitch-handlers.ts` (new — canonical owner with per-job counter map).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`pitch` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 118/118 tests across 34 files.

### Last updated

2026-04-25T18:05:00+05:30
