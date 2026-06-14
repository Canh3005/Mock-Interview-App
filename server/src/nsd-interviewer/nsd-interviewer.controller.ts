import { Controller, Post, Param, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NSDOrchestratorService } from '../nsd-orchestrator/nsd-orchestrator.service';
import type { NSDCanvasState } from '../nsd-orchestrator/types/nsd.types';

class NSDMessageDto {
  userMessage!: string;
  canvas?: NSDCanvasState;
}

@ApiTags('nsd-interviewer')
@Controller('nsd-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NSDInterviewerController {
  constructor(private readonly orchestrator: NSDOrchestratorService) {}

  @Post(':id/start')
  @ApiOperation({
    summary: 'Start NSD session — streams Phase 1 opening via SSE',
  })
  async start(@Param('id') id: string, @Res() res: Response): Promise<void> {
    return this.orchestrator.startSession(id, res);
  }

  @Post(':id/message')
  @ApiOperation({
    summary: 'Send candidate message — streams AI response via SSE',
  })
  async message(
    @Param('id') id: string,
    @Body() dto: NSDMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    return this.orchestrator.handleCandidateTurn(
      id,
      dto.userMessage,
      dto.canvas ?? null,
      res,
    );
  }
}
