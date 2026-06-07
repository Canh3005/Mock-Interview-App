import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { JwtAuthUser } from '../auth/types/auth-request.types';

interface ClsHttpRequest extends Request {
  user?: JwtAuthUser;
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

@Injectable()
export class ClsContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ClsHttpRequest>();

    if (req.user?.id) {
      this.cls.set('userId', req.user.id);
    }

    const sessionId =
      req.params.sessionId ??
      req.params.id ??
      firstHeaderValue(req.headers['x-session-id']) ??
      null;

    if (sessionId) {
      this.cls.set('sessionId', sessionId);
    }

    return next.handle();
  }
}
