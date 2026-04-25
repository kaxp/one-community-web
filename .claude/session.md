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

_(none — Stage 3 ninth and final feature `onboarding-add-user` complete. **Stage 3 is DONE.** Please run the final Stage 3 gate, tag `v0.3-user-features`, then proceed to Stage 4.1 (admin home + digest + matchmaking ops).)_

### Last completed action

Completed Stage 3 ninth feature **onboarding-add-user** end-to-end. Both PRD endpoints (§7.2.1 POST /onboarding/card-scan + §7.2.2 GET /onboarding/card-scan/{scan_id}) ship behind `/add-user` for `lp`, `potential_lp`, `vc`, `admin`, `super_admin` (matches `CAPABILITIES.card_scan.use`). Client-side OCR via tesseract.js per §13 G2; duplicate-contact modal on 409 with admin-only "Open existing user" CTA.

- **tesseract.js installed** (`pnpm add tesseract.js@^7.0.0`).
- **OCR interim** (`src/api/interim/ocr-client.ts`): `OCRServiceInterim.recognize({ blob, onProgress }) → { raw_text, confidence }`. tesseract.js is **dynamically imported inside `recognize()`** so the 14.93 KB JS chunk lives in its own split bundle rather than the main bundle (saved ~6 KB gzip on `index-*.js`).
- **Card-scan schemas** (`src/features/onboarding/schemas.ts`):
  - `zCardScanRequest` — `raw_text >= 10 chars` (initial parse) + optional `parsed` + `category` (final confirm). Backend distinguishes phases by body shape per §7.2.1.
  - `zCardScanParsed` — every field nullable (GPT-4o may fail to extract any).
  - `zCardScanResponse` — `scan_id`, `parsed`, `user_created`, `user_id?`.
  - `zCardScanRecord` (§7.2.2 GET response) — adds `image_url`, `ocr_raw`, `extracted_data`, `status: pending|processed|failed`, `created_at`.
  - `zScanCategory` — `lp | potential_lp | vc | startup | partner` (radio options).
  - `zContactReviewForm` — RHF form schema. **Optional fields use flat `z.string()` + `.refine(v === '' || regex)` rather than `.transform()` unions** to avoid RHF widening `errors.<field>?.message` to `string | FieldError | Merge<...>`. The submit handler runs `emptyToNull` to strip blank optionals before sending. Also enforces phone normalisation to E.164 via `toE164()` per §8.12.1.
- **Endpoint functions** (`src/api/endpoints.ts`):
  - `postCardScan(body)` — Zod-parsed `CardScanResponse`. Strips `undefined` keys.
  - `getCardScan(scanId)` — Zod-parsed `CardScanRecord`.
  - `runOCR({ blob, onProgress })` — **branches on `env.OCR_SERVER_ENABLED`**: when `true`, POSTs `multipart/form-data` to `/ocr`; when `false`, delegates to `OCRServiceInterim`. The hook surface (`useOCR`) is identical regardless.
- **Query keys**: `qk.onboarding.cardScan(scanId)` + `qk.onboarding.cardScanAll`.
- **Hooks** (`src/features/onboarding/hooks/`):
  - `useCardScan()` — `useMutation`. On success, invalidates `qk.onboarding.cardScan(scan_id)` so a follow-up §7.2.2 GET reads fresh.
  - `useGetCardScan(scanId | undefined)` — `useQuery`, gated by `enabled: !!scanId` so it's a no-op on the upload step. 60s staleTime.
  - `useOCR()` — bespoke (not `useMutation`) because the progress stream needs synchronous state updates per Tesseract tick. Returns `{ isRunning, progress, status, result, error, recognize, reset }`. Catches and converts thrown errors into `ApiError` with `code: 'ocr_failed'`.
- **Route** (`src/app/router.tsx`): `/add-user` lazy-imported under `<RoleGuard roles={['lp','potential_lp','vc','admin','super_admin']} />`. Lazy-imported per [P-19].
- **Page** (`src/features/onboarding/routes/AddUserPage.tsx`): three-step state machine — `upload` → `parsing` → `review`.
  - Upload step: `<FileDropzone>` (jpeg/png/heic) + `<textarea>` paste fallback. Drop runs `useOCR().recognize()`; the page surfaces a progress indicator with the % from Tesseract.
  - On OCR complete or paste-then-Parse, automatically POSTs `{raw_text}` to `/onboarding/card-scan` (initial parse phase) → enters review step.
  - Review form prefills from `parsed.*`; renders `<FieldFlag>` chips for missing required fields (red, "Missing — required") and null parsed fields (amber, "Low confidence"). Five-option category radio (LP / Potential LP / VC / Startup / Partner).
  - Submit POSTs `{raw_text, parsed, category}` (confirm phase). 200 with `user_created=true` toasts "Contact added — user created."; `user_created=false` toasts "Contact saved — admin will follow up to provision the account."; 409 `duplicate_contact` opens `<DuplicateContactDialog>`.
