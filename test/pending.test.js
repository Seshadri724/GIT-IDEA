import { test } from 'node:test';
import assert from 'node:assert/strict';

import { writePending, listPending, removePending } from '../dist/pending.js';
import { withTempRepo } from './helpers.js';

test('write + list round-trips a candidate with pending metadata attached', async () => {
  await withTempRepo(async (dir) => {
    const id = await writePending(dir, 'session-123', {
      title: 'Use LRU cache instead of Redis',
      chose: 'In-memory LRU cache.',
      why: 'Single instance, Redis adds ops burden with no benefit yet.',
    });

    const pending = await listPending(dir);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].pendingId, id);
    assert.equal(pending[0].sessionId, 'session-123');
    assert.equal(pending[0].title, 'Use LRU cache instead of Redis');
    assert.ok(pending[0].extractedAt);
  });
});

test('remove deletes exactly one pending candidate', async () => {
  await withTempRepo(async (dir) => {
    const a = await writePending(dir, 's1', { title: 'A', chose: 'a', why: 'a' });
    await writePending(dir, 's1', { title: 'B', chose: 'b', why: 'b' });

    await removePending(dir, a);

    const remaining = await listPending(dir);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].title, 'B');
  });
});

test('listPending on a repo with no pending dir returns an empty array', async () => {
  await withTempRepo(async (dir) => {
    assert.deepEqual(await listPending(dir), []);
  });
});
