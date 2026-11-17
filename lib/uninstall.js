'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { unmergeSettings } = require('./settings');
const { stateDir } = require('./state');
const { NAME } = require('./vendor');
const { resolveClaudeDir, Ledger, IMPORT_LINE } = require('./install');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * Drop only what we added to settings.json, keeping later edits by the user. When nothing
 * else changed, the original file is restored byte for byte.
 */
function restoreSettings({ dest, backup, addedBashAllow }) {
  let current;
  try {
    current = fs.existsSync(dest) ? JSON.parse(fs.readFileSync(dest, 'utf8')) : {};
  } catch {
    return; // the user broke it after installing; leave it for them
  }
  const restored = unmergeSettings(current, { addedBashAllow });
  const original = fs.existsSync(backup) ? fs.readFileSync(backup, 'utf8') : null;
  let sameAsOriginal = false;
  try {
    sameAsOriginal = original !== null && JSON.stringify(JSON.parse(original)) === JSON.stringify(restored);
  } catch { /* the original wasn't JSON: keep the unmerged current settings */ }
  if (sameAsOriginal) {
    fs.writeFileSync(dest, original);
  } else if (original === null && Object.keys(restored).length === 0) {
    fs.rmSync(dest, { force: true });
  } else {
    fs.writeFileSync(dest, JSON.stringify(restored, null, 2) + '\n');
  }
}

/** Undo exactly what install() recorded: restore backups, delete our files, unmerge settings. */
function uninstall({ home, env, log = console.log }) {
  const claudeDir = resolveClaudeDir({ home, env });
  if (!fs.existsSync(path.join(stateDir(claudeDir), 'state.json'))) {
    log('claude-eng-team is not installed here (no state file). Nothing to do.');
    return false;
  }
  const ledger = new Ledger(claudeDir, log);
  const { state } = ledger;

  // Running the hook tests (doctor, or by hand) leaves Python bytecode next to our files.
  const ourDirs = new Set(Object.keys(state.files).map((rel) => path.dirname(path.join(claudeDir, rel))));
  for (const dir of ourDirs) fs.rmSync(path.join(dir, '__pycache__'), { recursive: true, force: true });

  if (state.files['settings.json']) {
    restoreSettings({
      dest: path.join(claudeDir, 'settings.json'),
      backup: path.join(ledger.backupDir, 'settings.json'),
      addedBashAllow: state.addedBashAllow,
    });
    delete state.files['settings.json'];
  }
  for (const rel of Object.keys(state.files)) ledger.release(rel);

  if (state.claudeMd === 'imported') {
    const mainPath = path.join(claudeDir, 'CLAUDE.md');
    if (fs.existsSync(mainPath)) {
      const text = fs.readFileSync(mainPath, 'utf8');
      fs.writeFileSync(mainPath, text.replace(new RegExp(`^${escapeRe(IMPORT_LINE)}\\r?\\n`, 'm'), ''));
    }
  }
  for (const name of state.vendor.filter((n) => NAME.test(n) && !n.includes('..'))) {
    fs.rmSync(path.join(claudeDir, 'skills', name), { recursive: true, force: true });
  }
  for (const sidecar of state.sidecars) fs.rmSync(path.join(claudeDir, sidecar), { force: true });

  fs.rmSync(stateDir(claudeDir), { recursive: true, force: true });
  // Our download cache — only if this install created it — then every folder the install
  // created that is empty again. Nothing we did not create is ever removed recursively.
  const createdCache = state.cacheDir && path.isAbsolute(state.cacheDir)
    && (state.createdDirs || []).includes(state.cacheDir);
  if (createdCache) {
    fs.rmSync(state.cacheDir, { recursive: true, force: true });
  } else if (state.cacheDir && path.isAbsolute(state.cacheDir)) {
    // The cache folder was already there: remove only the clones this install created in it.
    for (const dir of state.createdDirs || []) {
      if (path.dirname(dir) === state.cacheDir) fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  for (const dir of [...(state.createdDirs || [])].sort((a, b) => b.length - a.length)) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  log('claude-eng-team removed; your previous files were restored.');
  return true;
}

module.exports = { uninstall };
