'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { install } = require('../lib/install');
const { uninstall } = require('../lib/uninstall');

const PAYLOAD = path.join(__dirname, '..', 'payload');
const quiet = () => {};

function tempHome(existing = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-home-'));
  for (const [rel, content] of Object.entries(existing)) {
    const file = path.join(home, '.claude', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return home;
}

const read = (home, rel) => fs.readFileSync(path.join(home, '.claude', rel), 'utf8');
const exists = (home, rel) => fs.existsSync(path.join(home, '.claude', rel));
const baseOpts = (home, extra = {}) => ({
  home, payloadDir: PAYLOAD, owner: 'Ada', language: 'English', codex: false,
  allowBash: false, vendor: [], log: quiet, ...extra,
});

test('fresh install writes the team, a rendered CLAUDE.md and the guard hook', () => {
  const home = tempHome();
  install(baseOpts(home));
  assert.ok(exists(home, 'agents/architect.md'));
  assert.ok(exists(home, 'skills/story/SKILL.md'));
  assert.match(read(home, 'CLAUDE.md'), /^# Ada — Engineering Team/);
  assert.doesNotMatch(read(home, 'CLAUDE.md'), /\{\{|codex:start/);
  const settings = JSON.parse(read(home, 'settings.json'));
  assert.match(settings.hooks.PreToolUse[0].hooks[0].command, /guard-actions\.py/);
  assert.ok(fs.statSync(path.join(home, '.claude', 'bin', 'autonomy')).mode & 0o100);
});

test('hook commands point at the directory we installed into, not at $HOME/.claude', () => {
  const home = tempHome();
  install(baseOpts(home, { codex: true }));
  const settings = JSON.parse(read(home, 'settings.json'));
  const commands = Object.values(settings.hooks).flat().flatMap((e) => e.hooks.map((h) => h.command));
  const claudeDir = path.join(home, '.claude');
  for (const cmd of commands) {
    assert.ok(cmd.includes(`'${claudeDir}/hooks/`), `${cmd} should use ${claudeDir}`);
    assert.ok(!cmd.includes('$HOME'), cmd);
  }
});

test('CLAUDE_CONFIG_DIR is honoured when no --home is given', () => {
  const { resolveClaudeDir } = require('../lib/install');
  assert.equal(resolveClaudeDir({ home: '/h', env: { CLAUDE_CONFIG_DIR: '/cfg' } }), '/h/.claude');
  assert.equal(resolveClaudeDir({ env: { CLAUDE_CONFIG_DIR: '/cfg' } }), '/cfg');
  assert.equal(resolveClaudeDir({ env: {}, homedir: '/u' }), '/u/.claude');
});

test('codex files are skipped unless codex is enabled', () => {
  const home = tempHome();
  install(baseOpts(home));
  assert.ok(!exists(home, 'bin/codex-task'));
  assert.ok(!exists(home, 'rules/codex-first.md'));
  const home2 = tempHome();
  install(baseOpts(home2, { codex: true }));
  assert.ok(exists(home2, 'bin/codex-task'));
  assert.match(read(home2, 'CLAUDE.md'), /Handoff file/);
});

test('an existing CLAUDE.md is kept and imports ours', () => {
  const home = tempHome({ 'CLAUDE.md': '# Mine\nkeep me\n' });
  install(baseOpts(home));
  const mine = read(home, 'CLAUDE.md');
  assert.match(mine, /keep me/);
  assert.match(mine, /^@\.\/claude-eng-team\.md$/m);
  assert.match(read(home, 'claude-eng-team.md'), /Engineering Team/);
});

test('dry run writes nothing', () => {
  const home = tempHome();
  const report = install(baseOpts(home, { dryRun: true }));
  assert.ok(report.files.length > 50);
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'agents')));
});

test('reinstall is idempotent', () => {
  const home = tempHome({ 'settings.json': '{"model":"opus"}' });
  install(baseOpts(home));
  const first = read(home, 'settings.json');
  install(baseOpts(home));
  assert.equal(read(home, 'settings.json'), first);
});

test('uninstall restores the user exactly as before', () => {
  const before = {
    'CLAUDE.md': '# Mine\n',
    'settings.json': JSON.stringify({ model: 'opus', permissions: { allow: ['Read'] } }, null, 2) + '\n',
    'agents/architect.md': 'my own architect\n',
  };
  const home = tempHome(before);
  install(baseOpts(home, { allowBash: true, codex: true }));
  assert.notEqual(read(home, 'agents/architect.md'), before['agents/architect.md']);
  uninstall({ home, log: quiet });
  for (const [rel, content] of Object.entries(before)) assert.equal(read(home, rel), content, rel);
  assert.ok(!exists(home, 'agents/qa-sr.md'));
  assert.ok(!exists(home, 'claude-eng-team.md'));
  assert.ok(!exists(home, '.claude-eng-team'));
});

test('uninstall also removes Python bytecode left by running the hook tests (doctor)', () => {
  const home = tempHome();
  install(baseOpts(home));
  execFileSync('python3', ['-I', path.join(home, '.claude', 'hooks', 'tests', 'test_guard_actions.py')], { stdio: 'pipe' });
  uninstall({ home, log: quiet });
  // .claude did not exist before: nothing at all is left, not even the folder.
  assert.ok(!fs.existsSync(path.join(home, '.claude')));
});

const brokenVendor = (home) => [{ name: 'gone', repo: 'acme/gone', url: `file://${home}/does-not-exist`, path: 'x', commit: 'a'.repeat(40) }];

test('a failed install keeps the user recoverable: state is saved as it goes', () => {
  const home = tempHome({ 'rules/testing.md': 'my testing rule\n' });
  assert.throws(() => install(baseOpts(home, { vendor: brokenVendor(home), cacheDir: path.join(home, 'c') })));
  assert.ok(exists(home, '.claude-eng-team/state.json'), 'state saved before the failure');
  install(baseOpts(home)); // the user retries without the broken group
  uninstall({ home, log: quiet });
  assert.equal(read(home, 'rules/testing.md'), 'my testing rule\n');
});

test('a backup is never overwritten', () => {
  const home = tempHome({ 'rules/testing.md': 'original\n' });
  install(baseOpts(home));
  fs.rmSync(path.join(home, '.claude', '.claude-eng-team', 'state.json'));
  install(baseOpts(home)); // lost state: would back up our copy over the user's original
  assert.equal(read(home, '.claude-eng-team/backup/rules/testing.md'), 'original\n');
});

test('files the user edited after installing are never lost', () => {
  const home = tempHome({ 'rules/testing.md': 'original\n' });
  install(baseOpts(home));
  fs.writeFileSync(path.join(home, '.claude', 'agents', 'qa-sr.md'), 'my tuned qa agent\n');
  fs.writeFileSync(path.join(home, '.claude', 'rules', 'testing.md'), 'tuned after install\n');
  install(baseOpts(home)); // update: must not clobber edits
  assert.equal(read(home, 'agents/qa-sr.md'), 'my tuned qa agent\n');
  assert.ok(exists(home, 'agents/qa-sr.md.claude-eng-team-new'), 'new version offered beside it');
  uninstall({ home, log: quiet });
  assert.equal(read(home, 'agents/qa-sr.md'), 'my tuned qa agent\n', 'edited file kept');
  assert.equal(read(home, 'rules/testing.md'), 'original\n', 'backup restored');
  assert.equal(read(home, 'rules/testing.md.claude-eng-team-edited'), 'tuned after install\n', 'edit saved aside');
});

test('hostile manifest entries are rejected before anything is written', () => {
  for (const bad of [
    { name: '../agents', repo: 'a/b', path: 'x' },
    { name: 'ok', repo: 'a/b/../..', path: 'x' },
    { name: 'ok', repo: 'a/b', path: '../../etc' },
    { name: 'ok', repo: 'a/b', path: '/etc' },
  ]) {
    const home = tempHome();
    const entry = { commit: 'a'.repeat(40), url: 'file:///nowhere', ...bad };
    assert.throws(() => install(baseOpts(home, { vendor: [entry] })), /invalid/i, JSON.stringify(bad));
    assert.ok(!exists(home, 'agents'), 'nothing written');
  }
});

test('symlinks inside a fetched skill are not copied', () => {
  const { url, pinned, dir } = fixtureRepo({ symlink: true });
  const home = tempHome();
  install(baseOpts(home, { vendor: [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }], cacheDir: path.join(home, 'c') }));
  assert.ok(exists(home, 'skills/demo/SKILL.md'));
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'skills', 'demo', 'secret')), `symlink from ${dir} skipped`);
});

