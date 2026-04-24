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

_(none — pre-scaffold)_

### Last completed action

_(none yet — repo just bootstrapped from templates)_

### Next concrete step

Begin **Stage 0 — upfront interview** per the human's instructions in `docs/plan.md`. Read `CLAUDE.md` and `docs/frontend_prd.md` fully, then compile every unknown into `.claude/decisions.md § Pending` as P-1, P-2, …

### Open blockers

_(none — Stage 0 has not run yet)_

### Files touched this session

_(none)_

### Tests green?

_(not yet applicable — no code exists)_

### Last updated

_(replace on first session end with actual ISO timestamp, e.g. `2026-04-24T11:30:00+05:30`)_

---

## Example — what this looks like mid-build

<!--
### Current feature
feature-search

### Last completed action
Implemented `useSearch` hook with 400ms debounce + MSW handler for POST /search covering
startup-results and empty-results fixtures. Unit tests pass.

### Next concrete step
Wire `useSearch` into `SearchPage.tsx`; build `<FilterChips>` component with URL-backed state
(sector, stage, geography); add infinite-scroll via `next_cursor`.

### Open blockers
- [P-7] Partner role UX — should the "Request Connect" button be hidden or disabled?
  (Non-blocking; I've hidden it for now per PRD §7.4.1 note.)

### Files touched this session
- src/features/search/schemas.ts (new)
- src/features/search/hooks/use-search.ts (new)
- src/api/endpoints.ts (added `search()` function)
- src/api/query-keys.ts (added `qk.search.*`)
- src/test/msw-handlers.ts (added POST /search handler)
- src/test/msw-fixtures/search-startup-results.json (new)
- src/features/search/hooks/use-search.test.ts (new)

### Tests green?
Yes. `pnpm lint && typecheck && test --run && build` all exit 0.

### Last updated
2026-04-25T14:47:00+05:30
-->
