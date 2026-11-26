# Working with the team

## 1. Ask in natural language
You don't need commands. Examples:
- "I want to build a multi-tenant booking SaaS for clinics, with a mobile app" → `/new-project`
- "Add CSV export to the reports module" → `/new-feature`
- "Implement story RES-12" → `/story`
- "How are we doing?" → `/status`
- "Production is down: login returns 500" → `/hotfix`

If your request contradicts the default stack (Go + GORM, React, React Native, database chosen
by analysis), the team asks you before continuing.

## 2. What happens next
1. **Analysis**: pm (problem and metrics), product-owner (stories with Given/When/Then
   criteria), architect + db-sr (architecture, database ADR), security (STRIDE when there is
   user data, auth or payments).
2. **Debate**: scrum-master gathers each role's position and writes down which decisions are
   yours.
3. **PLAN**: epics → stories → tasks → subtasks, architecture, stack, risks, range estimates and
   open questions. **Nothing runs until you approve it.**
4. **Visible execution**: every step is announced like this:
   `▶ backend-sr · tdd · handler POST /v1/bookings — idempotency key for mobile retries`
5. **Branches**: each subtask on its own branch → PR into the story branch (`story/<id>-…`)
   with QA and Code Review → when the story is done, PR to `dev` → then `dev` → `main`/`master`.

## 3. When you'll be asked to confirm
- Merge to `dev` and merge to `main`/`master`
- Any deploy (dev, staging, production) and enabling flags in shared environments
- Deleting data (including `/qa`'s local DB reset) and deleting merged branches
- Migrations against a shared or remote database (local ones run without asking)
- Installing third-party software from the web (new packages, global tools, `curl | sh`)
- Accepting residual risks from a threat model

Everything else inside your projects runs **without a yes/no prompt**: `cd`, builds, tests,
running the apps, local migrations, docker compose, git on work branches and restoring the
lockfile's dependencies (`npm ci`, `go mod download`).

### Per-project autonomy (asked once)
The first time a task is about to run commands in a project, the team asks: "We'll run commands
during this task. Run them automatically? Yes / No (I'd rather review each one)". The answer is
saved for that project in `.claude/autonomy` (git-excluded):
- **Yes (`auto`)**: no terminal command asks for confirmation: pushes and merges to
  `dev`/`main`, migrations, data resets, deploys, heredoc scripts and long `;`/`&&` chains
  included. Ideal for leaving it working overnight. Exceptions: direct commits on
  `dev`/`main`/`master` and force pushes to them stay blocked, and **installing new
  third-party software from the web always asks**, in every mode. Restoring the project's
  lockfile (`pnpm install --frozen-lockfile`, `npm ci`) doesn't count as an install.
- **No (`review`)**: every command asks for confirmation.

To change it, just say so ("switch to automatic") or run
`~/.claude/bin/autonomy auto|review|status|clear` inside the project.

The `guard-actions` hook enforces all of this even when the session runs in bypass mode.

<!-- codex:start -->
## If Claude runs out of quota (optional, needs Codex CLI)
Claude keeps `.claude/handoff.md` in the project. If a turn fails on a usage limit, Codex picks
up the implementation automatically in the background (you get a desktop notification). It
only does so on a work branch, with the task in progress and never past an approval point.
Codex doesn't commit. When Claude is back, it reviews Codex's work, runs the tests and commits.
To disable it for a session: `CLAUDE_CODEX_FALLBACK=off`.
<!-- codex:end -->

## 4. Commands
| Command | What for |
|---|---|
| `/new-project` | Project from zero to production |
| `/plan` | Plan epics and stories with a debate between roles |
| `/story <id>` | Deliver a story or epic (branches, PRs, QA, review) |
| `/new-module <name>` | Full module cycle (contract → data → backend → front → flag) |
| `/new-feature` | A feature inside an existing module |
| `/adr` | Record an architecture decision |
| `/threat-model` | STRIDE + OWASP ASVS before touching user data, auth or payments |
| `/flags` | Per-module flags, demo presets, percentage rollout |
| `/test` · `/qa` | Full suite · QA in a visible browser (`/qa` needs gstack) |
| `/deploy` | dev → staging (if it exists) → production, with gradual rollout |
| `/hotfix` · `/postmortem` | Urgent fix · blameless postmortem |
| `/status` · `/docs` · `/refactor` · `/feedback` | Progress · docs · tech debt · correct an agent |

## 5. The team
product-owner · pm · scrum-master · project-manager · eng-manager · architect · tech-lead ·
backend-sr (Go) · frontend-sr (React) · mobile-sr (React Native) · db-sr · devops-sr (SRE) ·
security · qa-sr · code-reviewer · subtask-reviewer · doc-writer.

Reviews go by tier (`~/.claude/standards/review.md`): a light review on each subtask PR, the
full reviewers once per story. When a story ends, Claude updates `.claude/handoff.md`
and asks you to run `/compact`: the plan, branch and next steps survive in that file and in git,
and every later turn costs less.

## 6. Where things live
- `~/.claude/CLAUDE.md`: the team's global rules
- `~/.claude/rules/`: always-loaded summaries (Go, frontend and forms load only when touching
  those files)
- `~/.claude/standards/`: full standards each agent reads when its work needs them
- `~/.claude/templates/`: project CLAUDE.md, GitHub CI, ADR, threat model, postmortem, runbook
- `~/.claude/hooks/`: approval guard<!-- codex --> and Codex handoff<!-- /codex --> (tests in `hooks/tests/`)
- `~/.claude/bin/`: `autonomy`, `git-prune-merged`<!-- codex -->, `codex-task`<!-- /codex -->
- Installed by `npx claude-eng-team`; `npx claude-eng-team uninstall` restores your backup.
