import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.register(registerDto);
    
    // Set refreshToken as HttpOnly cookie
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in and get access token' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(loginDto);
    
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using HttpOnly Cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userPayload = req.user as any;
    const userId = userPayload?.sub;
    const rT = userPayload?.refreshToken;
    
    const { accessToken, refreshToken, user } = await this.authService.refreshTokens(userId, rT);
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken, user };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out user and clear refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userPayload = req.user as any;
    await this.authService.logout(userPayload?.userId);
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged in user profile' })
  getProfile(@Req() req: Request) {
    return req.user;
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Relaxed to allow local testing easier, use 'strict' in true prod if on same domain
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
