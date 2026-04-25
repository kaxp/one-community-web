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

_(none — Stage 3 fifth feature `schedule` complete. Next unchecked queue.md row is `travel`.)_

### Last completed action

Completed Stage 3 fifth feature **schedule** end-to-end. All four PRD endpoints (§7.10.1 GET slots / §7.10.2 POST book / §7.10.3 GET bookings / §7.10.4 DELETE cancel) ship behind a single `/schedule` route open to all 10 authenticated roles.

- **date-fns-tz installed** (3.2.0). v3 renamed `utcToZonedTime → toZonedTime` and `zonedTimeToUtc → fromZonedTime`; the PRD references the v2 names but the v3 names are equivalent.
- **Schedule schemas** (`src/features/schedule/schemas.ts`):
  - `zSlot` (§7.10.1) — IST `start`/`end` ISO-8601 with TZ offset + `date` `YYYY-MM-DD`. Empty array is a valid response.
  - `zBooking` + `zBookingsResponse` (§7.10.3) — cursor-paginated, `direction: outgoing|incoming`, `status: pending|confirmed|cancelled`, counterpart with role/org.
  - `zBookRequest` (§7.10.2) — `target_id`, `scheduled_at`, `duration_minutes` strict 30 or 60 via `.refine`, `purpose ≤ 500`.
  - `zBookForm` — RHF input shape; empty-string `purpose` collapses to `undefined` so the wire body simply omits it (no clear-field semantics).
  - `zCancelResponse` (§7.10.4).
- **Endpoint functions** (`src/api/endpoints.ts`): `getScheduleSlots`, `postScheduleBook`, `getScheduleBookings`, `deleteScheduleBooking`. All Zod-parsed via `unwrap()`. Note slots returns `data: Slot[]` directly (array IS payload, not wrapped in `{ items }`).
- **Query keys** (`src/api/query-keys.ts`): `qk.meetings.{all, slotsAll, slots(fromDate, days), bookingsAll, bookings(limit)}`. The `*All` aliases let mutations invalidate every variant in one call.
- **Hooks** (`src/features/schedule/hooks/`):
  - `useSlots({ fromDate, days })` — useQuery, 30s staleTime.
  - `useBookings({ limit })` — useInfiniteQuery, cursor pagination.
  - `useBookMeeting()` — useMutation; on success invalidates `slotsAll` + `bookingsAll`. On 409 conflict ALSO invalidates slots so the grid greys out the now-taken slot.
  - `useCancelBooking()` — useMutation; uses `onSettled` (NOT `onSuccess`) to ALWAYS refetch bookings + slots. PRD §13 G9 — GCal delete is best-effort, so we trust the server's view over any local optimistic state.
- **Route** (`src/app/router.tsx`): `/schedule` mounted under `<RequireAuth>` + `<ProfileGate>` + `<AppShell>` with no extra `<RoleGuard>` (all 10 roles authorised — matches `NAV_ITEMS.schedule.roles = ['*']`). Lazy-imported per [P-19].
- **Page** (`src/features/schedule/routes/SchedulePage.tsx`): top half = available-slots calendar grid; bottom half = upcoming meetings table. URL params drive windowing — `?from_date=YYYY-MM-DD&days=1..30` (clamped). Today's date is the default; days defaults to 7. "Try 30 days" CTA flips the days param to 30 from both the form-bar and the empty-state.
- **Components** (`src/features/schedule/components/`):
  - `SlotGrid.tsx` — rows = N consecutive viewer-local dates, columns = the 30-min time buckets that have any slot in the response. Cells are green button when available, grey when not. The grid renders in the viewer's local timezone (PRD §8.12.2) via `Intl.DateTimeFormat().resolvedOptions().timeZone` resolved once.
  - `BookingDialog.tsx` — opens on slot click. Target picker reads from the user's accepted connections (`useConnections`) with a name/org filter; on submit calls `useBookMeeting`. 409 → toast "That slot just filled up — pick another" + close. 404 → toast "User not found".
  - `BookingsList.tsx` — DataTable with columns When (viewer-local) / Duration / Counterpart + RoleBadge / Direction (Organising/Invited) / Status / Cancel. Cancelled rows show an em-dash in the actions column. Cancel button opens `<CancelDialog>` confirm with the warning copy "If your Google Calendar still shows the event, delete it manually" per the prompt's gotcha. 403 → toast "Only the organiser, target, or admin can cancel".
