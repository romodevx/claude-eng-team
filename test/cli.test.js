'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const run = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], {
  encoding: 'utf8', env: { ...process.env, ...env },
});
const tempHome = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cet-cli-'));
const quick = ['--yes', '--skills', 'none', '--no-codex', '--owner', 'Ada'];

test('doctor exits non-zero when a check fails', () => {
  const home = tempHome();
  const r = run(['doctor', '--home', home]); // nothing installed there
  assert.match(r.stdout, /✗ claude-eng-team installed/);
  assert.notEqual(r.status, 0);
});

test('doctor exits zero on a healthy install', () => {
  const home = tempHome();
  assert.equal(run(['install', ...quick, '--home', home]).status, 0);
  const r = run(['doctor', '--home', home]);
  const failed = r.stdout.split('\n').filter((l) => l.startsWith('✗'));
  // `claude` may be missing on a CI runner; everything else must pass
  assert.deepEqual(failed.filter((l) => !/Claude Code CLI/.test(l)), []);
  assert.equal(r.status, failed.length ? 1 : 0);
});

test('dry run names every file and what happens to it', () => {
  const home = tempHome();
  fs.mkdirSync(path.join(home, '.claude', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'agents', 'pm.md'), 'mine');
  const r = run(['install', ...quick, '--dry-run', '--home', home]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /replace .*agents\/pm\.md.*backed up/);
  assert.match(r.stdout, /new +agents\/architect\.md/);
  assert.match(r.stdout, /settings\.json/);
  assert.match(r.stdout, /Nothing changed/);
  assert.equal(fs.readFileSync(path.join(home, '.claude', 'agents', 'pm.md'), 'utf8'), 'mine');
});

test('a failure halfway explains how to recover', { skip: process.getuid?.() === 0 && 'root ignores permissions' }, () => {
  const home = tempHome();
  const agents = path.join(home, '.claude', 'agents');
  fs.mkdirSync(agents, { recursive: true });
  fs.writeFileSync(path.join(agents, 'pm.md'), 'mine');
  fs.chmodSync(path.join(agents, 'pm.md'), 0o444);
  fs.chmodSync(agents, 0o555);
  try {
    const r = run(['install', ...quick, '--home', home]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /npx claude-eng-team uninstall/);
    assert.match(r.stderr, /backed up/);
  } finally {
    fs.chmodSync(agents, 0o755);
  }
});

test('doctor names a missing guard hook', () => {
  const home = tempHome();
  assert.equal(run(['install', ...quick, '--home', home]).status, 0);
  fs.rmSync(path.join(home, '.claude', 'hooks', 'guard-actions.py'));
  const r = run(['doctor', '--home', home]);
  assert.match(r.stdout, /✗ guard hook installed/);
  assert.notEqual(r.status, 0);
});

test('detecting codex and claude never runs them (they write state in $HOME)', () => {
  const home = tempHome();
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-bin-'));
  const marker = path.join(bin, 'ran');
  for (const name of ['codex', 'claude']) {
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\necho ${name} >> "${marker}"\n`, { mode: 0o755 });
  }
  const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  run(['install', '--yes', '--skills', 'none', '--owner', 'Ada', '--dry-run', '--home', home], env);
  const r = run(['doctor', '--home', home], env);
  assert.match(r.stdout, /✓ codex/);
  assert.ok(!fs.existsSync(marker), 'codex/claude were executed');
});

test('with CLAUDE_CONFIG_DIR, the printed next steps point at that dir', () => {
  const home = tempHome();
  const dir = path.join(home, 'cfg');
  const r = run(['install', ...quick], { HOME: home, CLAUDE_CONFIG_DIR: dir });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes('~/.claude'), r.stdout);
});

test('the recovery hint quotes a --home with spaces, and an error before any write says so', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cet cli '));
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{ broken');
  const r = run(['install', ...quick, '--home', home]);
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.stderr, /stopped halfway/);
  assert.match(r.stderr, /not valid JSON/);
  if (process.getuid?.() === 0) return; // root ignores the read-only folder below (act, containers)
  const agents = path.join(home, '.claude', 'agents');
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), '{}');
  fs.mkdirSync(agents);
  fs.writeFileSync(path.join(agents, 'pm.md'), 'mine');
  fs.chmodSync(agents, 0o555);
  try {
    const r2 = run(['install', ...quick, '--home', home]);
    assert.ok(r2.stderr.includes(`uninstall --home '${home}'`), r2.stderr);
  } finally {
    fs.chmodSync(agents, 0o755);
  }
});
