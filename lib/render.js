'use strict';

const CODEX_BLOCK = /<!-- codex:start -->\n([\s\S]*?)<!-- codex:end -->\n?/g;
const CODEX_SPAN = /<!-- codex -->(.*?)<!-- \/codex -->/g; // within one line

/**
 * Fill the payload placeholders and keep or drop the Codex-only blocks.
 * O(n) in the document length.
 * @param {string} text
 * @param {{owner: string, language: string, codex: boolean}} opts
 */
function render(text, { owner, language, codex }) {
  return text
    .replace(CODEX_BLOCK, (_, body) => (codex ? body : ''))
    .replace(CODEX_SPAN, (_, body) => (codex ? body : ''))
    .replace(/\{\{OWNER\}\}/g, owner || 'My')
    .replace(/\{\{LANGUAGE\}\}/g, language || 'English');
}

module.exports = { render };
