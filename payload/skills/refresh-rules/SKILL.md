---
name: refresh-rules
description: Re-verify a global rule in ~/.claude/rules against its sources and propose an updated version. Use on /refresh-rules, when the SessionStart hook reports a rule past its "Review by" date, or when the user says "actualiza mis reglas", "refresh rules", "¿siguen vigentes mis reglas?".
---

# Refresh rules

Keeps rules that carry a `Verified: … · Review by: …` header current. Nothing is
edited without the owner's approval.

## 1. Pick the targets
- Argument given (`/refresh-rules ui-forms-and-modals`) → that rule.
- No argument → every `~/.claude/rules/*.md` whose `Review by` date has passed
  (same check as `~/.claude/hooks/rules-freshness.sh`). None stale → say so and stop.

## 2. Gather what the rule claims
- Read the rule and its evidence file (the path named in its header, under
  `~/.claude/reference/`). List every claim that depends on the outside world:
  standards (WCAG, EN 301 549), browser support / Baseline, design-system guidance,
  studies, and every item on the rule's "Watch list".
- Lines marked *(house)* are the owner's own decisions: don't "correct" them from
  sources; only flag one if new evidence clearly contradicts it.

## 3. Re-verify (background research agent)
Dispatch one `general-purpose` agent with the claim list. It must check primary
sources (W3C/WHATWG/MDN, the design systems themselves, NN/g, Baymard), search for
anything new since the `Verified` date, and report per claim: still true / changed /
new, source URL, and "read" vs "snippet". It edits no files.

## 4. Propose — human checkpoint
- Back up first: `~/.claude/backups/rules-refresh-<YYYYMMDD>/` (rule + evidence file).
- Write the proposed rule to the session scratchpad and show the owner a short
  changelog: what changed, why, source. Keep the rule about the same size — it loads
  into every session; detail belongs in the evidence file.
- Anything that is a judgment call (thresholds, conflicting sources) → AskUserQuestion
  with a recommendation. Do not decide it silently.

## 5. Apply (only after approval)
- Install the rule; add a dated "Update <date>" section with its sources to
  the evidence file (it prevails over older sections; never delete history).
- Bump `Verified` to today and `Review by` to today + 90 days in both files.
- Update the rule's Watch list with whatever is still pending.
- Run `~/.claude/hooks/rules-freshness.sh` with `TODAY` set past the new date to
  confirm the hook still parses the header.