- **Format helpers** (`src/features/schedule/lib/format-tz.ts`): `viewerTimeZone()`, `fmtSlotTime`, `fmtSlotDate`, `fmtBookingDateTime`. All use `toZonedTime` from `date-fns-tz` v3.
- **MSW** (`src/test/msw-fixtures/schedule-handlers.ts`): canonical owner of all four schedule routes. Stateful — booking removes the matched slot from the in-memory pool so a re-attempt on the same slot deterministically surfaces 409. Helpers: `setMswSlotsFixture`, `setMswBookingsFixture`, `queueSlotsError`, `queueBookError`, `queueBookingsError`, `queueCancelError`. Reset hook registered in `src/test/setup.ts` afterEach.
- **Tests (+15 cases vs prior commit, total 162 across 45 files):**
  - `schemas.test.ts` (7): zSlot accepts IST + rejects no-TZ + accepts empty array; zBookRequest accepts 30 + 60 / rejects 45 / rejects 600-char purpose; zBookForm coerces empty-string purpose to undefined.
  - `use-slots.test.ts` (3): seed list / empty array / 500 ApiError.
  - `use-bookings.test.ts` (2): seed page / 500 ApiError.
  - `use-book-meeting.test.tsx` (2): success → invalidates slotsAll + bookingsAll; 409 → still invalidates slotsAll (refresh path).
  - `use-cancel-booking.test.tsx` (2): success invalidates both / 403 still invalidates bookings (reconcile from server).
  - `SchedulePage.test.tsx` (4): grid + bookings render / empty-slots state with Try 30 days CTA / 500 surfaces ErrorState / clicking a slot opens the booking dialog.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (162/162 across 45 files), `pnpm build` (exits 0). Per-feature chunk: SchedulePage **20.80 KB / 7.05 KB gzip** — comfortably under the 30 KB-per-feature budget. Main chunk: 289.06 → 289.59 KB gzip (+0.53 KB).

### Next concrete step

Next unchecked queue.md row is **`travel`** (PRD §7.11.1 POST /travel/plans, §7.11.2 GET, §7.11.3 DELETE, §7.11.4 PUT /travel/home-city). Date-range form + plan list + home-city setting.

Smoke checks for the just-shipped Schedule feature (manual):
- (a) Sign in as `+911234567892` (LP) → sidebar shows "Schedule" → click `/schedule` → grid renders the next 7 days with green tiles in IST-derived buckets, displayed in the viewer's local TZ.
- (b) Click a green tile → BookingDialog opens with the slot's date/time in the header, target list shows the user's accepted connections, duration radio defaults to 30 min, purpose is blank.
- (c) Pick a target + Confirm booking → toast "Booked for {datetime}" → bookings table refreshes with the new row → the grid no longer offers the booked slot.
- (d) Click that booked slot's `start` again (test path: book the same scheduled_at twice with a different target) → 409 toast "That slot just filled up — pick another" + grid refreshes.
- (e) Click Cancel on a booking row → CancelDialog opens with the GCal warning → confirm → toast "Cancelled" → bookings list flips status to `cancelled` and removes the Cancel button.
- (f) URL param sanity: visit `/schedule?from_date=2026-04-30&days=14` → grid window shifts to that range. `?days=99` clamps to 30.
- (g) Sign in as a non-LP role (e.g. `+911234567894` startup_funded) → `/schedule` still loads (all-roles route).

### Open blockers

_(none)_

### Files touched this session

- **Schedule feature (new):**
  - `src/features/schedule/{schemas.ts, schemas.test.ts, index.ts}`.
  - `src/features/schedule/lib/format-tz.ts` (new — viewer-TZ helpers wrapping date-fns-tz).
  - `src/features/schedule/hooks/{use-slots, use-bookings, use-book-meeting, use-cancel-booking}.{ts,tsx}` + matching `.test.{ts,tsx}` files.
  - `src/features/schedule/components/{SlotGrid, BookingDialog, BookingsList}.tsx`.
  - `src/features/schedule/routes/{SchedulePage.tsx, SchedulePage.test.tsx}`.
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `getScheduleSlots`, `postScheduleBook`, `getScheduleBookings`, `deleteScheduleBooking`.
  - `src/api/query-keys.ts` — added `qk.meetings.{all, slots, slotsAll, bookings, bookingsAll}`.
  - `src/app/router.tsx` — `/schedule` lazy-imported under `<AppShell>` (no extra `<RoleGuard>`).
  - `package.json` — added `date-fns-tz@^3.2.0`.
- **MSW + tests:**
  - `src/test/msw-fixtures/schedule-handlers.ts` (new — stateful 409 reproduction).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`schedule` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 162/162 tests across 45 files (was 141/141 across 39 files — +21 new tests, +6 new test files: schemas, four hooks, one page).

### Last updated

2026-04-25T19:20:00+05:30
