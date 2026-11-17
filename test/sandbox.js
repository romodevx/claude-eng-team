'use strict';
/**
 * Loaded first by every test file. HOME and CLAUDE_CONFIG_DIR point into a throwaway
 * directory, so a test that forgets --home (or a bug that ignores it) can never write
 * into the real ~/.claude of whoever runs the suite. Child processes inherit it.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REAL_HOME = os.homedir();
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'cet-sandbox-home-'));
process.env.HOME = SANDBOX;
process.env.CLAUDE_CONFIG_DIR = path.join(SANDBOX, '.claude');
delete process.env.USERPROFILE;

module.exports = { SANDBOX, REAL_HOME };
