import { Body, Controller, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SDInterviewerService } from './sd-interviewer.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SDOrchestratorService } from '../sd-orchestrator/sd-orchestrator.service';

@ApiTags('sd-interviewer')
@Controller('sd-sessions')
export class SDInterviewerController {
  constructor(
    private readonly sdInterviewerService: SDInterviewerService,
    private readonly sdOrchestrator: SDOrchestratorService,
  ) {}

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start SD session — AI sends opening problem statement (SSE)',
  })
  async startSession(
    @Param('id') sessionId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.sdOrchestrator.openSession(sessionId, res);
  }

  @Post(':id/message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message to AI interviewer (SSE stream)' })
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.sdOrchestrator.handleCandidateTurn(
      sessionId,
      dto.userMessage,
      res,
    );
  }

  @Post(':id/done-drawing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Candidate finished drawing — trigger graph check and transition (SSE)',
  })
  async doneDrawing(
    @Param('id') sessionId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.sdOrchestrator.handleDoneDrawing(sessionId, res);
  }

  @Post(':id/hint')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a Socratic hint' })
  async requestHint(
    @Param('id') sessionId: string,
  ): Promise<{ hintMessage: string; hintsUsed: number }> {
    return this.sdInterviewerService.requestHint(sessionId);
  }
}
