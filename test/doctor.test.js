import test from 'node:test';
import assert from 'node:assert/strict';
import { withTempRepo } from './helpers.js';
import { recordDecision } from '../dist/store.js';
import { runDoctor } from '../dist/doctor.js';

test('doctor reports healthy status for valid decisions', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for sessions',
      chose: 'Postgres unlogged table',
      why: 'Low ops overhead',
    });

    const report = await runDoctor(dir);
    assert.equal(report.totalDecisions, 1);
    assert.equal(report.issues.length, 0);
  });
});

test('doctor detects dangling supersedes reference', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for sessions',
      chose: 'Postgres unlogged table',
      why: 'Low ops overhead',
      supersedes: ['non-existent-id-1234'],
    });

    const report = await runDoctor(dir);
    assert.equal(report.totalDecisions, 1);
    assert.equal(report.issues.length, 1);
    assert.equal(report.issues[0].severity, 'error');
    assert.match(report.issues[0].message, /Dangling supersedes reference/);
  });
});

test('doctor warns when scope glob matches no files', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for sessions',
      chose: 'Postgres unlogged table',
      why: 'Low ops overhead',
      scope: ['src/nonexistent/**/*.ts'],
    });

    const report = await runDoctor(dir);
    assert.equal(report.totalDecisions, 1);
    assert.equal(report.issues.length, 1);
    assert.equal(report.issues[0].severity, 'warning');
    assert.match(report.issues[0].message, /matches no files/);
  });
});

test('doctor detects contradiction as warning when active decision rejects what another chooses', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for session storage',
      chose: 'Postgres',
      why: 'Single datastore',
      rejected: [{ name: 'Redis', reason: 'Too expensive to manage' }],
      scope: ['src/session/**'],
    });

    await recordDecision(dir, {
      title: 'Use Redis for session storage',
      chose: 'Redis',
      why: 'In-memory performance',
      scope: ['src/session/**'],
    });

    const report = await runDoctor(dir);
    assert.equal(report.totalDecisions, 2);
    const contradiction = report.issues.find((i) => i.message.includes('Contradiction suspected'));
    assert.ok(contradiction);
    assert.equal(contradiction.severity, 'warning');
  });
});

test('doctor does not falsely flag non-conflicting decisions in the same scope', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Configure session token TTL to 30 minutes',
      chose: '30m expiration',
      why: 'Security compliance requirement',
      scope: ['src/session/**'],
    });

    await recordDecision(dir, {
      title: 'Use Pino for structured session logging',
      chose: 'Pino logger',
      why: 'Fast JSON structured logs',
      scope: ['src/session/**'],
    });

    const report = await runDoctor(dir);
    assert.equal(report.totalDecisions, 2);
    const contradictions = report.issues.filter((i) => i.message.includes('Contradiction suspected'));
    assert.equal(contradictions.length, 0);
  });
});
