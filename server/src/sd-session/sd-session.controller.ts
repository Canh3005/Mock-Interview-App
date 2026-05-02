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
import { SDSessionService } from './sd-session.service';
import { CreateSDSessionDto } from './dto/create-sd-session.dto';
import {
  UpdateArchitectureDto,
  UpdatePhaseDto,
} from './dto/update-sd-session.dto';
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

  @Patch(':id/architecture')
  @ApiOperation({ summary: 'Auto-save canvas architecture JSON' })
  async updateArchitecture(
    @Param('id') id: string,
    @Body() dto: UpdateArchitectureDto,
  ) {
    return this.sdSessionService.updateArchitecture({
      id,
      nodes: dto.nodes,
      edges: dto.edges,
    });
  }

  @Patch(':id/phase')
  @ApiOperation({ summary: 'Update session phase (called by AI Interviewer)' })
  async updatePhase(@Param('id') id: string, @Body() dto: UpdatePhaseDto) {
    return this.sdSessionService.updatePhase({ id, phase: dto.phase });
  }
}
