## QA Rules (/qa, every project)

How `/qa` runs on this machine.
The gstack `/qa` skill does the testing; these rules decide the browser, the
data and the scope.

### 1. A visible test browser — the owner watches
- Open gstack's headed Chromium before testing: `$B connect` (the same `$B`
  daemon, `Mode: headed`; see the `/open-gstack-browser` skill). It is a separate
  Chromium, NOT the owner's Chrome: never assume their sessions or cookies.
- If `$B connect` fails (stale daemon / `SingletonLock` in
  `~/.gstack/chromium-profile`), kill the stale daemon and orphaned Chromium,
  remove the lock, retry. Only then fall back to headless and SAY so.
- A sign-in wall the agent may not cross (a real identity provider, 2FA):
  `$B handoff "<why>"`, the owner signs in, `$B resume`. Never type the owner's
  real passwords. Seeded LOCAL demo credentials documented in the repo are fine.
- `$B disconnect` at the end, so the next run starts clean.

### 2. Start from an empty LOCAL database
- Full-app `/qa` (no narrower scope asked) starts by wiping the LOCAL database
  with the project's own reset command (Makefile / package script / reset SQL —
  read the repo's CLAUDE.md, DEMO or runbook docs first). Keep only what login
  needs (the owner/admin user and roles); everything else goes.
- **Ask the owner before wiping** (it is data deletion): say which DB, which command and
  what survives; wipe only after an explicit yes. A "no" → diff-aware run on current data.
- LOCAL only. Before wiping, verify the target is the local stack (localhost /
  docker compose). Never a shared, staging or production database — not even
  if an env var points there.
- A diff-aware `/qa` on a branch may keep the current data; say which was used.

### 3. Populate THROUGH the browser, like a user
- After the wipe, create the data by using the app in the visible browser, in
  the order a real business would: configuration → catalogs → people →
  daily operations → money → reports. No seed scripts, no SQL inserts for the
  data under test: the point is that every create form works end to end.
- Create enough to exercise each screen (e.g. several records per table, one per
  status that matters) and use it: edit, void, filter, export, print.
- When the UI cannot create something (an external invite, a hardware step),
  say so in the report and use the smallest documented workaround.

### 4. Walk every flow, then report
- Every module the flags enable, as each role that matters. Check the console
  and network for errors on every page; screenshot evidence into
  `.gstack/qa-reports/screenshots/`.
- Fix per the /qa skill (atomic commits, regression test first — tdd.md), on a
  branch (git-workflow.md Regla 0), never on dev/main/master.
- Report in `.gstack/qa-reports/qa-report-<target>-<date>.md`: what was wiped,
  what was created through the UI, each flow's result, issues fixed/deferred,
  environment problems kept apart from app bugs.
