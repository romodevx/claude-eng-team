## Git Workflow (every project) — detail: `~/.claude/standards/delivery.md`, reviews: `standards/review.md`

### Rule 0 (NON-NEGOTIABLE): every task starts on a branch
- Never work or commit on `dev`, `main` or `master` — not one file, docs or plans. The
  `guard-actions` hook blocks it. Branch before the first edit; caught on a protected branch
  mid-task: `git branch <new>` → `git reset --hard <base>` there → `git checkout <new>`.

### Branches
- Protected: `dev` (integration) and `main`/`master` (production).
- Umbrella: one `epic/<id>-<slug>` or `story/<id>-<slug>` per request with more than one task,
  cut from `dev` (else `main`/`master`). Nothing from its tasks goes straight to `dev`.
- Subtask: `feature|fix|refactor|test|docs|chore/<id>-<slug>` from the umbrella.
- Hotfix: `hotfix/<id>-<slug>` from `main`/`master`; PR to production, then back-merge to `dev`.

### PR flow and review tiers
1. Subtask → PR into the umbrella: tests and local CI green + **one light review**
   (<!-- codex -->`codex-task review` with a risk brief; without Codex, <!-- /codex -->the `subtask-reviewer` agent). Squash merge, no owner
   confirmation. Subtasks touching auth/authz, money, RLS, migrations or crypto also get
   @code-reviewer.
2. Umbrella → `dev`: the full gates, once — @qa-sr + @code-reviewer (+ @tech-lead/@security
   for money, authz or personal data). **Owner confirms** unless authorized in the plan or the
   project's autonomy is `auto`.
3. Release `dev` → `main`/`master`: merge commit + SemVer tag + CHANGELOG. **Owner confirms**
   (same exceptions).
- Re-reviews read only the diff since the last verdict. `review_tier: strict` in a project's
  CLAUDE.md restores @qa-sr + @code-reviewer on every subtask PR.
- Local CI (`pnpm ci:local` or `act`, `standards/ci-local.md`) before opening or marking a PR
  ready: red locally = no PR. Watch remote CI with one background watch, never by polling.
- No force push to protected branches; `--force-with-lease` only on your own. Conventional,
  atomic, signed commits; SemVer. CODEOWNERS + branch protection on protected branches.

- Closing: back to `dev` and pull; `git-prune-merged` dry run → owner confirms → `--apply`.
