import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtAuthRequest } from '../auth/types/auth-request.types.js';
import type { UserProfile } from './entities/user-profile.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile (Skill Passport & metrics)',
  })
  @ApiResponse({ status: 200, description: 'Return user profile data.' })
  @Get('profile')
  async getProfile(@Req() req: JwtAuthRequest) {
    const userId = req.user.id;
    return this.usersService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile static fields' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @Put('profile')
  async updateProfile(
    @Req() req: JwtAuthRequest,
    @Body() data: Partial<UserProfile> & { id?: unknown; user?: unknown },
  ) {
    const userId = req.user.id;
    const profileData = { ...data };
    delete profileData.id;
    delete profileData.user;
    return this.usersService.updateProfile(userId, profileData);
  }
}
