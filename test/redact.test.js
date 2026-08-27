import { test } from 'node:test';
import assert from 'node:assert/strict';

import { redactSecrets, containsSecret } from '../dist/redact.js';

test('redacts an AWS access key id', () => {
  const fakeKey = 'AK' + 'IAABCDEFGHIJKLMNOP';
  const out = redactSecrets(`key is ${fakeKey} end`);
  assert.doesNotMatch(out, new RegExp(fakeKey));
  assert.match(out, /\[REDACTED\]/);
});

test('redacts OpenAI standard and project api keys', () => {
  const fakeStandard = 'sk-' + '1234567890abcdef1234567890';
  const standard = redactSecrets(`OpenAI key ${fakeStandard} in config`);
  assert.doesNotMatch(standard, new RegExp(fakeStandard));
  assert.match(standard, /\[REDACTED\]/);

  const fakeProj = 'sk-' + 'proj-1234567890abcdef1234567890123456';
  const proj = redactSecrets(`Project key ${fakeProj} in env`);
  assert.doesNotMatch(proj, new RegExp(fakeProj));
  assert.match(proj, /\[REDACTED\]/);
});

test('redacts Anthropic API keys', () => {
  const fakeKey = 'sk-' + 'ant-1234567890abcdef1234567890abcdef';
  const out = redactSecrets(`Anthropic token ${fakeKey}`);
  assert.doesNotMatch(out, new RegExp(fakeKey));
  assert.match(out, /\[REDACTED\]/);
});

test('redacts GitHub personal access tokens', () => {
  const fakeClassic = 'gh' + 'p_1234567890abcdef1234567890abcdef1234';
  const classic = redactSecrets(fakeClassic);
  assert.doesNotMatch(classic, new RegExp(fakeClassic));
  assert.match(classic, /\[REDACTED\]/);

  const fakeFineGrained = 'github_' + 'pat_1234567890abcdef1234567890abcdef_secrettoken';
  const fineGrained = redactSecrets(fakeFineGrained);
  assert.doesNotMatch(fineGrained, new RegExp(fakeFineGrained));
  assert.match(fineGrained, /\[REDACTED\]/);
});

test('redacts JWT tokens', () => {
  const jwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'].join('.');
  const out = redactSecrets(`Token is ${jwt} for user`);
  assert.doesNotMatch(out, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
  assert.match(out, /\[REDACTED\]/);
});

test('redacts Google API keys and Slack tokens', () => {
  const fakeGoogle = 'AI' + 'zaSyD1234567890abcdef1234567890abcdef';
  const google = redactSecrets(fakeGoogle);
  assert.doesNotMatch(google, new RegExp(fakeGoogle));

  const fakeSlack = 'xox' + 'b-123456789012-1234567890123-4567890abcdef1234567890a';
  const slack = redactSecrets(fakeSlack);
  assert.doesNotMatch(slack, new RegExp(fakeSlack));
});

test('redacts a bearer token', () => {
  const out = redactSecrets('Authorization: Bearer my-custom-secret-token-123456');
  assert.doesNotMatch(out, /my-custom-secret-token-123456/);
});

test('redacts a key=value secret but keeps the key name', () => {
  const fakeKey = 'sk_' + 'test_1234567890abcdef';
  const out = redactSecrets(`const apiKey = "${fakeKey}";`);
  assert.match(out, /apiKey/);
  assert.doesNotMatch(out, new RegExp(fakeKey));
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