test('hook commands work from a directory with spaces, $ and quotes', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "cet weird $HOME 'q' "));
  install(baseOpts(home));
  const settings = JSON.parse(read(home, 'settings.json'));
  const command = settings.hooks.PreToolUse[0].hooks[0].command;
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm install left-pad' }, cwd: home });
  const out = execFileSync('sh', ['-c', command], { input: payload }).toString();
  assert.match(out, /"permissionDecision": "ask"/);
});

test('a user hook that mentions the same script name is not ours', () => {
  const mine = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'python3 /opt/mine/hooks/guard-actions.py' }] }] } };
  const home = tempHome({ 'settings.json': JSON.stringify(mine) });
  install(baseOpts(home));
  uninstall({ home, log: quiet });
  assert.deepEqual(JSON.parse(read(home, 'settings.json')), mine);
});

test('CRLF CLAUDE.md: one import line, removed cleanly', () => {
  const original = '# Mine\r\nline two\r\n';
  const home = tempHome({ 'CLAUDE.md': original });
  install(baseOpts(home));
  install(baseOpts(home));
  assert.equal(read(home, 'CLAUDE.md').split(/\r?\n/).filter((l) => l === '@./claude-eng-team.md').length, 1);
  uninstall({ home, log: quiet });
  assert.equal(read(home, 'CLAUDE.md'), original);
});

