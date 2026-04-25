# `profile-viewers` — PII discipline (PRD §13 G11)

This feature surfaces "who viewed my profile" via `GET /interactions/profile-viewers`. The backend response intentionally excludes `email` and `phone` for the viewer (see `frontend_prd.md §7.7.3` and `§13 G11`), but we treat that contract as soft and enforce two extra layers on the frontend so it cannot regress silently.

**Layer 1 — Zod parse-time firewall.** `schemas.ts` defines `zViewerProfile` with exactly six allowed fields (`user_id`, `name`, `role`, `organisation`, `avatar_url`) plus the surrounding `viewed_at`. The schema is NOT `.passthrough()`, so any extra keys the backend might add (including `email` / `phone`) are stripped before the typed object reaches React. Do not add those fields to the schema, do not switch to `.passthrough()`, and do not rebuild the API response object somewhere downstream.

**Layer 2 — Source-grep regression test.** `pii-discipline.test.ts` reads every file under `src/features/profile-viewers/` (excluding the test file itself) and asserts no source line contains `viewer.email` or `viewer.phone` reads. The test runs as part of `pnpm test`, so a sloppy edit in this directory breaks the build before merge. If the read truly belongs in this feature (it doesn't, per G11), the test is the lock — open a fresh `decisions.md` P-N item to revisit, never bypass.

**Render contract for `<ViewerCard>`.** Destructure ONLY `{ user_id, name, role, organisation, avatar_url }` from `item.viewer` plus `viewed_at`. Click navigates to `/profile/{user_id}`; relative time uses `formatDistanceToNow`, full ISO sits in `title=`. Never count "views per viewer" on the client — backend dedupe (UNIQUE on `(actor_id, target_id, interaction)` per PRD §7.7.3) already produces one row per viewer.
