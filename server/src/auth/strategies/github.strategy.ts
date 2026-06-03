import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { GithubProfile } from '../types/auth-request.types.js';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || '',
      scope: ['user:email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GithubProfile,
  ): GithubProfile {
    void accessToken;
    void refreshToken;
    return profile;
  }
}
