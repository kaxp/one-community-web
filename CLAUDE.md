# frontend_claude.md — AI Coding Rules for the One Community Web Client

> **Read this file completely before starting any task.**
>
> **This file is the single source of truth for AI-assisted frontend development sessions.** It mirrors the role of the backend's `/CLAUDE.md` but applies to the frontend repository. If an instruction here conflicts with tribal knowledge, tutorials, or a model's priors — this file wins.
>
> **Companion document:** `/docs/frontend_prd.md` — read it too. That file contains the full API contract and data model; this file contains the behavioural rules. Never generate code that contradicts either document.

---

## 0. PROJECT OVERVIEW

**One Community Web** is the React SPA for Warmup Ventures' internal community platform. It is a **role-based dashboard** serving 10 distinct roles (Admin, Super Admin, LP, Potential LP, VC, 3 Startup stages, Partner, Advisor).

**Backend:** FastAPI (Python), Postgres + Redis + pgvector. Already complete through Phase 6. All endpoints live under `/api/v1`. See `frontend_prd.md §7` for every contract.

**What this repo is:**

- A single-page React 18 + TypeScript app bundled by Vite
- Deployed as static assets; the backend at `warmupventures.com/api/*` is a separate service
- Zero server-side rendering, zero Next.js, zero Node-side code
- OTP-authenticated (no passwords, no signup form)

**What this repo is NOT:**

- Not a native app (web only — mobile-first responsive)
- Not a public marketing site
- Not the WhatsApp bot (that lives on WATI in Phase 4)
- Not allowed to talk to any backend service other than the One Community API

---

## 0.1 Operating mode — single Opus 4.7 with `.claude/` file protocol

This repo is built by a **single Claude Opus 4.7 instance** working mostly autonomously, with light human gating. Coordination state lives in `.claude/` — four files that survive session resets. Read this section in full at the start of every session; the rules below are non-negotiable.

**Companion:** `frontend_prd.md` holds API contracts (§7), data models (§8), transformations (§8.12), gap resolutions (§13). This file is rules; the PRD is contracts. Load them together.

**Selective reading:** do NOT load the whole PRD into context per session. Load only the sections relevant to the current feature. See `§0.1.11` at the end of this section for the lookup table.

### 0.1.1 The four `.claude/` files

| File                   | What it is                                                                                           | Who writes                                                              | When written                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| `.claude/decisions.md` | Living decisions log — `§ Pending` (awaiting human) + `§ Resolved` (answered)                        | Claude appends pending; human fills `Answer:`; Claude moves to resolved | Any time a decision is made or a blocker is hit |
| `.claude/queue.md`     | Feature build queue, dependency-ordered, with `- [ ]` checkboxes                                     | Claude ticks boxes                                                      | When a feature completes all four gates         |
| `.claude/session.md`   | Single-snapshot "where I stopped" — current feature, last action, next step, blockers, files touched | Claude **overwrites** (not appends)                                     | END of every session                            |
| `.claude/issues.md`    | QA-found code issues, severity-tagged, with file:line references                                     | Claude in QA mode (Stage 5) or spot-checks                              | During QA runs                                  |

**All four files are committed to git.** They are the coordination surface — a fresh session with no memory must be able to resume correctly by reading these four files plus the relevant `§7.X` endpoint in the PRD.

### 0.1.2 Session startup protocol (MANDATORY)

Run these steps in order BEFORE writing any code:

1. Read `.claude/decisions.md § Pending`. If ANY item is marked `**Blocking:** yes` AND has no answer, **STOP** — print the banner (§0.1.5), do not proceed.
2. Read `.claude/session.md` — resume from `Next concrete step`.
3. Read `.claude/queue.md` — confirm the next unchecked feature matches `session.md § Current feature`.
4. Read `.claude/issues.md § Active` — if any row's `Feature:` matches the current feature, fix those FIRST before continuing net-new work.
5. Load the relevant `docs/frontend_prd.md §7.X` for this feature AND `§8.12` for transformations. Do not rely on memory of contracts.

### 0.1.3 Session shutdown protocol (MANDATORY)

Before ending a session, execute these steps in order:

1. Run all four gates: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. All must exit 0. If any fail, fix BEFORE ending the session.
2. If the feature is complete, tick its box in `.claude/queue.md`.
3. **Overwrite** `.claude/session.md` with fresh state (not append — this file is a single snapshot). Update every field per the template in that file.
4. If new blockers arose, confirm they are in `.claude/decisions.md § Pending` with the full template.
5. `git add -A && git commit -m "<feat|chore|fix>: <summary>"` — one or more semantic commits.
6. Print a summary in the form:
   ```
   Session complete. Feature: <feature-key>. Commits: <count>. Next: <next feature from queue.md>.
   ```
7. Stop. Do not start the next feature automatically.

### 0.1.4 Human input protocol (CRITICAL)

If during a session you encounter ANY of the situations below, **STOP**. Do not guess. Do not invent a plausible answer. Do not code around the unknown.

**Trigger situations:**

- A decision that could legitimately go multiple ways (design, UX copy, product behaviour).
- A mismatch between `frontend_prd.md §7.X` contract and observed live backend response.
- A library/tool not in the sanctioned list (§1.1, §1.2) that you believe is necessary.
- An internal contradiction between this file and the PRD.
- An ambiguity in any spec item that affects >1 line of code.

**What to do (exact sequence, no deviations):**

**Step 1 — Append to `.claude/decisions.md § Pending`** using this exact template:

```markdown
### [P-N] <short title>

- **Feature:** <feature-key from queue.md, or "cross-cutting">
- **Blocking:** yes / no
- **Added:** <YYYY-MM-DD>
- **Context:** <one short paragraph — what you were doing and why this came up>
- **Question:** <single specific question, no compound questions>
- **Options:**
  - (a) <option> — <one-line tradeoff>
  - (b) <option> — <one-line tradeoff>
  - (c) <option if applicable>
- **My recommendation:** (a) / (b) / (c) — <one-line reason>
- **Answer:** _(human fills this)_
```

Number items sequentially across sessions: P-1, P-2, … Do not reuse numbers.

**Step 2 — Print the banner** to the console EXACTLY in this format:

```
🟡 HUMAN INPUT NEEDED — see .claude/decisions.md [P-N]
Question: <one-line summary of the question>
Blocking: yes / no
Recommended: (a) <recommendation>

Please answer in .claude/decisions.md under [P-N]'s "Answer:" line, then reply "continue" in this chat.
```

**Step 3 — Update `session.md`** with the BLOCKED state:

- `Current feature`: (unchanged)
- `Last completed action`: (unchanged)
- `Next concrete step`: `"Waiting on [P-N] in decisions.md"`
- `Open blockers`: list `[P-N] <short title>` — add this pending item

**Step 4 — STOP.** Do not continue. Do not try to work around the missing answer. Do not attempt another feature.

### 0.1.5 Batching rule — ask once, not many times

Do not surface pending items one at a time across multiple sessions if you can foresee them. Specifically:

- **At the start of Stage 0** (upfront interview — see `docs/plan.md`): read the PRD + this file in full, then compile EVERY unknown into `decisions.md § Pending` as P-1, P-2, … all at once. Print ONE banner covering all of them.
- **During feature work**: if you realise you need 2 answers to proceed, add BOTH pending items, print ONE banner listing both, then stop. Do not stop for one, wait for the answer, then stop for the next.

The goal: the human's context switches are precious. Minimize them.

