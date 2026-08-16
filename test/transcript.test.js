// Uses a small synthetic .jsonl fixture written by this test, not a real
// session — verifies the parser's own correctness, not extraction quality.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readTranscriptText } from '../dist/transcript.js';
import { withTempRepo } from './helpers.js';

function jsonl(entries) {
  return entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

test('extracts user and assistant text, drops tool_use/tool_result noise', async () => {
  await withTempRepo(async (dir) => {
    const file = path.join(dir, 'session.jsonl');
    await writeFile(
      file,
      jsonl([
        { type: 'user', message: { content: 'Add caching to the API.' } },
        {
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Read', input: { file_path: 'x.ts' } },
              { type: 'text', text: 'Using an in-memory LRU cache instead of Redis — single instance, no ops burden.' },
            ],
          },
        },
        { type: 'user', message: { content: [{ type: 'tool_result', content: 'file contents here' }] } },
        { type: 'system', message: { content: 'irrelevant system entry' } },
        'not even json',
        { type: 'assistant', message: { content: [{ type: 'text', text: '' }] } },
      ]),
      'utf8',
    );

    const text = await readTranscriptText(file);

    assert.match(text, /### USER\nAdd caching to the API\./);
    assert.match(text, /### ASSISTANT\nUsing an in-memory LRU cache/);
    assert.doesNotMatch(text, /tool_use/);
    assert.doesNotMatch(text, /file contents here/);
    assert.doesNotMatch(text, /irrelevant system entry/);
  });
});

test('empty transcript produces empty text', async () => {
  await withTempRepo(async (dir) => {
    const file = path.join(dir, 'empty.jsonl');
    await writeFile(file, '', 'utf8');
    assert.equal(await readTranscriptText(file), '');
  });
});
