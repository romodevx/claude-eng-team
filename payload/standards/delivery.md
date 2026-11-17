# Standard: Delivery (version control, CI/CD, releases, deploys)
Owner: devops-sr · Branch policy: rules/git-workflow.md

## Repository setup (every project)
- `CODEOWNERS`; branch protection on `dev` and `main`/`master`: PR required, required status
  checks, linear or merge-commit policy, no force push, no deletion, signed commits.
- Conventional commits; SemVer tags on releases (`vMAJOR.MINOR.PATCH`); CHANGELOG generated
  from commits (release-please or git-cliff).

## Branch → environment flow
`feature/*` → PR → `story/*` (QA + code review) → PR → `dev` [owner confirms] → deploy to
**dev** env → **staging** (if the project has one — confirm at project start and record it in
the project CLAUDE.md) → PR `dev` → `main`/`master` [owner confirms] → production deploy
[owner confirms] with canary/percentage rollout.

## GitHub Actions — minimize minutes
- Trigger narrowly: `on.pull_request` + `push` only to protected branches; `paths`/
  `paths-ignore` filters (docs-only changes skip builds); `dorny/paths-filter` to run per-app
  jobs in monorepos.
- `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`.
- Cache dependencies (`actions/setup-go` cache, `setup-node` cache, Docker layer cache via
  `cache-from: type=gha`); reuse build artifacts between jobs instead of rebuilding.
- Fail fast order: lint → unit → build → integration/contract → security scans → E2E.
  Expensive jobs (E2E, load, container scan) only on PRs to `dev`/`main` or nightly.
- Pin actions by commit SHA; least-privilege `permissions:`; OIDC to cloud (no static keys).
- Reusable workflows/composite actions for shared steps. Template:
  `~/.claude/templates/github/ci.yml`.

## Required CI gates
gofmt/golangci-lint · tests (scoped) · OpenAPI lint + drift · SAST · SCA · gitleaks ·
frontend source-map/secret artifact scan · coverage threshold · container scan on release.

## Deploys
- Immutable artifacts (image digest) promoted across environments; config per env from IaC.
- Every deploy has: change summary, rollback command, flags involved, owner confirmation.
