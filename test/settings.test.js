'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeSettings, unmergeSettings, HOOKS } = require('../lib/settings');

const userSettings = () => ({
  model: 'opus',
  permissions: { allow: ['Read'], defaultMode: 'default' },
  hooks: {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-own-hook.sh' }] }],
  },
});

test('merge keeps every existing user setting and hook', () => {
  const out = mergeSettings(userSettings(), { codex: false, allowBash: false });
  assert.equal(out.model, 'opus');
  assert.deepEqual(out.permissions.allow, ['Read']);
  const commands = out.hooks.PreToolUse.flatMap((e) => e.hooks.map((h) => h.command));
  assert.ok(commands.includes('my-own-hook.sh'));
  assert.ok(commands.some((c) => c.includes(HOOKS.guard)));
});

test('guard hook runs first so its deny/ask wins', () => {
  const out = mergeSettings(userSettings(), { codex: false, allowBash: false });
  assert.ok(out.hooks.PreToolUse[0].hooks[0].command.includes(HOOKS.guard));
});

test('codex hooks only when codex is enabled', () => {
  const without = mergeSettings({}, { codex: false, allowBash: false });
  assert.equal(without.hooks.StopFailure, undefined);
  const withCodex = mergeSettings({}, { codex: true, allowBash: false });
  assert.equal(withCodex.hooks.StopFailure[0].matcher, 'rate_limit|billing_error');
  assert.ok(withCodex.hooks.SessionStart[0].hooks[0].command.includes(HOOKS.codex));
});

test('allowBash adds the Bash allow rule once', () => {
  const once = mergeSettings(userSettings(), { codex: false, allowBash: true });
  const twice = mergeSettings(once, { codex: false, allowBash: true });
  assert.deepEqual(twice.permissions.allow, ['Read', 'Bash']);
});

test('merge is idempotent', () => {
  const once = mergeSettings(userSettings(), { codex: true, allowBash: true });
  const twice = mergeSettings(once, { codex: true, allowBash: true });
  assert.deepEqual(twice, once);
});

test('unmerge restores the original settings', () => {
  const original = userSettings();
  const merged = mergeSettings(userSettings(), { codex: true, allowBash: true });
  const restored = unmergeSettings(merged, { addedBashAllow: true });
  assert.deepEqual(restored, original);
});

test('unmerge keeps a Bash rule the user had before', () => {
  const mine = { permissions: { allow: ['Bash'] } };
  const merged = mergeSettings(mine, { codex: false, allowBash: true });
  const restored = unmergeSettings(merged, { addedBashAllow: false });
  assert.deepEqual(restored.permissions.allow, ['Bash']);
});
