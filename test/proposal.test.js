import test from 'node:test';
import assert from 'node:assert/strict';
import { withTempRepo } from './helpers.js';
import { recordDecision } from '../dist/store.js';
import { checkProposal } from '../dist/proposal.js';
import { compileRules } from '../dist/rules.js';

test('checkProposal detects CONFLICT when proposed technology was explicitly rejected', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Keep sessions in Postgres rather than adding Redis',
      chose: 'Session state stays in Postgres',
      why: 'Operational surface area outweighs latency gain',
      rejected: [{ name: 'Redis', reason: 'Second datastore to operate' }],
      scope: ['src/session/**'],
    });

    const result = await checkProposal(dir, {
      proposal: 'Add Redis cache for user sessions',
    });

    assert.equal(result.verdict, 'conflict');
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].rejectedName, 'Redis');
    assert.match(result.explanation, /Second datastore to operate/);
  });
});

test('checkProposal returns RELATED when decision is relevant but not contradictory', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres unlogged tables for fast cache',
      chose: 'Postgres unlogged table',
      why: 'In-database caching without separate infra',
    });

    const result = await checkProposal(dir, {
      proposal: 'Query Postgres cache performance',
    });

    assert.equal(result.verdict, 'related');
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.matches.length, 1);
  });
});

test('checkProposal returns NONE when no relevant decisions exist', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for sessions',
      chose: 'Postgres',
      why: 'Simplicity',
    });

    const result = await checkProposal(dir, {
      proposal: 'Configure CSS Tailwind colors',
    });

    assert.equal(result.verdict, 'none');
    assert.equal(result.matches.length, 0);
  });
});

test('compileRules formats active decisions into markdown rules', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Keep sessions in Postgres rather than adding Redis',
      chose: 'Session state stays in Postgres',
      why: 'Low ops overhead',
      rejected: [{ name: 'Redis', reason: 'Second datastore' }],
      scope: ['src/session/**'],
    });

    const rules = await compileRules(dir);
    assert.match(rules, /# Architecture Constraints & Decision Memory/);
    assert.match(rules, /Keep sessions in Postgres rather than adding Redis/);
    assert.match(rules, /\*\*Chose\*\*:\s*Session state stays in Postgres/);
    assert.match(rules, /\*\*Rejected\*\*:\s*Redis/);
  });
});
