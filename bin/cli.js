#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { install, resolveClaudeDir, displayDir, relocate } = require('../lib/install');
const { uninstall } = require('../lib/uninstall');
const { loadState } = require('../lib/state');
const { createPrompter } = require('../lib/prompt');

const ROOT = path.join(__dirname, '..');
const PAYLOAD = path.join(ROOT, 'payload');
const MANIFEST = path.join(ROOT, 'vendor', 'manifest.json');
const { version } = require('../package.json');

const HELP = `claude-eng-team ${version} — an engineering team for Claude Code

Usage:
  npx claude-eng-team                 interactive install (safe: backs up what it touches)
  npx claude-eng-team install [opts]  install or update
  npx claude-eng-team uninstall       remove it and restore your previous files
  npx claude-eng-team doctor          check prerequisites and the installation
  npx claude-eng-team credits         list third-party skills, authors and licenses

Install options:
  -y, --yes             no questions; use defaults (core + recommended skill groups)
  --dry-run             show what would change, write nothing
  --owner <name>        your name, used in CLAUDE.md          (default: OS user)
  --language <lang>     language Claude talks to you in       (default: English)
  --codex / --no-codex  Codex CLI delegation + quota handoff  (default: auto-detect)
  --allow-bash          allow every Bash command without prompts; the guard still asks for
                        installs, merges to dev/main, deploys and data deletion
  --skills <list>       third-party skill groups: all | none | group,group (default: recommended)
  --home <dir>          install into <dir>/.claude (default: $CLAUDE_CONFIG_DIR or ~/.claude)
`;

function parseArgs(argv) {
  const opts = { command: 'install', interactive: process.stdin.isTTY && process.stdout.isTTY };
  const args = [...argv];
  if (args[0] && !args[0].startsWith('-')) opts.command = args.shift();
  const value = (flag) => {
    const v = args.shift();
    if (!v || v.startsWith('--')) throw new Error(`${flag} needs a value`);
    return v;
  };
  while (args.length) {
    const arg = args.shift();
    if (arg === '-y' || arg === '--yes') opts.interactive = false;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--owner') opts.owner = value(arg);
    else if (arg === '--language') opts.language = value(arg);
    else if (arg === '--codex') opts.codex = true;
    else if (arg === '--no-codex') opts.codex = false;
    else if (arg === '--allow-bash') opts.allowBash = true;
    else if (arg === '--skills') opts.skills = value(arg);
    else if (arg === '--home') opts.home = path.resolve(value(arg));
    else if (arg === '-h' || arg === '--help') opts.command = 'help';
    else if (arg === '-v' || arg === '--version') opts.command = 'version';
    else throw new Error(`unknown option: ${arg}`);
  }
  return opts;
}

const has = (cmd, args = ['--version']) => {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** Found on PATH, without running it: `codex --version` writes state under $HOME. */
const onPath = (cmd) => (process.env.PATH || '').split(path.delimiter).filter(Boolean).some((dir) => {
  try {
    fs.accessSync(path.join(dir, cmd), fs.constants.X_OK);
    return fs.statSync(path.join(dir, cmd)).isFile();
  } catch {
    return false;
  }
});
const shellQuote = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

const loadManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { groups: {} });

function resolveGroups(manifest, spec) {
  const names = Object.keys(manifest.groups);
  if (spec === 'all') return names;
  if (spec === 'none') return [];
  if (!spec) return names.filter((n) => manifest.groups[n].recommended);
  const wanted = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const unknown = wanted.filter((n) => !names.includes(n));
  if (unknown.length) throw new Error(`unknown skill group(s): ${unknown.join(', ')} (have: ${names.join(', ')})`);
  return wanted;
}

