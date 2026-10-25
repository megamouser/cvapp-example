import { Body, Controller, Header, Post, Req, UseGuards } from '@nestjs/common';
import { SameOriginGuard } from '../auth/same-origin.guard.js';
import type { Request } from 'express';
import { RegistrationService } from './registration.service.js';

@Controller('api/auth')
@UseGuards(SameOriginGuard)
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('register')
  @Header('Cache-Control', 'no-store')
  register(@Body() body: unknown, @Req() request: Request) {
    return this.registration.register(
      body,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }
}
