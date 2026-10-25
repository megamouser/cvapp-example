import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { randomBytes, scrypt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

export function validateRegistration(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Проверьте данные формы.');
  }
  const { name, email, password } = body as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    /[\p{Cc}\p{Cf}]/u.test(name)
  ) {
    throw new BadRequestException('Имя должно содержать от 2 до 80 символов.');
  }
  if (
    typeof email !== 'string' ||
    email.trim().length > 254 ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(
      email.trim(),
    )
  ) {
    throw new BadRequestException('Укажите корректный email.');
  }
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 128 ||
    !password.trim()
  ) {
    throw new BadRequestException(
      'Пароль должен содержать от 12 до 128 символов.',
    );
  }
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
  });
  return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`;
}

@Injectable()
export class RegistrationService {
  private activeRequests = 0;
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async register(body: unknown, ip: string) {
    this.checkRateLimit(ip);
    const { password, ...data } = validateRegistration(body);
    if (this.activeRequests >= 2) {
      throw new HttpException(
        'Сервис занят. Попробуйте через несколько секунд.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.activeRequests++;
    try {
      const passwordHash = await hashPassword(password);
      return await this.prisma.user.create({
        data: { ...data, passwordHash },
        select: { id: true, name: true, email: true, createdAt: true },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким email уже зарегистрирован.',
        );
      }
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private checkRateLimit(ip: string) {
    const now = Date.now();
    for (const [key, value] of this.attempts) {
      if (value.until <= now) this.attempts.delete(key);
    }
    let entry = this.attempts.get(ip);
    if (!entry) {
      if (this.attempts.size >= 10000) {
        throw new HttpException(
          'Попробуйте позже.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      entry = { count: 0, until: now + 15 * 60 * 1000 };
      this.attempts.set(ip, entry);
    }
    if (++entry.count > 10) {
      throw new HttpException(
        'Слишком много попыток. Попробуйте через 15 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