async function runInstall(opts) {
  for (const [cmd, why] of [['git', 'fetches third-party skills'], ['python3', 'runs the approval guard hook']]) {
    if (!has(cmd)) throw new Error(`${cmd} is required (${why}). Install it and run again.`);
  }
  const claudeDir = resolveClaudeDir({ home: opts.home });
  const manifest = loadManifest();
  const ask = createPrompter({ interactive: opts.interactive });
  const previous = loadState(claudeDir)?.options || {};
  try {
    console.log(`\nclaude-eng-team ${version} → ${claudeDir}\n`);
    const owner = opts.owner || await ask.text('Your name (for CLAUDE.md)', previous.owner || os.userInfo().username);
    const language = opts.language || await ask.text('Language Claude should talk to you in', previous.language || 'English');
    const codexFound = onPath('codex');
    const codex = opts.codex ?? await ask.confirm(
      `Use Codex CLI for hands-on coding and as a fallback when Claude hits its quota?${codexFound ? '' : ' (codex not found)'}`,
      previous.codex ?? codexFound);
    const allowBash = opts.allowBash ?? await ask.confirm(
      'Run Bash commands without permission prompts? (the guard still asks for installs, merges to dev/main, deploys and data deletion)',
      previous.allowBash ?? false);

    const groupNames = Object.keys(manifest.groups);
    const remembered = (previous.groups || []).filter((g) => manifest.groups[g]);
    let groups = opts.skills || !previous.groups ? resolveGroups(manifest, opts.skills) : remembered;
    if (opts.interactive && !opts.skills && groupNames.length) {
      console.log('\nOptional third-party skills, downloaded from their authors at a pinned, reviewed commit:');
      groups = await ask.pick('Which groups?', groupNames.map((n) => ({
        value: n,
        label: `${n.padEnd(14)} ${manifest.groups[n].description} (${manifest.groups[n].skills.length})${manifest.groups[n].recommended ? '  ★' : ''}`,
      })), groups, previous.groups ? `keep current: ${groups.join(', ') || 'none'}` : 'recommended ★');
    }
    const vendor = groups.flatMap((g) => manifest.groups[g].skills);

    let report;
    try {
      report = install({
        home: opts.home, payloadDir: PAYLOAD, owner, language, codex, allowBash, vendor, groups, dryRun: opts.dryRun,
        log: (line) => console.log(line),
      });
    } catch (err) {
      if (opts.dryRun || !loadState(claudeDir)) throw err; // nothing was written yet
      throw new Error(`${err.message}\n\nThe install stopped halfway. Nothing is lost: every file it replaced was backed up first.\n`
        + '  • Fix the cause above and run the installer again (it continues where it stopped), or\n'
        + `  • roll back completely: npx claude-eng-team uninstall${opts.home ? ` --home ${shellQuote(opts.home)}` : ''}`);
    }
    if (opts.dryRun) {
      printPlan(report.plan);
      return;
    }
    console.log(`\n✓ Installed ${report.files.length} files and ${report.vendorInstalled.length} third-party skills.`);
    if (report.vendorSkipped.length) console.log(`  Kept your own: ${report.vendorSkipped.join(', ')}`);
    printNextSteps(manifest, claudeDir, displayDir(claudeDir, opts.home));
  } finally {
    ask.close();
  }
}

const PLAN_LABELS = {
  new: 'new      ', update: 'update   ', replace: 'replace  ', import: 'import   ', merge: 'merge    ',
  keep: 'keep     ', yours: 'yours    ',
};
const PLAN_NOTES = {
  yours: '  (you already have a skill with this name: it is kept, ours is skipped)',
  keep: '  (you edited it: it stays as is; the new version is written next to it as .claude-eng-team-new)',
  replace: '  (yours today: backed up, restored by uninstall)',
  import: '  (yours is kept; one line @./claude-eng-team.md is added on top)',
  merge: '  (our hooks are added; your settings are kept and backed up)',
};

