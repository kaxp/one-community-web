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

_(Empty. Populated as Stage 0 interview answers + mid-build decisions are settled.)_

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
