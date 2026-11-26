---
name: story
description: >
  Delivers one user story or epic end to end on its own temporary branch: subtask branches →
  PRs into the story branch with QA and code review → PR to dev (owner confirms). Use on
  /story, /epic, "implementa la historia", "siguiente historia", or when a planned story is
  ready to build.
---

# /story <id> — Story/epic delivery

Announce every step: `▶ <agent> · <skill> · <what> — <why>`. Keep `.claude/handoff.md`.

1. **Ready check** — @product-owner: story has Given/When/Then criteria, flag key, data
   touched. User data/auth/payments → `/threat-model` first (@security).
2. **Plan** — @project-manager: subtasks (each ≤ 2 h, one branch), owners, order, tests to write
   first. Small story with an approved epic plan → proceed; otherwise PLAN CHECKPOINT.
3. **Story branch**: `story/<id>-<slug>` from `dev` (or `main`/`master` if no dev); push it.
4. **Per subtask** (sequential unless independent):
   a. Branch `feature|fix|...-/<id>-<slug>` from the story branch.
   b. Owner agent implements with TDD<!-- codex --> (Codex via codex-task; Claude verifies, runs integration tests, commits)<!-- /codex -->.
   c. Open PR → story branch. Review tier 1 (`standards/review.md`): tests and local CI green
      + one light review (<!-- codex -->`codex-task review` with a risk brief, else <!-- /codex -->@subtask-reviewer); auth/authz,
      money, RLS, migrations or crypto also get @code-reviewer. Fix until APPROVE. If the project's CLAUDE.md says `review_tier: strict`, @qa-sr + @code-reviewer review every subtask PR instead.
   d. Squash-merge into the story branch (no owner confirmation needed).
5. **Story complete** (review tier 2, once, on the whole story diff): @qa-sr + @code-reviewer;
   @tech-lead + @security module gate; @product-owner acceptance against
   criteria; @doc-writer docs/CHANGELOG entry.
6. **PR story → dev**: summary of what/why, tests, flags, migrations, rollback.
   `Status: waiting-approval`. **Ask the owner** before merging.
7. After merge: back to dev, `git-prune-merged` dry run → show list → owner confirms → apply.
