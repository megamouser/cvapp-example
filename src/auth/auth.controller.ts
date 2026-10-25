import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthService,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionToken,
} from './auth.service.js';
import { SameOriginGuard } from './same-origin.guard.js';

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true' || request.secure,
    sameSite: 'lax' as const,
    path: '/',
  };
}

@Controller('api/auth')
@UseGuards(SameOriginGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(
      body,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
      sessionToken(request),
    );
    response.cookie(SESSION_COOKIE, result.token, {
      ...sessionCookieOptions(request),
      maxAge: SESSION_MAX_AGE,
    });
    return result.user;
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@Req() request: Request) {
    const user = await this.auth.currentUser(request);
    if (!user) throw new UnauthorizedException('Войдите в аккаунт.');
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request);
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions(request));
  }
}
