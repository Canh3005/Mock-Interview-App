import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LiveCodingService } from './live-coding.service';

@Controller('live-coding')
export class LiveCodingController {
  constructor(private readonly liveCodingService: LiveCodingService) {}

  @Post('sessions')
  async createSession(
    @Body()
    body: {
      interviewSessionId: string;
      mode: 'practice' | 'combat';
      problemCount: number;
    },
  ) {
    return this.liveCodingService.createSession(body);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.liveCodingService.getSession(id);
  }

  @Get('sessions/:id/score')
  async getScore(@Param('id') id: string) {
    return this.liveCodingService.getScore(id);
  }

  @Patch('sessions/:id/approach')
  async submitApproach(
    @Param('id') id: string,
    @Body() body: { problemId: string; approachText: string },
  ) {
    return this.liveCodingService.submitApproach(
      id,
      body.problemId,
      body.approachText,
    );
  }

  @Post('sessions/:id/run')
  async runCode(
    @Param('id') id: string,
    @Body() body: { problemId: string; code: string; language: string },
  ) {
    return this.liveCodingService.runCode(
      id,
      body.problemId,
      body.code,
      body.language,
    );
  }

  @Post('sessions/:id/submit')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitProblem(
    @Param('id') id: string,
    @Body()
    body: {
      problemId: string;
      code: string;
      language: string;
      hintsUsed?: number;
      approachText?: string;
      timeUsedMs?: number;
    },
  ) {
    return this.liveCodingService.submitProblem(id, body.problemId, body.code, body.language, {
      hintsUsed: body.hintsUsed,
      approachText: body.approachText,
      timeUsedMs: body.timeUsedMs,
    });
  }

  @Post('sessions/:id/idle')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerIdle(
    @Param('id') id: string,
    @Body() body: { problemId: string },
  ) {
    await this.liveCodingService.triggerIdle(id, body.problemId);
  }
}
