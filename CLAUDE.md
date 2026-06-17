# CLAUDE.md — One Community Web (Warmup Ventures)

React 18 + TypeScript SPA for Warmup Ventures' internal platform. Role-based dashboard serving 10 roles. Backend is a separate FastAPI service at `/api/v1`.

**Start every session by reading `.claude/session.md`** — current phase, live flags, open items.

---

## Never do without asking first

- Add or bump a package in `package.json`
- Change `src/api/client.ts` interceptors or `src/auth/auth-store.ts` persistence schema (invalidates sessions)
- Change `CAPABILITIES` in `src/lib/role-capabilities.ts` or invent a new `UserRole` value
- Change folder structure from `frontend_prd.md §6.2`
- Add a root-level route not listed in `frontend_prd.md §4`
- Bypass pre-commit hooks (`--no-verify` is forbidden)

---

## Working principles

- **State assumptions, don't pick silently.** Multiple reasonable readings → name them and ask. Confused by existing code → say so before writing on top of it.
- **Smallest diff that satisfies the request.** No speculative features, no abstractions for code used once, no error handling for cases that can't occur.
- **Touch only what the task needs.** Don't reformat or rename adjacent code. When your change orphans an import, remove it; leave pre-existing dead code alone.
- **Turn vague asks into checkable goals.** "Fix the bug" → reproduce in a failing test then make it pass. For anything touching more than one file, state a short numbered plan first.

---

## Architecture rules

**Layering — one direction, no exceptions:**

```
routes/*  →  hooks/*  →  api/endpoints.ts  →  api/client.ts
```

- `routes/` never imports from `api/endpoints.ts` directly — always through hooks
- `components/` never uses `useQuery`/`useMutation` directly for business data — through hooks
- `lib/` never imports from `api/`, `auth/`, or `features/`
- `components/ui/` (shadcn primitives) never imports from anywhere else in the app

**Cross-feature imports — forbidden:**

- Feature A never imports Feature B's internals. Promote shared components to `src/components/`.
- Shared domain types go in `src/types/domain.ts`

**File naming (exact):**

- Components: `PascalCase.tsx` · Hooks: `use-kebab-case.ts` (never `.tsx`) · Utilities: `kebab-case.ts`
- Always `@/*` alias — never long relative paths

**State ownership:**

- Server state → TanStack Query only; never put server data in Zustand
- Auth session → `src/auth/auth-store.ts` (the only mandatory store)
- Form state → React Hook Form + Zod
- URL filters → React Router search params, not local state
- New Zustand store only for pure UI state needed across >2 unrelated components that can't live in URL/Query

**API:**

- Never instantiate Axios elsewhere — always import `apiClient` from `src/api/client.ts`
- Never call `fetch()` for backend calls — bypasses auth interceptor
- Every endpoint has a typed function in `src/api/endpoints.ts` with Zod response parsing
- Every query key lives in `src/api/query-keys.ts` as a factory — never inline
- Never send a PATCH with `undefined` fields — strip before submit
- `retry: false` on all mutations globally — never auto-retry mutations
- Poll `GET /jobs/{job_id}` every 3s max 90s for `202` async endpoints (`/pitch/deck`, `/matchmaking/generate`)

**Auth:**

- JWT in Zustand + `localStorage['oc.auth']` — never in cookies
- 401/`token_expired` from any request other than `/auth/me` → rethrow `ApiError`, do NOT clear session
- Never trust role from `localStorage` without checking `expiresAt`
- Post-signin landing always `/dashboard` for every role
- Never log JWT, OTP, or phone in full

**RBAC:**

- `src/lib/role-capabilities.ts` is the only place for role → feature access
- Never `role === 'admin'` inline — always `can(role, capability)`
- Never hide a forbidden action with CSS only — remove from DOM
- `contact` on a connection exists only when `status === 'accepted'` — never assume
- Partner role: withheld fields are missing (not `null`) — Zod marks `.optional()`, render `<LockedField>` placeholders

**UI — mandatory on every screen that fetches:**
All four states required: Loading (skeleton, not spinner-only) · Empty (icon + message + action) · Error (`<ErrorState error onRetry />`) · Success. Missing any of the four fails PR review.

**Forms:**

- Submit button: disabled while `isSubmitting || !isDirty || !isValid`
- `zodResolver(schema)` on every form — error messages from Zod, not duplicated in JSX
- OTP input: `type="text" inputMode="numeric"` — never `type="password"`

**Design system:**

