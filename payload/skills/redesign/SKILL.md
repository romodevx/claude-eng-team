---
name: redesign
description: Redesign an existing screen to be more intuitive WITHOUT changing behavior, chaining the design skills in order (diagnose → variants → plan → TDD build behind a flag → QA). Use on /redesign <screen or route>, or when the user says "rediseña esta pantalla", "no es intuitiva", "mejora el diseño de", "hazla más fácil de usar".
---

# Redesign a screen (behavior frozen)

Input: `/redesign <screen name or route> [who uses it / what feels wrong]`.
Missing screen → ask for it. Missing users → infer from the repo's CLAUDE.md/docs;
ask only if nothing says who uses the app.

**The one hard constraint:** no change to functionality, endpoints, contracts, data,
permissions or business rules. Layout, hierarchy, copy, order, grouping and motion may
change. If a real improvement needs a behavior change, list it as a separate
proposal for the owner — never fold it in.

## 0. Baseline (before touching anything)
- Branch first (git-workflow Regla 0): `feature/redesign-<screen>` from `dev`, else
  `main`/`master`.
- Open the screen in the visible browser (`$B connect`, rules/qa-browser.md).
  Screenshot every state: empty, with data, error, loading → `.gstack/redesign/<screen>/before/`.
- Write the **behavior inventory** in `.gstack/redesign/<screen>/behavior.md`: every
  action on the screen, what it calls, what it changes, every state and message.
  This is the contract the redesign must keep.
- Check which existing tests cover those behaviors. Add **characterization tests** for
  any uncovered behavior now, green against the CURRENT UI, before any redesign
  (rules/tdd.md). They must keep passing at the end.

## 1. Diagnose — no code
- Run `/design-review` on the live screen in report mode (findings, no fixes yet).
- Check it against `~/.claude/rules/ui-forms-and-modals.md` and query `ui-ux-pro-max`
  (`--domain ux`, plus the product type) for the domain.
- Output: a numbered list of problems, each with evidence (screenshot or element) and
  the principle it breaks. Look specifically for: unclear first step / no setup order,
  duplicated actions, competing primary buttons, low-value content in the most visible
  spot, promises the screen doesn't keep, dead empty states.

## 2. Variants — owner picks (checkpoint 1)
- `/design-shotgun`: 3 genuinely different directions that all respect the behavior
  inventory, using the project's existing design system/tokens (don't invent a new
  brand). Open the comparison board.
- Stop. The owner picks one (or mixes). Do not continue without it.

## 3. Plan — owner approves (checkpoint 2)
- Write the plan for the chosen variant, then run `/plan-design-review` and
  `/plan-eng-review` on it. Include: files touched, components reused, flag key,
  tests to add, and the behavior inventory mapped to the new layout (every old action
  → where it lives now).
- Stop for approval.

## 4. Build
- Behind a feature flag (rules/feature-flags.md) so old and new can be compared;
  flag default OFF. Old screen stays intact until the owner retires it.
- TDD: failing component test first for each new piece (rules/tdd.md). Reuse existing
  handlers/hooks/API clients — the new UI calls exactly what the old one called.
- Copy: pass all new user-facing text through `humanizer`; keep the app's language.
- Motion: `find-animation-opportunities` to decide what (little) should move; build it
  with `animate`; check it with `/review-animations`. Respect prefers-reduced-motion.

## 5. Verify
- Characterization + new tests green, flag ON and OFF.
- `/qa` in the visible browser, flag ON: walk every item of `behavior.md`; screenshot
  the same states into `after/`. Any behavioral difference is a bug.
- `/design-review` again on the new screen; `/review` on the diff.
- Report to the owner: before/after screenshots side by side, problems from step 1
  and how each was solved, anything deferred, and the separate behavior-change
  proposals if any.
