import test from 'node:test';
import assert from 'node:assert/strict';
import { withTempRepo } from './helpers.js';
import { recordDecision } from '../dist/store.js';
import { searchDecisions } from '../dist/search.js';

test('search finds decision with multi-word query across fields', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Keep sessions in Postgres rather than adding Redis',
      chose: 'Session state stays in Postgres',
      why: 'Operational cost of second datastore',
      rejected: [{ name: 'Redis', reason: 'Adds memory datastore' }],
      scope: ['src/session/**'],
    });

    await recordDecision(dir, {
      title: 'Use Vitest for unit testing',
      chose: 'Vitest runner',
      why: 'Fast execution with ESM support',
      rejected: [{ name: 'Jest', reason: 'Slow ESM transform' }],
      scope: ['test/**'],
    });

    const results = await searchDecisions(dir, { query: 'propose redis for session caching' });
    assert.equal(results.length, 1);
    assert.match(results[0].title, /Redis/);
  });
});

test('search ranks higher-relevance matches first', async () => {
  await withTempRepo(async (dir) => {
    const idA = await recordDecision(dir, {
      title: 'Reject Redis for caching',
      chose: 'In-memory LRU map',
      why: 'Simpler architecture',
      rejected: [{ name: 'Redis', reason: 'Operational complexity' }],
    });

    const idB = await recordDecision(dir, {
      title: 'Use SQLite for local storage',
      chose: 'SQLite',
      why: 'Zero setup database',
      changes_mind: 'If we ever need redis clustering across instances',
    });

    const results = await searchDecisions(dir, { query: 'redis' });
    assert.equal(results.length, 2);
    assert.equal(results[0].id, idA);
    assert.equal(results[1].id, idB);
  });
});

test('search matches whole tokens only (sql does not match sqlite)', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use SQLite for metadata store',
      chose: 'SQLite embedded database',
      why: 'Single file database with zero network overhead',
      rejected: [{ name: 'PostgreSQL', reason: 'Server management overhead' }],
    });

    // Searching for 'sql' should NOT match 'sqlite'
    const sqlResults = await searchDecisions(dir, { query: 'sql' });
    assert.equal(sqlResults.length, 0);

    // Searching for 'sqlite' matches
    const sqliteResults = await searchDecisions(dir, { query: 'sqlite' });
    assert.equal(sqliteResults.length, 1);
  });
});

test('search matches decision by rejected alternative name and reason', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use REST API for mobile clients',
      chose: 'REST endpoints',
      why: 'Sufficient for simple crud',
      rejected: [{ name: 'GraphQL', reason: 'Schema stitching complexity' }],
    });

    const results = await searchDecisions(dir, { query: 'graphql schema stitching' });
    assert.equal(results.length, 1);
    assert.match(results[0].title, /GraphQL|REST/);
  });
});

test('search matches decision by tags', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Standardize on ESM modules',
      chose: 'ESM only',
      why: 'Modern node standard',
      tags: ['build', 'typescript', 'modules'],
    });

    const results = await searchDecisions(dir, { query: 'typescript' });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Standardize on ESM modules');
  });
});

test('search respects scope filter with glob patterns', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Session auth decision',
      chose: 'Cookie auth',
      why: 'HttpOnly cookie security',
      scope: ['src/auth/**', 'src/session/**'],
    });

    await recordDecision(dir, {
      title: 'API token auth decision',
      chose: 'Bearer tokens',
      why: 'Stateless API requests',
      scope: ['src/api/**'],
    });

    const authScope = await searchDecisions(dir, { query: 'auth', scope: 'src/session/handler.ts' });
    assert.equal(authScope.length, 1);
    assert.equal(authScope[0].title, 'Session auth decision');

    const apiScope = await searchDecisions(dir, { query: 'auth', scope: 'src/api/v1/routes.ts' });
    assert.equal(apiScope.length, 1);
    assert.equal(apiScope[0].title, 'API token auth decision');

    const otherScope = await searchDecisions(dir, { query: 'auth', scope: 'src/billing/stripe.ts' });
    assert.equal(otherScope.length, 0);
  });
});

test('search filters by status (active vs superseded vs any)', async () => {
  await withTempRepo(async (dir) => {
    const oldId = await recordDecision(dir, {
      title: 'Use Monolith architecture',
      chose: 'Single repo monolith',
      why: 'Fast iteration for small team',
    });

    const newId = await recordDecision(dir, {
      title: 'Split Billing Microservice architecture',
      chose: 'Separate billing service',
      why: 'Dedicated team formed',
      supersedes: [oldId],
    });

    // Default status is 'active' (oldId is superseded so searching for 'monolith' yields 0 active)
    const activeResults = await searchDecisions(dir, { query: 'monolith' });
    assert.equal(activeResults.length, 0);

    // Status 'superseded' returns oldId
    const supersededResults = await searchDecisions(dir, { query: 'monolith', status: 'superseded' });
    assert.equal(supersededResults.length, 1);
    assert.equal(supersededResults[0].id, oldId);

    // Status 'any' returns both oldId and newId matching 'architecture'
    const anyResults = await searchDecisions(dir, { query: 'architecture', status: 'any' });
    assert.equal(anyResults.length, 2);
  });
});

test('empty query without scope returns empty array to prevent log-dumping', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, { title: 'First', chose: 'a', why: 'b' });
    await recordDecision(dir, { title: 'Second', chose: 'c', why: 'd' });

    const results = await searchDecisions(dir, { query: '' });
    assert.deepEqual(results, []);
  });
});

test('empty query with scope returns matching scope decisions', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Session config',
      chose: 'Postgres',
      why: 'Simplicity',
      scope: ['src/session/**'],
    });

    const results = await searchDecisions(dir, { query: '', scope: 'src/session/index.ts' });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Session config');
  });
});

test('search with no matching decisions returns empty array', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, { title: 'Postgres', chose: 'pg', why: 'sql' });
    const results = await searchDecisions(dir, { query: 'nonexistent-query-string-xyz' });
    assert.deepEqual(results, []);
  });
});
