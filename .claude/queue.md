# `.claude/queue.md`

> **Feature build queue — dependency-ordered.** The single source of truth for "what Claude works on next."
>
> **Read at the START of every session.** Tick boxes as features complete. Do not skip order without a `§ Resolved` item in `decisions.md` documenting why.

---

## How Claude uses this file

1. **At session start:** scan top to bottom. The next `- [ ]` unchecked item IS the next feature to build.
2. **While building:** work on ONE feature per session. Do not batch features unless the prompt explicitly allows it (e.g. Stage 4 admin session groupings in `plan.md`).
3. **At session end:** tick the box with `- [x]` and update `session.md`.

### Stage gates

When a whole stage's boxes are ticked, pause and await human review before starting the next stage. Do NOT self-advance across stage boundaries.

---

## Stage 1 — Scaffold (Opus: 1 session ~3 hr)

- [x] **chassis** — vite + deps + folder tree per §6.2 + apiClient + authStore + ExecutionPanel + RoleGuard + MSW + CI + husky. `pnpm lint && typecheck && test && build` all green.
- [x] **brand tokens wired** — `tailwind.config.ts` + `src/styles/globals.css` + `index.html` Google Fonts link all match PRD §6.6b. Add a visual smoke test: mount one `<Button>`, one `<Card>`, one `<Badge variant="success">` on `/dashboard` and confirm the colours render as primary blue, white surface with grey border, green-tinted success respectively.
- [x] **stub routes** — /signin, /dashboard, /expired, /unauthorized, /not-found (empty pages). Plus Phase-4 placeholder routes /documents (§13 G3) and /digest (§10.5) — each renders a "Coming soon" card pointing to the non-Phase-4 equivalent.

> Gate after Stage 1: human reviews scaffold in depth. Tag `v0.1-scaffold`.

---

## Stage 2 — Auth + 2 calibration features (Opus: 3 sessions, thorough review)

- [x] **auth** — /signin (OTP flow §7.1.1–7.1.3), /onboarding/profile (§7.2.3), /onboarding/lp-profile (§7.2.4). Route by role per PRD §10.2. MSW + unit + integration tests.
- [ ] **feature-search** — POST /search (§7.4.1) + per-card interaction log (§7.7.1). /search route with SearchBar, FilterChips (URL-backed), infinite scroll, ExecutionPanel for query submit. Handle partner role masking + stage3 fallback banner.
- [ ] **feature-admin-connections** — GET /admin/connections (§7.12.2) + PATCH /connections/{id}/admin (§7.6.2). /admin/connections with status tabs, DataTable, InlineExecutionButton (optimistic). RoleGuard admin/super_admin.

> Gate after Stage 2: human reviews BOTH calibration features thoroughly. If patterns are right, unlock autonomous mode. Tag `v0.2-calibration`.

---

## Stage 3 — User features (Opus: 8 sessions autonomous, spot-checks every 4)

- [ ] **profile-view** — GET /profile/{id} (§7.5.1). **Flagged** — read §13 G1 first; build with interim service via `src/api/interim/profile-service.ts` when `VITE_PROFILE_V1_ENABLED=false`.
- [ ] **connections** — GET /connections (§7.6.4) + GET /connections/pending (§7.6.5) + PATCH /connections/{id}/respond (§7.6.3) + POST /interactions/feedback (§7.7.2). Two routes. Incoming/outgoing tabs on pending.

_Spot-check gate after 2 features above_

- [ ] **pitch** — GET + POST /pitch/profile (§7.3.1–7.3.2) + POST /pitch/deck (§7.3.3) + poll GET /pitch/deck/jobs/{id} (§7.3.4). `<ExecutionPanel jobPoll={...}>`.
- [ ] **mis** — GET /portfolio/mis (§7.9.1) + GET /portfolio/mis/prefill (§7.9.3) + POST /portfolio/mis (§7.9.2). Strict `raw_data` keys. 409 conflict handling.

_Spot-check gate after 4 features total_

