# Review tiers

Reviews are the most expensive thing the team does: every Claude review agent re-reads the diff
and the standards it needs. Quality comes from reviewing at the right level, once, with the
right depth — not from running every reviewer on every subtask.

## Tier 1 — subtask PR → umbrella branch
Gate: tests green, local CI green (`standards/ci-local.md`), one light review.
<!-- codex:start -->
- **With Codex:** `codex-task review medium` on the subtask diff, with a brief that names the
  risks to check (what changed, what could break, which standard applies). `high` for money,
  authz/RLS, concurrency or migrations. Claude reads the verdict, fixes or delegates the
  fixes, and decides.
- **Codex out of quota (exit 3) or not installed:** the `subtask-reviewer` agent instead.
<!-- codex:end -->
- `subtask-reviewer` (one agent, cheaper model) covers both QA and code review on the subtask
  diff only: tests first and meaningful, the acceptance criteria the subtask claims, obvious
  defects, the canon violations visible in the diff.
- **Escalation:** a subtask touching auth/authz, money, RLS, migrations or crypto also gets
  @code-reviewer at this tier. Anything the light review flags as BLOCKER escalates too.

## Tier 2 — umbrella (story/epic) → dev
The full gates, once per story: @qa-sr (test strategy, flag ON/OFF, RLS isolation, load
budgets) and @code-reviewer on the whole umbrella diff; @tech-lead and @security when it touches
money, authz or personal data, and on every module gate. Owner confirms the merge.

## Tier 3 — release dev → main/master
No new code review: the release PR carries what tiers 1–2 approved. @security pre-deploy review
and @devops-sr release checks per `standards/delivery.md`.

## Rules for every reviewer
- **Diff only:** review `git diff <base>...HEAD`; read surrounding code only where the diff
  needs it. Read only the standard sections the changed files touch.
- **Re-reviews read only what changed** since the last verdict (`git diff <reviewed-sha>..HEAD`)
  plus the findings being closed. A diff already approved is never reviewed again.
- **Output:** the verdict and findings in ≤ 30 lines (severity, `file:line`, one-line fix); the
  full report goes to `.claude/reviews/<branch>-<agent>.md` and is referenced by path.
- **Strict mode:** `review_tier: strict` in a project's CLAUDE.md restores @qa-sr +
  @code-reviewer on every subtask PR (regulated code, a new team, a bad incident).
