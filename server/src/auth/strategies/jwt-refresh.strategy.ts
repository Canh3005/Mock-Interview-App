import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import type {
  JwtRefreshPayload,
  JwtRefreshUser,
  RequestCookies,
} from '../types/auth-request.types.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookies = request.cookies as RequestCookies | undefined;
          return cookies?.refreshToken ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
      passReqToCallback: true, // we need the request to extract the token string if we want to hash it
    });
  }

  validate(req: Request, payload: JwtRefreshPayload): JwtRefreshUser {
    const cookies = req.cookies as RequestCookies | undefined;
    const refreshToken = cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    return { ...payload, refreshToken }; // Attach user info and token to req.user
  }
}