### 0.1.6 Human resolution protocol

When the human has answered a pending item:

1. Read the filled-in `**Answer:**` line for each resolved P-N.
2. **Move the item** from `§ Pending` to `§ Resolved` in `decisions.md`, rewriting it into the resolved template:

   ```markdown
   ### [P-N] <short title> ✅ resolved <YYYY-MM-DD>

   - **Decision:** <the chosen option, verbatim from human answer>
   - **Rationale:** <human's reason if provided, else "per human direction">
   - **Touches:** <files / features that rely on this>
   ```

3. Clear the item from `session.md § Open blockers`.
4. Resume from `session.md § Next concrete step`.

### 0.1.7 What belongs in `decisions.md` vs `issues.md` vs `session.md`

- **`decisions.md`** — durable choices. Things a session 3 weeks from now needs to know. Brand colours, URLs, flag values, "we chose X over Y".
- **`issues.md`** — code-quality defects. File:line references. Bugs, missing UI states, rule violations.
- **`session.md`** — ephemeral state. The one snapshot of "right now". Overwritten every session end.

If unsure, ask: "will a session 3 weeks from now need to know this?" → yes = `decisions.md`, no = `session.md`.

### 0.1.8 Never invent answers to these

| Category               | Examples                                                 | Action                                                                     |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Visual design choices  | Icon for a feature, exact colour shade, empty-state copy | Append to `decisions.md § Pending`, banner                                 |
| Product behaviour      | Should X show a confirm dialog, what happens on Y        | Append to `decisions.md § Pending`, banner                                 |
| Backend contract drift | Live response differs from PRD §7.X                      | Append to `decisions.md § Pending`, banner                                 |
| Ambiguous spec         | "and related filters" — which filters exactly            | Append to `decisions.md § Pending`, banner                                 |
| Library selection      | Which chart lib for analytics                            | Default to the sanctioned list (§1.1); if no sanctioned option exists, ask |

### 0.1.9 Workflow hooks

`.claude/settings.json` wires two automated gates:

- **PostToolUse (on every Edit / Write)** — runs `pnpm lint --quiet`. Lint failures appear in Claude's own output so Claude corrects them without human intervention.
- **Stop** — runs `pnpm typecheck` + `pnpm test`. Claude sees any regressions immediately and can fix before actually stopping.

Never override these hooks. Never run `--no-verify` on commits. If a hook fails, the fix is the real problem; the hook is not in the way.

### 0.1.10 Git discipline during autonomous mode

- `git pull --rebase` at the start of every session (once; not required if just resumed a local session).
- Commit after every feature with conventional prefix: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Never `git push --force` to main.
- Never `git reset --hard` without confirming with the human.
- Stage the full `.claude/*` alongside the code change in the same commit — coordination state and code state must move together.

### 0.1.11 Selective-reading lookup (what PRD section for what)

For every task, load only the relevant slice of `frontend_prd.md` — not the whole file. A typical feature session needs ~500–800 lines of PRD context, not 7,000.

| Task                              | Load from `frontend_prd.md`                                                    |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Building a feature                | §7.X (the endpoint) + §8.X (its types) + §8.12 (transforms row for each field) |
| Shared error handling             | §7.0.4 (one-time read)                                                         |
| Pagination / envelope rules       | §7.0.2–§7.0.3 (one-time read)                                                  |
| Cache invalidation after mutation | §8.12.4                                                                        |
| Role gating a screen              | §4 (screen → roles) + §7.X (auth header + role list)                           |
| Sidebar / routing                 | §10.3–§10.4                                                                    |
| Execution Panel usage             | §6.7                                                                           |
| Debug dock                        | §6.8                                                                           |
| Gap endpoint (feature-flagged)    | §13.2 — find the `Gx` for your endpoint                                        |

---

## 1. TECH STACK RULES (non-negotiable)

### 1.1 Versions pinned

**See `frontend_prd.md §6.1` for the full version table (React 18.3, TypeScript 5.4, Vite 5, React Router 6.22, TanStack Query 5, Zustand 4, React Hook Form 7, Zod 3, axios 1, Tailwind 3.4, shadcn/ui, lucide-react, date-fns 3, Recharts 2, TanStack Table 8, sonner 1, react-dropzone 14, Vitest + RTL + MSW v2).** No substitutions without an ADR.

### 1.2 Forbidden libraries

- **Redux / Redux Toolkit** — use TanStack Query + Zustand instead.
- **MobX** — same reason.
- **Axios alternatives** (`ky`, `got`, `fetch` wrappers) — axios is the one HTTP client.
- **`moment.js`** — use date-fns.
- **CSS-in-JS** (emotion, styled-components, stitches) — Tailwind is the styling system.
- **Next.js, Remix, Gatsby** — this is Vite SPA.
- **`npm`, `yarn`** — use `pnpm` (lockfile compatibility).
- **`jest`** — Vitest reads the same Vite config; it's faster and simpler.

### 1.3 TypeScript config (exact)

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
    },
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"],
}
```

**Rules:**

- `strict: true` is non-negotiable.
- `noUncheckedIndexedAccess: true` — if you access `arr[0]`, TS forces you to handle `undefined`.
- `exactOptionalPropertyTypes: true` — `a?: string` is not the same as `a: string | undefined`. Match the API contract exactly.
- Never use `// @ts-ignore`. Use `// @ts-expect-error <reason>` and fix within the same PR.
- Never use `any` unless you add an ESLint-disable with a reason. `unknown` is almost always the right answer.

---

## 2. ARCHITECTURE RULES

### 2.1 Feature-based modular design

Each feature lives in `src/features/<feature>/` and owns:

- `components/` — React components specific to this feature
- `hooks/` — `useXxx` custom hooks (React Query wrappers)
- `routes/` — page-level components wired into the router
- `schemas.ts` — Zod schemas for request/response
- `index.ts` — public barrel export (only what other features can import)

### 2.2 Strict layering

```
routes/*          ← calls hooks only; no direct api/endpoints calls
hooks/*           ← calls api/endpoints typed functions; owns React Query
api/endpoints.ts  ← calls apiClient (axios); parses responses with Zod
api/client.ts     ← axios + interceptors
```

**Rules:**

- A `routes/` file MUST NOT import from `api/endpoints.ts` directly. Always go through `hooks/`.
- A `components/` file MUST NOT use `useQuery`/`useMutation` directly for business data. Components consume hooks.
- `lib/` is pure utilities — **never** imports from `api/`, `auth/`, or `features/`.
- `components/ui/` (shadcn primitives) MUST NOT import from anywhere else in the app. They're leaf components.

### 2.3 Cross-feature imports — forbidden

- Feature A MUST NOT import from Feature B's internals.
  - ❌ `import { SearchBar } from '@/features/search/components/SearchBar'` (from inside `features/matchmaking/...`)
  - ✅ If two features need the same component, promote it to `src/components/`.
- Feature A MAY import types from Feature B's `index.ts` barrel only if those types are part of the feature's public contract.
- Prefer `src/types/domain.ts` for shared domain types (User, Connection, etc.).

### 2.4 File naming

- Components: `PascalCase.tsx` (e.g. `SearchBar.tsx`)
- Hooks: `kebab-case.ts` beginning with `use-` (e.g. `use-search.ts`)
- Utilities: `kebab-case.ts` (e.g. `role-capabilities.ts`)
- Types-only modules: `kebab-case.ts` (e.g. `enums.ts`)
- Never suffix a hook file `.tsx`. Hooks return data, not JSX.

