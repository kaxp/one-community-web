# Frontend PRD — One Community Dashboard

> **Status:** v1.0 — Self-sufficient frontend blueprint. Derived from `/docs/prd.md` (v1.0), `/docs/techspec.md` (v1.0), `/CLAUDE.md`, and the live backend code as of **2026-04-23**.
>
> **Audience:** Frontend engineers and AI code agents (Claude Sonnet / Opus) building the `warmupventures.com` web client without access to backend source.
>
> **How to use this document:** Treat every API contract, role matrix, and JSON sample as authoritative. If this document and a random online tutorial disagree, this document wins. If you believe a contract is wrong, confirm with a backend engineer before changing anything — do not guess.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Personas](#2-user-personas)
3. [User Journeys](#3-user-journeys)
4. [Feature → Screen Mapping](#4-feature--screen-mapping)
5. [UI States (loading / empty / error / success)](#5-ui-states)
6. [Frontend Architecture](#6-frontend-architecture)
7. [API Contracts](#7-api-contracts)
8. [Frontend Data Models](#8-frontend-data-models)
9. [Authentication Flow](#9-authentication-flow)
10. [UI Structure, Navigation & Components](#10-ui-structure-navigation--components)
11. [Edge Cases](#11-edge-cases)
12. [Execution Plan](#12-execution-plan)
13. [Risks & Backend Gaps](#13-risks--backend-gaps)

---

## How to use this PRD (single-Opus autonomous mode)

This document is structured to be **read selectively**, not end-to-end. A single Claude Opus 4.7 session implementing one feature should load ~500–800 lines of PRD context — not the whole 6,800-line doc.

| Task                             | Load from this PRD                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Building a feature               | §7.X (endpoint contract) · §8.X (types for the feature) · §8.12 (field transforms) · §13.2 Gx if the endpoint is a gap |
| Setting up the project / chassis | §6.1 (stack) · §6.2 (folders) · §6.3–§6.5 (data flow, networking) · §6.7 (Execution Panel) · §6.8 (debug dock)         |
| Reviewing / QA pass              | §5 (UI states) · §7.X (contracts touched) · §11 (edge cases) · §13.4 (gap PR gates) · `frontend_claude.md §10` (DoD)   |
| Planning / screen lookup         | §2 (roles) · §3 (journeys) · §4 (screen map) · §10 (nav/routes) · §12 (execution plan)                                 |

**Section ID convention:** references use `§7.6.1` (section 7, subsection 6.1). Every `§n.x` reference is a stable anchor.

**Operating protocol:** see `frontend_claude.md §0.1` for the single-Opus autonomous workflow, `.claude/` file protocol, human-input banner, and session startup/shutdown rules.

---

# 1. Product Overview

**One Community** is Warmup Ventures' internal community platform. It is a **role-based dashboard** that connects Startups, LPs (Limited Partners), VCs, Service Partners, Advisors, and Admins.

The platform is currently operating in **Phase 6** (backend complete). WhatsApp (WATI) integration is _deferred_ to Phase 4 (see §10.5 — WATI Fallback). Until WATI goes live, **every WhatsApp capability must be exposed and testable through the web UI**.

## 1.1 What the frontend is responsible for

| Concern                                                     | Frontend owns                | Backend owns               |
| ----------------------------------------------------------- | ---------------------------- | -------------------------- |
| UI for all 60+ endpoints across 14 modules                  | ✅                           | —                          |
| RBAC gating (hide / disable / block)                        | ✅ (mirrors backend)         | ✅ (enforces)              |
| Form validation (field-level)                               | ✅                           | ✅ (authoritative)         |
| JWT storage & attach to every request                       | ✅                           | —                          |
| OTP/session lifecycle + expiry messaging                    | ✅                           | ✅ (issues)                |
| Search query UX, pagination, filters                        | ✅                           | ✅ (3-stage pipeline)      |
| File uploads (card image, pitch audio, deck, MIS)           | ✅ (multipart or signed URL) | ✅ (Drive / OCR / Whisper) |
| Real-time display of AI job state (pitch eval, matchmaking) | ✅ (poll `job_id`)           | ✅ (Celery)                |
| WhatsApp delivery                                           | —                            | ✅ (Phase 4 only)          |

## 1.2 Headline features

1. **Mobile-number OTP login** (no password, no signup form)
2. **Natural-language semantic search** (LP → startup, startup → LP) with 3-stage AI ranking
3. **Business-card scan + AI onboarding** (Google Vision OCR + Whisper + GPT-4o)
4. **Startup pitch submission** (audio/video + follow-up questions)
5. **Connections workflow** (request → admin approval → target accept/decline)
6. **Weekly matchmaking** (AI-scored, admin-approved, user-responds)
7. **Digest management** (LP / VC / Partner — email primary, WA in Phase 4)
8. **MIS collection** (monthly portfolio report pre-filled from last month)
9. **Meeting scheduling** (Google Calendar slots)
10. **Travel plans** (home city + trip-based matchmaking alerts)
11. **Admin console** (connections queue, dead-letter jobs, quarterly reports, LP funnel, analytics)
12. **Analytics** (LP funnel, startup funnel, connection funnel, cohort, match success)

## 1.3 Scope boundaries

| In scope (frontend)                                      | Out of scope (frontend)          |
| -------------------------------------------------------- | -------------------------------- |
| Web dashboard at `warmupventures.com`                    | WhatsApp bot UI                  |
| Responsive desktop + mobile (≥ 375px viewport)           | Mobile native apps               |
| All authenticated roles                                  | Public marketing site (separate) |
| All backend modules with routers registered in `main.py` | Any endpoint not listed in §7    |

## 1.4 Environment / API base

- **Development base URL:** `http://localhost:8000/api/v1`
- **Production base URL:** Supplied via `VITE_API_BASE_URL` env var
- **All endpoints** (except `/health` and `/metrics`) live under the prefix `/api/v1`
- **All timestamps** are `TIMESTAMPTZ` — ISO-8601 strings in UTC unless the field name ends in `_date` (which is `YYYY-MM-DD`)
- **All IDs** are UUIDs unless otherwise specified

---

# 2. User Personas

Ten roles exist in the system (DB ENUM `user_role`). Each sees a **different navigation** and **different fields** on shared screens.

## 2.1 Role matrix

| Role                  | Role key             | Channel                    | Access tier                                                       |
| --------------------- | -------------------- | -------------------------- | ----------------------------------------------------------------- |
| Admin                 | `admin`              | Web + Email + WA (Phase 4) | Full — all modules                                                |
| Super Admin           | `super_admin`        | Web + Email + WA (Phase 4) | Full + system ops (DLQ, envs)                                     |
| Limited Partner       | `lp`                 | Web + Email + WA (Phase 4) | Search, connections, digest, profile, card-scan, schedule, travel |
| Potential LP          | `potential_lp`       | Web + Email + WA (Phase 4) | Same as LP — funnel stage differs                                 |
| Venture Capitalist    | `vc`                 | Web + Email + WA (Phase 4) | Search, connections, digest, card-scan, schedule, travel          |
| Startup (Funded)      | `startup_funded`     | Web + Email + WA (Phase 4) | LP search, pitch, MIS, connections                                |
| Startup (In Progress) | `startup_inprogress` | Web + WA (Phase 4)         | Pitch, documents, schedule, MIS                                   |
| Startup (Onboarded)   | `startup_onboarded`  | Web + WA (Phase 4)         | Pitch, documents only                                             |
| Service Partner       | `partner`            | Web + Email + WA (Phase 4) | Limited startup search (no contact details), schedule, travel     |
| Advisor               | `advisor`            | Web + Email + WA (Phase 4) | Connections respond, schedule, travel (memo review in Phase 4)    |

## 2.2 Three persona clusters

### Admin cluster (`admin`, `super_admin`)

- Full execution + monitoring
- Own pages: `/admin`, `/admin/connections`, `/admin/digest`, `/admin/matchmaking`, `/admin/quarterly-reports`, `/admin/dead-letter-jobs`, `/admin/analytics`, `/admin/lp-funnel`, `/admin/partner-referral`, `/admin/tracxn`

### Internal Operators (`advisor`)

- Limited admin-adjacent tools (deal memo review, advisor feedback)
- Most routes are Phase 4; Phase 0–3 shows a simplified home with connections respond and schedule

### External Users (`lp`, `potential_lp`, `vc`, `startup_*`, `partner`)

- Clean, task-focused UI
- No "system" data visible (no DLQ, no analytics, no retry buttons)
- Deep-link token entry via email/WA link **or** direct OTP session

## 2.3 Profile state (critical for routing)

Every user has a `profile_complete: boolean` flag returned by `GET /auth/me`. If `false`, the app routes them to `/onboarding/profile` before they can access role-specific screens. This is a frontend guard; the backend also enforces it on profile-gated endpoints.

---

# 3. User Journeys

The end-to-end flows, step by step.

## 3.1 Journey — First-time login (OTP)

```
User lands on /            → Homepage (public)
User clicks "Sign in"      → /signin
User enters phone           → POST /auth/otp/send
    · HTTP 200 → OTP screen appears
    · HTTP 400 "not_registered" → "Contact Warmup Ventures" screen
User enters 6-digit OTP     → POST /auth/otp/verify
    · DEV: 000000 always works (DEV_OTP_BYPASS)
    · HTTP 200 → store JWT, call GET /auth/me, route
    · HTTP 401 "otp_invalid" → show error, keep on OTP screen
    · HTTP 429 → "too many attempts, try later"
Profile incomplete          → /onboarding/profile
Profile complete            → /dashboard (role-appropriate)
```

## 3.2 Journey — Semantic search (LP searching for startups)

```
LP lands on /dashboard      → Sidebar shows "Search" link
LP clicks "Search"          → /search
LP types "fintech seed stage India" → POST /search
    · Returns target_type='startup', 10 masked cards
    · Infinite scroll via next_cursor
LP clicks a card            → /profile/{id}
    · GET /profile/{id} (role-masked)
    · POST /interactions/log {interaction_type: 'profile_view', target_id, target_type}
LP clicks "Request Connect" → Modal with 200-char note
    · POST /connections/request {target_id, message}
    · status=pending_admin
    · Toast: "Request sent, awaiting admin approval"
```

## 3.3 Journey — Admin approves a connection

```
Admin opens /admin          → GET /admin/summary
    · Sees pending_connection_count badge
Admin opens /admin/connections → GET /admin/connections?status=pending_admin
Admin clicks "Approve" on a row → PATCH /connections/{id}/admin {action:'approve'}
    · Row disappears from pending list
    · Target role is notified (email in Phase 0–3, WA in Phase 4)
    · Connection becomes status=pending_target
```

## 3.4 Journey — Target responds

```
Target logs in              → /dashboard
Target sees notification    → /connections/pending → GET /connections/pending
Target clicks "Accept"      → PATCH /connections/{id}/respond {action:'accept'}
    · status=accepted
    · Both users see each other's role-masked contact details
    · A connection_intro row is created
Later, feedback prompt      → POST /interactions/feedback {intro_id, response:'yes'|'no'}
```

## 3.5 Journey — Startup submits pitch

```
Founder logs in (role=startup_inprogress or _onboarded)
Founder opens /pitch        → GET /pitch/profile (may 404 on first visit)
Founder fills profile form  → POST /pitch/profile (StartupProfileRequest)
Founder uploads deck        → POST /pitch/deck {deck_url}
    · HTTP 202 with {job_id}
    · UI shows "Evaluating..." spinner
Poll every 3s               → GET /pitch/deck/jobs/{job_id}
    · state: "PENDING"|"STARTED"|"SUCCESS"|"FAILURE"
    · On SUCCESS: show AIEvaluationResult (signal, summary, strengths, concerns)
    · On FAILURE: show retry button
```

## 3.6 Journey — Card scan (contact add)

```
Any authenticated user opens /add-user
User uploads card image     → (client-side or multipart — spec lists POST /ocr; current backend module uses POST /onboarding/card-scan with raw_text)
    · Returns parsed contact + scan_id
Duplicate check             → (client may query existing users — see §7.14 note)
User corrects fields + picks a category
User taps "Save"            → POST /onboarding/card-scan or direct user create
    · user_created: true → user_id returned
    · Backend triggers onboarding sequence (email welcome, WA in Phase 4)
```

## 3.7 Journey — Monthly MIS submission (portfolio founder)

```
Founder (role=startup_funded) opens /mis
Prefill last month           → GET /portfolio/mis/prefill
Form renders with last month's values
Founder edits                → POST /portfolio/mis (MISSubmitRequest)
    · period = "YYYY-MM"
    · HTTP 201 → "Submitted. Thanks." toast
    · HTTP 409 "mis_already_submitted" → explain to user
```

## 3.8 Journey — Meeting scheduling

```
User opens /schedule        → GET /schedule/slots?from_date=&days=7
UI renders a calendar grid
User picks a slot + target  → POST /schedule/book {target_id, scheduled_at, duration_minutes, purpose}
    · On success: booking confirmation card
    · On conflict: "That slot is no longer available — pick another"
User sees their bookings    → GET /schedule/bookings
User cancels                → DELETE /schedule/book/{id}
```

## 3.9 Journey — Weekly matchmaking (LP responding)

```
Monday morning email        → "You have 3 new suggestions"
LP logs in                  → /matchmaking
GET /matchmaking/suggestions → list of {id, startup details, score, reason}
LP taps "Interested"         → POST /matchmaking/suggestions/{id}/respond {action:'accepted'}
    · Recorded; on mutual interest, auto-creates a connection_request (admin-gated)
LP taps "Skip"               → action='skipped' — suggestion hidden
```

## 3.10 Journey — Admin dispatches a digest

```
Admin opens /admin/digest    → GET /digest/pending (auto-generated drafts)
Admin opens a draft          → Preview content JSON
Admin clicks "Approve & Send" → POST /digest/approve {digest_id}
    · Backend sends email to segment; WA in Phase 4
    · Row appears in GET /digest/history
```

---

# 4. Feature → Screen Mapping

Full screen inventory with their primary APIs and the roles that can access them. Use this table as the master route spec. Routes are the **frontend routes**, not backend paths.

| #                  | Screen / Route                                                  | Primary APIs                                                                                                             | Allowed roles                                                                                     |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1                  | `/` (Homepage)                                                  | —                                                                                                                        | Public                                                                                            |
| 2                  | `/signin`                                                       | `POST /auth/otp/send`, `POST /auth/otp/verify`                                                                           | Public                                                                                            |
| 3                  | `/dashboard`                                                    | `GET /auth/me` + role-router                                                                                             | All authenticated                                                                                 |
| 4                  | `/onboarding/profile`                                           | `PATCH /onboarding/profile`                                                                                              | All authenticated (when `profile_complete=false`)                                                 |
| 5                  | `/onboarding/lp-profile`                                        | `POST /onboarding/lp-profile`                                                                                            | `lp`, `potential_lp`, `admin`, `super_admin`                                                      |
| 6                  | `/add-user`                                                     | `POST /onboarding/card-scan`, `GET /onboarding/card-scan/{id}`                                                           | All authenticated (exposed to `lp`, `vc`, `admin`, `super_admin` in nav)                          |
| 7                  | `/search`                                                       | `POST /search`                                                                                                           | `lp`, `potential_lp`, `vc`, `startup_funded`, `partner` (limited fields), `admin`, `super_admin`  |
| 8                  | `/profile/:id`                                                  | `GET /profile/{id}` (spec §4.4 — NOT currently exposed as router; see §13 gap), `POST /interactions/log`                 | Any searcher role                                                                                 |
| 9                  | `/connections`                                                  | `GET /connections?limit&cursor`                                                                                          | All authenticated                                                                                 |
| 10                 | `/connections/pending`                                          | `GET /connections/pending?limit&cursor`                                                                                  | All authenticated                                                                                 |
| 11                 | `/pitch`                                                        | `GET /pitch/profile`, `POST /pitch/profile`, `POST /pitch/deck`, `GET /pitch/deck/jobs/{id}`                             | `startup_inprogress`, `startup_onboarded`, `startup_funded`, `admin`, `super_admin`               |
| 12                 | `/documents`                                                    | (Phase 4 — placeholder screen; uses deep-link token, uploads via Drive)                                                  | Startup roles, `admin`                                                                            |
| 13                 | `/mis`                                                          | `GET /portfolio/mis`, `GET /portfolio/mis/prefill`, `POST /portfolio/mis`                                                | `startup_funded`, `admin`, `super_admin`                                                          |
| 14                 | `/schedule`                                                     | `GET /schedule/slots`, `POST /schedule/book`, `GET /schedule/bookings`, `DELETE /schedule/book/{id}`                     | All authenticated                                                                                 |
| 15                 | `/travel`                                                       | `POST /travel/plans`, `GET /travel/plans`, `DELETE /travel/plans/{id}`, `PUT /travel/home-city`                          | All authenticated                                                                                 |
| 16                 | `/matchmaking`                                                  | `GET /matchmaking/suggestions`, `POST /matchmaking/suggestions/{id}/respond`                                             | `startup_funded`, `lp`, `potential_lp`, `vc`, `admin`, `super_admin`                              |
| 17                 | `/profile-viewers` ("Who viewed me")                            | `GET /interactions/profile-viewers`                                                                                      | All authenticated                                                                                 |
| 18                 | `/digest` (user-facing)                                         | `GET /me/digest/recent`, `GET /me/digest/preferences`, `PUT /me/digest/preferences`                                      | All authenticated (most useful to LP / Potential LP / VC / Startup Funded / Partner) — per [P-22] |
| **Admin screens**  |                                                                 |                                                                                                                          |                                                                                                   |
| 19                 | `/admin`                                                        | `GET /admin/summary`                                                                                                     | `admin`, `super_admin`                                                                            |
| 20                 | `/admin/connections`                                            | `GET /admin/connections`, `PATCH /connections/{id}/admin`                                                                | `admin`, `super_admin`                                                                            |
| 21                 | `/admin/digest`                                                 | `GET /digest/pending`, `GET /digest/history`, `POST /digest/generate`, `POST /digest/approve`, `POST /admin/digest/send` | `admin`, `super_admin`                                                                            |
| 22                 | `/admin/matchmaking`                                            | `POST /matchmaking/generate`, `GET /matchmaking/jobs/{id}`, `GET /matchmaking/pending`, `POST /matchmaking/approve`      | `admin`, `super_admin`                                                                            |
| 23                 | `/admin/quarterly-reports`                                      | `GET /admin/quarterly-reports`, `POST /admin/quarterly-reports/approve`                                                  | `admin`, `super_admin`                                                                            |
| 24                 | `/admin/dead-letter-jobs`                                       | `GET /admin/dead-letter-jobs`, `POST /admin/dead-letter-jobs/{id}/retry`                                                 | `admin`, `super_admin`                                                                            |
| 25                 | `/admin/analytics`                                              | All `/analytics/*` endpoints                                                                                             | `admin`, `super_admin`                                                                            |
| 26                 | `/admin/lp-funnel`                                              | `PUT /admin/lp/{user_id}/funnel-status` (+ search to pick an LP)                                                         | `admin`, `super_admin`                                                                            |
| 27                 | `/admin/partner-referral`                                       | `POST /admin/partner-referral`                                                                                           | `admin`, `super_admin`                                                                            |
| 28                 | `/admin/tracxn` (manual ingest console + extension paired view) | `POST /enrichment/tracxn`                                                                                                | `admin`, `super_admin`                                                                            |
| 29                 | `/admin/users` (roster + find)                                  | Derived from `/search` with admin filters (spec §4.4)                                                                    | `admin`, `super_admin`                                                                            |
| **System screens** |                                                                 |                                                                                                                          |                                                                                                   |
| 30                 | `/health` (status)                                              | `GET /health`                                                                                                            | Public (optional in nav for admins)                                                               |
| 31                 | `/unauthorized`                                                 | —                                                                                                                        | All authenticated (redirect target for 403)                                                       |
| 32                 | `/expired`                                                      | —                                                                                                                        | All authenticated (redirect target for 401/token_expired)                                         |
| 33                 | `/not-found`                                                    | —                                                                                                                        | 404 fallback                                                                                      |

---

## 4.1 API call sequences per screen

For each screen, the step-by-step **Input → API → Output** sequence lives inside the endpoint's `UI flow` section in §7. Find the primary API for the screen in the table above, then jump to the corresponding §7.x for the concrete flow including success / error / polling behaviour.

Example:

- `/mis` → primary call is `POST /portfolio/mis` → see §7.9.2 `UI flow`.
- `/pitch` → primary is `POST /pitch/deck` + polling → see §7.3.3 and §7.3.4.

---

---

# 5. UI States

Every screen that fetches data must implement **all four** of these states. No exceptions.

## 5.1 Loading

- Use skeleton placeholders matching the final layout (not spinners for list rows)
- Spinners acceptable only for < 500ms inline actions (button loading state)
- Paginated lists: append-load shows a footer spinner; initial-load shows full skeletons

## 5.2 Empty

Every empty state shows:

1. An icon or illustration (use `lucide-react` icons — `Inbox`, `SearchX`, `CalendarX`, etc.)
2. A one-line explanation
3. A primary action (if applicable)

Example empty states:

| Screen                    | Empty copy                                           | Action           |
| ------------------------- | ---------------------------------------------------- | ---------------- |
| `/search`                 | "No results. Try a broader query or loosen filters." | [Clear filters]  |
| `/connections`            | "You don't have any accepted connections yet."       | [Explore search] |
| `/connections/pending`    | "No pending connection requests."                    | —                |
| `/matchmaking`            | "No suggestions this week. Check back on Monday."    | —                |
| `/schedule` (slots)       | "No available slots in the next 7 days."             | [Try 30 days]    |
| `/admin/connections`      | "No pending requests to review."                     | —                |
| `/admin/dead-letter-jobs` | "All jobs are healthy."                              | —                |

## 5.3 Error

Use the error catalogue in §11 to render a specific message. Generic "Something went wrong" is forbidden. Every error UI MUST offer one of: **Retry**, **Go back**, or **Contact support**.

- **Inline errors** (field-level): red text under the input
- **Form-level errors**: banner at top of form
- **Page-level errors**: full-page error with action button
- **Toasts**: for transient errors (rate limit, network blip) — auto-dismiss after 5s

## 5.4 Success

- List screens refetch or optimistically update
- Form submissions show a **toast** ("Saved.", "Request sent.") + navigate or close modal
- Mutations that take > 1s show a loading overlay on the affected row or button
- For long jobs (deck eval, matchmaking generate), render a live `job_id` progress card until SUCCESS

---

# 6. Frontend Architecture

## 6.1 Tech stack (mandatory — no substitutions without ADR)

| Layer                  | Choice                                                               | Why this one                                                         |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Language               | **TypeScript 5.x** (strict mode)                                     | Required for API contract safety across 60+ endpoints                |
| Framework              | **React 18.3+**                                                      | Matches backend's role-based SPA pattern; no SSR need                |
| Bundler                | **Vite 5.x**                                                         | Fast dev, simpler than Next.js for internal dashboard                |
| Routing                | **React Router v6.22+** (data routers)                               | Loader-driven data fetching, nested layouts, route-level auth guards |
| Server state           | **TanStack Query v5** (`@tanstack/react-query`)                      | Cache, retry, dedupe for 60+ endpoints; pairs with Suspense          |
| Client state           | **Zustand v4**                                                       | Auth session, UI flags only — no business state                      |
| Forms                  | **React Hook Form v7** + **Zod v3**                                  | Every payload is a Zod schema → shared with API contract             |
| HTTP                   | **Axios v1** (with interceptors)                                     | JWT injection + global error → standardised error envelope           |
| Styling                | **Tailwind CSS v3.4+**                                               | Utility-first, predictable, handles mobile breakpoints               |
| UI primitives          | **shadcn/ui** (Radix-based copy-paste)                               | Accessible, owned in-repo, themeable                                 |
| Icons                  | **lucide-react**                                                     | Consistent with shadcn/ui                                            |
| Dates                  | **date-fns v3**                                                      | Tree-shakeable, no moment                                            |
| Charts                 | **Recharts v2**                                                      | For Analytics screens (LP funnel, cohort, match success)             |
| Tables                 | **TanStack Table v8**                                                | For admin lists with sort/filter/pagination                          |
| Toasts                 | **sonner**                                                           | Lightweight, good DX                                                 |
| File upload            | **react-dropzone v14**                                               | Multipart + drag-and-drop for card/pitch/deck                        |
| Audio record           | **Native MediaRecorder API**                                         | Spec requires in-browser recording                                   |
| Tests                  | **Vitest** + **React Testing Library** + **MSW v2**                  | Unit + integration; MSW mocks backend                                |
| E2E (optional Phase 5) | **Playwright**                                                       | Cross-browser                                                        |
| Linter                 | **ESLint** + `@typescript-eslint` + `eslint-plugin-react` + Prettier | Standard TS/React rules                                              |
| Git hooks              | **husky** + **lint-staged**                                          | Pre-commit lint + type-check                                         |
| Package mgr            | **pnpm**                                                             | Fast, disk-efficient; required for workspace style later             |

## 6.2 Folder structure (exact — do not deviate)

```
one-community-web/
├── public/                           # static assets served as-is
│   └── favicon.svg
├── src/
│   ├── app/                          # app shell
│   │   ├── App.tsx                   # <RouterProvider> + <QueryClientProvider>
│   │   ├── router.tsx                # route tree (see §10)
│   │   ├── providers.tsx             # QueryClient, Theme, Toaster
│   │   └── error-boundary.tsx
│   ├── api/                          # networking layer (see §6.6)
│   │   ├── client.ts                 # axios instance + interceptors
│   │   ├── endpoints.ts              # typed function per endpoint
│   │   ├── query-keys.ts             # stable React Query keys
│   │   └── errors.ts                 # ApiError class + mapper
│   ├── auth/                         # auth module (global)
│   │   ├── auth-store.ts             # Zustand store — token, user, role
│   │   ├── use-auth.ts               # hooks: useUser, useIsAuthenticated
│   │   ├── role-guard.tsx            # <RoleGuard roles={...}>
│   │   └── otp-service.ts            # send/verify wrappers
│   ├── features/                     # one folder per feature (module) — strict
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── ResultCard.tsx
│   │   │   │   └── FilterChips.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-search.ts
│   │   │   ├── routes/
│   │   │   │   └── SearchPage.tsx
│   │   │   ├── schemas.ts            # Zod schemas for request/response
│   │   │   └── index.ts              # barrel
│   │   ├── connections/
│   │   ├── pitch/
│   │   ├── onboarding/
│   │   ├── mis/
│   │   ├── schedule/
│   │   ├── travel/
│   │   ├── matchmaking/
│   │   ├── digest/
│   │   ├── analytics/
│   │   ├── profile/
│   │   ├── interactions/
│   │   ├── enrichment/
│   │   └── admin/                    # contains /admin/* sub-routes only
│   ├── components/                   # cross-feature reusable UI
│   │   ├── ui/                       # shadcn/ui primitives (copy-paste)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── data-table/
│   │   ├── forms/
│   │   ├── empty-state/
│   │   ├── error-state/
│   │   ├── loading/
│   │   └── pagination/
│   ├── lib/                          # pure utilities (no React)
│   │   ├── env.ts                    # VITE_* env var access
│   │   ├── phone.ts                  # E.164 validation + formatting
│   │   ├── date.ts
│   │   ├── role-capabilities.ts      # role → capability map (mirrors backend)
│   │   ├── cn.ts                     # classnames helper (tailwind-merge)
│   │   └── zod-helpers.ts
│   ├── types/                        # shared types (no business logic)
│   │   ├── api.ts                    # envelope, pagination, error
│   │   ├── domain.ts                 # User, Startup, LP, Connection, ...
│   │   └── enums.ts                  # role, conn_status, interaction_type
│   ├── styles/
│   │   └── globals.css               # tailwind layers
│   ├── test/
│   │   ├── setup.ts
│   │   ├── msw-handlers.ts           # MSW handlers per endpoint
│   │   └── test-utils.tsx
│   └── main.tsx
├── .env.development                  # VITE_API_BASE_URL=http://localhost:8000/api/v1
├── .env.production
├── .env.example
├── index.html
├── tsconfig.json                     # strict: true
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
├── eslint.config.js
├── .prettierrc
├── package.json
└── pnpm-lock.yaml
```

### Rules for the folder layout

- **Each feature folder is self-contained**: `components/`, `hooks/`, `routes/`, `schemas.ts`, `index.ts`.
- **No feature imports from another feature's internals**. If two features need the same thing, promote it to `src/components/` or `src/lib/`.
- **`src/features/admin/` holds ONLY admin-specific sub-routes** (DLQ, partner referral, quarterly reports, LP funnel console). Admin _pages_ for connections and digest reuse the `connections` and `digest` features respectively via a different route path.
- **No arbitrary `utils/` folders inside features**. Everything generic goes to `src/lib/`.

## 6.3 Data flow

```
User event
   │
   ▼
Route / Component
   │ calls feature hook (e.g. useSearch)
   ▼
Feature hook
   │ uses useQuery / useMutation
   ▼
api/endpoints.ts (typed function)
   │ calls api/client.ts axios instance
   ▼
Axios interceptor
   │ attaches Authorization: Bearer <token>
   │ on response: unwraps {data, error, pagination}
   │ on 401: broadcasts auth:expire → auth-store clears → redirect /signin
   ▼
Backend API (FastAPI)
```

## 6.4 State management

| State kind                                | Where it lives               | Examples                                                                          |
| ----------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| Server state (cache, refetch, optimistic) | TanStack Query               | every GET endpoint response; user list, connections, digests                      |
| Auth session                              | Zustand `auth-store`         | `{ token, user, role, expiresAt, isAuthenticated }` + persisted to `localStorage` |
| UI ephemeral                              | React local state            | modal open, form input, wizard step                                               |
| Form state                                | React Hook Form              | before submit                                                                     |
| Route/URL state                           | React Router + search params | filters, cursor on search, active tab on admin pages                              |

**Never put server data in Zustand.** If TanStack Query can cache it, use TanStack Query. Zustand is only for auth and for cross-component UI flags (e.g. global sidebar-collapsed).

**Persist only the JWT + a minimal user snapshot** in `localStorage` under key `oc.auth`. Expire it on `exp` claim.

## 6.5 Networking layer — contract

### `api/client.ts`

```ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { env } from '@/lib/env';
import { useAuthStore } from '@/auth/auth-store';
import { ApiError } from './errors';

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL, // e.g. http://localhost:8000/api/v1
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (resp) => {
    // Backend envelope: { data, error, pagination? }
    // If error is non-null, throw even on 2xx (defence-in-depth).
    if (resp.data && resp.data.error) {
      throw ApiError.fromEnvelope(resp.data.error, resp.status);
    }
    return resp;
  },
  (err: AxiosError<{ error?: { code: string; message: string } }>) => {
    const status = err.response?.status ?? 0;
    const envelope = err.response?.data?.error;
    const apiErr = envelope
      ? ApiError.fromEnvelope(envelope, status)
      : new ApiError('network_error', 'Network error — please retry.', status);

    if (apiErr.code === 'link_expired' || apiErr.code === 'token_expired' || status === 401) {
      useAuthStore.getState().clear();
      // dispatch a navigation event — see auth-store.ts
    }
    return Promise.reject(apiErr);
  },
);
```

### `api/errors.ts`

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: string, // e.g. 'otp_invalid', 'validation_error'
    public readonly userMessage: string,
    public readonly status: number,
    public readonly detail?: unknown,
  ) {
    super(userMessage);
  }
  static fromEnvelope(env: { code: string; message: string; detail?: unknown }, status: number) {
    return new ApiError(env.code, env.message, status, env.detail);
  }
}
```

### `api/endpoints.ts` — pattern

Every endpoint is a typed function:

```ts
export async function searchUnified(body: SearchRequest): Promise<SearchResponse> {
  const resp = await apiClient.post<{ data: SearchResponse; error: null }>('/search', body);
  return resp.data.data;
}
```

### `api/query-keys.ts`

```ts
export const qk = {
  auth: { me: ['auth', 'me'] as const },
  connections: {
    list: (limit: number, cursor?: string) => ['connections', { limit, cursor }] as const,
    pending: (limit: number, cursor?: string) =>
      ['connections', 'pending', { limit, cursor }] as const,
  },
  matchmaking: {
    suggestions: ['matchmaking', 'suggestions'] as const,
    pending: ['matchmaking', 'pending'] as const,
    job: (id: string) => ['matchmaking', 'job', id] as const,
  },
  // ...
};
```

## 6.6 Env vars (Vite)

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_ENV=development          # 'development' | 'staging' | 'production'
VITE_OTP_BYPASS_HINT=true         # show "000000 works in dev" hint on /signin
VITE_SENTRY_DSN=                  # optional

# Feature flags — flip when backend catches up (see §13 for each gap)
VITE_PROFILE_V1_ENABLED=false     # GET /profile/{id} mounted server-side
VITE_OCR_SERVER_ENABLED=false     # POST /ocr (Google Vision) mounted server-side
VITE_WHISPER_SERVER_ENABLED=false # POST /pitch/transcribe mounted server-side
VITE_DOCUMENTS_UPLOAD_ENABLED=false # POST /documents/upload mounted server-side
VITE_MSW_ENABLED=true             # mount MSW handlers in dev (mocks missing endpoints)
VITE_DEBUG_PANEL=true             # enable floating debug panel in dev (§6.8)
```

Any variable exposed to the client **must** be prefixed `VITE_`. The backend `SERVER_JWT_SECRET` is **never** exposed — the frontend only sees the signed token.

---

## 6.6b Brand / design tokens (Warmup Ventures palette)

Mirrors the visual language of https://www.warmupventures.com/. Locked in `.claude/decisions.md [P-1]`. **Do not re-derive in components** — always reference the Tailwind theme tokens or shadcn CSS variables configured here.

### Palette

| Token              | Hex       | Usage                                                         |
| ------------------ | --------- | ------------------------------------------------------------- |
| `brand` / primary  | `#1F73B7` | CTAs, links, focus rings, selected tabs, active-state borders |
| `brand.hover`      | `#1A5F98` | button hover / active                                         |
| `brand.foreground` | `#FFFFFF` | text on primary surfaces                                      |
| `surface.DEFAULT`  | `#FFFFFF` | page + card background                                        |
| `surface.muted`    | `#F5F5F5` | alternating sections, panels, disabled backgrounds            |
| `border`           | `#E8E8E8` | card borders, divider lines, input borders                    |
| `ink.heading`      | `#1A1A1A` | h1–h3, prominent labels                                       |
| `ink.body`         | `#4A4A4A` | paragraphs, descriptions                                      |
| `ink.muted`        | `#666666` | captions, secondary metadata, placeholders                    |
| `success`          | `#16A34A` | success toasts, positive badges, accepted status              |
| `warning`          | `#D97706` | warnings, pending-target status                               |
| `error`            | `#DC2626` | destructive actions, failed states, form errors               |

### Typography

- **Family:** `Inter` (Google Fonts) with fallback `system-ui, -apple-system, sans-serif`. Weights `400 / 500 / 600 / 700`.
- **Load in `index.html`:** `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`.
- **Scale** (Tailwind default): `text-3xl` page h1 · `text-2xl` section h2 · `text-xl` card h3 · `text-base` body · `text-sm` caption · `text-xs` meta.
- **Weights:** `font-semibold` (600) for headings, `font-medium` (500) for buttons/labels, `font-normal` (400) for body.

### Layout primitives

- **Border radius:** `--radius: 0.5rem` (shadcn). Buttons, cards, inputs, dialogs all inherit. Pills (`rounded-full`) only for tag chips.
- **Max content width:** `max-w-screen-xl` (`1280px`). Apply on `<AppShell>` outlet container, not per-page.
- **Section spacing:** `py-12 md:py-16` between major sections on content pages; card padding `p-6`.
- **Shadows:** only shadcn `shadow-sm` for cards (`0 1px 2px rgb(0 0 0 / 0.05)`). No heavy shadows, no glassmorphism, no gradients.
- **Dark mode:** NOT in v1. Tailwind configured `darkMode: 'class'` for future — do not ship dark tokens.

### Tailwind `theme.extend` (authoritative)

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand:  { DEFAULT: '#1F73B7', hover: '#1A5F98', foreground: '#FFFFFF' },
      surface:{ DEFAULT: '#FFFFFF', muted: '#F5F5F5' },
      border: '#E8E8E8',
      ink:    { heading: '#1A1A1A', body: '#4A4A4A', muted: '#666666' },
      success:'#16A34A',
      warning:'#D97706',
      error:  '#DC2626',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    },
    borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
    maxWidth: { content: '80rem' },
  },
},
```

### shadcn CSS variables (`src/styles/globals.css`)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 10%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 10%;
    --primary: 207 71% 42%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 10%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 40%;
    --accent: 207 71% 42%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 91%;
    --input: 0 0% 91%;
    --ring: 207 71% 42%;
    --radius: 0.5rem;
  }
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

### Logo + wordmark

Top bar wordmark reads **`One Community`** (Inter 600 weight, `text-lg`, `ink.heading`). If a logo asset (SVG) is supplied in `.claude/decisions.md [P-logo]`, render it left of the wordmark at `h-8`. Otherwise render a solid-brand circular "W" glyph as a fallback.

### Application of these tokens

| UI element                 | Token                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Primary button             | `bg-brand text-brand-foreground hover:bg-brand-hover`                                                            |
| Secondary / outline button | `bg-surface border border-border text-ink-heading hover:bg-surface-muted`                                        |
| Destructive button         | `bg-error text-white hover:bg-red-700`                                                                           |
| Card                       | `bg-surface border border-border rounded-lg shadow-sm`                                                           |
| Input (idle / focus)       | `border-border focus:border-brand focus:ring-brand/20`                                                           |
| Status badges              | success → `bg-success/10 text-success`; warning → `bg-warning/10 text-warning`; error → `bg-error/10 text-error` |
| Role badge                 | colour per role via `src/lib/role-colours.ts` helper (see §13 G12 tag pattern)                                   |
| Link                       | `text-brand hover:underline`                                                                                     |
| Selected sidebar item      | `bg-brand/10 text-brand border-l-2 border-brand`                                                                 |
| Focus ring (keyboard)      | `ring-2 ring-brand ring-offset-2`                                                                                |

These mappings are the default for every shadcn component. Do not override per-component unless a specific design spec requires it.

---

## 6.7 The Execution Panel Pattern (mandatory for action screens)

Every screen that combines **a form + a mutation + a response + an error state** MUST be built on top of the `<ExecutionPanel>` abstraction. This prevents each screen from reinventing spinner/toast/error/retry behaviour differently and guarantees visual + behavioural consistency across admin ops, founder flows, and user actions.

### 6.7.1 When to use

| Use `<ExecutionPanel>`                                                                                                                                                                                 | Use a plain page                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| User submits a form and sees one response (MIS, pitch profile, card scan, connection request, DLQ retry, digest send, Tracxn ingest, matchmaking generate, quarterly report approve, partner referral) | Pure list/read screens (`/connections`, `/search`, `/admin/analytics`) |
| Admin triggers a one-shot action that produces a result (digest generate, matchmaking generate, DLQ retry)                                                                                             | Navigation-only pages (`/dashboard`, `/admin`)                         |
| Endpoint returns `202 + job_id` (pitch deck, matchmaking generate)                                                                                                                                     | Static content (`/unauthorized`, `/expired`)                           |

### 6.7.2 Component contract (TypeScript)

```ts
// src/components/execution-panel/ExecutionPanel.tsx
import type { ReactNode } from 'react';
import type { ZodSchema } from 'zod';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';

export interface ExecutionPanelProps<TInput, TOutput> {
  /** Panel title — shown at top of the panel card. */
  title: string;
  /** One-line description under the title. Nullable. */
  description?: string;
  /** Zod schema for the input form. Drives React Hook Form validation. */
  schema: ZodSchema<TInput>;
  /** Default form values. */
  defaultValues: Partial<TInput>;
  /** Renders the form fields. Receives the RHF `register`, `control`, `formState`. */
  renderForm: (rhf: FormRenderProps<TInput>) => ReactNode;
  /** The mutation to fire on submit. Must be a TanStack Query useMutation result. */
  mutation: UseMutationResult<TOutput, ApiError, TInput, unknown>;
  /** Renders the result block on success. */
  renderResult?: (data: TOutput) => ReactNode;
  /** Optional override for the default success toast. */
  onSuccessToast?: (data: TOutput) => string;
  /** Optional override for the error renderer. Default reads ApiError.code → USER_MESSAGES. */
  renderError?: (err: ApiError, retry: () => void) => ReactNode;
  /** Submit button label. */
  submitLabel?: string; // default "Submit"
  /** Action buttons rendered next to Submit (Reset, Cancel). */
  secondaryActions?: ReactNode;
  /** Whether the panel supports long-running jobs. If true, `mutation.data` MUST include `job_id`
   *  and `jobPoll` must be provided to read job state. */
  jobPoll?: {
    /** Query key for `useQuery` that polls the job state. */
    queryKey: readonly unknown[];
    /** Fetches one poll tick. Should return `{ ready, state, successful, result }`. */
    queryFn: (jobId: string) => Promise<JobPollResult<TOutput>>;
    /** Cap polls at N (default 30 = 90s at 3s interval). */
    maxPolls?: number;
    /** Interval ms (default 3000). */
    intervalMs?: number;
  };
  /** Enable the debug drawer (request/response JSON viewer) — default = VITE_DEBUG_PANEL in dev. */
  debug?: boolean;
}

export interface JobPollResult<T> {
  job_id: string;
  state: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED';
  ready: boolean;
  successful: boolean | null;
  result: T | null;
}

export interface FormRenderProps<T> {
  register: UseFormRegister<T>;
  control: Control<T>;
  formState: FormState<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
}
```

### 6.7.3 State machine (authoritative)

```
                    ┌─────────┐
                    │  idle   │◄──────────────┐
                    └────┬────┘               │
                         │ user submits       │ user clicks "Reset" / success toast dismissed
                         ▼                    │
                  ┌─────────────┐             │
                  │ submitting  │             │
                  └──┬───────┬──┘             │
           mutation  │       │  mutation      │
            success  │       │   error        │
                     ▼       ▼                │
         (no jobPoll)    ┌─────────┐          │
              │          │  error  │──────────┤ retry
              │          └─────────┘          │
              ▼                               │
          ┌─────────┐                         │
          │ success │─────────────────────────┘
          └─────────┘
          (or ▼ if jobPoll)
                ┌───────────────┐
                │  polling-job  │
                └──┬─────────┬──┘
              ready│         │cap reached
               ▼              ▼
         ┌─────────┐      ┌───────┐
         │ success │      │timeout│
         │ /failure│      └───────┘
         └─────────┘
```

### 6.7.4 Reference layout (rendered)

```
┌─────────────────────────────────────────────────────────┐
│ {title}                                       [? Help]  │
│ {description}                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ {renderForm(...)}                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                   [ Secondary ] [ Submit ▸ ]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ━━━ Result ━━━ (only on success)                        │
│ {renderResult(data)}                                    │
│                                                         │
│ ━━━ Error ━━━ (only on error)                           │
│ ⚠ {friendly message}                [Retry] [Dismiss]   │
│                                                         │
│ ━━━ Job status ━━━ (only while polling)                 │
│ 🔄 Evaluating your pitch… (27s elapsed)                 │
│                                                         │
├─ Debug (dev only, collapsed) ───────────────────────────┤
│ ▸ Request  POST /pitch/deck  — 187ms — 202              │
│ ▸ Response { job_id: "...", status: "queued" }          │
│ ▸ Trace ID: 5f3a1b2c                                    │
└─────────────────────────────────────────────────────────┘
```

### 6.7.5 Sample composition — MIS submission

```tsx
// src/features/mis/routes/MISPage.tsx
import { ExecutionPanel } from '@/components/execution-panel';
import { zMISSubmitRequest } from '@/features/mis/schemas';
import { useSubmitMIS, useMISPrefill } from '@/features/mis/hooks';

export function MISPage() {
  const { data: prefill } = useMISPrefill();
  const mutation = useSubmitMIS();

  return (
    <ExecutionPanel
      title={`Monthly MIS — ${prefill?.period ?? ''}`}
      description="Submit your operating metrics for the current month. Invalidates after success."
      schema={zMISSubmitRequest}
      defaultValues={prefill?.prefill ?? {}}
      mutation={mutation}
      submitLabel="Submit MIS"
      onSuccessToast={(data) => `Submitted for ${data.period}`}
      renderForm={({ register, formState }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Revenue (INR)" error={formState.errors.revenue?.message}>
            <Input type="number" {...register('revenue', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Burn (INR)" error={formState.errors.burn?.message}>
            <Input type="number" {...register('burn', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Highlights" className="md:col-span-2">
            <Textarea rows={3} {...register('highlights')} />
          </FormField>
          <FormField label="Lowlights" className="md:col-span-2">
            <Textarea rows={3} {...register('lowlights')} />
          </FormField>
        </div>
      )}
      renderResult={(data) => (
        <SuccessCard>
          <p>
            MIS saved for <strong>{data.period}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">Submission ID: {data.submission_id}</p>
        </SuccessCard>
      )}
    />
  );
}
```

### 6.7.6 Sample composition — Pitch deck with job polling

```tsx
import { ExecutionPanel } from '@/components/execution-panel';
import { zDeckUploadRequest } from '@/features/pitch/schemas';
import { useSubmitDeck, fetchDeckJobStatus } from '@/features/pitch/hooks';

export function PitchDeckTab() {
  const mutation = useSubmitDeck();

  return (
    <ExecutionPanel
      title="Submit pitch deck"
      description="Paste a Google Drive share URL. We'll run an AI evaluation."
      schema={zDeckUploadRequest}
      defaultValues={{ deck_url: '' }}
      mutation={mutation}
      submitLabel="Submit deck"
      jobPoll={{
        queryKey: ['pitch', 'deckJob'],
        queryFn: (jobId) => fetchDeckJobStatus(jobId),
        maxPolls: 30,
        intervalMs: 3000,
      }}
      renderForm={({ register, formState }) => (
        <FormField label="Deck URL" error={formState.errors.deck_url?.message}>
          <Input {...register('deck_url')} placeholder="https://drive.google.com/…" />
        </FormField>
      )}
      renderResult={(result) => (
        <AIEvaluationResult
          signal={result.signal}
          summary={result.summary}
          strengths={result.strengths}
          concerns={result.concerns}
        />
      )}
    />
  );
}
```

### 6.7.7 Variants

- **`<ExecutionDialog>`** — same props but renders as a modal. Use for one-off admin actions (Approve connection, Retry DLQ job). The dialog closes on success toast dismiss.
- **`<ExecutionDrawer>`** — side-drawer variant for admin workflows that need to stay visible alongside a list (e.g. reviewing a pending digest).
- **`<InlineExecutionButton>`** — for row-level actions that don't need a full panel (Approve, Reject, Cancel). Same state machine but collapsed to a button + optimistic update + toast.

### 6.7.8 Mandatory behaviours

Any component that mutates state MUST:

1. Disable its submit button while `mutation.isPending === true`.
2. Render a loading spinner inside the submit button (not overlapping the form).
3. Disable all form fields while submitting (shadcn `fieldset` + `disabled`).
4. Clear `mutation.data` / reset form on successful completion **OR** keep result visible + show "New submission" secondary button (explicit choice per screen — never both).
5. On error, KEEP form values and show the retry button. Never wipe user input on error.
6. Fire `onSuccessToast` exactly once per transition from `submitting → success`.
7. Capture every request/response pair via `apiClient` interceptor so the debug drawer can read it (§6.8).

### 6.7.9 Enforcement

- ESLint rule (custom) flags any `useMutation` call in a `routes/*` file that is NOT wrapped in an `<ExecutionPanel>` / `<ExecutionDialog>` / `<ExecutionDrawer>` / `<InlineExecutionButton>`.
- PR review checklist (in §10 of `frontend_claude.md`) adds: "Every action screen built on the ExecutionPanel primitive."

---

## 6.8 Debug / Observability Layer (dev-mode)

When `VITE_APP_ENV !== 'production'` AND `VITE_DEBUG_PANEL === 'true'`, the app mounts a floating debug dock (bottom-right). Tree-shaken out of production builds.

**Dock tabs (mandatory):**

| Tab              | Purpose                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Requests         | Ring buffer of last 50 HTTP calls: method, path, status, duration, `X-Trace-ID`, request+response JSON.   |
| Jobs             | Every `202 + job_id` endpoint registers here. Shows `task_name`, state, result. Click → re-enter polling. |
| Session          | Decoded JWT, `expiresAt` countdown, `authStore` snapshot, active `VITE_*_ENABLED` flags.                  |
| Query cache      | Embedded `@tanstack/react-query-devtools`.                                                                |
| Feature flags    | Runtime toggle of `VITE_*_ENABLED` flags (session-scoped, stored in `sessionStorage['oc.debug.flags']`).  |
| Interactions log | `search_view` / `profile_view` dedup cache (§7.7.1) — fired vs deduped, last 5 min.                       |

**Mandatory wiring:**

- Every request through `apiClient` (§6.5) MUST populate the Requests tab via the axios interceptors: add `performance.now()` timing + `X-Trace-ID` generation + ring-buffer push to `debugLogRequest()`.
- Every `202 + job_id` response MUST call `registerJob({ job_id, task_name, submitted_at, submitted_by })`. Entries persist in `localStorage['oc.debug.jobs']` (cap 100, FIFO).
- `ErrorState` component MUST accept a `retry` callback so the Requests tab can re-invoke failed calls.
- Production guard: `const DebugDock = import.meta.env.PROD ? () => null : LazyDebugDock;` — dead-code-eliminated.
- Sentry (if `VITE_SENTRY_DSN` set) captures unhandled errors only. The request log stays local.

**Directory layout:** `src/lib/debug/` holds `debug-dock.tsx`, tab components, `use-request-log.ts` (ring buffer), `use-job-registry.ts` (localStorage-backed). Implementation is mechanical — no further spec needed beyond the contract above.

---

# 7. API Contracts

**Base URL:** `/api/v1`
**Envelope (all endpoints, success and failure):**

```json
{
  "data": { ... } | null,
  "error": null | { "code": "string", "message": "string", "detail": any? },
  "pagination": { "limit": 50, "offset": 0 }   // optional, only on some list endpoints
}
```

**Paginated list responses** (the canonical shape):

```json
{
  "data": { "items": [ ... ], "next_cursor": "opaque-string" | null },
  "error": null
}
```

**Content types:**

- Standard requests/responses: `application/json`
- File uploads: `multipart/form-data` (card image, pitch audio — Phase 4 deep-link endpoints per spec §4.2–4.3)
- Current backend (Phase 0–3) uses **text-only** card scan (`raw_text` field) and **URL-based** deck upload (`deck_url`). OCR + Whisper endpoints from spec §4.1 are declared but not yet wired in routers (see §13 gap).

**Auth header:**

```
Authorization: Bearer <jwt>
```

**Rate limits:** Every endpoint has a per-IP limit (via slowapi). When exceeded, the backend returns:

```json
HTTP 429
{ "data": null, "error": { "code": "rate_limit_exceeded", "message": "Too many requests. Please try again later." } }
```

The frontend must honour `Retry-After` headers when present.

---

## 7.0 Standard patterns & shared error responses

Every endpoint in §7.1–§7.16 follows the shapes defined below. The shared error responses (401, 403 generic, 429, 500) are printed **once** here with full JSON. Per-endpoint sections list only the **endpoint-specific** error codes (400 validation, 403 role, 404 not found, 409 conflict) inline. For a 401 or 429 on any endpoint, the body is exactly what this section prints.

### 7.0.1 Standard request headers

```
Authorization: Bearer <jwt>            # required on every non-public endpoint
Content-Type:  application/json        # required on POST / PATCH / PUT with body
Accept:        application/json        # optional, recommended
X-Trace-ID:    <optional uuid>         # optional; backend echoes back for log correlation
```

- **Public endpoints** (no auth): `POST /auth/otp/send`, `POST /auth/otp/verify`, `GET /health`. Everything else MUST include `Authorization`.
- **OPTIONS** preflight is handled by the backend CORS middleware — frontend doesn't need to send it manually.

### 7.0.2 Standard response envelope

```json
{
  "data": {},
  "error": null
}
```

On failure:

```json
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": []
  }
}
```

- `error.code` is ALWAYS the field to branch on in the UI (see §11 error map). `error.message` is a user-safe sentence.
- `error.detail` is present only on 400/422 validation errors — it is a Pydantic-style array of issues.

### 7.0.3 Pagination shapes

**Cursor-paginated** (most list endpoints — connections, profile-viewers, matchmaking, meetings, travel, admin/connections):

```json
{
  "data": { "items": [], "next_cursor": "opaque-string-or-null" },
  "error": null
}
```

**Offset-paginated** (`/admin/dead-letter-jobs` only — legacy):

```json
{
  "data": [],
  "error": null,
  "pagination": { "limit": 50, "offset": 0 }
}
```

The frontend MUST treat `next_cursor === null` or `next_cursor` absent as "end of list".

### 7.0.4 Shared error responses (applies to every endpoint unless overridden)

#### 401 Unauthorized — missing token

```json
HTTP 401
{
  "data": null,
  "error": { "code": "missing_token", "message": "Authentication required" }
}
```

Returned whenever the `Authorization` header is absent on a protected route.
**Frontend action:** redirect to `/signin`.

#### 401 Unauthorized — invalid token

```json
HTTP 401
{
  "data": null,
  "error": { "code": "invalid_token", "message": "Token is invalid" }
}
```

Returned on signature mismatch, wrong audience, wrong issuer, or missing required claim.
**Frontend action:** clear auth store; redirect to `/signin`; toast "Session invalid".

#### 401 Unauthorized — token expired

```json
HTTP 401
{
  "data": null,
  "error": {
    "code": "link_expired",
    "message": "This link has expired. Send a message on WhatsApp to get a new one."
  }
}
```

(`error.code` may also be `token_expired` — treat identically.)
**Frontend action:** redirect to `/expired`.

#### 403 Forbidden — insufficient role

```json
HTTP 403
{
  "data": null,
  "error": { "code": "insufficient_role", "message": "Requires one of: admin, super_admin" }
}
```

Role check failed at the dependency layer.
**Frontend action:** redirect to `/unauthorized` (prevents by using `<RoleGuard>`).

#### 403 Forbidden — token action mismatch

```json
HTTP 403
{
  "data": null,
  "error": {
    "code": "token_action_mismatch",
    "message": "Token is scoped to pitch (/api/v1/pitch), not this endpoint."
  }
}
```

Deep-link JWT used on the wrong route. Phase 4 concern mostly.
**Frontend action:** show "Wrong link" screen, prompt re-login.

#### 429 Too Many Requests — rate limit exceeded

```json
HTTP 429
Retry-After: 60
{
  "data": null,
  "error": { "code": "rate_limit_exceeded", "message": "Too many requests. Please try again later." }
}
```

**Frontend action:** toast with countdown from `Retry-After` header; disable the triggering button for that many seconds.

#### 500 Internal Server Error

```json
HTTP 500
{
  "data": null,
  "error": { "code": "internal_error", "message": "An unexpected error occurred" }
}
```

**Frontend action:** full-page `<ErrorState>` with "Contact support" button; log via Sentry.

#### 502/503/504 Upstream / gateway errors

These are network-layer and never include a JSON envelope. The axios interceptor synthesises:

```json
{ "code": "network_error", "message": "Network error — please retry.", "status": 0 }
```

**Frontend action:** toast, auto-retry GETs once after 2s, never auto-retry mutations.

### 7.0.5 HTTP status semantics (cheat sheet)

| Status | `error.code` values seen                                                                        | Meaning                                 | UI default                    |
| ------ | ----------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| 200    | —                                                                                               | Success                                 | Render `data`                 |
| 201    | —                                                                                               | Created                                 | Render `data` + success toast |
| 202    | —                                                                                               | Accepted (async job queued)             | Render job card, poll         |
| 400    | `validation_error`, `not_registered`, `duplicate_contact`                                       | Client input error                      | Inline field error            |
| 401    | `missing_token`, `invalid_token`, `link_expired`, `token_expired`, `otp_invalid`, `otp_expired` | Auth failure                            | Redirect or inline (OTP)      |
| 403    | `insufficient_role`, `forbidden`, `token_action_mismatch`, `unknown_action`                     | Authorisation failure                   | `/unauthorized` or toast      |
| 404    | `not_found`                                                                                     | Resource missing                        | Empty state with back button  |
| 409    | `conflict`, `mis_already_submitted`, `duplicate_contact`                                        | Conflict                                | Context-specific message      |
| 422    | `validation_error`                                                                              | Pydantic validation (treat same as 400) | Inline field error            |
| 429    | `rate_limit_exceeded`                                                                           | Rate limit                              | Toast + disable + countdown   |
| 500    | `internal_error`, `notion_sync_error`, `ai_provider_error`, `wa_provider_error`, `drive_error`  | Server fault                            | Full-page error               |

### 7.0.6 UUID, timestamp, and phone conventions (applies everywhere)

- **UUIDs** are strings in canonical 36-char form: `0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0`. Zod: `z.string().uuid()`.
- **Timestamps** are ISO-8601 with timezone: `2026-04-23T15:33:10+05:30` or `2026-04-23T10:03:10Z`. Zod: `z.string().datetime({ offset: true })`.
- **Dates (day only)** use `YYYY-MM-DD`. Zod: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.
- **Periods (month)** use `YYYY-MM` with month 01–12. Zod: `z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)`.
- **Phone** is E.164 with leading `+` and 10–15 digits: `+919876543210`. Zod: `z.string().regex(/^\+\d{10,15}$/)`.
- **Amounts** in INR are decimal strings (e.g. `"21000000.00"`) when precision matters (MIS `raw_data`); otherwise numbers (float). Prefer `Decimal.toString()` on submit.

### 7.0.7 Role → capability vocabulary used below

Each endpoint lists **Required roles** using exact ENUM keys. When an endpoint lists `any authenticated`, it means any of the ten roles is allowed. The ten role keys:

```
lp, potential_lp, vc,
startup_inprogress, startup_onboarded, startup_funded,
partner, advisor,
admin, super_admin
```

---

## 7.1 Auth

### 7.1.1 `POST /auth/otp/send`

**Purpose:** Send a 6-digit OTP to the phone number. In production, delivered via WATI WhatsApp template `otp_verify`; in development (`DEV_OTP_BYPASS=true`), dev-logged to stdout (the OTP is always `000000`). OTP TTL = 600s. Stored as phone-salted SHA-256 in Redis.

**Required roles:** Public (no JWT required).

**Rate limit:** 5 per 10 minutes per IP + 3 per 10 minutes per phone. A 429 on the per-phone limit means the user has requested too many fresh OTPs for the same phone in 10 minutes.

**Headers:**

```
Content-Type: application/json
```

(No `Authorization`.)

**Request body:**

```json
{ "phone": "+919876543210" }
```

**Request field rules:**

- `phone` (string, required) — E.164 format. Regex: `^\+\d{10,15}$`. Example: `+919876543210`. Leading `+` mandatory.

**Success 200:**

```json
{
  "data": { "message": "OTP sent successfully" },
  "error": null
}
```

**Error 400 — `not_registered` (development only):**

```json
HTTP 400
{
  "data": null,
  "error": {
    "code": "not_registered",
    "message": "This number is not registered. Please contact Warmup Ventures."
  }
}
```

_In production, the backend deliberately returns the success envelope for unknown phones to prevent enumeration. Only dev builds surface this code._

**Error 422 — validation_error (malformed phone):**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","phone"], "msg": "Phone must be in E.164 format (e.g. +91XXXXXXXXXX)", "type": "value_error" }
    ]
  }
}
```

**Error 429 — rate_limit_exceeded:** see §7.0.4.

**Error 500 — internal_error:** see §7.0.4.

**UI flow (Input → API → Output):**

1. User lands on `/signin`, enters phone in `<PhoneInput />`.
2. Frontend validates E.164 client-side; on pass, enables "Send OTP".
3. Click "Send OTP" → `POST /auth/otp/send { phone }`.
4. On 200 → advance to OTP step; start a 30-second cooldown on the "Resend OTP" button.
5. On 400 `not_registered` (dev only) → show inline error card "Contact Warmup Ventures" with a support link.
6. On 422 → inline red text under phone input.
7. On 429 → toast with countdown (read `Retry-After`; fallback 60s); disable Send.
8. On 500 → full-page `<ErrorState>` with "Try again".

**Data transformation notes:**

- The phone MUST be normalised to E.164 BEFORE submission. Strip spaces, dashes. Prepend `+91` only if the user explicitly selected India country code.
- The response `data.message` is a fixed literal in dev; do not display it to the user (only use the 200 status as the signal).

---

### 7.1.2 `POST /auth/otp/verify`

**Purpose:** Verify a 6-digit OTP against Redis and mint a signed JWT (HS256). Returns a 4-hour session token with role claim.

**Required roles:** Public.

**Rate limit:** 5 per 10 minutes per IP + 5 per 10 minutes per phone (failure only — successful verify clears the counter).

**Headers:**

```
Content-Type: application/json
```

**Request body:**

```json
{ "phone": "+919876543210", "otp": "000000" }
```

**Request field rules:**

- `phone` (string, required) — E.164, same regex as §7.1.1.
- `otp` (string, required) — exactly 6 digits. Regex: `^\d{6}$`.

**Success 200:**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIrOTE5ODc2NTQzMjEwIiwicm9sZSI6ImxwIiwidXNlcl9pZCI6IjBmM2MwYjBhLWU2Y2MtNGYxYy05YTJlLWE1YjJlM2YxYzlkMCIsImlhdCI6MTcxMjQwMDAwMCwiZXhwIjoxNzEyNDE0NDAwLCJpc3MiOiJvbmVjb21tIiwiYXVkIjoiZGV2ZWxvcG1lbnQifQ.ExAmPlEsIgNaTuRe",
    "token_type": "bearer",
    "expires_in": 14400,
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "role": "lp"
  },
  "error": null
}
```

**Response field rules:**

- `access_token` — JWT (HS256), payload includes `sub` (phone), `role`, `user_id`, `iat`, `exp`, `iss` (`"onecomm"`), `aud` (`"development"`|`"staging"`|`"production"`).
- `token_type` — always `"bearer"`.
- `expires_in` — seconds (4 hours = 14400).
- `role` — one of the 10 ENUM values (see §7.0.7).

**Error 401 — `otp_invalid` (uniform for every failure mode):**

```json
HTTP 401
{
  "data": null,
  "error": { "code": "otp_invalid", "message": "Invalid OTP" }
}
```

Covers: wrong code, OTP not in Redis (TTL expired), unknown phone (timing-constant by design). The frontend MUST NOT differentiate these — show the same inline error.

**Error 401 — `otp_expired`** (semantic alias emitted by some paths):

```json
HTTP 401
{
  "data": null,
  "error": { "code": "otp_expired", "message": "OTP has expired" }
}
```

**Error 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","otp"], "msg": "OTP must be a 6-digit code", "type": "value_error" }
    ]
  }
}
```

**Error 429 — rate_limit_exceeded:** see §7.0.4. A consistent 429 here indicates brute-force attempts.

**Error 500 — internal_error:** see §7.0.4.

**UI flow:**

1. User enters 6-digit OTP in `<OTPInput />`.
2. Auto-submit on 6th digit OR Enter key → `POST /auth/otp/verify`.
3. On 200 →
   a. Compute `expiresAt = Date.now() + expires_in * 1000`.
   b. `authStore.setSession({ access_token, user_id, role, expires_in })`.
   c. Fetch `GET /auth/me` (§7.1.3) to hydrate full profile.
   d. If `profile_complete === false` → navigate to `/onboarding/profile`.
   e. Else → navigate to role home (see §10.2).
4. On 401 `otp_invalid`/`otp_expired` → clear input; show "Incorrect or expired — request a new OTP"; enable Resend.
5. On 429 → toast with countdown; lock the verify button.
6. On 500 → full-page `<ErrorState>` with Retry.

**Data transformation notes:**

- Store the full `access_token` string verbatim. Never decode it client-side to read claims; ask `/auth/me` instead.
- `expiresAt` is derived client-side; timezone-agnostic (epoch ms).
- On ANY 401/429 during this endpoint, DO NOT clear auth store (there is none yet) and DO NOT navigate away.

---

### 7.1.3 `GET /auth/me`

**Purpose:** Return the authenticated user's full profile. Drives the initial auth hydration and profile completeness check.

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Accept: application/json
```

**Query parameters:** none.

**Request body:** none.

**Success 200:**

```json
{
  "data": {
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "phone": "+919876543210",
    "name": "Kapil Sahu",
    "email": "kapil@example.com",
    "role": "lp",
    "organisation": "Warmup Ventures",
    "designation": "Principal",
    "avatar_url": null,
    "profile_complete": true
  },
  "error": null
}
```

**Response field rules:**

- `user_id`, `phone`, `role` always present.
- `name`, `email`, `organisation`, `designation`, `avatar_url` are nullable.
- `profile_complete: boolean` — authoritative gate for whether the user can leave `/onboarding/profile`.

**Error 401 — `missing_token` / `invalid_token` / `link_expired`:** see §7.0.4.

**Error 404 — `not_found`:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "User not found" }
}
```

Only possible if the user was deleted between token issue and this call. Frontend: clear auth store, redirect to `/signin`.

**Error 429 — rate_limit_exceeded:** see §7.0.4.

**Error 500 — internal_error:** see §7.0.4.

**UI flow:**

1. Called automatically right after `POST /auth/otp/verify` returns 200.
2. Also called on every cold-start when a persisted session is still valid (`Date.now() < expiresAt`).
3. On 200 → `authStore.setUser(data)` → if `profile_complete=false` navigate to `/onboarding/profile` else to role home.
4. On 401 → clear auth store, redirect `/signin`.
5. On 404 → clear auth store, redirect `/signin` with toast "Account not found".

**Data transformation notes:**

- Render `name ?? phone` when showing the user identifier in the top bar.
- `avatar_url` nullable — fall back to initials avatar (use `<Avatar />` with `fallback={initials(name)}`).
- `profile_complete=false` MUST gate access to every other page except `/onboarding/profile`, `/signin`, `/expired`, `/unauthorized`.
- TanStack Query cache for this key (`qk.auth.me`): `staleTime: 5 * 60_000`, `gcTime: 15 * 60_000`. Invalidate after `PATCH /onboarding/profile` (§7.2.3).

---

## 7.2 Onboarding

### 7.2.1 `POST /onboarding/card-scan`

**Purpose:** Parse raw text extracted from a business card image (OCR done client-side today; backend OCR in Phase 4), run GPT-4o to structure fields, and optionally create a user row.

**Required roles:** Any authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "raw_text": "Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com",
  "image_url": "https://cdn.example.com/cards/abc.jpg"
}
```

**Request field rules:**

- `raw_text` (string, required, min length 10) — multi-line OCR output.
- `image_url` (string URL, optional) — if the image is already hosted (e.g. S3/Supabase Storage); purely for audit/debug. Backend does not re-OCR.

**Success 200:**

```json
{
  "data": {
    "scan_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "parsed": {
      "name": "Kapil Sahu",
      "phone": "+919876543210",
      "email": "kapil@example.com",
      "organisation": "Warmup Ventures",
      "designation": "Principal",
      "linkedin_url": null,
      "raw_text": "Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com"
    },
    "user_created": false,
    "user_id": null
  },
  "error": null
}
```

**Success 200 — user auto-created (duplicate-free phone):**

```json
{
  "data": {
    "scan_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "parsed": {
      "name": "Kapil Sahu",
      "phone": "+919876543210",
      "email": "kapil@example.com",
      "organisation": "Warmup Ventures",
      "designation": "Principal",
      "linkedin_url": null,
      "raw_text": "..."
    },
    "user_created": true,
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0"
  },
  "error": null
}
```

**Response field rules:**

- `parsed.name`, `parsed.phone`, `parsed.email`, `parsed.organisation`, `parsed.designation`, `parsed.linkedin_url` are all nullable — GPT-4o may fail to extract any field.
- `user_created: true` iff the phone was not already in `users` AND the parser produced a valid phone.
- When `user_created=false`, `user_id=null` — the scanner must manually confirm/create via the flow or handle duplicate.

**Error 400 — validation_error:**

```json
HTTP 400
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","raw_text"], "msg": "ensure this value has at least 10 characters", "type": "value_error.any_str.min_length" }
    ]
  }
}
```

**Error 401 — missing_token / invalid_token / link_expired:** see §7.0.4.

**Error 409 — duplicate_contact:**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "duplicate_contact",
    "message": "A contact with this phone or email already exists",
    "detail": { "existing_user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0" }
  }
}
```

**Error 429 — rate_limit_exceeded:** see §7.0.4.

**Error 500 — internal_error:** see §7.0.4 (often a GPT-4o upstream failure — treat as retryable).

**UI flow:**

1. User opens `/add-user`, drags card image into dropzone.
2. Client-side OCR (`tesseract.js` Phase 0–3; replace with Google Vision via Phase-4 `POST /ocr`).
3. On OCR complete, stitch multiline text → send `POST /onboarding/card-scan { raw_text }`.
4. On 200 → prefill `<ContactForm />` with `parsed.*` fields; highlight `null` fields amber (low confidence).
5. User reviews, edits, picks a category (LP / VC / Startup / Partner).
6. If `user_created=true` → show toast "User created — continue with category".
7. If `user_created=false` → user must complete profile fields then POST a separate user-creation endpoint (currently handled by admin via `/onboarding/profile` + role assignment; see §13 G1 gap).
8. On 409 → show "Already exists" modal with link to existing user id; allow "Update existing" (calls `PATCH /onboarding/profile` on that user — admin only) or "Cancel".

**Data transformation notes:**

- Normalise phone to E.164 before sending (`+91` auto-prepend for 10-digit Indian numbers).
- Strip extra whitespace / double newlines from `raw_text` before submission.
- `parsed.*` fields are the FINAL values suggested by GPT-4o; frontend should keep original OCR text available for fallback.
- On 500, retry ONCE with a 2s delay — GPT-4o transient failures are common.

---

### 7.2.2 `GET /onboarding/card-scan/{scan_id}`

**Purpose:** Retrieve a previously-created card-scan record.

**Required roles:** Any authenticated. Ownership enforced: only the original scanner OR `admin`/`super_admin` can access.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `scan_id` (UUID, required) — from §7.2.1 response.

**Success 200:**

```json
{
  "data": {
    "scan_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "image_url": "https://cdn.example.com/cards/abc.jpg",
    "ocr_raw": "Kapil Sahu\n...",
    "extracted_data": {
      "name": "Kapil Sahu",
      "phone": "+919876543210",
      "email": "kapil@example.com",
      "organisation": "Warmup Ventures",
      "designation": "Principal",
      "linkedin_url": null
    },
    "status": "processed",
    "created_at": "2026-04-23T10:15:00Z"
  },
  "error": null
}
```

**Response field rules:**

- `image_url`, `ocr_raw`, `extracted_data.*` all nullable.
- `status`: `"pending" | "processed" | "failed"`.

**Error 401:** see §7.0.4.

**Error 403 — forbidden:**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "You do not have access to this card scan" }
}
```

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Card scan not found" }
}
```

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. Admin debugging a user; opens `/add-user?scan_id=...` or follows a deep link.
2. `GET /onboarding/card-scan/{scan_id}` → render form pre-filled with `extracted_data`.
3. On 403 → toast "Not your scan" → redirect to `/add-user`.
4. On 404 → empty state "Scan not found or expired".

**Data transformation notes:**

- `extracted_data` is the persisted GPT-4o output; may differ from the fresh re-run of `/card-scan` on the same raw text (non-deterministic).
- Prefer displaying `extracted_data` over `ocr_raw` for the form.

---

### 7.2.3 `PATCH /onboarding/profile`

**Purpose:** Update the caller's own user profile. First-call sets `profile_complete=true` if `name` is provided.

**Required roles:** Any authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body (partial — send only what changes):**

```json
{
  "name": "Kapil Sahu",
  "email": "kapil@example.com",
  "organisation": "Warmup Ventures",
  "designation": "Principal",
  "linkedin_url": "https://linkedin.com/in/kapilsahu",
  "avatar_url": "https://cdn.example.com/u/kapil.jpg"
}
```

**Request field rules:**

- `name` (string, required on FIRST call, optional on subsequent) — 1–200 chars.
- `email` (string, optional) — valid email.
- `organisation`, `designation` (string, optional) — 1–200 chars.
- `linkedin_url`, `avatar_url` (URL, optional) — `http`/`https`.
- Fields not present are unchanged. Sending `null` is **not supported** (backend has no allowlist for clearing).

**Success 200:**

```json
{
  "data": {
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "name": "Kapil Sahu",
    "role": "lp",
    "profile_complete": true
  },
  "error": null
}
```

**Response field rules:**

- `profile_complete` transitions to `true` once `name` is set. Not reversible without admin action.

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","email"], "msg": "value is not a valid email address", "type": "value_error.email" }
    ]
  }
}
```

**Error 401:** see §7.0.4.

**Error 409 — conflict (email/linkedin uniqueness):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Email already belongs to another user",
    "detail": { "field": "email" }
  }
}
```

Backend has unique indexes on `lower(email)` and `lower(linkedin_url)`.

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. User on `/onboarding/profile` submits form.
2. React Hook Form + Zod validate; strip `undefined` fields.
3. `PATCH /onboarding/profile { ... }`.
4. On 200 → invalidate `qk.auth.me` → refetch `/auth/me` → navigate to role home.
5. On 409 (email/linkedin) → inline error under that field "Already registered to another account".
6. On 422 → inline field errors from `detail`.

**Data transformation notes:**

- Before submit, strip keys with `undefined` / empty strings — DO NOT send them.
- After success, invalidate query keys: `qk.auth.me`, `qk.connections.*` (for name/avatar updates).

---

### 7.2.4 `POST /onboarding/lp-profile`

**Purpose:** Create or update LP-specific investment profile (fund_name, thesis, preferred sectors/stages, ticket size). Required before an LP can receive personalised digest or match suggestions.

**Required roles:** `lp`, `potential_lp`, `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body (all optional):**

```json
{
  "fund_name": "Acme Capital",
  "aum_crore": 250.0,
  "thesis": "Early-stage B2B SaaS in India.",
  "preferred_sectors": ["fintech", "saas"],
  "preferred_stages": ["seed", "series_a"],
  "geography": ["IN", "SEA"],
  "ticket_size_min_cr": 1.0,
  "ticket_size_max_cr": 10.0,
  "co_invest_interest": true
}
```

**Request field rules:**

- `fund_name` (string, optional) — 1–200 chars.
- `aum_crore` (number, optional) — ≥ 0; INR crore.
- `thesis` (string, optional) — 1–2000 chars.
- `preferred_sectors` (string[], default `[]`).
- `preferred_stages` (string[], default `[]`) — MUST use `startup_stage` ENUM values: `ideation | pre_seed | seed | early_growth | pre_a | series_a | pre_b | series_b | late_growth`.
- `geography` (string[], default `[]`) — free-form ISO region codes or city names.
- `ticket_size_min_cr`, `ticket_size_max_cr` (number, optional) — ≥ 0; `min ≤ max` enforced only by frontend.
- `co_invest_interest` (boolean, optional).

**Success 200:**

```json
{
  "data": {
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "fund_name": "Acme Capital",
    "profile_complete": true
  },
  "error": null
}
```

**Error 400 — validation_error (invalid stage):**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","preferred_stages",0], "msg": "value is not a valid enumeration member", "type": "type_error.enum" }
    ]
  }
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — insufficient_role:**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "insufficient_role", "message": "Requires one of: admin, lp, potential_lp, super_admin" }
}
```

**UI flow:**

1. LP completes onboarding profile (§7.2.3) → routed to `/onboarding/lp-profile`.
2. Form with sector multi-select, stage multi-select (from ENUM), ticket range slider, co-invest toggle.
3. Submit → `POST /onboarding/lp-profile`.
4. On 200 → toast "Profile saved" → navigate to `/search`.
5. On 422 (bad stage) → clear that chip, show inline.
6. On 403 (wrong role) → shouldn't happen if routing is correct; redirect `/unauthorized`.

**Data transformation notes:**

- `preferred_sectors` and `geography` are free-form strings; lowercase them on submit for consistency.
- Ticket-size fields are in INR crore (not USD). Show "₹ Cr" suffix in UI.
- After 200, invalidate `qk.auth.me` (may flip `profile_complete`) and any pending `qk.matchmaking.suggestions` caches (new preferences = different suggestions).

---

## 7.3 Pitch

### 7.3.1 `POST /pitch/profile`

**Purpose:** Create or update the caller's startup profile. On first call (no existing row for this user), creates a `startups` row.

**Required roles:** `startup_inprogress`, `startup_onboarded`, `startup_funded`, `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "Acme Technologies Pvt Ltd",
  "tagline": "AI for compliance",
  "sector": "fintech",
  "stage": "seed",
  "website_url": "https://acme.ai",
  "description": "We help banks automate KYC via agentic LLM workflows.",
  "founding_year": 2024,
  "team_size": 12,
  "revenue_model": "SaaS subscription",
  "traction": "3 pilot banks, ₹2Cr ARR",
  "ask_amount_cr": 10.0
}
```

**Request field rules:**

- `name` (string, required) — 1–200 chars.
- `tagline` (string, optional) — 1–280 chars.
- `sector` (string, optional) — free-form, lowercase recommended.
- `stage` (string, optional) — one of `startup_stage` ENUM (see §7.2.4 rules).
- `website_url` (string URL, optional).
- `description` (string, optional) — 1–5000 chars.
- `founding_year` (int, optional) — 1900–current year.
- `team_size` (int, optional) — ≥ 0.
- `revenue_model`, `traction` (string, optional) — 1–1000 chars.
- `ask_amount_cr` (number, optional) — INR crore, ≥ 0.
- `revenue_monthly` (number, optional) — INR rupees; current monthly revenue. Moved from MIS per decisions.md [P-23].
- `burn_monthly` (number, optional) — INR rupees; current monthly burn.
- `runway_months` (number, optional) — months of runway at current burn rate, ≥ 0.

**Success 200:**

```json
{
  "data": {
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "name": "Acme Technologies Pvt Ltd",
    "tagline": "AI for compliance",
    "sector": "fintech",
    "stage": "seed",
    "deck_url": null,
    "website_url": "https://acme.ai",
    "description": "We help banks automate KYC via agentic LLM workflows.",
    "founding_year": 2024,
    "team_size": 12,
    "revenue_model": "SaaS subscription",
    "traction": "3 pilot banks, ₹2Cr ARR",
    "ask_amount_cr": 10.0,
    "revenue_monthly": 1800000,
    "burn_monthly": 1400000,
    "runway_months": 8.5,
    "notion_page_id": null
  },
  "error": null
}
```

**Response field rules:**

- `startup_id` always present.
- `deck_url` — null until `POST /pitch/deck` succeeds.
- `notion_page_id` — set async after Notion sync; may be null for minutes after creation.
- `revenue_monthly`, `burn_monthly`, `runway_months` — nullable; represent current operating metrics. Moved from MIS per decisions.md [P-23].
  - Display: `revenue_monthly` and `burn_monthly` in INR rupees (`₹ 18,00,000` style). `runway_months` as `"8.5 months"`.
  - Transform: same as §8.12.2 — use `toLocaleString('en-IN')` with ₹ prefix for amounts.

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","name"], "msg": "ensure this value has at least 1 character", "type": "value_error.any_str.min_length" }
    ]
  }
}
```

**Error 401:** see §7.0.4.

**Error 403 — insufficient_role:**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "insufficient_role", "message": "Requires one of: admin, startup_funded, startup_inprogress, startup_onboarded, super_admin" }
}
```

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. Founder opens `/pitch`. Hook calls `GET /pitch/profile` (§7.3.2); on 404, show empty form.
2. On existing row, form prefilled.
3. Submit → `POST /pitch/profile`.
4. On 200 → toast "Saved"; invalidate `qk.pitch.profile`.
5. On 422 → inline field errors.
6. On 403 → redirect `/unauthorized`.

**Data transformation notes:**

- `ask_amount_cr` is in INR crore. Show "₹ Cr" suffix in UI.
- `stage` ENUM values are lowercase with underscores (e.g. `pre_seed`, not `Pre-Seed`). Display with `stageLabel(stage)` helper.
- After success, invalidate `qk.pitch.profile` and `qk.pitch.deckJob.*` (clear any stale eval state).

---

### 7.3.2 `GET /pitch/profile`

**Purpose:** Fetch the caller's startup profile.

**Required roles:** Same as §7.3.1.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:** Same shape as §7.3.1 response.

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — insufficient_role:** see §7.3.1.

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "No startup profile found" }
}
```

Indicates the user has not yet created a profile. This is expected on first visit — the frontend treats 404 as "show the create form" (not an error toast).

**UI flow:**

1. `/pitch` mount → `useQuery` against `qk.pitch.profile`.
2. If loading → skeleton.
3. If error is `not_found` → show create form.
4. If success → show edit form prefilled.
5. If error is anything else → `<ErrorState>` with Retry.

**Data transformation notes:**

- Treat 404 as a _domain signal_, not an error. Zod schema for the hook unwraps this into `{ status: 'missing' | 'present', data?: StartupProfile }`.

---

### 7.3.3 `POST /pitch/deck`

**Purpose:** Submit a pitch deck URL (currently Google Drive share link) and enqueue an AI evaluation job (Celery + GPT-4o). Returns immediately with a `job_id`.

**Required roles:** Same as §7.3.1.

**Rate limit:** 5 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "deck_url": "https://drive.google.com/file/d/1abcDEF_GHI/view?usp=sharing" }
```

**Request field rules:**

- `deck_url` (string URL, required) — must be `http`/`https`; Google Drive link preferred (share permissions "Anyone with the link can view").

**Success 202:**

```json
HTTP 202
{
  "data": {
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "deck_url": "https://drive.google.com/file/d/1abcDEF_GHI/view?usp=sharing",
    "job_id": "9f1a6b8e-4c7d-4f2a-a5b3-0e7c8d9f1a2b",
    "status": "queued"
  },
  "error": null
}
```

**Response field rules:**

- `job_id` is a Celery task UUID. Use for polling §7.3.4.
- `status` always `"queued"` at this point.

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","deck_url"], "msg": "invalid or missing URL scheme", "type": "value_error.url.scheme" }
    ]
  }
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4 / §7.3.1.

**Error 404 — not_found:** The caller has no `startups` row yet. Frontend: auto-call `POST /pitch/profile` first, then retry.

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Create your startup profile before uploading a deck" }
}
```

**UI flow:**

1. User on `/pitch` → "Deck" tab.
2. Paste URL → `POST /pitch/deck`.
3. On 202 → render `<DeckJobCard job_id={...} />` with polling; disable re-submit.
4. On 404 → show "Create profile first" inline; auto-navigate to "Profile" tab.
5. On 422 → inline error "Not a valid URL".

**Data transformation notes:**

- Persist `job_id` in component state (not React Query cache) for the active polling session.
- Invalidate `qk.pitch.profile` on success (deck_url will change).

---

### 7.3.4 `GET /pitch/deck/jobs/{job_id}`

**Purpose:** Poll a pitch evaluation job. Frontend MUST poll every 3 seconds, bounded at 90 seconds total (cap 30 polls).

**Required roles:** Same as §7.3.1.

**Rate limit:** 30 per minute (accommodates the 3-second poll).

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `job_id` (UUID string, required) — from §7.3.3 response.

**Success 200 — still running:**

```json
{
  "data": {
    "job_id": "9f1a6b8e-4c7d-4f2a-a5b3-0e7c8d9f1a2b",
    "state": "STARTED",
    "ready": false,
    "successful": null,
    "result": null
  },
  "error": null
}
```

**Success 200 — completed:**

```json
{
  "data": {
    "job_id": "9f1a6b8e-4c7d-4f2a-a5b3-0e7c8d9f1a2b",
    "state": "SUCCESS",
    "ready": true,
    "successful": true,
    "result": {
      "signal": "strong",
      "summary": "Strong founder-market fit. Pilot traction signals product-market-fit in fintech compliance.",
      "strengths": ["Experienced founders with prior exits", "Clear GTM via bank partnerships"],
      "concerns": ["Small TAM", "Compliance regulatory risk"],
      "recommended_lp_types": ["india_fintech_seed", "compliance_focused_vcs"]
    }
  },
  "error": null
}
```

**Success 200 — failed:**

```json
{
  "data": {
    "job_id": "9f1a6b8e-4c7d-4f2a-a5b3-0e7c8d9f1a2b",
    "state": "FAILURE",
    "ready": true,
    "successful": false,
    "result": null
  },
  "error": null
}
```

**Response field rules:**

- `state` ∈ `"PENDING"`, `"STARTED"`, `"SUCCESS"`, `"FAILURE"`, `"RETRY"`, `"REVOKED"`.
- `ready: true` only when state is SUCCESS or FAILURE.
- `result` is the `AIEvaluationResult` payload (see §8.7 / pitch schemas). Null if state ≠ SUCCESS.
- `result.signal` ∈ `"strong" | "moderate" | "weak"`.

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — forbidden:** Job belongs to another user. Frontend: stop polling; toast "Unknown job".

**Error 404 — not_found:** Invalid `job_id`.

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Job not found" }
}
```

**UI flow:**

1. `<DeckJobCard />` with `useQuery` + `refetchInterval: 3_000`, cap via `enabled: pollCount < 30 && !result.ready`.
2. On `state=SUCCESS` → stop polling; render AI evaluation result block.
3. On `state=FAILURE` → stop polling; show "Evaluation failed" with "Retry" button (re-POST §7.3.3).
4. On timeout (30 polls, no SUCCESS) → show "Still running — check back later" with manual refresh button.
5. On 404 → stop polling; reset UI to Deck tab.

**Data transformation notes:**

- Poll interval: exactly 3000ms. Do not lower — backend rate limit will trip.
- When `result.signal === "weak"`, display concern list more prominently (red badge). Strong = green.
- `recommended_lp_types` is an array of opaque tag strings — render as chips but treat as informational (no link-through yet).

---

## 7.4 Search

### 7.4.1 `POST /search`

**Purpose:** Unified semantic search. Backend classifies query direction (LP→startup or startup→LP) via GPT-4o, then runs the 3-stage pipeline: SQL hard filter (sector/stage/geography from `filters`) → pgvector cosine similarity on the embeddings column → GPT-4o re-rank top 20 with reason strings. Role-masks fields on return. Logs per-result `search_view` interactions and one `search_audit_log` row per query.

**Required roles:** `startup_funded`, `lp`, `potential_lp`, `vc`, `partner`, `admin`, `super_admin`. Partner is admitted but receives a strictly minimal masked response (see "Partner role role-masking" below).

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "query": "fintech seed-stage startups in Bangalore with bank pilots",
  "filters": {
    "sector": ["fintech"],
    "stage": ["seed", "pre_seed"],
    "geography": ["IN-KA"]
  },
  "limit": 20,
  "cursor": null
}
```

**Request field rules:**

- `query` (string, required) — 1–500 chars, UTF-8.
- `filters` (object, optional) — known keys:
  - `sector` (string[]) — any values; backend lowercases + matches GIN-indexed `sector_tags`.
  - `stage` (string[]) — MUST be `startup_stage` ENUM values.
  - `geography` (string[]) — free-form (city, region, ISO codes).
  - Other keys are silently ignored.
- `limit` (int, optional, 1–100, default 20) — hard-capped at 20 for GPT-4o re-rank (`rerank_cap`). Results beyond index 20 come from pgvector ordering only.
- `cursor` (string, optional, nullable) — opaque; reserved for Phase 4 continuation.

**Success 200 — LP searching for startups (`target_type: "startup"`):**

```json
{
  "data": {
    "results": [
      {
        "user_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
        "name": "Kapil Sahu",
        "organisation": "Acme Technologies",
        "avatar_url": null,
        "company_name": "Acme Technologies",
        "sector": "fintech",
        "stage": "seed",
        "one_liner": "AI for compliance",
        "description": "We help banks automate KYC via agentic LLM workflows.",
        "traction": "3 pilot banks, ₹2Cr ARR",
        "funding_target_cr": 10.0,
        "similarity_score": 0.87,
        "ai_rank": 1,
        "ai_reason": "Strong match on sector + stage + traction."
      },
      {
        "user_id": "a7b3d500-3f21-4a99-9e2f-8a1b3c4d5e6f",
        "name": "Priya Rao",
        "organisation": "NeoLedger",
        "avatar_url": "https://cdn.example.com/u/priya.jpg",
        "company_name": "NeoLedger",
        "sector": "fintech",
        "stage": "pre_seed",
        "one_liner": "Accounting copilot for SMBs",
        "description": "Auto-bookkeeping via LLM + rules engine.",
        "traction": "200 SMBs, 40% MoM growth",
        "funding_target_cr": 3.0,
        "similarity_score": 0.79,
        "ai_rank": 2,
        "ai_reason": "Matches sector; earlier stage than requested."
      }
    ],
    "total": 23,
    "target_type": "startup",
    "stage3_applied": true,
    "rerank_cap": 20,
    "next_cursor": null
  },
  "error": null
}
```

**Success 200 — Startup searching for LPs (`target_type: "lp"`):**

```json
{
  "data": {
    "results": [
      {
        "user_id": "b1c2d300-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
        "name": "Abhinav Benthia",
        "organisation": "Warmup Ventures",
        "designation": "Partner",
        "avatar_url": null,
        "fund_name": "Warmup Fund I",
        "aum_cr": 250.0,
        "cheque_range_min": 1.0,
        "cheque_range_max": 10.0,
        "sectors": ["fintech", "defence"],
        "stages": ["seed", "series_a"],
        "geography": ["IN", "SEA"],
        "co_invest_interest": true,
        "similarity_score": 0.91,
        "ai_rank": 1,
        "ai_reason": "Fund thesis aligns on fintech + early-stage ticket."
      }
    ],
    "total": 8,
    "target_type": "lp",
    "stage3_applied": true,
    "rerank_cap": 20,
    "next_cursor": null
  },
  "error": null
}
```

**Success 200 — Stage 3 fallback (`stage3_applied: false`):**
When GPT-4o is unavailable, backend returns Stage-2 (pgvector) ordering and `stage3_applied: false`. Items will lack `ai_rank` and `ai_reason`:

```json
{
  "data": {
    "results": [
      {
        "user_id": "3c9a1e00-...",
        "name": "Kapil Sahu",
        "organisation": "Acme Technologies",
        "company_name": "Acme Technologies",
        "sector": "fintech",
        "stage": "seed",
        "one_liner": "AI for compliance",
        "description": "...",
        "traction": "...",
        "funding_target_cr": 10.0,
        "similarity_score": 0.87,
        "ai_rank": null,
        "ai_reason": null
      }
    ],
    "total": 23,
    "target_type": "startup",
    "stage3_applied": false,
    "rerank_cap": 20,
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `target_type` — `"lp" | "startup"`. Always exactly one; no mixed lists.
- `total` — count of candidates after SQL filter (NOT total matched records in full corpus).
- `stage3_applied` — `true` when GPT-4o re-rank ran; `false` when fallback to Stage-2 ordering.
- `rerank_cap` — currently `20`. Never higher.
- `similarity_score` — 0.0–1.0 cosine similarity.
- `ai_rank` — integer 1..20 when Stage 3 applied, else null.
- `ai_reason` — one sentence ≤ 160 chars, else null.
- **Partner role role-masking:** backend admits the partner request but strips every field that could enable off-platform outreach. Source of truth: `modules/search/service.py _STARTUP_VISIBLE_FIELDS["partner"]`.
  - **Startup results** — partner sees only `{ user_id, name, company_name, sector, stage, one_liner }`. Specifically WITHHELD: `organisation`, `designation`, `avatar_url`, `description`, `traction`, `funding_target_cr`, `similarity_score`, `ai_rank`, `ai_reason`. Rationale: descriptions and traction frequently embed founder bios / contact hints; avatar_url enables reverse-image search; AI signals leak matchmaking internals.
  - **LP results** — if a partner query classifies as LP-targeted, backend returns only `{ user_id, name, fund_name, sectors }`. WITHHELD: `organisation`, `designation`, `avatar_url`, `aum_cr`, `cheque_range_min`, `cheque_range_max`, `stages`, `geography`, `co_invest_interest`, `similarity_score`, `ai_rank`, `ai_reason`.
  - All other fields are **absent** (key missing — not `null`). Frontend MUST use optional chaining and conditional rendering (`{card.description && <p>...</p>}`) — never assume a field is present. Zod schemas already mark all non-essential fields optional/nullable to permit partner parses.
  - Partner cannot escalate to richer information except by sending an in-platform `POST /connections/request` (admin-gated).

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","query"], "msg": "ensure this value has at least 1 character", "type": "value_error.any_str.min_length" }
    ]
  }
}
```

**Error 401:** see §7.0.4.

**Error 403 — insufficient_role (Partner trying to search):**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "insufficient_role", "message": "Requires one of: admin, lp, potential_lp, startup_funded, super_admin, vc" }
}
```

**Error 429 — rate_limit_exceeded:** see §7.0.4. (Common after rapid filter changes — debounce queries on client.)

**Error 500 — internal_error:** see §7.0.4. Backend retries Stage-3 GPT-4o internally; if ALL stages fail, returns 500.

**UI flow:**

1. User on `/search` types query; debounce 400ms before submit.
2. `POST /search { query, filters, limit: 20 }`.
3. Show skeleton rows during fetch.
4. On 200 → render cards, infinite-scroll uses `next_cursor`.
5. If `stage3_applied: false` → subtle banner: "AI ranking temporarily unavailable — showing vector similarity only."
6. If `results.length === 0` → empty state "No results. Try a broader query."
7. On 429 → toast with countdown; disable search button.
8. On 403 (Partner) → should never happen if `<RoleGuard>` is correct; redirect `/unauthorized`.
9. Per result card viewed → fire-and-forget `POST /interactions/log { target_id, interaction_type: 'search_view', target_type }` (§7.7.1).
10. Click "Request Connect" → opens modal; on confirm → `POST /connections/request` (§7.6.1).

**Data transformation notes:**

- `stage` values are ENUM keys like `pre_seed`; convert to display `Pre-Seed` via a label map.
- `funding_target_cr` is INR crore. Format as `₹{value} Cr`.
- `sectors`, `stages`, `geography` are arrays — may be empty `[]` (not null).
- `similarity_score` can be rendered as a subtle badge; don't show raw decimals.
- `ai_reason` null → hide the reason line; never render empty.
- Partner results: conditionally render fields — `{card.traction && <p>...</p>}`.
- Persist filter state in URL search params for share-links.

---

## 7.5 Profile View

### 7.5.1 `GET /profile/{id}` _(Phase-4 / gap — see §13 G1)_

> ⚠️ **Status as of 2026-04-23:** This endpoint is specified (spec §4.4) but NOT mounted in the current backend routers. The frontend MUST feature-flag this route behind `VITE_PROFILE_V1_ENABLED`. Until the backend ships it, `/profile/:id` is rendered from the search card as a modal (showing only search fields).
>
> The contract below is the **target** shape — implement the frontend against this schema so only a flag flip is needed when the backend catches up.

**Purpose:** Role-masked profile view for another user. Logs a `profile_view` interaction. Returns `contact` only when the viewer has an accepted connection with the target.

**Required roles:** Any searcher role (`lp`, `potential_lp`, `vc`, `startup_funded`, `admin`, `super_admin`). Partner gets a subset.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `id` (UUID, required) — target `user_id`.

**Query parameters:** none.

**Success 200 — LP viewing a startup profile (no connection yet):**

```json
{
  "data": {
    "user_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "role": "startup_funded",
    "name": "Kapil Sahu",
    "avatar_url": null,
    "organisation": "Acme Technologies",
    "designation": "Founder",
    "startup": {
      "company_name": "Acme Technologies",
      "sector": "fintech",
      "stage": "seed",
      "description": "We help banks automate KYC via agentic LLM workflows.",
      "founding_year": 2024,
      "team_size": 12,
      "traction": "3 pilot banks, ₹2Cr ARR",
      "ask_amount_cr": 10.0,
      "website_url": "https://acme.ai"
    },
    "lp_profile": null,
    "contact": null,
    "can_request_connect": true,
    "viewer_interaction": {
      "has_requested": false,
      "has_connected": false
    }
  },
  "error": null
}
```

**Success 200 — after accepted connection (contact unlocked):**

```json
{
  "data": {
    "user_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "role": "startup_funded",
    "name": "Kapil Sahu",
    "avatar_url": null,
    "organisation": "Acme Technologies",
    "designation": "Founder",
    "startup": { "...as above..." },
    "lp_profile": null,
    "contact": {
      "email": "kapil@acme.ai",
      "phone": "+919876543210",
      "linkedin_url": "https://linkedin.com/in/kapilsahu"
    },
    "can_request_connect": false,
    "viewer_interaction": {
      "has_requested": true,
      "has_connected": true
    }
  },
  "error": null
}
```

**Success 200 — Partner viewing a startup (masked):**

```json
{
  "data": {
    "user_id": "3c9a1e00-...",
    "role": "startup_funded",
    "name": "Kapil Sahu",
    "avatar_url": null,
    "organisation": "Acme Technologies",
    "designation": null,
    "startup": {
      "company_name": "Acme Technologies",
      "sector": "fintech",
      "stage": "seed",
      "description": null,
      "founding_year": null,
      "team_size": null,
      "traction": null,
      "ask_amount_cr": null,
      "website_url": null
    },
    "lp_profile": null,
    "contact": null,
    "can_request_connect": false,
    "viewer_interaction": { "has_requested": false, "has_connected": false }
  },
  "error": null
}
```

**Response field rules:**

- `role` — the target's role.
- `startup` or `lp_profile` — exactly one will be populated based on target role. Startup roles get `startup`; LP/Potential LP get `lp_profile`; VC gets a similar `vc_profile` (shape TBD — treat as nullable object).
- `contact` — null until the viewer has an accepted connection with the target. Never guess presence.
- `can_request_connect` — `true` only when the viewer role is allowed AND no pending/accepted connection exists.
- `viewer_interaction` — derived flags; frontend uses to disable the "Request Connect" button.

**Error 401:** see §7.0.4.

**Error 403 — forbidden:**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "You do not have access to this profile" }
}
```

Returned when role-masking would leave nothing useful (e.g. Partner viewing admin).

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "User not found" }
}
```

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. User clicks a search result card → navigate to `/profile/{id}`.
2. Hook calls `GET /profile/{id}`. Skeleton while loading.
3. On mount, fire `POST /interactions/log { target_id, interaction_type: 'profile_view', target_type: '<lp|startup>' }` (§7.7.1).
4. On 200 → render name, role badge, organisation. Render `startup` or `lp_profile` block.
5. If `contact !== null` → render contact details card.
6. If `can_request_connect` → render "Request Connect" button → opens modal → §7.6.1.
7. If `has_requested && !has_connected` → render "Pending admin approval" status instead of button.
8. On 403 → `/unauthorized`.
9. On 404 → empty state "Profile not found" + back button.

**Data transformation notes:**

- Partner sees most fields as `null`; render "—" fallback.
- `contact.phone` → mask as `+91 98•••••210` if `contact.verified !== true` (future-proofing; today always show fully).
- Fire the `profile_view` interaction only ONCE per mount (cache in ref).
- Invalidate `qk.profile.byId(id)` after the viewer's connection state changes (i.e. after §7.6.1 or §7.6.3 succeed).

---

## 7.6 Connections

### 7.6.1 `POST /connections/request`

**Purpose:** Create a new connection request from the caller to a target user. Status starts `pending_admin`. Admin must approve before the target is notified.

**Required roles:** `startup_funded`, `lp`, `potential_lp`, `vc`, `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "target_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
  "message": "Hi Kapil — saw Acme's seed round in the digest. Would love 20 min to discuss the compliance thesis."
}
```

**Request field rules:**

- `target_id` (UUID, required) — target user's `user_id`.
- `message` (string, optional) — max 200 chars. Written to `connection_requests.reason`.

**Success 200:**

```json
{
  "data": { "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f", "status": "pending_admin" },
  "error": null
}
```

**Response field rules:**

- `status` at this point is always `"pending_admin"` (see §8.2 `ConnStatus` enum).

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","message"], "msg": "ensure this value has at most 200 characters", "type": "value_error.any_str.max_length" }
    ]
  }
}
```

**Error 401:** see §7.0.4.

**Error 403 — insufficient_role:**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "insufficient_role", "message": "Requires one of: admin, lp, potential_lp, startup_funded, super_admin, vc" }
}
```

**Error 404 — not_found (target user does not exist):**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Target user not found" }
}
```

**Error 409 — conflict (duplicate request):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "A connection with this user already exists",
    "detail": { "existing_connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f", "status": "pending_admin" }
  }
}
```

Enforced by `UNIQUE(requester_id, target_id)` in DB.

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. User on `/profile/:id` or search result clicks "Request Connect".
2. Modal opens with optional 200-char message textarea.
3. Submit → `POST /connections/request`.
4. On 200 → close modal; toast "Request sent, awaiting admin approval"; optimistic update on profile button → "Pending admin approval"; invalidate `qk.connections.pending`.
5. On 409 → toast "You already have a connection request with this user"; close modal.
6. On 404 → toast "User not found"; redirect `/search`.
7. On 422 → inline textarea error.

**Data transformation notes:**

- `message` is persisted as `reason` in DB (naming drift). The frontend uses `message` everywhere (backend translates).
- Invalidate `qk.connections.pending` AND `qk.profile.byId(target_id)` (will flip `has_requested=true`).

---

### 7.6.2 `PATCH /connections/{id}/admin`

**Purpose:** Admin approves or rejects a `pending_admin` connection. On approve, status moves to `pending_target` and target is notified. On reject, status moves to `rejected_admin` and requester is notified.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Path parameters:**

- `id` (UUID, required) — `connection_id`.

**Request body:**

```json
{ "action": "approve", "note": "Looks good." }
```

**Request field rules:**

- `action` (string, required) — `"approve"` | `"reject"`.
- `note` (string, optional) — free-form admin comment; logged to `admin_action_log`.

**Success 200 — approved:**

```json
{
  "data": {
    "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
    "status": "pending_target",
    "admin_id": "a1b2c3d4-5678-90ab-cdef-0123456789ab",
    "acted_at": "2026-04-23T11:30:12Z"
  },
  "error": null
}
```

**Success 200 — rejected:**

```json
{
  "data": {
    "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
    "status": "rejected_admin",
    "admin_id": "a1b2c3d4-5678-90ab-cdef-0123456789ab",
    "acted_at": "2026-04-23T11:30:12Z"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","action"], "msg": "string does not match regex \"^(approve|reject)$\"", "type": "value_error.str.regex" }
    ]
  }
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — insufficient_role:** see §7.0.4 (admin check failed).

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Connection request not found" }
}
```

**Error 409 — conflict (wrong current status):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Cannot approve: connection is not pending_admin",
    "detail": { "current_status": "accepted" }
  }
}
```

**UI flow:**

1. Admin on `/admin/connections` sees row with Approve/Reject buttons.
2. Click Approve → confirm dialog → `PATCH /connections/{id}/admin { action: 'approve' }`.
3. On 200 → row disappears from pending queue (optimistic); invalidate `qk.admin.connections`; toast "Approved".
4. On 409 → refetch list (stale state); show "This was already handled".

**Data transformation notes:**

- Optimistic update pattern: on mutation fire, remove row from cached list; rollback on error.
- Invalidate `qk.admin.connections`, `qk.admin.summary` (badge count), `qk.connections.pending`.

---

### 7.6.3 `PATCH /connections/{id}/respond`

**Purpose:** Target accepts or declines a connection that is `pending_target`. On accept, status → `accepted`, contact details unlock both ways, a `connection_intros` row is created. On decline, status → `declined`.

**Required roles:** Any authenticated (backend enforces that caller is the `target_id`).

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Path parameters:**

- `id` (UUID, required) — `connection_id`.

**Request body:**

```json
{ "action": "accept" }
```

**Request field rules:**

- `action` (string, required) — `"accept"` | `"decline"`.

**Success 200 — accepted:**

```json
{
  "data": {
    "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
    "status": "accepted",
    "intro_id": "aa11bb22-cc33-dd44-ee55-ff6677889900",
    "responded_at": "2026-04-23T12:01:00Z"
  },
  "error": null
}
```

**Success 200 — declined:**

```json
{
  "data": {
    "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
    "status": "declined",
    "intro_id": null,
    "responded_at": "2026-04-23T12:01:00Z"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error:** (action not in enum) — same shape as §7.6.2.

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — forbidden (caller is not the target):**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "Only the target can respond to this request" }
}
```

**Error 404 — not_found:** as above.

**Error 409 — conflict (wrong status, e.g. not yet admin-approved):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Cannot respond: connection is not pending_target",
    "detail": { "current_status": "pending_admin" }
  }
}
```

**UI flow:**

1. Target user opens `/connections/pending` → sees incoming request card.
2. Click Accept → `PATCH /connections/{id}/respond { action: 'accept' }`.
3. On 200 accept → toast "Connection accepted — you can now see contact details"; invalidate `qk.connections.list` and `qk.connections.pending`; navigate to `/connections`.
4. On decline → toast "Declined"; refresh pending.
5. On 409 → refetch pending (probably already handled).

**Data transformation notes:**

- `intro_id` is the FK in `connection_intros`; used for feedback (§7.7.2).
- After accept, also invalidate `qk.profile.byId(counterpart_id)` — `contact` will now be unmasked.

---

### 7.6.4 `GET /connections`

**Purpose:** List the caller's accepted connections. Cursor-paginated.

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `limit` (int, optional, 1–200, default 50).
- `cursor` (string, optional, nullable) — from previous response's `next_cursor`.

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
        "status": "accepted",
        "counterpart": {
          "user_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
          "name": "Kapil Sahu",
          "role": "lp",
          "organisation": "Warmup Ventures",
          "avatar_url": null,
          "contact": {
            "email": "kapil@warmup.ventures",
            "phone": "+919876543210",
            "linkedin_url": "https://linkedin.com/in/kapilsahu"
          }
        },
        "created_at": "2026-04-10T10:30:00Z",
        "responded_at": "2026-04-11T08:01:00Z"
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `counterpart` is the OTHER user — never the caller.
- `counterpart.contact` present iff `status === 'accepted'`; `null` otherwise.
- `counterpart.avatar_url` nullable.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/connections` mount → `useInfiniteQuery` with `qk.connections.list(50)`.
2. Render rows with counterpart name, role badge, email/phone/linkedin chips.
3. Scroll → fetch next page using `next_cursor`.
4. Empty → `<EmptyState title="No connections yet" action={<Button>Explore search</Button>} />`.

**Data transformation notes:**

- `counterpart.contact` may be null even with status accepted (race window before DB commit); treat absence gracefully.
- Display role via a coloured badge per enum; never render the raw enum key.

---

### 7.6.5 `GET /connections/pending`

**Purpose:** List the caller's pending connection requests (both sent-awaiting-admin and received-awaiting-target-response).

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:** Same as §7.6.4 (`limit`, `cursor`).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
        "status": "pending_admin",
        "direction": "outgoing",
        "counterpart": {
          "user_id": "3c9a1e00-...",
          "name": "Kapil Sahu",
          "role": "lp",
          "organisation": "Warmup Ventures",
          "avatar_url": null
        },
        "message": "Hi Kapil — saw Acme's seed round...",
        "created_at": "2026-04-22T10:30:00Z",
        "responded_at": null
      },
      {
        "connection_id": "11223344-...",
        "status": "pending_target",
        "direction": "incoming",
        "counterpart": {
          "user_id": "7f8e9d0c-...",
          "name": "Priya Rao",
          "role": "vc",
          "organisation": "NeoVC",
          "avatar_url": "https://cdn/priya.jpg"
        },
        "message": "Excited about Acme's traction...",
        "created_at": "2026-04-23T09:15:00Z",
        "responded_at": null
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `direction` — `"outgoing"` (caller is requester) | `"incoming"` (caller is target).
- `status` one of `pending_admin`, `pending_target`, `rejected_admin`, `declined`.
- Contact details NEVER present here (not yet accepted).
- `message` may be null if the requester didn't write one.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/connections/pending` → two tabs: Incoming (`direction === 'incoming'`) / Outgoing.
2. Incoming items with `status === 'pending_target'` get Accept/Decline buttons → §7.6.3.
3. Outgoing items show a status pill (Awaiting admin, Awaiting target).
4. Infinite scroll.

**Data transformation notes:**

- Group client-side by `direction` or use separate query calls with a `direction` filter (not yet supported server-side — filter client-side for now).
- Stale-while-revalidate: 60s staleTime, refetch on focus.

---

## 7.7 Interactions

### 7.7.1 `POST /interactions/log`

**Purpose:** Log an ephemeral UI interaction for analytics / exclusions / audit. Idempotent for `search_view` and `profile_view` within a 60-second window per (actor, target, type).

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "target_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
  "interaction_type": "profile_view",
  "target_type": "startup",
  "source": "search_card",
  "metadata": { "query": "fintech seed", "rank": 1 }
}
```

**Request field rules:**

- `target_id` (UUID, required).
- `interaction_type` (string, required) — MUST be one of: `search_view`, `search_click`, `profile_view`, `meeting_booked`. Other types (`connection_*`, `feedback_*`, `match_*`) are written by their own backend modules and REJECTED here.
- `target_type` (string, optional, default `"lp"`) — `"lp" | "startup"`.
- `source` (string, optional) — free-form UI origin tag (`"search_card"`, `"profile_header"`, `"digest_link"`).
- `metadata` (object, optional) — free-form JSON; used for analytics.

**Success 200:**

```json
{ "data": { "logged": true, "deduped": false }, "error": null }
```

**Success 200 — deduped (within 60s):**

```json
{ "data": { "logged": false, "deduped": true }, "error": null }
```

**Error 400 / 422 — validation_error (invalid interaction_type):**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","interaction_type"], "msg": "interaction_type not allowed via this endpoint", "type": "value_error" }
    ]
  }
}
```

**Error 401:** see §7.0.4.

**Error 404 — not_found (target user missing):** see §7.0.4.

**Error 429 / 500:** see §7.0.4.

**UI flow:**

1. Search page renders cards → fire-and-forget `POST /interactions/log { interaction_type: 'search_view', target_id, target_type }` per visible card (batch or individual).
2. Profile page mount → fire ONCE `POST /interactions/log { interaction_type: 'profile_view', target_id, target_type, source: 'profile_page' }`.
3. Click-through → `interaction_type: 'search_click'`.
4. Meeting confirmed → `interaction_type: 'meeting_booked'`.
5. Never await this call in a user-facing flow — silently log failures via `console.warn`.

**Data transformation notes:**

- Client-side dedup cache (IndexedDB or in-memory `Set` with 60s TTL) avoids burning the rate limit on re-renders.
- Don't block UI if this call fails.

---

### 7.7.2 `POST /interactions/feedback`

**Purpose:** After a connection introduction (`connection_intros` row exists), capture feedback from one side: was the intro useful?

**Required roles:** Any authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "intro_id": "aa11bb22-cc33-dd44-ee55-ff6677889900", "response": "yes" }
```

**Request field rules:**

- `intro_id` (UUID, required) — from §7.6.3 response.
- `response` (string, required) — `"yes"` | `"no"`.

**Success 200:**

```json
{ "data": { "recorded": true, "intro_id": "aa11bb22-...", "response": "yes" }, "error": null }
```

**Error 400 / 422 — validation_error:** (bad response value) — same shape.

**Error 401 / 429 / 500:** see §7.0.4.

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Intro not found" }
}
```

**Error 409 — conflict (already submitted):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Feedback already submitted for this intro",
    "detail": { "previous_response": "yes" }
  }
}
```

`UNIQUE(connection_id, user_id)` in DB.

**UI flow:**

1. 48h after accept, the backend sends a feedback prompt via email; dashboard also surfaces pending feedback on `/connections`.
2. User clicks Yes/No → `POST /interactions/feedback { intro_id, response }`.
3. On 200 → toast "Thanks for the feedback"; hide prompt.
4. On 409 → hide prompt silently (already done).
5. On 404 → hide prompt + log.

**Data transformation notes:**

- Feedback modifies matchmaking weights downstream; no user-visible effect.

---

### 7.7.3 `GET /interactions/profile-viewers`

**Purpose:** "Who viewed my profile" — list of users who invoked `POST /interactions/log` with `interaction_type='profile_view'` targeting the caller.

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `limit` (int, optional, 1–200, default 50).
- `cursor` (string, optional, nullable).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "viewer": {
          "user_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
          "name": "Kapil Sahu",
          "role": "lp",
          "organisation": "Warmup Ventures",
          "avatar_url": null
        },
        "viewed_at": "2026-04-20T15:33:10Z"
      },
      {
        "viewer": {
          "user_id": "a7b3d500-3f21-4a99-9e2f-8a1b3c4d5e6f",
          "name": "Priya Rao",
          "role": "vc",
          "organisation": "NeoVC",
          "avatar_url": "https://cdn/priya.jpg"
        },
        "viewed_at": "2026-04-19T09:12:45Z"
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `viewer.avatar_url` nullable.
- PII: viewer email/phone are NOT exposed (see §13 G11).
- Deduped at the DB level via UNIQUE index on `(actor_id, target_id, interaction, target_type)` for `profile_view` — one entry per viewer.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/profile-viewers` → `useInfiniteQuery`.
2. Render list with viewer name + role + organisation + relative date (`5 hours ago`).
3. Click card → navigate to `/profile/{viewer.user_id}` (if permitted).
4. Empty → "No one has viewed your profile yet."

**Data transformation notes:**

- Relative time via `date-fns` `formatDistanceToNow`.
- Do NOT surface a "last seen" presence indicator.

---

### 7.7.4 `GET /interactions/exclusions`

**Purpose:** Admin debug — list of targets a given user has explicitly passed on (for matchmaking exclusion diagnostics).

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `user_id` (UUID, required) — whose exclusions to list.
- `target_type` (string, optional, default `"lp"`) — `"lp" | "startup"`.
- `limit` (int, optional, 1–200, default 50).
- `cursor` (string, optional, nullable).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "target_id": "3c9a1e00-...",
        "target_name": "Kapil Sahu",
        "interaction_type": "feedback_negative",
        "created_at": "2026-04-15T12:00:00Z"
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Error 400 — validation_error (missing user_id):**

```json
HTTP 400
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["query","user_id"], "msg": "field required", "type": "value_error.missing" }
    ]
  }
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/users/:id/exclusions` (internal debug page) → fetch with user_id.
2. Render as a simple table.

**Data transformation notes:**

- Admin-only; never link this from external-user navigation.

---

## 7.8 Matchmaking

### 7.8.1 `POST /matchmaking/generate`

**Purpose:** Enqueue a Celery job that runs the weekly matchmaking pipeline for a given week. Produces `match_suggestions` rows with `status='pending'` for admin review. Returns immediately with a `job_id`.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 5 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "week_of": "2026-04-28" }
```

**Request field rules:**

- `week_of` (string, required) — ISO date `YYYY-MM-DD`. Must be a Monday by convention (not enforced server-side).

**Success 202:**

```json
HTTP 202
{
  "data": {
    "job_id": "b4c5d6e7-8f90-1a2b-3c4d-5e6f7a8b9c0d",
    "status": "queued",
    "week_of": "2026-04-28"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error:** invalid date format.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. Admin on `/admin/matchmaking` → selects week via date picker → clicks Generate.
2. `POST /matchmaking/generate { week_of }`.
3. On 202 → render `<JobStatusCard job_id={...} />` polling §7.8.2.
4. On SUCCESS → invalidate `qk.matchmaking.pending`; toast "Generated N suggestions".

**Data transformation notes:**

- Clamp `week_of` to Monday client-side via `date-fns` `startOfWeek({ weekStartsOn: 1 })`.

---

### 7.8.2 `GET /matchmaking/jobs/{job_id}`

**Purpose:** Poll a matchmaking generation job.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `job_id` (UUID, required).

**Success 200:** Same shape as §7.3.4 (pitch deck job). `result` on SUCCESS:

```json
{
  "data": {
    "job_id": "b4c5d6e7-...",
    "state": "SUCCESS",
    "ready": true,
    "successful": true,
    "result": {
      "generated_count": 47,
      "week_of": "2026-04-28"
    }
  },
  "error": null
}
```

**Error 401 / 403 / 404 / 429 / 500:** see §7.0.4 and §7.3.4 patterns.

**UI flow:** Identical to §7.3.4.

**Data transformation notes:** `result.generated_count` is informational; always refetch pending list after success.

---

### 7.8.3 `POST /matchmaking/approve`

**Purpose:** Admin approves a single pending suggestion. Flips `status` from `pending` to `approved`. Does NOT auto-create a connection (GAP-015); user still needs to respond with `accepted`.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "suggestion_id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f" }
```

**Success 200:**

```json
{
  "data": {
    "suggestion_id": "c1d2e3f4-...",
    "status": "approved",
    "approved_at": "2026-04-23T10:00:00Z"
  },
  "error": null
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Suggestion not found" }
}
```

**Error 409 — conflict (already approved):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Suggestion is not pending",
    "detail": { "current_status": "approved" }
  }
}
```

**UI flow:**

1. `/admin/matchmaking` pending list → Approve button per row.
2. On 200 → optimistic remove from pending; toast.
3. On 409 → refetch pending (stale).

**Data transformation notes:**

- Invalidate `qk.matchmaking.pending` and `qk.matchmaking.suggestions` (target user will now see it).

---

### 7.8.4 `GET /matchmaking/pending`

**Purpose:** Admin list of pending (unapproved) suggestions across all users.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:** none currently. (Filtering by `week_of` may arrive later; pass via query key for future-proofing.)

**Success 200:**

```json
{
  "data": [
    {
      "id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
      "lp_id": "b1c2d300-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
      "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
      "score": 0.82,
      "reason": "Sector + stage + ticket match",
      "status": "pending",
      "week_of": "2026-04-28",
      "company_name": "Acme Technologies",
      "sector": "fintech",
      "one_liner": "AI for compliance"
    }
  ],
  "error": null
}
```

**Response field rules:**

- `score` — float 0..1.
- `reason` — one-sentence GPT-4o justification; ≤ 200 chars.
- `company_name`, `sector`, `one_liner` — hydrated from startup row for display convenience.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/matchmaking` → pending tab.
2. Table rows with score badge, reason, actions (Approve / Reject).
3. Reject currently uses the same PATCH pattern (not yet exposed — use skip via admin DB access; see §13).

**Data transformation notes:**

- Group by `week_of` in UI for readability.

---

### 7.8.5 `GET /matchmaking/suggestions`

**Purpose:** End-user view — returns suggestions addressed to the caller (`status='approved'` or `pending` for admin preview).

**Required roles:** `startup_funded`, `lp`, `potential_lp`, `vc`, `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:** Same item shape as §7.8.4. For non-admin callers, only `status='approved'` items are returned.

```json
{
  "data": [
    {
      "id": "c1d2e3f4-...",
      "lp_id": "<caller user_id if LP>",
      "startup_id": "3c9a1e00-...",
      "score": 0.82,
      "reason": "Sector + stage + ticket match",
      "status": "approved",
      "week_of": "2026-04-28",
      "company_name": "Acme Technologies",
      "sector": "fintech",
      "one_liner": "AI for compliance"
    }
  ],
  "error": null
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/matchmaking` mount → `useQuery`.
2. Render cards with company/LP name, reason, match score badge.
3. Action buttons: "Interested", "Not a fit", "Skip" → §7.8.6.
4. Empty → "No suggestions this week. Check back on Monday."

**Data transformation notes:**

- The caller's own side (lp_id OR startup_id corresponds to them); display the OTHER side's details.
- Cache for 5 minutes; refetch on focus.

---

### 7.8.6 `POST /matchmaking/suggestions/{id}/respond`

**Purpose:** User responds to an approved suggestion. Records the response; mutual `accepted` auto-creates a connection request (admin-gated).

**Required roles:** `startup_funded`, `lp`, `potential_lp`, `vc`, `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Path parameters:**

- `id` (UUID, required) — suggestion id.

**Request body:**

```json
{ "action": "accepted" }
```

**Request field rules:**

- `action` (string, required) — `"accepted" | "rejected" | "skipped"`.

**Success 200:**

```json
{
  "data": {
    "suggestion_id": "c1d2e3f4-...",
    "action": "accepted",
    "connection_created": false,
    "connection_id": null
  },
  "error": null
}
```

**Success 200 — mutual accept auto-creates connection:**

```json
{
  "data": {
    "suggestion_id": "c1d2e3f4-...",
    "action": "accepted",
    "connection_created": true,
    "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error:** bad action.

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — forbidden (not your suggestion):**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "Suggestion does not belong to caller" }
}
```

**Error 404 — not_found.**

**Error 409 — conflict (already responded):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Suggestion already responded to",
    "detail": { "previous_action": "rejected" }
  }
}
```

**UI flow:**

1. User clicks Interested on a card → `POST /matchmaking/suggestions/{id}/respond { action: 'accepted' }`.
2. On 200 with `connection_created=true` → toast "Match! Connection request created — awaiting admin approval."
3. On 200 with `connection_created=false` → toast "Noted. We'll let you know when the other side responds."
4. Card removed from `/matchmaking` list; invalidate `qk.matchmaking.suggestions` and `qk.connections.pending`.

**Data transformation notes:**

- `connection_id` present only when `connection_created=true`.
- Optimistic update: remove the card immediately; rollback on error.

---

## 7.9 Portfolio / MIS

> **Redesigned 2026-04-27 (decisions.md [P-23]).** MIS is now a **file upload** — founders upload their existing MIS document (Excel/Tally/CSV/PDF). Financial operating metrics (`revenue_monthly`, `burn_monthly`, `runway_months`) have moved to the **pitch profile** (§7.3.1) and are no longer submitted through this endpoint.

### 7.9.1 `GET /portfolio/mis`

**Purpose:** Return the current period, company name, and last submission status. Frontend uses this to decide whether to show the "already submitted" banner.

**Required roles:** `startup_funded`, `admin`, `super_admin`.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:**

```json
{
  "data": {
    "company_name": "Acme Technologies",
    "current_period": "2026-04",
    "last_submission": {
      "submission_id": "d4e5f6a7-...",
      "period": "2026-04",
      "file_url": "https://drive.google.com/file/d/abc/view",
      "file_name": "MIS-Apr-2026.xlsx",
      "comment": "Q1 final numbers",
      "submitted_at": "2026-04-23T10:00:00Z"
    }
  },
  "error": null
}
```

**Response field rules:**

- `last_submission` — null if no submission exists for `current_period`.
- `last_submission.file_url` — Drive view URL (may be a stub URL like `https://drive.google.com/stub/...` when Drive credentials aren't configured in Phase 0–3).
- `last_submission.comment` — nullable.

**Error 401 / 403 / 404 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/mis` mount → `useQuery(qk.mis.form)`.
2. If `last_submission !== null` → show banner "MIS for {current_period} already submitted on {submitted_at}. Upload a revised file to replace."
3. On 404 (no startup profile) → redirect to `/pitch` with message "Create your pitch profile first".

---

### 7.9.2 `POST /portfolio/mis`

**Purpose:** Upload an MIS document for the current period. Stored in the startup's Google Drive folder. UNIQUE(startup_id, period) enforced — uploading again replaces the existing record.

**Required roles:** `startup_funded`, `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

**Request body — `multipart/form-data`:**

| Field     | Type                | Required | Notes                                        |
| --------- | ------------------- | -------- | -------------------------------------------- |
| `file`    | binary (UploadFile) | ✅       | Excel / Tally export / CSV / PDF. Max 20 MB. |
| `period`  | text                | ✅       | `YYYY-MM` — e.g. `2026-04`.                  |
| `comment` | text                | ❌       | Optional founder note accompanying the file. |

**Allowed MIME types:** `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`, `application/pdf`, `application/octet-stream` (generic fallback for Tally exports).

**NOTE:** This is `multipart/form-data`, NOT JSON. Use `FormData` with `apiClient.post('/portfolio/mis', formData)` — do NOT set `Content-Type` manually (axios sets the boundary automatically).

**Success 200:**

```json
{
  "data": {
    "submission_id": "d4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f90",
    "period": "2026-04",
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "file_url": "https://drive.google.com/file/d/1abcDEF/view",
    "file_name": "MIS-Apr-2026.xlsx",
    "submitted_at": "2026-04-27T15:45:00Z"
  },
  "error": null
}
```

**Error 422 — invalid period:**

```json
HTTP 422
{
  "data": null,
  "error": { "code": "validation_error", "message": "period must be YYYY-MM (e.g. 2026-04)" }
}
```

**Error 422 — missing file:**

```json
HTTP 422
{
  "data": null,
  "error": { "code": "validation_error", "message": "file is required. Upload an Excel, CSV, or PDF MIS report." }
}
```

**Error 422 — unsupported mime type:**

```json
HTTP 422
{
  "data": null,
  "error": { "code": "validation_error", "message": "Unsupported file type 'image/png'. Allowed: Excel, CSV, PDF, or generic binary." }
}
```

**Error 422 — file too large:**

```json
HTTP 422
{
  "data": null,
  "error": { "code": "validation_error", "message": "File too large (21504 KB). Max 20 MB." }
}
```

**Error 409 — mis_already_submitted:**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "mis_already_submitted",
    "message": "MIS already submitted for this period",
    "detail": { "period": "2026-04" }
  }
}
```

**Error 401 / 403 / 404 / 429 / 500:** see §7.0.4.

**UI flow:**

1. User opens `/mis` → `<FileDropzone accept={xlsx/csv/pdf}>` + period display (current month, read-only) + optional comment textarea.
2. On file selection, show filename + size. Enable "Upload MIS" button.
3. On submit, build `FormData`:
   ```ts
   const fd = new FormData();
   fd.append('file', file);
   fd.append('period', currentPeriod); // 'YYYY-MM'
   if (comment) fd.append('comment', comment);
   ```
4. `POST /portfolio/mis` with `FormData` — axios strips `Content-Type` JSON header automatically.
5. On 200 → toast "MIS uploaded for {period}"; invalidate `qk.mis.form` + `qk.admin.summary`.
6. On 409 → banner "Already uploaded — re-upload to replace" + keep UI (admins may upload revised file).
7. On 422 mime → highlight dropzone red with "This file type isn't supported. Try an Excel or CSV export from Tally."
8. On 422 size → "File is too large. Max 20 MB."

**Data transformation notes:**

- Client-side Zod schema validates `period` regex + file presence + file size before submit.
- `file_url` in the response is a Drive view URL (or a stub in Phase 0–3 when Drive isn't configured). Render as a clickable link with `target="_blank" rel="noopener noreferrer"`.
- Financial metrics (`revenue_monthly`, `burn_monthly`, `runway_months`) are **not** part of this form. They live in `POST /pitch/profile` and appear on the Pitch page.
- After success, the `/mis` GET endpoint will return `last_submission` with the new row.

---

### 7.9.3 `GET /portfolio/mis/history`

**Purpose:** Paginated list of past MIS submissions for a startup (file URL + filename + comment + period). Admins can query any startup via `company_id`; non-admins see their own.

**Required roles:** `startup_funded`, `admin`, `super_admin`.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `company_id` (UUID, REQUIRED for admins; ignored for non-admins).
- `limit` (int, optional, 1–60, default 12).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "submission_id": "d4e5f6a7-...",
        "period": "2026-04",
        "file_url": "https://drive.google.com/file/d/abc/view",
        "file_name": "MIS-Apr-2026.xlsx",
        "comment": "Q1 final numbers",
        "submitted_at": "2026-04-27T15:45:00Z"
      }
    ]
  },
  "error": null
}
```

**Response field rules:**

- `file_url` and `file_name` nullable (rows created before the file-upload redesign may have neither).
- `comment` nullable.
- Sorted newest-first.

**Error 400 / 401 / 403 / 404 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/mis` page bottom section → `GET /portfolio/mis/history` for the past-uploads list.
2. Render each row as: period badge + filename chip + optional comment + Download/View link.
3. Empty state: "No MIS reports uploaded yet."

**Data transformation notes:**

- Period `YYYY-MM` → display as `format(parse(x, 'yyyy-MM', new Date()), 'LLLL yyyy')` e.g. "April 2026".
- `file_url` link opens in new tab with `rel="noopener noreferrer"`.

---

## 7.10 Meetings

### 7.10.1 `GET /schedule/slots`

**Purpose:** Fetch available 30-minute meeting slots from Google Calendar (team calendar) for the next N days. Used to render the booking calendar grid.

**Required roles:** All authenticated (any of the 10 roles).

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `from_date` (string, optional, default today) — `YYYY-MM-DD`.
- `days` (int, optional, 1–30, default 7).

**Success 200:**

```json
{
  "data": [
    {
      "start": "2026-04-24T10:00:00+05:30",
      "end": "2026-04-24T10:30:00+05:30",
      "date": "2026-04-24"
    },
    {
      "start": "2026-04-24T10:30:00+05:30",
      "end": "2026-04-24T11:00:00+05:30",
      "date": "2026-04-24"
    },
    {
      "start": "2026-04-24T11:00:00+05:30",
      "end": "2026-04-24T11:30:00+05:30",
      "date": "2026-04-24"
    }
  ],
  "error": null
}
```

**Response field rules:**

- Returns ONLY available slots (booked slots are filtered out).
- All timestamps are IST (Asia/Kolkata, +05:30).
- Empty array is a valid response (no slots available).

**Error 400 / 422 — validation_error:** out-of-range `days`.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/schedule` mount → `GET /schedule/slots?from_date=<today>&days=7`.
2. Render as a calendar grid: rows = dates, columns = 30-min time slots.
3. Green cells = available; grey = unavailable (absent from response).
4. Click a slot → open booking modal (asks target + purpose) → §7.10.2.
5. Empty response → "No available slots in the next 7 days. Try 30 days."

**Data transformation notes:**

- Group slots by `date` client-side.
- Render in the user's local timezone via `date-fns-tz`; backend returns IST.

---

### 7.10.2 `POST /schedule/book`

**Purpose:** Book a meeting slot with a target user. Writes a Google Calendar event and a `meeting_bookings` row. A GIST EXCLUSION constraint prevents overlapping meetings on the target.

**Required roles:** All authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "target_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
  "scheduled_at": "2026-04-24T10:00:00+05:30",
  "duration_minutes": 30,
  "purpose": "Exploratory chat about compliance thesis"
}
```

**Request field rules:**

- `target_id` (UUID, required).
- `scheduled_at` (ISO-8601 with timezone, required) — must be in the future.
- `duration_minutes` (int, required, default 30) — `30` or `60` (validator enforces `ge=30`, `le=60`).
- `purpose` (string, optional) — ≤ 500 chars.

**Success 200:**

```json
{
  "data": {
    "booking_id": "e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
    "calendar_event_id": "abcdef123456@google.com",
    "scheduled_at": "2026-04-24T10:00:00+05:30",
    "duration_minutes": 30,
    "status": "confirmed",
    "target_id": "3c9a1e00-...",
    "requester_id": "0f3c0b0a-..."
  },
  "error": null
}
```

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","duration_minutes"], "msg": "ensure this value is greater than or equal to 30", "type": "value_error.number.not_ge" }
    ]
  }
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**Error 404 — not_found (target does not exist):**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Target user not found" }
}
```

**Error 409 — conflict (slot no longer available — GIST overlap):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Target is not available at this time",
    "detail": { "scheduled_at": "2026-04-24T10:00:00+05:30" }
  }
}
```

**UI flow:**

1. User picks slot → modal with target selector + purpose.
2. Submit → `POST /schedule/book`.
3. On 200 → toast "Booked for {date}"; navigate to `/schedule` showing confirmation; invalidate `qk.meetings.bookings` + `qk.meetings.slots`.
4. On 409 → toast "That slot just filled up — pick another"; refetch slots.
5. On 404 → toast "User not found".

**Data transformation notes:**

- Submit `scheduled_at` in ISO-8601 WITH timezone (use `date-fns-tz` `zonedTimeToUtc` + `formatISO`).
- `calendar_event_id` is the Google Calendar event ID; use for deep-linking to calendar if desired.

---

### 7.10.3 `GET /schedule/bookings`

**Purpose:** List the caller's meetings (either as requester or target). Cursor-paginated.

**Required roles:** All authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `limit` (int, optional, 1–200, default 50).
- `cursor` (string, optional, nullable).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "booking_id": "e5f6a7b8-...",
        "scheduled_at": "2026-04-24T10:00:00+05:30",
        "duration_minutes": 30,
        "status": "confirmed",
        "direction": "outgoing",
        "counterpart": {
          "user_id": "3c9a1e00-...",
          "name": "Kapil Sahu",
          "role": "lp",
          "organisation": "Warmup Ventures"
        },
        "purpose": "Exploratory chat",
        "calendar_event_id": "abcdef123456@google.com"
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `direction` — `"outgoing" | "incoming"`.
- `status` — `"pending" | "confirmed" | "cancelled"`.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/schedule` → Upcoming tab; `useInfiniteQuery`.
2. Render list grouped by date.
3. Row actions: View in Calendar (deep-link by `calendar_event_id`), Cancel → §7.10.4.

**Data transformation notes:**

- Sort items client-side by `scheduled_at` ascending if not already sorted.
- Filter out `status === 'cancelled'` by default, offer toggle to show all.

---

### 7.10.4 `DELETE /schedule/book/{booking_id}`

**Purpose:** Cancel a booking. Ownership: requester, target, OR admin. Google Calendar delete is best-effort; backend logs + ignores GCal failure.

**Required roles:** All authenticated (ownership enforced in service).

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `booking_id` (UUID, required).

**Success 200:**

```json
{
  "data": {
    "booking_id": "e5f6a7b8-...",
    "status": "cancelled",
    "cancelled_at": "2026-04-23T16:00:00Z"
  },
  "error": null
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — forbidden (not owner/target/admin):**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "You cannot cancel this booking" }
}
```

**Error 404 — not_found.**

**Error 409 — conflict (already cancelled):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Booking already cancelled",
    "detail": { "status": "cancelled" }
  }
}
```

**UI flow:**

1. User clicks Cancel on a row → confirm dialog.
2. `DELETE /schedule/book/{id}`.
3. On 200 → toast "Cancelled"; optimistic remove; invalidate `qk.meetings.bookings` + `qk.meetings.slots`.
4. On 403 → toast "Only the organiser or admin can cancel".

**Data transformation notes:**

- GCal delete may fail silently (backend logs) — the booking is still cancelled locally. Refetch bookings to reconcile.

---

## 7.11 Travel

### 7.11.1 `POST /travel/plans`

**Purpose:** Declare a travel plan. Backend uses active plans for travel-based matchmaking alerts (email).

**Required roles:** All authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "destination_city": "Bengaluru",
  "travel_start": "2026-05-10",
  "travel_end": "2026-05-12",
  "purpose": "Investor meetings"
}
```

**Request field rules:**

- `destination_city` (string, required) — 1–200 chars.
- `travel_start` (string, required) — `YYYY-MM-DD`.
- `travel_end` (string, required) — `YYYY-MM-DD`; must be ≥ `travel_start` (client + server enforced).
- `purpose` (string, optional) — ≤ 500 chars.

**Success 200:**

```json
{
  "data": {
    "id": "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
    "user_id": "0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0",
    "destination_city": "Bengaluru",
    "travel_start": "2026-05-10",
    "travel_end": "2026-05-12",
    "purpose": "Investor meetings",
    "status": "active",
    "alerts_sent": false
  },
  "error": null
}
```

**Response field rules:**

- `status` — `"active" | "cancelled"`.
- `alerts_sent: boolean` — flips to `true` once matchmaking has sent the alert.

**Error 400 / 422 — validation_error (travel_end before travel_start):**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","travel_end"], "msg": "travel_end must be on or after travel_start", "type": "value_error" }
    ]
  }
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/travel` → "Add trip" button → modal with city + date range + purpose.
2. Submit → `POST /travel/plans`.
3. On 200 → toast "Trip added"; invalidate `qk.travel.plans`.
4. On 422 → inline field error.

**Data transformation notes:**

- Use `date-fns` `format(date, 'yyyy-MM-dd')` for date serialisation.

---

### 7.11.2 `GET /travel/plans`

**Purpose:** List the caller's travel plans.

**Required roles:** All authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `active_only` (boolean, optional, default `true`) — when `true`, only `status='active'` AND `travel_end >= today` are returned.

**Success 200:**

```json
{
  "data": [
    {
      "id": "f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
      "user_id": "0f3c0b0a-...",
      "destination_city": "Bengaluru",
      "travel_start": "2026-05-10",
      "travel_end": "2026-05-12",
      "purpose": "Investor meetings",
      "status": "active",
      "alerts_sent": false
    }
  ],
  "error": null
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/travel` mount → `GET /travel/plans?active_only=true`.
2. Render upcoming trips grouped by month.
3. Toggle "Show past trips" switches `active_only=false`.

**Data transformation notes:**

- Sort by `travel_start` ascending.

---

### 7.11.3 `DELETE /travel/plans/{id}`

**Purpose:** Cancel (soft-delete) a travel plan. Sets `status='cancelled'`.

**Required roles:** All authenticated. Ownership enforced — only the owner can cancel.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `id` (UUID, required).

**Success 200:**

```json
{
  "data": { "id": "f6a7b8c9-...", "status": "cancelled" },
  "error": null
}
```

**Error 401 / 429 / 500:** see §7.0.4.

**Error 403 — forbidden (not owner):**

```json
HTTP 403
{
  "data": null,
  "error": { "code": "forbidden", "message": "You do not own this travel plan" }
}
```

**Error 404 — not_found.**

**UI flow:**

1. User clicks Cancel on a trip row → confirm dialog.
2. `DELETE /travel/plans/{id}`.
3. On 200 → optimistic remove; toast.
4. On 404 → already deleted; refetch.

**Data transformation notes:**

- Cancelled trips are hidden from `active_only=true` lists automatically.

---

### 7.11.4 `PUT /travel/home-city`

**Purpose:** Set or update the caller's home city (`users.home_city`). Used for proximity-based matchmaking.

**Required roles:** All authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "home_city": "Mumbai" }
```

**Request field rules:**

- `home_city` (string, required) — 1–200 chars.

**Success 200:**

```json
{
  "data": { "user_id": "0f3c0b0a-...", "home_city": "Mumbai" },
  "error": null
}
```

**Error 400 / 422 — validation_error (empty or too-long value).**

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/travel` settings panel → home city input.
2. Debounced submit → `PUT /travel/home-city`.
3. On 200 → toast "Saved"; invalidate `qk.auth.me` (includes `home_city`).

**Data transformation notes:**

- Trim whitespace on submit.
- Case-insensitive matching in backend for alerts; display as-typed.

---

## 7.12 Admin

All endpoints in this section require `admin` or `super_admin`. Non-admin callers receive 403 per §7.0.4.

### 7.12.1 `GET /admin/summary`

**Purpose:** Admin dashboard home data. One call hydrates multiple widgets.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:**

```json
{
  "data": {
    "pending_connection_count": 4,
    "mis_status": [
      {
        "startup_id": "3c9a1e00-...",
        "company_name": "Acme Technologies",
        "period": "2026-04",
        "submitted": false
      },
      {
        "startup_id": "a7b3d500-...",
        "company_name": "NeoLedger",
        "period": "2026-04",
        "submitted": true
      }
    ],
    "recent_digests": [
      { "id": "e3d2c1b0-...", "digest_type": "lp_weekly", "sent_at": "2026-04-21T07:00:00Z" }
    ],
    "recent_actions": [
      {
        "admin_id": "a1b2c3d4-5678-90ab-cdef-0123456789ab",
        "admin_name": "Raghav",
        "action": "approve_connection",
        "target_type": "connection_request",
        "target_id": "f0e1d2c3-...",
        "created_at": "2026-04-23T10:30:00Z"
      }
    ]
  },
  "error": null
}
```

**Response field rules:**

- `pending_connection_count` drives the sidebar badge.
- `mis_status[].submitted: boolean` — per-portfolio company for current month.
- `recent_*` arrays capped at 10 items each.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin` mount → `useQuery(qk.admin.summary)`.
2. Render KPI cards + recent actions feed.
3. Click pending count → navigate `/admin/connections?status=pending_admin`.

**Data transformation notes:**

- Cache 60s, refetch on focus.
- Invalidate after `PATCH /connections/{id}/admin` (§7.6.2).

---

### 7.12.2 `GET /admin/connections`

**Purpose:** List connection requests for admin review (any status). Cursor-paginated.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `status` (string, optional) — one of `conn_status` ENUM (`pending_admin`, `approved`, `rejected_admin`, `pending_target`, `accepted`, `declined`).
- `cursor` (string, optional, nullable).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "connection_id": "f0e1d2c3-b4a5-4687-9f00-1a2b3c4d5e6f",
        "status": "pending_admin",
        "requester": {
          "user_id": "0f3c0b0a-...",
          "name": "Kapil Sahu",
          "role": "lp",
          "organisation": "Warmup Ventures"
        },
        "target": {
          "user_id": "3c9a1e00-...",
          "name": "Priya Rao",
          "role": "startup_funded",
          "organisation": "NeoLedger"
        },
        "message": "Hi Priya — interested in your pre-seed.",
        "created_at": "2026-04-22T10:30:00Z",
        "responded_at": null
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/connections` → tabs per status.
2. Row actions: Approve / Reject → §7.6.2.
3. Infinite scroll with `next_cursor`.

**Data transformation notes:**

- Page size 20 (see CLAUDE.md GAP-011).
- Persist active tab in URL (`?status=pending_admin`).

---

### 7.12.3 `GET /admin/digest`

**Purpose:** List digest workflows with status + last send info.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:**

```json
{
  "data": [
    {
      "workflow_name": "lp_weekly",
      "status": "active",
      "target_roles": ["lp", "potential_lp"],
      "schedule": "Monday 07:00 IST",
      "last_send": {
        "digest_id": "e3d2c1b0-...",
        "sent_at": "2026-04-21T07:00:00Z",
        "message_count": 87
      }
    },
    {
      "workflow_name": "vc_monthly",
      "status": "active",
      "target_roles": ["vc"],
      "schedule": "1st of month 10:00 IST",
      "last_send": null
    }
  ],
  "error": null
}
```

**Response field rules:**

- `status`: `"active" | "paused"`.
- `last_send` may be null (never sent).

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/digest` → list each workflow card with Send Now button.
2. Click Send Now → confirm → §7.12.4.

**Data transformation notes:**

- Treat the response as additive; new fields may appear.

---

### 7.12.4 `POST /admin/digest/send`

**Purpose:** Trigger an immediate digest send for a named workflow (bypasses scheduled cron).

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "workflow_name": "lp_weekly" }
```

**Request field rules:**

- `workflow_name` (string, required, min length 1).

**Success 200:**

```json
{
  "data": {
    "workflow_name": "lp_weekly",
    "triggered_at": "2026-04-23T16:45:00Z",
    "message_count": 87,
    "digest_id": "c3b2a100-..."
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (unknown workflow).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found (workflow not registered):**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Workflow not found: lp_weekly_test" }
}
```

**Error 409 — conflict (already in flight):**

```json
HTTP 409
{
  "data": null,
  "error": { "code": "conflict", "message": "A send is already in progress for this workflow" }
}
```

**UI flow:**

1. Admin clicks "Send Now".
2. Modal: "Trigger {workflow_name}?" → confirm.
3. `POST /admin/digest/send`.
4. On 200 → toast "Triggered — {message_count} messages queued"; invalidate `qk.admin.digest`.

**Data transformation notes:**

- Invalidate `qk.admin.summary.recent_digests` and `qk.digest.history`.

---

### 7.12.5 `PUT /admin/lp/{user_id}/funnel-status`

**Purpose:** Update an LP's funnel status. Triggers auto-actions based on new status (welcome email, follow-up reminder, etc.).

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Path parameters:**

- `user_id` (UUID, required) — the LP user.

**Request body:**

```json
{ "status": "3_in_conversation", "override": false }
```

**Request field rules:**

- `status` (string, required) — one of `1_new_lead`, `2_first_reach_out`, `3_in_conversation`, `4_soft_commit`, `5_invested` (DB CHECK).
- `override` (boolean, optional, default `false`) — skip step-order validation (normally can't skip forward).

**Success 200:**

```json
{
  "data": {
    "user_id": "b1c2d300-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
    "funnel_status": "3_in_conversation",
    "funnel_status_updated_at": "2026-04-23T17:00:00Z",
    "auto_actions_triggered": ["deal_suggestions_enabled", "meeting_scheduling_enabled"]
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (invalid status).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found (user missing or not LP).**

**Error 409 — conflict (status skip without override):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Cannot skip funnel stages without override=true",
    "detail": { "current_status": "1_new_lead", "attempted": "3_in_conversation" }
  }
}
```

**UI flow:**

1. `/admin/lp-funnel/:user_id` → show current status + buttons for each stage.
2. Click "Move to: In Conversation" → confirm → `PUT /admin/lp/.../funnel-status`.
3. On 409 → show "Enable override?" dialog.

**Data transformation notes:**

- Display labels: `1_new_lead` → "New Lead", etc. Use a map.

---

### 7.12.6 `POST /admin/partner-referral`

**Purpose:** Admin broadcasts a referral request to partners matching a sector (e.g. "startup X needs a CTO").

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "sector": "fintech",
  "message": "Acme Technologies needs senior Go engineers — 5+ years experience.",
  "startup_name": "Acme Technologies"
}
```

**Request field rules:**

- `sector` (string, required, min length 1).
- `message` (string, optional).
- `startup_name` (string, optional).

**Success 200:**

```json
{
  "data": {
    "partners_notified": 3,
    "partner_ids": ["p1-...", "p2-...", "p3-..."],
    "sector": "fintech"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (empty sector).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/partner-referral` form: sector picker + message textarea + startup name.
2. Submit → `POST /admin/partner-referral`.
3. On 200 → toast "Notified {partners_notified} partners".

**Data transformation notes:**

- `partner_ids` is informational; don't display user IDs in UI.

---

### 7.12.7 `GET /admin/quarterly-reports`

**Purpose:** List quarterly report artefacts and approval state.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `quarter` (string, optional) — e.g. `"Q1-2026"`.

**Success 200:**

```json
{
  "data": [
    {
      "report_id": "r1-...",
      "quarter": "Q1-2026",
      "status": "pending",
      "drive_url": "https://drive.google.com/file/d/abc/view",
      "generated_at": "2026-04-01T06:00:00Z",
      "approved_by": null,
      "approved_at": null,
      "distributed_at": null,
      "recipient_count": 120
    }
  ],
  "error": null
}
```

**Response field rules:**

- `status`: `"pending" | "approved" | "sent"`.
- Nullable: `approved_by`, `approved_at`, `distributed_at`.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/quarterly-reports` table with Approve button on pending rows.

**Data transformation notes:** Drive link opens in new tab with `rel="noopener noreferrer"`.

---

### 7.12.8 `POST /admin/quarterly-reports/approve`

**Purpose:** Approve a quarterly report + queue distribution (email to LPs).

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "report_id": "r1-..." }
```

**Success 200:**

```json
{
  "data": {
    "report_id": "r1-...",
    "status": "approved",
    "approved_by": "a1b2c3d4-...",
    "approved_at": "2026-04-23T17:30:00Z",
    "distribution_job_id": "dist-job-uuid"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (empty report_id).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found.**

**Error 409 — conflict (already approved/sent):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Report already approved",
    "detail": { "current_status": "approved" }
  }
}
```

**UI flow:**

1. Admin clicks Approve → confirm dialog (warns about distribution).
2. `POST /admin/quarterly-reports/approve`.
3. On 200 → row flips to "Approved, distributing…"; invalidate list.

**Data transformation notes:** The actual distribution happens async via Celery; `distribution_job_id` is informational.

---

### 7.12.9 `GET /admin/dead-letter-jobs`

**Purpose:** List failed Celery tasks in the dead-letter queue. Offset-paginated (legacy; the only endpoint that is NOT cursor-paginated).

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `retry_status` (string, optional) — one of `pending`, `retried`, `succeeded`, `abandoned`.
- `limit` (int, optional, 1–200, default 50).
- `offset` (int, optional, ≥ 0, default 0).

**Success 200 (note offset pagination shape — different from §7.0.3):**

```json
{
  "data": [
    {
      "id": "dlq-uuid-1",
      "task_name": "workers.jobs.digest_job.run",
      "task_id": "celery-uuid-abc",
      "args": [],
      "kwargs": { "segment": "lp" },
      "exception_class": "OpenAITimeoutError",
      "exception_message": "Timed out after 30s",
      "traceback": "Traceback (most recent call last):\n  File \"...\"...",
      "failed_at": "2026-04-20T05:12:00Z",
      "retried_at": null,
      "retry_status": "pending"
    }
  ],
  "error": null,
  "pagination": { "limit": 50, "offset": 0 }
}
```

**Response field rules:**

- `args`, `kwargs` are the original Celery task payload.
- `traceback` is a multi-line string; render inside `<pre>` with overflow.
- `retry_status`: `"pending" | "retried" | "succeeded" | "abandoned"`.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/dead-letter-jobs` → tabs per `retry_status` (URL param).
2. Table with task_name, exception_class, failed_at, actions.
3. Click row → drawer with full traceback + args.
4. Retry button → §7.12.10.

**Data transformation notes:**

- OFFSET pagination — use standard page counter UI (not infinite scroll).
- Display `failed_at` as relative time + absolute on hover.

---

### 7.12.10 `POST /admin/dead-letter-jobs/{id}/retry`

**Purpose:** Re-enqueue a dead-letter job. Preserves `task_name` / `args` / `kwargs`; creates a new Celery task; marks the DLQ row as `retried`.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Path parameters:**

- `id` (UUID, required) — DLQ row id.

**Request body:** none.

**Success 200:**

```json
{
  "data": {
    "dlq_id": "dlq-uuid-1",
    "new_task_id": "celery-uuid-xyz",
    "retry_status": "retried"
  },
  "error": null
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found:**

```json
HTTP 404
{
  "data": null,
  "error": { "code": "not_found", "message": "Dead-letter job not found" }
}
```

**Error 409 — conflict (already retried OR race):**

```json
HTTP 409
{
  "data": null,
  "error": { "code": "conflict", "message": "Cannot retry job in status=retried" }
}
```

**UI flow:**

1. Admin clicks Retry on a pending DLQ row.
2. Optimistic disable of Retry button.
3. `POST /admin/dead-letter-jobs/{id}/retry`.
4. On 200 → toast "Retried — new task {new_task_id}"; invalidate list.
5. On 409 → refetch (stale row).

**Data transformation notes:**

- `new_task_id` can be shown in a toast but not linked (no task-status endpoint for arbitrary tasks).

---

## 7.13 Digest

All endpoints below require `admin` or `super_admin`. Rate limit 30/min unless specified.

### 7.13.1 `POST /digest/generate`

**Purpose:** Generate AI-drafted digest content for a specific segment. Writes `digest_log` rows with `content.status='pending'`. Does NOT send.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 5 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "segment": "lp" }
```

**Request field rules:**

- `segment` (string, required, min length 1) — e.g. `"lp"`, `"potential_lp"`, `"vc"`. Maps to target roles.

**Success 200:**

```json
{
  "data": {
    "generated_count": 87,
    "segment": "lp",
    "digest_ids": ["e3d2c1b0-...", "a1b2c3d4-..."]
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (empty segment).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/digest` → "Generate for {segment}" button.
2. `POST /digest/generate`.
3. On 200 → toast "Generated {count} drafts"; invalidate `qk.digest.pending`.

**Data transformation notes:**

- `digest_ids` is informational; caller should re-fetch the pending list.

---

### 7.13.2 `POST /digest/approve`

**Purpose:** Approve a specific pending digest and enqueue delivery (email primary; WA in Phase 4). Flips row's `content.status` to `approved` then `sent` after worker runs.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 20 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{ "digest_id": "e3d2c1b0-1234-5678-90ab-cdef01234567" }
```

**Request field rules:**

- `digest_id` (string UUID, required, min length 1).

**Success 200:**

```json
{
  "data": {
    "sent": true,
    "digest_id": "e3d2c1b0-1234-5678-90ab-cdef01234567",
    "queued_at": "2026-04-23T18:00:00Z"
  },
  "error": null
}
```

**Error 400 / 422 — validation_error (empty digest_id).**

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**Error 404 — not_found.**

**Error 409 — conflict (already approved/sent):**

```json
HTTP 409
{
  "data": null,
  "error": {
    "code": "conflict",
    "message": "Digest is not in pending state",
    "detail": { "current_status": "sent" }
  }
}
```

**UI flow:**

1. `/admin/digest` pending list → Approve & Send → confirm dialog.
2. `POST /digest/approve`.
3. On 200 → optimistic remove from pending; toast "Approved — delivery queued"; invalidate history.

**Data transformation notes:**

- After success, poll `qk.digest.history` briefly (30s staleTime).

---

### 7.13.3 `GET /digest/pending`

**Purpose:** List all pending (unapproved) digests awaiting admin review.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:**

```json
{
  "data": [
    {
      "id": "e3d2c1b0-1234-5678-90ab-cdef01234567",
      "user_id": "b1c2d300-...",
      "digest_type": "lp_weekly",
      "content": {
        "status": "pending",
        "subject": "Your Weekly Warmup Update",
        "html": "<html>...</html>",
        "plain": "Hi Abhinav, here's this week's defence sector digest...",
        "segment": "lp",
        "interest_tags": ["defence"]
      },
      "sent_at": null
    }
  ],
  "error": null
}
```

**Response field rules:**

- `content.status`: `"pending" | "approved" | "sent"`.
- `content.html` / `content.plain`: the rendered digest body; may be large.
- `content.interest_tags` (nullable) — personalisation tags.

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/digest` → Pending tab → `GET /digest/pending`.
2. Row shows subject, segment, generated time. Click → preview modal with `content.html` sandboxed (iframe sandbox).
3. Approve → §7.13.2.

**Data transformation notes:**

- Render `content.html` inside `<iframe sandbox="allow-same-origin">` to prevent script injection.
- Prefer `content.plain` in the list summary.

---

### 7.13.4 `GET /digest/history`

**Purpose:** List past sent digests.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `limit` (int, optional, 1–200, default 50).

**Success 200:**

```json
{
  "data": [
    {
      "id": "c3b2a100-...",
      "user_id": "b1c2d300-...",
      "digest_type": "lp_weekly",
      "content": {
        "status": "sent",
        "subject": "Your Weekly Warmup Update",
        "segment": "lp"
      },
      "sent_at": "2026-04-21T07:00:15Z"
    }
  ],
  "error": null
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/admin/digest` → History tab.
2. Table with sent_at, segment, recipient count.
3. Click row → read-only preview.

**Data transformation notes:**

- Large `content.html` — lazy-load on row expand.

---

### 7.13.5 `GET /me/digest/recent`

**Purpose:** User-facing list of digests delivered to the caller. Cursor-paginated; only `status='sent'` rows are returned (drafts/pending are admin-only). Powers the `/digest` page "Recent digests" panel.

**Required roles:** Any authenticated (all 10 roles can read their own digest history).

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Query parameters:**

- `limit` (int, optional, 1–100, default 20).
- `cursor` (string, optional, nullable) — ISO `sent_at` of the previous page's last item.

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "digest_type": "lp_weekly",
        "subject": "Your Weekly Warmup Update",
        "segment": "lp",
        "html_snippet": "Hi Abhinav, here's your defence sector digest…",
        "sent_at": "2026-04-21T07:00:00+00:00"
      }
    ],
    "next_cursor": null
  },
  "error": null
}
```

**Response field rules:**

- `subject`, `segment` — nullable.
- `html_snippet` — first ~280 chars of the rendered body. Full HTML is **not** returned in the list call (deliberate — list payload stays small). Open the row's preview drawer (Phase 4) to fetch the full HTML; for now reuse the admin `<DigestPreviewDrawer>` if needed.
- `sent_at` — ISO-8601 with timezone, nullable.
- `next_cursor` — `null` when no more pages; otherwise pass it back as `cursor` on the next call.

**Error 401 / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/digest` mount → `useMyDigests({ limit: 20 })` (`useInfiniteQuery`).
2. Render rows with `subject` (fallback to `digest_type` label), date via `formatDistanceToNow`, snippet preview.
3. Empty state: "Your first digest will land Monday morning."
4. Click row → opens read-only preview (use the existing `<DigestPreviewDrawer>` from `src/features/digest/components/`).

**Data transformation notes:**

- Cache 60s; refetch on focus.
- Cursor is opaque to the UI — pass through as a string.
- Invalidate `qk.me.digest.recent` after `PUT /me/digest/preferences` if the user toggles `paused` (visually nothing changes immediately, but it keeps the list reactive).

---

### 7.13.6 `GET /me/digest/preferences`

**Purpose:** Returns the caller's digest preferences. Drives the `/digest` Preferences panel.

**Required roles:** Any authenticated.

**Rate limit:** 30 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
```

**Success 200:**

```json
{
  "data": {
    "frequency": "weekly",
    "interest_tags": ["defence", "fintech"],
    "opted_in_wa": true
  },
  "error": null
}
```

**Response field rules:**

- `frequency` — `"weekly" | "monthly" | "paused"`. Default `"weekly"` for any user who hasn't set a preference.
- `interest_tags` — lowercase, sorted, deduped. May be empty.
- `opted_in_wa` — mirrors `users.opted_in_wa`. Defaults to `true`.

**Error 401 / 404 (user not found) / 429 / 500:** see §7.0.4.

**UI flow:**

1. `/digest` mount → `useMyDigestPreferences()` in parallel with `useMyDigests`.
2. Hydrate the `<PreferencesForm>` (frequency radio + tag chips + WA opt-in toggle).
3. Empty `interest_tags` → render the chip list with no selections active; the user can pick from a sanctioned vocabulary (suggested chips: `fintech`, `defence`, `saas`, `deep_tech`, `ai`, `climate`).

**Data transformation notes:**

- Cache 5 min; refetch on focus + after `PUT /me/digest/preferences` mutation.
- Server normalises tags (trim + lowercase + dedupe + sort) so render-time normalisation isn't needed.

---

### 7.13.7 `PUT /me/digest/preferences`

**Purpose:** PATCH-style partial update — any subset of `frequency`, `interest_tags`, `opted_in_wa` may be supplied. Returns the canonical preferences shape (same as `GET`). For LP / potential_lp users, `interest_tags` is also mirrored to `lp_profile.interest_tags` so the weekly generator picks them up.

**Required roles:** Any authenticated.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body (all fields optional):**

```json
{
  "frequency": "monthly",
  "interest_tags": ["fintech", "defence"],
  "opted_in_wa": true
}
```

**Request field rules:**

- `frequency` (string, optional) — must be `"weekly" | "monthly" | "paused"`.
- `interest_tags` (string[], optional) — server normalises (trim + lowercase + dedupe + sort). Sending `[]` clears all tags.
- `opted_in_wa` (boolean, optional) — controls all WhatsApp delivery, not just digests.
- **Strict — extra keys rejected** with 422 (same `ConfigDict(extra='forbid')` discipline as MIS `raw_data`).
- Empty body `{}` is a valid no-op — returns current state.

**Success 200:** Same shape as §7.13.6 — the freshly persisted state.

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","frequency"], "msg": "Input should be 'weekly', 'monthly' or 'paused'", "type": "literal_error" }
    ]
  }
}
```

**Error 401 / 404 / 429 / 500:** see §7.0.4.

**UI flow:**

1. User edits the `<PreferencesForm>` (radio change, chip toggle, WA toggle).
2. Submit → `PUT /me/digest/preferences` with only the changed fields (or the full state — both work).
3. On 200 → toast "Preferences saved"; invalidate `qk.me.digest.preferences` and (optionally) `qk.me.digest.recent`.
4. On 422 → inline field error.

**Data transformation notes:**

- Until the WhatsApp delivery channel ships (Phase 4), `frequency: "monthly" | "paused"` is **persisted but not enforced** by the weekly cron. Show a subtle hint ("active when WhatsApp delivery launches") under the radio. The setting still has value because admins use it for opt-out audits.
- For LP / potential_lp roles, the server transparently mirrors `interest_tags` into `lp_profile.interest_tags`. No client-side coordination needed.
- After a successful update, invalidate both `qk.me.digest.preferences` (always) and `qk.me.digest.recent` (only if the user paused — pauses won't show new rows so the list view should reflect the empty-projection visually). The PRD §8.12.4 invalidation matrix is updated to reflect this.

---

## 7.14 Analytics (admin)

All under `/analytics/*`. Admin-only. Rate limit 30/min each.

> ⚠️ **Analytics shapes are dashboard-specific and additive.** New KPI keys may appear without notice. Frontend MUST tolerate unknown keys (render known ones, ignore rest). Never break a chart because an expected field is absent — use `?? 0`.

**Common headers (all endpoints):**

```
Authorization: Bearer <jwt>
```

**Common error envelopes (all endpoints):**

- 401 / 403 / 429 / 500 — see §7.0.4.

---

### 7.14.1 `GET /analytics/overview`

**Purpose:** Top-level platform KPIs for the admin dashboard.

**Required roles:** `admin`, `super_admin`.

**Success 200:**

```json
{
  "data": {
    "users_total": 412,
    "lps_total": 120,
    "potential_lps_total": 85,
    "vcs_total": 45,
    "startups_total": 230,
    "portfolio_startups_total": 12,
    "connections_accepted": 56,
    "connections_pending": 8,
    "digests_sent_30d": 8,
    "mis_submissions_this_month": 10,
    "meetings_scheduled_30d": 23
  },
  "error": null
}
```

**UI flow:**

1. `/admin/analytics` → Overview tab → `useQuery(qk.analytics.overview)`.
2. Render 4–6 KPI cards.

**Data transformation notes:**

- All values are integers; render with Indian-number formatting.
- Show trend arrows if you can fetch previous-period values (not yet supported — skip).

---

### 7.14.2 `GET /analytics/funnel/lp`

**Purpose:** LP funnel counts per status.

**Required roles:** `admin`, `super_admin`.

**Success 200:**

```json
{
  "data": {
    "items": [
      { "status": "1_new_lead", "count": 40 },
      { "status": "2_first_reach_out", "count": 25 },
      { "status": "3_in_conversation", "count": 18 },
      { "status": "4_soft_commit", "count": 7 },
      { "status": "5_invested", "count": 30 }
    ]
  },
  "error": null
}
```

**Response field rules:**

- `status` is always one of the 5 LP funnel values (see §8.2 `LPFunnelStatus`).
- Missing statuses → treat as `count: 0`.

**UI flow:**

1. `/admin/analytics` → Funnel tab → render `<FunnelChart />` with 5 bars.

---

### 7.14.3 `GET /analytics/funnel/startup`

**Purpose:** Startup pipeline counts per `startup_status` ENUM.

**Required roles:** `admin`, `super_admin`.

**Success 200:**

```json
{
  "data": {
    "items": [
      { "status": "longlist", "count": 83 },
      { "status": "team_reach_out", "count": 12 },
      { "status": "deep_dive_scheduled", "count": 5 },
      { "status": "termsheet_discussion", "count": 2 },
      { "status": "portfolio", "count": 12 },
      { "status": "pass_for_now", "count": 34 }
    ]
  },
  "error": null
}
```

**Response field rules:**

- `status` is any of the 23 `startup_status` ENUM values (§8.2).

**UI flow:**

1. Stacked bar chart with top 6 statuses; "Other" bucket for the rest.

**Data transformation notes:**

- Map raw status keys → display labels via a constant.

---

### 7.14.4 `GET /analytics/funnel/connections`

**Purpose:** Connection request pipeline counts by `conn_status`.

**Required roles:** `admin`, `super_admin`.

**Success 200:**

```json
{
  "data": {
    "items": [
      { "status": "pending_admin", "count": 4 },
      { "status": "pending_target", "count": 2 },
      { "status": "accepted", "count": 56 },
      { "status": "declined", "count": 11 },
      { "status": "rejected_admin", "count": 3 }
    ]
  },
  "error": null
}
```

**UI flow:**

1. Render funnel chart with 5 stages left-to-right.

---

### 7.14.5 `GET /analytics/cohort`

**Purpose:** Monthly cohort retention table.

**Required roles:** `admin`, `super_admin`.

**Query parameters:**

- `months` (int, optional, 1–60, default 12).

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "cohort": "2026-01",
        "cohort_size": 100,
        "retained_1m": 80,
        "retained_3m": 55,
        "retained_6m": 30,
        "retained_12m": null
      },
      {
        "cohort": "2026-02",
        "cohort_size": 110,
        "retained_1m": 92,
        "retained_3m": 62,
        "retained_6m": null,
        "retained_12m": null
      }
    ]
  },
  "error": null
}
```

**Response field rules:**

- `cohort` — `YYYY-MM`.
- `retained_Nm` null when not enough time has elapsed.

**UI flow:**

1. Render as a heatmap: rows = cohorts, columns = retention windows.

**Data transformation notes:**

- Compute percentages as `retained_Nm / cohort_size` client-side.

---

### 7.14.6 `GET /analytics/match-success`

**Purpose:** Weekly matchmaking effectiveness metrics.

**Required roles:** `admin`, `super_admin`.

**Success 200:**

```json
{
  "data": {
    "items": [
      {
        "week_of": "2026-04-14",
        "suggestions_generated": 150,
        "accepted_count": 63,
        "rejected_count": 27,
        "skipped_count": 60,
        "accepted_pct": 0.42,
        "rejected_pct": 0.18,
        "skipped_pct": 0.4
      }
    ]
  },
  "error": null
}
```

**UI flow:**

1. Stacked area chart over time — accepted / rejected / skipped percentages.

**Data transformation notes:**

- Sort items client-side by `week_of` ascending.
- Display percentages as `(value * 100).toFixed(0) + '%'`.

---

## 7.15 Enrichment

### 7.15.1 `POST /enrichment/tracxn`

**Purpose:** Ingest a startup record from the Tracxn Chrome Extension. Idempotent — matches on `website_domain` + `company_name` to decide between create, merge, or skip.

**Required roles:** `admin`, `super_admin`.

**Rate limit:** 10 per minute.

**Headers:**

```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "company_name": "Acme Technologies",
  "website_url": "https://acme.ai",
  "sector": "fintech",
  "stage": "seed",
  "description": "AI for compliance.",
  "funding_amount_cr": 10.0,
  "founders": "Kapil Sahu"
}
```

**Request field rules:**

- `company_name` (string, required).
- `website_url` (string URL, optional).
- `sector`, `stage`, `description` (string, optional).
- `funding_amount_cr` (number, optional) — INR crore, ≥ 0.
- `founders` (string, optional) — free-form.

**Success 200 — created:**

```json
{
  "data": {
    "action": "created",
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12"
  },
  "error": null
}
```

**Success 200 — merged (existing row updated):**

```json
{
  "data": {
    "action": "merged",
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12",
    "updated_fields": ["sector", "stage", "funding_amount_cr"]
  },
  "error": null
}
```

**Success 200 — duplicate skipped:**

```json
{
  "data": {
    "action": "duplicate_skipped",
    "startup_id": "3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12"
  },
  "error": null
}
```

**Response field rules:**

- `action` ∈ `"created" | "merged" | "duplicate_skipped"`.
- `startup_id` always present (for lookup).
- `updated_fields` present only on `merged`.

**Error 400 / 422 — validation_error:**

```json
HTTP 422
{
  "data": null,
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "detail": [
      { "loc": ["body","company_name"], "msg": "field required", "type": "value_error.missing" }
    ]
  }
}
```

**Error 401 / 403 / 429 / 500:** see §7.0.4.

**UI flow (web console at `/admin/tracxn`):**

1. Admin pastes Tracxn data manually or via the Chrome Extension.
2. Submit → `POST /enrichment/tracxn`.
3. On 200 `created` → toast "Added {company_name}"; link to new startup profile.
4. On 200 `merged` → toast "Updated {updated_fields.length} fields on existing {company_name}".
5. On 200 `duplicate_skipped` → toast "Already exists — no changes".

**Data transformation notes:**

- Chrome Extension sends this directly; the admin console mirrors the same endpoint for manual entry.
- Extension paired via `Authorization` header — admin copies their JWT into extension config (Phase-4 enhancement will use a separate API key).

---

## 7.16 Health (optional)

### 7.16.1 `GET /health`

**Purpose:** Backend liveness probe. NOT under `/api/v1` — served at root.

**Required roles:** Public (no authentication).

**Rate limit:** None (treated as infrastructure).

**Headers:** none required.

**Request body:** none.

**Full URL:** `GET {BACKEND_ORIGIN}/health` (NOT `{API_BASE_URL}/health`).

**Success 200:**

```json
{
  "status": "ok",
  "env": "production",
  "wa_provider": "null"
}
```

**Response field rules:**

- NOT wrapped in the standard envelope (this is the one exception).
- `status`: `"ok"`.
- `env`: `"development" | "staging" | "production"`.
- `wa_provider`: `"null" | "wati"` (Phase 4 will say `"wati"`).

**Error 500:** Backend is unhealthy; response body may be empty or non-JSON.

**UI flow:**

1. Optionally displayed in admin top bar via `/admin/system-status` widget.
2. Use to gate the dev-OTP hint banner — only show when `env !== 'production'`.

**Data transformation notes:**

- Because response is NOT enveloped, call via a SEPARATE axios instance (no interceptor unwrapping) OR a raw `fetch`.
- Keep this endpoint out of the main `apiClient.endpoints.ts` module.

---

## 7.17 Standard error responses (full list)

| HTTP | `error.code`                                                                    | Frontend behaviour                                                                    |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 400  | `validation_error`                                                              | Field-level red highlight, show `detail[]` messages                                   |
| 400  | `not_registered`                                                                | "This number is not registered. Contact Warmup Ventures."                             |
| 401  | `missing_token`                                                                 | Redirect to `/signin`                                                                 |
| 401  | `invalid_token`                                                                 | Redirect to `/signin`, toast "Session invalid"                                        |
| 401  | `link_expired` / `token_expired`                                                | Redirect to `/expired`                                                                |
| 401  | `otp_invalid`                                                                   | Inline error under OTP input                                                          |
| 401  | `otp_expired`                                                                   | Inline "OTP expired — request a new one" + enable resend                              |
| 403  | `insufficient_role`                                                             | Redirect to `/unauthorized`                                                           |
| 403  | `forbidden`                                                                     | Show toast "You don't have access to this resource"                                   |
| 403  | `token_action_mismatch`                                                         | "This link is for a different action. Contact the sender."                            |
| 403  | `unknown_action`                                                                | Same as above                                                                         |
| 404  | `not_found`                                                                     | Page-level empty state with back button                                               |
| 409  | `conflict`                                                                      | Context-specific message (e.g. "Already connected")                                   |
| 409  | `duplicate_contact`                                                             | "This contact already exists in the community."                                       |
| 409  | `mis_already_submitted`                                                         | "MIS for this period was already submitted."                                          |
| 422  | `validation_error`                                                              | Same as 400 validation                                                                |
| 429  | `rate_limit_exceeded`                                                           | Toast, disable submit for `Retry-After` seconds                                       |
| 500  | `internal_error`                                                                | Full-page error + "Contact support" button                                            |
| 500  | `notion_sync_error` / `ai_provider_error` / `wa_provider_error` / `drive_error` | Non-fatal to user — usually silent; backend retries. If surfaced, show a soft banner. |

---

# 8. Frontend Data Models

## 8.1 Envelope

```ts
export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorShape | null;
  pagination?: { limit: number; offset: number };
}

export interface ApiErrorShape {
  code: string;
  message: string;
  detail?: unknown;
}

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}
```

## 8.2 Role & status enums

```ts
export type UserRole =
  | 'lp'
  | 'potential_lp'
  | 'vc'
  | 'startup_inprogress'
  | 'startup_onboarded'
  | 'startup_funded'
  | 'partner'
  | 'advisor'
  | 'admin'
  | 'super_admin';

export type ConnStatus =
  | 'pending_admin'
  | 'approved'
  | 'rejected_admin'
  | 'pending_target'
  | 'accepted'
  | 'declined';

export type InteractionType =
  | 'search_view'
  | 'search_click'
  | 'profile_view'
  | 'connection_request'
  | 'connection_accepted'
  | 'meeting_booked'
  | 'feedback_positive'
  | 'feedback_negative'
  | 'feedback_skip'
  | 'match_accepted'
  | 'match_rejected';

export type LPFunnelStatus =
  | '1_new_lead'
  | '2_first_reach_out'
  | '3_in_conversation'
  | '4_soft_commit'
  | '5_invested';

export type StartupStage =
  | 'ideation'
  | 'pre_seed'
  | 'seed'
  | 'early_growth'
  | 'pre_a'
  | 'series_a'
  | 'pre_b'
  | 'series_b'
  | 'late_growth';

export type StartupStatus =
  | 'longlist'
  | 'straight_pass'
  | 'team_reach_out'
  | 'schedule_partner_intro_call'
  | 'raghav_calls'
  | 'sinchana_call'
  | 'partner_intro_scheduled'
  | 'rajendra_sir_feedback'
  | 'sharad_feedback'
  | 'request_data'
  | 'data_received'
  | 'deep_dive_scheduled'
  | 'termsheet_discussion'
  | 'pass_for_now'
  | 'not_shortlisted'
  | 'not_responsive'
  | 'ib_mandate'
  | 'portfolio'
  | 'on_hold'
  | 'nikhil_calls'
  | 'stay_connected'
  | 'partner_ref_reachouts'
  | 'praveens_feedback';
```

## 8.3 User

```ts
export interface UserProfile {
  user_id: string; // UUID
  phone: string; // E.164, +91XXXXXXXXXX
  name: string | null;
  email: string | null;
  role: UserRole;
  organisation: string | null;
  designation: string | null;
  avatar_url: string | null;
  profile_complete: boolean;
}

export interface AuthSession {
  access_token: string;
  token_type: 'bearer';
  expires_in: number; // seconds
  user_id: string;
  role: UserRole;
  expires_at: number; // client-computed: Date.now() + expires_in*1000
}
```

## 8.4 LP / Startup / Advisor

```ts
export interface LPProfile {
  user_id: string;
  fund_name: string | null;
  aum_cr: number | null;
  cheque_range_min: number | null;
  cheque_range_max: number | null;
  sectors: string[];
  stages: StartupStage[];
  geography: string[];
  co_invest_interest: boolean | null;
  thesis: string | null;
  interest_tags: string[];
  funnel_status: LPFunnelStatus;
  expected_ticket: number | null;
  conversion_pct: number | null;
  next_step_required: boolean;
}

export interface StartupProfile {
  startup_id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  tagline: string | null;
  sector: string | null;
  stage: StartupStage | null;
  status: StartupStatus | null;
  website_url: string | null;
  description: string | null;
  founding_year: number | null;
  team_size: number | null;
  revenue_model: string | null;
  traction: string | null;
  ask_amount_cr: number | null;
  deck_url: string | null;
  notion_page_id: string | null;
}
```

## 8.5 Connection

```ts
export interface ConnectionRequest {
  connection_id: string;
  status: ConnStatus;
  requester_id: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface ConnectionRow {
  connection_id: string;
  status: ConnStatus;
  counterpart: {
    user_id: string;
    name: string | null;
    role: UserRole;
    organisation: string | null;
    avatar_url: string | null;
    contact?: { email: string | null; phone: string | null; linkedin_url: string | null };
  };
  created_at: string;
  responded_at: string | null;
}
```

## 8.6 Search

```ts
export interface SearchRequest {
  query: string;
  filters?: Record<string, unknown>;
  limit?: number; // default 20
  cursor?: string | null;
}

export interface StartupCard {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  sector: string | null;
  stage: StartupStage | null;
  one_liner: string | null;
  description: string | null;
  traction: string | null;
  funding_target_cr: number | null;
  similarity_score: number;
  ai_rank: number | null;
  ai_reason: string | null;
}

export interface LPCard {
  user_id: string;
  name: string | null;
  organisation: string | null;
  designation: string | null;
  avatar_url: string | null;
  fund_name: string | null;
  aum_cr: number | null;
  cheque_range_min: number | null;
  cheque_range_max: number | null;
  sectors: string[] | null;
  stages: StartupStage[] | null;
  geography: string[] | null;
  co_invest_interest: boolean | null;
  similarity_score: number;
  ai_rank: number | null;
  ai_reason: string | null;
}

export interface SearchResponse {
  results: (StartupCard | LPCard)[];
  total: number;
  target_type: 'lp' | 'startup';
  stage3_applied: boolean;
  rerank_cap: number; // 20
  next_cursor: string | null;
}
```

## 8.7 MIS

```ts
export interface MISPrefill {
  period: string; // 'YYYY-MM'
  company_name: string;
  prefill: {
    revenue: number | null;
    burn: number | null;
    runway_months: number | null;
    headcount: number | null;
    highlights: string | null;
    lowlights: string | null;
  };
}

export interface MISSubmitRequest {
  period: string; // regex: ^\d{4}-(0[1-9]|1[0-2])$
  revenue?: number;
  burn?: number;
  runway_months?: number;
  headcount?: number;
  highlights?: string;
  lowlights?: string;
  raw_data?: {
    revenue_inr?: string; // Decimal encoded as string
    burn_inr?: string;
    headcount?: number;
    runway_months?: number;
    highlights?: string;
    lowlights?: string;
  };
}
```

## 8.8 Matchmaking

```ts
export interface MatchSuggestion {
  id: string;
  lp_id: string;
  startup_id: string;
  score: number | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  week_of: string;
  company_name: string | null;
  sector: string | null;
  one_liner: string | null;
}
```

## 8.9 Meeting / Travel

```ts
export interface Slot {
  start: string;
  end: string;
  date: string;
}

export interface Booking {
  booking_id: string;
  calendar_event_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  target_id: string;
  requester_id: string;
  purpose: string | null;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  destination_city: string;
  travel_start: string; // YYYY-MM-DD
  travel_end: string;
  purpose: string | null;
  status: 'active' | 'cancelled';
  alerts_sent: boolean;
}
```

## 8.10 Admin — DLQ / Reports

```ts
export interface DeadLetterJob {
  id: string;
  task_name: string;
  task_id: string | null;
  args: unknown[];
  kwargs: Record<string, unknown>;
  exception_class: string;
  exception_message: string | null;
  traceback: string | null;
  failed_at: string;
  retried_at: string | null;
  retry_status: 'pending' | 'retried' | 'succeeded' | 'abandoned';
}

export interface QuarterlyReport {
  report_id: string;
  quarter: string; // e.g. 'Q1-2026'
  status: 'pending' | 'approved' | 'sent';
  drive_url: string | null;
  generated_at: string;
  approved_by: string | null;
  approved_at: string | null;
}
```

## 8.11 Nullable-field discipline

Every response field listed as `| null` **can and will** be null at runtime. Do not assume non-null in render. Use `value ?? 'fallback'` or guard with conditional rendering. In Zod schemas, use `.nullable()` to match.

---

## 8.12 Data transformation reference (pre-render / pre-submit)

This table is the authoritative list of transformations required before rendering a value or submitting one. Execute these in the hook or selector layer — NEVER inside JSX.

### 8.12.1 Pre-submit transforms (frontend → backend)

| Field                                                   | Source type           | Transform                                                                                                          | Target format                 | Where it applies                 |
| ------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------- | ------ |
| `phone`                                                 | user input            | trim + strip `-` `( )` spaces; prepend `+91` if missing; validate regex `^\+\d{10,15}$`                            | `+919876543210`               | §7.1.1, §7.1.2                   |
| `otp`                                                   | user input            | strip non-digits                                                                                                   | `"000000"`                    | §7.1.2                           |
| `email`                                                 | user input            | trim + lowercase                                                                                                   | RFC 5322                      | §7.2.3                           |
| `linkedin_url`, `website_url`, `avatar_url`, `deck_url` | user input            | trim; validate URL; ensure `https://` prefix                                                                       | `"https://..."`               | §7.2.3, §7.2.4, §7.3.1, §7.3.3   |
| PATCH bodies                                            | form state            | strip keys with `undefined`/`""` (backend has no clear-field allowlist)                                            | partial object                | §7.2.3                           |
| `sector`, `geography`                                   | multi-select chips    | lowercase each value                                                                                               | `["fintech", "saas"]`         | §7.2.4                           |
| `preferred_stages` / `stage` / `filters.stage`          | select                | validate against `startup_stage` ENUM (see §8.2)                                                                   | `"seed"` etc.                 | §7.2.4, §7.3.1, §7.4.1           |
| `period` (MIS)                                          | month picker          | format as `YYYY-MM` matching `^\d{4}-(0[1-9]                                                                       | 1[0-2])$`                     | `"2026-04"`                      | §7.9.2 |
| `raw_data.revenue_inr` / `burn_inr`                     | number input (rupees) | `value.toFixed(2)` as string                                                                                       | `"2100000.00"`                | §7.9.2                           |
| `raw_data` object                                       | form                  | reject ANY key not in the allowlist before submit (strict match §7.9.2)                                            | validated subset              | §7.9.2                           |
| `scheduled_at`                                          | date + time pickers   | convert to ISO-8601 WITH timezone via `date-fns-tz` `zonedTimeToUtc` + `formatISO({ representation: 'complete' })` | `"2026-04-24T10:00:00+05:30"` | §7.10.2                          |
| `duration_minutes`                                      | radio                 | coerce to int, `30` or `60` only                                                                                   | `30`                          | §7.10.2                          |
| `travel_start`, `travel_end`                            | date pickers          | `date-fns` `format(date, 'yyyy-MM-dd')`; validate `travel_end >= travel_start` client-side                         | `"2026-05-10"`                | §7.11.1                          |
| `home_city`, `destination_city`                         | input                 | trim                                                                                                               | as typed                      | §7.11.1, §7.11.4                 |
| `week_of`                                               | date picker           | `date-fns` `format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')`                                          | `"2026-04-28"` (Monday)       | §7.8.1                           |
| `interaction_type`                                      | code path             | must be one of `search_view`, `search_click`, `profile_view`, `meeting_booked` — assert at call site               | `"profile_view"`              | §7.7.1                           |
| `target_type`                                           | context               | `"lp"` or `"startup"` based on search direction                                                                    | `"startup"`                   | §7.7.1                           |
| `funnel_status`                                         | status picker         | must be one of 5 LP funnel keys                                                                                    | `"3_in_conversation"`         | §7.12.5                          |
| `message` / `reason` / `note`                           | textarea              | trim + enforce max length (200 / 500 / 2000 chars per endpoint)                                                    | trimmed                       | §7.6.1, §7.11.1, §7.12.6, §7.6.2 |

### 8.12.2 Post-response transforms (backend → UI)

| Field                                                | Response type                    | Transform                                                                              | UI output                     | Where it applies |
| ---------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------- | ---------------- |
| `access_token`                                       | string (JWT)                     | store verbatim; NEVER decode client-side                                               | —                             | §7.1.2           |
| `expires_in`                                         | integer seconds                  | `expiresAt = Date.now() + expires_in * 1000`                                           | epoch ms in store             | §7.1.2           |
| `role`                                               | ENUM key                         | label via `{ lp: 'LP', potential_lp: 'Potential LP', vc: 'VC', ... }`                  | "Potential LP"                | everywhere       |
| `stage`, `status`, `funnel_status`                   | ENUM keys                        | label-map per enum                                                                     | "Pre-Seed", "In Conversation" | everywhere       |
| `similarity_score`                                   | float 0..1                       | skip rendering raw; use a 3-dot indicator or hide                                      | badge                         | §7.4.1           |
| `ai_rank`                                            | int or null                      | conditional render — hide if null                                                      | "#1"                          | §7.4.1           |
| `ai_reason`                                          | string or null                   | conditional render; truncate to 160 chars                                              | tooltip or line               | §7.4.1           |
| `funding_target_cr`, `ask_amount_cr`, `aum_cr`       | number (INR crore)               | `` `₹ ${value.toLocaleString('en-IN')} Cr` ``                                          | "₹ 10 Cr"                     | §7.3, §7.4       |
| `revenue`, `burn`                                    | number (INR rupees)              | Indian numbering `value.toLocaleString('en-IN')` with ₹ prefix                         | "₹ 21,00,000"                 | §7.9             |
| `created_at`, `sent_at`, `failed_at`, etc.           | ISO-8601                         | `formatDistanceToNow` for relative + full on hover (`format(date, 'PPpp')`)            | "5 hours ago"                 | everywhere       |
| `scheduled_at`                                       | ISO-8601 with TZ                 | display in user's local TZ via `date-fns-tz` `utcToZonedTime` + `format`               | "24 Apr 10:00 AM"             | §7.10            |
| `travel_start`, `travel_end`                         | `YYYY-MM-DD`                     | `format(parseISO(x), 'PP')`                                                            | "May 10, 2026"                | §7.11            |
| `period`                                             | `YYYY-MM`                        | `format(parse(x, 'yyyy-MM', new Date()), 'LLLL yyyy')`                                 | "April 2026"                  | §7.9             |
| `phone` on `contact`                                 | E.164                            | group for readability: `+91 98765-43210`                                               | formatted                     | §7.6.4           |
| `avatar_url`                                         | nullable URL                     | if null → initials fallback `<Avatar fallback={initials(name)} />`                     | avatar                        | everywhere       |
| `parsed.name` / `parsed.phone` / `parsed.email` etc. | nullable                         | highlight missing required fields (name/phone) in red; low-confidence in amber         | form                          | §7.2.1           |
| `contact` on connection/profile                      | nullable object                  | render iff non-null; never render `null`/`undefined`                                   | conditional card              | §7.5.1, §7.6.4   |
| `total` (search)                                     | int                              | "Showing {items.length} of {total}"                                                    | caption                       | §7.4.1           |
| `content.html` (digest)                              | HTML string                      | render inside `<iframe sandbox="allow-same-origin">` — NEVER `dangerouslySetInnerHTML` | sandbox                       | §7.13            |
| `traceback` (DLQ)                                    | multi-line string                | render inside `<pre className="overflow-x-auto">`                                      | code block                    | §7.12.9          |
| `result.signal` (pitch eval)                         | `"strong"`/`"moderate"`/`"weak"` | colour badge: green/yellow/red                                                         | badge                         | §7.3.4           |
| `result.strengths`, `concerns`                       | string[]                         | render as bullet lists; empty array → hide block                                       | list                          | §7.3.4           |
| `next_cursor`                                        | string or null                   | null → hide "Load more"; string → enable infinite scroll                               | pagination                    | everywhere       |
| `stage3_applied`                                     | boolean                          | if `false` → subtle banner "AI ranking temporarily unavailable"                        | banner                        | §7.4.1           |
| analytics counters                                   | int                              | Indian number format; null → `0` fallback                                              | KPI cards                     | §7.14            |
| `retained_Nm` (cohort)                               | int or null                      | null → render "—" (not enough history)                                                 | heatmap cell                  | §7.14.5          |
| `accepted_pct`, etc.                                 | float 0..1                       | `(v * 100).toFixed(0) + '%'`                                                           | "42%"                         | §7.14.6          |

### 8.12.3 Role-masked field handling

Some endpoints strip fields based on viewer role. The frontend MUST handle "absent" (key missing or null) gracefully. Never throw on missing fields.

| Endpoint                            | Role                               | Fields usually absent                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /search` (startup target)     | `partner`                          | `organisation`, `designation`, `avatar_url`, `description`, `traction`, `funding_target_cr`, `similarity_score`, `ai_rank`, `ai_reason`                                                |
| `POST /search` (LP target)          | `partner`                          | `organisation`, `designation`, `avatar_url`, `aum_cr`, `cheque_range_min`, `cheque_range_max`, `stages`, `geography`, `co_invest_interest`, `similarity_score`, `ai_rank`, `ai_reason` |
| `GET /profile/{id}`                 | viewer without accepted connection | `contact`, `contact.email`, `contact.phone`, `contact.linkedin_url`                                                                                                                    |
| `GET /profile/{id}`                 | `partner`                          | `description`, `founding_year`, `team_size`, `traction`, `ask_amount_cr`, `website_url`, `designation`                                                                                 |
| `GET /interactions/profile-viewers` | any                                | viewer email/phone (PII — NEVER exposed)                                                                                                                                               |

Rule: wrap every role-sensitive read in `optional chaining` + nullable render:

```tsx
{
  profile.contact?.email && <ContactRow label="Email" value={profile.contact.email} />;
}
```

### 8.12.4 Invalidation matrix (which mutations bust which caches)

| Mutation                                     | Invalidate these query keys                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `POST /auth/otp/verify`                      | `qk.auth.me`                                                                    |
| `PATCH /onboarding/profile`                  | `qk.auth.me`, `qk.connections.*` (name/avatar may appear there)                 |
| `POST /onboarding/lp-profile`                | `qk.auth.me`, `qk.matchmaking.suggestions`                                      |
| `POST /pitch/profile`                        | `qk.pitch.profile`                                                              |
| `POST /pitch/deck`                           | `qk.pitch.profile`, `qk.pitch.deckJob.*`                                        |
| `POST /connections/request`                  | `qk.connections.pending`, `qk.profile.byId(target_id)`                          |
| `PATCH /connections/{id}/admin`              | `qk.admin.connections`, `qk.admin.summary`, `qk.connections.pending`            |
| `PATCH /connections/{id}/respond`            | `qk.connections.list`, `qk.connections.pending`, `qk.profile.byId(counterpart)` |
| `POST /portfolio/mis`                        | `qk.mis.form`, `qk.admin.summary`                                               |
| `POST /schedule/book`                        | `qk.meetings.slots`, `qk.meetings.bookings`                                     |
| `DELETE /schedule/book/{id}`                 | `qk.meetings.slots`, `qk.meetings.bookings`                                     |
| `POST /travel/plans`                         | `qk.travel.plans`                                                               |
| `DELETE /travel/plans/{id}`                  | `qk.travel.plans`                                                               |
| `PUT /travel/home-city`                      | `qk.auth.me`                                                                    |
| `POST /matchmaking/generate`                 | `qk.matchmaking.pending` (after job SUCCESS)                                    |
| `POST /matchmaking/approve`                  | `qk.matchmaking.pending`, `qk.matchmaking.suggestions`                          |
| `POST /matchmaking/suggestions/{id}/respond` | `qk.matchmaking.suggestions`, `qk.connections.pending` (if connection_created)  |
| `POST /digest/generate`                      | `qk.digest.pending`                                                             |
| `POST /digest/approve`                       | `qk.digest.pending`, `qk.digest.history`, `qk.admin.summary`                    |
| `POST /admin/digest/send`                    | `qk.admin.digest`, `qk.digest.history`, `qk.admin.summary`                      |
| `PUT /admin/lp/{user_id}/funnel-status`      | `qk.admin.lpFunnel(user_id)`                                                    |
| `POST /admin/quarterly-reports/approve`      | `qk.admin.quarterlyReports`                                                     |
| `POST /admin/dead-letter-jobs/{id}/retry`    | `qk.admin.dlq.*`                                                                |
| `POST /enrichment/tracxn`                    | `qk.search.*` (new/updated startup)                                             |

### 8.12.5 Optimistic update pattern

Apply this to Connections admin approve/reject, DLQ retry, Matchmaking approve, Connection respond, Meeting cancel, Travel cancel:

```ts
useMutation({
  mutationFn: (args) => apiCall(args),
  onMutate: async (vars) => {
    await queryClient.cancelQueries({ queryKey });
    const prev = queryClient.getQueryData<T>(queryKey);
    queryClient.setQueryData<T>(queryKey, (old) => removeOrUpdate(old, vars));
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

Avoid optimistic updates for MIS submit, Pitch deck, Profile save — those should wait for server confirmation.

---

# 9. Authentication Flow

## 9.1 Login (happy path)

1. User enters E.164 phone on `/signin`.
2. Frontend validates regex `^\+\d{10,15}$` client-side, then `POST /auth/otp/send`.
3. On 200, advance to OTP input step (same page, second card).
4. User enters 6-digit OTP. `POST /auth/otp/verify`.
5. Backend returns `{ access_token, user_id, role, expires_in }`.
6. Frontend:
   - Computes `expires_at = Date.now() + expires_in * 1000`.
   - Stores `{ access_token, user_id, role, expires_at }` in Zustand + `localStorage` (`oc.auth`).
   - Fires `GET /auth/me` to load full profile.
   - If `profile_complete === false`, redirect to `/onboarding/profile`; otherwise redirect to role home (see §10.2).

## 9.2 Token storage

```ts
// src/auth/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  role: UserRole | null;
  expiresAt: number | null;
  setSession(data: {
    access_token: string;
    user_id: string;
    role: UserRole;
    expires_in: number;
  }): void;
  setUser(user: UserProfile): void;
  clear(): void;
  isAuthenticated(): boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      role: null,
      expiresAt: null,
      setSession: ({ access_token, user_id, role, expires_in }) =>
        set({
          token: access_token,
          role,
          expiresAt: Date.now() + expires_in * 1000,
          user: get().user?.user_id === user_id ? get().user : null,
        }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null, role: null, expiresAt: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        return !!token && !!expiresAt && Date.now() < expiresAt;
      },
    }),
    {
      name: 'oc.auth',
      partialize: (s) => ({ token: s.token, role: s.role, expiresAt: s.expiresAt, user: s.user }),
    },
  ),
);
```

**Do NOT** put the token in cookies. CORS is configured with `allow_credentials=true` but no backend `Set-Cookie` issued. Bearer header is the contract.

## 9.3 Expiry / refresh

- **No refresh endpoint exists** (Phase 0–3 decision). The 4-hour session token is the whole truth.
- **Detect expiry proactively:** on every mutation, check `Date.now() > expiresAt` in the Axios request interceptor; if so, short-circuit to `/signin` without hitting the server.
- **Reactively:** on any 401 response with code `link_expired` or `token_expired`, the response interceptor clears the store and navigates to `/expired`.
- **Warn at 15-minute mark:** a banner "Your session expires in 15 minutes — save your work" (use a `setInterval` in the app shell checking `expiresAt`).

## 9.4 Logout

No backend logout endpoint. Logout is a pure client-side action:

```ts
function logout() {
  queryClient.clear(); // purge TanStack Query cache
  useAuthStore.getState().clear();
  navigate('/signin');
}
```

## 9.5 Unauthorised handling (403)

- `insufficient_role` → navigate to `/unauthorized` with a `from` query param so the user can click "Go back".
- `forbidden` on a specific resource → toast and stay on page.
- `token_action_mismatch` → user followed a deep-link to the wrong page; show an explanatory screen: "This link works on /pitch, not /search." Navigate to `/signin`.

## 9.6 Deep-link token entry (Phase 4 hooks)

Routes like `/pitch/:token`, `/add-user/:token`, `/mis/:token` can exist as placeholders. On mount, the page should:

1. Strip `token` from URL.
2. Call `POST /auth/otp/verify`-equivalent? **No** — deep-link tokens are not minted here; they come from email/WA links. The frontend should treat the token as the `access_token` directly (backend signs both). Put it into `authStore.token` and proceed.
3. **This pathway is Phase-4-facing**. For now, only admins seeing their own dashboard use OTP login; deep-link tokens are acceptable but not emitted.

## 9.7 401 semantics cheat sheet

| Situation               | Backend code                     | Frontend action                    |
| ----------------------- | -------------------------------- | ---------------------------------- |
| No Authorization header | `missing_token`                  | `/signin` (record referrer)        |
| Token signature invalid | `invalid_token`                  | `/signin`, toast "Session invalid" |
| Token expired           | `link_expired` / `token_expired` | `/expired` (friendly copy)         |
| Wrong audience / issuer | `invalid_token`                  | `/signin`                          |
| Action mismatch         | `token_action_mismatch`          | friendly screen "Wrong link"       |
| Missing required claim  | `invalid_token`                  | `/signin`                          |

---

# 10. UI Structure, Navigation & Components

## 10.1 App shell

```
┌─────────────────────────────────────────────────────┐
│ TopBar: logo — search (admin only) — user menu      │
├─────────┬───────────────────────────────────────────┤
│         │                                           │
│ Sidebar │         Page content (outlet)             │
│ (role-  │                                           │
│  filtered)                                          │
│         │                                           │
└─────────┴───────────────────────────────────────────┘
```

- **Desktop (≥ 1024px):** fixed left sidebar, persistent top bar.
- **Tablet (768–1023px):** collapsible sidebar (hamburger).
- **Mobile (< 768px):** sidebar slides in as a drawer; bottom nav optional for LP/VC/Startup personas.

## 10.2 Role → default dashboard route

| Role                                      | Default after login    |
| ----------------------------------------- | ---------------------- |
| `admin`, `super_admin`                    | `/admin`               |
| `lp`, `potential_lp`                      | `/search`              |
| `vc`                                      | `/search`              |
| `startup_funded`                          | `/search` (LP search)  |
| `startup_inprogress`, `startup_onboarded` | `/pitch`               |
| `partner`                                 | `/search` (limited)    |
| `advisor`                                 | `/connections/pending` |

## 10.3 Role-aware sidebar (authoritative)

The sidebar is **dynamically constructed** from a single capability map. Each entry has `key`, `label`, `path`, `icon`, `roles`.

```ts
// src/lib/role-capabilities.ts — the single source of truth
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'Home', roles: ['*'] },
  {
    key: 'search',
    label: 'Search',
    path: '/search',
    icon: 'Search',
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  },
  {
    key: 'matchmaking',
    label: 'Suggestions',
    path: '/matchmaking',
    icon: 'Sparkles',
    roles: ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
  },
  { key: 'connections', label: 'Connections', path: '/connections', icon: 'Users', roles: ['*'] },
  { key: 'pending', label: 'Pending', path: '/connections/pending', icon: 'Clock', roles: ['*'] },
  {
    key: 'add-user',
    label: 'Add contact',
    path: '/add-user',
    icon: 'UserPlus',
    roles: ['lp', 'potential_lp', 'vc', 'admin', 'super_admin'],
  },
  {
    key: 'pitch',
    label: 'My pitch',
    path: '/pitch',
    icon: 'FileText',
    roles: ['startup_inprogress', 'startup_onboarded', 'startup_funded', 'admin', 'super_admin'],
  },
  {
    key: 'mis',
    label: 'MIS',
    path: '/mis',
    icon: 'BarChart3',
    roles: ['startup_funded', 'admin', 'super_admin'],
  },
  { key: 'schedule', label: 'Schedule', path: '/schedule', icon: 'Calendar', roles: ['*'] },
  { key: 'travel', label: 'Travel', path: '/travel', icon: 'Plane', roles: ['*'] },
  { key: 'viewers', label: 'Who viewed me', path: '/profile-viewers', icon: 'Eye', roles: ['*'] },
  // Admin-only
  {
    key: 'admin-home',
    label: 'Admin home',
    path: '/admin',
    icon: 'LayoutDashboard',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-connections',
    label: 'Connection queue',
    path: '/admin/connections',
    icon: 'Inbox',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-digest',
    label: 'Digests',
    path: '/admin/digest',
    icon: 'Mail',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-match',
    label: 'Matchmaking ops',
    path: '/admin/matchmaking',
    icon: 'Zap',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-reports',
    label: 'Quarterly reports',
    path: '/admin/quarterly-reports',
    icon: 'FileCheck',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-dlq',
    label: 'Dead-letter jobs',
    path: '/admin/dead-letter-jobs',
    icon: 'AlertTriangle',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-analytics',
    label: 'Analytics',
    path: '/admin/analytics',
    icon: 'PieChart',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-lp-funnel',
    label: 'LP funnel',
    path: '/admin/lp-funnel',
    icon: 'Route',
    roles: ['admin', 'super_admin'],
  },
  {
    key: 'admin-tracxn',
    label: 'Tracxn ingest',
    path: '/admin/tracxn',
    icon: 'Globe',
    roles: ['admin', 'super_admin'],
  },
];

export function navForRole(role: UserRole) {
  return NAV_ITEMS.filter((item) => item.roles.includes('*') || item.roles.includes(role));
}
```

## 10.4 Route tree (React Router v6 data routers)

```ts
export const router = createBrowserRouter([
  { path: '/',          element: <HomePage /> },
  { path: '/signin',    element: <SignInPage /> },
  { path: '/expired',   element: <ExpiredPage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  {
    element: <RequireAuth />,        // reads auth-store; redirects if no valid session
    children: [
      { path: '/onboarding/profile',    element: <CompleteProfilePage /> },
      {
        element: <AppShell />,         // sidebar + top bar
        children: [
          { path: '/dashboard',              element: <DashboardPage /> },
          { path: '/search',                 element: <SearchPage /> },
          { path: '/profile/:id',            element: <ProfileViewPage /> },
          { path: '/connections',            element: <ConnectionsListPage /> },
          { path: '/connections/pending',    element: <ConnectionsPendingPage /> },
          { path: '/profile-viewers',        element: <ProfileViewersPage /> },
          { path: '/add-user',               element: <AddContactPage /> },
          { path: '/pitch',                  element: <PitchPage /> },
          { path: '/mis',                    element: <MISPage /> },
          { path: '/schedule',               element: <SchedulePage /> },
          { path: '/travel',                 element: <TravelPage /> },
          { path: '/matchmaking',            element: <MatchSuggestionsPage /> },
          // Admin (wrapped by <RoleGuard roles={['admin','super_admin']}>)
          {
            element: <RoleGuard roles={['admin','super_admin']} />,
            children: [
              { path: '/admin',                     element: <AdminHomePage /> },
              { path: '/admin/connections',         element: <AdminConnectionsPage /> },
              { path: '/admin/digest',              element: <AdminDigestPage /> },
              { path: '/admin/matchmaking',         element: <AdminMatchmakingPage /> },
              { path: '/admin/quarterly-reports',   element: <AdminQuarterlyReportsPage /> },
              { path: '/admin/dead-letter-jobs',    element: <AdminDLQPage /> },
              { path: '/admin/analytics',           element: <AdminAnalyticsPage /> },
              { path: '/admin/lp-funnel',           element: <AdminLPFunnelPage /> },
              { path: '/admin/partner-referral',    element: <AdminPartnerReferralPage /> },
              { path: '/admin/tracxn',              element: <AdminTracxnPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
```

## 10.5 WATI / WhatsApp fallback principle

Until Phase 4:

- **Every WhatsApp-only flow has a web twin.**
  - OTP normally goes via WhatsApp; in Phase 0–3 it's dev-logged; the `/signin` page shows a dev hint banner when `VITE_OTP_BYPASS_HINT=true`: "Dev mode: use OTP `000000`".
  - Admin commands (`APPROVE {id}`, `UPDATE {name}`, `SEND DIGEST`, etc.) → available on `/admin/connections`, `/admin/tracxn`, `/admin/digest`.
  - User digest previews (Phase 4 "Reply 1,2,3") → available on `/digest` (Phase 4 — placeholder now).
- **Clearly label Phase-4 placeholder screens** with a banner: "WhatsApp channel activates in Phase 4 — this screen is view-only today."

## 10.6 Reusable components (`src/components/`)

| Component                                                            | Purpose                                          |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| `ui/button.tsx`                                                      | shadcn button variants                           |
| `ui/input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`         | form primitives                                  |
| `ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`     | overlays                                         |
| `ui/badge.tsx`, `ui/card.tsx`, `ui/tabs.tsx`, `ui/separator.tsx`     | layout primitives                                |
| `ui/skeleton.tsx`, `ui/avatar.tsx`, `ui/tooltip.tsx`, `ui/toast.tsx` | visual feedback                                  |
| `layout/AppShell.tsx`                                                | sidebar + top bar + outlet                       |
| `layout/Sidebar.tsx`                                                 | role-filtered nav                                |
| `layout/TopBar.tsx`                                                  | user menu + logout                               |
| `data-table/DataTable.tsx`                                           | TanStack Table wrapper (sort / paginate)         |
| `pagination/CursorPaginator.tsx`                                     | infinite scroll with `next_cursor`               |
| `forms/FormField.tsx`                                                | label + input + error                            |
| `forms/PhoneInput.tsx`                                               | E.164-only input, auto-prefix +91 option         |
| `forms/OTPInput.tsx`                                                 | 6-digit cell input                               |
| `forms/FileDropzone.tsx`                                             | react-dropzone wrapper                           |
| `forms/AudioRecorder.tsx`                                            | MediaRecorder wrapper; returns Blob              |
| `empty-state/EmptyState.tsx`                                         | icon + title + body + CTA                        |
| `error-state/ErrorState.tsx`                                         | reads ApiError, renders friendly message + retry |
| `loading/Skeleton*.tsx`                                              | per-layout skeletons                             |
| `role-guard.tsx`                                                     | gates children by role                           |
| `role-badge.tsx`                                                     | colour-coded role chip                           |
| `charts/FunnelChart.tsx`, `CohortChart.tsx`                          | Recharts wrappers                                |

## 10.7 Screen-level breakdown

Per-screen wiring lives with the endpoint it depends on. See each endpoint's `UI flow` subsection in §7 (e.g. `/search` → §7.4.1, `/mis` → §7.9.2, `/admin/dead-letter-jobs` → §7.12.9, `/admin/analytics` → §7.14.1–§7.14.6). Non-obvious composition rules (tabs, filter-chips, infinite-scroll cadence) are called out in those sections.

---

# 11. Edge Cases

## 11.1 API failures

- **Network timeout (axios 30s):** Treat as retryable. Show inline toast with "Retry". TanStack Query retries GET endpoints automatically (default 3 retries with exponential backoff); disable retry on POST/PATCH/DELETE.
- **5xx:** Page-level `<ErrorState />` with "Try again" button. Do not auto-retry mutations.
- **429:** Read `Retry-After` header if present; disable submit button for N seconds; show countdown; otherwise default 60s cooldown.
- **CORS pre-flight failure:** Means backend is unreachable or misconfigured. Show dev-only banner with the configured base URL.

## 11.2 Partial data

- **Nullable fields from list responses:** Use fallback text ("—" or "Not specified"). Never render `null`, `undefined`, or the string `"null"`.
- **Aggregates (analytics):** If a bucket is missing, render 0 — don't hide the bar.
- **Role-masked fields absent:** If `contact` is `null` on a connection row, hide the contact section entirely (don't render an empty card).

## 11.3 Empty states

See §5.2 — every list has a dedicated empty message.

## 11.4 Unauthorised access

- **Wrong role for a route:** `<RoleGuard />` redirects to `/unauthorized` _before_ the page renders. Never rely on the backend 403 as the primary guard — it should be a last line of defence.
- **Token action mismatch** (Phase 4): show a dedicated `/wrong-link` page explaining the user needs a fresh link.

## 11.5 Stale data

- Search results are not cached across queries (cache time 0).
- Connections, suggestions, DLQ, analytics: cache 60s, refetch on focus.
- Auth `/me`: cache 5 min, refetch on reconnect.
- Mutations invalidate their relevant query keys — see §8.12 in `frontend_claude.md`.

## 11.6 Race conditions

- **Slot booking:** UX shows "Hold on..." after click, disables other slot cards. On 409, refresh slot list and show message.
- **DLQ retry:** Disable button on optimistic update; on 409, refetch the row.
- **OTP verify while another OTP is being sent:** Send button locked for 30s after a successful send.

## 11.7 Offline

No offline mode. On `navigator.onLine === false` show a top banner "You're offline — changes will not save." Disable mutation submits until back online.

## 11.8 Very long responses

- `description` / `highlights` / `lowlights`: clamp to 6 lines by default, "Read more" to expand.
- `traceback` (DLQ): render inside a `<pre>` with overflow-auto.

## 11.9 Mobile considerations

- Minimum viewport: 375px.
- Tap targets: 44×44 px minimum.
- Forms: use native mobile input types (`type="tel"` for phone, `type="email"`, `type="number"` for revenue/burn).
- Modals: full-screen on mobile (< 768px).

## 11.10 Accessibility

- All interactive elements have accessible names (`aria-label` or visible text).
- Keyboard navigation: Tab order matches visual order; Esc closes modals; arrow keys in OTP input.
- Contrast: use shadcn's default palette (WCAG AA).
- Announce async events via `aria-live="polite"` (toast region).

---

# 12. Execution Plan

Five phases, each with dependencies and output artefacts.

## 12.1 Phase A — Project setup (2 days)

**Tasks**

- Bootstrap with `pnpm create vite one-community-web -- --template react-ts`.
- Install all dependencies from §6.1.
- Configure Tailwind, shadcn/ui init.
- Set up ESLint + Prettier + Husky + lint-staged.
- Create env files; point `VITE_API_BASE_URL` at local backend.
- Commit `src/api/client.ts`, `src/auth/auth-store.ts`, `src/types/*`, envelope utilities.
- Wire MSW for dev mocking.
- Set up CI (GitHub Actions: install, type-check, lint, test, build).

**Dependencies:** Backend running locally; `.env.development` available; `pnpm` installed.

**Output:** A running `pnpm dev` with blank app, CI green.

## 12.2 Phase B — Auth + App shell (3 days)

**Tasks**

- Implement `/signin` (phone entry + OTP flow).
- `auth-store` with persisted session.
- `GET /auth/me` hook; profile gate → `/onboarding/profile`.
- `<AppShell />` with role-filtered sidebar.
- `/unauthorized`, `/expired` pages.
- `<RequireAuth />` and `<RoleGuard />` components.
- Dev-mode OTP hint banner.

**Dependencies:** Phase A complete.

**Output:** Every role can log in and see a skeleton dashboard with no modules wired.

## 12.3 Phase C — Core user modules (8 days)

Build features one at a time in this order — each merges as a PR before the next starts:

1. **Search** (`/search`) — 1.5 days
2. **Profile view + Connections** (`/profile/:id`, `/connections`, `/connections/pending`) — 2 days
3. **Pitch** (`/pitch`) — 1.5 days
4. **MIS** (`/mis`) — 1 day
5. **Schedule** (`/schedule`) — 1 day
6. **Travel** (`/travel`) — 0.5 day
7. **Matchmaking** (`/matchmaking`) — 0.5 day
8. **Profile viewers** (`/profile-viewers`) — 0.5 day

Each feature: routes + schemas + hooks + loading/empty/error states + unit tests.

**Dependencies:** Phase B complete.

**Output:** All non-admin features usable end-to-end.

## 12.4 Phase D — Admin console (5 days)

1. `/admin` home — `GET /admin/summary`
2. `/admin/connections` — approve/reject
3. `/admin/digest` — list + approve + history
4. `/admin/matchmaking` — generate job + approve pending
5. `/admin/quarterly-reports`
6. `/admin/dead-letter-jobs`
7. `/admin/lp-funnel`
8. `/admin/partner-referral`
9. `/admin/tracxn`
10. `/admin/analytics` — 4 tabs with Recharts

**Dependencies:** Phase C complete (re-uses connections, digest, matchmaking features).

**Output:** All admin screens wired.

## 12.5 Phase E — Polish + hardening (3 days)

- Accessibility audit (Lighthouse + manual).
- Error state coverage review.
- Mobile smoke test on 375/768/1024px.
- E2E happy paths with Playwright (signin → search → request connect → admin approve → target accept).
- Performance pass: bundle size < 300KB gzip for initial chunk; route-level code splitting via `lazy()`.
- Set up Sentry if `VITE_SENTRY_DSN` is supplied.

**Output:** Production build green, CI stable, deployable artefact.

### Total estimate: ~21 working days

---

# 13. Risks & Backend Gaps — resolution plan

Each gap below has a **concrete, committed resolution** the frontend ships TODAY. No "TBD", no "wait for backend". A gap is only accepted into the backlog once it has: (1) a feature flag, (2) an MSW mock, (3) an interim client implementation where applicable, and (4) a flip-the-switch plan for when the backend catches up. Every G-number below cross-references the backend-gap row; flip-the-switch env flags were introduced in §6.6.

## 13.1 Shared infrastructure for gap resolution

### 13.1.1 MSW (Mock Service Worker) — dev-mode handler layer

The frontend ships MSW handlers for **every gap endpoint**. In development (`VITE_MSW_ENABLED=true`), MSW intercepts requests before they hit the network. In production, MSW is never instantiated. This lets FE devs build and test against the missing endpoints today.

```
src/test/
├── msw-browser.ts           # msw setupWorker() — only in dev
├── msw-handlers.ts          # handlers per endpoint (real + gap)
└── msw-fixtures/            # JSON fixtures for canned responses
    ├── profile-by-id.json
    ├── ocr-card-scan.json
    ├── pitch-transcribe.json
    └── documents-upload.json
```

Wire-up in `src/main.tsx`:

```ts
async function enableMocks() {
  if (import.meta.env.DEV && import.meta.env.VITE_MSW_ENABLED === 'true') {
    const { worker } = await import('./test/msw-browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
```

### 13.1.2 Feature flag discipline

Every gap endpoint has a `VITE_*_ENABLED` flag (see §6.6). The frontend endpoint function reads the flag:

```ts
// src/api/endpoints.ts
export async function getProfileById(id: string): Promise<ProfileView> {
  if (env.VITE_PROFILE_V1_ENABLED) {
    const resp = await apiClient.get<ApiEnvelope<ProfileView>>(`/profile/${id}`);
    return zProfileView.parse(resp.data.data);
  }
  return ProfileServiceInterim.getById(id); // see §13.2 G1
}
```

When the backend ships, the ops engineer flips one env var — no code change required.

### 13.1.3 Interim service pattern

For endpoints that are NOT shipping on the backend anytime soon (profile, OCR, documents upload, logout), the frontend has an **interim service** under `src/api/interim/`:

```
src/api/interim/
├── profile-service.ts       # G1 — assembles from search + auth/me
├── ocr-client.ts            # G2 — tesseract.js OCR
├── documents-stub.ts        # G3 — Phase-4 placeholder
└── logout.ts                # G-new — client-only logout
```

The interim service implements the SAME interface the real endpoint will (so when the flag flips, the consumer code stays identical).

---

## 13.2 Per-gap resolution

### G1 — `GET /profile/{id}` not mounted server-side

**Backend state:** `modules/profile/router.py` does not exist. Spec §4.4 documents the endpoint.

**Blocks:** `/profile/:id` screen (§7.5.1).

**Resolution (ship today):**

1. **Flag** — `VITE_PROFILE_V1_ENABLED=false`. Endpoint function `getProfileById(id)` branches on the flag.
2. **Interim impl** at `src/api/interim/profile-service.ts` — composes the `ProfileView` from (a) `POST /search { query: targetUserId, limit: 20 }` then match by `user_id` client-side, (b) `GET /connections` to derive `contact` (if accepted) and `viewer_interaction` flags. Return shape identical to §7.5.1.
3. **MSW handler** — `src/test/msw-handlers.ts` serves fixtures for three viewer states (no connection / pending / accepted).
4. **Flip plan** — set `VITE_PROFILE_V1_ENABLED=true`, delete `src/api/interim/profile-service.ts`. One-file change.

---

### G2 — OCR (`POST /ocr`) and Whisper transcription (`POST /pitch/transcribe`) missing

**Blocks:** `/add-user` (card image → text), `/pitch` voice upload.

**Resolution (ship today):**

1. **Flags** — `VITE_OCR_SERVER_ENABLED=false`, `VITE_WHISPER_SERVER_ENABLED=false`.
2. **OCR interim** — client-side via `tesseract.js`. `src/api/interim/ocr-client.ts` exposes `OCRServiceInterim.recognize(blob) → { raw_text, confidence }`. Feed `raw_text` into existing `POST /onboarding/card-scan`. Latency 2–6s — show progress indicator.
3. **Whisper** — NOT feasible client-side (600MB model). Until backend ships: pitch flow runs in **text-only mode** (founder types pitch summary). Show banner: "Audio transcription coming soon."
4. **MSW handlers** — simulate both endpoints (800ms / 1500ms delay) with canned fixtures so dev UI can exercise happy path before backend catches up.
5. **Flip plan** — independent per endpoint. `tesseract.js` stays as degraded-mode fallback.

---

### G3 — `POST /documents/upload` absent

**Blocks:** `/documents` route.

**Resolution (ship today):**

1. **Flag** — `VITE_DOCUMENTS_UPLOAD_ENABLED=false`.
2. **Interim placeholder** — `/documents` renders a page pointing users to `/pitch` where URL-based deck upload (§7.3.3) works today. No backend call in interim.
3. **Flip plan** — on flag flip (Phase 4), add `<FileDropzone>` wired to multipart upload; register in `api/endpoints.ts`.

---

### G4 — `POST /admin/digest/send` response shape undocumented

**Impact:** Defensive parsing needed on response body.

**Resolution (ship today):**

1. Zod schema with `.passthrough()` — accept documented fields from §7.12.4 (`workflow_name`, `triggered_at?`, `message_count?`, `digest_id?`), preserve unknown keys.
2. UI renders fixed known fields. Debug dock (§6.8) shows full body verbatim in dev.
3. **Flip plan** — when backend publishes schema, tighten Zod to `.strict()`.

---

### G5 — `POST /webhook/wa` (Phase-4 only)

**Backend state:** not yet implemented; triggered only when WATI is active.

**Frontend impact:** None — no user-facing call path.

**Resolution:** N/A — documented for completeness. Phase-4 implementation plan tracked separately in backend CLAUDE.md.

---

### G6 — WATI null-provider in Phase 0–3

OTP not actually WA-delivered. Frontend shows dev-mode banner via `VITE_OTP_BYPASS_HINT=true` ("Dev mode: OTP is `000000`"). Production hides the hint; backend silently succeeds for unknown phones (§7.1.1). **Flip plan:** none needed when WATI activates — contract unchanged.

---

### G7 — `Retry-After` header inconsistent on 429

Axios response interceptor reads `Retry-After` if present, else falls back to 60s: `const retryAfter = Number(err.response?.headers['retry-after']) || 60;`. `<RateLimitToast>` ticks down visually. **Flip plan:** none needed when backend standardises.

---

### G8 — Analytics response shapes are draft

Zod schemas use `.passthrough()` on every §7.14 endpoint. Chart components guard each key (`accepted_pct: resp.accepted_pct ?? 0`). Debug dock (§6.8) shows raw body for admins. **Flip plan:** tighten Zod to `.strict()` when backend publishes.

---

### G9 — Meeting cancellation best-effort on Google Calendar

Always refetch `qk.meetings.bookings` after cancel. Confirm dialog warns: "If Google Calendar still shows the event, delete it manually." **Flip plan:** remove warning when backend retries GCal deletes reliably.

---

### G10 — Pagination mixes `cursor` and `limit/offset`

Two components: `<CursorPaginator>` (everywhere except DLQ) and `<OffsetPaginator>` (DLQ only). Wrapper hook `usePaginatedList(endpoint, strategy)` returns a unified `{ items, nextPage, previousPage, hasMore }` shape so consumers don't care. **Flip plan:** delete `<OffsetPaginator>` and the `'offset'` branch when backend standardises on cursor.

---

### G11 — Profile viewers list could leak PII

Frontend rule: `<ViewerCard>` renders ONLY `name`, `role`, `organisation`, `avatar_url`. Custom ESLint rule flags any access to `viewer.email` / `viewer.phone` in the viewers feature. Rule persists even if backend expands schema.

---

### G12 — Interest tags are free-form strings

`src/lib/tag-colours.ts` provides `tagColour(tag)` — deterministic per-tag colour via lowercase-hash-mod-palette with an EXPLICIT map for common tags (`fintech`, `defence`, `saas`, `ai`, `deep_tech`). `<Tag>` renders with that background. **Flip plan:** replace hash with lookup when canonical taxonomy ships.

---

### G13 — No user-facing "update my role" endpoint

Role is a read-only badge on `/onboarding/profile` with tooltip "Contact Warmup Ventures to change." Admin role change today is DB-only. **Flip plan:** wire `/admin/users/:id` role picker when `PATCH /admin/users/{id}/role` ships. No user-facing endpoint planned.

---

### G14 — `super_admin` vs `admin` has no UX distinction

`can()` treats them identically; every capability list that includes `admin` also includes `super_admin`. Role badge renders "Super Admin" vs "Admin" for display only. **Flip plan:** add new capability row in `CAPABILITIES` when backend differentiates.

---

### G15 — No `POST /auth/logout` endpoint

`src/api/interim/logout.ts` does client-only logout: `queryClient.clear()` + `useAuthStore.getState().clear()` + `router.navigate('/signin')`. **Flip plan:** wrap with a fire-and-forget `apiClient.post('/auth/logout')` when backend ships.

---

### G16 — No `GET /users/me/full` companion

`/auth/me` returns thin fields (no startup / lp_profile). `src/api/interim/my-profile.ts` + hook `useMyFullProfile()` stitches `/auth/me` + `/pitch/profile` + best-effort lp_profile cache into a unified `MyProfile`. **Flip plan:** replace with a single call when the consolidated endpoint ships.

---

## 13.3 Suggested backend follow-ups (tracked, not blocking)

Prioritised by frontend impact. Frontend is unblocked on all of these via §13.2.

1. **P0** — Ship `modules/profile/router.py` with `GET /profile/{id}` (resolves G1).
2. **P0** — Ship `POST /ocr` via Google Vision (resolves G2 OCR; keeps `tesseract.js` as degraded-mode fallback).
3. **P1** — Ship `POST /pitch/transcribe` via Whisper (resolves G2 audio pitch; pushes pitch flow from text-only to audio-native).
4. **P1** — Publish `modules/analytics/schemas.py` with Pydantic schemas (resolves G8; frontend can tighten Zod to `.strict()`).
5. **P2** — Standardise pagination on cursor everywhere — migrate DLQ off offset (resolves G10).
6. **P2** — Uniform `Retry-After` header on 429 (resolves G7).
7. **P3** — `POST /auth/logout` for audit trail (resolves G15).
8. **Phase 4** — `POST /webhook/wa`, `POST /documents/upload`, deep-link token flows, action-claim endpoint wiring.

## 13.4 Backend-gap acceptance criteria (do NOT merge unflagged work)

A frontend PR that touches a gap endpoint MUST:

- [ ] Reference the G-number in the PR description.
- [ ] Use the corresponding `VITE_*_ENABLED` flag.
- [ ] Ship (or reuse) the MSW handler in `src/test/msw-handlers.ts`.
- [ ] If using an interim service, live under `src/api/interim/` and share the real endpoint's TypeScript signature.
- [ ] Cover both modes (flag on + flag off) in tests.

These gates are enforced by the PR checklist in `frontend_claude.md §10`.

---

## Appendix A — Endpoint index (alphabetical, 60 endpoints)

```
GET    /health                                         public
GET    /metrics                                        public (Prom scrape)

POST   /api/v1/auth/otp/send                           public
POST   /api/v1/auth/otp/verify                         public
GET    /api/v1/auth/me                                 any

POST   /api/v1/onboarding/card-scan                    any
GET    /api/v1/onboarding/card-scan/{scan_id}          any
PATCH  /api/v1/onboarding/profile                      any
POST   /api/v1/onboarding/lp-profile                   lp,potential_lp,admin,super_admin

POST   /api/v1/pitch/profile                           startup_*,admin,super_admin
GET    /api/v1/pitch/profile                           startup_*,admin,super_admin
POST   /api/v1/pitch/deck                              startup_*,admin,super_admin     → 202 job
GET    /api/v1/pitch/deck/jobs/{job_id}                startup_*,admin,super_admin

POST   /api/v1/search                                  lp,potential_lp,vc,startup_funded,admin,super_admin

POST   /api/v1/connections/request                     lp,potential_lp,vc,startup_funded,admin,super_admin
PATCH  /api/v1/connections/{id}/admin                  admin,super_admin
PATCH  /api/v1/connections/{id}/respond                any
GET    /api/v1/connections                             any
GET    /api/v1/connections/pending                     any

POST   /api/v1/interactions/log                        any
POST   /api/v1/interactions/feedback                   any
GET    /api/v1/interactions/profile-viewers            any
GET    /api/v1/interactions/exclusions                 admin,super_admin

POST   /api/v1/matchmaking/generate                    admin,super_admin               → 202 job
GET    /api/v1/matchmaking/jobs/{job_id}               admin,super_admin
POST   /api/v1/matchmaking/approve                     admin,super_admin
GET    /api/v1/matchmaking/pending                     admin,super_admin
GET    /api/v1/matchmaking/suggestions                 lp,potential_lp,vc,startup_funded,admin,super_admin
POST   /api/v1/matchmaking/suggestions/{id}/respond    lp,potential_lp,vc,startup_funded,admin,super_admin

GET    /api/v1/portfolio/mis                           startup_funded,admin,super_admin
POST   /api/v1/portfolio/mis                           startup_funded,admin,super_admin
GET    /api/v1/portfolio/mis/prefill                   startup_funded,admin,super_admin

GET    /api/v1/schedule/slots                          any
POST   /api/v1/schedule/book                           any
GET    /api/v1/schedule/bookings                       any
DELETE /api/v1/schedule/book/{id}                      any (owner/admin)

POST   /api/v1/travel/plans                            any
GET    /api/v1/travel/plans                            any
DELETE /api/v1/travel/plans/{id}                       any (owner)
PUT    /api/v1/travel/home-city                        any

GET    /api/v1/admin/summary                           admin,super_admin
GET    /api/v1/admin/connections                       admin,super_admin
GET    /api/v1/admin/digest                            admin,super_admin
POST   /api/v1/admin/digest/send                       admin,super_admin
PUT    /api/v1/admin/lp/{user_id}/funnel-status        admin,super_admin
POST   /api/v1/admin/partner-referral                  admin,super_admin
GET    /api/v1/admin/quarterly-reports                 admin,super_admin
POST   /api/v1/admin/quarterly-reports/approve         admin,super_admin
GET    /api/v1/admin/dead-letter-jobs                  admin,super_admin
POST   /api/v1/admin/dead-letter-jobs/{id}/retry       admin,super_admin

POST   /api/v1/digest/generate                         admin,super_admin
POST   /api/v1/digest/approve                          admin,super_admin
GET    /api/v1/digest/pending                          admin,super_admin
GET    /api/v1/digest/history                          admin,super_admin

GET    /api/v1/analytics/overview                      admin,super_admin
GET    /api/v1/analytics/funnel/lp                     admin,super_admin
GET    /api/v1/analytics/funnel/startup                admin,super_admin
GET    /api/v1/analytics/funnel/connections            admin,super_admin
GET    /api/v1/analytics/cohort                        admin,super_admin
GET    /api/v1/analytics/match-success                 admin,super_admin

POST   /api/v1/enrichment/tracxn                       admin,super_admin
```

---

## Appendix B — Zod schema sketch (ready-to-copy)

```ts
// src/types/enums.ts
export const zRole = z.enum([
  'lp',
  'potential_lp',
  'vc',
  'startup_inprogress',
  'startup_onboarded',
  'startup_funded',
  'partner',
  'advisor',
  'admin',
  'super_admin',
]);
export const zStage = z.enum([
  'ideation',
  'pre_seed',
  'seed',
  'early_growth',
  'pre_a',
  'series_a',
  'pre_b',
  'series_b',
  'late_growth',
]);
export const zConnStatus = z.enum([
  'pending_admin',
  'approved',
  'rejected_admin',
  'pending_target',
  'accepted',
  'declined',
]);

// src/features/auth/schemas.ts
export const zOTPSend = z.object({ phone: z.string().regex(/^\+\d{10,15}$/) });
export const zOTPVerify = zOTPSend.extend({ otp: z.string().regex(/^\d{6}$/) });
export const zAuthSession = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
  user_id: z.string().uuid(),
  role: zRole,
});

// src/features/search/schemas.ts
export const zSearchRequest = z.object({
  query: z.string().min(1).max(500),
  filters: z.record(z.unknown()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().nullable().optional(),
});
```

---

_End of frontend PRD. Version 1.0 — 2026-04-23._
