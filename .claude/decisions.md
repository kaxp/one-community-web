# `.claude/decisions.md`

> **Living log of every architectural / product decision during the frontend build.**
>
> **Two sections:** `§ Pending` (Claude appended, awaiting human answer) and `§ Resolved` (answered, informs all future sessions).
>
> **Protocol reference:** `CLAUDE.md § 0.1` — single-Opus autonomous mode. This file is the canonical channel for human input; nothing else counts.

---

## How Claude uses this file

### When Claude needs human input

1. Append a new item to `§ Pending` using the P-N template below.
2. Print the 🟡 HUMAN INPUT NEEDED banner to the console (exact format in `CLAUDE.md § 0.1`).
3. Update `.claude/session.md` to record the BLOCKED state.
4. **Stop.** Do not code around the unknown. Do not guess.

### When the human answers

1. Read the human's answer (filled into the `**Answer:**` line under each pending item).
2. Move the item from `§ Pending` to `§ Resolved` verbatim, appending the answer + date.
3. Resume from `session.md § Next concrete step`.

### What belongs here

- Brand / design tokens (colours, spacing, logo, fonts, dark-mode)
- Environment URLs (dev, staging, prod backend)
- Deployment target + CI/CD provider
- Feature flag defaults (VITE_*_ENABLED values)
- Seed user phone numbers for each role
- Backend contract drift observations and how the frontend adapted
- Any "we chose X over Y" architectural choice made mid-build
- Any spec ambiguity the human resolved

### What does NOT belong here

- Ephemeral TODOs → put in `session.md § Next concrete step`
- Bug reports → put in `issues.md`
- Backend gaps → they already have resolutions in `frontend_prd.md §13`; if you need a NEW decision about a gap, note it here

### Template for a pending item

```markdown
### [P-N] <short title>

- **Feature:** <feature-key from queue.md, or "cross-cutting">
- **Blocking:** yes / no
- **Added:** YYYY-MM-DD
- **Context:** <one short paragraph — what you were doing and why this came up>
- **Question:** <single specific question>
- **Options:**
  - (a) <option> — <tradeoff>
  - (b) <option> — <tradeoff>
  - (c) <option if applicable>
- **My recommendation:** (a) / (b) / (c) — <one-line reason>
- **Answer:** _(human fills this)_
```

### Template for a resolved item

```markdown
### [P-N] <short title>  ✅ resolved YYYY-MM-DD

- **Decision:** <the chosen option>
- **Rationale:** <human's reason, or "per human direction" if none given>
- **Touches:** <files / features that rely on this>
```

---

## § Pending

### [P-23] MIS / pitch reshape — backend contract change required (issues.md [I-16])

- **Feature:** mis + pitch
- **Blocking:** yes (any frontend code change here would silently break against the current PRD §7.3 / §7.9 contracts)
- **Added:** 2026-04-27
- **Context:** issues.md [I-16] requests two product changes that span both features:
  1. Move the current quantitative MIS fields (`runway_months`, `monthly_burn`, `headcount`, `revenue_mtd`, etc.) **into the pitch profile** so the startup fills them once at the pitch stage alongside their existing pitch data.
  2. Change `/portfolio/mis` from a structured JSON form to a **file upload** (Excel / Tally / CSV / PDF) plus an optional comment. The structured form would be retired.
  - Frontend impact: rewrite `<MISPage>` as an upload form, remove `zMISCreate.raw_data` strict-keyed fields, extend `zStartupBlock` + `<PitchPage>` form with the financial fields, update §8 types in PRD, update tests + MSW handlers.
  - **But** the contracts are owned by the backend (PRD §7.3.1, §7.3.2 for pitch and §7.9.1, §7.9.2, §7.9.3 for MIS). The backend currently REQUIRES the structured `raw_data` keys on MIS submit and does NOT accept multipart upload there. The pitch endpoint similarly does not yet accept the financial fields. Frontend-only changes would silently 422 against any real backend.
- **Question:** How do you want to sequence this change?
- **Options:**
  - (a) **Block on backend first.** I open a backend ticket / PRD diff with the new contract, the backend ships the changes, we update PRD §7.3/§7.9, then I do the frontend work. Cleanest, but adds a wait.
  - (b) **Frontend-first stub behind a flag.** I gate the new UI behind `VITE_MIS_UPLOAD_ENABLED=false` (off in dev / prod), build the new pitch fields + MIS upload form against an MSW interim service per CLAUDE.md §13.2 G3 pattern, and ship it dark. When the backend lands, flip the flag.
  - (c) **Defer to v1.1 / Phase-5 polish.** The current MIS form works against today's backend; the proposed shape is a bigger product call. Add an issue stub and revisit after Stage 5 ships.
- **My recommendation:** (b) — it lets the frontend make progress while the backend catches up, mirrors the §13.2 pattern we already use for `/profile`, `/ocr`, `/documents/upload`, and avoids the deferred-then-forgotten failure mode of (c). But I want explicit confirmation because the rewrite touches 2 features + ~6 PRD sections.
- **Answer:** _(human fills this)_

<!-- ARCHIVED-PENDING-START — Stage 0 P-3..P-16 originals kept here for audit. Each has a resolved counterpart below in § Resolved.

### [P-3] Backend base URL — development (`VITE_API_BASE_URL`) — archived

- **Feature:** cross-cutting (scaffold + auth)
- **Blocking:** yes
- **Added:** 2026-04-24
- **Context:** `.env.example` and `.env.development` both ship with `VITE_API_BASE_URL=http://localhost:8000/api/v1`, which matches PRD §1.4. I need to confirm this is the dev URL you actually want the client to hit (i.e. the local FastAPI uvicorn from `make dev` in `one-community-1`) before wiring `apiClient`. If you run the backend on a different port or under a reverse proxy, I need the exact URL.
- **Question:** What is the dev-time backend base URL the frontend should use?
- **Options:**
  - (a) `http://localhost:8000/api/v1` — default, matches PRD §1.4, no change needed.
  - (b) Some other local URL (e.g. `http://127.0.0.1:8000/api/v1`, `http://backend.local/api/v1`, or an ngrok/staging tunnel you use instead).
- **My recommendation:** (a) — keeps the shipped `.env.example` correct. Only change if you actively run the backend elsewhere.
- **Answer:** Option a, we will run the server locally before running the frontend for now.

### [P-4] Backend base URL — staging (`VITE_API_BASE_URL` in staging build)

