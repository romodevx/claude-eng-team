'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('./render');
const { mergeSettings } = require('./settings');
const { stateDir, loadState, saveState } = require('./state');
const { fetchPinned, copySkill, validateEntry, defaultCacheDir } = require('./vendor');

const VERSION = require('../package.json').version;
const IMPORT_FILE = 'claude-eng-team.md';
const IMPORT_LINE = `@./${IMPORT_FILE}`;
const NEW_SUFFIX = '.claude-eng-team-new';
const EDITED_SUFFIX = '.claude-eng-team-edited';
const CODEX_ONLY = new Set([
  'bin/codex-task',
  'hooks/codex-fallback.py',
  'hooks/tests/test_codex_fallback.py',
  'rules/codex-first.md',
  'standards/codex.md',
]);
const isRendered = (rel) => rel.endsWith('.md'); // placeholders and codex-only parts

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fileSha = (file) => (fs.existsSync(file) ? sha256(fs.readFileSync(file)) : null);

/**
 * Where to install: <home>/.claude when --home is given, else $CLAUDE_CONFIG_DIR (Claude Code's
 * own override), else ~/.claude.
 */
function resolveClaudeDir({ home, env = process.env, homedir = require('node:os').homedir() } = {}) {
  if (home) return path.join(home, '.claude');
  if (env.CLAUDE_CONFIG_DIR) return path.resolve(env.CLAUDE_CONFIG_DIR);
  return path.join(homedir, '.claude');
}

/**
 * How docs and scripts should name the install dir. `~/.claude` when that is where we
 * install; otherwise (CLAUDE_CONFIG_DIR) the real dir, with ~ for the home prefix.
 */
function displayDir(claudeDir, home, homedir = require('node:os').homedir()) {
  if (claudeDir === path.join(home || homedir, '.claude')) return null; // the default: nothing to rewrite
  return claudeDir.startsWith(homedir + path.sep) ? `~${claudeDir.slice(homedir.length)}` : claudeDir;
}

