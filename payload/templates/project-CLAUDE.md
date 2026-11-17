# <Project name>

Global team, rules and standards: `~/.claude/CLAUDE.md` (they apply here; this file adds only
what is specific to this project).

## Product
<one paragraph: problem, users, success metric> · PRD: `docs/project-specs/PRD-<name>.md`

## Stack (ADRs in `docs/adr/`)
- Backend: Go <version> + GORM · API: `docs/api/openapi.yaml`
- Database: <engine> — ADR-<NNNN> · Multi-tenancy: <model> — ADR-<NNNN>
- Web: React <TS|JS> (<Vite|Next>) · Mobile: <React Native/Expo | none>
- Deviations from the default stack: <none | ADR links>

## Branches & environments
- Protected: `dev`, `<main|master>` · Story branches: `story/<id>-<slug>`
- Environments: dev <url> · staging: <exists: url | does NOT exist (confirmed YYYY-MM-DD)> ·
  production <url>
- Deploy commands: <...> · Rollback: <...>

## Local development
- Setup: <commands> · Run: <commands> · Port: <port> (registered in /projects)
- Tests: unit `<cmd>` · integration `<cmd>` · E2E `<cmd>` · load `<cmd>`
- Local DB reset (asks the owner first): `<cmd>`; demo credentials: <where documented>

## Modules & flags
`docs/project-specs/MODULES.md` · presets: `docs/project-specs/FLAG-PRESETS.md`

## Project-specific rules
- <only what differs from or adds to the global standards>
