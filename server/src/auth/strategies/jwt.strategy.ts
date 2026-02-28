import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Extract token from 'Authorization: Bearer <token>' or query param 't'
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('t'),
      ]),
      ignoreExpiration: false,
      // In production, load this from environment variables
      secretOrKey: process.env.JWT_SECRET || 'super-secret-access-key',
    });
  }

  async validate(payload: any) {
    // This payload is the decoded JWT.
    // What we return here gets attached to request.user
    return { userId: payload.sub, email: payload.email };
  }
}
