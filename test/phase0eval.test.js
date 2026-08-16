import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGate, formatSessionForReview } from '../dist/phase0.js';

test('evaluateGate passes at exactly 70% recall with zero fabrications', () => {
  const verdict = evaluateGate({ expectedTotal: 10, matchedTotal: 7, fabricatedOnNoDecisionSessions: 0 });
  assert.equal(verdict.passes, true);
  assert.equal(verdict.recall, 0.7);
});

test('evaluateGate fails below 70% recall', () => {
  const verdict = evaluateGate({ expectedTotal: 10, matchedTotal: 6, fabricatedOnNoDecisionSessions: 0 });
  assert.equal(verdict.passes, false);
  assert.match(verdict.reason, /below the 70% gate/);
});

test('evaluateGate fails on any fabrication even with perfect recall', () => {
  const verdict = evaluateGate({ expectedTotal: 5, matchedTotal: 5, fabricatedOnNoDecisionSessions: 1 });
  assert.equal(verdict.passes, false);
  assert.match(verdict.reason, /fabricated/);
});

test('evaluateGate treats zero expected decisions as full recall', () => {
  const verdict = evaluateGate({ expectedTotal: 0, matchedTotal: 0, fabricatedOnNoDecisionSessions: 0 });
  assert.equal(verdict.recall, 1);
  assert.equal(verdict.passes, true);
});

test('formatSessionForReview lists expected and predicted decisions', () => {
  const text = formatSessionForReview({
    name: 'real_session_1',
    expectedDecisions: [{ title: 'Keep Postgres', chose: 'Postgres', why: 'lower ops cost' }],
    predicted: [{ title: 'Keep Postgres', chose: 'Postgres', why: 'lower ops cost' }],
  });
  assert.match(text, /real_session_1/);
  assert.match(text, /Expected \(1\)/);
  assert.match(text, /Predicted \(1\)/);
});
