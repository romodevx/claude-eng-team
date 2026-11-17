'use strict';

/**
 * Pure merge/unmerge of settings.json. Each hook command we add ends with MARK, so we only
 * ever touch our own hooks — never a user's hook that happens to run a similar script.
 */
const MARK = '# claude-eng-team';
const HOOKS = {
  guard: 'hooks/guard-actions.py',
  codex: 'hooks/codex-fallback.py',
};

/** POSIX single-quote a path: safe with spaces, $, backticks and quotes. */
const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

const command = (claudeDir, script, arg = '') =>
  `python3 -I ${shellQuote(`${claudeDir}/${script}`)}${arg ? ` ${arg}` : ''} ${MARK}`;

function ourEntries({ codex, claudeDir }) {
  const entries = {
    PreToolUse: { matcher: 'Bash', hooks: [{ type: 'command', command: command(claudeDir, HOOKS.guard), timeout: 15 }] },
  };
  if (codex) {
    entries.StopFailure = {
      matcher: 'rate_limit|billing_error',
      hooks: [{ type: 'command', command: command(claudeDir, HOOKS.codex, 'stopfailure'), timeout: 20 }],
    };
    entries.SessionStart = {
      hooks: [{ type: 'command', command: command(claudeDir, HOOKS.codex, 'sessionstart'), timeout: 10 }],
    };
  }
  return entries;
}

const isOurHook = (hook) => typeof hook.command === 'string' && hook.command.endsWith(MARK);
const clone = (value) => JSON.parse(JSON.stringify(value));

/** Remove our hooks; drop entries and events left empty by that. */
function withoutOurHooks(settings) {
  const out = clone(settings);
  if (!out.hooks) return out;
  for (const event of Object.keys(out.hooks)) {
    out.hooks[event] = out.hooks[event]
      .map((entry) => ({ ...entry, hooks: (entry.hooks || []).filter((h) => !isOurHook(h)) }))
      .filter((entry, i) => entry.hooks.length > 0 || (settings.hooks[event][i].hooks || []).length === 0);
    if (out.hooks[event].length === 0) delete out.hooks[event];
  }
  if (Object.keys(out.hooks).length === 0) delete out.hooks;
  return out;
}

function withoutBashRule(settings) {
  const out = clone(settings);
  if (out.permissions && Array.isArray(out.permissions.allow)) {
    out.permissions.allow = out.permissions.allow.filter((rule) => rule !== 'Bash');
    if (out.permissions.allow.length === 0) delete out.permissions.allow;
    if (Object.keys(out.permissions).length === 0) delete out.permissions;
  }
  return out;
}

/**
 * @param {object} settings current settings.json content
 * @param {{codex: boolean, allowBash: boolean, claudeDir?: string, dropBash?: boolean}} opts
 *   dropBash: remove a `Bash` rule we added in a previous install
 */
function mergeSettings(settings, { codex, allowBash, claudeDir = '~/.claude', dropBash = false }) {
  let out = withoutOurHooks(settings || {});
  if (dropBash && !allowBash) out = withoutBashRule(out);
  out.hooks = out.hooks || {};
  for (const [event, entry] of Object.entries(ourEntries({ codex, claudeDir }))) {
    // The guard goes first so its deny/ask is decided before any other hook.
    out.hooks[event] = [entry, ...(out.hooks[event] || [])];
  }
  if (allowBash) {
    out.permissions = out.permissions || {};
    const allow = out.permissions.allow || [];
    if (!allow.includes('Bash')) out.permissions.allow = [...allow, 'Bash'];
  }
  return out;
}

/** @param {{addedBashAllow: boolean}} state what the installer added */
function unmergeSettings(settings, { addedBashAllow }) {
  const out = withoutOurHooks(settings || {});
  return addedBashAllow ? withoutBashRule(out) : out;
}

module.exports = { mergeSettings, unmergeSettings, shellQuote, HOOKS, MARK };
