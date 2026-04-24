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

_(none — Stage 1 scaffold complete, awaiting human review before Stage 2a auth)_

### Last completed action

Completed **Stage 1 — Scaffold**. All three queue.md Stage 1 rows ticked: `chassis`, `brand tokens wired`, `stub routes`. Vite + React 18 + strict TypeScript project bootstrapped with the exact dep set from PRD §6.1 (TanStack Query v5, Zustand 4, RHF 7 + Zod 3, axios 1, Tailwind 3 + shadcn primitives, lucide-react, date-fns, sonner, react-dropzone, MSW v2, Vitest + RTL + happy-dom, husky + lint-staged). Folder tree matches PRD §6.2 exactly. Core primitives live: `apiClient` (envelope interceptor + 401 → auth clear), `authStore` (`oc.auth` persisted Zustand, schema v1, `expiresAt`-gated `isAuthenticated`), `RequireAuth`, `RoleGuard`, `AppShell`, `Sidebar` (role-filtered via `navForRole` + `NAV_ITEMS`), `TopBar` (wordmark per P-2, logo+glyph fallback), `ExecutionPanel` + `ExecutionDialog` + `InlineExecutionButton` (state machine per PRD §6.7), `ErrorState` (with SUPPORT_EMAIL + WhatsApp per P-15), `EmptyState`, `SkeletonRow`, `PhoneInput`, `OTPInput`, `FileDropzone`, `BrandLogo`, `RoleBadge`, `Toaster`. Router seeded with `/`, `/signin`, `/dashboard`, `/expired`, `/unauthorized`, `/not-found`, plus Phase-4 `/documents` + `/digest` Coming-Soon placeholders (§13 G3 / §10.5). Debug dock at `src/lib/debug/debug-dock.tsx`, lazy-loaded, tree-shaken from prod. MSW wired (`msw-browser.ts`, `msw-node.ts`, empty `handlers` stub, service worker copied to `public/mockServiceWorker.js`). Husky `pre-commit` hook runs `lint-staged`. Brand tokens (Warmup blue `#1F73B7`, Inter font, shadcn CSS vars) wired into `tailwind.config.ts`, `globals.css`, `index.html`. Brand assets downloaded once into `public/brand/logo.png` + `public/favicon.png` per P-13 / P-14.

Four gates on a clean run: `pnpm lint` (0 errors, 4 non-blocking react-refresh cosmetic warnings), `pnpm typecheck` (0), `pnpm test` (13/13 tests passing across 4 files — api/errors, lib/phone, lib/role-capabilities, app/routes/DashboardPage), `pnpm build` (exits 0; main chunk 239.86 KB gzip). CI workflow (`.github/workflows/ci.yml`) updated to use `pnpm test` (non-watch).

### Next concrete step

Wait for the human's Stage 1 review (plan.md lists the checklist — read every file, confirm router tree matches PRD §10.4, confirm `authStore` persistence, confirm `apiClient` interceptors, confirm `CAPABILITIES` + `NAV_ITEMS`). If the human tags `v0.1-scaffold`, proceed to **Stage 2a — Auth flow** (queue.md Stage 2) using the prompt in `docs/plan.md § Stage 2a`. The next unchecked queue row is `auth` (POST /auth/otp/send, /verify, GET /auth/me, /signin, /onboarding/profile, /onboarding/lp-profile).

### Open blockers

_(none — all Stage 0 pending items resolved, no new blockers from Stage 1)_

### Files touched this session

- Root configs: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.cjs`, `.eslintrc.cjs`, `.eslintignore`, `index.html`
- `src/main.tsx`, `src/vite-env.d.ts`, `src/styles/globals.css`
- `src/app/` — `App.tsx`, `providers.tsx`, `error-boundary.tsx`, `router.tsx`, and route components (`HomePage`, `SignInPage`, `DashboardPage`, `ExpiredPage`, `UnauthorizedPage`, `NotFoundPage`, `ComingSoonPage`, `AdminHomePlaceholder`)
- `src/api/` — `client.ts`, `errors.ts`, `endpoints.ts`, `query-keys.ts` + `errors.test.ts`
- `src/auth/` — `auth-store.ts`, `use-auth.ts`, `role-guard.tsx`, `require-auth.tsx`, `otp-service.ts`
- `src/components/` — `ui/` shadcn primitives (button, input, label, card, badge, skeleton, separator, dialog), `layout/` (AppShell, TopBar, Sidebar), `execution-panel/` (ExecutionPanel, ExecutionDialog, InlineExecutionButton, types, index), `forms/` (FormField, PhoneInput, OTPInput, FileDropzone), `brand/BrandLogo.tsx`, `empty-state/EmptyState.tsx`, `error-state/ErrorState.tsx`, `loading/SkeletonRow.tsx`, `role-badge.tsx`, `toaster.tsx`, plus `data-table/` and `pagination/` placeholder folders
- `src/lib/` — `env.ts`, `cn.ts`, `phone.ts` + test, `date.ts`, `zod-helpers.ts`, `role-capabilities.ts` + test, `role-colours.ts`, `dev-seed-users.ts`, `support-contacts.ts`, `error-reporter.ts`, `debug/debug-dock.tsx`
- `src/types/` — `enums.ts`, `api.ts`, `domain.ts`
- `src/features/` — 14 feature folders (`search`, `connections`, `pitch`, `onboarding`, `mis`, `schedule`, `travel`, `matchmaking`, `digest`, `analytics`, `profile`, `interactions`, `enrichment`, `admin`), each with `components/`, `hooks/`, `routes/`, `schemas.ts`, `index.ts`
- `src/test/` — `setup.ts`, `msw-browser.ts`, `msw-node.ts`, `msw-handlers.ts`, `test-utils.tsx`
- `.husky/pre-commit`
- `public/mockServiceWorker.js`, `public/brand/logo.png`, `public/favicon.png`
- `.github/workflows/ci.yml` (changed `pnpm test --run` → `pnpm test`)
- `.claude/queue.md` (ticked all Stage 1 rows), `.claude/session.md` (this file)

### Tests green?

Yes. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0. 13/13 tests. Bundle 239.86 KB gzip main chunk.

### Last updated

2026-04-24T20:00:00+05:30

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