test('re-installing with fewer options removes what is no longer wanted', () => {
  const home = tempHome();
  install(baseOpts(home, { codex: true, allowBash: true }));
  install(baseOpts(home, { codex: false, allowBash: false }));
  assert.ok(!exists(home, 'bin/codex-task'));
  assert.ok(!exists(home, 'rules/codex-first.md'));
  const settings = JSON.parse(read(home, 'settings.json'));
  assert.equal(settings.permissions, undefined);
  assert.equal(settings.hooks.StopFailure, undefined);
});

test('an invalid settings.json stops the install before anything is written', () => {
  const home = tempHome({ 'settings.json': '{ not json' });
  assert.throws(() => install(baseOpts(home)), /settings\.json/);
  assert.ok(!exists(home, 'agents'));
});

function fixtureRepo({ symlink = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-upstream-'));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' }).toString().trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  git('config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'skills', 'demo'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'demo', 'SKILL.md'), 'pinned version\n');
  if (symlink) fs.symlinkSync('/etc/hosts', path.join(dir, 'skills', 'demo', 'secret'));
  git('add', '-A');
  git('commit', '-qm', 'v1');
  const pinned = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, 'skills', 'demo', 'SKILL.md'), 'newer unreviewed version\n');
  git('commit', '-qam', 'v2');
  return { url: `file://${dir}`, pinned, dir };
}

test('third-party skills come from upstream at the pinned commit, and uninstall removes them', () => {
  const { url, pinned } = fixtureRepo();
  const home = tempHome();
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  install(baseOpts(home, { vendor, cacheDir: path.join(home, 'cache') }));
  assert.equal(read(home, 'skills/demo/SKILL.md'), 'pinned version\n');
  uninstall({ home, log: quiet });
  assert.ok(!exists(home, 'skills/demo'));
});

test('a third-party skill never overwrites a skill the user already has', () => {
  const { url, pinned } = fixtureRepo();
  const home = tempHome({ 'skills/demo/SKILL.md': 'mine\n' });
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  const report = install(baseOpts(home, { vendor, cacheDir: path.join(home, 'cache') }));
  assert.equal(read(home, 'skills/demo/SKILL.md'), 'mine\n');
  assert.deepEqual(report.vendorSkipped, ['demo']);
});

