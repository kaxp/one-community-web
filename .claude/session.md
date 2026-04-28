# `.claude/session.md`

> **Session continuity file.** Claude overwrites this at the END of every session; reads it at the START of the next.

---

## Current state

### Current feature

`playwright-smoke` (Stage 5.5) — complete. **All 4 critical-flow e2e specs pass locally.** Box ticked in `queue.md`. **Build complete — ready for production review.**

### Last completed action

**Stage 5.5 Playwright e2e smoke** — covers the four canonical user flows the queue.md spec calls for. Runs against the Vite dev server (which boots MSW in-browser per `.env.development`'s `VITE_MSW_ENABLED=true`); no separate backend process needed.

**What shipped:**

- **`@playwright/test@1.59.1`** added to devDependencies (+ chromium-headless-shell installed via `pnpm exec playwright install --with-deps chromium`).

- **`playwright.config.ts`** — runs serial (`workers: 1`) so MSW state stays deterministic per spec. `webServer` boots `pnpm dev` and waits for `http://localhost:5173`. `reuseExistingServer: !CI` so local re-runs are fast.

- **`e2e/_helpers.ts`** — three helpers + a typed `SEED_USERS` literal (mirrors `src/lib/dev-seed-users.ts` with no src/ imports):
  - **`signin(page, role)`** — drives the real two-step OTP flow. Important nuance: SignInPage auto-submits the verify mutation as soon as `otp.length === 6`, so the helper fills 6 cells and waits for `**/dashboard`; an explicit "Verify & continue" click would race the navigation away.
  - **`seedAuth(page, role)`** — direct `localStorage['oc.auth']` mutation for fast cross-user switches inside a single spec (mirrors zustand persist v1 shape + `mintMswToken` base64url(phone) pattern).
  - **`attachConsoleErrorCollector(page)`** — collects console.error + pageerror, ignores Vite/React DevTools dev noise.

- **Four specs in `e2e/`:**
  - **`auth-and-search.spec.ts`** — LP signs in → /dashboard → click "Search" sidebar link → fill query "fintech" → assert `[data-testid="search-results"]` + ≥ 1 `[data-testid^="result-card-"]` + zero console errors.
  - **`connection-flow.spec.ts`** — LP signs in → /search → navigates to `/profile/<NeoLedger-user_id>` (the result cards aren't navigation links; profile page is the canonical request surface) → "Request to connect" → submit message → toast → /connections/pending heading visible → `seedAuth` admin → /admin/connections → "pending_admin" tab → click first Approve → row count drops. **Picks NeoLedger (`...0002`) explicitly** because it's the only fintech catalogue entry NOT already in `SEED_ACCEPTED` / `SEED_PENDING`; otherwise the profile page hides the Request button on `viewer_interaction.has_connected || has_requested`.
  - **`pitch-deck.spec.ts`** — startup_funded signs in → /pitch → fills the financial-metrics fields (the seed pitch fixture lacks `revenue_monthly` / `burn_monthly` / `runway_months` so RHF would otherwise produce NaN and fail Zod) → Save Changes → "Profile saved" toast → switch to Deck tab → submit Drive URL → polling indicator surfaces → `[data-testid="ai-signal-strong"]` after 2 polls × 3 s. `test.setTimeout(60_000)` accommodates the poll bound.
  - **`admin-respond.spec.ts`** — LP signs in → /connections/pending?direction=incoming → click Accept on Priya's seed row → poll Priya's name out of the list → SPA-navigate via Sidebar "Connections" link → click Priya's name (a `<Link>` to `/profile/<id>`) → assert `unlocked@example.com` is visible (the `<ContactCard>` only renders when `profile.contact !== null`, which is gated on `has_connected`). **Critical:** the spec uses SPA navigation (sidebar link + name link) instead of `page.goto` because `page.goto` triggers a full page reload, which re-runs `main.tsx`, which re-imports `connections-handlers.ts`, which calls `resetMswConnectionsState()` and wipes the just-accepted state.

- **`package.json`** — added `e2e` and `e2e:ui` scripts.

- **`vite.config.ts`** — `test.exclude` now includes `e2e/**` so vitest doesn't try to import Playwright specs (they would crash because `@playwright/test`'s `test`/`expect` aren't compatible with vitest).

- **`.github/workflows/ci.yml`** — added two steps after Build: `Install Playwright browsers` + `E2E (playwright)` with `pnpm e2e`. Both steps gated on `!startsWith(github.ref, 'refs/heads/feature/long-')` so long-lived feature branches can skip. On failure, the playwright HTML report uploads as an artifact.

**Iteration notes (kept for context):** the first two test runs failed in instructive ways:
1. `page.keyboard.insertText('000000')` didn't trigger React's onChange — switched to `otpCells.nth(i).fill('0')` per cell.
2. The OTP component auto-submits at length 6, so any post-fill `verify.click()` raced a successful navigation away.
3. Toast assertions are flaky (sonner auto-dismisses in ~3 s); switched to row-count polling as the canonical post-mutation signal.
4. `page.goto` resets MSW state — the `admin-respond` spec was rewritten to use SPA navigation throughout.

**Gates green:**
- `pnpm lint` — 0/0
- `pnpm typecheck` — 0
- `pnpm test` — 89 test files / 348 tests, all passing (after `vite.config.ts test.exclude` added `e2e/**`)
- `pnpm build` — clean; main 295.68 KB gzip, MISPage 7.13 KB gzip, CartesianChart (lazy) 101.15 KB gzip
- `pnpm e2e` — **4/4 specs pass in ~34 s on a warm dev server** (15 s on a cold one)

### Next concrete step

**Build complete — ready for production review.** All Stage 5 gates ticked in `queue.md`:
- `qa-report` ✅, `qa-fixes` ✅, `a11y-audit` ✅, `bundle-size` ✅, `playwright-smoke` ✅.

Per queue.md: "Gate after Stage 5: tag `v1.0` and push." That's a human action — no further code work scheduled.

### Open blockers

_(none. The watchpoints from prior sessions remain open as long-term polish: I-6 main-bundle headroom; I-2/I-12/I-14 deferred per Stage 5.2.)_

### Files touched this session

- `playwright.config.ts` (new).
- `e2e/_helpers.ts` (new).
- `e2e/auth-and-search.spec.ts` (new).
- `e2e/connection-flow.spec.ts` (new).
- `e2e/pitch-deck.spec.ts` (new).
- `e2e/admin-respond.spec.ts` (new).
- `package.json` — added `e2e` + `e2e:ui` scripts; `@playwright/test` in devDependencies.
- `pnpm-lock.yaml` — Playwright + browsers binaries pinned.
- `vite.config.ts` — `test.exclude` adds `e2e/**`.
- `.github/workflows/ci.yml` — adds Install Playwright + E2E + report upload.
- `.claude/queue.md` — ticked `playwright-smoke`.
- `.claude/session.md` — overwritten (this file).

### Tests green?

Yes. **Lint 0/0 · Typecheck 0 · Unit 348/348 · Build clean · E2E 4/4.**

### Last updated

2026-04-28T11:00:00+05:30
