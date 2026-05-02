import { Body, Controller, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SDInterviewerService } from './sd-interviewer.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('sd-interviewer')
@Controller('sd-sessions')
export class SDInterviewerController {
  constructor(private readonly sdInterviewerService: SDInterviewerService) {}

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
    await this.sdInterviewerService.startSession({ sessionId, res });
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
    await this.sdInterviewerService.streamMessage({
      sessionId,
      userMessage: dto.userMessage,
      res,
    });
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
