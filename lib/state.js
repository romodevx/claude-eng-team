'use strict';
const fs = require('node:fs');
const path = require('node:path');

/** Installer bookkeeping lives in ~/.claude/.claude-eng-team/ (state.json + backups). */
const stateDir = (claudeDir) => path.join(claudeDir, '.claude-eng-team');
const stateFile = (claudeDir) => path.join(stateDir(claudeDir), 'state.json');

function loadState(claudeDir) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(claudeDir), 'utf8'));
  } catch {
    return null;
  }
}

function saveState(claudeDir, state) {
  fs.mkdirSync(stateDir(claudeDir), { recursive: true });
  fs.writeFileSync(stateFile(claudeDir), JSON.stringify(state, null, 2) + '\n');
}

module.exports = { stateDir, loadState, saveState };
