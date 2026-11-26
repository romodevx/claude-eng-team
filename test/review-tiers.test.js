'use strict';
require('./sandbox'); // first: tests never touch the real ~/.claude
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAYLOAD = path.join(__dirname, '..', 'payload');
const read = (rel) => fs.readFileSync(path.join(PAYLOAD, rel), 'utf8');
const frontmatter = (text) => (text.match(/^---\n([\s\S]*?)\n---/) || [, ''])[1];
const modelOf = (agent) => (frontmatter(read(`agents/${agent}.md`)).match(/^model:\s*(\S+)/m) || [])[1];

// Cheaper model where the job is checking or writing up; the strongest where judgment is the job.
const EXPECTED_MODELS = {
  sonnet: ['subtask-reviewer', 'code-reviewer', 'qa-sr', 'doc-writer', 'scrum-master'],
  opus: ['architect', 'security', 'tech-lead'],
};

for (const [model, agents] of Object.entries(EXPECTED_MODELS)) {
  for (const agent of agents) {
    test(`${agent} runs on ${model}`, () => assert.equal(modelOf(agent), model));
  }
}

test('review tiers are documented and the light reviewer exists', () => {
  assert.match(read('standards/review.md'), /Tier 1[\s\S]*Tier 2[\s\S]*Tier 3/);
  assert.match(read('agents/subtask-reviewer.md'), /^name: subtask-reviewer$/m);
});

test('no skill runs the full Claude reviewers on every subtask PR', () => {
  const perSubtask = /(Each subtask|Per subtask|per PR|every PR)[^\n]*@qa-sr[^\n]*@code-reviewer|@code-reviewer (per PR|on every PR)/i;
  for (const skill of fs.readdirSync(path.join(PAYLOAD, 'skills'))) {
    const file = path.join('skills', skill, 'SKILL.md');
    if (!fs.existsSync(path.join(PAYLOAD, file))) continue;
    const lines = read(file).split('\n').filter((l) => !l.includes('review_tier: strict')); // opt-in
    assert.doesNotMatch(lines.join('\n'), perSubtask, file);
  }
});

test('reviewers answer briefly and keep the detail in a file', () => {
  const protocol = read('standards/agent-protocol.md');
  assert.match(protocol, /≤ 30 lines/);
  assert.match(protocol, /\.claude\/reviews\//);
});

test('the light reviewer is wired everywhere the tiers are described', () => {
  for (const file of ['standards/review.md', 'rules/git-workflow.md', 'skills/story/SKILL.md', 'USAGE.md']) {
    assert.match(read(file), /subtask-reviewer/, file);
  }
  for (const skill of ['story', 'new-project', 'new-module', 'refactor']) {
    assert.match(read(`skills/${skill}/SKILL.md`), /review_tier: strict/, `${skill} honours strict mode`);
  }
});
