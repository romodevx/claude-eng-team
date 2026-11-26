'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('../lib/render');

const PAYLOAD = path.join(__dirname, '..', 'payload');
// Bytes Claude Code loads on EVERY turn: CLAUDE.md plus each rule without a `paths:` scope.
// Raise it only with a CHANGELOG note: every byte here is paid on every turn of every session.
const ALWAYS_LOADED_BUDGET = 13000;

const isPathScoped = (text) => /^---\n[\s\S]*?^paths:/m.test(text);

function alwaysLoaded({ codex }) {
  const opts = { owner: 'Owner', language: 'English', codex };
  const rules = fs.readdirSync(path.join(PAYLOAD, 'rules'))
    .filter((f) => codex || f !== 'codex-first.md') // installed only with Codex
    .map((f) => fs.readFileSync(path.join(PAYLOAD, 'rules', f), 'utf8'))
    .filter((text) => !isPathScoped(text));
  return [fs.readFileSync(path.join(PAYLOAD, 'CLAUDE.md'), 'utf8'), ...rules]
    .map((text) => Buffer.byteLength(render(text, opts)))
    .reduce((a, b) => a + b, 0);
}

for (const codex of [true, false]) {
  test(`always-loaded context stays within budget (codex=${codex})`, () => {
    const bytes = alwaysLoaded({ codex });
    assert.ok(bytes <= ALWAYS_LOADED_BUDGET, `${bytes} bytes > budget ${ALWAYS_LOADED_BUDGET}`);
  });
}

test('the context-budget rule ships and CI watching is documented', () => {
  assert.ok(fs.existsSync(path.join(PAYLOAD, 'rules', 'context-budget.md')));
  assert.match(fs.readFileSync(path.join(PAYLOAD, 'standards', 'ci-local.md'), 'utf8'), /Watching CI runs/);
});
