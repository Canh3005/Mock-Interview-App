import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NSDProblemService } from './nsd-problem.service';
import { CreateNSDProblemDto } from './dto/create-nsd-problem.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('nsd-problems')
@Controller('nsd-problems')
export class NSDProblemPublicController {
  constructor(private readonly service: NSDProblemService) {}

  @Get()
  @ApiOperation({ summary: 'Query NSD problems by level/domain' })
  async query(
    @Query('targetLevel') targetLevel?: string,
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.query({
      targetLevel,
      domain,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}

@ApiTags('admin/nsd-problems')
@Controller('admin/nsd-problems')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class NSDProblemController {
  constructor(private readonly service: NSDProblemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new NSD problem' })
  async create(@Body() dto: CreateNSDProblemDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all NSD problems (admin) with pagination' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get NSD problem by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update NSD problem' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateNSDProblemDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete NSD problem' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
