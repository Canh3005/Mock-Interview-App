import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async getProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.usersService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile static fields' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() data: any) {
    const userId = req.user.id;
    // Note: should ideally validate data against a DTO instead of accepting `any`
    // Omitting critical fields like id from being updated manually
    delete data.id;
    delete data.user;
    return this.usersService.updateProfile(userId, data);
  }
}
