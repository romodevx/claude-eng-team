#!/usr/bin/env node
'use strict';
/** Generate CREDITS.md from vendor/manifest.json (single source of truth). `--check` fails if stale. */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'vendor', 'manifest.json'), 'utf8'));

const link = (repo) => `[${repo}](https://github.com/${repo})`;
const at = (s) => (s.commit ? `[\`${s.commit.slice(0, 7)}\`](https://github.com/${s.repo}/tree/${s.commit}${s.path ? `/${s.path}` : ''})` : '—');

function render() {
  const out = [
    '# Credits',
    '',
    'claude-eng-team stands on the work of many people. **None of the skills below are part of',
    'this package**: on request, the installer downloads each one from its original repository at',
    'the pinned commit listed here, and it stays under its author\'s license. Thank you all.',
    '',
    'Pins are reviewed before they change (read the SKILL.md and every script; nothing that phones',
    'home, reads secrets or runs unpinned code). Found a problem or want a credit fixed? Open an issue.',
    '',
  ];
  for (const [name, group] of Object.entries(manifest.groups)) {
    out.push(`## ${name}${group.recommended ? ' ★' : ''}`, '', group.description, '');
    out.push('| Skill | Author | Source | Pinned | License | Notes |', '|---|---|---|---|---|---|');
    for (const s of group.skills) {
      out.push(`| \`${s.name}\` | ${s.author} | ${link(s.repo)} | ${at(s)} | ${s.license} | ${s.notes || ''} |`);
    }
    out.push('');
  }
  const extras = [...(manifest.bundles || []), ...(manifest.plugins || [])];
  if (extras.length) {
    out.push('## Recommended extras (you install them yourself)', '');
    out.push('| Name | Author | Source | License | Install |', '|---|---|---|---|---|');
    for (const e of extras) out.push(`| ${e.name} | ${e.author} | ${link(e.repo)} | ${e.license} | ${e.install.map((s) => `\`${s}\``).join('<br>')} |`);
    out.push('');
  }
  out.push('## Ideas and books', '',
    'The engineering canon the agents follow comes from *Clean Code*, *Clean Architecture* and',
    '*The Clean Coder* (Robert C. Martin), *The Go Programming Language* (Donovan & Kernighan),',
    'OWASP ASVS 5.0 and the Google SRE books. This package paraphrases their principles; it',
    'contains no text from them.', '');
  return out.join('\n');
}

const target = path.join(ROOT, 'CREDITS.md');
const text = render();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (current !== text) {
    console.error('CREDITS.md is out of date: run `npm run credits`.');
    process.exit(1);
  }
} else {
  fs.writeFileSync(target, text);
  console.log('CREDITS.md written.');
}
