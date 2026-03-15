import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type {
  JwtAuthRequest,
  JwtRefreshRequest,
  GithubCallbackRequest,
} from './types/auth-request.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.register(registerDto);
    this.setRefreshTokenCookie(res, refreshToken);
    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in and get access token' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, refreshToken);
    return { accessToken, user };
  }

  @UseGuards(GithubAuthGuard)
  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth() {
    // Guards handle the redirect
  }

  @UseGuards(JwtAuthGuard)
  @Get('github/link')
  @ApiOperation({ summary: 'Initiate GitHub OAuth for account linking' })
  githubLink(@Req() req: JwtAuthRequest, @Res() res: Response) {
    const state = uuidv4();
    const userId = req.user.id;

    // Use a signed cookie or store in Redis. For simplicity, we use HttpOnly cookie.
    res.cookie('github_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300000, // 5 minutes
    });

    res.cookie('github_link_userId', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300000,
    });

    // Manually redirect to use the state
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&state=${state}`;
    res.redirect(redirectUrl);
  }

  @UseGuards(GithubAuthGuard)
  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub callback URL' })
  async githubCallback(
    @Req() req: GithubCallbackRequest,
    @Res() res: Response,
    @Query('error') error?: string,
    @Query('state') stateInQuery?: string,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${frontendUrl}/login?error=github_auth_cancelled`);
    }

    try {
      // 1. Determine if this is a link or a login
      const storedState = req.cookies?.github_state;
      const targetUserId =
        stateInQuery === storedState
          ? req.cookies?.github_link_userId
          : undefined;

      // 2. Handle GitHub User through AuthService/UsersService
      const profile = req.user;
      const userDoc = await this.usersService.handleOAuthUser(
        'github',
        profile.id,
        profile,
        targetUserId,
      );

      // 3. Clear the link cookies
      res.clearCookie('github_state');
      res.clearCookie('github_link_userId');

      // 4. Issue tokens and redirect home
      const { refreshToken } =
        await this.authService.generateTokensForOAuthUser(
          userDoc.id.toString(),
          userDoc.email,
        );

      this.setRefreshTokenCookie(res, refreshToken);

      // Redirect to frontend. We'll pass nothing or maybe accessToken if we want.
      // Since silent refresh is active, redirection alone should work if we set HttpOnly cookie.
      res.redirect(`${frontendUrl}/dashboard?login_success=true`);
    } catch (err: unknown) {
      console.error('GitHub Callback Error:', err);
      const message = err instanceof Error ? err.message : 'auth_failed';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using HttpOnly Cookie' })
  async refresh(
    @Req() req: JwtRefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
    this.setRefreshTokenCookie(res, refreshToken);
    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out user and clear refresh token' })
  async logout(
    @Req() req: JwtAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.id);
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged in user profile' })
  async getProfile(@Req() req: JwtAuthRequest) {
    const providers = await this.usersService.getUserIdentities(req.user.id);
    return { ...req.user, linkedProviders: providers };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
