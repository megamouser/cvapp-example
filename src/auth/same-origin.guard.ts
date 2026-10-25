import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const expected =
      process.env.APP_ORIGIN || `${request.protocol}://${request.get('host')}`;
    if (
      (request.headers.origin && request.headers.origin !== expected) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    ) {
      throw new ForbiddenException(
        'Запрос должен быть отправлен с этого сайта.',
      );
    }
    if (!request.is('application/json'))
      throw new UnsupportedMediaTypeException(
        'Отправьте данные в формате JSON.',
      );
    return true;
  }
}
