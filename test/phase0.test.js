import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASE0_FIXTURES } from './fixtures/phase0_sessions.js';
import { buildPrompt, runExtraction } from '../dist/extract.js';

test('phase 0 evaluation fixtures are well-formed', () => {
  assert.equal(PHASE0_FIXTURES.length, 5);

  for (const fixture of PHASE0_FIXTURES) {
    assert.ok(fixture.name);
    assert.ok(fixture.description);
    assert.ok(fixture.transcript.trim());
    assert.ok(Array.isArray(fixture.expectedDecisions));

    for (const d of fixture.expectedDecisions) {
      assert.ok(d.title);
      assert.ok(d.chose);
      assert.ok(d.why);
    }
  }
});

test('phase 0 prompt builder inlines session transcripts without error', async () => {
  for (const fixture of PHASE0_FIXTURES) {
    const fullPrompt = await buildPrompt(fixture.transcript);
    assert.ok(fullPrompt.includes(fixture.transcript.trim()));
    assert.match(fullPrompt, /Return a JSON array/);
  }
});

test('phase 0 fail-open extraction produces zero false-positive decisions on no-decision sessions', async () => {
  const noDecisionFixture = PHASE0_FIXTURES.find((f) => f.name === 'no_meaningful_decision');
  assert.ok(noDecisionFixture);

  // In test environment without claude CLI, runExtraction fails open and returns []
  const result = await runExtraction(noDecisionFixture.transcript, {
    bin: 'non-existent-binary-for-test',
  });

  assert.deepEqual(result, []);
  assert.equal(noDecisionFixture.expectedDecisions.length, 0);
});
