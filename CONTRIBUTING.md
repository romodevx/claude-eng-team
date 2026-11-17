# Contributing

Thanks for helping! The project follows the same process it installs.

## Setup
```bash
git clone https://github.com/romodevx/claude-eng-team && cd claude-eng-team
npm test                                   # node:test + the Python hook suites
node bin/cli.js install --dry-run          # try the installer without touching anything
node bin/cli.js install -y --home /tmp/h   # or install into a throwaway HOME
```

## Ground rules
- **Tests first.** A behaviour change starts with a failing test (`test/`, `payload/hooks/tests/`).
- **Branches:** work on `feature/…`, `fix/…`, `docs/…` from `dev`; PRs go to `dev`; `main` gets
  releases only. Conventional commits.
- **Original work only in `payload/`.** Third-party skills are never copied into the repo:
  add them to `vendor/manifest.json` with the repo, path, full 40-char commit SHA, author and
  license, then run `npm run credits`. Explain in the PR what you reviewed (SKILL.md and every
  script: no network calls home, no secret reading, no unpinned downloads). Non-commercial or
  unclear licenses are not accepted.
- **No personal data.** No names, paths, emails, project names or tokens in the payload.
- Keep always-loaded rules short; long guidance goes to `payload/standards/` (read on demand).

## Releasing (maintainers)
`dev` → PR to `main` → bump `package.json` + `CHANGELOG.md` → tag `vX.Y.Z` → `npm publish`.