### 2.5 Import alias

Always import from `@/*`. Never use long relative paths.

- ❌ `import { x } from '../../../lib/phone'`
- ✅ `import { x } from '@/lib/phone'`

---

## 3. RBAC RULES (authoritative)

### 3.1 Single source of truth

`src/lib/role-capabilities.ts` is the **only** place where role → feature access is declared. Every routing guard, every sidebar filter, every "can this user see this button" check reads from here.

```ts
// src/lib/role-capabilities.ts
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

export const CAPABILITIES = {
  'search.use': ['lp', 'potential_lp', 'vc', 'startup_funded', 'partner', 'admin', 'super_admin'],
  'search.see_contact': [], // never — contact only after accepted connection
  'connections.request': ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
  'connections.respond': [
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
  ],
  'connections.approve': ['admin', 'super_admin'],
  'pitch.edit': [
    'startup_inprogress',
    'startup_onboarded',
    'startup_funded',
    'admin',
    'super_admin',
  ],
  'mis.submit': ['startup_funded', 'admin', 'super_admin'],
  'matchmaking.respond': ['lp', 'potential_lp', 'vc', 'startup_funded', 'admin', 'super_admin'],
  'matchmaking.approve': ['admin', 'super_admin'],
  'admin.any': ['admin', 'super_admin'],
  'analytics.view': ['admin', 'super_admin'],
  'tracxn.ingest': ['admin', 'super_admin'],
  'card_scan.use': ['lp', 'potential_lp', 'vc', 'admin', 'super_admin'],
  // ... add more as features ship
} as const satisfies Record<string, readonly UserRole[]>;

export function can(
  role: UserRole | null | undefined,
  capability: keyof typeof CAPABILITIES,
): boolean {
  return !!role && (CAPABILITIES[capability] as readonly UserRole[]).includes(role);
}
```

### 3.2 Role-aware routing

- Use `<RoleGuard roles={['admin','super_admin']}>` for whole route subtrees (see `frontend_prd.md §10.4`).
- Use `can(role, 'mis.submit')` for conditional buttons and menu items.
- **Never** check `role === 'admin'` inline in a component. Go through `can()`.
- **Never** hide a forbidden action with CSS only — remove it from the DOM. Disabled buttons are discoverable by inspection.

### 3.3 Backend is still authoritative

- The frontend RBAC hides/disables UI — the backend enforces.
- If a 403 still occurs on a hidden action, log it (with `console.warn` in dev, Sentry in prod) — this means the frontend map drifted from the backend. Fix the map.

### 3.4 Dynamic navigation

The sidebar is built from `NAV_ITEMS` in `role-capabilities.ts` (see `frontend_prd.md §10.3`). Adding a new route MUST add an entry to `NAV_ITEMS` with correct roles — otherwise the route is unreachable from the UI.

### 3.5 Role-masked fields

Backend returns role-masked objects. The frontend must not assume fields present:

- `contact` on a connection is only present when `status === 'accepted'`.
- **Partner search results** (decisions.md [P-20] + UX update [P-21]):
  - **Backend allowlist (data on the wire) — startup target:** `user_id`, `name`, `company_name`, `sector`, `stage`, `one_liner`.
  - **Backend allowlist — LP target:** `user_id`, `name`, `fund_name`, `sectors`.
  - **Withheld for partners:** `organisation`, `designation`, `avatar_url`, `description`, `traction`, `funding_target_cr`, `aum_cr`, `cheque_range_min/max`, `stages`, `geography`, `co_invest_interest`, `similarity_score`, `ai_rank`, `ai_reason`. These fields are **missing** from the response, not `null`. The Zod schemas mark them `.optional()` so they parse cleanly.
  - **Crunchbase-style UX (P-21):** Partners see the FULL card layout. Each withheld field renders a blurred `<LockedField>` placeholder (label + blurred bars) at the position the real value would occupy. The card ends with a `<MaskedCardFooter>` panel with two CTAs: **Request to connect** (the canonical in-platform escalation — admin-gated `POST /connections/request`) and **Upgrade for full access** (placeholder for the partner-monetisation flow). DO NOT hide rows for masked viewers; DO NOT render "null" or empty strings — render `<LockedField>`. Non-masked viewers (LP / VC / startups / admins) keep the previous behaviour: missing rows are hidden.
  - **`isMasked` plumbing:** `<SearchPage>` derives `isMasked = role === 'partner'` via `useRole()` and passes it to every `<ResultCard>`. Future surfaces that show partner-visible profile data (e.g. profile-view, suggestion cards) MUST follow the same pattern.
  - **Future-endpoint rule (off-platform-outreach test):** Any new endpoint that returns startup or LP profile data for partners MUST be reviewed against: do any returned fields enable email / LinkedIn / phone / website lookup outside the platform? If yes, withhold them from the backend allowlist. The frontend then renders them via `<LockedField>` plus a footer CTA.

---

## 4. CODING STANDARDS

### 4.1 Component design

- **Functional components only.** No class components. No `React.Component`.
- **One component per file.** Helper components used only in that file can co-exist (under 30 lines each) but prefer separate files.
- **Props are typed with `interface`** (not `type`), exceptions: unions/intersections.
  ```ts
  interface Props {
    user: UserProfile;
    onSelect(id: string): void;
  }
  export function UserRow({ user, onSelect }: Props) { ... }
  ```
- **Named exports** for components — not `export default`. Default exports break refactor tooling.
- **Keep components under 150 lines.** If longer, extract subcomponents or move logic to a hook.

### 4.2 Hooks

- Custom hooks live in `features/<x>/hooks/` (feature-local) or `src/lib/hooks/` (cross-feature).
- A hook that fetches data returns the React Query result unchanged:
  ```ts
  export function useConnections(limit = 50, cursor?: string) {
    return useQuery({
      queryKey: qk.connections.list(limit, cursor),
      queryFn: () => listConnections({ limit, cursor }),
    });
  }
  ```
- A hook that mutates returns `useMutation` result:
  ```ts
  export function useApproveConnection() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (args: { id: string; note?: string }) =>
        adminApproveConnection(args.id, { action: 'approve', note: args.note }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'connections'] }),
    });
  }
  ```
- **Do not combine data fetching with business logic inside components.** Always go via a hook.

### 4.3 Styling

