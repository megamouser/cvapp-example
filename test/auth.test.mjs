import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../dist/registration/registration.service.js';
import {
  AuthService,
  verifyPassword,
  sessionToken,
  tokenHash,
} from '../dist/auth/auth.service.js';
import { sessionCookieOptions } from '../dist/auth/auth.controller.js';

test('verifies existing registration hashes and does not trim passwords', async () => {
  const hash = await hashPassword('  a long secret phrase  ');
  assert.equal(await verifyPassword('  a long secret phrase  ', hash), true);
  assert.equal(await verifyPassword('a long secret phrase', hash), false);
  assert.equal(await verifyPassword('different password', hash), false);
});

test('rejects corrupt hashes and unbounded KDF parameters', async () => {
  for (const hash of [
    '',
    'plain-password',
    `scrypt$999999999$8$3$${'0'.repeat(32)}$${'0'.repeat(128)}`,
    'scrypt$32768$8$3$bad$bad',
  ]) {
    assert.equal(await verifyPassword('password', hash), false);
  }
});

test('parses only the exact session cookie with a valid opaque token', () => {
  const token = 'x'.repeat(43);
  assert.equal(
    sessionToken({
      headers: { cookie: `other=1; cvapp_session=${token}; more=2` },
    }),
    token,
  );
  for (const cookie of [
    'cvapp_session=short',
    `prefix_cvapp_session=${token}`,
    `cvapp_session=${'%'.repeat(43)}`,
  ]) {
    assert.equal(sessionToken({ headers: { cookie } }), undefined);
  }
  assert.equal(tokenHash(token).length, 64);
});

test('cookie is HttpOnly, scoped to the site, and secure on HTTPS', () => {
  const options = sessionCookieOptions({ secure: true });
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
});

test('limits attempts even with malformed payloads', async () => {
  const auth = new AuthService({});
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      auth.login(null, 'one'),
      (error) => error.getStatus() === 400,
    );
  await assert.rejects(
    auth.login(null, 'one'),
    (error) => error.getStatus() === 429,
  );
  await assert.rejects(
    auth.login(null, 'different'),
    (error) => error.getStatus() === 400,
  );
});
