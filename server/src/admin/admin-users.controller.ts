import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { AdminUsersService } from './admin-users.service';

@ApiTags('admin/users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminUsersService.listUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail with wallet and sessions' })
  getUserDetail(@Param('id') id: string) {
    return this.adminUsersService.getUserDetail(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend user account' })
  suspend(@Param('id') id: string) {
    return this.adminUsersService.setActive(id, false);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  activate(@Param('id') id: string) {
    return this.adminUsersService.setActive(id, true);
  }
}