- [ ] **schedule** — GET /schedule/slots (§7.10.1) + POST /schedule/book (§7.10.2) + GET /schedule/bookings (§7.10.3) + DELETE /schedule/book/{id} (§7.10.4). Calendar grid UI, IST timezone.
- [ ] **travel** — POST /travel/plans (§7.11.1) + GET /travel/plans (§7.11.2) + DELETE /travel/plans/{id} (§7.11.3) + PUT /travel/home-city (§7.11.4).
- [ ] **matchmaking** — GET /matchmaking/suggestions (§7.8.5) + POST /matchmaking/suggestions/{id}/respond (§7.8.6). Card UI with "Interested / Skip / Not a fit" buttons.
- [ ] **profile-viewers** — GET /interactions/profile-viewers (§7.7.3). **PII discipline per §13 G11** — never render viewer email/phone even if backend adds them.

_Spot-check gate after 4 features above (8 total)_

- [ ] **onboarding-add-user** — POST /onboarding/card-scan (§7.2.1) + GET /onboarding/card-scan/{id} (§7.2.2). Client-side OCR via tesseract.js per §13 G2. Duplicate-contact modal on 409.

> Gate after Stage 3 (user features done): tag `v0.3-user-features`.

---

## Stage 4 — Admin features (Opus: 3 sessions, batched)

### Session 4.1 — Admin home + digest + matchmaking ops

- [ ] **admin-home** — GET /admin/summary (§7.12.1). KPI cards + recent actions feed.
- [ ] **admin-digest** — GET /admin/digest (§7.12.3) + POST /admin/digest/send (§7.12.4) + POST /digest/generate (§7.13.1) + POST /digest/approve (§7.13.2) + GET /digest/pending (§7.13.3) + GET /digest/history (§7.13.4). Tabs: Workflows / Pending / History.
- [ ] **admin-matchmaking-ops** — POST /matchmaking/generate (§7.8.1) + GET /matchmaking/jobs/{id} (§7.8.2) + GET /matchmaking/pending (§7.8.4) + POST /matchmaking/approve (§7.8.3). `<ExecutionPanel jobPoll>` for generate.

_Spot-check gate_

### Session 4.2 — Reports + DLQ + LP funnel

- [ ] **admin-quarterly-reports** — GET /admin/quarterly-reports (§7.12.7) + POST /admin/quarterly-reports/approve (§7.12.8).
- [ ] **admin-dead-letter-jobs** — GET /admin/dead-letter-jobs (§7.12.9) + POST /admin/dead-letter-jobs/{id}/retry (§7.12.10). **Offset pagination** (the only endpoint that uses it — per §13 G10). Drawer with full traceback.
- [ ] **admin-lp-funnel** — PUT /admin/lp/{user_id}/funnel-status (§7.12.5). Picker route `/admin/lp-funnel/:user_id` with 5-stage status buttons + override dialog on 409.

_Spot-check gate_

### Session 4.3 — Partner referral + Tracxn + Analytics

- [ ] **admin-partner-referral** — POST /admin/partner-referral (§7.12.6). Simple form.
- [ ] **admin-tracxn** — POST /enrichment/tracxn (§7.15.1). Manual console form + action-specific toast (created / merged / skipped).
- [ ] **admin-analytics** — all /analytics/* (§7.14.1–7.14.6). Four tabs: Overview (KPI cards), Funnel (3 stacked charts), Cohort (heatmap), Match Success (line chart). Recharts. Zod `.passthrough()` per §13 G8.

_Spot-check gate_

> Gate after Stage 4: tag `v0.4-admin`.

---

## Stage 5 — Polish + QA (Opus: 2 sessions)

- [ ] **qa-report** — Opus in QA mode writes `.claude/issues.md § Active`. No code changes.
- [ ] **qa-fixes** — Opus fixes every non-deferred item from issues.md. Triages resolved vs archived.
- [ ] **a11y-audit** — Lighthouse run + keyboard-nav smoke on top 10 screens. Fix score < 90.
- [ ] **bundle-size** — route-level `React.lazy()` for all admin routes. Initial chunk < 300KB gzip.
- [ ] **playwright-smoke** — signin → search → request-connect → admin-approve → target-accept, end-to-end.

> Gate after Stage 5: tag `v1.0` and push.

---

## Legend

- `- [ ]` unchecked — not started
- `- [~]` in progress — currently building (optional; use in long sessions)
- `- [x]` done — merged + all four gates green
- `- [!]` blocked — see decisions.md §Pending
- `- [-]` deferred — see issues.md § Resolved with "deferred" note
