---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.vue"
  - "**/*.svelte"
---
## UI Forms & Modals Rules (record creation)

Verified: 2026-10-09 · Review by: 2027-01-07 (90 days) · Evidence and sources:
`~/.claude/reference/research-modals-forms-2026.md`. Read it before arguing with any line.
Lines marked *(house)* are our own stricter choice or professional judgement, not a
cited standard. Everything else traces to a source in the evidence file.

### Container is chosen by field count, never by importance *(house thresholds)*
- 1–4 fields, entered repeatedly → inline editable row in the module's own table. No dialog.
- 5–6 fields → drawer/dialog; height fits its content, never a full-viewport panel.
- \> 6 fields, or it needs scroll, or it has steps → its own page. The drawer never grows.
- One dialog at a time; never nested. No horizontal scroll inside a dialog — that is the
  signal it should have been a page.
- Field order in the create form = column order in the table it feeds.

### Layout
- SINGLE COLUMN, always. `column-count` / newspaper flow is banned in form CSS (Baymard).
- Side-by-side pairs only for one logical entity (start/end date, amount/currency).
- Visible label above every field; a placeholder is never a label. Mark required fields
  (or the optional ones — whichever is fewer) in text, not color alone.
- Correct `type`, `inputmode` and `autocomplete` on every input; accept flexible formats
  (dates and amounts with or without separators).
- Progressive disclosure: what the 80% case doesn't need starts collapsed.
- Solid surfaces behind forms — no glass/blur (a dimmed solid backdrop is fine).
- Comfortable density by default; input text ≥ 16 px; labels ≥ 4.5:1 contrast.
- Targets ≥ 44×44 px *(house: WCAG 2.2 AA only requires 24×24; we design for older users)*.

### Validation and errors
- Required-but-empty errors appear on SUBMIT only. Format errors (email, date, amount) may
  appear on `blur` once the field has a value; after an error shows, re-check on every
  keystroke and clear it the moment it's valid. Never validate while the user is still
  typing a fresh value. Style with `:user-invalid`, not `:invalid`.
- On a failed submit: error summary at the top of the form, focus moves to it, each item
  links to its field; inline errors stay, same wording, wired with `aria-describedby`.
- Server validation is the authority; client checks are UX only.

### Actions
- NEVER disable the primary button — not for validation, not while saving (it also breaks
  Enter-to-submit). While saving: show a busy state and ignore repeat clicks; the server
  is idempotent against double submit.
- Footer: one primary, "Save and create another" as secondary on repetitive entry, Cancel
  as text. "Save and create another" keeps the context fields, clears the rest, refocuses
  the first field.
- Reversible delete: do it, then offer Undo. The undo toast does NOT auto-dismiss (or Undo
  is also reachable from a persistent place, e.g. the row or a "recently deleted" view);
  toast container is `role="status"`. Confirmation dialogs only for the irreversible.
- Prefill every default you can (active cycle, the context you came from, today, currency)
  so the happy path is one click.

### Dialog mechanics — native first
- Use native `<dialog>` + `showModal()`: it gives top layer, inert background, Esc to close
  and focus return to the trigger. Hand-roll `role="dialog"` + `aria-modal` + focus trap
  ONLY when the component library can't use `<dialog>`; then follow the WAI-ARIA APG
  dialog pattern exactly, including returning focus to the trigger.
- Label it by its visible title. Initial focus on the first field (`autofocus`).
- Esc closes; ask first only when there are unsaved changes.
- Enter submits from single-line fields; never from a `textarea` (Enter = newline there).
  Cmd/Ctrl+Enter submits from any field *(house convention)*.
- Don't depend on `closedby` (not Baseline in Oct 2026); `command`/`commandfor` is OK.
- WCAG 2.2 · 2.4.11: a sticky header/footer must never cover the focused field
  (`scroll-padding` / scroll it clear).
- WCAG 2.2 · 3.3.7: never re-ask for something already chosen on the page behind.

### What "fewest clicks" actually means
Fewer decisions and fewer waits — not everything crammed onto one screen. The 3-click rule
is disproven (NN/g). Buy speed with defaults, inline rows, save-and-new, undo, and a single
unambiguous reading order. Never by compressing a form.

### Keeping this rule current
- When "Review by" has passed, run the refresh before relying on browser-support or
  standards lines: re-verify each source in the evidence file, update both files, bump
  both dates. Watch list: WCAG 3.0 (Working Draft as of 2026-03), EN 301 549 V4.1.1
  (WCAG 2.2 AA; EU Official Journal citation expected ~2026-11), `closedby` Baseline.
- The `ui-ux-pro-max` skill is a style/palette catalog; where its UX rows disagree with
  this file (confirm-every-delete, 3–5 s toasts, disable-while-loading, blur backdrops),
  this file wins.
