// Only the pure prompt-building functions and the fail-open contract are
// tested here — actual extraction quality is unvalidated (ROADMAP.md Phase 0
// has not run) and isn't something a fast offline test can check.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPrompt, extractionInstructions, runExtraction } from '../dist/extract.js';

test('buildPrompt inlines the transcript into the template', async () => {
  const prompt = await buildPrompt('### USER\nhello world');
  assert.match(prompt, /### USER\nhello world/);
  assert.match(prompt, /Record a decision when/);
});

test('extractionInstructions excludes the transcript section', async () => {
  const instructions = await extractionInstructions();
  assert.doesNotMatch(instructions, /\{\{TRANSCRIPT\}\}/);
  assert.doesNotMatch(instructions, /## Transcript/);
  assert.match(instructions, /Record a decision when/);
});

test('runExtraction fails open: an unusable binary yields [] and reports via onError', async () => {
  let reportedError = null;
  const result = await runExtraction('anything', {
    bin: 'definitely-not-a-real-ideagit-test-binary',
    timeoutMs: 5000,
    onError: (err) => (reportedError = err),
  });

  assert.deepEqual(result, []);
  assert.ok(reportedError instanceof Error);
});
