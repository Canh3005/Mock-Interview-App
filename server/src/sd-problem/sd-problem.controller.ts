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
import { SDProblemService } from './sd-problem.service';
import { CreateSDProblemDto } from './dto/create-sd-problem.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('sd-problems')
@Controller('sd-problems')
export class SDProblemPublicController {
  constructor(private readonly sdProblemService: SDProblemService) {}

  @Get()
  @ApiOperation({ summary: 'Query SD problems by level/domain' })
  async query(
    @Query('targetLevel') targetLevel?: string,
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sdProblemService.query({
      targetLevel,
      domain,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}

@ApiTags('admin/sd-problems')
@Controller('admin/sd-problems')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SDProblemController {
  constructor(private readonly sdProblemService: SDProblemService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new SD problem' })
  async create(@Body() dto: CreateSDProblemDto) {
    return this.sdProblemService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all SD problems (admin) with pagination' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.sdProblemService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SD problem by ID' })
  async findOne(@Param('id') id: string) {
    return this.sdProblemService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update SD problem' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSDProblemDto>,
  ) {
    return this.sdProblemService.update({ id, dto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete SD problem' })
  async remove(@Param('id') id: string) {
    return this.sdProblemService.remove(id);
  }
}