test('CLAUDE_CONFIG_DIR: installed docs and scripts point at that dir, not ~/.claude', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-cfg-'));
  install(baseOpts(undefined, { home: undefined, env: { CLAUDE_CONFIG_DIR: cfg }, codex: true }));
  const offenders = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '.claude-eng-team' ? null : walk(full);
    if (fs.readFileSync(full, 'utf8').includes('~/.claude/')) offenders.push(path.relative(cfg, full));
  });
  walk(cfg);
  assert.deepEqual(offenders, []);
  assert.match(fs.readFileSync(path.join(cfg, 'CLAUDE.md'), 'utf8'), new RegExp(`${cfg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/bin/autonomy`));
  uninstall({ env: { CLAUDE_CONFIG_DIR: cfg }, log: quiet });
  assert.deepEqual(fs.readdirSync(cfg), []);
});

test('the codex fallback hook finds codex-task next to itself, wherever it is installed', () => {
  const src = fs.readFileSync(path.join(PAYLOAD, 'hooks', 'codex-fallback.py'), 'utf8');
  assert.doesNotMatch(src, /Path\.home\(\) \/ "\.claude/);
});

test('the suite runs in a sandbox home, never the real one', () => {
  const { SANDBOX, REAL_HOME } = require('./sandbox');
  assert.equal(os.homedir(), SANDBOX);
  assert.notEqual(os.homedir(), REAL_HOME);
  assert.ok(require('../lib/install').resolveClaudeDir().startsWith(SANDBOX));
});

test('--no-codex: no installed doc mentions Codex', () => {
  const home = tempHome();
  install(baseOpts(home, { codex: false }));
  const offenders = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '.claude-eng-team' ? null : walk(full);
    if (/codex/i.test(fs.readFileSync(full, 'utf8'))) offenders.push(path.relative(home, full));
  });
  walk(path.join(home, '.claude'));
  assert.deepEqual(offenders, []);
});

test('dry run lists every change: new files, replaced files (backed up), CLAUDE.md and settings', () => {
  const home = tempHome({ 'agents/pm.md': 'mine', 'CLAUDE.md': '# me', 'settings.json': '{}' });
  const report = install(baseOpts(home, { dryRun: true }));
  const action = (rel) => report.plan.find((p) => p.rel === rel)?.action;
  assert.equal(action('agents/pm.md'), 'replace');
  assert.equal(action('agents/architect.md'), 'new');
  assert.equal(action('CLAUDE.md'), 'import');
  assert.equal(action('settings.json'), 'merge');
  assert.equal(read(home, 'agents/pm.md'), 'mine');
  assert.ok(!exists(home, '.claude-eng-team'));
});

/** Every path under dir with its content hash: two equal snapshots mean an identical tree. */
function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const rel = path.relative(dir, full);
      if (fs.lstatSync(full).isDirectory()) {
        out[rel + '/'] = 'dir';
        walk(full);
      } else {
        out[rel] = require('node:crypto').createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      }
    }
  };
  walk(dir);
  return out;
}

test('uninstall leaves the home byte-identical: download cache and created folders are gone too', () => {
  const { url, pinned } = fixtureRepo();
  const home = tempHome({ 'settings.json': '{"model":"opus"}\n', 'CLAUDE.md': '# me\n' });
  fs.writeFileSync(path.join(home, '.zshrc'), 'export A=1\n');
  const before = snapshot(home);
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  install(baseOpts(home, { vendor, env: {} })); // default cache: <home>/.cache/claude-eng-team
  assert.ok(fs.existsSync(path.join(home, '.cache', 'claude-eng-team')), 'the cache lives under the target home');
  uninstall({ home, env: {}, log: quiet });
  assert.deepEqual(snapshot(home), before);
});

test('dry run on an installed home: unchanged files are "same", files you edited are "keep"', () => {
  const home = tempHome();
  install(baseOpts(home));
  fs.appendFileSync(path.join(home, '.claude', 'rules', 'testing.md'), '\nmy note\n');
  const report = install(baseOpts(home, { dryRun: true }));
  const action = (rel) => report.plan.find((p) => p.rel === rel)?.action;
  assert.equal(action('rules/testing.md'), 'keep');
  assert.equal(action('agents/architect.md'), 'same');
  assert.ok(!report.plan.some((p) => p.action === 'update'), 'nothing changed in the package');
  const changed = install(baseOpts(home, { dryRun: true, owner: 'Grace' }));
  assert.equal(changed.plan.find((p) => p.rel === 'CLAUDE.md').action, 'update');
});

