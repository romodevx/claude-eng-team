# Security policy

claude-eng-team installs configuration and two local Python hooks into `~/.claude`. Its
security-relevant parts are the approval guard (`payload/hooks/guard-actions.py`) and the
installer that fetches third-party skills at pinned commits (`lib/vendor.js`).

Please report vulnerabilities **privately** via GitHub → Security → *Report a vulnerability*
on this repository. Don't open a public issue. You'll get an answer within 7 days.

In scope: a way to make the guard allow something it should ask about or block; the installer
writing outside `~/.claude` or the cache, or installing code other than the pinned commit; any
secret or personal data in the package. A problem inside a third-party skill belongs to its
author (see CREDITS.md) — tell us too, so we can unpin it.
