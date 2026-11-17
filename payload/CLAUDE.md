# {{OWNER}} — Engineering Team (claude-eng-team)

Every project on this machine is run by the global agent team in `~/.claude/agents/`.
Project-specific context lives in each repo's `CLAUDE.md` (template:
`~/.claude/templates/project-CLAUDE.md`). How to work with the team: `~/.claude/USAGE.md`.
Code, comments, commits and docs in English; conversation with me in {{LANGUAGE}}.

## Engineering canon (non-negotiable)
Clean Code, Clean Architecture, The Clean Coder (R. C. Martin), The Go Programming Language
(Donovan & Kernighan). SOLID always. Best-known algorithm and data structure for the problem,
with its Big O documented in the PR or ADR. For Go, idiomatic Go is the tiebreaker.

## Default stack (new projects, unless I say otherwise at the start)
- Backend: **Go** · ORM: **GORM** (pgx/sqlc allowed on hot paths via ADR) · API: REST with
  OpenAPI spec-first; gRPC between services when an ADR justifies it.
- Database: **chosen per problem** — analyse data model, query patterns, volume, consistency
  and multi-tenancy, then justify it in an ADR. Relational data with RLS → PostgreSQL preferred.
- Web frontend: **React** (TS or JS per project). Mobile: **React Native** (Expo by default).
- Existing projects keep their chosen stack; every standard below applies to them too.
- A request that contradicts this stack → **ask me before continuing**.

## Standards
Always-loaded summaries live in `~/.claude/rules/`. The full standards live in
`~/.claude/standards/` and are read **on demand** by the agent doing the work:
`resilience` · `data` · `api` · `testing` · `security` · `frontend-web` · `mobile` ·
`observability` · `delivery` (branches, CI, releases, deploys). Never paste them; reference them.

## Workflow
1. I describe what I want in natural language.
2. The team analyses it: product-owner/pm/project-manager break it into epics → stories →
   tasks → subtasks; architect, tech-lead, security and the relevant engineers debate it.
3. **PLAN checkpoint**: full plan (epics, tasks, architecture, stack, ADRs, risks, open
   questions) and wait for my approval. Ask what you need; never assume.
4. Execute per `rules/git-workflow.md`: one branch per subtask → story/epic branch → `dev`
   → `main`/`master`. Every PR gets QA (qa-sr) and Code Review (code-reviewer) before merge.
   Then, BEFORE opening or marking the PR ready, the repo's CI runs locally with `act`
   (`pnpm ci:local` where it exists) and must be green — `rules/ci-local.md`.
5. TDD always; a task is done only when its tests pass.

## Approvals — autonomy, never blind decisions
Ask for my explicit confirmation before: **merge to `dev`**, **merge to `main`/`master`**,
**any deploy**, **any data deletion** (local DB wipes included), **schema changes on a
shared/remote database**, **installing third-party software from the web** (new packages,
global tools, `curl | sh`), and any irreversible or shared-state action. The `guard-actions`
hook enforces this; never work around it (no alternative commands, no `CLAUDE_GUARD=off`).
Everything else local is pre-approved in every project — no need to ask: `cd`, builds, tests,
running the apps, local migrations, docker compose, git on work branches, restoring the
project's own lockfile (`npm ci`, `go mod download`). Staging: confirm per project whether it
exists before planning deploys.

### Command autonomy per project (ask once)
Before running the first command of a task in a project, check `~/.claude/bin/autonomy status`.
If it is `unset`, ask me ONCE (with the plan, or alone if there is no plan): "We'll run
commands during this task. Run them automatically? Yes / No (I'd rather review each one)".
Save the answer with `~/.claude/bin/autonomy auto|review` — it persists for that project until
I change it. Never set it without my answer.
- `auto`: ANY terminal command runs without prompts — pushes and merges to dev/main/master,
  migrations, data resets, deploys, heredoc scripts and long `;`/`&&` chains included (the guard
  does not ask). Two exceptions: the Rule 0 blocks (commit on dev/main/master, force push to
  them) and **installing new third-party software from the web, which ALWAYS asks in every
  mode** (restoring the project's own lockfile — `pnpm install --frozen-lockfile`, `npm ci` —
  is not an install and runs freely). The approval rules above still guide judgment: anything
  irreversible on production goes in the approved plan or is reported right after, with its
  rollback.
- `review`: every Bash command asks for my confirmation.

## Visibility — show who, what, and why
While executing, announce each step in one line:
`▶ <agent> · <skill or tool> · <what> — <why / decision taken>`.
Decisions worth keeping go to an ADR.

<!-- codex:start -->
## Handoff file (Claude ⇄ Codex)
During any multi-step task keep `.claude/handoff.md` in the project current (git-excluded):
`Status: in-progress | waiting-approval | done`, goal, approved plan path, branch, steps done,
next steps, constraints. If Claude runs out of quota, a hook hands it to Codex automatically;
on return, review Codex's work before anything else (`rules/codex-first.md`). Delegations to
Codex are announced like any other step.
<!-- codex:end -->

## Team commands
/new-project /plan /story /new-module /new-feature /adr /threat-model /flags /test /refactor /hotfix /deploy
/postmortem /docs /status /feedback. Optional community skills (installed separately, see
CREDITS): gstack `/review` `/qa` `/ship` `/investigate` `/retro` `/learn`. `/qa` runs per
`rules/qa-browser.md`.

## Sub-agent routing
Parallel: 3+ independent tasks, no shared state, clear file boundaries. Sequential: any
dependency, shared files or unclear scope. Background: research that doesn't block.
Subagents return concise summaries; results persist in markdown files referenced by path.
`/compact` above 80% context; agent memories condensed past 200 lines.

## Skills policy
Third-party skills are installed only after a security review (read the SKILL.md and every
script; nothing that phones home, reads secrets or runs unpinned code). Security skills have
no exceptions. No approved option → build it in-house.
