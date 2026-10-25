import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { tokenHash } from '../src/auth/auth.service.js';

describe('cvapp HTTP + PostgreSQL', () => {
  let app: INestApplication;
  const email = `e2e-${randomUUID()}@example.com`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.get(PrismaService).user.deleteMany({ where: { email } });
      await app.close();
    }
  });

  it('serves both pages and the profile', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);
    await request(app.getHttpServer())
      .get('/register')
      .expect(200)
      .expect(/register-form/);
    const profile = await request(app.getHttpServer())
      .get('/api/profile')
      .expect(200);
    expect(profile.body.name).toBeTruthy();
    expect(Array.isArray(profile.body.skills)).toBe(true);
  });

  it('rejects invalid registration over HTTP', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'short' })
      .expect(400);
  });

  it('handles concurrent duplicates atomically in PostgreSQL without exposing the hash', async () => {
    const payload = {
      name: 'Integration Test',
      email,
      password: 'test-only-long-passphrase',
    };
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/api/auth/register').send(payload),
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...payload, email: email.toUpperCase() }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const created = responses.find((r) => r.status === 201)!;
    expect(created.body.email).toBe(email);
    expect(created.body.passwordHash).toBeUndefined();
    expect(created.body.password).toBeUndefined();
    const prisma = app.get(PrismaService);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(payload.password);
  });

  it('preserves the existing GraphQL endpoint', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ profile { name skills { name } } }' })
      .expect(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.profile.name).toBeTruthy();
  });

  it('denies anonymous and forged sessions and redirects the private page', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `cvapp_session=${'a'.repeat(43)}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/account')
      .expect(302)
      .expect('Location', '/login');
    await request(app.getHttpServer())
      .get('/login')
      .expect(200)
      .expect(/login-form/);
  });

  it('returns the same failure for unknown users and wrong passwords', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-such-user@example.com', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.message).toEqual(unknown.body.message);
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('issues an HttpOnly session, rotates it, and revokes it on logout', async () => {
    const payload = {
      email: email.toUpperCase(),
      password: 'test-only-long-passphrase',
    };
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(payload)
      .expect(200);
    const header = login.headers['set-cookie'][0];
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
    expect(login.body.email).toBe(email);
    expect(login.body.passwordHash).toBeUndefined();
    const cookie = header.split(';')[0];
    const raw = cookie.split('=')[1];
    const stored = await app
      .get(PrismaService)
      .session.findUniqueOrThrow({ where: { tokenHash: tokenHash(raw) } });
    expect(stored.tokenHash).not.toBe(raw);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/account')
      .set('Cookie', cookie)
      .expect(200)
      .expect(/account-content/);
    const rotated = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Cookie', cookie)
      .send(payload)
      .expect(200);
    const nextCookie = rotated.headers['set-cookie'][0].split(';')[0];
    expect(nextCookie).not.toBe(cookie);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
    // A hostile site must not be able to revoke a victim's session.
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', nextCookie)
      .set('Origin', 'https://hostile.example')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', nextCookie)
      .expect(200);
    const logout = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', nextCookie)
      .send({})
      .expect(204);
    expect(logout.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', nextCookie)
      .expect(401);
    await request(app.getHttpServer())
      .get('/account')
      .set('Cookie', nextCookie)
      .expect(302);
  });

  it('rejects expired sessions', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'test-only-long-passphrase' })
      .expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await app
      .get(PrismaService)
      .session.update({
        where: { tokenHash: tokenHash(cookie.split('=')[1]) },
        data: { expiresAt: new Date(0) },
      });
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('blocks cross-site and form-based authentication requests', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', 'https://hostile.example')
      .send({ email, password: 'test-only-long-passphrase' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ name: 'Test', email, password: 'test-only-long-passphrase' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .type('form')
      .send({})
      .expect(415);
  });
});
