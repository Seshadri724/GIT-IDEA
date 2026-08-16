import { test } from 'node:test';
import assert from 'node:assert/strict';

import { redactSecrets, containsSecret } from '../dist/redact.js';

test('redacts an AWS access key id', () => {
  const out = redactSecrets('key is AKIAABCDEFGHIJKLMNOP end');
  assert.doesNotMatch(out, /AKIAABCDEFGHIJKLMNOP/);
  assert.match(out, /\[REDACTED\]/);
});

test('redacts a bearer token', () => {
  const out = redactSecrets('Authorization: Bearer sk-live-abc123def456ghi789');
  assert.doesNotMatch(out, /sk-live-abc123def456ghi789/);
});

test('redacts a key=value secret but keeps the key name', () => {
  const out = redactSecrets('const apiKey = "sk_test_1234567890abcdef";');
  assert.match(out, /apiKey/);
  assert.doesNotMatch(out, /sk_test_1234567890abcdef/);
});

test('redacts credentials embedded in a connection string', () => {
  const out = redactSecrets('postgres://admin:hunter2pass@db.internal:5432/app');
  assert.doesNotMatch(out, /hunter2pass/);
});

test('redacts a PEM private key block', () => {
  const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow==\n-----END RSA PRIVATE KEY-----';
  const out = redactSecrets(`before ${pem} after`);
  assert.doesNotMatch(out, /MIIEow==/);
});

test('leaves ordinary text untouched', () => {
  const text = 'We chose Postgres over Redis for operational simplicity.';
  assert.equal(redactSecrets(text), text);
  assert.equal(containsSecret(text), false);
});

test('containsSecret reports true only when redaction actually changed something', () => {
  assert.equal(containsSecret('password: "supersecretvalue"'), true);
  assert.equal(containsSecret('the password field was empty'), false);
});
