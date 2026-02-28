import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltOrRounds);

    const newUser = await this.usersService.create({
      email: registerDto.email,
      name: registerDto.name,
      passwordHash,
    });

    return this.getTokens((newUser._id as any).toString(), newUser.email);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account is linked with another login method. Please use the appropriate social login.',
      );
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.getTokens((user._id as any).toString(), user.email);
  }

  async generateTokensForOAuthUser(userId: string, email: string) {
    return this.getTokens(userId, email);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access Denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.getTokens((user._id as any).toString(), user.email);
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async getTokens(userId: string, email: string) {
    const userDoc = await this.usersService.findById(userId);
    let avatarUrl = userDoc?.avatarUrl || null;
    let name = userDoc?.name || null;

    // Use fallback info from identity profiles if name or avatar is missing or default
    if (!avatarUrl || !name || name === 'OAuth User') {
      const fullIdentities = await this.usersService.getUserFullIdentities(userId);
      for (const identity of fullIdentities) {
        if (!avatarUrl && identity.profileData?._json?.avatar_url) {
          avatarUrl = identity.profileData._json.avatar_url;
        }
        if ((!name || name === 'OAuth User') && identity.profileData?._json?.name) {
          name = identity.profileData._json.name;
        }
      }
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_SECRET || 'super-secret-access-key',
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
          expiresIn: '7d',
        },
      ),
    ]);

    const saltOrRounds = 10;
    const refreshTokenHash = await bcrypt.hash(refreshToken, saltOrRounds);
    await this.usersService.updateRefreshToken(userId, refreshTokenHash);
    const linkedProviders = await this.usersService.getUserIdentities(userId);
    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name, avatarUrl, linkedProviders }, // Return basic info + providers
    };
  }
}
