'use strict';
const readline = require('node:readline/promises');

/** Minimal interactive prompts (zero dependencies). Non-TTY → defaults. */
function createPrompter({ interactive }) {
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

  async function text(question, fallback) {
    if (!rl) return fallback;
    const answer = (await rl.question(`${question}${fallback ? ` (${fallback})` : ''}: `)).trim();
    return answer || fallback;
  }

  async function confirm(question, fallback) {
    if (!rl) return fallback;
    const hint = fallback ? 'Y/n' : 'y/N';
    const answer = (await rl.question(`${question} [${hint}] `)).trim().toLowerCase();
    if (!answer) return fallback;
    return answer.startsWith('y') || answer.startsWith('s');
  }

  /**
   * Pick items by number; Enter = the preselected ones, "a" = all, "n" = none.
   * @param {string} enterMeans how Enter is described, e.g. "recommended" or "keep current"
   */
  async function pick(question, items, recommended, enterMeans = 'recommended') {
    if (!rl) return recommended;
    items.forEach((item, i) => console.log(`  ${String(i + 1).padStart(2)}. ${item.label}`));
    const answer = (await rl.question(`${question} [Enter = ${enterMeans}, a = all, n = none, or 1,3,…] `)).trim().toLowerCase();
    if (!answer) return recommended;
    if (answer === 'a') return items.map((item) => item.value);
    if (answer === 'n') return [];
    return answer.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= items.length).map((n) => items[n - 1].value);
  }

  return { text, confirm, pick, close: () => rl && rl.close() };
}

module.exports = { createPrompter };
