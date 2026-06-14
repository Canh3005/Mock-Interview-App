import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NSDSessionService } from './nsd-session.service';
import { CreateNSDSessionDto } from './dto/create-nsd-session.dto';
import { UpdateNSDCanvasDto } from './dto/update-nsd-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('nsd-sessions')
@Controller('nsd-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NSDSessionController {
  constructor(private readonly service: NSDSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new NSD session' })
  async create(@Body() dto: CreateNSDSessionDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get NSD session state' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/canvas')
  @ApiOperation({ summary: 'Auto-save canvas JSON (debounced from FE)' })
  async updateCanvas(@Param('id') id: string, @Body() dto: UpdateNSDCanvasDto) {
    await this.service.updateCanvas(id, dto.canvas);
    return { ok: true };
  }
}
