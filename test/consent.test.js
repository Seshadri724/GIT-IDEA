// consent.ts stores per-developer state under os.homedir(), so tests point
// HOME/USERPROFILE at a scratch dir rather than touching the real one.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasConsent, grantConsent, revokeConsent } from '../dist/consent.js';
import { withTempRepo } from './helpers.js';

async function withFakeHome(fn) {
  await withTempRepo(async (home) => {
    const prevHome = process.env.HOME;
    const prevProfile = process.env.USERPROFILE;
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    try {
      await fn();
    } finally {
      process.env.HOME = prevHome;
      process.env.USERPROFILE = prevProfile;
    }
  });
}

test('a repo has no consent until granted', async () => {
  await withFakeHome(async () => {
    await withTempRepo(async (repo) => {
      assert.equal(await hasConsent(repo), false);
    });
  });
});

test('grantConsent scopes to the given repo path only', async () => {
  await withFakeHome(async () => {
    await withTempRepo(async (repoA) => {
      await withTempRepo(async (repoB) => {
        await grantConsent(repoA);
        assert.equal(await hasConsent(repoA), true);
        assert.equal(await hasConsent(repoB), false);
      });
    });
  });
});

test('revokeConsent turns a granted repo back off', async () => {
  await withFakeHome(async () => {
    await withTempRepo(async (repo) => {
      await grantConsent(repo);
      assert.equal(await hasConsent(repo), true);
      await revokeConsent(repo);
      assert.equal(await hasConsent(repo), false);
    });
  });
});
