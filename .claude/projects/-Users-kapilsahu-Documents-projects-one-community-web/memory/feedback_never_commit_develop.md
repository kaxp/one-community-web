---
name: Never commit directly to develop
description: Always create a feature branch before committing; committing to develop causes merge conflicts and PR history problems
type: feedback
---

Never commit directly to the `develop` (or `master`/`main`) branch.

**Why:** In the S2 session, a commit landed on `develop` instead of a feature branch because I didn't check the current branch after a PR was merged (which switches back to develop). The push was rejected by branch protection, but the local commit diverged from remote, causing merge conflicts when the user pulled.

**How to apply:** Before any `git add / git commit`, always run `git branch` and confirm the current branch is NOT `develop`, `master`, or `main`. If it is, create a feature branch first (`git checkout -b feat/<name>`). This check is mandatory — no exceptions, even mid-session after a context switch.
