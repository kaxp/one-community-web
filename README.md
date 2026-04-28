# One Community — Web Client

Internal dashboard for Warmup Ventures connecting Startups, LPs, VCs, Partners, and Advisors. Role-based SPA built against the One Community FastAPI backend.

**Status:** active build (Stage 0 of `docs/plan.md`).
**Language:** TypeScript · **Framework:** React 18 + Vite · **State:** TanStack Query + Zustand

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 8+ (npm/yarn are forbidden — `CLAUDE.md §1.2`)
- **Backend running** locally at `http://localhost:8000` (see the one-community-1 repo → `make dev`)

---

## One-time setup

```bash
pnpm install
cp .env.example .env.development  # then edit values if needed
pnpm dev
```

Open http://localhost:5173.

In development with `DEV_OTP_BYPASS=true` on the backend, use OTP `000000` for any seeded phone number.

---

## Scripts

| Command           | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `pnpm dev`        | Start Vite dev server (HMR)              |
| `pnpm build`      | Type-check + production build to `dist/` |
| `pnpm preview`    | Serve the production build locally       |
| `pnpm lint`       | ESLint across the repo                   |
| `pnpm lint:fix`   | ESLint + autofix                         |
| `pnpm typecheck`  | `tsc --noEmit`                           |
| `pnpm format`     | Prettier write                           |
| `pnpm test`       | Run Vitest once                          |
| `pnpm test:watch` | Vitest watch mode                        |
| `pnpm test:ui`    | Vitest UI                                |
| `pnpm e2e`        | Playwright smoke tests                   |

Before every commit husky runs `pnpm lint-staged` and blocks on failure. Do not use `--no-verify`.

---

## Environment variables

Copy `.env.example` → `.env.development` (dev) and `.env.production` (when deploying). See `docs/frontend_prd.md §6.6` for the full list and purpose of each.

