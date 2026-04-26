import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SDSessionService } from './sd-session.service';
import { CreateSDSessionDto } from './dto/create-sd-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sd-sessions')
@Controller('sd-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SDSessionController {
  constructor(private readonly sdSessionService: SDSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new SD session' })
  async create(@Body() dto: CreateSDSessionDto) {
    return this.sdSessionService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SD session state' })
  async findOne(@Param('id') id: string) {
    return this.sdSessionService.findOne(id);
  }
}
