'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../lib/render');

const doc = [
  '# {{OWNER}} — Team',
  'Talk to me in {{LANGUAGE}}.',
  '<!-- codex:start -->',
  'Codex section',
  '<!-- codex:end -->',
  'Tail',
].join('\n');

test('fills owner and language', () => {
  const out = render(doc, { owner: 'Ada', language: 'English', codex: true });
  assert.match(out, /^# Ada — Team/);
  assert.match(out, /Talk to me in English\./);
});

test('keeps the codex block (without markers) when codex is enabled', () => {
  const out = render(doc, { owner: 'Ada', language: 'English', codex: true });
  assert.match(out, /Codex section/);
  assert.doesNotMatch(out, /codex:start|codex:end/);
});

test('drops the codex block when codex is disabled', () => {
  const out = render(doc, { owner: 'Ada', language: 'English', codex: false });
  assert.doesNotMatch(out, /Codex section/);
  assert.match(out, /Tail/);
});

test('never leaves an unfilled placeholder', () => {
  const out = render(doc, { owner: '', language: '', codex: false });
  assert.doesNotMatch(out, /\{\{/);
});

test('inline codex spans are kept or dropped within a sentence', () => {
  const line = 'Green, then refactor.<!-- codex --> Coding goes through codex-task.<!-- /codex --> Done.';
  assert.equal(render(line, { codex: true }), 'Green, then refactor. Coding goes through codex-task. Done.');
  assert.equal(render(line, { codex: false }), 'Green, then refactor. Done.');
});