Key ones:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_ENV=development
VITE_OTP_BYPASS_HINT=true           # shows the "000000 works in dev" banner
VITE_MSW_ENABLED=true               # mocks backend gaps (see docs/frontend_prd.md §13.1)
VITE_DEBUG_PANEL=true               # floating debug dock (§6.8)
VITE_PROFILE_V1_ENABLED=false       # gap flag — §13 G1
VITE_OCR_SERVER_ENABLED=false       # gap flag — §13 G2
VITE_WHISPER_SERVER_ENABLED=false   # gap flag — §13 G2
VITE_DOCUMENTS_UPLOAD_ENABLED=false # gap flag — §13 G3
VITE_SENTRY_DSN=                    # optional
```

Never commit real values for these — only the `.example` sibling is tracked.

---

## Project structure

Top-level layout (full details in `docs/frontend_prd.md §6.2`):

```
src/
├── app/            # <App>, router, providers
├── api/            # axios client + endpoint functions + Zod schemas + query keys
├── auth/           # Zustand auth store + OTP service + RoleGuard
├── features/       # one folder per feature (self-contained)
├── components/     # cross-feature UI (shadcn primitives, layout, forms)
├── lib/            # pure utilities (role-capabilities, tag-colours, date helpers)
├── types/          # shared domain / enum types
├── styles/         # Tailwind globals
└── test/           # MSW setup + handlers + fixtures
```

Feature folders are strictly self-contained: `components/`, `hooks/`, `routes/`, `schemas.ts`, `index.ts`. Cross-feature imports are forbidden — promote shared code to `src/components/` or `src/lib/`.

---

## How this codebase is built (AI-assisted)

This repo is built by a single Claude Opus 4.7 instance using the protocol in [`CLAUDE.md`](./CLAUDE.md) §0.1. Coordination state lives in [`.claude/`](./.claude/):

| File                    | Role                                                      |
| ----------------------- | --------------------------------------------------------- |
| `.claude/decisions.md`  | Living decisions log + pending human-input queue          |
| `.claude/queue.md`      | Feature build queue (tick boxes as features complete)     |
| `.claude/session.md`    | "Where I stopped" snapshot (overwritten each session end) |
| `.claude/issues.md`     | QA-found code issues                                      |
| `.claude/settings.json` | Claude Code hooks (auto-lint on edit, auto-test on stop)  |

All `.claude/*` files are **committed to git** — they're the institutional memory across sessions.

If you're a human collaborator who needs to contribute manually:

1. Read `CLAUDE.md` (rules) and `docs/frontend_prd.md` (API contracts + data models).
2. Follow the Definition of Done in `CLAUDE.md §10`.
3. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all must pass.

If you're a Claude agent resuming this build:

- Read `docs/plan.md` for the stage-by-stage workflow.
- Session startup / shutdown protocols are in `CLAUDE.md §0.1.2` and `§0.1.3`.

---

## Testing

- **Unit:** Vitest + React Testing Library. Every hook has a unit test.
- **Integration:** Vitest + MSW. Every page has a smoke render test with happy-path handlers.
- **E2E:** Playwright (Stage 5 onwards). Key flows: signin → search → request-connect → admin-approve → target-accept.

Mock Service Worker handles backend calls in tests and — when `VITE_MSW_ENABLED=true` — in dev mode, covering the backend gap endpoints documented in `docs/frontend_prd.md §13.2`.

---

## Deployment (Vercel)

The app is hosted on Vercel as a static Vite SPA. `vercel.json` rewrites all paths to `index.html` so React Router handles client-side navigation.

### First-time setup on Vercel

1. **Push `vercel.json`** to `master` before importing the project (already committed).
2. In the Vercel "New Project" wizard set:
   - **Build Command** (override ON): `pnpm run build`
   - **Install Command** (override ON): `pnpm install --frozen-lockfile`
   - **Output Directory**: leave default (`dist`)
3. Under **Environment Variables**, click **Import .env** and paste the contents of `.env.production` (fill in `VITE_API_BASE_URL` with the real backend URL first — the placeholder `YOUR_BACKEND_DOMAIN` will not work).
4. Click **Deploy**.

### Redeploying after a code change

Vercel redeploys automatically on every push to `master`. Nothing extra to do — just:

```bash
git push origin master
```

Watch the build at `vercel.com/dashboard` → project → **Deployments** tab.

### Redeploying after an environment variable change

1. Go to Vercel dashboard → project → **Settings** → **Environment Variables**.
2. Edit or add the variable.
3. Trigger a new deployment: **Deployments** tab → latest deployment → **Redeploy** (three-dot menu) — a redeploy is required for env changes to take effect.

### Preview deployments (PRs)

Every branch pushed to GitHub automatically gets a preview URL at `<branch>-one-community-web.vercel.app`. Use these for testing before merging to `master`.

### Flipping a backend gap flag

When the backend ships a new endpoint (e.g. `POST /profile/{id}`), set its flag to `true` in Vercel env vars and redeploy:

| Flag                                 | Endpoint it unlocks       |
| ------------------------------------ | ------------------------- |
| `VITE_PROFILE_V1_ENABLED=true`       | `GET /profile/{id}`       |
| `VITE_OCR_SERVER_ENABLED=true`       | `POST /ocr`               |
| `VITE_WHISPER_SERVER_ENABLED=true`   | `POST /pitch/transcribe`  |
| `VITE_DOCUMENTS_UPLOAD_ENABLED=true` | `POST /documents/upload`  |
| `VITE_PARTNER_UPGRADE_ENABLED=true`  | Partner monetisation flow |

### Production build flags

- `VITE_APP_ENV=production` — hides source maps, enables Sentry
- `VITE_OTP_BYPASS_HINT=false` — never shows the "000000 works" dev banner
- `VITE_MSW_ENABLED=false` — disables Mock Service Worker
- `VITE_DEBUG_PANEL=false` — debug dock tree-shaken from bundle

---

## Known gaps the frontend handles locally

The backend is ahead of the frontend on some endpoints. The frontend ships feature-flagged interim implementations and MSW mocks for every gap. See `docs/frontend_prd.md §13.2` for the full list (G1–G16). TL;DR:

- `/profile/:id` — composed from `/search` + `/connections` until backend ships (`§13 G1`).
- OCR — `tesseract.js` client-side (`§13 G2`).
- Whisper transcription — text-only mode until backend ships (`§13 G2`).
- Documents upload — Phase-4 placeholder (`§13 G3`).
- Logout — client-only, no server audit yet (`§13 G15`).

---

## License

Internal tool — Warmup Ventures proprietary. Not for redistribution.
