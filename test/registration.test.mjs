import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import {
  RegistrationService,
  validateRegistration,
  hashPassword,
} from '../dist/registration/registration.service.js';

const valid = {
  name: '  Test User  ',
  email: '  TEST@example.com ',
  password: 'correct horse battery',
};
function storage() {
  const records = new Map();
  return {
    records,
    user: {
      async create({ data, select }) {
        if (records.has(data.email)) throw { code: 'P2002' };
        const row = {
          id: String(records.size + 1),
          createdAt: new Date(),
          ...data,
        };
        records.set(data.email, row);
        return Object.fromEntries(
          Object.keys(select).map((key) => [key, row[key]]),
        );
      },
    },
  };
}

test('validates and normalizes identity without trimming the password', () => {
  assert.deepEqual(validateRegistration(valid), {
    name: 'Test User',
    email: 'test@example.com',
    password: valid.password,
  });
  assert.equal(
    validateRegistration({ ...valid, password: '  my long password  ' })
      .password,
    '  my long password  ',
  );
});

test('rejects malformed, oversized, missing, and control-character inputs', () => {
  for (const body of [
    null,
    [],
    {},
    { ...valid, name: 'a' },
    { ...valid, name: 'ab\ncd' },
    { ...valid, email: 'invalid' },
    { ...valid, email: '<x>@mail.com' },
    { ...valid, password: 'short' },
    { ...valid, password: 'x'.repeat(129) },
    { ...valid, password: ' '.repeat(12) },
  ]) {
    assert.throws(
      () => validateRegistration(body),
      (error) => error.getStatus() === 400,
    );
  }
});

test('hashes are independently salted and verifiable with the stored parameters', async () => {
  const first = await hashPassword(valid.password);
  const second = await hashPassword(valid.password);
  assert.notEqual(first, second);
  const [algorithm, n, r, p, salt, hash] = first.split('$');
  assert.equal(algorithm, 'scrypt');
  assert.equal(salt.length, 32);
  const derived = await promisify(scrypt)(valid.password, salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  assert.equal(derived.toString('hex'), hash);
  assert.ok(!first.includes(valid.password));
});

test('persists hashed passwords but returns only public user fields', async () => {
  const db = storage();
  const service = new RegistrationService(db);
  const user = await service.register(valid, 'one');
  assert.deepEqual(Object.keys(user).sort(), [
    'createdAt',
    'email',
    'id',
    'name',
  ]);
  assert.equal(user.email, 'test@example.com');
  assert.ok(db.records.get(user.email).passwordHash.startsWith('scrypt$'));
});

test('concurrent duplicate registrations create exactly one account', async () => {
  const db = storage();
  const service = new RegistrationService(db);
  const result = await Promise.allSettled([
    service.register(valid, 'one'),
    service.register({ ...valid, email: 'test@EXAMPLE.COM' }, 'two'),
  ]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    result.find((r) => r.status === 'rejected').reason.getStatus(),
    409,
  );
  assert.equal(db.records.size, 1);
});

test('rate limit counts malformed attempts as well as valid ones', async () => {
  const service = new RegistrationService(storage());
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      service.register({}, 'same'),
      (e) => e.getStatus() === 400,
    );
  await assert.rejects(
    service.register(valid, 'same'),
    (e) => e.getStatus() === 429,
  );
  assert.equal(
    (await service.register(valid, 'different')).email,
    'test@example.com',
  );
});

test('bounds concurrent password hashing and recovers after requests complete', async () => {
  const service = new RegistrationService(storage());
  const first = service.register(valid, 'one');
  const second = service.register(
    { ...valid, email: 'second@example.com' },
    'two',
  );
  await assert.rejects(
    service.register({ ...valid, email: 'third@example.com' }, 'three'),
    (e) => e.getStatus() === 429,
  );
  await Promise.all([first, second]);
  assert.equal(
    (await service.register({ ...valid, email: 'third@example.com' }, 'three'))
      .email,
    'third@example.com',
  );
});