test('relocate: the dir is inserted literally and only whole ~/.claude paths move', () => {
  const { relocate } = require('../lib/install');
  assert.equal(relocate('see ~/.claude/rules', '/tmp/a$&b'), 'see /tmp/a$&b/rules');
  assert.equal(relocate('`~/.claude` and ~/.claude.json and ~/.claude-eng-team', '/x'), '`/x` and ~/.claude.json and ~/.claude-eng-team');
});

test('uninstall never deletes a claude-eng-team folder that is not our cache', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-cwd-'));
  const mine = path.join(work, 'claude-eng-team');
  fs.mkdirSync(mine);
  fs.writeFileSync(path.join(mine, 'mywork.txt'), 'precious');
  const { url, pinned } = fixtureRepo();
  const home = tempHome();
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  const cwd = process.cwd();
  process.chdir(work);
  try {
    // A relative XDG_CACHE_HOME is invalid per the XDG spec: it must be ignored.
    try { install(baseOpts(home, { vendor, env: { XDG_CACHE_HOME: '.' } })); } catch { /* recoverable */ }
    uninstall({ home, env: { XDG_CACHE_HOME: '.' }, log: quiet });
  } finally {
    process.chdir(cwd);
  }
  assert.equal(fs.readFileSync(path.join(mine, 'mywork.txt'), 'utf8'), 'precious');
});

test('uninstall of one home keeps a cache it did not create', () => {
  const { url, pinned } = fixtureRepo();
  const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-xdg-'));
  fs.mkdirSync(path.join(shared, 'claude-eng-team'));
  fs.writeFileSync(path.join(shared, 'claude-eng-team', 'other-install'), 'x');
  const home = tempHome();
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  install(baseOpts(home, { vendor, env: { XDG_CACHE_HOME: shared } }));
  uninstall({ home, env: {}, log: quiet });
  assert.ok(fs.existsSync(path.join(shared, 'claude-eng-team', 'other-install')));
});

test('dry run: a skill you already have is "yours"; an edit equal to the new version is "same"', () => {
  const home = tempHome({ 'skills/demo/SKILL.md': 'mine\n' });
  install(baseOpts(home));
  const ours = read(home, 'agents/architect.md');
  fs.writeFileSync(path.join(home, '.claude', 'agents', 'architect.md'), ours); // rewritten, same bytes
  const vendor = [{ name: 'demo', repo: 'acme/demo', url: 'file:///x', path: 'skills/demo', commit: 'a'.repeat(40) },
    { name: 'other', repo: 'acme/other', url: 'file:///x', path: 'skills/other', commit: 'b'.repeat(40) }];
  const { plan } = install(baseOpts(home, { dryRun: true, vendor }));
  const action = (rel) => plan.find((p) => p.rel === rel)?.action;
  assert.equal(action('skills/demo'), 'yours');
  assert.equal(action('skills/other'), 'skill');
  assert.equal(action('agents/architect.md'), 'same');
});

test('uninstall removes the repos it cloned into a cache folder that already existed', () => {
  const { url, pinned } = fixtureRepo();
  const xdg = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-xdg-'));
  fs.mkdirSync(path.join(xdg, 'claude-eng-team'));
  fs.writeFileSync(path.join(xdg, 'claude-eng-team', 'foreign'), 'x');
  const home = tempHome();
  const vendor = [{ name: 'demo', repo: 'acme/demo', url, path: 'skills/demo', commit: pinned }];
  install(baseOpts(home, { vendor, env: { XDG_CACHE_HOME: xdg } }));
  assert.ok(fs.existsSync(path.join(xdg, 'claude-eng-team', 'acme__demo')));
  uninstall({ home, env: {}, log: quiet });
  assert.deepEqual(fs.readdirSync(path.join(xdg, 'claude-eng-team')), ['foreign']);
});
