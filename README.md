<div align="center">

# claude-eng-team

**A full engineering team for [Claude Code](https://code.claude.com/docs/en/overview) — in one command.**

17 role agents · enforced approvals · TDD · ADRs · threat models · story → dev → prod git flow

[![npm](https://img.shields.io/npm/v/claude-eng-team)](https://www.npmjs.com/package/claude-eng-team)
[![ci](https://github.com/romodevx/claude-eng-team/actions/workflows/ci.yml/badge.svg)](https://github.com/romodevx/claude-eng-team/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Español](README.es.md)

</div>

```bash
npx claude-eng-team
```

It asks five questions, backs up anything it touches, and installs into `~/.claude`.
Undo it any time with `npx claude-eng-team uninstall`.

**Contents:** [Why](#why) · [Requirements](#requirements) · [Install, step by step](#install-step-by-step) ·
[Your first session](#your-first-session-step-by-step) · [Approvals and autonomy](#approvals-and-autonomy) ·
[What's inside](#whats-inside) · [Third-party skills](#third-party-skills) · [Update, check, uninstall](#update-check-uninstall) ·
[Troubleshooting](#troubleshooting) · [FAQ](#faq) · [Honorable mentions](#honorable-mentions)

---

## Why

Claude Code is a great engineer. Left alone, it is a great engineer **without a team**: no
product owner asking what "done" means, no architect writing down why Postgres, no security
review before the login ships, no one stopping a 2 a.m. `git push origin main`.

claude-eng-team gives it that team and the process big engineering orgs run on. You describe a
product in plain language, approve one plan, and get branches, tests, reviews and releases you
can trust — even while you sleep.

## Requirements

| | Minimum | Tested with | Why it's needed |
|---|---|---|---|
| [Claude Code](https://code.claude.com/docs/en/overview) | 2.x | 2.1.323 | runs the team |
| Node.js | 18 | 18, 22, 24 | runs the installer (`npx`) |
| git | 2.19 | 2.54 | your projects; downloads third-party skills at pinned commits |
| Python 3 | 3.8 | 3.15 | the approval guard hook |
| OS | macOS or Linux | macOS 26, Ubuntu (CI) | hooks and helper scripts are bash/Python. Windows: use WSL |

Optional: [Codex CLI](https://github.com/openai/codex) (delegation + quota handoff),
[GitHub CLI](https://cli.github.com) `gh` (PRs), Docker (integration tests), [act](https://github.com/nektos/act) (local CI).

## Install, step by step

### 1. Run the installer

```bash
npx claude-eng-team
```

Want to see first what it would change? Nothing is written with:

```bash
npx claude-eng-team --dry-run
```

### 2. Answer five questions

| Question | Default | What it changes |
|---|---|---|
| Your name (for CLAUDE.md) | your OS user | the title of your global `CLAUDE.md` |
| Language Claude should talk to you in | English | code and docs stay in English; conversation in your language |
| Use Codex CLI for hands-on coding and as a fallback when Claude hits its quota? | yes if `codex` is installed | adds the Codex rule, `codex-task` and the handoff hooks |
| Run Bash commands without permission prompts? | no | adds `"Bash"` to `permissions.allow`; the guard still asks for installs, merges, deploys and data deletion |
| Which groups of third-party skills? | the ★ recommended ones | downloads them from their authors (see [Third-party skills](#third-party-skills)) |

Prefer no questions? Every answer has a flag:

```bash
npx claude-eng-team --yes --owner "Ada" --language Spanish --no-codex --allow-bash --skills engineering,security,product
```

### 3. What it does on disk

1. Copies the team into `~/.claude` (or `$CLAUDE_CONFIG_DIR`): `agents/`, `rules/`,
   `standards/`, `templates/`, `skills/`, `hooks/`, `bin/` and `USAGE.md`.
2. **Backs up** every file it replaces into `~/.claude/.claude-eng-team/backup/`, once.
3. `CLAUDE.md`: if you don't have one, it writes it. If you do, **yours stays** and one line,
   `@./claude-eng-team.md`, is added at the top to import the team's instructions.
4. **Merges** `settings.json`: adds its hooks first and keeps every setting and hook of yours.
5. Downloads the third-party skills you picked from their original repositories at a pinned
   commit, through a cache in `~/.cache/claude-eng-team` (or `$XDG_CACHE_HOME`). A skill you
   already have with the same name is never overwritten.
6. Records everything in `~/.claude/.claude-eng-team/state.json` so `uninstall` can undo it.

### 4. Restart Claude Code

Close and reopen Claude Code (or open `/hooks` once) so it loads the new hooks and agents.
Then check it:

```bash
npx claude-eng-team doctor
```

## Your first session, step by step

**1. Describe what you want.** No commands needed — open Claude Code in a project and say:

> I want to build a multi-tenant booking SaaS for clinics, with a mobile app.

(`/new-project`, `/new-feature`, `/story` and the rest exist when you want to be explicit.)

**2. The autonomy question — once per project.** Before running the first command, the team asks:

> We'll run commands during this task. Run them automatically? Yes / No (I'd rather review each one)

The answer is saved in the project's `.claude/autonomy` (git-excluded). See [the table](#approvals-and-autonomy).

**3. The team analyses and debates.** product-owner writes stories with Given/When/Then
criteria, pm sets scope and metrics, architect and db-sr pick the architecture and database
(each choice becomes an ADR), security runs a STRIDE threat model if there's user data,
auth or payments, and scrum-master collects every position.

**4. One plan, and nothing runs until you approve it.** Epics → stories → tasks → subtasks,
architecture, stack, risks, range estimates and the open questions only you can answer.

**5. Execution you can follow.** Every step is announced in one line:

```text
▶ backend-sr · tdd · POST /v1/bookings — idempotency key for mobile retries
▶ qa-sr · contract tests · bookings API — 14 passing against openapi.yaml
```

Work happens on branches: an umbrella `epic/…` or `story/…` branch from `dev`, one branch per
subtask, a PR into the umbrella with QA and code review, then one PR to `dev`, then a release
to `main`. Tests come first (TDD); a task is done only when its tests pass.

**6. You confirm what matters.** Merges to `dev`/`main`, deploys and data deletion wait for
your yes — unless the project is in `auto` mode. Installing new third-party software always
waits.

**7. When you're back.** Ask "how are we doing?" (`/status`). If you use Codex and Claude hit
its usage limit while you were away, Codex continued the work and Claude reviews it first.

## Approvals and autonomy

A `PreToolUse` hook, `guard-actions`, checks every Bash command before it runs — even in
bypass mode — and has its own test suite (`~/.claude/hooks/tests/`).

| Command | default | `auto` (good for overnight work) | `review` |
|---|---|---|---|
| builds, tests, running apps, local migrations, scripts | runs¹ | runs | asks |
| push or merge to `dev` / `main` | asks | runs | asks |
| deploys, data deletion, migrations on a remote database | asks | runs | asks |
| **installing new third-party software** (`npm i <pkg>`, `brew install`, `curl \| sh`) | **asks** | **asks** | **asks** |
| commit on `dev`/`main`, force push to them | blocked | blocked | blocked |

¹ If you answered *yes* to "Run Bash commands without permission prompts"; otherwise Claude
Code's normal prompts apply. Installing what the project already declares (`npm ci`,
`npm install` with no package, `pnpm install --frozen-lockfile`, `pip install -r
requirements.txt`, `go mod download`) is not a new install and runs. Adding a package, upgrading
(`npm update`), `npm create …`, `npx` of a package that isn't in the project and running code
from a fresh `git clone` all ask.

The guard reads commands the way a shell does (pipes, `&&`, `if`/`for`/`{ }`, `sh -c`,
heredocs, `$(…)`, wrappers such as `sudo`, `env`, `xargs`, `timeout`, `find -exec`). It is a
seatbelt against mistakes, not a sandbox against someone determined to evade it: a program
name built at run time, such as `$(echo npm) i x`, is not resolved.

Change a project's mode by saying so ("switch to automatic") or with:

```bash
~/.claude/bin/autonomy auto      # or: review | status | clear
```

## What's inside

**17 agents** (`~/.claude/agents/`):

| Product & delivery | Architecture & code | Quality, ops & security |
|---|---|---|
| product-owner · pm · scrum-master · project-manager · eng-manager | architect · tech-lead · backend-sr (Go) · frontend-sr (React) · mobile-sr (React Native) · db-sr | qa-sr · code-reviewer · subtask-reviewer · security · devops-sr (SRE) · doc-writer |

**11 rules** (`~/.claude/rules/`): 8 always loaded (about 10 KB; 7 and about 8 KB with `--no-codex`),
plus Go, frontend and forms rules that load only when you touch those files. Engineering canon and docs, testing, data,
API, security, git workflow with review tiers, context budget, Codex. A test keeps the always-loaded set under 13 KB.

**18 standards** (`~/.claude/standards/`), read only when the work needs them: resilience,
data, API, testing, security + OWASP ASVS 5.0 checklist, web and mobile performance budgets,
observability, delivery, incident response, module workflow, feature flags, local CI and CI
watching, browser QA, Codex protocol, review tiers.

**19 commands** (`~/.claude/skills/`):

| Command | What it does |
|---|---|
| `/new-project` | A project from zero to production |
| `/plan` | Epics and stories, debated across roles |
| `/story <id>` | Deliver a story or epic: branches, PRs, QA, review |
| `/new-module <name>` | Full vertical slice: contract → data + RLS → backend → frontend → flag |
| `/new-feature` | A feature inside an existing module |
| `/adr` · `/threat-model` | Architecture decision record · STRIDE + ASVS before user data, auth or payments |
| `/flags` | Per-module flags, demo presets, percentage rollout |
| `/test` · `/deploy` | Full test suite · gradual release with rollback |
| `/hotfix` · `/postmortem` | Urgent fix, still test-first · blameless postmortem |
| `/refactor` · `/redesign` | Tech-debt cleanup led by tech-lead · make a screen easier to use without changing behavior |
| `/status` · `/docs` · `/feedback` · `/refresh-rules` | Progress · documentation · teach an agent · re-verify a rule against its sources |

**10 templates** (`~/.claude/templates/`): project `CLAUDE.md`, GitHub Actions CI tuned to
save minutes, CODEOWNERS, PR template, Renovate, ADR, threat model, runbook, postmortem, handoff.

**Default stack** for new projects: Go + GORM, React, React Native (Expo), database chosen
per problem in an ADR. Existing projects keep theirs; a request that contradicts it makes
the team ask first. Change it in `~/.claude/CLAUDE.md`.

## Third-party skills

This package contains **only original work**. During install you can add groups of community
skills; each one is downloaded **from its author's repository at a pinned commit** — never a
moving branch — and keeps its author's license.

| Group | What's in it | Skills |
|---|---|---|
| engineering ★ | Go style and errors, Postgres, React, Terraform, SLOs, CI minutes, code search, browser automation | 10 |
| security ★ | security-focused diff review, threat modeling, skill auditing | 3 |
| product ★ | user stories, scrum facilitation, requirement grilling | 3 |
| design | UI craft, animation (web and Expo), design systems | 26 |
| marketing | copywriting, CRO, SEO and AI-SEO, schema, ads, conversion tracking | 8 |
| context | context engineering for agents | 15 |
| writing | remove AI-writing tells; terse mode | 2 |
| legal | compliance check, legal risk, Mexican privacy-notice texts | 3 |

★ = installed by default. Pick with `--skills all`, `--skills none` or `--skills design,marketing`.
The full list with authors, commits and licenses is in [CREDITS.md](CREDITS.md), or run:

```bash
npx claude-eng-team credits
```

**Recommended extras** you install yourself, from their authors (the installer prints the
exact commands): [gstack](https://github.com/garrytan/gstack) (visible-browser `/qa`,
`/review`, `/ship`, `/cso`), [superpowers](https://github.com/obra/superpowers) (debugging,
TDD and planning skills), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
and others. Without them the team does the same work with Claude Code's built-in tools.

## Update, check, uninstall

```bash
npx claude-eng-team            # update: run it again; your answers are remembered
npx claude-eng-team doctor     # prerequisites + the guard's self-test
npx claude-eng-team uninstall  # restore your previous files exactly
```

`uninstall` removes every file it added, restores every file it backed up, removes its hooks,
the import line, the download cache and every folder it created, and leaves any change you
made to `settings.json` in place.

If you edited one of the team's files after installing, your edit wins:

- **Update** keeps your file and writes the new version next to it as
  `<file>.claude-eng-team-new`, for you to merge. `--dry-run` lists those files as `keep`.
- **Uninstall** keeps your edited file. If it replaced one of yours, your original comes back
  and your edited copy is saved as `<file>.claude-eng-team-edited`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| The team doesn't seem active | Restart Claude Code; run `npx claude-eng-team doctor` |
| `python3 is required` | Install Python 3.8+ and run the installer again |
| A command is blocked: "Rule 0: no commits on 'main'" | By design: create a branch first (`git checkout -b feature/x`) |
| Too many prompts | Answer *yes* to the autonomy question, or `~/.claude/bin/autonomy auto` in the project |
| A third-party skill failed to download | Check your network/GitHub access and run the installer again; it resumes |

## FAQ

**Does it send my code anywhere?** No. It is configuration files and two local Python hooks.
Third-party skills are only downloaded from GitHub if you choose them.

**Will it break my current setup?** It backs up what it replaces and merges settings. If
anything looks off: `npx claude-eng-team uninstall`.

**Is the stack mandatory?** No. Existing projects keep theirs; new ones default to it unless
you say otherwise.

**Why does it ask before installing packages even in `auto`?** Supply-chain risk: new code
from the internet always gets a human yes.

**Do I need Codex?** No. Without it the agents code directly; with it they delegate hands-on
work and Codex can take over when Claude hits its usage limit.

## Honorable mentions

This project stands on other people's work. Thank you:

- **Skill authors** (downloaded from their repos, never bundled): Corey Haines
  ([marketingskills](https://github.com/coreyhaines31/marketingskills)), Muratcan Koylan
  ([Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)),
  Emil Kowalski ([skills](https://github.com/emilkowalski/skills)), Next Level Builder
  ([ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)), Anthropic
  ([skills](https://github.com/anthropics/skills), [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)),
  Vercel ([agent-skills](https://github.com/vercel-labs/agent-skills), [agent-browser](https://github.com/vercel-labs/agent-browser),
  [skills](https://github.com/vercel-labs/skills)), Trail of Bits ([skills](https://github.com/trailofbits/skills)),
  OpenAI ([skills](https://github.com/openai/skills)), NVIDIA ([SkillSpector](https://github.com/NVIDIA/SkillSpector)),
  HashiCorp ([agent-skills](https://github.com/hashicorp/agent-skills)), Supabase
  ([agent-skills](https://github.com/supabase/agent-skills)), GitHub
  ([awesome-copilot](https://github.com/github/awesome-copilot)), Samuel Berthe
  ([cc-skills-golang](https://github.com/samber/cc-skills-golang)), Seth Hobson
  ([agents](https://github.com/wshobson/agents)), Pawel Huryn ([pm-skills](https://github.com/phuryn/pm-skills)),
  Alireza Rezvani ([claude-skills](https://github.com/alirezarezvani/claude-skills)), Matt Pocock
  ([skills](https://github.com/mattpocock/skills)), Siqi Chen ([humanizer](https://github.com/blader/humanizer)),
  Julius Brussee ([caveman](https://github.com/JuliusBrussee/caveman)), Uizze ([uizze](https://github.com/uizze/uizze)),
  Netresearch ([file-search-skill](https://github.com/netresearch/file-search-skill)) and arrobabeto via
  ThomasMoreAI ([legal-skills-open](https://github.com/ThomasMoreAI/legal-skills-open)).
- **Tools that inspired the workflow:** Garry Tan's [gstack](https://github.com/garrytan/gstack),
  Jesse Vincent's [superpowers](https://github.com/obra/superpowers), Alex Newman's
  [claude-mem](https://github.com/thedotmack/claude-mem), OpenAI's [Codex CLI](https://github.com/openai/codex)
  and Anthropic's [Claude Code](https://code.claude.com/docs/en/overview).
- **Ideas and books:** Robert C. Martin (*Clean Code*, *Clean Architecture*, *The Clean Coder*),
  Alan Donovan & Brian Kernighan (*The Go Programming Language*), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
  and the [Google SRE books](https://sre.google/books/). The package paraphrases their principles
  and contains no text from them.

Exact commits and licenses: [CREDITS.md](CREDITS.md).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security reports:
[SECURITY.md](SECURITY.md).

## License

Original work © Andres Romo ([ROMOLABS](https://github.com/romodevx)), [MIT](LICENSE).
Third-party skills belong to their authors under their own licenses.
