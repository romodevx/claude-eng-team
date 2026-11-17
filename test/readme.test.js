'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
/**
 * The READMEs are a contract: every command they show must work exactly as written, every
 * number must match the package, every link must resolve and every author must be credited.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const READMES = ['README.md', 'README.es.md'];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const manifest = JSON.parse(read('vendor/manifest.json'));
const count = (dir) => fs.readdirSync(path.join(ROOT, 'payload', dir)).length;
const SKILLS_ARE_NETWORK = process.env.README_FULL !== '1';

/** Shell commands inside ```bash fences that call the package. */
function documentedCommands(text) {
  const blocks = [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]);
  return blocks.flatMap((b) => b.split('\n'))
    .map((line) => line.replace(/\s+#.*$/, '').trim())
    .filter((line) => line.startsWith('npx claude-eng-team'));
}

/** Split like a shell would for the simple quoting the READMEs use. */
const argv = (line) => [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]).slice(2);

// Claude Code is a prerequisite the README asks for; a stub on PATH stands in for it, so the
// documented commands (doctor included) pass on any machine or CI runner.
const STUB_BIN = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-bin-'));
fs.writeFileSync(path.join(STUB_BIN, 'claude'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
const PATH_WITH_CLAUDE = `${STUB_BIN}${path.delimiter}${process.env.PATH}`;

function run(args, home, input = '') {
  return spawnSync('node', [CLI, ...args, ...(args[0] === 'credits' ? [] : ['--home', home])], {
    encoding: 'utf8', input, env: { ...process.env, CLAUDE_CONFIG_DIR: '', PATH: PATH_WITH_CLAUDE }, timeout: 600000,
  });
}

for (const file of READMES) {
  test(`${file}: every npx command runs exactly as written`, () => {
    const commands = documentedCommands(read(file));
    assert.ok(commands.length >= 6, 'expected the documented commands');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-readme-'));
    for (const line of commands) {
      let args = argv(line);
      // `--skills all` downloads 70 repos; README_FULL=1 runs it for real (release QA).
      // Plain installs fetch the recommended groups, so the fast run skips those too.
      if (SKILLS_ARE_NETWORK && args.includes('--skills')) args = args.map((a, i) => (args[i - 1] === '--skills' ? 'none' : a));
      else if (SKILLS_ARE_NETWORK && ['install', undefined].includes(args.find((a) => !a.startsWith('-')))) args = [...args, '--skills', 'none'];
      const res = run(args, home);
      assert.equal(res.status, 0, `${line}\n${res.stdout}\n${res.stderr}`);
    }
    // After the documented sequence the user can still uninstall cleanly.
    assert.equal(run(['uninstall'], home).status, 0);
  });

  test(`${file}: every documented flag exists in --help`, () => {
    const help = spawnSync('node', [CLI, '--help'], { encoding: 'utf8' }).stdout;
    const flags = new Set(documentedCommands(read(file)).flatMap((l) => l.match(/--?[a-z][\w-]*/g) || []));
    for (const flag of flags) assert.ok(help.includes(flag), `${flag} missing from --help`);
  });

  test(`${file}: every /command in the tables is a shipped skill`, () => {
    const own = fs.readdirSync(path.join(ROOT, 'payload', 'skills'));
    const tableCommands = [...read(file).matchAll(/^\|[^\n]*$/gm)].map((m) => m[0])
      .flatMap((row) => [...row.matchAll(/`\/([a-z-]+)/g)].map((m) => m[1]));
    assert.ok(tableCommands.length >= 15);
    for (const cmd of tableCommands) assert.ok(own.includes(cmd), `/${cmd} → payload/skills/${cmd}`);
  });

  test(`${file}: relative links resolve`, () => {
    for (const [, target] of read(file).matchAll(/\]\((?!https?:|#)([^)]+)\)/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, target)), target);
    }
  });

  test(`${file}: numbers match the package`, () => {
    const text = read(file);
    const facts = {
      agents: count('agents'), rules: count('rules'), standards: count('standards'), skills: count('skills'),
    };
    assert.match(text, new RegExp(`\\b${facts.agents} (role agents|agents|agentes)`), 'agents');
    assert.match(text, new RegExp(`\\b${facts.rules} (rules|reglas)`), 'rules');
    assert.match(text, new RegExp(`\\b${facts.standards} (standards|estándares)`), 'standards');
    // Always-loaded rules (no `paths:` scope) and their size: what every session pays for.
    const rulesDir = path.join(ROOT, 'payload', 'rules');
    const always = fs.readdirSync(rulesDir).filter((f) => !/^paths:/m.test(fs.readFileSync(path.join(rulesDir, f), 'utf8').split('---')[1] || ''));
    const kb = (files) => Math.round(files.reduce((n, f) => n + fs.statSync(path.join(rulesDir, f)).size, 0) / 1024);
    const noCodex = always.filter((f) => f !== 'codex-first.md');
    assert.match(text, new RegExp(`\\b${always.length} (always loaded|siempre cargadas) \\((about|unos) ${kb(always)} KB`), 'always-loaded rules');
    assert.match(text, new RegExp(`\\b${noCodex.length}[^\\n]*${kb(noCodex)} KB[^\\n]*(--no-codex|sin Codex)`), 'rules without codex');
    assert.match(text, new RegExp(`\\b${facts.skills} (commands|comandos)`), 'commands');
    for (const [name, group] of Object.entries(manifest.groups)) {
      const row = text.split('\n').find((l) => new RegExp(`^\\| ${name}( ★)? \\|`).test(l));
      assert.ok(row, `group ${name} documented`);
      assert.ok(row.trim().endsWith(`| ${group.skills.length} |`), `${name}: ${group.skills.length} skills`);
      assert.equal(row.includes('★'), Boolean(group.recommended), `${name}: ★ = recommended`);
    }
  });

  test(`${file}: every third-party author is credited in the honorable mentions`, () => {
    const text = read(file);
    const mentions = text.slice(text.search(/^## (Honorable mentions|Menciones honoríficas)/m));
    for (const s of Object.values(manifest.groups).flatMap((g) => g.skills)) {
      assert.ok(mentions.includes(`github.com/${s.repo}`), `${s.name}: ${s.repo} not credited`);
    }
    for (const e of [...manifest.bundles, ...manifest.plugins].filter((x) => ['gstack', 'superpowers', 'claude-mem'].includes(x.name))) {
      assert.ok(mentions.includes(`github.com/${e.repo}`), `${e.name} not credited`);
    }
  });
}

// A skill is invoked by its directory name: /new-project, never an alias like /new.
test('every team /command mentioned anywhere is a real skill name', () => {
  const own = new Set(fs.readdirSync(path.join(ROOT, 'payload', 'skills')));
  const docs = ['README.md', 'README.es.md', 'payload/CLAUDE.md', 'payload/USAGE.md',
    ...fs.readdirSync(path.join(ROOT, 'payload', 'agents')).map((f) => `payload/agents/${f}`),
    ...[...own].map((s) => `payload/skills/${s}/SKILL.md`)];
  const aliases = ['new', 'module', 'feature'];
  for (const doc of docs) {
    for (const [, cmd] of read(doc).matchAll(/(?:^|[\s`(])\/([a-z][a-z-]*)(?=[\s`),.]|$)/gm)) {
      assert.ok(!aliases.includes(cmd), `${doc}: /${cmd} is not a command; use /new-${cmd === 'new' ? 'project' : cmd}`);
    }
  }
});
