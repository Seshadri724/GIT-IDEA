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

test('doctor detects contradiction between active decisions governing same scope', async () => {
  await withTempRepo(async (dir) => {
    await recordDecision(dir, {
      title: 'Use Postgres for session storage',
      chose: 'Postgres',
      why: 'Single datastore',
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
    const contradiction = report.issues.find((i) => i.message.includes('Contradiction detected'));
    assert.ok(contradiction);
    assert.equal(contradiction.severity, 'error');
  });
});
