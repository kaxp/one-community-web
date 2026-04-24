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

_(No pending items yet. Claude appends here when human input is needed.)_

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

- **Decision:** Top bar wordmark reads `Warmup Ventures · One Community`. Email sender name: `Warmup Ventures`. Page `<title>` pattern: `<Feature> · One Community`.
- **Rationale:** Keeps parent-brand recognition while labelling the product.
- **Touches:** `src/components/layout/TopBar.tsx`, `index.html`, every route's page title.

_(Further P-N items populated as Stage 0 interview answers + mid-build decisions are settled. Keep adding below in sequential order.)_

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
