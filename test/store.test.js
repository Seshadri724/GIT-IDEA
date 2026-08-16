// Round-trip checks for src/store.ts, run against the compiled dist/ output.
// See ROADMAP.md Phase 1 checkpoints — this is the "one runnable check" for
// the storage layer, not a full test framework.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { recordDecision, getDecision, listDecisions } from '../dist/store.js';
import { searchDecisions } from '../dist/search.js';
import { withTempRepo } from './helpers.js';

test('record + read round-trips all fields', async () => {
  await withTempRepo(async (dir) => {
    const id = await recordDecision(dir, {
      title: 'Keep sessions in Postgres rather than adding Redis',
      chose: 'Session state stays in the existing Postgres instance.',
      why: 'Operational surface area outweighs the latency win at our traffic.',
      rejected: [{ name: 'Redis', reason: 'Second datastore to operate with no on-call rotation.' }],
      changes_mind: 'Session volume above ~50k concurrent.',
      scope: ['src/session/**'],
    });

    assert.match(id, /^\d{4}-\d{2}-\d{2}-keep-sessions-in-postgres/);

    const d = await getDecision(dir, id);
    assert.ok(d);
    assert.equal(d.title, 'Keep sessions in Postgres rather than adding Redis');
    assert.equal(d.status, 'active');
    assert.equal(d.chose, 'Session state stays in the existing Postgres instance.');
    assert.equal(d.why, 'Operational surface area outweighs the latency win at our traffic.');
    assert.equal(d.changes_mind, 'Session volume above ~50k concurrent.');
    assert.deepEqual(d.scope, ['src/session/**']);
    assert.equal(d.rejected.length, 1);
    assert.equal(d.rejected[0].name, 'Redis');
    assert.equal(d.rejected[0].reason, 'Second datastore to operate with no on-call rotation.');
    assert.equal(d.superseded_by, null);
  });
});

test('record + read round-trips provenance metadata', async () => {
  await withTempRepo(async (dir) => {
    const id = await recordDecision(dir, {
      title: 'Use TypeScript strict mode',
      chose: 'Enable strict mode in tsconfig',
      why: 'Catch null/undefined errors at compile time',
      provenance: {
        session_id: 'sess-12345',
        commit: 'abc1234',
        source: 'https://github.com/org/repo/issues/42',
      },
    });

    const d = await getDecision(dir, id);
    assert.ok(d);
    assert.deepEqual(d.provenance, {
      session_id: 'sess-12345',
      commit: 'abc1234',
      source: 'https://github.com/org/repo/issues/42',
    });
  });
});

test('two decisions with the same title on the same day get distinct ids', async () => {
  await withTempRepo(async (dir) => {
    const a = await recordDecision(dir, { title: 'Use SQLite', chose: 'x', why: 'y' });
    const b = await recordDecision(dir, { title: 'Use SQLite', chose: 'x2', why: 'y2' });
    assert.notEqual(a, b);
    assert.ok((await getDecision(dir, a)).chose === 'x');
    assert.ok((await getDecision(dir, b)).chose === 'x2');
  });
});

test('supersedes sets superseded_by and status on the old decision', async () => {
  await withTempRepo(async (dir) => {
    const oldId = await recordDecision(dir, {
      title: 'Monolith over services',
      chose: 'One deployable.',
      why: 'Team of two.',
    });

    const newId = await recordDecision(dir, {
      title: 'Extract billing service',
      chose: 'Split billing out.',
      why: 'Billing now has its own on-call.',
      supersedes: [oldId],
    });

    const old = await getDecision(dir, oldId);
    assert.equal(old.status, 'superseded');
    assert.equal(old.superseded_by, newId);
  });
});

test('listDecisions returns newest first', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, { title: 'First', chose: 'a', why: 'a' });
    await recordDecision(dir, { title: 'Second', chose: 'b', why: 'b' });
    const all = await listDecisions(dir);
    assert.equal(all.length, 2);
    // both recorded "today" so order among same-day entries isn't asserted;
    // just confirm both are present and dates are non-increasing.
    assert.ok(all[0].date >= all[1].date);
  });
});

test('search finds a decision by a word in its why section, and respects status/scope filters', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Reject Redis for session cache',
      chose: 'Postgres.',
      why: 'Operational burden outweighs latency win.',
      scope: ['src/session/**'],
    });
    await recordDecision(dir, {
      title: 'Use Fastify over Express',
      chose: 'Fastify.',
      why: 'Faster JSON schema validation.',
      scope: ['src/http/**'],
    });

    const byWhy = await searchDecisions(dir, { query: 'operational burden' });
    assert.equal(byWhy.length, 1);
    assert.match(byWhy[0].title, /Redis/);

    const byScope = await searchDecisions(dir, { query: '', scope: 'src/session/cache.ts' });
    assert.equal(byScope.length, 1);
    assert.match(byScope[0].title, /Redis/);

    const wrongScope = await searchDecisions(dir, { query: '', scope: 'src/other/thing.ts' });
    assert.equal(wrongScope.length, 0);
  });
});

test('search excludes superseded decisions by default, includes with status: any', async () => {
  await withTempRepo(async (dir) => {
    const oldId = await recordDecision(dir, { title: 'Old approach', chose: 'a', why: 'a' });
    await recordDecision(dir, { title: 'New approach', chose: 'b', why: 'b', supersedes: [oldId] });

    const activeOnly = await searchDecisions(dir, { query: 'approach' });
    assert.equal(activeOnly.length, 1);
    assert.equal(activeOnly[0].title, 'New approach');

    const any = await searchDecisions(dir, { query: 'approach', status: 'any' });
    assert.equal(any.length, 2);
  });
});

test('listDecisions on a repo with no .decisions/ dir returns an empty array', async () => {
  await withTempRepo(async (dir) => {
    assert.deepEqual(await listDecisions(dir), []);
  });
});
