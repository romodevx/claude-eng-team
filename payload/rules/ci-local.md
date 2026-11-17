
## Local CI before every PR (every project)

GitHub Actions minutes are finite (e.g. 2,000 min/month on GitHub Free). A PR that breaks in
CI costs a re-push and another full run. So CI runs on the local machine first, for free.

### When
- After code review (code-reviewer) and QA (qa-sr), and **before** opening a PR or marking it
  ready for review. Also before a direct push that will trigger CI.
- Iterate on a PR as a **draft**: in repos configured that way, drafts don't run CI on GitHub.
  Mark it ready only with local CI green.

### How
- If the repo has `pnpm ci:local` (or `make ci-local`), that's the command: it runs the repo's
  REAL workflow with nektos/act (`brew install act`) and leaves a summary in
  `.gstack/ci-local/last-run.md`.
- If it doesn't: `act pull_request -W .github/workflows/<ci>.yml` with a PR event targeting the
  base branch (`-e event.json`), `--container-architecture linux/arm64` on Apple Silicon and
  `--concurrent-jobs 1`. If the repo will use it often, propose a `ci:local` wrapper
  (a `scripts/ci-local.sh` script).
- Docker Desktop needs ≥ 10 GB of memory for monorepos with Go + testcontainers.

### Rules
- **Red locally = no PR.** Fix it first (TDD as always).
- The local CI summary (verdict, commit, duration) goes in the PR body.
- A job that dies with exit code 137 is out of memory, not a code failure: re-run that job
  alone (`-j <job>`) before concluding anything.
- `advisory` steps (continue-on-error) in red don't block, locally or on GitHub.
- Never run deploys locally (OIDC/WIF): never deploy from the workstation.
- Don't edit the wrapper script while it runs: `sh` reads it as it goes.
- GitHub CI remains the final word: act doesn't replicate caches, secrets or identical
  runners. The goal is to arrive green on the first try.