- **Components** (`src/features/onboarding/components/DuplicateContactDialog.tsx`): admin-only "Open existing user" CTA navigates to `/profile/{existing_user_id}`. Non-admins see only "Cancel". TODO marker references the missing admin endpoint for in-place updates of someone else's profile (PRD §7.2.3 PATCH only updates the caller's own profile, so updating someone else's record is admin-DB territory until a dedicated endpoint ships).
- **MSW** (`src/test/msw-fixtures/onboarding-handlers.ts`): canonical owner of `/onboarding/card-scan` (POST + GET) plus an `/ocr` stub for the flag-flip path. Stateful — each POST stashes the record by `scan_id` so a follow-up GET reads it back. Helpers: `setMswCardScanParsed`, `setMswCardScanCreatesUser`, `queueCardScanParseError`, `queueCardScanConfirmError`, `queueCardScanGetError`, `queueOcrError`, `setMswOcrPayload`, `getMswCardScanRecords`. Reset hook registered in `src/test/setup.ts` afterEach.
- **Tests (+26 cases vs prior commit, total 249 across 64 files):**
  - `schemas.test.ts` (9): rejects short raw_text / accepts initial parse / accepts confirm body / response with user_created / all-null parsed / unknown category rejected / form requires name+phone / form accepts blank optionals / form rejects bad email+url.
  - `use-card-scan.test.tsx` (4 + 2 useGetCardScan): parse path / confirm creates user / confirm without user creation / 409 duplicate detail; useGetCardScan no-op when undefined / fetches a previously-created record.
  - `use-ocr.test.tsx` (2): client-side path success with progress + final result / thrown error → ApiError(`ocr_failed`).
  - `run-ocr.test.ts` (2): flag OFF uses `OCRServiceInterim` / flag ON POSTs multipart to `/ocr`.
  - `AddUserPage.test.tsx` (7): renders dropzone + textarea / paste flow → review prefilled / red+amber field flags / submit success (user_created=true) / submit success (user_created=false admin-followup copy) / 409 duplicate as admin shows CTA + navigates / 409 duplicate as LP hides CTA.

Four gates clean: `pnpm lint` (0 errors, 4 pre-existing cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (249/249 across 64 files), `pnpm build` (exits 0). Per-feature chunk: AddUserPage **71.34 KB / 20.57 KB gzip**; tesseract.js dynamic-import chunk **14.93 KB / 6.43 KB gzip**. Main chunk 290.42 → 291.34 KB gzip (+0.92 KB; would have been +6.99 KB without the dynamic import).

### Next concrete step

**Stage 3 is COMPLETE.** All 9 user-facing features are merged. Per `queue.md` Stage 3 footer: "Gate after Stage 3 (user features done): tag `v0.3-user-features`."

Wait for the human to:
1. Run the final Stage 3 review (every box in §10 DoD against each shipped feature).
2. Tag the repo `v0.3-user-features`.
3. Authorise Stage 4.1 (Session 4.1 — Admin home + digest + matchmaking ops).

Once authorised, the next unchecked queue.md row is **`admin-home`** (PRD §7.12.1 GET /admin/summary — KPI cards + recent actions feed). Stage 4 features are batched into 3 sessions per `queue.md`; session 4.1 covers `admin-home` + `admin-digest` + `admin-matchmaking-ops`.

Smoke checks for the just-shipped onboarding-add-user feature (manual):
- (a) Sign in as `+911234567892` (LP) → sidebar "Add contact" → `/add-user` → page renders dropzone + paste textarea.
- (b) Drop a real card image into the dropzone → progress indicator ticks 0% → 100% over 2–6s → page transitions to review step with parsed values prefilled. Network tab shows tesseract.js chunk fetched on demand.
- (c) Or paste the seed text "Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com" + click "Parse text" → review form prefills with name="Kapil Sahu", phone="+919876543210", etc.
- (d) Edit fields, pick a category radio, click "Save contact" → toast "Contact added — user created." → page resets to upload step.
- (e) Try the same card again → 409 → modal opens. As LP: only "Cancel". Sign in as admin (`+911234567890`) and retry → "Open existing user" button navigates to `/profile/{user_id}`.
- (f) Flag flip: set `VITE_OCR_SERVER_ENABLED=true` in `.env.development` and restart dev → drop image → network tab shows POST to `/api/v1/ocr` (multipart) instead of fetching tesseract.js. Same downstream UX.

### Open blockers

_(none)_

### Files touched this session

- **onboarding-add-user (new):**
  - `src/features/onboarding/schemas.ts` (extended — added card-scan + contact-review schemas).
  - `src/features/onboarding/schemas.test.ts` (new — 9 cases).
  - `src/features/onboarding/components/DuplicateContactDialog.tsx`.
  - `src/features/onboarding/hooks/use-card-scan.ts` + `use-get-card-scan.ts` + `use-ocr.ts`, plus matching `use-card-scan.test.tsx` + `use-ocr.test.tsx`.
  - `src/features/onboarding/routes/AddUserPage.tsx` + `AddUserPage.test.tsx`.
- **OCR interim:**
  - `src/api/interim/ocr-client.ts` (new — dynamic-import tesseract.js).
  - `src/api/run-ocr.test.ts` (new — flag-flip branch coverage).
- **Cross-cutting:**
  - `src/api/endpoints.ts` — added `postCardScan`, `getCardScan`, `runOCR`.
  - `src/api/query-keys.ts` — added `qk.onboarding.cardScan(scanId)` + `qk.onboarding.cardScanAll`.
  - `src/app/router.tsx` — `/add-user` lazy-imported with `<RoleGuard>`.
  - `package.json` — added `tesseract.js@^7.0.0`.
- **MSW + tests:**
  - `src/test/msw-fixtures/onboarding-handlers.ts` (new — POST + GET + /ocr stub).
  - `src/test/{msw-handlers.ts, setup.ts}` — registered + wired reset.
- **Coordination:** `.claude/queue.md` (`onboarding-add-user` row ticked), `.claude/session.md` (this file).

### Tests green?

Yes. All four gates exit 0. 249/249 tests across 64 files (was 223/223 across 59 files — +26 new tests, +5 new test files: schemas, two hooks, run-ocr branch, page).

### Last updated

2026-04-25T23:50:00+05:30
