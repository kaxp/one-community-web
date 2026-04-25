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

_(none — Stage 3 second feature `connections` complete; next unchecked queue.md row is `pitch`)_

### Last completed action

Completed Stage 3 second feature **connections** end-to-end. All four PRD endpoints (§7.6.1, §7.6.3, §7.6.4, §7.6.5) plus the §7.7.2 feedback flow ship behind two new routes plus the canonical "Request to connect" dialog reused by the Profile page and the partner-masked search footer.

- **Schemas** (`src/features/connections/schemas.ts`): full set — `zAcceptedConnection` / `zPendingConnection` (with discriminator `direction`) / `zConnectionRequestBody` (200-char `message`) / `zRespondBody` (`accept|decline`) / `zFeedbackBody` (`yes|no`) plus matching response schemas. Optional `intro_id` + `feedback_submitted` on the accepted shape so the §7.7.2 prompt can render off the same row.
- **Endpoint functions** (`src/api/endpoints.ts`): `requestConnection`, `respondToConnection`, `listConnections`, `listPendingConnections`, `submitFeedback` — all with Zod parse on the response and `stripUndefined` on the request payload.
- **Query keys** (`src/api/query-keys.ts`): `qk.connections.list(limit)` + `qk.connections.pending(limit)` reshaped to drop the cursor parameter (cursor flows via `useInfiniteQuery`'s `pageParam`); the broad-prefix `qk.connections.listAll` / `qk.connections.pendingAll` keys remain for invalidation. Existing `qk.connections.pending(50)` call sites in admin tests continue to work after the signature change (still takes `limit`).
- **Hooks** (`src/features/connections/hooks/`):
  - `useConnections({limit=50})` — `useInfiniteQuery` against `qk.connections.list(50)`.
  - `useConnectionsPending({limit=50})` — `useInfiniteQuery` against `qk.connections.pending(50)`. Direction filtering happens client-side per PRD §7.6.5 transformation note.
  - `useRespondToConnection()` — optimistic remove from `qk.connections.pending(50)`, rollback on error. On accept, also invalidates `qk.connections.listAll` + `qk.profile.byId(counterpart_id)` (PRD §7.6.3 transformation note + §8.12.4 row).
  - `useRequestConnection()` — invalidates `qk.connections.pendingAll` + `qk.profile.byId(target_id)` so the profile button flips to "Pending admin approval" (PRD §8.12.4).
  - `useFeedback()` — thin `useMutation` against `POST /interactions/feedback`. Hides the prompt on 200 / 409 / 404 (the 409 + 404 paths collapse silently so users aren't told their already-recorded feedback failed).
- **Routes** (`src/app/router.tsx`): `/connections` and `/connections/pending` mounted under `<RequireAuth><ProfileGate><AppShell>`. No `<RoleGuard>` wrapping — both routes are "any authenticated" per PRD §7.6.4 / §7.6.5. Both are `React.lazy`-imported at module scope per [P-19].
- **Pages**:
  - `routes/ConnectionsPage.tsx` — accepted list with skeleton / empty / error / success states. `<AcceptedConnectionCard>` renders counterpart link to `/profile/:id` + role badge + `<ContactStrip>` ONLY when `contact !== null` (never with a `?? '—'` placeholder for the whole block per the prompt's gotcha). The 48h `<FeedbackPrompt>` renders below the card when `intro_id` is present and `feedback_submitted !== true`.
  - `routes/PendingConnectionsPage.tsx` — two URL-tabs (`?direction=incoming|outgoing`). Incoming `pending_target` rows get `<InlineExecutionButton>` Accept/Decline (one mutation hook per row → per-row isPending + per-call toasts). Outgoing rows render a status pill (Awaiting admin / Awaiting target / Rejected / Declined) and **never** show Accept/Decline. Filter is client-side; both directions fetch from the same `useInfiniteQuery`.
- **Request-to-Connect dialog** (`components/RequestConnectDialog.tsx`): `<Dialog>` + RHF + Zod (200-char optional message). 200 → toast + close + invalidate. 409 → "already exists" toast + close. 404 → "user not found" toast + close. 422/other → inline `<ErrorState compact>`.
- **Dialog wiring**:
  - `src/features/profile/routes/ProfilePage.tsx` — Request-to-connect button now opens the dialog (replaces the previous Stage-2 toast-only stub).
  - `src/features/search/components/MaskedCardFooter.tsx` — partner-mask "Request to connect" button now opens the dialog (replaces the previous toast-only stub). `<ResultCard>` passes `targetName = company_name ?? name` (startup) / `fund_name ?? name` (LP) so the dialog shows the right counterpart name.
- **Components** (`src/features/connections/components/`):
  - `ContactStrip.tsx` — three chips (email / phone / linkedin) for accepted connections. Renders `null` when no contact channel is present so the card never shows an empty strip.
  - `FeedbackPrompt.tsx` — Yes/No prompt with internal `hidden` state; collapses on 200, 409, or 404.
  - `AcceptedConnectionCard.tsx` — accepted row + optional feedback prompt.
  - `PendingConnectionCard.tsx` — pending row with row-local `<Actions>` + `<StatusPill>` sub-components.
  - `RequestConnectDialog.tsx` — see above.
- **MSW** (`src/test/msw-fixtures/connections-handlers.ts`): canonical owner of `GET /connections`, `GET /connections/pending`, `POST /connections/request`, `PATCH /connections/:id/respond`, `POST /interactions/feedback`. Module-scoped fixture stores with helpers `setMswConnectionsRows`, `setMswPendingRows`, `queueRespondError`, `queueRequestError`, `queueFeedbackError`, `queueConnectionsListError`, `queuePendingListError`. Counter-based UUID generator avoids the malformed-UUID Zod-parse failures that an earlier draft hit. Profile-handlers no longer registers `GET /connections` / `GET /connections/pending`; `setMswProfileScenario` now seeds the connections-handlers store directly so the existing profile §13 G1 interim tests continue to pass with no test-file changes.
- **Test setup** (`src/test/setup.ts` + `src/test/msw-handlers.ts`): registered the new handlers (after admin, before profile so admin's more-specific `/connections/:id/admin` matches before `/connections/:id/respond`); reset wired into `afterEach`.
- **Tests** (+21 cases vs prior commit, total 103 across 28 files):
  - `useConnections` (2): success + 500 error.
  - `useConnectionsPending` (2): mixed direction + 500 error.
  - `useRespondToConnection` (4): accept invalidates the right keys; decline does NOT invalidate listAll/profile; optimistic remove from cached pending; rollback on 409.
  - `useRequestConnection` (2): success invalidates pendingAll + profile.byId; 409 surfaces ApiError.
  - `useFeedback` (2): records yes; 409 surfaces ApiError.
  - `ConnectionsPage` (4): renders seeded rows + email; empty state; ErrorState on 500; 48h feedback prompt visible when `intro_id` is set + `feedback_submitted=false`.
  - `PendingConnectionsPage` (5): default Incoming tab with Accept/Decline; switching to Outgoing hides Accept/Decline + shows status pill; Accept optimistically removes the row; 409 conflict surfaces a single toast; empty-state message when active direction has no rows.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (103/103), `pnpm build` (exits 0). Per-feature chunks: ConnectionsPage **1.95 KB gzip**, PendingConnectionsPage **2.31 KB gzip**, RequestConnectDialog **1.94 KB gzip**. Main chunk: 287.09 → 287.65 KB gzip (+0.56 KB — well under the 30 KB-per-feature budget).

### Next concrete step

Pick up the next unchecked feature in `queue.md § Stage 3` — **`pitch`** (PRD §7.3.1 GET / POST profile, §7.3.3 POST deck, §7.3.4 GET deck job poll). Use `<ExecutionPanel jobPoll={...}>` for the deck-eval flow per PRD §6.7. Smoke checks for the just-shipped connections feature:
- (a) Sign in as LP `+911234567892`, navigate to `/connections` — accepted Kapil row renders with email/phone/LinkedIn chips and the 48h feedback prompt.
- (b) Click Yes on the prompt → toast "Thanks for the feedback" + prompt collapses.
- (c) Navigate to `/connections/pending` — Incoming tab default, Priya Rao Accept/Decline visible. Click Accept → row vanishes optimistically, toast "Connection accepted — contact details unlocked", `/connections` refetch surfaces the new accepted row.
- (d) Switch to Outgoing tab via URL `?direction=outgoing` — Aryan Mehta + Rhea Iyer rows show status pills only (no Accept/Decline buttons; gotcha #3 from the prompt).
- (e) On `/profile/<startup-id>` (no_connection scenario), click Request to connect → modal opens, 200-char counter live; submit → admin-approval toast + dialog closes.
- (f) Sign in as partner `+911234567897`, run a search, click Request to connect on a result card → same dialog opens.

### Open blockers

_(none)_

### Files touched this session

- **Connections feature (new):**
  - `src/features/connections/{schemas.ts, index.ts}`.
  - `src/features/connections/hooks/{use-connections,use-connections-pending,use-respond-to-connection,use-request-connection,use-feedback}.ts` (+ matching `.test.{ts,tsx}` files).
  - `src/features/connections/components/{ContactStrip,FeedbackPrompt,AcceptedConnectionCard,PendingConnectionCard,RequestConnectDialog}.tsx`.
  - `src/features/connections/routes/{ConnectionsPage,PendingConnectionsPage}.{tsx,test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `requestConnection`, `respondToConnection`, `listConnections`, `listPendingConnections`, `submitFeedback`.
  - `src/api/query-keys.ts` — `qk.connections.list(limit)` and `qk.connections.pending(limit)` reshaped (cursor dropped from key; flows via pageParam).
  - `src/app/router.tsx` — `/connections` + `/connections/pending` lazy-imported routes.
- **Dialog wiring:**
  - `src/features/profile/routes/ProfilePage.tsx` — Request-to-connect button opens `<RequestConnectDialog>` (replaces prior toast stub).
  - `src/features/search/components/MaskedCardFooter.tsx` — partner-mask "Request to connect" opens `<RequestConnectDialog>` (replaces prior toast stub).
  - `src/features/search/components/ResultCard.tsx` — passes `targetName` to `<MaskedCardFooter>`.
- **MSW + tests:**
  - `src/test/msw-fixtures/connections-handlers.ts` (new — canonical owner).
  - `src/test/msw-fixtures/profile-handlers.ts` — removed `GET /connections` + `GET /connections/pending` handlers; `setMswProfileScenario` now delegates seeding into the connections-handlers store.
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`connections` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 103/103 tests across 28 files.

### Last updated

2026-04-25T17:05:00+05:30