- Never hardcode hex/rgb — use `colours.*` tokens
- Never create one-off card divs — use `<SurfaceCard>`
- Page titles: always `<PageHeader title="..." />` — never raw `<h1 className="text-3xl...">`
- Tags/badges: always `<Tag>` — never one-off badge divs
- Banned pastels: `#ede9fe`, `#dcfce7`, `#fef3c7`, `#dbeafe`, `#6d28d9`, `#15803d`, `#b45309`, `#1d4ed8`

**Performance:**

- Code-split at route level with `React.lazy` — mandatory
- Admin routes must be lazy-loaded — external users must not download admin code
- Never render >100 rows without virtualisation (`@tanstack/react-virtual`)
- Memoise only proven hot paths — profile first; bundle size delta <30 KB gzip (non-admin), <80 KB (admin)

**Security:**

- Never `dangerouslySetInnerHTML` user content — sanitise with DOMPurify if unavoidable
- Never build a URL from user input without `encodeURIComponent`
- Never `target="_blank"` without `rel="noopener noreferrer"`
- Never expose backend base URL other than `VITE_API_BASE_URL`

**Code quality:**

- Named exports for components — not `export default`
- Components under 150 lines — extract if longer
- No `console.log` in merged code
- No commented-out code — delete it, git remembers
- No `// @ts-ignore` — use `// @ts-expect-error <reason>` and fix in the same PR
- Never `any` without ESLint-disable + reason; use `unknown`
- Never make Zod schemas laxer than backend responses
- Never disable ESLint rules globally

**Responsive:**

- Min viewport: 375px · Tap targets: 44×44 px minimum
- `font-size: 16px` on all `<input>` to prevent iOS zoom
- Test 375 / 768 / 1024 / 1440 before shipping

**Testing:**

- Every new hook → unit test (MSW-mocked) in the same commit
- Every new page → smoke integration test in the same commit
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass — zero exceptions

---

## Context & token tooling

Three tools reduce token usage by 60–90%. None change the rules above.

- **RTK** hooks all Bash calls globally — `git`, `pnpm`, `grep`, etc. are compressed automatically. Don't pipe/truncate manually. If a test fails, re-run the specific test directly for the full trace.
- **Graphify** maintains a code graph at `graphify-out/`. A PreToolUse hook fires before every grep/Read/Glob — run `graphify query "<question>"` first, then read files only for specific lines. Graph auto-rebuilds on `git commit`/`git checkout` via husky hooks. Manually rebuild with `graphify update .` after large structural changes. Never hand-edit `graphify-out/`.
- **Caveman Lite** is on by default — strips filler, keeps technical accuracy. Type `caveman off` in chat to disable for a complex debugging exchange. `caveman ultra` for maximum compression.
- **ccusage** — `npx ccusage@latest claude daily` to check token burn before a large session.

---

## Decided architecture (settled — don't re-litigate without the human)

| Decision            | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Bundler             | Vite 5 — no Next.js/Remix                                                                                                             |
| HTTP client         | axios via `src/api/client.ts` — no `fetch()`, no alternatives                                                                         |
| Styling             | Tailwind 3.4 + shadcn/ui — no CSS-in-JS                                                                                               |
| State: server       | TanStack Query 5 — no Redux                                                                                                           |
| State: client       | Zustand 4 (UI only) + RHF 7 (forms)                                                                                                   |
| Validation          | Zod 3 — no Yup/Joi                                                                                                                    |
| Testing             | Vitest + RTL + MSW v2 — no Jest                                                                                                       |
| Package manager     | pnpm — no npm/yarn                                                                                                                    |
| Auth storage        | Zustand + `localStorage['oc.auth']` — no cookies                                                                                      |
| OTP session         | 4 hours, no refresh token                                                                                                             |
| Roles (exact 10)    | `lp`, `potential_lp`, `vc`, `startup_inprogress`, `startup_onboarded`, `startup_funded`, `partner`, `advisor`, `admin`, `super_admin` |
| `conn_status`       | `pending_admin`, `approved`, `rejected_admin`, `pending_target`, `accepted`, `declined`                                               |
| Git                 | Branch per feature, CI must pass before push; never `git push --force`                                                                |
| Nav source of truth | `NAV_ITEMS` in `src/lib/role-capabilities.ts` — one list for desktop + mobile                                                         |

---

## Where everything else lives

- Current phase, live flags, open items → `.claude/session.md`
- Full API contract and data model → `docs/frontend_prd.md`
- Codebase structure map (auto-generated) → `graphify-out/GRAPH_REPORT.md` — rebuild, never hand-edit
- What shipped and when → `git log`, not this file

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
