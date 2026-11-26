# {{OWNER}} — Engineering Team (claude-eng-team)

Every project on this machine is run by the agent team in `~/.claude/agents/`. Project context
lives in each repo's `CLAUDE.md` (template: `~/.claude/templates/project-CLAUDE.md`); how to
work with the team: `~/.claude/USAGE.md`. Code, comments, commits and docs in English;
conversation with me in {{LANGUAGE}}.

## Default stack (new projects, unless I say otherwise at the start)
Backend **Go** + **GORM** (pgx/sqlc on hot paths via ADR), REST, OpenAPI spec-first. Database chosen per problem in an ADR (relational + RLS →
PostgreSQL). Web **React**, mobile **React Native** (Expo). Existing projects keep their stack.
A request that contradicts this stack → **ask me before continuing**.

## Standards
Always-loaded summaries: `~/.claude/rules/`. Full standards: `~/.claude/standards/`, read **on demand**
by whoever does the work. Reference them; never paste them.

## Workflow
1. I describe what I want. 2. The team breaks it into epics → stories → subtasks and debates
it (`/plan`). 3. **PLAN
checkpoint**: plan, ADRs, risks and open questions; wait for my approval, never assume.
4. Execute per `rules/git-workflow.md` (branches, review tiers, local CI). 5. TDD always; done
means tests pass. Modules follow `standards/module-workflow.md` behind a flag
(`standards/feature-flags.md`); `/qa` follows `standards/qa-browser.md`.

## Approvals — autonomy, never blind decisions
Ask me before: **merge to `dev`**, **merge to `main`/`master`**, **any deploy**, **any data
deletion** (local DB wipes included), **schema changes on a shared/remote database**,
**installing third-party software from the web**, and any irreversible or shared-state action.
The `guard-actions` hook enforces this; never work around it. Everything else local is
pre-approved (builds, tests, local migrations, git on work branches, lockfile restores).

Command autonomy per project: before the first command of a task, check
`~/.claude/bin/autonomy status`. If `unset`, ask me ONCE "Run commands automatically? Yes / No
(review each one)" and save it with `~/.claude/bin/autonomy auto|review`. `auto`: every command
runs without prompts except the Rule 0 blocks and **new third-party installs, which always
ask**; irreversible production actions go in the approved plan or are reported right after,
with their rollback. `review`: every Bash command asks.

## Visibility and handoff
Announce each step in one line: `▶ <agent> · <skill or tool> · <what> — <why>`. Decisions
worth keeping go to an ADR. During multi-step work keep `.claude/handoff.md` current
(git-excluded): `Status: in-progress | waiting-approval | done`, goal, plan, branch, next. Context discipline: `rules/context-budget.md`.

## Commands and skills
Team commands are the skills in `~/.claude/skills/` (/new-project, /plan, /story…); gstack and
superpowers are optional (see CREDITS). Third-party skills only after
a security review (read SKILL.md and every script); none approved → build it in-house.
Subagents: parallel only for 3+ independent tasks with clear file boundaries; they return
concise summaries and persist results in markdown referenced by path.
