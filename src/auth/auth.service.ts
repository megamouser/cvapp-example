import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

export const SESSION_COOKIE = 'cvapp_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const publicUserFields = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function sessionToken(request: Request): string | undefined {
  const token = request.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== '32768' ||
    parts[2] !== '8' ||
    parts[3] !== '3' ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  )
    return false;
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      parts[4],
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
  });
  return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}

const dummyHash = `scrypt$32768$8$3$${'0'.repeat(32)}$${'0'.repeat(128)}`;

@Injectable()
export class AuthService {
  private activeRequests = 0;
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async login(body: unknown, ip: string, previousToken?: string) {
    this.limit(`ip:${ip}`);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Укажите email и пароль.');
    const { email, password } = body as Record<string, unknown>;
    if (
      typeof email !== 'string' ||
      email.trim().length > 254 ||
      typeof password !== 'string' ||
      password.length < 1 ||
      password.length > 128
    )
      throw new UnauthorizedException('Неверный email или пароль.');
    const normalized = email.trim().toLowerCase();
    this.limit(`email:${normalized}`);
    if (this.activeRequests >= 2)
      throw new HttpException(
        'Сервис занят. Попробуйте через несколько секунд.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    this.activeRequests++;
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
      });
      const verified = await verifyPassword(
        password,
        user?.passwordHash ?? dummyHash,
      );
      if (!verified || !user)
        throw new UnauthorizedException('Неверный email или пароль.');
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);
      await this.prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({
          where: {
            OR: [
              { expiresAt: { lte: new Date() } },
              ...(previousToken
                ? [{ tokenHash: tokenHash(previousToken) }]
                : []),
            ],
          },
        });
        await tx.session.create({
          data: { tokenHash: tokenHash(token), userId: user.id, expiresAt },
        });
      });
      return {
        token,
        expiresAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      };
    } finally {
      this.activeRequests--;
    }
  }

  async currentUser(request: Request) {
    const token = sessionToken(request);
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      select: { expiresAt: true, user: { select: publicUserFields } },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return session.user;
  }

  async logout(request: Request) {
    const token = sessionToken(request);
    if (token)
      await this.prisma.session.deleteMany({
        where: { tokenHash: tokenHash(token) },
      });
  }

  private limit(key: string) {
    const now = Date.now();
    for (const [k, value] of this.attempts)
      if (value.until <= now) this.attempts.delete(k);
    let entry = this.attempts.get(key);
    if (!entry) {
      if (this.attempts.size >= 20000)
        throw new HttpException(
          'Попробуйте позже.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      entry = { count: 0, until: now + 15 * 60 * 1000 };
      this.attempts.set(key, entry);
    }
    if (++entry.count > 10)
      throw new HttpException(
        'Слишком много попыток входа. Попробуйте через 15 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