- **Feature:** cross-cutting (deploy + CI)
- **Blocking:** no (blocks only at staging deploy time, not during local build)
- **Added:** 2026-04-24
- **Context:** CLAUDE.md §9.8 defines three envs (`development` / `staging` / `production`) that differ in Sentry, source-map, and debug-dock behaviour. I need the staging backend URL to populate the staging env file (or the platform's env-var UI — see P-8). If staging doesn't exist yet, I can stub with a placeholder and gate it behind a "staging not-yet-available" banner.
- **Question:** Is there a live staging backend, and if so what is its base URL?
- **Options:**
  - (a) Staging exists at a real URL — paste it here (e.g. `https://api-staging.warmupventures.com/api/v1`).
  - (b) No staging yet — leave blank; I'll collapse staging into "production preview" on Vercel/Netlify and re-introduce a separate staging env later.
  - (c) Staging URL is the same as production (shared backend, differentiated by JWT env) — paste that URL.
- **My recommendation:** (b) if backend has no staging deployment yet — avoids shipping a dead env. Revisit before go-live.
- **Answer:** Option B, we don't need staging right now.

### [P-5] Backend base URL — production (`VITE_API_BASE_URL` in prod build)

- **Feature:** cross-cutting (deploy)
- **Blocking:** no (blocks only at prod deploy time)
- **Added:** 2026-04-24
- **Context:** Needed for the prod `.env` / platform env-var (see P-8). Also needed by the backend team to whitelist the frontend's prod origin in CORS. The current `.env.production` on disk still shows `http://localhost:8000/api/v1` — that must not ship.
- **Question:** What is the production backend base URL?
- **Options:**
  - (a) e.g. `https://api.warmupventures.com/api/v1` — if the backend is already routed under `warmupventures.com`.
  - (b) e.g. `https://one-community-api.<host>.com/api/v1` — if hosted on a PaaS like Render/Railway/Fly without a custom domain yet.
  - (c) Not yet decided — defer, leave `.env.production` empty and have the build fail loudly until populated.
- **My recommendation:** (c) until backend team confirms the prod domain. An empty value will fail the Zod check in `src/lib/env.ts` at bundle time, which is safer than shipping a wrong URL.
- **Answer:** Option C, we will work on development only for now.

### [P-6] Seed user phone numbers for the 10 roles (dev)

- **Feature:** auth, calibration testing (Stage 2)
- **Blocking:** yes (Stage 2 auth cannot be integration-tested without them)
- **Added:** 2026-04-24
- **Context:** PRD §7.1 defines the OTP login flow by phone number (E.164 format per §7.0.6). To run the Stage 2a auth flow and verify each role lands on the correct post-login route (PRD §10.2), I need seeded phones for every one of the 10 roles: `lp`, `potential_lp`, `vc`, `startup_inprogress`, `startup_onboarded`, `startup_funded`, `partner`, `advisor`, `admin`, `super_admin`. The commented example in this file (P-1..P-3 placeholders) shows `+9199999999NN` as a pattern — I need the actual seeded values from `backend/scripts/seed_data.py` or equivalent.
- **Question:** What are the exact seeded E.164 phone numbers for each of the 10 roles in the dev backend?
- **Options:**
  - (a) Paste the list here, one per role (format `+91XXXXXXXXXX`).
  - (b) Point me at a backend file (e.g. `one-community-1/scripts/seed_data.py`) I can read — but I cannot read outside this repo, so you'll need to paste the values.
- **My recommendation:** (a) — paste directly. Even partial coverage is useful; at minimum I need `admin` + `lp` + one `startup_*` to exercise the calibration features.
- **Answer:** This is the seed user list
SEED_USERS = [
    {
        "phone": "+918087464723",
        "role": "admin",
        "name": "Kapil",
        "email": "kapil@warmupventures.com",
    },
    {
        "phone": "+911234567890",
        "role": "admin",
        "name": "Admin Dev",
        "email": "admin@warmupventures.com",
    },
    {
        "phone": "+911234567891",
        "role": "super_admin",
        "name": "Super Admin Dev",
        "email": "superadmin@warmupventures.com",
    },
    {
        "phone": "+911234567892",
        "role": "lp",
        "name": "LP Test User",
        "email": "lp@test.com",
    },
    {
        "phone": "+911234567893",
        "role": "potential_lp",
        "name": "Potential LP User",
        "email": "potentiallp@test.com",
    },
    {
        "phone": "+911234567894",
        "role": "startup_funded",
        "name": "Funded Startup User",
        "email": "startup@test.com",
    },
    {
        "phone": "+911234567895",
        "role": "startup_inprogress",
        "name": "InProgress Startup",
        "email": "startup-ip@test.com",
    },
    {
        "phone": "+911234567896",
        "role": "vc",
        "name": "VC Test User",
        "email": "vc@test.com",
    },
    {
        "phone": "+911234567897",
        "role": "partner",
        "name": "Partner User",
        "email": "partner@test.com",
    },
    {
        "phone": "+911234567898",
        "role": "advisor",
        "name": "Advisor User",
        "email": "advisor@test.com",
    },
    {
        "phone": "+911234567899",
        "role": "startup_onboarded",
        "name": "Onboarded Startup",
        "email": "onboarded@test.com",
    },
]
Extract the mobile number for each user role and add them to some constant or similar file.

### [P-7] Dev OTP bypass code value

- **Feature:** auth (Stage 2)
- **Blocking:** yes (auth tests need to know the expected OTP)
- **Added:** 2026-04-24
- **Context:** `VITE_OTP_BYPASS_HINT=true` in `.env.development` causes `/signin` to show a hint banner ("Dev mode: OTP is <code>"). I need the exact code the backend accepts in dev. The `decisions.md` commented example mentions `000000` but this was illustrative — I need confirmation.
- **Question:** What OTP does the dev backend accept for any seeded user?
- **Options:**
  - (a) `000000` — the commented example and a common dev convention.
  - (b) A fixed non-zero code (e.g. `123456`) — paste it.
  - (c) No bypass — dev backend sends real OTPs via WATI, and we should read logs / a dev-only inbox. (This would force `VITE_OTP_BYPASS_HINT=false` in dev.)
- **My recommendation:** (a) if the backend has a dev bypass; otherwise (c) and I'll flip the hint flag.
- **Answer:** Option a

### [P-8] Deployment target (hosting platform)

- **Feature:** cross-cutting (scaffold + CI)
- **Blocking:** yes (affects `vite.config.ts` base path, SPA rewrite rules, and env-var source)
- **Added:** 2026-04-24
- **Context:** The app is a static Vite SPA (CLAUDE.md §0 — "deployed as static assets"). Different hosts need different SPA rewrite rules (Vercel `vercel.json`, Netlify `_redirects` or `netlify.toml`, CloudFront functions, nginx `try_files`). I also need to know where to read env vars from (platform UI vs `.env.production` in the build).
- **Question:** Where will the built `dist/` be hosted?
- **Options:**
  - (a) **Vercel** — I add a `vercel.json` with SPA rewrite `{ "source": "/(.*)", "destination": "/" }` and env vars go in the Vercel project UI.
  - (b) **Netlify** — I add `public/_redirects` with `/*  /index.html  200` and env vars go in Netlify UI.
  - (c) **AWS S3 + CloudFront** — I add a CloudFront function snippet + ship `.env.production` in the build.
  - (d) **Self-hosted nginx / Caddy / similar** — I document the `try_files $uri /index.html;` rule in `README.md`.
  - (e) Not decided yet — I'll omit host-specific config and add it later.
- **My recommendation:** (a) — Vercel is the lowest-friction fit for a Vite SPA with preview deploys on every PR. (b) is an equally fine fallback.
- **Answer:** Option a, but in future it should be easy to migrate to AWS if required because the current website is hosted to AWS and this RBAC might also need to migrate there is costing is high on vercel.

### [P-9] Production frontend domain (for backend CORS + absolute URLs)

- **Feature:** cross-cutting (deploy)
- **Blocking:** no (blocks only at prod cut-over)
- **Added:** 2026-04-24
- **Context:** Needed for two things: (1) the backend team must whitelist this origin in CORS, (2) any absolute URLs we emit (e.g. OG tags, deep-link fallbacks, password-less email Phase-4 tokens per CLAUDE.md §15) must point at it. Only the domain — no scheme/path.
- **Question:** What is the production frontend domain?
- **Options:**
  - (a) e.g. `app.warmupventures.com` — subdomain of the marketing site.
  - (b) e.g. `one.warmupventures.com` — dedicated subdomain for One Community.
  - (c) `warmupventures.com/app` — path-based (requires Vite `base: '/app/'` + cookie-scope considerations — we don't use cookies, so less risky here).
  - (d) Platform-provided only (e.g. `one-community-web.vercel.app`) — no custom domain for now.
  - (e) Not decided.
- **My recommendation:** (b) if a subdomain is available — cleanest separation from marketing SEO. (d) is fine for soft-launch.
- **Answer:** We might send depe links to users for specific task/feature like top recommendations or person they might connect. So when they click on this deep link they should navigate to the respective page. So based on this, I will let you choose which option is best. One more thing, the deep link will have user credentials embedded in them so the user doesn't have to login when redirecting.

### [P-10] CI/CD provider confirmation

- **Feature:** cross-cutting (scaffold)
- **Blocking:** no (the workflow already exists)
- **Added:** 2026-04-24
- **Context:** `.github/workflows/ci.yml` is already checked in and runs `install → lint → typecheck → test → build` on every PR and push to `main`, per CLAUDE.md §9.5. Stage 1 (queue.md) also commits to GitHub Actions. Before I rely on this, I want to confirm GitHub Actions is indeed the CI you want — some teams switch to CircleCI / Buildkite / their deployment platform's CI.
- **Question:** Is GitHub Actions the sanctioned CI, and is the existing `ci.yml` template acceptable to build on?
- **Options:**
  - (a) Yes — keep `.github/workflows/ci.yml` as the canonical CI.
  - (b) Use GitHub Actions but extend `ci.yml` with extra jobs (e.g. Lighthouse CI, Playwright smoke on PR). Paste requirements.
  - (c) Different CI — specify (CircleCI / Buildkite / GitLab / Vercel-native / etc.).
- **My recommendation:** (a) — the template already matches CLAUDE.md §9.5 and the Vercel/Netlify deploy can run independently on push-to-main.
- **Answer:** Option a

### [P-11] Feature flag defaults in committed `.env.*` files

- **Feature:** cross-cutting (scaffold)
- **Blocking:** no
- **Added:** 2026-04-24
- **Context:** `.env.example`, `.env.development`, `.env.production` all currently ship with every gap flag (`VITE_PROFILE_V1_ENABLED`, `VITE_OCR_SERVER_ENABLED`, `VITE_WHISPER_SERVER_ENABLED`, `VITE_DOCUMENTS_UPLOAD_ENABLED`) set to `false`, and `VITE_MSW_ENABLED=true`, `VITE_DEBUG_PANEL=true`, `VITE_OTP_BYPASS_HINT=true`. This matches CLAUDE.md §16 (all gap endpoints pending backend). I want explicit confirmation before building interim services on these defaults.
- **Question:** Are the feature-flag defaults in `.env.example` correct, and specifically should production also ship `VITE_MSW_ENABLED=false`, `VITE_DEBUG_PANEL=false`, `VITE_OTP_BYPASS_HINT=false`?
- **Options:**
  - (a) Yes — keep dev with MSW + debug + OTP hint on; prod with all three off and all gap flags off (I'll harden `.env.production` accordingly).
  - (b) One or more flags should be flipped — list which and why.
- **My recommendation:** (a) — matches CLAUDE.md §9.8 and §16 exactly.
- **Answer:** Option a

### [P-12] Sentry DSN (staging + production)

- **Feature:** cross-cutting (observability)
- **Blocking:** no
- **Added:** 2026-04-24
- **Context:** `VITE_SENTRY_DSN` is left blank in `.env.example`. CLAUDE.md §9.8 + §3.3 + §7.3 mention Sentry for error reporting and role-drift warnings. If there's no Sentry account yet, I'll wire a `noop` reporter and leave the DSN blank so initialisation short-circuits.
- **Question:** Do you have a Sentry DSN for staging and/or production, or should I leave it blank?
- **Options:**
  - (a) Paste DSN(s) — staging and prod can share one project or have separate projects; I'll plumb them through `.env.staging` / `.env.production`.
  - (b) No Sentry account — leave blank; I'll wire a no-op reporter with a clear TODO.
  - (c) Use a different error-reporting service (LogRocket / Rollbar / Datadog) — specify.
- **My recommendation:** (b) — ship with no-op now; flip in env when you have a DSN. Sentry can be added any time without touching code.
- **Answer:** We don't have sentry, so maybe can just create scaffold service class for error reporting etc. We might add sentry or datadog or any other provider.

### [P-13] Logo asset for top bar (SVG / PNG) vs fallback glyph

- **Feature:** scaffold (TopBar) + sign-in screen
- **Blocking:** no (fallback specified by PRD §6.6b)
- **Added:** 2026-04-24
- **Context:** PRD §6.6b states: *"If a logo asset (SVG) is supplied in `.claude/decisions.md [P-logo]`, render it left of the wordmark at `h-8`. Otherwise render a solid-brand circular 'W' glyph as a fallback."* Top bar wordmark is already locked to `One Community` (P-2).
- **Question:** Is there an official Warmup Ventures logo I should use, and if so in what form?
- **Options:**
  - (a) **Paste a public URL** (e.g. the one on `warmupventures.com/favicon.svg` or a CDN link). I'll download it into `public/brand/logo.svg` at scaffold time.
  - (b) **Commit an asset file** — you drop `public/brand/logo.svg` (and optional `logo.png` at 2x) yourself before Stage 1, and I reference it from `<TopBar>`.
  - (c) **Fallback** — render the solid-brand circular "W" glyph per PRD §6.6b. No asset file. I'll build this with a `div.bg-brand.text-brand-foreground` + Inter 600 "W".
- **My recommendation:** (c) — no-risk default that matches the PRD fallback. If you later supply a real logo, swapping it is a 1-file change.
- **Answer:** Logo url is - https://lh3.googleusercontent.com/sitesv/AA5AbUB6SLqLgPY0Zp0rTu2XiIsSrirsvuq7RhqqYr8qKazHccjMm3XpiQjl7w7_By7p1CYUutKnSMndV1pQ6bgyvIln8FPridt6vn3h9jAaQpvcuECcCCgnsRnI0xoLsqeFJMk_O77W57kmn7-Tk1NCBGiMopOWhG5ecFtq0ndjPOAthilLrYXJFMPgMdw=w16383


### [P-14] Favicon asset

- **Feature:** scaffold (`index.html`)
- **Blocking:** no
- **Added:** 2026-04-24
- **Context:** Vite's default `favicon.svg` must be replaced. PRD doesn't mandate a specific favicon.
- **Question:** What favicon should ship at `public/favicon.svg` + `public/favicon.ico`?
- **Options:**
  - (a) **Paste a URL / commit a file** — if Warmup Ventures has an existing favicon, supply it and I'll drop it into `public/`.
  - (b) **Auto-generated "W" glyph** — I render a 32x32 SVG with a solid `#1F73B7` background, rounded corners (`rx=6`), and a white Inter-600 "W" centred. Exported as `public/favicon.svg` with an `.ico` fallback generated at build.
  - (c) **Reuse the logo from P-13** — scaled and re-exported.
- **My recommendation:** (b) — consistent with the P-13 fallback and trivially generated.
- **Answer:** Favicon icon url - https://lh3.googleusercontent.com/sitesv/AA5AbUD860pVprA36vbK4Yan_HMxJzjWPTzhsMbGP_Gr_fyFaqS92trMQnqfnqINPoATxqq_7-9oUKOtNjCoXglTQzm4xMYAj848Mwp-2bpgy0n3JZbJ-B6Lw6Y8FGV7RFx9LDHf-fR-fTA__BZIgx0WpevBQavaQ77dssxiLA9_ROJpqx_IRhKgOxoXuxsy_CGXtE8fCJkA_degg1w-bkE


### [P-15] Support contact rendered on error screens

- **Feature:** cross-cutting (error UI)
- **Blocking:** no
- **Added:** 2026-04-24
- **Context:** PRD §5.3 and §11 mandate that every `<ErrorState>` offers one of Retry / Go back / Contact support. The 500 catalogue (§7.0.4) and `not_registered` error (§7.1.1) both produce a "Contact Warmup Ventures" action. I need an actual destination — an email (`mailto:`), a WhatsApp link (`https://wa.me/...`), or a support URL. Without one, I'll wire the button to `mailto:support@warmupventures.com` as a plausible default.
- **Question:** What action should "Contact support" / "Contact Warmup Ventures" buttons trigger?
- **Options:**
  - (a) `mailto:<address>` — paste the address (e.g. `hello@warmupventures.com`, `support@warmupventures.com`).
  - (b) WhatsApp link — paste the `https://wa.me/<E.164>` URL.
  - (c) A custom URL — paste (e.g. `https://warmupventures.com/contact`).
  - (d) Both — primary email + secondary "or WhatsApp us". I'll render both in the error panel.
- **My recommendation:** (a) with `support@warmupventures.com` if it exists; otherwise (c) pointing at the marketing-site contact form.
- **Answer:** Let's add email and whatapp with dummy data, will replace the mobile number and email address later. Just add TODO in the code.

### [P-16] Product analytics / telemetry in production

- **Feature:** cross-cutting (observability)
- **Blocking:** no
- **Added:** 2026-04-24
- **Context:** Sentry (P-12) handles error reporting. Product analytics (pageviews, feature usage, funnels) is a separate decision. PRD doesn't mandate a provider. Not instrumenting now is reversible — adding a tag later is trivial. But if you want anything in by v1.0, I need to know now so I can include a thin `trackPageView()` in the router + a `track(event, props)` hook.
- **Question:** Should the frontend ship with a product-analytics / telemetry provider, and if so which?
- **Options:**
  - (a) **None for v1.0** — don't instrument; rely on backend `/interactions/log` + `/analytics/*` for product insight (PRD §7.14 already covers the backend-side analytics).
  - (b) **Google Analytics 4** — paste the measurement ID.
  - (c) **Plausible / Fathom / PostHog / Mixpanel** — specify provider + token.
- **My recommendation:** (a) — PRD §7.14 already provides a rich backend analytics surface, and adding a third-party snippet risks PII-logging regressions (especially with the card-scan flow in §7.2.1). Add a client-side provider later if/when a specific product question demands it.
- **Answer:** Option a

ARCHIVED-PENDING-END -->

---

## § Resolved

### [P-1] Brand / design tokens  ✅ resolved 2026-04-24

- **Decision:** Dashboard follows the visual language of https://www.warmupventures.com/ — a clean, light-themed, professional SaaS aesthetic. Tokens:
  - **Primary color:** `#1F73B7` (Warmup blue) — used for CTAs, links, focus rings, selected states. Hover/active: `#1A5F98`.
  - **Neutral scale:**
    - Background: `#FFFFFF`
    - Surface / card: `#FFFFFF` with `#E8E8E8` border
    - Muted surface: `#F5F5F5` (alternating section backgrounds, subtle panels)
    - Border / divider: `#E8E8E8`
    - Input border: `#E8E8E8` (focus → `#1F73B7`)
  - **Text:**
    - Heading: `#1A1A1A`
    - Body: `#4A4A4A`
    - Muted / caption: `#666666`
    - On-primary (white on blue): `#FFFFFF`
  - **Semantic colors:**
    - Success: `#16A34A` (green-600)
    - Warning: `#D97706` (amber-600)
    - Error / destructive: `#DC2626` (red-600)
    - Info: `#1F73B7` (reuse primary)
  - **Font family:** `Inter` (Google Fonts) as primary display + body, falling back to `system-ui, -apple-system, sans-serif`. Weights to load: 400, 500, 600, 700.
  - **Font sizes:** Tailwind default scale. Heading hierarchy: `text-3xl` (h1 page title) · `text-2xl` (section h2) · `text-xl` (card h3) · `text-base` (body) · `text-sm` (caption).
  - **Border radius:** `0.5rem` (shadcn default `--radius`). Buttons, cards, inputs all use this.
  - **Shadow:** very subtle. shadcn `shadow-sm` for cards (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`). No heavy shadows, no glassmorphism, no gradients.
  - **Max content width:** `max-w-screen-xl` (1280px) for main content container.
  - **Section padding:** `py-12 md:py-16` between major sections; card padding `p-6`.
  - **Dark mode:** NOT in v1. Tailwind configured with `darkMode: 'class'` for future use, but no dark tokens are supplied.
- **Rationale:** Mirrors the existing Warmup Ventures marketing site so the dashboard feels like an extension of the brand. `Inter` chosen as the canonical modern SaaS typeface (the landing page uses system defaults which look unrefined on dashboards). Palette is dense enough for shadcn/ui components without further questions.
- **Touches:**
  - `tailwind.config.ts` → `theme.extend.colors`, `theme.extend.fontFamily`, `theme.extend.borderRadius`.
  - `src/styles/globals.css` → shadcn CSS variables (`--primary`, `--background`, `--foreground`, etc.) keyed to these tokens.
  - `index.html` → Google Fonts `<link>` for Inter.
  - Every shadcn/ui component default inherits this palette.

**Tailwind theme extension — ready to drop into `tailwind.config.ts`:**

```ts
// tailwind.config.ts — theme.extend
colors: {
  brand: {
    DEFAULT: '#1F73B7',
    hover:   '#1A5F98',
    foreground: '#FFFFFF',
  },
  surface: {
    DEFAULT: '#FFFFFF',
    muted:   '#F5F5F5',
  },
  border:  '#E8E8E8',
  ink: {
    heading: '#1A1A1A',
    body:    '#4A4A4A',
    muted:   '#666666',
  },
  success: '#16A34A',
  warning: '#D97706',
  error:   '#DC2626',
},
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
},
borderRadius: {
  lg: '0.5rem',
  md: '0.375rem',
  sm: '0.25rem',
},
maxWidth: {
  content: '80rem',  // 1280px
},
```

**shadcn CSS variables — drop into `src/styles/globals.css`:**

```css
@layer base {
  :root {
    --background:       0 0% 100%;           /* #FFFFFF */
    --foreground:       0 0% 10%;            /* #1A1A1A */
    --card:             0 0% 100%;
    --card-foreground:  0 0% 10%;
    --popover:          0 0% 100%;
    --popover-foreground: 0 0% 10%;
    --primary:          207 71% 42%;         /* #1F73B7 */
    --primary-foreground: 0 0% 100%;
    --secondary:        0 0% 96%;            /* #F5F5F5 */
    --secondary-foreground: 0 0% 10%;
    --muted:            0 0% 96%;
    --muted-foreground: 0 0% 40%;            /* #666666 */
    --accent:           207 71% 42%;
    --accent-foreground: 0 0% 100%;
    --destructive:      0 84% 60%;           /* #DC2626 */
    --destructive-foreground: 0 0% 100%;
    --border:           0 0% 91%;            /* #E8E8E8 */
    --input:            0 0% 91%;
    --ring:             207 71% 42%;
    --radius:           0.5rem;
  }
}
```

### [P-2] Application name displayed in UI  ✅ resolved 2026-04-24

- **Decision:** Top bar wordmark reads `One Community`. Email sender name: `Warmup Ventures`. Page `<title>` pattern: `<Feature> · One Community`.
- **Rationale:** Keeps parent-brand recognition while labelling the product.
- **Touches:** `src/components/layout/TopBar.tsx`, `index.html`, every route's page title.

### [P-3] Backend base URL — development  ✅ resolved 2026-04-24

- **Decision:** `VITE_API_BASE_URL=http://localhost:8000/api/v1` (Option a). Dev backend is run locally via `make dev` in `one-community-1` before the frontend.
- **Rationale:** Matches PRD §1.4 default. Human confirmed they run the backend locally.
- **Touches:** `.env.development`, `.env.example`, `src/lib/env.ts` (Zod env schema).

### [P-4] Backend base URL — staging  ✅ resolved 2026-04-24

- **Decision:** No staging environment for now (Option b). Do not ship `.env.staging`. No staging-specific bundle / build target. Staging will be reintroduced later — open a fresh P-N pending item at that time.
- **Rationale:** Per human direction — no staging backend exists today.
- **Touches:** CI workflow (no staging job). `src/lib/env.ts` (`VITE_APP_ENV` accepts `development | production` only for now, but keep `staging` in the enum comment for future use).

### [P-5] Backend base URL — production  ✅ resolved 2026-04-24

- **Decision:** Deferred (Option c). Focus on development only for now. `.env.production` ships with `VITE_API_BASE_URL=""` (empty). `src/lib/env.ts` Zod check must fail loudly at bundle time if an empty value is used in a prod build, so a production build cannot silently ship a broken URL.
- **Rationale:** Per human direction — development only for now. Better to fail the build than ship a wrong prod URL.
- **Touches:** `.env.production`, `src/lib/env.ts` (add `.url()` validation conditional on `VITE_APP_ENV === 'production'`).

### [P-6] Seed user phone numbers (dev)  ✅ resolved 2026-04-24

- **Decision:** Use the backend `SEED_USERS` list. Extracted E.164 numbers per role, stored as a constant in `src/lib/dev-seed-users.ts` (dev-only, tree-shaken from production via `import.meta.env.DEV` guard). Two admin entries — `+918087464723` (Kapil) is the primary admin for manual testing; `+911234567890` (Admin Dev) is the automated-test admin.

  | Role | Phone (E.164) | Name | Email |
  |---|---|---|---|
  | `admin` (primary) | `+918087464723` | Kapil | kapil@warmupventures.com |
  | `admin` (test) | `+911234567890` | Admin Dev | admin@warmupventures.com |
  | `super_admin` | `+911234567891` | Super Admin Dev | superadmin@warmupventures.com |
  | `lp` | `+911234567892` | LP Test User | lp@test.com |
  | `potential_lp` | `+911234567893` | Potential LP User | potentiallp@test.com |
  | `startup_funded` | `+911234567894` | Funded Startup User | startup@test.com |
  | `startup_inprogress` | `+911234567895` | InProgress Startup | startup-ip@test.com |
  | `vc` | `+911234567896` | VC Test User | vc@test.com |
  | `partner` | `+911234567897` | Partner User | partner@test.com |
  | `advisor` | `+911234567898` | Advisor User | advisor@test.com |
  | `startup_onboarded` | `+911234567899` | Onboarded Startup | onboarded@test.com |

- **Rationale:** Matches backend dev seed. Phone-to-role map lets `/signin` dev hint banner, the debug dock (PRD §6.8), and integration tests auto-select the right account.
- **Touches:** `src/lib/dev-seed-users.ts` (new — dev-only constant), `src/features/auth/routes/SignInPage.tsx` (dev hint dropdown), `src/test/msw-fixtures/*` (reuse phones in fixtures), `src/components/debug-dock/SessionPanel.tsx`.

### [P-7] Dev OTP bypass code  ✅ resolved 2026-04-24

- **Decision:** `000000` (Option a). Any seeded user accepts `000000` as the OTP in dev. `.env.development` keeps `VITE_OTP_BYPASS_HINT=true`; prod keeps it `false`.
- **Rationale:** Matches the commented example convention. Safe because the hint is tree-shaken out of prod builds and the flag is off in `.env.production`.
- **Touches:** `src/features/auth/routes/SignInPage.tsx` (render "Dev mode: OTP is 000000" banner when hint flag is true), `src/test/msw-handlers.ts` (OTP verify handler accepts `000000` + any seeded phone).

### [P-8] Deployment target  ✅ resolved 2026-04-24

- **Decision:** Vercel (Option a). Ship `vercel.json` at repo root with SPA rewrite `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`. Env vars live in the Vercel project UI, not in committed `.env.production`. Keep the build portable for future migration to AWS (S3 + CloudFront): do NOT use any Vercel-only runtime features (`@vercel/...` packages, ISR, edge functions, middleware). The output is a plain static `dist/` that any static host can serve.
- **Rationale:** Human chose Vercel for speed to production but flagged cost-driven migration to AWS (where the marketing site already lives). Keeping the build vanilla-Vite preserves that option — a future migration is just S3 sync + CloudFront function for the SPA rewrite.
- **Touches:** `vercel.json` (new), `README.md` (add "Portability" note documenting the nginx `try_files $uri /index.html;` and CloudFront-function rewrite equivalents), `vite.config.ts` (no Vercel adapter).

### [P-9] Production frontend domain + deep-link routing  ✅ resolved 2026-04-24

- **Decision:**
  - **Primary prod domain (assistant-chosen, override any time):** `one.warmupventures.com` (Option b — dedicated subdomain for One Community). Cleanest separation from marketing SEO and mirrors the "one community" product name.
  - **Deep-link scheme:** deep links use the same domain + a query-param-embedded auth token. Route pattern: `https://one.warmupventures.com/<route>?t=<jwt>` where `t` is a short-lived JWT minted by the backend (per CLAUDE.md §15 — "Phase 4 deep-link tokens are backend-minted JWTs treated identically to OTP session tokens client-side").
  - **Client-side handling:** a top-level router effect reads `?t=` on mount. If present and `authStore` is empty, drop the token into `authStore`, fetch `/auth/me`, strip `?t=` from the URL via `history.replaceState` (so the token does not leak via Referer), then continue to the requested route. If `authStore` already has a session, ignore `?t=` (do not override an active session silently).
  - **Security note:** tokens in URL query strings are logged by many proxies / browser history. Mitigation: backend mints ≤15-minute expiry tokens for deep links (backend concern — raise via a future P-N if backend disagrees). Never log `t` on the client.
- **Rationale:** Human deferred domain choice to me with the constraint "deep link should navigate to the feature page and auto-auth". Subdomain is cleanest; deep-link handling via `?t=` + strip is the standard pattern that works on all static hosts (no server-side token exchange needed). Production is still deferred (see P-5) so this is a target, not an active deploy.
- **Touches:** `src/app/router.tsx` (deep-link token interceptor), `src/auth/deep-link.ts` (new — token ingestion + URL cleanup), `src/lib/env.ts` (`VITE_APP_DOMAIN=one.warmupventures.com` constant), backend CORS allow-list (coordination with backend team).

### [P-10] CI/CD provider  ✅ resolved 2026-04-24

- **Decision:** GitHub Actions (Option a). The existing `.github/workflows/ci.yml` is canonical — run `pnpm install --frozen-lockfile → lint → typecheck → test → build` on every PR and push to `main`. Vercel deploys run independently on push-to-main via the Vercel Git integration.
- **Rationale:** Template already matches CLAUDE.md §9.5. No need to invent a new CI.
- **Touches:** `.github/workflows/ci.yml` (already on disk — keep).

### [P-11] Feature-flag defaults  ✅ resolved 2026-04-24

- **Decision:** Accept current defaults (Option a):
  - **Dev** (`.env.development`, `.env.example`): `VITE_MSW_ENABLED=true`, `VITE_DEBUG_PANEL=true`, `VITE_OTP_BYPASS_HINT=true`, all four gap flags (`VITE_PROFILE_V1_ENABLED`, `VITE_OCR_SERVER_ENABLED`, `VITE_WHISPER_SERVER_ENABLED`, `VITE_DOCUMENTS_UPLOAD_ENABLED`) = `false`.
  - **Prod** (`.env.production`): all three dev-convenience flags flipped to `false`; all gap flags `false` until backend ships each endpoint. `VITE_APP_ENV=production`.
- **Rationale:** Matches CLAUDE.md §9.8 and §16. Human confirmed.
- **Touches:** `.env.development`, `.env.production`, `.env.example`. Interim services keyed off each gap flag per CLAUDE.md §16.

### [P-12] Error reporting / Sentry  ✅ resolved 2026-04-24

- **Decision:** No Sentry today. Build a thin **pluggable error-reporter service** at `src/lib/error-reporter.ts` with a minimal interface `{ captureException(err, ctx?), captureMessage(msg, level, ctx?) }`. Ship two adapters:
  - **`NoopReporter`** — default. No network calls. `console.warn` in dev only.
  - **`SentryReporter`** — scaffolded but commented-out. Imports are `// TODO` until a DSN exists, so no Sentry SDK is bundled today.
  - The `ErrorBoundary` + axios error interceptor both route through the service. Switching providers later (Sentry / Datadog / Rollbar) is a one-file change.
- **Rationale:** Human: "We don't have sentry … scaffold service class … might add sentry or datadog or any other provider." Keep the bundle lean; keep the seam.
- **Touches:** `src/lib/error-reporter.ts` (new), `src/components/error-boundary/ErrorBoundary.tsx` (consume the reporter), `src/api/client.ts` (report non-ApiError failures), `.env.example` (keep `VITE_SENTRY_DSN=` blank with a comment noting it activates the Sentry adapter).

### [P-13] Logo asset  ✅ resolved 2026-04-24

- **Decision:** Use the provided Warmup Ventures logo URL. At Stage 1 scaffold time, download the SVG/PNG once into `public/brand/logo.png` (Google Sites CDN URLs are unstable — do not reference at runtime). Render in `<TopBar>` at `h-8` left of the `One Community` wordmark per PRD §6.6b. Fall back to the solid-brand circular "W" glyph if the file is missing (resilience).
- **Source URL (download once, do NOT runtime-reference):** `https://lh3.googleusercontent.com/sitesv/AA5AbUB6SLqLgPY0Zp0rTu2XiIsSrirsvuq7RhqqYr8qKazHccjMm3XpiQjl7w7_By7p1CYUutKnSMndV1pQ6bgyvIln8FPridt6vn3h9jAaQpvcuECcCCgnsRnI0xoLsqeFJMk_O77W57kmn7-Tk1NCBGiMopOWhG5ecFtq0ndjPOAthilLrYXJFMPgMdw=w16383`
- **Rationale:** Brand asset supplied. Downloading once into the repo protects against the Google Sites CDN URL expiring or rate-limiting. TopBar remains the single display point.
- **Touches:** `public/brand/logo.png` (new — downloaded at scaffold time), `src/components/layout/TopBar.tsx`, `src/components/brand/BrandLogo.tsx` (new — handles img fallback to glyph). README should note the source URL for future re-downloads.

### [P-14] Favicon  ✅ resolved 2026-04-24

- **Decision:** Use the provided Warmup Ventures favicon URL. Download once into `public/favicon.png` at Stage 1 scaffold time. Also generate a `public/favicon.ico` fallback (32x32 converted from the PNG) for older browsers. Register both in `index.html` via `<link rel="icon" type="image/png" href="/favicon.png">` and `<link rel="shortcut icon" href="/favicon.ico">`.
- **Source URL (download once, do NOT runtime-reference):** `https://lh3.googleusercontent.com/sitesv/AA5AbUD860pVprA36vbK4Yan_HMxJzjWPTzhsMbGP_Gr_fyFaqS92trMQnqfnqINPoATxqq_7-9oUKOtNjCoXglTQzm4xMYAj848Mwp-2bpgy0n3JZbJ-B6Lw6Y8FGV7RFx9LDHf-fR-fTA__BZIgx0WpevBQavaQ77dssxiLA9_ROJpqx_IRhKgOxoXuxsy_CGXtE8fCJkA_degg1w-bkE`
- **Rationale:** Same reasoning as P-13 — bake the asset into the repo; do not depend on a third-party CDN URL at runtime.
- **Touches:** `public/favicon.png` (new), `public/favicon.ico` (new), `index.html` (`<link rel="icon">` tags).

### [P-15] "Contact support" destination  ✅ resolved 2026-04-24

- **Decision:** Render **both** a `mailto:` link and a WhatsApp link in every `<ErrorState>` "Contact support" action, using placeholder values until real ones are supplied. The values live in one constant so they can be swapped in a single edit later.
  - `SUPPORT_EMAIL = 'support@warmupventures.com'` — `// TODO(P-15): replace with real support email`
  - `SUPPORT_WHATSAPP = '+91XXXXXXXXXX'` (rendered as `https://wa.me/91XXXXXXXXXX`) — `// TODO(P-15): replace with real WhatsApp number`
  - `<ErrorState>` renders primary `<Button asChild><a href="mailto:…">Email support</a></Button>` + secondary `<Button variant="outline" asChild><a href="https://wa.me/…">WhatsApp us</a></Button>`.
- **Rationale:** Human: "add email and whatsapp with dummy data, will replace … later. Just add TODO in the code." Centralised constants keep replacement cheap.
- **Touches:** `src/lib/support-contacts.ts` (new — TWO constants + two TODO comments), `src/components/error-state/ErrorState.tsx` (consume), `.claude/issues.md § Active` (add a reminder row: "replace placeholder SUPPORT_EMAIL + SUPPORT_WHATSAPP before go-live").

### [P-16] Product analytics  ✅ resolved 2026-04-24

- **Decision:** No client-side product-analytics provider in v1.0 (Option a). Rely on backend `/interactions/log` (PRD §7.7.1) + `/analytics/*` (PRD §7.14) for product insight. No GA, no Plausible, no PostHog, no Mixpanel snippet added.
- **Rationale:** Backend already surfaces all the funnel/cohort/KPI analytics this product needs. Skipping a third-party tag avoids PII-logging regressions (card-scan flow, §7.2.1). Trivial to add later behind a flag if a specific product question demands it.
- **Touches:** None today. Future: if a provider is added, gate via a `VITE_ANALYTICS_*` flag and a thin `track(event, props)` wrapper co-located with the error reporter (§P-12 seam).

### [P-17] Session-termination policy — JWT is the single source of truth  ✅ resolved 2026-04-25

- **Decision:** The JWT's `expiresAt` is the **only** gate for session validity. The three sanctioned triggers for clearing `authStore` are:
  1. **Explicit user action** — the "Sign out" button in `<TopBar>`.
  2. **Natural expiry** — `expiresAt <= Date.now()` checked by `<RequireAuth>` on every render.
  3. **Fresh-signin failure** — when `/auth/me` fails during the initial post-verify hydration on `/signin` (so the user isn't left with a dangling session they never actually established).

  Anything else — an `/auth/me` 401 on cold start, a transient network error, a `token_expired` / `link_expired` code on any endpoint other than the signin flow — MUST NOT clear the session. This explicitly **overrides PRD §6.5 and §7.1.3's "clear on 401" prescription**. We take this override because a browser refresh should never log the user out while the JWT is still valid: a flaky backend, a cold service worker, a dev-mode MSW state reset, or any other transient issue is not a reason to destroy the session.

  **What changed to enforce this:**
  - `src/api/client.ts` — the axios response interceptor no longer calls `authStore.clear()` or dispatches `auth:expire` on 401 / `token_expired` / `link_expired`. It still rethrows the `ApiError` so individual callers (like the signin verify handler) can react if they need to.
  - `src/auth/require-auth.tsx` — removed the `auth:expire` event listener. The only check remaining is `token && expiresAt > Date.now()`, evaluated on every render.
  - `src/auth/profile-gate.tsx` — removed the "if /auth/me returns 401, clear + redirect to /signin" branch. On any `/auth/me` failure, ProfileGate falls back to the persisted `user` snapshot from `zustand/persist`. Navigation to `/onboarding/profile` still fires when `user.profile_complete === false` (driven by the snapshot, not the failed response).
  - `src/test/msw-fixtures/auth-handlers.ts` — MSW now encodes the phone into the mock token (`msw-jwt.<base64url(phone)>`) and decodes it on every authenticated handler. This makes the dev-mode mock stateless, so a browser refresh in dev + MSW recovers the session correctly (the token itself carries the identity claim).
  - Regression tests: `src/api/client.test.ts` asserts that 401 / `token_expired` / `link_expired` DO NOT clear the auth store; `src/auth/profile-gate.test.tsx` asserts that a 401 from `/auth/me` leaves the user on `/dashboard` (not `/signin`).

- **Rationale:** Human direction (2026-04-25): "on refresh, I don't want to terminate the user session and log out the user. Logout should be handled by the JWT token." A JWT already carries its own expiry; clearing the store on every 401 means a backend hiccup behaves worse than the JWT's design intent. Making the JWT `expiresAt` authoritative simplifies the mental model and removes two silent side-effects from the interceptor + router code paths.

- **Touches:** `src/api/client.ts`, `src/auth/require-auth.tsx`, `src/auth/profile-gate.tsx`, `src/test/msw-fixtures/auth-handlers.ts`, new tests `src/api/client.test.ts` + `src/auth/profile-gate.test.tsx`. Also implicitly changes the backend's expectations: when the backend wants to force a client-side logout (e.g. a hard token revocation), it must either (a) let the JWT naturally expire, or (b) expose a distinct server-side signal that we plumb through explicitly. No such signal exists today — when it does, open a fresh P-N item.

### [P-18] Post-signin landing → /dashboard for every role  ✅ resolved 2026-04-25

- **Decision:** After a successful OTP verify (and successful `/auth/me` hydration), every role lands on `/dashboard`. The PRD §10.2 role-default-route map (`admin → /admin`, `lp → /search`, `startup_inprogress → /pitch`, …) is **no longer used** for the signin landing or for the `/` cold-start redirect. The same rule applies whenever a signed-in user navigates to `/`.

  **What still uses the role-based map:** post-onboarding workflow continuation only — `nextRouteAfterProfile()` still routes LP/PotentialLP to `/onboarding/lp-profile` and other roles to their workflow home (`/search`, `/pitch`, `/connections/pending`). That's a continuation of an in-progress flow, not a fresh login. The `defaultHomeFor(role)` helper that powers the LP-profile Skip button continues to use the map. They are renamed inside `post-signin-navigate.ts` to `POST_ONBOARDING_BY_ROLE` to make the scope unambiguous.

  **What changed in code:**
  - `src/features/auth/lib/post-signin-navigate.ts` — `nextRouteForUser()` now returns `'/dashboard'` for every role with `profile_complete=true` (and `'/onboarding/profile'` when the profile isn't complete).
  - `src/app/routes/HomePage.tsx` — when the visitor is signed in, redirects unconditionally to `/dashboard` instead of looking up the role map.
  - `src/features/auth/routes/SignInPage.test.tsx` — updated the integration test to assert navigation to `/dashboard` post-OTP-verify.

- **Rationale:** Human direction (2026-04-25): "Every user when doing manual login must redirect to dashboard page." A consistent landing surface for every persona is easier to design, document, and onboard against. Role-specific workflow homes remain reachable from the sidebar at any time. **This explicitly overrides PRD §10.2's role-home prescription** — when the PRD is next updated it should be reconciled against P-18.

- **Touches:** `src/features/auth/lib/post-signin-navigate.ts`, `src/app/routes/HomePage.tsx`, `src/features/auth/routes/SignInPage.test.tsx`. No backend coordination needed.

### [P-19] Lazy-split every new feature route by default  ✅ resolved 2026-04-25

- **Decision:** Every feature page route under `/onboarding/*`, `/admin/*`, and the dashboard outlet (`/search`, `/pitch`, `/mis`, `/schedule`, `/travel`, `/matchmaking`, `/profile-viewers`, `/connections`, `/connections/pending`, `/admin/...`) is wrapped in `React.lazy(() => import('@/features/<x>/routes/<X>Page').then((m) => ({ default: m.<X>Page })))` at module scope in `src/app/router.tsx`. The route element is wrapped in a small `<Susp>` helper that mounts a `<Suspense fallback={<PageLoader />}>` boundary. Eager-loaded routes are limited to the auth shell and the small static pages: `HomePage`, `SignInPage`, `DashboardPage` (default landing per P-18 — must paint instantly), `ExpiredPage`, `UnauthorizedPage`, `NotFoundPage`, `ComingSoonPage`. The previous per-render `Lazy({ importer })` helper was removed — `React.lazy` MUST be hoisted to module scope so it de-dupes module loads across navigations.

  **Why:** Bundle observability. Stage 1 main chunk was 239 KB gzip; Stage 2 had crept to 312 KB after just three features (auth, search, admin-connections) — already over the queue.md Stage 5 target of < 300 KB. Without lazy-splitting now, Stage 3/4 would have added another ~18 features × 20–30 KB and the initial chunk would have ballooned to ~700 KB by `v1.0`. Per-feature delta visibility matters more than a clean bundle at the end.

  **What changed:** `src/app/router.tsx` — `SearchPage`, `AdminConnectionsPage`, `CompleteProfilePage`, `LPProfilePage`, `AdminHomePlaceholder` are now lazy. Added a `<Susp>` wrapper. Removed the per-render `Lazy({ importer })` anti-pattern. Also added `future: { v7_relativeSplatPath: true, v7_startTransition: true }` to `createBrowserRouter` (and to the `MemoryRouter` in `src/test/{test-utils,hook-utils}.tsx`) to silence the v7 future-flag warnings — cosmetic.

  Bundle delta on the commit that introduced P-19: main chunk **312 KB → 285.77 KB gzip** (–26 KB), with five feature chunks materialising separately (SearchPage 3.91 KB, AdminConnectionsPage 22.35 KB, LPProfilePage 1.79 KB, CompleteProfilePage 1.15 KB, AdminHomePlaceholder + skeleton trivial). 70/70 tests still green.

  **Future-session rule:** When you add a new feature route in Stage 3+, edit `src/app/router.tsx` and add a `const NewPage = lazy(() => import('@/features/<x>/routes/<X>Page').then((m) => ({ default: m.<X>Page })));` plus a `<Susp><NewPage /></Susp>` route element. Do not import the page eagerly. After every feature commit, watch the build output and confirm the per-feature chunk shows up separately and the main chunk's gzip size hasn't regressed by more than 5 KB.

- **Rationale:** Human direction (2026-04-25): "Either move route-level lazy splitting forward — wrap SearchPage, AdminConnectionsPage, LPProfilePage in lazy() now (15-minute Edit) → Stage 1's 239 KB target probably restored." Cheap, prevents continued growth, keeps per-feature deltas accurate. Originally queued for Stage 5 (`queue.md § Stage 5 — bundle-size`); pulled forward.

- **Touches:** `src/app/router.tsx`, `src/test/test-utils.tsx`, `src/test/hook-utils.tsx`. Future feature sessions add one more `lazy()` line per feature route.

### [P-20] Partner role can search startups (with strict field masking)  ✅ resolved 2026-04-25

- **Decision:** `partner` role IS admitted to `POST /search` and to the frontend `/search` route. Backend strips response fields per `_STARTUP_VISIBLE_FIELDS["partner"]` and `_LP_VISIBLE_FIELDS["partner"]` so partners see ONLY enough information to identify a startup and decide whether to send an in-platform connection request — never enough to reach out off-platform.

  **Allowed fields (startup target):** `user_id`, `name`, `company_name`, `sector`, `stage`, `one_liner`.

  **Withheld for partners (startup target):** `organisation`, `designation`, `avatar_url`, `description`, `traction`, `funding_target_cr`, `similarity_score`, `ai_rank`, `ai_reason`. Reasoning: descriptions and traction frequently embed founder bios + contact hints; avatar_url enables reverse-image search → LinkedIn → DM; AI signals leak matchmaking internals.

  **Allowed fields (LP target):** `user_id`, `name`, `fund_name`, `sectors`. (Partner LP search is unusual — partner workflow is startup discovery — but if GPT-4o classifies a query as LP-targeted the response must still parse.)

  **Withheld for partners (LP target):** `organisation`, `designation`, `avatar_url`, `aum_cr`, `cheque_range_min`, `cheque_range_max`, `stages`, `geography`, `co_invest_interest`, `similarity_score`, `ai_rank`, `ai_reason`.

  **The only escalation path:** partner sends `POST /connections/request` (admin-gated). On accept, contact details are unlocked through the standard accepted-connection flow.

- **Rationale:** Originally I flagged a Stage 2 inconsistency: backend rejected partner with 403, but the frontend `NAV_ITEMS.search` + `CAPABILITIES.search.use` listed partner, leading to a broken UX where the sidebar showed "Search" → click → /unauthorized. PRD §4 + §10.2 had always intended partner to access search "with limited fields". Two options to reconcile: (A) align frontend with backend by removing partner from search entirely, or (B) align backend with PRD intent by relaxing `_SEARCH_ROLES` and adding masked allowlists. Human chose (B) — partners can search but never see anything that enables off-platform outreach.

- **Touches (backend, `one-community-1`):**
  - `modules/search/router.py` — `_SEARCH_ROLES` includes `"partner"`.
  - `modules/search/service.py` — `_STARTUP_VISIBLE_FIELDS["partner"]` and `_LP_VISIBLE_FIELDS["partner"]` allowlists added.
  - `tests/search/test_role_masking_default.py` — `test_partner_startup_view_is_minimal` + `test_partner_lp_view_is_minimal` added.
  - `tests/search/test_router.py` — `test_search_partner_role_admitted_and_masked` added.
  - All 42/42 search tests pass.
- **Touches (frontend, this repo):**
  - `src/app/router.tsx` — `<RoleGuard>` for `/search` includes `'partner'`.
  - `src/lib/role-capabilities.ts` — already correct (`'partner'` in both `CAPABILITIES.search.use` and `NAV_ITEMS.search.roles`); no change needed.
  - `docs/frontend_prd.md` — §7.4.1 "Required roles" and "Partner role role-masking" updated; §8.12.3 split into startup-target and LP-target rows for partner.
- **Verification:** Sign in as the partner seed user (`+911234567897`), navigate to `/search`, submit any query, and observe the result cards rendering only `name`, `company_name`, `sector`, `stage`, `one_liner`. The "Request to Connect" button remains visible — that is the intended escalation path.
- **Future-session rule:** Any new endpoint that returns startup or LP profile data for partners MUST be reviewed against the same off-platform-outreach test: do any returned fields enable email / LinkedIn / phone / website lookup outside the platform? If yes, withhold them.

### [P-21] Crunchbase-style masking UX + partner-monetisation hook  ✅ resolved 2026-04-25

- **Decision:** Replace the original "hide rows for missing fields" UX (the default partner experience after P-20 landed) with a Crunchbase-style locked-card UX. Partner viewers see the FULL card layout — every withheld field renders a `<LockedField>` placeholder (label + blurred bars at the position the real value would occupy), and every masked card ends with a `<MaskedCardFooter>` panel offering two CTAs: **Request to connect** (the canonical in-platform escalation path) and **Upgrade for full access** (placeholder for the partner-monetisation flow). The backend allowlists from P-20 are unchanged — the data on the wire stays minimal; only the rendering behaviour changes.

  **Why:** Hide-on-missing made the partner experience feel broken — sparse cards with no signal that data was withheld vs genuinely missing. Crunchbase-style masking communicates "the structure exists, the data is gated" and surfaces a path to unlock. It also gives us a place to plug the partner-monetisation flow when product is ready.

  **What changed in code:**
  - New: `src/features/search/components/LockedField.tsx` — generic blurred-placeholder primitive with `lines` and optional `label` + `tone` props.
  - New: `src/features/search/components/MaskedCardFooter.tsx` — escalation panel rendered at the bottom of each masked card. "Request to connect" calls `useLogInteraction` + a TODO toast for now; will wire to `POST /connections/request` when Stage 3 connections lands. "Upgrade for full access" is a placeholder that toasts "Partner upgrade coming soon".
  - Modified: `src/features/search/components/ResultCard.tsx` — accepts an `isMasked` prop. New `<FieldOrLocked>` helper picks between rendering the real value (when present), a `<LockedField>` (when masked + missing), or `null` (when not masked + missing). Footer renders only when `isMasked === true`.
  - Modified: `src/features/search/routes/SearchPage.tsx` — derives `isMasked = role === 'partner'` via `useRole()` and passes through to every `<ResultCard>`.
  - Modified: `src/lib/role-capabilities.ts` — added `'partner'` to `CAPABILITIES['connections.request']` because P-20's "only escalation path is connection-request" needs the capability map to agree. The frontend now matches backend behaviour for partner→`POST /connections/request`. (The actual connections feature ships in Stage 3; the capability is registered ahead of time so the masked-footer button can call `can('partner', 'connections.request')` correctly.)
  - Modified: `src/lib/role-capabilities.test.ts` — inverted the partner-excluded-from-connections.request regression to assert the inverse + added an advisor-cannot-request-connections regression so the new permission set is locked in.
  - Modified: `src/features/search/routes/SearchPage.test.tsx` — added a partner viewer smoke test asserting the locked-footer (`Connect to unlock` + Request to connect + Upgrade buttons) renders + withheld values (`3 pilot banks`, `Strong match on sector`) do NOT leak into the DOM.
  - Modified: `src/features/search/components/SearchBar.tsx` — placeholder copy updated from "e.g. fintech seed-stage startups in Bangalore" to **"Ask me about Warmup Ventures data"** per human direction (mirrors the Crunchbase ask-me-anything pattern).
  - Modified: `CLAUDE.md` §3.5 (Role-masked fields) and §15 (Auth & data model — Partner role line) — both rewritten to reflect the blur-not-hide rule, the escalation + monetisation paths, and the `<ResultCard isMasked>` plumbing.

- **Rationale:** Human direction (2026-04-25): "for partner search or any future masked search let's implement it like crunchbase has done. We display the full content, but mask/blur the important metadata from the partner which can result in them contacting the startup outside our platform. For partners, we will have monetisation if they need the full results later."

- **Touches:** `src/features/search/components/{LockedField,MaskedCardFooter,ResultCard,SearchBar}.tsx`, `src/features/search/routes/SearchPage.{tsx,test.tsx}`, `src/lib/role-capabilities.{ts,test.ts}`, `CLAUDE.md` §§ 3.5 and 15. All four gates green.

- **Future-session rule:** Every NEW surface that renders partner-visible profile data (profile-view, suggestion cards, digest summaries, anywhere) MUST follow the same `isMasked` plumbing — the page derives `role === 'partner'`, and the rendering component swaps `null`-on-missing for `<LockedField>` + `<MaskedCardFooter>`. The "Request to connect" CTA must remain visible on every masked surface, since it's the canonical escalation path. Until the partner-monetisation flow is built, the "Upgrade" button toasts "Partner upgrade coming soon" — when product is ready, wire it to the upgrade route in a single place (`<MaskedCardFooter>`).

### [P-22] User-facing `/me/digest/*` backend shipped — `/digest` blocker page can be replaced  ✅ resolved 2026-04-26

- **Decision:** Backend now exposes three user-facing endpoints under `/api/v1/me/digest/*` (PRD §7.13.5–7.13.7). The `/digest` placeholder/blocker page in the frontend can now be replaced with the real Recent + Preferences UI — the Phase-4 banner stays only for the WhatsApp delivery channel, not for the data layer.
- **What's in the backend (one-community-1, this commit):**
  - `db/migrations/versions/0002_users.py` — added two columns to `users`: `digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (...)` and `interest_tags JSONB NOT NULL DEFAULT '[]'::jsonb`. Pre-prod policy = edit migration in place; existing dev DBs need a rebuild OR a one-off `ALTER TABLE` (see Migration Notes below).
  - `db/repositories/user_repo.py` — added `digest_frequency` + `interest_tags` to `ALLOWED_UPDATE_FIELDS`; introduced `JSONB_UPDATE_FIELDS` for safe `::jsonb` casts.
  - `db/repositories/audit_repo.py` — new `get_user_digests(user_id, limit, cursor_sent_at)` — cursor by `sent_at`, fetches `limit + 1` for next-page detection, filters out non-`sent` rows.
  - `modules/digest/me_service.py` — three callables: `list_my_digests`, `get_my_preferences`, `update_my_preferences`. Tag normalisation = trim + lowercase + dedupe + sort. For LP / potential_lp roles, `interest_tags` is mirrored to `lp_profile.interest_tags` via `lp_repo.upsert()` so the existing weekly digest generator (`modules/digest/service.py:50`) continues to honour them.
  - `modules/digest/me_router.py` — three FastAPI routes; uses `require_role(...)` with all 10 roles (every authenticated user owns their preferences).
  - `modules/digest/me_schemas.py` — Pydantic models with `Literal['weekly','monthly','paused']` for frequency and `ConfigDict(extra='forbid')` on the PUT body.
  - `main.py` — wired `digest_me_router` under `/api/v1`.
  - Tests: 16 new in `tests/digest/test_me_service.py` + 12 new in `tests/digest/test_me_router.py`. Full digest suite: **50/50 pass**, ruff clean.
- **What stays Phase-4:** the WhatsApp / email delivery channel that consumes `frequency` and the new digest-fan-out worker. The frontend can persist `monthly` / `paused` today; the backend cron will start honouring those values when the channel ships. Show a subtle hint under the radio: *"Active when WhatsApp delivery launches."*
- **Migration notes (read before running locally):**
  - The dev DB already exists from earlier work, so `make migrate-dev` would normally error on the column-already-exists path if the migration body had been re-run. The pre-prod migration policy (CLAUDE.md) edits `0002_users.py` in place, so the safe path is **either** (a) drop + recreate the dev DB once (`scripts/seed_data.py` re-seeds in seconds), **or** (b) run a one-off `ALTER TABLE users ADD COLUMN digest_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('weekly','monthly','paused')); ALTER TABLE users ADD COLUMN interest_tags JSONB NOT NULL DEFAULT '[]'::jsonb;` directly. Production rebuild from-scratch picks up the columns automatically.
  - Pre-existing environment quirk: `make migrate-dev` currently errors on a SQLAlchemy / Python 3.13 incompatibility that affects alembic boot. This is **not** caused by my migration edit — same error reproduces on `git stash`. The unit tests don't need alembic to run; the alembic blocker can be addressed separately.
- **Frontend follow-up (next session — see Stage 5.3 prompt added to plan.md):** wire 3 typed endpoint functions in `src/api/endpoints.ts`, 2 React Query hooks, replace `/digest` page with Recent list + Preferences form. The blocker card and Phase-4 channel banner can be removed once the real UI ships; only the small "Active when WhatsApp delivery launches" hint stays under the frequency radio.
- **Touches (frontend):**
  - `docs/frontend_prd.md` — §7.13.5 / §7.13.6 / §7.13.7 added with full contracts.
  - To be touched in the next session: `src/api/endpoints.ts`, `src/api/query-keys.ts`, `src/features/digest/{schemas,hooks,components,routes}/*`, `src/test/msw-fixtures/digest-handlers.ts`.
- **Why this got a P-N instead of being treated as a routine new feature:** Stage 4 was already declared complete; the `/digest` user-facing page was deliberately deferred behind a placeholder. Shipping the backend + replacing the placeholder is a deliberate Stage-4-fix (not a Stage 5 polish item) because the placeholder UX leaks an internal "Phase 4 — blocked" framing to end users.

_(Further P-N items added below as mid-build decisions are made. Keep sequential order.)_

<!--
Example of what this section will look like after Stage 0:

### [P-1] Brand colours  ✅ resolved 2026-04-24
- **Decision:** Primary `#2563EB` (blue-600). Accent `#16A34A` (green-600). Error `#DC2626` (red-600). Neutral palette from shadcn zinc.
- **Rationale:** Matches Warmup Ventures website; no dark-mode in v1.
- **Touches:** tailwind.config.ts theme.extend.colors; every shadcn component default.

### [P-2] Backend URL (dev)  ✅ resolved 2026-04-24
- **Decision:** `http://localhost:8000/api/v1`
- **Rationale:** Default FastAPI uvicorn. Set in `.env.development` as `VITE_API_BASE_URL`.
- **Touches:** .env.development, src/lib/env.ts.

### [P-3] Seed user phone numbers  ✅ resolved 2026-04-24
- **Decision:** Use these seeded phones from backend/scripts/seed_data.py:
  - Admin: `+919999999901`
  - LP: `+919999999902`
  - Potential LP: `+919999999903`
  - VC: `+919999999904`
  - Startup funded: `+919999999905`
  - Startup in-progress: `+919999999906`
  - Partner: `+919999999907`
  - Advisor: `+919999999908`
  - All OTPs are `000000` in dev.
- **Rationale:** Matches backend dev seed data.
- **Touches:** .claude/decisions.md reference only; no code.
-->