- **Tailwind first.** Compose utilities inline; extract `cn(...)` concatenations into a variable if the list exceeds ~6 classes or repeats.
- **No custom CSS except in `globals.css`.** If you need a utility Tailwind doesn't have, add it in `tailwind.config.ts` via `theme.extend`.
- **Never inline styles** (`style={{...}}`) except for dynamic values that can't be expressed with classes (e.g. `width: ${pct}%`).
- **Colour palette** comes from shadcn/ui theme tokens. Don't hard-code hex/rgb.
- **Spacing:** use the Tailwind scale (4px base). No magic pixels.
- **Responsive breakpoints:** `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536). Mobile-first — base classes target mobile, then `md:` overrides.

### 4.4 Commit hygiene

- Keep PRs to one feature or one bug.
- Commit messages: `feat: <scope>`, `fix: <scope>`, `chore: <scope>`, `refactor: <scope>`, `test: <scope>`.
- Never mix unrelated changes ("drive-by refactors") with feature work — ship them separately.

### 4.5 Comments

- Default: **no comments.** The code should be self-explanatory.
- Exception: non-obvious reasons — spec references ("spec §4.6", "audit M5"), workarounds for backend quirks, explicit intent where the reader would misunderstand.
- **Never** comment out code. Delete it; git remembers.
- **Never** write planning/TODO comments scattered in files. Use the issue tracker or the execution plan.

---

## 5. API INTEGRATION RULES

### 5.1 Never guess contracts

- `frontend_prd.md §7` is the source of truth for every endpoint.
- If a contract is missing or ambiguous, **stop and ask**. Do not invent request/response shapes. Do not copy from an online example.

### 5.2 Every endpoint has a typed function

- Add the function to `src/api/endpoints.ts`.
- Its input and output types come from `src/types/domain.ts` or a feature's `schemas.ts`.
- Validate the response with Zod at the boundary:

```ts
// src/api/endpoints.ts
export async function getMe(): Promise<UserProfile> {
  const resp = await apiClient.get<ApiEnvelope<UserProfile>>('/auth/me');
  return zUserProfile.parse(resp.data.data);
}
```

If the backend changes shape, Zod throws; the error boundary renders a debug message in dev. Never silently trust `as` casts.

### 5.3 Centralised Axios client

- **Never instantiate Axios elsewhere.** Always import `apiClient` from `src/api/client.ts`.
- **Never call `fetch()` directly** for backend calls. It bypasses the auth interceptor.
- The client injects `Authorization: Bearer <jwt>` on every request. The backend sees the token; the frontend does not need to add it per-call.

### 5.4 Error handling at the call site

- Every async call site handles these three outcomes:
  - **Success** → set state, invalidate queries, toast if user-visible.
  - **`ApiError`** → `ErrorState` in the page OR inline field error OR toast, depending on severity.
  - **Unknown error** → rethrow for the error boundary.
- **Never swallow errors silently.** If it truly doesn't matter, log it:
  ```ts
  try { await logInteraction(...) } catch (e) { console.warn('interaction log failed', e) }
  ```
  and only for fire-and-forget calls.

### 5.5 Pagination

- List endpoints that return `{ items, next_cursor }` — use `useInfiniteQuery`:
  ```ts
  useInfiniteQuery({
    queryKey: qk.connections.list(50),
    queryFn: ({ pageParam }) => listConnections({ limit: 50, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  ```
- DLQ uses `limit/offset` — use `useQuery` with local offset state, not `useInfiniteQuery`.

### 5.6 Idempotency and dedup

- `POST /interactions/log` dedupes `search_view` / `profile_view` within 60s server-side. The frontend SHOULD also debounce rapid re-logs from the same card by 10s to reduce payload.
- Never retry a mutation automatically. React Query default retries GETs only — keep it that way.

### 5.7 Background jobs (pitch eval, matchmaking)

- `POST /pitch/deck` and `POST /matchmaking/generate` return `202 { job_id }`.
- Poll the corresponding `GET /jobs/{job_id}` endpoint every **3 seconds**, bounded at **90 seconds** total. If not ready, show a retry button; do not hammer the server.
- On `state === "SUCCESS"`, stop polling and render the `result` payload.
- On `state === "FAILURE"`, show failure UI with a manual retry button that re-POSTs to the originating endpoint.

### 5.8 File uploads

- Use `multipart/form-data` via `FormData` with axios — do not JSON-encode binary.
- OCR endpoint `POST /ocr` is not wired today (see `frontend_prd.md §13 G2`); use the text-only card-scan path until the backend ships it.
- Audio capture: record with `MediaRecorder` → `Blob` → `FormData` → POST (Phase 4).

### 5.9 Query keys (stable)

- Every query key lives in `src/api/query-keys.ts` as a factory.
- **Never** inline a query key in a component: `useQuery({ queryKey: ['foo', id], ... })` — put it in `qk.foo.byId(id)`.
- This rule matters for `invalidateQueries` — inconsistent keys = stale caches.

### 5.10 Forbidden patterns

- ❌ Calling the backend from a useEffect with a raw fetch.
- ❌ Storing the raw response envelope in a component — unwrap to `data.data` at the boundary.
- ❌ Using a response shape that's not in `frontend_prd.md §7`.
- ❌ Sending a PATCH with undefined fields — React Hook Form produces `undefined` for unfilled optional fields; strip them before submit (`Object.fromEntries(Object.entries(x).filter(([,v]) => v !== undefined))`) unless you want the backend to clear the field (which this backend never supports).

---

## 6. STATE MANAGEMENT RULES

### 6.1 Server state → TanStack Query, always

- Anything that comes from the backend: `useQuery` or `useInfiniteQuery`.
- Mutations: `useMutation`.
- **Never** put server data in Zustand. Not even "just to cache it for one navigation". Use `queryClient.setQueryData` if you need to pre-populate.

### 6.2 Client state → Zustand, narrowly

- `src/auth/auth-store.ts` is the only mandatory store. It holds:
  - `token: string | null`
  - `user: UserProfile | null`
  - `role: UserRole | null`
  - `expiresAt: number | null` (epoch ms)
- Persisted to `localStorage` under key `oc.auth` via `zustand/middleware/persist`.
- Additional stores only when: (a) the state is pure UI, (b) needed across >2 unrelated components, (c) cannot live in URL / React Query.

Examples of **valid** Zustand use:

- Sidebar collapsed / expanded
- Global command-palette open/close
- Theme preference (light/dark)

Examples of **invalid** Zustand use:

- Search results (TanStack Query)
- Connection list (TanStack Query)
- Current wizard step (component-local `useState` or URL param)

### 6.3 Form state → React Hook Form + Zod

- Every form uses `useForm` with a `zodResolver(schema)`.
- `schema` is defined in the feature's `schemas.ts`, same schema used to validate API responses so input and output are symmetric when appropriate.
- Error messages come from Zod — don't duplicate in JSX. Render `errors.<field>?.message`.

### 6.4 URL state → React Router search params

- Filters on `/search` (sector, stage, geography): URL search params, not local state. This makes share-links work.
- Cursor on infinite-scroll pages: NOT in URL (cursor is opaque; a URL cursor doesn't survive refresh semantically).
- Active tab on admin screens: URL search param `?tab=pending`.

### 6.5 Default TanStack Query config

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min
      gcTime: 5 * 60_000, // 5 min
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

Override per-query when necessary (e.g. `staleTime: 0` on `/search`).

---

## 7. UI RULES

### 7.1 The four states — mandatory, always

Every screen that fetches data implements **all four**:

1. **Loading** — skeleton layout, not a spinner-only.
2. **Empty** — icon + message + action.
3. **Error** — `<ErrorState error={...} onRetry={...} />`.
4. **Success** — the actual data.

A component that only renders the success case will fail PR review.

### 7.2 Loading

- Initial-page load: full skeleton.
- Button / inline: spinner inside the button with `disabled`.
- Infinite scroll "load more": small footer spinner.
- Never block the UI with a full-screen spinner for > 500ms without context.

### 7.3 Error states

- Every `ErrorState` component reads `ApiError.code` and renders a user-friendly message.
- Use the error map:

```ts
// src/api/error-messages.ts
export const USER_MESSAGES: Record<string, string> = {
  validation_error: 'Please check the highlighted fields.',
  not_registered: 'This number is not registered. Please contact Warmup Ventures.',
  otp_invalid: 'The code is incorrect. Please try again.',
  otp_expired: 'The OTP expired. Request a new one.',
  link_expired: 'This link has expired. Please sign in again.',
  token_expired: 'Your session has expired. Please sign in again.',
  insufficient_role: 'You do not have access to this page.',
  forbidden: 'You do not have access to this resource.',
  conflict: 'This action conflicts with the current state.',
  rate_limit_exceeded: 'Too many requests. Please try again shortly.',
  not_found: 'We could not find what you were looking for.',
  mis_already_submitted: 'MIS for this period was already submitted.',
  duplicate_contact: 'This contact already exists in the community.',
  internal_error: 'Something went wrong on our side. Please try again.',
  network_error: 'Network error. Please check your connection.',
};
```

- If `code` is not in the map, fall back to `error.message` (from server) and log a warning.

### 7.4 No hardcoded data

- **Zero mocked data in production code.** No inline demo arrays for lists, no `const sampleUser = {...}`.
- Mock data lives only in `src/test/msw-handlers.ts` and Storybook stories.
- Counterexample: constant UI copy (button labels, headings) is fine — that's not data.

### 7.5 Toasts (sonner)

- Success toast: 3 seconds, auto-dismiss.
- Error toast: 5 seconds, with close button.
- Never toast on a GET response — toasts are for user actions, not page loads.
- One toast per action. If a mutation invalidates 3 queries and they all refetch and fail, you do NOT toast 3 times — only on the mutation itself.

### 7.6 Modals & dialogs

- Use shadcn `Dialog` for confirmations and forms.
- Use shadcn `Sheet` (drawer) for side panels (e.g. DLQ detail).
- **Always** provide a cancel/close action accessible via keyboard (Esc).
- **Destructive actions** use the `destructive` button variant (red) and require a confirmation step.

### 7.7 Accessibility floor

- Every `<button>` has an accessible name (visible text or `aria-label`).
- Every `<input>` has a `<label>` (use shadcn `Label`).
- Colour is never the only signal — pair with icon or text.
- Keyboard: Tab order follows visual order; Esc closes overlays; Enter submits forms.
- Announce async state via `aria-live="polite"` regions (shadcn `Toast` handles this).

### 7.8 Empty-state component

```tsx
<EmptyState
  icon={Inbox}
  title="No pending requests"
  description="You're all caught up. New requests will appear here."
  action={<Button>Refresh</Button>}
/>
```

### 7.9 Data tables

- Use `components/data-table/DataTable.tsx` (TanStack Table v8).
- Every column has a `header`, `accessorKey`, and optional `cell` renderer.
- Sort, filter, pagination live in the wrapper — never in the consuming page.

### 7.10 Forms

- React Hook Form + shadcn `<Form>` primitives.
- Submit button disabled while `isSubmitting || !isDirty || !isValid`.
- On success: reset form OR navigate — never both silently.
- On error: scroll to first errored field + toast.

### 7.11 Mobile-first

- Min supported viewport: 375px wide.
- Tap targets: 44×44 px minimum (use `min-h-11 min-w-11` or equivalent).
- Modals full-screen on mobile: `<Dialog><DialogContent className="max-w-[95vw] md:max-w-lg">...</DialogContent></Dialog>`.
- Forms: use native input types (`type="tel"`, `type="email"`).
- **Responsive navigation — non-negotiable** (mirrors PRD §10.1):
  - **Desktop (≥ 1024px / `lg`):** persistent left sidebar (`<Sidebar>` + `<NavList>`).
  - **Tablet + mobile (< 1024px):** sidebar is hidden; navigation reaches the user via `<MobileNavDrawer>` — a hamburger button rendered in the `TopBar` that opens a Radix `Sheet` (left-anchored) showing the SAME `<NavList>`. Clicking a nav link inside the drawer auto-closes it.
  - **Single source of truth for nav items:** `NAV_ITEMS` in `src/lib/role-capabilities.ts`. Both the desktop sidebar and the mobile drawer render `<NavList>`, which calls `navForRole()` against that map. Never duplicate the nav list.
  - **Forbidden:** any layout that uses `hidden ... lg:block` (or equivalent) on the sidebar without exposing an alternate access path on smaller viewports. Reaching a route via direct URL only is not acceptable.
  - **PR review:** new screens that mount under `<AppShell>` MUST be tested at 375 / 768 / 1024 / 1440 widths. The hamburger must be visible and tappable below 1024px; the drawer must trap focus, close on Esc, and close on link click.
  - **Reusable primitives:** `<Sheet>` (in `src/components/ui/sheet.tsx`) is the sanctioned drawer for any side-anchored overlay. Do not invent a parallel drawer. Use shadcn `<Dialog>` for centred modals.

### 7.12 Performance

- Code-split at the route level: `const AdminAnalyticsPage = lazy(() => import('./AdminAnalyticsPage'))`.
- Admin routes MUST be lazy-loaded — external users should not download admin code.
- Memoise only proven hot paths (`React.memo`, `useMemo`, `useCallback`). Profiling first.
- Never render > 100 rows at once — virtualise with `@tanstack/react-virtual` if needed.

---

## 7.13 Design System

All UI must use shared tokens and components from `src/design-system/`.
Never hardcode colour hex values, font names, border radii, or shadows inline.

### Imports

```ts
import { colours, fonts, radius, shadow, spacing } from '@/design-system/tokens';
import {
  Tag,
  SurfaceCard,
  EyebrowLabel,
  SectionHeading,
  Divider,
  TextButton,
} from '@/design-system/components';
```

### Rules — enforced, not optional

1. **Fonts:** Use `fonts.serif` (Instrument Serif) for display/editorial headings. Use `fonts.sans` (DM Sans) for all body text, labels, and UI.

2. **Colours:** Use only tokens from `colours.*`. Semantic meanings:
   - `colours.brand / brandBg / brandText` — primary action, links, selected state
   - `colours.positive / positiveBg` — confirmed rounds, bullish signals, success
   - `colours.caution / cautionBg` — watchlist, risk flags, warnings
   - `colours.info / infoBg` — neutral labels, metadata, secondary badges
   - `colours.dark` — dark hero sections only
   - `colours.pageBg` — page background
   - `colours.surface` — card/panel background

3. **Cards:** All content cards must use `<SurfaceCard>`. Do not create one-off card divs with inline border + boxShadow.

4. **Headings:** Section headings use `<SectionHeading>`. Eyebrow labels use `<EyebrowLabel>`. Never set `fontFamily: fonts.serif` inline unless inside a one-off editorial component that genuinely cannot use the shared heading.

5. **Tags/Badges:** Always use `<Tag color={} bg={}>` from the design system. Use the semantic presets (`SemanticTag.Positive`, etc.) wherever the meaning maps cleanly.

6. **Hover states:** Use `SurfaceCard`'s built-in hover for cards. For text links use `TextButton`. Do not implement custom hover logic via `onMouseOver` / `onMouseOut` unless absolutely unavoidable.

7. **Spacing:** Horizontal page padding is `spacing.pagePadH` (40px desktop) / `spacing.pagePadHMd` (20px mobile). Section vertical gap is `spacing.sectionGap` (48px). Do not use arbitrary values.

8. **Mobile-first:** All new components must be functional and well-laid-out at 375px viewport width. Use `useIsMobile()` from `@/lib/hooks/use-is-mobile` for responsive logic. Test in DevTools before marking a task done.

9. **No Tailwind pastels:** The following Tailwind default hex values are banned — they make the product look AI-generated:
   `#ede9fe`, `#dcfce7`, `#fef3c7`, `#dbeafe`, `#6d28d9`, `#15803d`, `#b45309`, `#1d4ed8`
   If you find them, replace with the equivalent `colours.*` token.

---

## 8. DO / DON'T

### 8.1 Do

- ✅ Use TypeScript strict mode. Fix the type error, do not silence it.
- ✅ Put every API call through `api/endpoints.ts` with a Zod response validator.
- ✅ Use `can()` for all capability checks.
- ✅ Use `ApiError.code` in error UI — never inspect `status`.
- ✅ Code-split route components with `React.lazy`.
- ✅ Write a unit test for every hook and a smoke integration test for every page.
- ✅ Match folder structure from `frontend_prd.md §6.2` exactly.
- ✅ Read `frontend_prd.md` before asking a question — it likely answers it.
- ✅ Mask the OTP input in dev (`type="text"` with `inputMode="numeric"`).
- ✅ Disable form submit while a mutation is in flight.

### 8.2 Don't

- ❌ Don't use `any`. Use `unknown` or write the type.
- ❌ Don't use class components.
- ❌ Don't use Redux / MobX / styled-components.
- ❌ Don't inline fetch calls or axios instances.
- ❌ Don't guess an API contract — consult `§7` first, ask second.
- ❌ Don't hardcode colours or spacings.
- ❌ Don't write multi-line docstrings on components (one short comment max, only when needed).
- ❌ Don't fetch in `useEffect` — use TanStack Query.
- ❌ Don't put JWT in cookies or URL query strings. Bearer header only.
- ❌ Don't render `null` / `undefined` / `"null"` — use fallback strings.
- ❌ Don't trust role from `localStorage` without expiry check — always compare to `expiresAt`.
- ❌ Don't import React internals from another feature (`import { SearchBar } from '@/features/search/components/SearchBar'` from outside `features/search`). Promote to `src/components/` first.
- ❌ Don't write documentation files unless explicitly asked. Update `frontend_prd.md` for contract changes.
- ❌ Don't leave console.logs in merged code. `console.warn` / `console.error` for real errors only.

### 8.3 Security don'ts

- ❌ Never log the JWT value, OTP, phone in full, or any secrets.
- ❌ Never `dangerouslySetInnerHTML` user-provided content. If absolutely needed, sanitise with DOMPurify.
- ❌ Never build a URL from user input without encoding (`encodeURIComponent`).
- ❌ Never expose a backend base URL that differs from `VITE_API_BASE_URL`.
- ❌ Never set `target="_blank"` without `rel="noopener noreferrer"`.
- ❌ Never trust the frontend role for gating sensitive data — backend is the enforcer, frontend just hides UI.

---

## 9. DEVELOPMENT WORKFLOW

### 9.1 Local setup

```bash
pnpm install
cp .env.example .env.development
# edit VITE_API_BASE_URL=http://localhost:8000/api/v1
pnpm dev
```

Visit `http://localhost:5173`. Backend must be running (`make dev` in the backend repo).

### 9.2 Adding a new feature

1. Confirm the feature's endpoints are listed in `frontend_prd.md §7`. If not, STOP — talk to a backend engineer first.
2. Create `src/features/<feature>/` with `components/`, `hooks/`, `routes/`, `schemas.ts`, `index.ts`.
3. Add Zod schemas in `schemas.ts`.
4. Add typed endpoint functions in `src/api/endpoints.ts` with Zod response parsing.
5. Add stable query keys in `src/api/query-keys.ts`.
6. Write hooks in `hooks/` (useQuery / useMutation wrappers).
7. Write page components in `routes/`.
8. Wire the route in `src/app/router.tsx` under the correct guard.
9. Add a `NAV_ITEMS` entry in `src/lib/role-capabilities.ts` (unless the route is unlisted like `/profile/:id`).
10. Add MSW handlers in `src/test/msw-handlers.ts` and a unit test for each hook + a smoke test for the page.
11. Run `pnpm lint && pnpm typecheck && pnpm test`. Zero failures.
12. Update `frontend_prd.md §4` screen table if the route is new.
13. Open a PR. Describe what endpoints it consumes, what role can reach it, and screenshots for desktop + mobile.

### 9.3 Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "e2e": "playwright test"
  }
}
```

### 9.4 Pre-commit (husky + lint-staged)

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

Pre-commit hooks MUST NOT be bypassed (`--no-verify`). If a hook fails, fix the root cause.

### 9.5 CI (GitHub Actions)

Required jobs per PR:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`

All must pass. No exceptions.

### 9.6 Git branch & commit rules

Core git discipline lives in §0.1.10. Additional branch rules:

- `main` is always deployable.
- Feature branches: `feat/<feature>-<short-desc>` (e.g. `feat/search-filters`).
- Bug branches: `fix/<short-desc>`.
- Rebase on main before opening PR (`git pull --rebase origin main`). Never plain `git pull`.
- Commit message prefixes: `feat:` · `fix:` · `chore:` · `refactor:` · `test:` · `docs:`. Keep title under 70 chars; details in body.
- Stage the full `.claude/*` alongside the code change in the same commit — coordination state and code state MUST move together.

### 9.7 Backend API changes

- If the backend adds a new endpoint:
  1. Update `frontend_prd.md §7` with the full contract.
  2. Add to `src/api/endpoints.ts` and `src/api/query-keys.ts`.
  3. Build the feature.
- If the backend changes a contract:
  1. Update `frontend_prd.md §7` first.
  2. Update Zod schema.
  3. Run the app locally against the new backend; fix type errors until clean.
  4. Deploy frontend AFTER backend is in production.

### 9.8 Environment-specific rules

| Env         | `VITE_APP_ENV` | `VITE_OTP_BYPASS_HINT` | Source maps | Sentry |
| ----------- | -------------- | ---------------------- | ----------- | ------ |
| development | `development`  | `true`                 | inline      | off    |
| production  | `production`   | `false`                | hidden      | on     |

Never deploy `development` env config to a public host. Never expose the dev OTP hint in production.

---

## 10. DEFINITION OF DONE

A feature is DONE when **every** box is ticked. No exceptions.

- [ ] All endpoints the feature uses are in `frontend_prd.md §7` with matching Zod schemas.
- [ ] Typed endpoint functions in `src/api/endpoints.ts`.
- [ ] Stable query keys in `src/api/query-keys.ts`.
- [ ] Feature folder structure matches `frontend_prd.md §6.2`.
- [ ] Every screen implements loading + empty + error + success (4 states).
- [ ] Role access gated via `<RoleGuard>` or `can()` — matches `frontend_prd.md §4` (Feature-Screen Mapping).
- [ ] Navigation updated in `src/lib/role-capabilities.ts` if a new route was added.
- [ ] Forms validate with Zod + React Hook Form; submit disabled while in-flight.
- [ ] Mutations invalidate the correct query keys.
- [ ] No `any`, no `@ts-ignore`, no inline `fetch`, no hardcoded data.
- [ ] No hardcoded role strings — use `can()` + `CAPABILITIES`.
- [ ] No inline Axios instances; every call through `apiClient`.
- [ ] All four viewports tested: 375px, 768px, 1024px, 1440px.
- [ ] Keyboard navigation works (Tab / Esc / Enter).
- [ ] Every new hook has a unit test (MSW-mocked).
- [ ] Every new page has a smoke integration test.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.
- [ ] Bundle size delta < 30 KB gzip for non-admin features; < 80 KB for admin features.
- [ ] Screenshots of desktop + mobile attached to PR.
- [ ] No console.log in diff.
- [ ] No new dependency added without an ADR (see §11).

---

## 11. NEVER DO WITHOUT APPROVAL

- Add a new package to `package.json`.
- Bump a major version of React, TypeScript, React Router, TanStack Query, or Axios.
- Change the folder structure defined in `frontend_prd.md §6.2`.
- Add a new root-level route (pattern `/foo/...`) not listed in `frontend_prd.md §4`.
- Change `CAPABILITIES` in `role-capabilities.ts` (it mirrors backend roles).
- Modify `src/api/client.ts` interceptors.
- Touch `src/auth/auth-store.ts` persistence schema (invalidates existing sessions).
- Change Zod schemas to be laxer than backend responses (hides real bugs).
- Disable ESLint rules globally (per-line suppression with a reason is fine).
- Ship a feature without loading + empty + error + success states.
- Ship an admin feature without `<RoleGuard>` guard.

When in doubt, open a PR in **draft** and tag a reviewer with the question. Never silently override a rule.

---

## 12. COMMON PITFALLS AND ANTIDOTES

| Pitfall                                           | Why it happens                  | Antidote                                                                                        |
| ------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- | --- | ---------------------------------------------- |
| Pages that only render success                    | Forgot loading/empty/error      | `<QueryStateBoundary>` higher-order wrapper that forces all four                                |
| `any` creeps in                                   | Axios response type inference   | Always `apiClient.get<ApiEnvelope<T>>(...)` with explicit `T`                                   |
| Sidebar shows a disabled admin link for LPs       | Nav filter missed a role        | `NAV_ITEMS.filter(i => i.roles.includes('\*')                                                   |     | i.roles.includes(role))` — test with each role |
| Session persists after backend rotates JWT_SECRET | localStorage cache              | `persist` store adds a `version` key; bump it when the auth-store schema changes to force clear |
| Search results stale after filter change          | Query key missing filter        | Put every input (query, filters, limit, cursor) in the key tuple                                |
| 429 storm after rate limit                        | Auto-retry on mutation          | `retry: false` on mutations globally                                                            |
| Role string typos (`'lp '`, `'Admin'`)            | Not using the union type        | Always import `UserRole` and rely on compiler                                                   |
| Infinite-scroll re-fetches first page on return   | `useInfiniteQuery` losing pages | `keepPreviousData` + `gcTime > 0`                                                               |
| Memoisation "optimisations" make code worse       | Premature optimisation          | Profile first; `React.memo` only for leaf list items                                            |

---

## 13. QUICK REFERENCE CARDS

### 13.1 Role ENUM (exact values — do not invent)

```
lp, potential_lp, vc,
startup_inprogress, startup_onboarded, startup_funded,
partner, advisor,
admin, super_admin
```

### 13.2 Connection status ENUM

```
pending_admin, approved, rejected_admin,
pending_target, accepted, declined
```

### 13.3 Interaction type ENUM

```
search_view, search_click, profile_view,
connection_request, connection_accepted, meeting_booked,
feedback_positive, feedback_negative, feedback_skip,
match_accepted, match_rejected
```

### 13.4 Startup stage ENUM

```
ideation, pre_seed, seed, early_growth,
pre_a, series_a, pre_b, series_b, late_growth
```

### 13.5 LP funnel status

```
1_new_lead, 2_first_reach_out, 3_in_conversation,
4_soft_commit, 5_invested
```

### 13.6 Rate limits cheatsheet (frontend should honour + show countdown on 429)

```
OTP send:             5/10min per IP + 3/10min per phone
OTP verify:           5/10min per IP + 5/10min per phone (failure only)
/auth/me:             30/min
/search:              20/min
/connections/request: 10/min
/admin/*:             20–30/min
/pitch/deck:          5/min
/matchmaking/generate: 5/min
/tracxn:              10/min
```

### 13.7 Standard envelope

```json
{ "data": {...} | null, "error": null | { "code": "...", "message": "..." } }
```

### 13.8 Paginated envelope (canonical)

```json
{ "data": { "items": [...], "next_cursor": "..."|null }, "error": null }
```

---

## 14. CHECKLIST BEFORE YOU START CODING

Paste this into your PR description. Check every box.

```
[ ] Read /docs/frontend_prd.md §§ 1–7 end to end
[ ] Confirmed every endpoint I'll call is in §7
[ ] Confirmed the role mapping in §4 matches what I intend
[ ] Added Zod schemas for every request + response
[ ] Added typed endpoint functions in src/api/endpoints.ts
[ ] Added query keys in src/api/query-keys.ts
[ ] Built loading + empty + error + success states
[ ] Gated admin routes with <RoleGuard>
[ ] Used `can()` for inline capability checks
[ ] No hardcoded roles, no inline axios, no `any`
[ ] Mobile layout works at 375px
[ ] Keyboard navigation works
[ ] MSW handlers + unit tests for hooks
[ ] pnpm lint / typecheck / test / build all pass
```

---

## 15. DECIDED ARCHITECTURE (do not re-question these)

These decisions are final. Do not propose alternatives in-session — open an ADR if you genuinely need to revisit.

### Workflow

- **Single Opus 4.7 instance** is the operating model. Coordination state lives in `.claude/` (see §0.1). There is no 3-instance / Plan-Reviewer / QA-Reviewer split.
- **Four `.claude/` files** are canonical: `decisions.md` (decisions log + human-input queue), `queue.md` (feature queue), `session.md` (where I stopped), `issues.md` (QA findings). All committed to git.
- **Human input** is requested via the 🟡 HUMAN INPUT NEEDED banner + `decisions.md § Pending`. Never guessed.

### Stack

- **React 18 + Vite SPA + TypeScript strict** — NO Next.js, NO CRA, NO SSR.
- **TanStack Query v5** owns ALL server state. **Zustand v4** owns auth session + narrow UI flags only.
- **axios v1** is the only HTTP client. `fetch()` is never used for backend calls.
- **React Hook Form v7 + Zod v3** on every form. No Formik. No Yup.
- **Tailwind CSS + shadcn/ui** for all styling. No CSS-in-JS. No Material UI, Chakra, Ant Design.
- **pnpm** only. `package-lock.json` and `yarn.lock` are forbidden.

### Auth & data model

- **JWT** lives in **Zustand + `localStorage['oc.auth']`**, NEVER in cookies.
- **OTP session = 4 hours, no refresh.** Logout is pure client-side (§13 G15).
- **Session-termination policy — JWT is the single source of truth** (decisions.md [P-17], overrides PRD §6.5 / §7.1.3). The ONLY three clearers of `authStore` are: (1) the explicit "Sign out" button in `<TopBar>`; (2) `<RequireAuth>` observing `expiresAt <= Date.now()`; (3) a fresh-signin catch block when `/auth/me` fails during initial hydration on `/signin`. A 401 / `token_expired` / `link_expired` from ANY other request MUST NOT clear the store — the interceptor just rethrows the `ApiError`. A browser refresh must never log a user out while their JWT is still valid.
- **Post-signin landing → /dashboard for every role** (decisions.md [P-18], overrides PRD §10.2). After a successful OTP verify (with `profile_complete=true`) and on every visit to `/` while signed in, every role routes to `/dashboard`. Role-specific workflow homes (`/search`, `/pitch`, `/admin`, `/connections/pending`) are reachable from the sidebar at any time but are NEVER used as the signin landing. The role-based map remains in `post-signin-navigate.ts` as `POST_ONBOARDING_BY_ROLE` solely for `nextRouteAfterProfile()` (post-onboarding continuation) and `defaultHomeFor()` (LP-profile Skip).
- **Envelope** `{ data, error, pagination? }` is uniform for every endpoint. Cursor pagination everywhere except DLQ (legacy offset).
- **10 role ENUM values** are exact: `lp`, `potential_lp`, `vc`, `startup_inprogress`, `startup_onboarded`, `startup_funded`, `partner`, `advisor`, `admin`, `super_admin`. Do not invent new roles.
- **Partner role can search with backend-side field masking + Crunchbase-style locked UI** (decisions.md [P-20] + [P-21]). Partners ARE in `CAPABILITIES.search.use`, `NAV_ITEMS.search.roles`, AND `CAPABILITIES.connections.request` (the only escalation path). Backend `_STARTUP_VISIBLE_FIELDS["partner"]` = `{ user_id, name, company_name, sector, stage, one_liner }`; `_LP_VISIBLE_FIELDS["partner"]` = `{ user_id, name, fund_name, sectors }`. Withheld fields are MISSING from the response (not null). The MSW `auto` scenario applies the same allowlist when the signed-in user is partner so dev/test behaviour matches prod. **UI rule (P-21):** `<ResultCard isMasked>` renders the FULL card structure with `<LockedField>` placeholders for every withheld field plus a `<MaskedCardFooter>` panel with **Request to connect** (in-platform escalation) and **Upgrade for full access** (monetisation placeholder). Hidden-on-missing is reserved for non-masked viewers — never use it for partners. **Future endpoints that return startup or LP profile data for partners must pass the off-platform-outreach test: do any returned fields enable email / LinkedIn / phone / website lookup outside the platform? If yes, withhold them on the backend, render with `<LockedField>` on the frontend.**

### Patterns

- **`<ExecutionPanel>`** (PRD §6.7) is mandatory for all action screens. No inline `useMutation` inside route components.
- **Every gap endpoint** (PRD §13.2) has (1) feature flag, (2) MSW handler, (3) interim service in `src/api/interim/`, (4) flip plan. No "we'll build it when backend ships" stubs.
- **Role-based navigation** comes from a single `NAV_ITEMS` map in `src/lib/role-capabilities.ts`. No hardcoded sidebar entries.
- **`can(role, capability)`** is the only sanctioned way to gate UI. Never compare role strings inline.
- **Phase 4 deep-link tokens** are backend-minted JWTs treated identically to OTP session tokens client-side (drop in `authStore.token`).
- **No logout endpoint until backend ships one** (§13 G15). Client-side `queryClient.clear()` + `authStore.clear()` + navigate `/signin`.

---

## 16. KNOWN ISSUES (non-blocking, fix when touched)

Live list of gotchas. When a Builder/QA encounters one, they add a row here (with a date) instead of asking the human.

- **`/profile/:id` behind `VITE_PROFILE_V1_ENABLED` flag** — backend endpoint not yet mounted (§13 G1). Interim service at `src/api/interim/profile-service.ts` stitches from `/search` + `/connections`.
- **OCR runs client-side** via `tesseract.js` pending `POST /ocr` (§13 G2). Latency 2–6s; show progress indicator.
- **Whisper transcription not available client-side.** Pitch flow is text-only until backend ships `POST /pitch/transcribe` (§13 G2).
- **`/documents` shows a Phase-4 placeholder** until `POST /documents/upload` ships (§13 G3).
- **Analytics responses use Zod `.passthrough()`** — tighten to `.strict()` when backend publishes the formal schemas (§13 G8).
- **DLQ list uses offset pagination** — every other list is cursor-based. Use `<OffsetPaginator>` there (§13 G10).
- **`super_admin` === `admin` in UI** — no behavioural distinction; role badge differs only (§13 G14).
- **No `/users/me/full` endpoint.** Use `useMyFullProfile()` which stitches (§13 G16).
- **No server-side logout.** `src/api/interim/logout.ts` handles client-only logout (§13 G15).

_Builder rule:_ when you find a new non-blocking gotcha, add a dated row here in the same PR. Keep the list truthful.

---

## 17. QUICK LOOKUP — which PRD section for what

| Looking for…                                       | Read this in `frontend_prd.md`          |
| -------------------------------------------------- | --------------------------------------- |
| A specific endpoint (method + path + JSON)         | §7.1–§7.16                              |
| Shared error codes (401 / 403 / 429 / 500)         | §7.0.4                                  |
| Rules for envelope / pagination / timestamps       | §7.0.2 / §7.0.3 / §7.0.6                |
| TypeScript types for domain objects                | §8                                      |
| Transforming a field between UI and API            | §8.12                                   |
| Cache invalidation after a mutation                | §8.12.4                                 |
| Which roles can hit which endpoint                 | §4 (screen mapping) + §7.x per endpoint |
| Sidebar / nav / route tree                         | §10.3–§10.4                             |
| Execution Panel usage                              | §6.7                                    |
| Debug dock contents                                | §6.8                                    |
| A gap endpoint's resolution (flag + interim + MSW) | §13.2 (by G-number)                     |
| Backend gap acceptance criteria for PRs            | §13.4                                   |

---

## 18. Responsive UI — Testing Checklist (mandatory before shipping)

Every UI change must be verified at all three breakpoints before committing.
Unresponsive UI will be rejected in review.

### Breakpoints

| Name    | Width  | Represents                    |
| ------- | ------ | ----------------------------- |
| Mobile  | 375px  | iPhone SE / most Android      |
| Tablet  | 768px  | iPad / large phones landscape |
| Desktop | 1280px | Laptop / monitor              |

### How to test

In Chrome/Safari DevTools:

1. Open DevTools → toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)
2. Set width to 375px → scroll through the entire page → confirm no horizontal overflow, no clipped content, no unreadable text
3. Set width to 768px → repeat
4. Set width to 1280px → repeat

### Checklist — verify all of these at each breakpoint

- [ ] No horizontal scrollbar on the page (check `document.body.scrollWidth === window.innerWidth`)
- [ ] No text is cut off or merges with adjacent text
- [ ] All tables either reflow to card layout or have proper column widths
- [ ] All charts render within their container, no clipping
- [ ] All badges/pills are compact pill shape, not ovals or circles
- [ ] Navigation drawer opens and closes correctly
- [ ] Profile access is reachable (either header button or drawer entry)
- [ ] Cards have appropriate tap target size (minimum 44×44px touch area)
- [ ] No fixed pixel widths that prevent layout from shrinking below 375px
- [ ] Font sizes are readable without zooming (minimum 12px for any visible text)

### Responsive hook

Use `useIsMobile()` from `@/lib/hooks/use-is-mobile` for conditional responsive logic in inline-style components. The default breakpoint is 768px. Add `// RESPONSIVE:` comment above any style that changes between mobile and desktop, so future developers can find responsive logic easily.

### PWA feel on mobile

The dashboard should feel like a native mobile app, not a website.

- No visible horizontal scroll at page level (section-level intentional scroll is OK if snap-scrolling)
- Touch targets are large enough to tap accurately
- Transitions and hover states are disabled or replaced with active/press states on touch
- No zoom-on-input (ensure `font-size: 16px` on all `<input>` elements to prevent iOS zoom)
- The header/nav stays fixed at the top on scroll (`position: sticky`, `top: 0`)

### Rule

If a component passes at 1280px but breaks at 375px, it is broken.
Mobile is the primary viewport — desktop is the enhancement.

---

_End of frontend_claude.md. Version 1.2 — 2026-05-27. Paired with frontend_prd.md v1.1._