function printPlan(plan) {
  console.log('\nDry run — what the install would do:\n');
  const order = ['keep', 'yours', 'replace', 'import', 'merge', 'update', 'new'];
  for (const action of order) {
    for (const item of plan.filter((p) => p.action === action)) {
      console.log(`  ${PLAN_LABELS[action]}${item.rel}${PLAN_NOTES[action] || ''}`);
    }
  }
  for (const { entry } of plan.filter((p) => p.action === 'skill')) {
    console.log(`  skill    skills/${entry.name}  (${entry.repo} @ ${entry.commit.slice(0, 7)})`);
  }
  const count = (a) => plan.filter((p) => p.action === a).length;
  console.log(`\n${count('new')} new, ${count('replace')} replaced, ${count('update')} updated, `
    + `${count('same')} unchanged, ${count('keep')} kept as you edited them, `
    + `${count('skill')} third-party skills (${count('yours')} skipped: you have your own). Nothing changed.`);
}

function printNextSteps(manifest, claudeDir, dir) {
  console.log(`
Next:
  1. Restart Claude Code (or open /hooks once) so it loads the new hooks.
  2. In any project, describe what you want — e.g. "I want to build a booking SaaS". Read
     ${path.join(claudeDir, 'USAGE.md')} for the workflow, the approvals and the commands.
  3. Undo everything any time: npx claude-eng-team uninstall`);
  const extras = [...(manifest.bundles || []), ...(manifest.plugins || [])];
  if (extras.length) {
    console.log('\nRecommended extras (installed by you, from their authors):');
    for (const extra of extras) {
      console.log(`  • ${extra.name} — ${extra.why}`);
      for (const step of extra.install) console.log(`      ${relocate(step, dir)}`);
    }
  }
  console.log('');
}

function runDoctor(opts) {
  const claudeDir = resolveClaudeDir({ home: opts.home });
  const state = loadState(claudeDir);
  let failed = 0;
  const check = (ok, label, hint = '') => {
    if (!ok) failed += 1;
    console.log(`${ok ? '✓' : '✗'} ${label}${ok || !hint ? '' : `  → ${hint}`}`);
  };
  check(Number(process.versions.node.split('.')[0]) >= 18, `node ${process.versions.node}`, 'needs Node 18+');
  check(has('git'), 'git', 'install git');
  check(has('python3'), 'python3', 'install Python 3 (the guard hook needs it)');
  check(onPath('claude'), 'claude (Claude Code CLI)', 'https://code.claude.com/docs/en/overview');
  console.log(`${onPath('codex') ? '✓' : '·'} codex (optional)`);
  check(Boolean(state), state ? `claude-eng-team ${state.version} installed` : 'claude-eng-team installed', 'run npx claude-eng-team');
  const guard = path.join(claudeDir, 'hooks', 'guard-actions.py');
  if (state) check(fs.existsSync(guard), 'guard hook installed', 'run npx claude-eng-team again to restore it');
  if (state && fs.existsSync(guard)) {
    const tests = path.join(claudeDir, 'hooks', 'tests', 'test_guard_actions.py');
    let ok = false;
    try {
      execFileSync('python3', ['-I', '-B', tests], { stdio: 'ignore' });
      ok = true;
    } catch { /* reported below */ }
    check(ok, 'guard hook self-test', `python3 -I ${tests}`);
  }
  if (failed) process.exitCode = 1;
}

function runCredits() {
  const manifest = loadManifest();
  for (const [name, group] of Object.entries(manifest.groups)) {
    console.log(`\n${name} — ${group.description}`);
    for (const s of group.skills) console.log(`  ${s.name.padEnd(30)} ${s.author} · ${s.license} · https://github.com/${s.repo}`);
  }
  console.log('\nFull list with commits and notes: CREDITS.md');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  switch (opts.command) {
    case 'install': return runInstall(opts);
    case 'uninstall': return void uninstall({ home: opts.home });
    case 'doctor': return runDoctor(opts);
    case 'credits': return runCredits();
    case 'version': return console.log(version);
    case 'help': return console.log(HELP);
    default: throw new Error(`unknown command: ${opts.command}\n\n${HELP}`);
  }
}

main().catch((err) => {
  console.error(`claude-eng-team: ${err.message}`);
  process.exit(1);
});
