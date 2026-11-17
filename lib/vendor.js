'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SHA = /^[0-9a-f]{40}$/;
const NAME = /^[a-z0-9][a-z0-9._-]*$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

const repoUrl = (entry) => entry.url || `https://github.com/${entry.repo}.git`;
/**
 * Download cache of the install's own home (`--home` included). A relative XDG_CACHE_HOME is
 * invalid per the XDG spec and ignored, so the cache never depends on the current directory.
 */
const defaultCacheDir = ({ home, env = process.env } = {}) => {
  const xdg = env.XDG_CACHE_HOME && path.isAbsolute(env.XDG_CACHE_HOME) ? env.XDG_CACHE_HOME : null;
  return path.resolve(xdg || path.join(home || os.homedir(), '.cache'), 'claude-eng-team');
};
const inside = (base, target) => target === base || target.startsWith(base + path.sep);

/** Reject anything that could escape the skills dir or the cache. Throws on the first problem. */
function validateEntry(entry) {
  const fail = (why) => { throw new Error(`invalid manifest entry "${entry.name}": ${why}`); };
  if (!NAME.test(entry.name || '') || entry.name.includes('..')) fail('name must be lowercase letters, digits, . _ -');
  if (!REPO.test(entry.repo || '') || entry.repo.split('/').some((p) => p === '.' || p === '..')) fail('repo must be owner/repo');
  if (typeof entry.path !== 'string' || path.isAbsolute(entry.path)
    || path.normalize(entry.path).split(path.sep).includes('..')) fail('path must stay inside the repo');
  if (!SHA.test(entry.commit || '')) fail('commit must be a full 40-char SHA');
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim();
}

function headOf(dir) {
  try {
    return git(dir, 'rev-parse', 'HEAD');
  } catch {
    return null; // fresh repo without commits
  }
}

/**
 * Fetch exactly one pinned commit of the upstream repo (shallow, blobless) and return the
 * directory holding the skill. Never follows a branch: what was reviewed is what installs.
 */
function fetchPinned(entry, cacheDir) {
  validateEntry(entry);
  const dir = path.join(cacheDir, entry.repo.replace('/', '__'));
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.mkdirSync(dir, { recursive: true });
    git(dir, 'init', '-q');
    git(dir, 'remote', 'add', 'origin', repoUrl(entry));
  }
  // Many skills share a repo and commit: fetch each (repo, commit) once, then reuse the cache.
  if (headOf(dir) !== entry.commit) {
    git(dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', entry.commit);
    git(dir, '-c', 'advice.detachedHead=false', 'checkout', '-q', '--force', entry.commit);
  }
  git(dir, 'clean', '-q', '-fdx'); // nothing from another commit leaks into the copy
  const source = path.resolve(dir, entry.path || '.');
  if (!inside(dir, source) || !fs.existsSync(source)) throw new Error(`${entry.name}: ${entry.path} not found at ${entry.commit}`);
  return source;
}

/** Copy a fetched skill, skipping .git and every symlink (a hostile repo could point anywhere). */
function copySkill(source, dest) {
  fs.cpSync(source, dest, {
    recursive: true,
    filter: (src) => path.basename(src) !== '.git' && !fs.lstatSync(src).isSymbolicLink(),
  });
}

module.exports = { fetchPinned, copySkill, validateEntry, defaultCacheDir, NAME };
