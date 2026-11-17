## Git Workflow (every project) — CI/release detail in `~/.claude/standards/delivery.md`

### Rule 0 (NON-NEGOTIABLE): every task starts on a branch
- **Never work or commit directly on `dev`, `main` or `master`** — not one file, not docs,
  not plans. The `guard-actions` hook blocks it.
- Branch before the first edit. If you discover mid-task that you are on a protected branch:
  `git branch <new>` → `git reset --hard <base>` on the protected one → `git checkout <new>`.

### Branches
- Protected: `dev` (integration) and `main` or `master` (production; whichever the repo has).
- Story/epic: temporary branch `story/<id>-<slug>` or `epic/<id>-<slug>`, cut from `dev`
  (from `main`/`master` if there is no `dev`). It collects the PRs of its subtasks.
- Subtask: one branch per subtask, cut from the story branch:
  `feature/<id>-<slug>`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`.
- Hotfix: `hotfix/<id>-<slug>` from `main`/`master`; PR to production, then back-merge to `dev`.

### PR flow (one umbrella branch per request)
Every request with more than one task works like this, without the owner repeating it:
0. Break it into tasks and cut **one umbrella branch** (`epic/<id>-<slug>` or `story/…`) from
   `dev`. Nothing from the tasks goes straight to `dev`.
1. Subtask → its own branch from the umbrella → PR **into the umbrella branch**. Before
   merging: **QA (qa-sr) + Code Review (code-reviewer)** approved and CI green. Squash merge.
   No owner confirmation needed.
2. When ALL tasks are in the umbrella → umbrella PR → `dev`, with **QA of the whole request +
   an overall Code Review** (plus tech-lead/security when it touches money, authz or personal
   data). Merge only when everything is green. **Needs the owner's confirmation** unless the
   owner authorized that merge when approving the plan or the project's autonomy is `auto`.
3. Release → PR `dev` → `main`/`master`, merge commit + SemVer tag + CHANGELOG.
   **Needs the owner's confirmation** (same exceptions).
- No force push to protected branches (blocked). `--force-with-lease` only on your own branches.
- Conventional commits; atomic, signed commits; semantic versioning.
- Every repo has CODEOWNERS and branch protection on `dev` and `main`/`master`
  (PR required, required checks, no force push).

### Closing a branch
- After a merge: go back to `dev` (or `main`/`master` if there is no `dev`) and pull.
- Cleanup: run `~/.claude/bin/git-prune-merged` (dry run), **show the owner the list and wait
  for confirmation**, then `--apply`. It detects normal merges, squash merges and stacked
  sub-branches.
- A branch with work that is not in `dev`/`main`/`master` is never deleted: ask the owner.
