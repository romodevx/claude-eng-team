'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor', 'manifest.json'), 'utf8'));
const skills = Object.values(manifest.groups).flatMap((g) => g.skills);
const ownSkills = fs.readdirSync(path.join(ROOT, 'payload', 'skills'));

test('every third-party skill is pinned, licensed and credited', () => {
  for (const s of skills) {
    assert.match(s.commit, /^[0-9a-f]{40}$/, `${s.name}: full SHA`);
    assert.match(s.repo, /^[\w.-]+\/[\w.-]+$/, `${s.name}: owner/repo`);
    assert.ok(s.license && s.author && s.path, `${s.name}: license, author and path`);
    assert.doesNotMatch(s.license, /NC|non-?commercial/i, `${s.name}: no non-commercial licenses`);
  }
});

test('skill names are unique and never shadow our own skills', () => {
  const names = skills.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.ok(!ownSkills.includes(name), `${name} collides with payload/skills`);
});

test('extras list one runnable step per line (slash commands cannot be chained)', () => {
  for (const extra of [...manifest.bundles, ...manifest.plugins]) {
    assert.ok(Array.isArray(extra.install) && extra.install.length > 0, extra.name);
    for (const step of extra.install) {
      if (step.startsWith('/')) assert.doesNotMatch(step, /&&|;/, `${extra.name}: ${step}`);
    }
  }
});

test('CREDITS.md is generated from the manifest and up to date', () => {
  execFileSync('node', [path.join(ROOT, 'scripts', 'gen-credits.js'), '--check'], { stdio: 'pipe' });
});

test('the payload carries no personal data', () => {
  const { spawnSync } = require('node:child_process');
  const found = spawnSync('grep', ['-rIliE', '/Users/[a-z]|andres|romolabs|aetsa|garcia-lorca|romodevx|andresromolf',
    path.join(ROOT, 'payload')]).stdout.toString();
  assert.equal(found, '', `personal data in:\n${found}`);
});

test('the npm package ships only what users need', () => {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const files = JSON.parse(out)[0].files.map((f) => f.path);
  for (const f of files) {
    assert.doesNotMatch(f, /__pycache__|\.pyc$|\.DS_Store|^test\/|^vendor\/provenance|^\.github\//, f);
  }
  for (const must of ['bin/cli.js', 'payload/CLAUDE.md', 'payload/hooks/guard-actions.py', 'vendor/manifest.json', 'CREDITS.md', 'README.md', 'LICENSE']) {
    assert.ok(files.includes(must), `${must} missing from the package`);
  }  // npm renders the README: every relative link in it must point at a shipped file.
  for (const readme of ['README.md', 'README.es.md']) {
    const text = fs.readFileSync(path.join(ROOT, readme), 'utf8');
    for (const [, target] of text.matchAll(/\]\((?!https?:|#)([^)#]+)/g)) {
      assert.ok(files.includes(target), `${readme} links to ${target}, which is not in the package`);
    }
  }
});