/** Point every `~/.claude` mention in a text file at the real install dir. Binary files untouched. */
function relocate(content, dir) {
  if (!dir) return content;
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (buf.includes(0)) return content;
  return buf.toString('utf8').replace(/~\/\.claude(?=\/|$|[\s`'")\],;:])/gm, () => dir);
}

/** Every payload file as a POSIX relative path. O(files). */
function listPayload(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === '__pycache__' || entry.name === '.DS_Store') return [];
    return entry.isDirectory() ? listPayload(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function readSettings(file) {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}). Fix it, then run the installer again.`);
  }
}

/** Remove empty parent directories up to (not including) the stop dir. */
function pruneEmptyDirs(file, stop) {
  let dir = path.dirname(file);
  while (dir.startsWith(stop) && dir !== stop) {
    if (!fs.existsSync(dir) || fs.readdirSync(dir).length > 0) return;
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

/**
 * Owns the bookkeeping: every file we write is recorded (with its hash) and saved to
 * state.json immediately, so a failure at any point leaves an exact undo log.
 */
class Ledger {
  constructor(claudeDir, log) {
    this.claudeDir = claudeDir;
    this.log = log;
    this.backupDir = path.join(stateDir(claudeDir), 'backup');
    this.state = loadState(claudeDir) || {
      version: VERSION, installedAt: new Date().toISOString(), files: {}, vendor: [], sidecars: [],
      claudeMd: null, addedBashAllow: false,
    };
    this.state.sidecars = this.state.sidecars || [];
    this.state.createdDirs = this.state.createdDirs || [];
    this.trackDirs(claudeDir);
  }

  /** Remember every folder we are about to create, so uninstall can remove it again. */
  trackDirs(dir) {
    const missing = [];
    for (let d = path.resolve(dir); !fs.existsSync(d) && path.dirname(d) !== d; d = path.dirname(d)) missing.push(d);
    for (const d of missing) if (!this.state.createdDirs.includes(d)) this.state.createdDirs.push(d);
  }

  save() {
    saveState(this.claudeDir, this.state);
  }

  /** Write one of our files. Backs up a user's file once; never clobbers a file the user edited. */
  write(rel, content, mode) {
    const dest = path.join(this.claudeDir, rel);
    const entry = this.state.files[rel];
    if (entry && fs.existsSync(dest) && fileSha(dest) !== entry.sha) {
      if (fileSha(dest) === sha256(content)) return; // already identical
      fs.writeFileSync(dest + NEW_SUFFIX, content);
      if (!this.state.sidecars.includes(rel + NEW_SUFFIX)) this.state.sidecars.push(rel + NEW_SUFFIX);
      this.log(`  kept your edited ${rel}; the new version is in ${rel}${NEW_SUFFIX}`);
      this.save();
      return;
    }
    if (!entry) {
      const backup = path.join(this.backupDir, rel);
      if (fs.existsSync(dest) && !fs.existsSync(backup)) {
        ensureDir(backup);
        fs.copyFileSync(dest, backup);
      }
      this.state.files[rel] = { backedUp: fs.existsSync(backup) };
    }
    this.trackDirs(path.dirname(dest));
    ensureDir(dest);
    fs.writeFileSync(dest, content);
    if (mode) fs.chmodSync(dest, mode);
    this.state.files[rel].sha = sha256(content);
    this.save();
  }

  /** Give a file back: restore the user's original, or delete ours (an edited file is kept). */
  release(rel) {
    const info = this.state.files[rel];
    if (!info) return;
    const dest = path.join(this.claudeDir, rel);
    const backup = path.join(this.backupDir, rel);
    const edited = fs.existsSync(dest) && info.sha && fileSha(dest) !== info.sha;
    if (info.backedUp && fs.existsSync(backup)) {
      if (edited) fs.renameSync(dest, dest + EDITED_SUFFIX);
      ensureDir(dest);
      fs.copyFileSync(backup, dest);
    } else if (edited) {
      this.log(`  kept ${rel}: you edited it after installing`);
    } else {
      fs.rmSync(dest, { force: true });
      pruneEmptyDirs(dest, this.claudeDir);
    }
    delete this.state.files[rel];
    this.save();
  }
}

/**
 * Install (or update) the team without losing anything the user has.
 * @returns {{files: string[], vendorInstalled: string[], vendorSkipped: string[]}}
 */
function install(opts) {
  const { home, payloadDir, owner, language, codex, allowBash, dryRun = false, log = console.log } = opts;
  const claudeDir = resolveClaudeDir({ home, env: opts.env });
  const dir = displayDir(claudeDir, home);
  const vendor = opts.vendor || [];
  vendor.forEach(validateEntry); // before any write
  const settingsPath = path.join(claudeDir, 'settings.json');
  const currentSettings = readSettings(settingsPath); // before any write

  const files = listPayload(payloadDir)
    .filter((rel) => codex || !CODEX_ONLY.has(rel))
    .filter((rel) => rel !== 'CLAUDE.md');
  const report = { files: [...files, 'CLAUDE.md', 'settings.json'], vendorInstalled: [], vendorSkipped: [] };
  const renderOpts = { owner, language, codex };
  const contentOf = (rel) => {
    const raw = fs.readFileSync(path.join(payloadDir, rel));
    return relocate(isRendered(rel) ? render(raw.toString('utf8'), renderOpts) : raw, dir);
  };
  if (dryRun) return { ...report, plan: planChanges({ claudeDir, files, settingsPath, contentOf, vendor }) };

  const ledger = new Ledger(claudeDir, log);
  const { state } = ledger;

  for (const rel of files) {
    ledger.write(rel, contentOf(rel), fs.statSync(path.join(payloadDir, rel)).mode & 0o777);
  }
  installClaudeMd({ claudeDir, payloadDir, renderOpts, ledger, dir });

  // Files from a previous install that this one doesn't want (e.g. --no-codex now).
  const wanted = new Set([...files, 'CLAUDE.md', IMPORT_FILE, 'settings.json']);
  for (const rel of Object.keys(state.files)) if (!wanted.has(rel)) ledger.release(rel);

  writeSettings({ settingsPath, currentSettings, codex, allowBash, claudeDir, ledger });
  const cacheDir = path.resolve(opts.cacheDir || defaultCacheDir({ home, env: opts.env }));
  installVendor({ claudeDir, entries: vendor, cacheDir, ledger, report, log });

  state.version = VERSION;
  state.options = { owner, language, codex, allowBash, groups: opts.groups };
  ledger.save();
  return report;
}

/**
 * What an install would do, file by file, without writing: new | replace (the original is
 * backed up) | update (ours from a previous install) | import (one line on top of your
 * CLAUDE.md) | merge (our hooks added to settings.json).
 */
function planChanges({ claudeDir, files, settingsPath, contentOf, vendor = [] }) {
  const state = loadState(claudeDir);
  const actionFor = (rel, content) => {
    const dest = path.join(claudeDir, rel);
    const entry = state?.files?.[rel];
    if (!entry) return fs.existsSync(dest) ? 'replace' : 'new';
    if (fs.existsSync(dest) && fileSha(dest) !== entry.sha) return fileSha(dest) === sha256(content) ? 'same' : 'keep';
    return sha256(content) === entry.sha && fs.existsSync(dest) ? 'same' : 'update';
  };
  const plan = files.map((rel) => ({ rel, action: actionFor(rel, contentOf(rel)) }));
  const mainMd = path.join(claudeDir, 'CLAUDE.md');
  const createdMd = state?.claudeMd === 'created' || (!state?.claudeMd && !fs.existsSync(mainMd));
  const ourMd = contentOf('CLAUDE.md');
  if (createdMd) plan.push({ rel: 'CLAUDE.md', action: actionFor('CLAUDE.md', ourMd) });
  else if (state?.claudeMd === 'imported') plan.push({ rel: IMPORT_FILE, action: actionFor(IMPORT_FILE, ourMd) });
  else plan.push({ rel: 'CLAUDE.md', action: 'import' });
  plan.push({ rel: 'settings.json', action: fs.existsSync(settingsPath) ? 'merge' : 'new' });
  for (const entry of vendor) {
    const rel = `skills/${entry.name}`;
    const yours = fs.existsSync(path.join(claudeDir, rel)) && !(state?.vendor || []).includes(entry.name);
    plan.push({ rel, action: yours ? 'yours' : 'skill', entry });
  }
  return plan;
}

/** Fresh machine: our CLAUDE.md. Existing one: keep it and add a one-line import. */
function installClaudeMd({ claudeDir, payloadDir, renderOpts, ledger, dir }) {
  const rendered = relocate(render(fs.readFileSync(path.join(payloadDir, 'CLAUDE.md'), 'utf8'), renderOpts), dir);
  const mainPath = path.join(claudeDir, 'CLAUDE.md');
  const { state } = ledger;
  if (state.claudeMd === 'created' || (!state.claudeMd && !fs.existsSync(mainPath))) {
    ledger.write('CLAUDE.md', rendered);
    state.claudeMd = 'created';
    ledger.save();
    return;
  }
  ledger.write(IMPORT_FILE, rendered);
  const mine = fs.readFileSync(mainPath, 'utf8');
  if (!mine.split(/\r?\n/).includes(IMPORT_LINE)) {
    const eol = mine.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(mainPath, `${IMPORT_LINE}${eol}${mine}`);
  }
  state.claudeMd = 'imported';
  ledger.save();
}

function writeSettings({ settingsPath, currentSettings, codex, allowBash, claudeDir, ledger }) {
  const { state } = ledger;
  if (!state.files['settings.json']) {
    const backup = path.join(ledger.backupDir, 'settings.json');
    if (fs.existsSync(settingsPath) && !fs.existsSync(backup)) {
      ensureDir(backup);
      fs.copyFileSync(settingsPath, backup);
    }
    state.files['settings.json'] = { backedUp: fs.existsSync(backup), merged: true };
  }
  const hadBash = Boolean(currentSettings.permissions?.allow?.includes('Bash'));
  const merged = mergeSettings(currentSettings, { codex, allowBash, claudeDir, dropBash: state.addedBashAllow });
  if (allowBash && !hadBash) state.addedBashAllow = true;
  if (!allowBash) state.addedBashAllow = false;
  ensureDir(settingsPath);
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n');
  ledger.save();
}

function installVendor({ claudeDir, entries, cacheDir, ledger, report, log }) {
  const { state } = ledger;
  const wanted = new Set(entries.map((e) => e.name));
  for (const name of [...state.vendor]) {
    if (!wanted.has(name)) {
      fs.rmSync(path.join(claudeDir, 'skills', name), { recursive: true, force: true });
      state.vendor = state.vendor.filter((n) => n !== name);
      ledger.save();
    }
  }
  if (entries.length) {
    ledger.trackDirs(cacheDir);
    ledger.trackDirs(path.join(claudeDir, 'skills'));
    state.cacheDir = cacheDir;
    ledger.save();
  }
  for (const entry of entries) {
    const dest = path.join(claudeDir, 'skills', entry.name);
    const ours = state.vendor.includes(entry.name);
    if (fs.existsSync(dest) && !ours) {
      report.vendorSkipped.push(entry.name);
      log(`  skip ${entry.name}: you already have a skill with that name`);
      continue;
    }
    ledger.trackDirs(path.join(cacheDir, entry.repo.replace('/', '__'))); // a clone we create
    ledger.save();
    const source = fetchPinned(entry, cacheDir);
    fs.rmSync(dest, { recursive: true, force: true });
    if (!ours) state.vendor.push(entry.name);
    ledger.save(); // recorded before copying: a failure mid-copy is still undone
    copySkill(source, dest);
    report.vendorInstalled.push(entry.name);
    log(`  ✓ ${entry.name}  (${entry.repo} @ ${entry.commit.slice(0, 7)})`);
  }
}

module.exports = {
  install, listPayload, resolveClaudeDir, displayDir, relocate, pruneEmptyDirs, Ledger,
  IMPORT_LINE, IMPORT_FILE, NEW_SUFFIX, EDITED_SUFFIX,
};
